import Link from "next/link";
import { ArchiveShell } from "@/components/archive/archive-shell";
import { Icon } from "@/components/icon";

export default function ArchitecturePage() {
  return (
    <ArchiveShell>
      <main id="main" className="architecture-page">
        <p className="eyebrow">INSIDE THE MIDNIGHT ARCHIVE</p>
        <h1>
          Magic reveals
          <br />
          <em>relationships.</em>
        </h1>
        <p className="architecture-lead">
          The atmosphere invites you in. The evidence lets you look closer.
        </p>
        <div className="architecture-paper">
          <h2>One question, two methods.</h2>
          <div className="method-explanation">
            <section>
              <Icon name="book" />
              <h3>RAG</h3>
              <p>
                Retrieve relevant passages from the selected collection, then
                answer using those passages. Each claim points back to a source
                leaf.
              </p>
            </section>
            <section>
              <Icon name="moon" />
              <h3>Full Context</h3>
              <p>
                Supply the complete selected collection to the model. The scope
                is visible and identical to the collection available to RAG.
              </p>
            </section>
          </div>
          <h2>A claim is only the beginning.</h2>
          <p>
            Citations connect a claim to a book, chapter, page or location, and
            exact passage. Matching a quotation establishes its location.
            Assessing whether it supports the claim is a separate evaluation.
          </p>
          <div className="architecture-chain">
            <span>Question</span>
            <Icon name="arrow" />
            <span>Context</span>
            <Icon name="arrow" />
            <span>Claim</span>
            <Icon name="arrow" />
            <span>Evidence</span>
          </div>
          <h2>This first edition</h2>
          <p>
            This milestone uses prepared answers and illustrative measurements
            served by an independent FastAPI backend. The source passages are
            original companion prose or original fiction. Citation offsets are
            validated against those passages.
          </p>
          <p>
            The Next.js frontend handles reading and interaction. FastAPI owns
            the API contracts, sources, experiments, and future AI pipelines.
            Docker Compose brings up both applications and PostgreSQL with
            pgvector.
          </p>
          <p>
            Live retrieval, embeddings, model generation, and benchmarks are the
            next engineering milestones. Their results will use the same run and
            evidence contracts.
          </p>
          <Link className="return-link" href="/ask">
            Return to the reading room <Icon name="arrow" />
          </Link>
        </div>
      </main>
    </ArchiveShell>
  );
}
