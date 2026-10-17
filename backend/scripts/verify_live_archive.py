"""Opt-in real Gemini acceptance checks through the persisted HTTP/worker journey.

Run only after authorizing, importing, and indexing the selected private corpus. Results and
session cookies are saved under data/private, never in public or committed artifacts.
"""

import argparse
import json
import re
import sys
import time
import unicodedata
from datetime import UTC, datetime
from pathlib import Path
from uuid import uuid4

import httpx

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))

from app.contracts import RunRequest
from app.corpus import digest
from app.db import Database
from app.live_repository import LiveRepository
from app.pipelines.generation import PROMPT_VERSION, REVIEW_VERSION, generation_cost
from app.settings import ROOT, Settings

CASES = [
    {
        "id": "guardians",
        "question": "Por que Dumbledore decidiu deixar Harry com os Dursleys, "
        "apesar das objecoes de McGonagall?",
        "chapters": ["vol-1-ch-1"],
        "facts": [r"famil|parent|tia|tio", r"fama|famos|normal|crescer|crescesse|infancia"],
    },
    {
        "id": "vanishing-glass",
        "question": "O que aconteceu com o vidro do recinto da jiboia no zoologico "
        "e o que a cobra fez em seguida?",
        "chapters": ["vol-1-ch-2"],
        "facts": [r"vidro", r"desaparec|sumiu", r"cobra|serpente|jiboia", r"escap|sai|fora|fug"],
        "qualified_claim_checks": [{
            "target": r"(cobra|serpente|jiboia).*(disse|falou|agradec)",
            "qualifier": r"parec|impress|achou|jur|acredit|pens|pode|poderia|perceb",
        }],
    },
    {
        "id": "letters",
        "question": "Que medidas tio Vernon tomou para impedir Harry de receber "
        "as cartas e por que elas nao funcionaram?",
        "chapters": ["vol-1-ch-3"],
        "facts": [r"vernon|tio", r"carta", r"destru|rasg|queim|bloque|ved|fech|fug|mudo"],
        "forbidden_answer_patterns": [r"(preg|ved|bloqu|tap).{0,90}janelas"],
    },
    {
        "id": "unknown-wand",
        "question": "Qual e o nucleo da varinha de Harry e de quem veio esse material?",
        "chapters": ["vol-1-ch-1", "vol-1-ch-2", "vol-1-ch-3"],
        "abstain": True,
    },
    {
        "id": "scope-isolation",
        "question": "O que aconteceu com o vidro do recinto da jiboia no zoologico?",
        "chapters": ["vol-1-ch-1"],
        "abstain": True,
    },
]


def normalized(text):
    return "".join(
        c for c in unicodedata.normalize("NFKD", text.casefold())
        if not unicodedata.combining(c)
    )


def check_run(case, run, client, corpus):
    assert run["status"] == "complete", (
        f"Run ended as {run['status']}: "
        + "; ".join(f"{b['method']}: {b.get('error_code')}" for b in run["branches"])
    )
    assert run["data_mode"] == "live" and not run["is_preview"]
    assert run["question"] == case["question"], "The cached run belongs to another question"
    assert run["configuration"]["model"] in {"gemini-3.1-flash-lite", "gemini-3.8-flash"}
    assert run["configuration"]["chapter_ids"] == case["chapters"]
    assert run["configuration"]["book_ids"] == case["book_ids"]
    methods = {"rag", "full_context"} if case["mode"] == "compare" else {case["mode"]}
    assert {b["method"] for b in run["branches"]} == methods
    sources = {s["id"]: s for s in run["sources"]}
    for source in sources.values():
        assert source["corpus_version"] == corpus["version"]
        assert source["chapter_id"] in case["chapters"]
        assert source["page_kind"] == "pdf"
    summaries = []
    for branch in run["branches"]:
        assert branch["status"] == "complete", branch.get("error")
        assert branch["insufficient_evidence"] == case.get("abstain", False), (
            f"Expected abstention={case.get('abstain', False)}; "
            f"{branch['method']} returned abstention={branch['insufficient_evidence']}"
        )
        metrics, context = branch["metrics"], branch["context"]
        assert metrics["basis"] == "provider_reported"
        assert metrics["usage_status"] == "reported"
        assert metrics["input_tokens"] > 0 and metrics["output_tokens"] > 0
        assert metrics["provider_request_id"] and context["manifest_hash"]
        assert not context["is_simulated"]
        if branch["method"] == "full_context":
            expected = sum(ch["source_count"] for book in corpus["books"]
                           for ch in book["chapters"] if ch["id"] in case["chapters"])
            assert context["supplied_source_count"] == expected
            assert len(context["source_ids"]) == expected
        else:
            assert branch["retrieval"]["retrievedChunkIds"]
            assert branch["retrieval"]["embeddingModel"] == "gemini-embedding-2"
        claims = branch["claims"]
        if case.get("abstain"):
            assert not claims, "An unanswerable question produced unsupported claims"
        else:
            assert claims
            answer = normalized(" ".join(claim["text"] for claim in claims))
            for fact in case["facts"]:
                assert re.search(fact, answer), f"Missing expected fact pattern: {fact}"
            for pattern in case.get("forbidden_answer_patterns", []):
                assert not re.search(pattern, answer), f"Unsupported assertion pattern: {pattern}"
            for check in case.get("qualified_claim_checks", []):
                for claim in claims:
                    text = normalized(claim["text"])
                    if re.search(check["target"], text):
                        assert re.search(check["qualifier"], text), (
                            "The answer turned a qualified source statement into a fact"
                        )
        citations = [c for claim in claims for c in claim["citations"]]
        assert all(claim["citations"] for claim in claims)
        for citation in citations:
            source = sources[citation["source_id"]]
            assert citation["source_id"] in context["source_ids"]
            assert citation["structural_status"] == "verified"
            assert source["text"][citation["start_offset"]:citation["end_offset"]] == (
                citation["excerpt"]
            )
            evidence = client.get(f"/api/runs/{run['id']}/evidence/{citation['id']}")
            assert evidence.status_code == 200
            assert evidence.json()["source"]["id"] == source["id"]
            assert evidence.json()["citation"]["excerpt"] == citation["excerpt"]
        cited_chapters = {sources[c["source_id"]]["chapter_id"] for c in citations}
        groups = case.get("required_evidence_chapter_groups", [
            [chapter] for chapter in case.get("required_evidence_chapters", [])
        ])
        for group in groups:
            assert cited_chapters.intersection(group), f"Missing cited evidence chapter: {group}"
        summaries.append({
            "method": branch["method"], "claims": len(claims), "citations": len(citations),
            "abstained": branch["insufficient_evidence"],
            "input_tokens": metrics["input_tokens"], "output_tokens": metrics["output_tokens"],
            "latency_ms": metrics["latency_ms"], "sources": context["supplied_source_count"],
            "primary_input_tokens": context["input_tokens"],
            "review_ms": metrics["stage_ms"].get("source_review", 0),
        })
    return summaries


