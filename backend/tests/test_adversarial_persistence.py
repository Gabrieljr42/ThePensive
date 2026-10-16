import threading
from datetime import UTC, datetime, timedelta

from app.contracts import BranchStatus, Mode, RunRequest
from app.demo.catalog import CORPORA
from app.experiments import ExperimentService
from app.repository import MemoryRunRepository


def test_consecutive_view_calls_transition_and_persist_completion():
    """Consecutive view calls transition states and persist completion."""
    repository = MemoryRunRepository()
    service = ExperimentService(repository)

    req = RunRequest(
        question="How did Harry come to own the Marauder's Map, and who created it?",
        corpus_id="harry-potter-archive",
        corpus_version="vol-3-poa",
        mode=Mode.COMPARE,
    )
    run = service.create(req)
    run_id = run.id

    # 1. Immediately after creation, run is running
    assert run.status == "running"
    stored_0 = repository.get(run_id)
    assert stored_0 is not None
    assert stored_0.status == "running"

    # 2. Simulate 0.5s elapsed
    snapshot = repository.get(run_id)
    snapshot.created_at = datetime.now(UTC) - timedelta(seconds=0.5)
    repository.save(snapshot)

    view_05 = service.view(run_id)
    assert view_05.status == "running"
    assert all(b.status == BranchStatus.PREPARING for b in view_05.branches)

    # 3. Simulate 1.6s elapsed (RAG completes, Full Context still generating)
    snapshot.created_at = datetime.now(UTC) - timedelta(seconds=1.6)
    repository.save(snapshot)

    view_16 = service.view(run_id)
    assert view_16.status == "running"
    rag_b = next(b for b in view_16.branches if b.method.value == "rag")
    full_b = next(b for b in view_16.branches if b.method.value == "full_context")
    assert rag_b.status == BranchStatus.COMPLETE
    assert full_b.status == BranchStatus.GENERATING

    # 4. Simulate 3.0s elapsed (Both branches complete)
    snapshot.created_at = datetime.now(UTC) - timedelta(seconds=3.0)
    repository.save(snapshot)

    view_30 = service.view(run_id)
    assert view_30.status == "complete"
    assert all(b.status == BranchStatus.COMPLETE for b in view_30.branches)
    assert all(len(b.claims) > 0 for b in view_30.branches)

    # 5. Consecutive view call at 3.5s
    view_35 = service.view(run_id)
    assert view_35.status == "complete"
    assert all(b.status == BranchStatus.COMPLETE for b in view_35.branches)

    # 6. Consecutive view call at 10.0s
    view_10 = service.view(run_id)
    assert view_10.status == "complete"

    # 7. Direct repository lookup MUST be complete
    stored_final = repository.get(run_id)
    assert stored_final is not None
    assert stored_final.status == "complete"
    assert all(b.status == BranchStatus.COMPLETE for b in stored_final.branches)
    assert all(len(b.claims) > 0 for b in stored_final.branches)


def test_independent_service_instances_share_persisted_state():
    """A second service reads persisted state from the shared repository."""
    repository = MemoryRunRepository()
    service1 = ExperimentService(repository)

    req = RunRequest(
        question="How did Harry come to own the Marauder's Map, and who created it?",
        corpus_id="harry-potter-archive",
        corpus_version="vol-3-poa",
        mode=Mode.COMPARE,
    )
    run = service1.create(req)

    # Force completion
    snapshot = repository.get(run.id)
    snapshot.created_at = datetime.now(UTC) - timedelta(seconds=4.0)
    repository.save(snapshot)
    service1.view(run.id)

    # Fresh service instance
    service2 = ExperimentService(repository)
    retrieved = service2.view(run.id)

    assert retrieved is not None
    assert retrieved.status == "complete"
    assert len(retrieved.branches) == 2
    assert all(b.status == BranchStatus.COMPLETE for b in retrieved.branches)


def test_consecutive_cancellations_and_view_calls():
    """Test cancellation persistence and idempotent behavior across consecutive calls."""
    repository = MemoryRunRepository()
    service = ExperimentService(repository)

    req = RunRequest(
        question="How did Harry come to own the Marauder's Map, and who created it?",
        corpus_id="harry-potter-archive",
        corpus_version="vol-3-poa",
        mode=Mode.COMPARE,
    )
    run = service.create(req)

    # Cancel while running
    cancelled1 = service.cancel(run.id)
    assert cancelled1 is not None
    assert cancelled1.status == "cancelled"

    # Direct repository check immediately after cancel
    stored = repository.get(run.id)
    assert stored is not None
    assert stored.status == "cancelled"

    # Consecutive cancel call should be idempotent
    cancelled2 = service.cancel(run.id)
    assert cancelled2 is not None
    assert cancelled2.status == "cancelled"

    # Consecutive view call should return cancelled run
    view_cancelled = service.view(run.id)
    assert view_cancelled is not None
    assert view_cancelled.status == "cancelled"


def test_multiple_concurrent_runs_persist_independently():
    """Concurrent runs across threads and corpora persist independently."""
    repository = MemoryRunRepository()
    service = ExperimentService(repository)

    run_ids = []
    lock = threading.Lock()

    def worker(idx: int):
        corpus = CORPORA[idx % len(CORPORA)]
        version = "vol-3-poa" if corpus.id == "harry-potter-archive" else corpus.version
        req = RunRequest(
            question=corpus.examples[0].question,
            corpus_id=corpus.id,
            corpus_version=version,
            mode=Mode.COMPARE,
        )
        r = service.create(req)
        with lock:
            run_ids.append(r.id)

    threads = [threading.Thread(target=worker, args=(i,)) for i in range(12)]
    for t in threads:
        t.start()
    for t in threads:
        t.join()

    assert len(run_ids) == 12

    # Fast forward all runs to completion
    for rid in run_ids:
        snap = repository.get(rid)
        snap.created_at = datetime.now(UTC) - timedelta(seconds=5.0)
        repository.save(snap)
        completed = service.view(rid)
        assert completed.status == "complete"

    # Verify every run is persisted as complete in repository
    for rid in run_ids:
        stored = repository.get(rid)
        assert stored is not None
        assert stored.status == "complete"
        assert len(stored.branches) == 2


def test_harry_potter_archive_all_valid_versions_persist():
    """Test all valid versions of harry-potter-archive persist correctly."""
    repository = MemoryRunRepository()
    service = ExperimentService(repository)

    valid_versions = ["vol-1-ps", "vol-3-poa", "1997-2007-chronicles"]
    for ver in valid_versions:
        req = RunRequest(
            question="How did Harry come to own the Marauder's Map, and who created it?",
            corpus_id="harry-potter-archive",
            corpus_version=ver,
            mode=Mode.COMPARE,
        )
        r = service.create(req)
        assert r.configuration.corpus_version == ver

        snap = repository.get(r.id)
        snap.created_at = datetime.now(UTC) - timedelta(seconds=4.0)
        repository.save(snap)

        viewed = service.view(r.id)
        assert viewed.status == "complete"

        persisted = repository.get(r.id)
        assert persisted.status == "complete"
        assert persisted.configuration.corpus_version == ver
