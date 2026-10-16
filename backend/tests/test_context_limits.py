from dataclasses import replace

from test_live_archive import FixtureProvider, original_bundle, request

from app.live_service import LiveService
from app.settings import Settings


class CorpusRepository:
    def corpus(self, *_):
        return original_bundle().corpus

    def units(self, *_):
        return original_bundle().units

    def available_budget(self):
        return 5


def test_configured_full_context_limit_blocks_large_scope_before_generation():
    provider = FixtureProvider()
    provider.count = lambda _: 35000
    settings = Settings(live_enabled=True, full_context_token_limit=30000)
    estimate = LiveService(CorpusRepository(), settings, provider).estimate(request())
    full = next(b for b in estimate.branches if b.method == "full_context")
    rag = next(b for b in estimate.branches if b.method == "rag")
    assert not full.eligible and "30,000" in full.reason and "RAG" in full.reason
    assert rag.eligible
    assert provider.calls == 0


def test_configured_limit_accepts_a_small_scope_and_can_be_disabled_for_admin_tests():
    provider = FixtureProvider()
    provider.count = lambda _: 25000
    settings = Settings(live_enabled=True, full_context_token_limit=30000)
    estimate = LiveService(CorpusRepository(), settings, provider).estimate(request())
    assert all(b.eligible for b in estimate.branches)
    provider.count = lambda _: 35000
    unrestricted = LiveService(CorpusRepository(), replace(
        settings, full_context_token_limit=0,
    ), provider).estimate(request())
    assert all(b.eligible for b in unrestricted.branches)
