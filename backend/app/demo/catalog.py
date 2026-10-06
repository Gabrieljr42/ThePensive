from app.contracts import Corpus, ExampleQuestion, SourcePassage

CORPUS_VERSION = "demo-2026-10-05"

CORPORA = [
    Corpus(
        id="wizarding-notes",
        version=CORPUS_VERSION,
        title="Harry Potter · companion notes",
        subtitle="An original reading companion",
        edition="Pensieve companion notes · demonstration edition",
        source_kind="original_companion_notes",
        book_count=1,
        source_count=4,
        examples=[
            ExampleQuestion(
                id="mirror",
                label="The Mirror of Erised",
                question="What does the Mirror of Erised reveal, and why is it dangerous?",
            ),
            ExampleQuestion(
                id="stone",
                label="The Philosopher’s Stone",
                question="Why can Harry retrieve the Philosopher’s Stone from the mirror?",
            ),
            ExampleQuestion(
                id="unknown",
                label="Test the archive’s limits",
                question="What is the exact recipe for making a Philosopher’s Stone?",
            ),
        ],
    ),
    Corpus(
        id="lantern-ledger",
        version=CORPUS_VERSION,
        title="The Lantern Ledger",
        subtitle="An original tale from the archive",
        edition="The Lantern Ledger · original fixture edition",
        source_kind="original_fiction",
        book_count=1,
        source_count=3,
        examples=[
            ExampleQuestion(
                id="lantern",
                label="The blue lantern",
                question="Why does the archive’s lantern turn blue at midnight?",
            ),
            ExampleQuestion(
                id="keeper",
                label="The keeper’s promise",
                question="What promise does the keeper make to the archive?",
            ),
            ExampleQuestion(
                id="unknown",
                label="Test the archive’s limits",
                question="Who built the first observatory on the moon?",
            ),
        ],
    ),
]


def passage(
    corpus_id: str,
    source_id: str,
    book: str,
    short: str,
    chapter: str,
    number: int,
    folio: str,
    text: str,
) -> SourcePassage:
    corpus = next(item for item in CORPORA if item.id == corpus_id)
    return SourcePassage(
        id=source_id,
        corpus_id=corpus_id,
        corpus_version=CORPUS_VERSION,
        book=book,
        book_short=short,
        edition=corpus.edition,
        chapter=chapter,
        chapter_number=number,
        page_label=f"Demo folio {folio}",
        page_kind="demo_folio",
        text=text,
        attribution=(
            "Original companion prose written for this demonstration; not an excerpt "
            "or page reference from the novels."
            if corpus_id == "wizarding-notes"
            else "Original fiction written for the Pensieve demonstration."
        ),
    )


SOURCES = [
    passage(
        "wizarding-notes",
        "mirror-desire",
        "A companion to the Philosopher’s Stone",
        "Philosopher’s Stone · notes",
        "The Mirror of Erised",
        1,
        "17",
        "The Mirror of Erised does not show the world as it is. It reflects the deepest "
        "desire of the person looking into it. Harry sees his family beside him, while Ron "
        "sees himself distinguished and admired. The same glass reveals different longings.",
    ),
    passage(
        "wizarding-notes",
        "mirror-warning",
        "A companion to the Philosopher’s Stone",
        "Philosopher’s Stone · notes",
        "The Headmaster’s Warning",
        2,
        "23",
        "Dumbledore explains that the mirror offers neither knowledge nor truth. A person "
        "can become absorbed in what it promises, neglecting the life beyond the glass. "
        "Its danger lies in mistaking a desired life for a life actually lived.",
    ),
    passage(
        "wizarding-notes",
        "mirror-stone",
        "A companion to the Philosopher’s Stone",
        "Philosopher’s Stone · notes",
        "The Final Safeguard",
        3,
        "41",
        "The final safeguard rewards a particular intention: someone who wants to find the "
        "Stone, but does not want to use it, can obtain it through the mirror. Harry’s purpose "
        "is to keep it from the wrong hands. His reflection receives the Stone, and it "
        "appears in his pocket.",
    ),
    passage(
        "wizarding-notes",
        "mirror-pattern",
        "A companion to the Philosopher’s Stone",
        "Philosopher’s Stone · notes",
        "Desire and Choice",
        4,
        "45",
        "The mirror first exposes a private longing and later tests the intention behind a "
        "choice. Read together, these moments distinguish wanting an image from acting "
        "with purpose. The companion leaves the manufacture of the Stone unexplained.",
    ),
    passage(
        "lantern-ledger",
        "lantern-color",
        "The Lantern Ledger",
        "The Lantern Ledger",
        "The Midnight Bell",
        1,
        "03",
        "At midnight, the archive’s lantern turns blue when a reader has left a question "
        "unanswered. Its flame remains blue until the keeper places a matching source "
        "leaf beside the question. The light marks an unfinished connection, not a danger.",
    ),
    passage(
        "lantern-ledger",
        "lantern-source",
        "The Lantern Ledger",
        "The Lantern Ledger",
        "A Leaf for Every Question",
        2,
        "08",
        "The keeper searches the shelves for a leaf that supports the waiting question. "
        "When the leaf is laid on the desk, a silver thread joins the question to its ink. "
        "Only then does the lantern return to its warm amber glow.",
    ),
    passage(
        "lantern-ledger",
        "keeper-promise",
        "The Lantern Ledger",
        "The Lantern Ledger",
        "The Keeper’s Promise",
        3,
        "12",
        "The keeper promises to preserve every leaf in its original order, to name the "
        "source of every answer, and to leave unsupported questions open. The archive "
        "values an honest silence more than a beautifully invented answer.",
    ),
]


def get_corpus(corpus_id: str) -> Corpus | None:
    return next((item for item in CORPORA if item.id == corpus_id), None)


def corpus_sources(corpus_id: str) -> list[SourcePassage]:
    return [source for source in SOURCES if source.corpus_id == corpus_id]
