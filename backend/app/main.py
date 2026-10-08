import hmac
import secrets
from contextlib import asynccontextmanager

from fastapi import FastAPI, HTTPException, Request
from fastapi.exceptions import RequestValidationError
from fastapi.responses import JSONResponse

from app.contracts import (
    ApiProblem,
    Corpus,
    EvidenceResponse,
    ExperimentRun,
    Mode,
    RunEstimate,
    RunRequest,
)
from app.db import Database
from app.demo.catalog import CORPORA, get_corpus
from app.errors import ArchiveProblem
from app.experiments import ExperimentService
from app.live_repository import LiveRepository
from app.live_service import LiveService
from app.pipelines.generation import GeminiProvider
from app.repository import RunRepository, create_repository
from app.security import SESSION_COOKIE, ip_identity, session_identity
from app.settings import Settings, local_session_secret


def create_app(
    repository: RunRepository | None = None,
    *,
    settings: Settings | None = None,
    live_repository: LiveRepository | None = None,
    provider=None,
) -> FastAPI:
    settings = settings or (Settings() if repository else Settings.from_env())
    settings.validate()
    db = None
    if live_repository is None and settings.database_url:
        db = Database(settings.database_url)
        live_repository = LiveRepository(db, settings)
    provider = provider or (GeminiProvider(settings) if settings.live_enabled else None)
    live = LiveService(live_repository, settings, provider) if live_repository else None
    service = ExperimentService(repository or create_repository())
    session_secret = settings.session_secret or (
        local_session_secret(settings.private_dir)
        if settings.database_url
        else secrets.token_hex(32)
    )

    @asynccontextmanager
    async def lifespan(_application):
        yield
        if db:
            db.close()
        if isinstance(provider, GeminiProvider):
            provider.close()

    application = FastAPI(
        title="Pensieve API",
        version="2.0.0",
        description="Edition-aware RAG and Full Context experiments, with exact evidence.",
        lifespan=lifespan,
        docs_url=None if settings.public_mode else "/docs",
        redoc_url=None if settings.public_mode else "/redoc",
    )
    errors = {code: {"model": ApiProblem} for code in (403, 404, 409, 422, 429, 503)}

    @application.middleware("http")
    async def identify(request: Request, call_next):
        if request.url.path.startswith("/api/"):
            if settings.public_mode and not hmac.compare_digest(
                request.headers.get("x-pensieve-proxy-key", ""),
                settings.proxy_key,
            ):
                return JSONResponse(
                    status_code=403,
                    content={
                        "code": "proxy_required",
                        "message": "Use the archive website to access this API.",
                    },
                )
            owner, cookie = session_identity(request.cookies.get(SESSION_COOKIE), session_secret)
            request.state.owner = owner
            request.state.ip_hash = ip_identity(request, session_secret, settings.public_mode)
            response = await call_next(request)
            if request.cookies.get(SESSION_COOKIE) != cookie:
                response.set_cookie(
                    SESSION_COOKIE,
                    cookie,
                    httponly=True,
                    secure=settings.public_mode,
                    samesite="lax",
                    max_age=30 * 86400,
                )
            return response
        return await call_next(request)

    @application.exception_handler(ArchiveProblem)
    async def archive_error(_request, error):
        return JSONResponse(
            status_code=error.status,
            content={
                "code": error.code,
                "message": str(error),
            },
        )

    @application.exception_handler(HTTPException)
    async def api_error(_request: Request, error: HTTPException) -> JSONResponse:
        return JSONResponse(
            status_code=error.status_code,
            content={
                "code": "request_failed",
                "message": str(error.detail),
            },
        )

    @application.exception_handler(RequestValidationError)
    async def validation_error(_request: Request, _error: RequestValidationError) -> JSONResponse:
        return JSONResponse(
            status_code=422,
            content={
                "code": "invalid_request",
                "message": "Check the question and selected scope.",
            },
        )

    @application.get("/health")
    def health():
        return {"status": "ok", "data_mode": "live" if settings.live_enabled else "mock"}

    @application.get("/health/ready")
    def readiness():
        if live_repository:
            try:
                state = live_repository.readiness()
            except Exception as error:
                raise ArchiveProblem(
                    "database_unavailable", "The database is unavailable.", 503
                ) from error
            if settings.live_enabled and not state["worker"]:
                raise ArchiveProblem(
                    "worker_unavailable", "The inquiry worker is unavailable.", 503
                )
            return state
        return {"database": False, "worker": False, "demo_available": True}

    @application.get("/api/status")
    def status():
        return {
            "schema_version": "2.0",
            "live_enabled": settings.live_enabled,
            "public_mode": settings.public_mode,
            "public_chapter_limit": settings.public_chapter_limit,
            "output_limit": settings.output_limit,
        }

    @application.get("/api/corpora", response_model=list[Corpus], responses=errors)
    def corpora():
        return (live_repository.corpora() if live_repository else []) + CORPORA

    @application.get("/api/demo", response_model=ExperimentRun, responses=errors)
    def demo(
        corpus_id: str = "wizarding-notes",
        mode: Mode = Mode.COMPARE,
        question_id: str | None = None,
    ):
        corpus = get_corpus(corpus_id)
        if corpus is None:
            raise HTTPException(404, detail="Collection not found.")
        example = next((item for item in corpus.examples if item.id == question_id), None)
        if question_id is not None and example is None:
            raise HTTPException(404, detail="Prepared question not found.")
        return service.create(
            RunRequest(
                question=(example or corpus.examples[0]).question,
                mode=mode,
                corpus_id=corpus.id,
                corpus_version=corpus.version,
            ),
            preview=True,
        )

    @application.post("/api/runs/estimate", response_model=RunEstimate, responses=errors)
    def estimate(body: RunRequest):
        if not live:
            raise ArchiveProblem("live_unavailable", "Import a corpus into PostgreSQL first.", 503)
        return live.estimate(body)

    @application.post("/api/runs", response_model=ExperimentRun, status_code=201, responses=errors)
    def create_run(body: RunRequest, request: Request):
        if body.corpus_version.startswith("pdf-"):
            if not live:
                raise ArchiveProblem("live_unavailable", "The live archive is unavailable.", 503)
            return live.create(body, request.state.owner, request.state.ip_hash)
        try:
            return service.create(body)
        except ValueError as error:
            raise HTTPException(422, detail=str(error)) from error

    def lookup(run_id: str, request: Request):
        run = live_repository.get_run(run_id, request.state.owner) if live_repository else None
        run = run or service.view(run_id)
        if run is None:
            raise HTTPException(404, detail="Experiment not found.")
        return run

    @application.get("/api/runs/{run_id}", response_model=ExperimentRun, responses=errors)
    def get_run(run_id: str, request: Request):
        return lookup(run_id, request)

    @application.post("/api/runs/{run_id}/cancel", response_model=ExperimentRun, responses=errors)
    def cancel_run(run_id: str, request: Request):
        run = live_repository.cancel(run_id, request.state.owner) if live_repository else None
        run = run or service.cancel(run_id)
        if run is None:
            raise HTTPException(404, detail="Experiment not found.")
        return run

    @application.get(
        "/api/runs/{run_id}/evidence/{citation_id}",
        response_model=EvidenceResponse,
        responses=errors,
    )
    def evidence(run_id: str, citation_id: str, request: Request):
        run = lookup(run_id, request)
        for branch in run.branches:
            for claim in branch.claims:
                for citation in claim.citations:
                    if citation.id == citation_id:
                        source = next(
                            (source for source in run.sources if source.id == citation.source_id),
                            None,
                        )
                        if source:
                            return EvidenceResponse(
                                run_id=run.id,
                                branch_id=branch.id,
                                claim=claim,
                                citation=citation,
                                source=source,
                            )
        raise HTTPException(404, detail="The citation is not available in this experiment.")

    return application


app = create_app()
