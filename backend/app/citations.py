"""Resolve a bounded quotation against an immutable source passage."""

from app.contracts import Citation, SourcePassage


def resolve_citation(
    source: SourcePassage,
    excerpt: str,
    citation_id: str,
    number: int,
    supplied_source_ids: list[str],
) -> Citation:
    if source.id not in supplied_source_ids:
        raise ValueError("A citation must reference a source supplied to its branch.")
    start = source.text.find(excerpt)
    if not excerpt or start < 0:
        raise ValueError("The quotation does not occur in the declared source.")
    if source.text.find(excerpt, start + 1) >= 0:
        raise ValueError("The quotation is ambiguous within the source passage.")
    return Citation(
        id=citation_id,
        number=number,
        source_id=source.id,
        excerpt=excerpt,
        start_offset=start,
        end_offset=start + len(excerpt),
        structural_status="verified",
        support_status="fixture_reviewed",
    )