def check_persisted_context(case, run):
    settings = Settings.from_env()
    database = Database(settings.database_url)
    repository = LiveRepository(database, settings)
    try:
        with database.connection() as connection:
            tasks = connection.execute(
                "SELECT t.method,t.context,t.attempt,l.state,l.actual_microusd,l.usage "
                "FROM tasks t JOIN usage_ledger l ON l.id=t.id WHERE t.run_id=%s", (run["id"],)
            ).fetchall()
        request = RunRequest.model_validate({
            "question": case["question"], "corpus_id": run["configuration"]["corpus_id"],
            "corpus_version": run["configuration"]["corpus_version"],
            "book_ids": case["book_ids"], "chapter_ids": case["chapters"], "mode": case["mode"],
        })
        units = repository.units(request, case["chapters"])
        sources = {unit.source.id: unit.source for unit in units}
        for task in tasks:
            blocks = task["context"]["blocks"]
            branch = next(b for b in run["branches"] if b["method"] == task["method"])
            attempt = task["attempt"]
            assert run["configuration"]["prompt_version"] == PROMPT_VERSION
            assert attempt["generation_metadata"]["review_version"] == REVIEW_VERSION
            receipts = [attempt["primary"]]
            if branch["claims"]:
                assert "source_review" in attempt, "Factual answer bypassed source review"
                assert all(c["support_status"] == "supported" for claim in branch["claims"]
                           for c in claim["citations"])
            if "source_review" in attempt:
                receipts.append(attempt["source_review"])
                assert branch["metrics"]["stage_ms"]["source_review"] > 0
            metrics = branch["metrics"]
            assert metrics["input_tokens"] == sum(
                r["usage"]["prompt_token_count"] for r in receipts
            )
            assert metrics["output_tokens"] == sum(
                r["usage"]["candidates_token_count"] for r in receipts
            )
            cost = sum(generation_cost(r["usage"]) for r in receipts)
            cost += task["usage"].get("query_embedding_estimate_usd", 0)
            assert abs(cost - metrics["estimated_cost_usd"]) < 0.000001
            assert abs(task["actual_microusd"] / 1_000_000 - cost) < 0.000001
            assert task["state"] == "reported"
            assert digest(blocks) == branch["context"]["manifest_hash"]
            for block in blocks:
                source = sources[block["source_id"]]
                assert block["text"] == source.text[block["start_offset"]:block["end_offset"]]
            if task["method"] == "full_context":
                assert len(blocks) == len(units)
                assert {b["source_id"] for b in blocks} == set(sources)
                assert all(b["start_offset"] == 0 and b["end_offset"] == len(
                    sources[b["source_id"]].text
                ) for b in blocks)
    finally:
        database.close()


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--base-url", default="http://127.0.0.1:8001")
    parser.add_argument("--version", required=True)
    parser.add_argument("--cases", nargs="+")
    parser.add_argument("--suite", type=Path)
    parser.add_argument("--mode", choices=["compare", "rag", "full_context"], default="compare")
    parser.add_argument("--pause-seconds", type=float, default=0)
    parser.add_argument("--output", type=Path, default=ROOT / "data/private/live-verification.json")
    args = parser.parse_args()
    definitions = json.loads(args.suite.read_text(encoding="utf-8")) if args.suite else CASES
    cases = [dict(case) for case in definitions if not args.cases or case["id"] in args.cases]
    if not cases:
        parser.error("Select at least one known case.")
    target = args.output.resolve()
    if not target.is_relative_to((ROOT / "data/private").resolve()):
        parser.error("The report contains private passages and must stay under data/private.")
    state = (json.loads(target.read_text(encoding="utf-8")) if target.exists() else {
        "id": str(uuid4()), "started_at": datetime.now(UTC).isoformat(),
        "corpus_version": args.version, "cases": {},
        "mode": args.mode,
    })
    assert state["corpus_version"] == args.version, "Use a new report for another corpus version"
    secret = Settings.from_env().gemini_api_key

    def save():
        target.parent.mkdir(parents=True, exist_ok=True)
        target.write_text(json.dumps(state, ensure_ascii=False, indent=2), encoding="utf-8")

    with httpx.Client(base_url=args.base_url, timeout=40,
                      cookies=state.get("session_cookies", {})) as client:
        ready = client.get("/health/ready")
        assert ready.status_code == 200 and ready.json()["database"] and ready.json()["worker"]
        corpus = next(c for c in client.get("/api/corpora").json() if c["version"] == args.version)
        for case in cases:
            case["mode"] = args.mode
            case.setdefault("book_ids", ["vol-1"])
            case.setdefault("chapters", [ch["id"] for book in corpus["books"]
                                         if book["id"] in case["book_ids"]
                                         for ch in book["chapters"] if ch["source_count"]])
        if args.mode != "full_context":
            assert all(ch["indexed"] for book in corpus["books"] for ch in book["chapters"]
                       if ch["id"] in {c for case in cases for c in case["chapters"]})
        for case in cases:
            try:
                body = {"question": case["question"], "mode": args.mode,
                        "corpus_id": corpus["id"], "corpus_version": args.version,
                        "book_ids": case["book_ids"], "chapter_ids": case["chapters"],
                        "idempotency_key": f"verification:{state['id']}:{case['id']}"}
                old = state["cases"].get(case["id"], {})
                if old.get("run_id"):
                    response = client.get(f"/api/runs/{old['run_id']}")
                else:
                    estimate = client.post("/api/runs/estimate", json=body)
                    assert estimate.status_code == 200, estimate.text
                    assert all(b["eligible"] for b in estimate.json()["branches"])
                    response = client.post("/api/runs", json=body)
                    assert response.status_code == 201, response.text
                    original_id = response.json()["id"]
                    duplicate = client.post("/api/runs", json=body)
                    assert duplicate.status_code == 201 and duplicate.json()["id"] == original_id
                    state["cases"][case["id"]] = {
                        "run_id": original_id, "question": case["question"],
                    }
                    state["session_cookies"] = dict(client.cookies)
                    save()
                response.raise_for_status()
                run = response.json()
                deadline = time.monotonic() + 180
                while run["status"] == "running":
                    if time.monotonic() >= deadline:
                        client.post(f"/api/runs/{run['id']}/cancel")
                        raise TimeoutError("The real run did not finish within three minutes")
                    time.sleep(0.65)
                    snapshot = client.get(f"/api/runs/{run['id']}")
                    snapshot.raise_for_status()
                    run = snapshot.json()
                state["cases"][case["id"]]["run"] = run
                checks = check_run(case, run, client, corpus)
                check_persisted_context(case, run)
                with httpx.Client(base_url=args.base_url, timeout=10) as stranger:
                    assert stranger.get(f"/api/runs/{run['id']}").status_code == 404
                    assert stranger.post(f"/api/runs/{run['id']}/cancel").status_code == 404
                state["cases"][case["id"]].update(status="passed", checks=checks)
                print(json.dumps({"case": case["id"], "status": "passed", "methods": checks}),
                      flush=True)
            except Exception as error:
                message = str(error).replace(secret, "[redacted]") if secret else str(error)
                state["cases"].setdefault(case["id"], {}).update(status="failed", error=message)
                print(json.dumps({"case": case["id"], "status": "failed", "error": message}),
                      flush=True)
            save()
            if args.pause_seconds and case is not cases[-1]:
                time.sleep(args.pause_seconds)
    passed = sum(c["status"] == "passed" for c in state["cases"].values())
    state["passed"], state["total"] = passed, len(cases)
    state["completed_at"] = datetime.now(UTC).isoformat()
    save()
    print(json.dumps({"passed": passed, "total": len(cases)}), flush=True)
    return 0 if passed == len(cases) else 1


if __name__ == "__main__":
    raise SystemExit(main())
