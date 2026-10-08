"""Offline pilot evaluation. Gold evidence never enters the retrieval corpus or prompts."""

import argparse
import json
import time
from datetime import UTC, datetime
from pathlib import Path
from uuid import uuid4

from app.contracts import RunRequest
from app.corpus import CorpusBundle, digest
from app.db import Database
from app.live_repository import LiveRepository
from app.live_service import LiveService
from app.pipelines.generation import GeminiProvider
from app.settings import Settings

QUESTIONS = [
    ("factual", "Where do the Dursleys live?", "Number four, Privet Drive.", ["Privet Drive"]),
    ("factual", "What company does Vernon Dursley work for?", "Grunnings.", ["Grunnings"]),
    ("factual", "What does Vernon's company manufacture?", "Drills.", ["drills"]),
    (
        "factual",
        "Who appears as the cat watching Privet Drive?",
        "Professor McGonagall.",
        ["McGonagall"],
    ),
    ("factual", "Who brings baby Harry to Privet Drive?", "Hagrid.", ["Hagrid"]),
    ("factual", "Who lent Hagrid the motorcycle?", "Sirius Black.", ["Sirius Black"]),
    ("factual", "What shape is Harry's scar?", "A lightning bolt.", ["lightning"]),
    (
        "factual",
        "What is the snake's species at the zoo?",
        "A boa constrictor.",
        ["boa constrictor"],
    ),
    (
        "multi_hop",
        "How do Vernon's observations contrast with his family's wish to be normal?",
        "Vernon sees unusual people and events while the Dursleys try to deny their "
        "connection to the Potters.",
        ["normal", "cloaks"],
    ),
    (
        "multi_hop",
        "How does the motorcycle in Harry's dream connect to his arrival at Privet Drive?",
        "Hagrid brought him on a flying motorcycle as a baby, and Harry later dreams of a "
        "flying motorcycle.",
        ["motorcycle", "dream"],
    ),
    (
        "multi_hop",
        "How does the address on Harry's letters change after he moves bedrooms?",
        "The letters first name his cupboard and later the smallest bedroom, showing his "
        "whereabouts are known.",
        ["cupboard", "smallest bedroom"],
    ),
    (
        "multi_hop",
        "How do Dudley's birthday celebrations contrast with Harry's birthday?",
        "Dudley receives many gifts and a zoo trip; Harry approaches his birthday without a "
        "celebration.",
        ["birthday", "presents"],
    ),
    (
        "multi_hop",
        "How does Vernon's response change as the number of letters increases?",
        "He confiscates letters, blocks delivery routes, and eventually takes the family "
        "away from home.",
        ["letters", "Sunday"],
    ),
    (
        "multi_hop",
        "Why does moving Harry out of the cupboard fail to solve Vernon's problem with the "
        "letters?",
        "New letters identify Harry's new bedroom, so changing his room does not stop their "
        "arrival.",
        ["cupboard", "smallest bedroom"],
    ),
    (
        "multi_hop",
        "Where does Vernon take the family while trying to escape the letters?",
        "He takes them to a hotel and later an isolated hut on a rock at sea.",
        ["hotel", "rock"],
    ),
    (
        "multi_hop",
        "How does the zoo visit change Harry's situation at home?",
        "The snake's glass vanishes during the visit, and Harry is punished afterward.",
        ["glass", "cupboard"],
    ),
    ("unanswerable", "Which Hogwarts house is Harry sorted into?", None, []),
    ("unanswerable", "What does the Mirror of Erised show Harry?", None, []),
    ("unanswerable", "What is the exact recipe for the Philosopher's Stone?", None, []),
    ("unanswerable", "Who created the Marauder's Map?", None, []),
    ("unanswerable", "Why does Ginny open the Chamber of Secrets?", None, []),
    ("unanswerable", "Who wins the Triwizard Tournament?", None, []),
    ("unanswerable", "How many Horcruxes does Voldemort create?", None, []),
    ("unanswerable", "What is the core of the Elder Wand?", None, []),
]


def prepare_suite(repository, version, bundle=None):
    scope = ["vol-1-ch-1", "vol-1-ch-2", "vol-1-ch-3"]
    body = RunRequest(
        question="Prepare evaluation",
        corpus_id="harry-potter-archive",
        corpus_version=version,
        book_ids=["vol-1"],
        chapter_ids=scope,
    )
    if bundle is not None and bundle.corpus.version != version:
        raise ValueError("The offline bundle must match the evaluated corpus version.")
    units = (
        [unit for unit in bundle.units if unit.source.chapter_id in scope]
        if bundle is not None
        else repository.units(body, scope)
    )
    if not units:
        raise ValueError("The first three chapters must be imported before preparing the pilot.")
    questions = []
    counts = {}
    for position, (category, question, expected, anchors) in enumerate(QUESTIONS, 1):
        ordinal = counts.get(category, 0)
        counts[category] = ordinal + 1
        evidence = []
        for anchor in anchors:
            matches = []
            for unit in units:
                start = unit.source.text.casefold().find(anchor.casefold())
                if start >= 0:
                    matches.append(
                        {"source_id": unit.source.id, "start": start, "end": start + len(anchor)}
                    )
            if not matches:
                raise ValueError(f"Evaluation anchor not found for question {position}: {anchor}")
            evidence.extend(matches[:8])
        questions.append(
            {
                "id": f"pilot-{position:02d}",
                "category": category,
                "question": question,
                "split": "development" if ordinal < 4 else "held_out",
                "expected_answer": expected,
                "gold_evidence_candidates": evidence,
                "evidence_review_status": "pending_semantic_review",
                "scope": scope,
            }
        )
    return {
        "dataset_version": "pilot-24-v1",
        "corpus_id": body.corpus_id,
        "corpus_version": version,
        "book_ids": body.book_ids,
        "questions": questions,
        "rubric": {
            "correctness": "0 incorrect; 1 mostly incorrect; 2 partial; 3 correct; 4 complete",
            "citation_support": "Review whether each exact passage supports its linked claim.",
        },
        "scoring_policy": "Location and abstention checks; separate semantic review.",
    }


