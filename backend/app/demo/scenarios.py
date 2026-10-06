"""Prepared answers, not retrieval or model generation. All metrics are illustrative."""

from app.citations import resolve_citation
from app.contracts import Branch, BranchStatus, Claim, ContextManifest, Method, RunMetrics
from app.demo.catalog import corpus_sources, get_corpus


def scenario_key(corpus_id: str, question: str) -> str:
    normalized = " ".join(question.casefold().rstrip("?.! ").split())
    corpus = get_corpus(corpus_id)
    if corpus:
        for example in corpus.examples:
            canonical = " ".join(example.question.casefold().rstrip("?.! ").split())
            if normalized == canonical:
                return example.id
    return "unknown"


def make_branch(corpus_id: str, question: str, method: Method, run_id: str) -> Branch:
    sources = {source.id: source for source in corpus_sources(corpus_id)}
    key = scenario_key(corpus_id, question)
    rag = method == Method.RAG
    branch_id = f"{run_id}-{method.value}"
    claims: list[tuple[str, str, str]]
    if key == "mirror":
        title = "A reflection of desire"
        introduction = (
            "The mirror reveals what the heart longs for, rather than what the eyes can see."
            if rag
            else "The mirror’s enchantment is best understood through desire, danger, and choice."
        )
        claims = [
            (
                "It shows a person’s deepest desire. Harry sees his family; "
                "Ron sees recognition and achievement.",
                "mirror-desire",
                "It reflects the deepest desire of the person looking into it.",
            ),
            (
                "Its danger is absorption: a person may linger in an imagined life "
                "and lose touch with the real one.",
                "mirror-warning",
                "A person can become absorbed in what it promises, "
                "neglecting the life beyond the glass.",
            ),
        ]
        if not rag:
            claims.append(
                (
                    "The later safeguard turns that same enchantment into a test of intention, "
                    "linking longing to action.",
                    "mirror-pattern",
                    "The mirror first exposes a private longing and later tests "
                    "the intention behind a choice.",
                )
            )
        conclusion = (
            "The longing is real. The reflection is not a promise."
            if rag
            else "Across the notes, the mirror is both a revelation of longing "
            "and a measure of purpose."
        )
    elif key == "stone":
        title = "The intention behind the reflection"
        introduction = "Harry wants to protect the Stone, rather than use its power."
        claims = [
            (
                "The safeguard allows someone who wants to find the Stone, "
                "without wanting to use it, to obtain it.",
                "mirror-stone",
                "someone who wants to find the Stone, but does not want to use it, "
                "can obtain it through the mirror.",
            )
        ]
        if not rag:
            claims.append(
                (
                    "This continues the notes’ distinction between private longing "
                    "and a purposeful choice.",
                    "mirror-pattern",
                    "Read together, these moments distinguish wanting an image "
                    "from acting with purpose.",
                )
            )
        conclusion = "His purpose satisfies the safeguard’s condition."
    elif key == "lantern":
        title = "An unfinished connection"
        introduction = "Blue light marks a question still waiting for evidence."
        claims = [
            (
                "The lantern turns blue at midnight when a reader has left a question unanswered.",
                "lantern-color",
                "the archive’s lantern turns blue when a reader has left a question unanswered.",
            ),
            (
                "It returns to amber after a source leaf supports the question "
                "and the silver thread joins them.",
                "lantern-source",
                "Only then does the lantern return to its warm amber glow.",
            ),
        ]
        if not rag:
            claims.append(
                (
                    "The keeper’s promise makes this a commitment to traceable answers, "
                    "including honest silence.",
                    "keeper-promise",
                    "The archive values an honest silence more than a beautifully invented answer.",
                )
            )
        conclusion = "The light makes the missing relationship visible."
    elif key == "keeper":
        title = "A promise to the sources"
        introduction = "The keeper promises to care for both the leaves and the truth of an answer."
        claims = [
            (
                "The promise preserves source order, names the source of each answer, "
                "and leaves unsupported questions open.",
                "keeper-promise",
                "The keeper promises to preserve every leaf in its original order, "
                "to name the source of every answer, and to leave unsupported questions open.",
            )
        ]
        conclusion = "An unanswered question remains an invitation to find evidence."
    else:
        title = "A question still open"
        introduction = "This demonstration has no prepared, supported answer for that question."
        claims = []
        conclusion = "Try one of the suggested questions, or consult a different collection."

    used_ids = list(dict.fromkeys(source_id for _, source_id, _ in claims))
    supplied_ids = used_ids if rag else list(sources)
    answer_claims = [
        Claim(
            id=f"{branch_id}-claim-{number}",
            text=text,
            citations=[
                resolve_citation(
                    sources[source_id], quote, f"{branch_id}-cite-{number}", number, supplied_ids
                )
            ],
        )
        for number, (text, source_id, quote) in enumerate(claims, start=1)
    ]
    return Branch(
        id=branch_id,
        method=method,
        status=BranchStatus.COMPLETE,
        answer_title=title,
        introduction=introduction,
        claims=answer_claims,
        conclusion=conclusion,
        insufficient_evidence=key == "unknown",
        context=ContextManifest(
            source_ids=supplied_ids,
            selected_source_count=len(sources),
            supplied_source_count=len(supplied_ids),
            strategy="retrieved_passages" if rag else "complete_scope",
            is_simulated=True,
        ),
        metrics=RunMetrics(
            basis="illustrative",
            latency_ms=1320 if rag else 2780,
            input_tokens=842 if rag else 1548,
            output_tokens=154 if rag else 207,
            cached_input_tokens=0,
            estimated_cost_usd=0.00026 if rag else 0.00052,
            pricing_label="Illustrative scenario; no API charges",
        ),
    )
