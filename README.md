# Pensieve

**An enchanted archive for comparing RAG and Full Context, with every answer connected to its evidence.**

Creative recommendation: **The Midnight Archive** — a candlelit library opening onto a celestial observatory. Two illuminated tomes make the comparison visible; a thread of light connects an answer claim to its source passage.

Status: **design and architecture brief complete; application implementation is the next phase.** This folder currently contains planning documents. No live answers, corpus ingestion, or benchmark measurements have been produced.

## Read the plan

- [Product concept, three creative directions, pages, and components](docs/product-and-design.md)
- [Architecture, source provenance, comparison protocol, and evaluation](docs/architecture.md)
- [Phased roadmap and the first implementation slice](docs/roadmap.md)
- [Architecture decisions and their trade-offs](docs/decisions.md)

## The experience

Enter the archive. Choose the books or chapters to consult. Ask a question. Open one tome for RAG, one for Full Context, or both for comparison. Follow a citation back to an edition-specific passage. Inspect the context, latency, token usage, and estimated cost behind the answer.

The working product name is **Pensieve**; **The Midnight Archive** is its visual direction. Harry Potter is the intended first literary corpus. The artwork and interface will use an original wizarding setting.

## Working assumptions

- A solo-developer portfolio project with a modest public demo audience.
- Next.js, TypeScript, Tailwind CSS, Motion, and PostgreSQL with pgvector are the proposed stack.
- Model and embedding choices will be selected against measured corpus sizes, availability, and budget when implementation begins.
- Harry Potter book files and their editions have not yet been supplied. Exact pages and excerpts will come from validated ingestion of those files.
- Original, small document fixtures will let the first implementation slice work before the literary corpus is available.
- Live runs and recorded demonstrations will carry explicit labels; benchmark conclusions will come from measured experiments.

Planning date: **5 October 2026**.