def summarize(suite, runs):
    questions = {question["id"]: question for question in suite["questions"]}
    rows = []
    for question_id, payload in runs.items():
        question = questions[question_id]
        for branch in payload["branches"]:
            citations = [citation for claim in branch["claims"] for citation in claim["citations"]]
            rows.append(
                {
                    "question_id": question_id,
                    "category": question["category"],
                    "method": branch["method"],
                    "status": branch["status"],
                    "abstention_correct": branch["insufficient_evidence"]
                    == (question["category"] == "unanswerable")
                    if branch["status"] == "complete"
                    else None,
                    "structurally_valid_citations": sum(
                        c["structural_status"] == "verified" for c in citations
                    ),
                    "citation_count": len(citations),
                    "metrics": branch["metrics"],
                    "correctness_score": None,
                    "citation_support_score": None,
                }
            )
    return {
        "rows": rows,
        "quality_status": "pending_semantic_review",
        "completed_branches": sum(row["status"] == "complete" for row in rows),
        "total_branches": len(rows),
    }


def run_suite(repository, settings, suite, output, split="held_out", timeout=600):
    if not settings.live_enabled:
        raise ValueError("Live mode must be enabled for a measured benchmark.")
    if settings.public_mode:
        raise ValueError("Run administrative evaluations locally with public mode disabled.")
    provider = GeminiProvider(settings)
    service = LiveService(repository, settings, provider)
    identifier = str(uuid4())
    results = {
        "benchmark_id": identifier,
        "dataset_hash": digest(suite),
        "suite": suite,
        "started_at": datetime.now(UTC).isoformat(),
        "runs": {},
    }
    output.parent.mkdir(parents=True, exist_ok=True)
    try:
        for question in suite["questions"]:
            if question["split"] != split:
                continue
            request = RunRequest(
                question=question["question"],
                corpus_id=suite["corpus_id"],
                corpus_version=suite["corpus_version"],
                book_ids=suite["book_ids"],
                chapter_ids=question["scope"],
                idempotency_key=f"{identifier}:{question['id']}",
            )
            run = service.create(request, f"benchmark-{identifier}", "administrative-evaluation")
            deadline = time.monotonic() + timeout
            while run.status == "running":
                if time.monotonic() > deadline:
                    run = repository.cancel(run.id, f"benchmark-{identifier}")
                    break
                time.sleep(0.5)
                run = repository.get_run(run.id)
            results["runs"][question["id"]] = run.model_dump(mode="json")
            results["report"] = summarize(suite, results["runs"])
            output.write_text(json.dumps(results, ensure_ascii=False, indent=2), encoding="utf-8")
            print(
                json.dumps({"question": question["id"], "run_id": run.id, "status": run.status}),
                flush=True,
            )
    finally:
        provider.close()
    return results


def main():
    parser = argparse.ArgumentParser(description="Prepare and run the private 24-question pilot")
    commands = parser.add_subparsers(dest="command", required=True)
    prepare = commands.add_parser("prepare")
    prepare.add_argument("version")
    prepare.add_argument("--output", type=Path, required=True)
    prepare.add_argument("--bundle", type=Path)
    run = commands.add_parser("run")
    run.add_argument("suite", type=Path)
    run.add_argument("--output", type=Path, required=True)
    run.add_argument("--split", choices=["development", "held_out"], default="held_out")
    args = parser.parse_args()
    settings = Settings.from_env()
    offline = args.command == "prepare" and args.bundle is not None
    database = None if offline else Database(settings.database_url)
    repository = None if offline else LiveRepository(database, settings)
    try:
        if args.command == "prepare":
            bundle = (
                CorpusBundle.model_validate_json(args.bundle.read_text(encoding="utf-8"))
                if offline
                else None
            )
            suite = prepare_suite(repository, args.version, bundle)
            args.output.parent.mkdir(parents=True, exist_ok=True)
            args.output.write_text(
                json.dumps(suite, ensure_ascii=False, indent=2), encoding="utf-8"
            )
            print(json.dumps({"questions": len(suite["questions"]), "dataset_hash": digest(suite)}))
        else:
            suite = json.loads(args.suite.read_text(encoding="utf-8"))
            run_suite(repository, settings, suite, args.output, args.split)
    finally:
        if database:
            database.close()


if __name__ == "__main__":
    main()
