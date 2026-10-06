from fastapi import FastAPI, HTTPException, Request
from fastapi.exceptions import RequestValidationError
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse

from app.contracts import ApiProblem, Corpus, EvidenceResponse, ExperimentRun, Mode, RunRequest
from app.demo.catalog import CORPORA, get_corpus
from app.experiments import ExperimentService
from app.repository import RunRepository, create_repository


def create_app(repository: RunRepository | None = None) -> FastAPI:
    application = FastAPI(
        title="Pensieve API",
        version="1.0.0",
        description="The Midnight Archive. This milestone uses prepared demo runs.",
    )
    application.add_middleware(
        CORSMiddleware,
        allow_origins=["http://localhost:3000"],
        allow_methods=["GET", "POST"],
        allow_headers=["Content-Type"],
    )
    service = ExperimentService(repository or create_repository())
    errors = {404: {"model": ApiProblem}, 422: {"model": ApiProblem}}

    @application.exception_handler(HTTPException)
    async def api_error(_request: Request, error: HTTPException) -> JSONResponse:
        return JSONResponse(
            status_code=error.status_code,
            content=ApiProblem(code="request_failed", message=str(error.detail)).model_dump(),
        )

    @application.exception_handler(RequestValidationError)
    async def validation_error(_request: Request, error: RequestValidationError) -> JSONResponse:
        message = error.errors()[0]["msg"] if error.errors() else "The request is invalid."
        return JSONResponse(
            status_code=422,
            content=ApiProblem(code="invalid_request", message=message).model_dump(),
        )

    @application.get("/health")
    def health() -> dict[str, str]:
        return {"status": "ok", "data_mode": "mock"}

    @application.get("/api/corpora", response_model=list[Corpus])
    def corpora() -> list[Corpus]:
        return CORPORA

    @application.get("/api/demo", response_model=ExperimentRun, responses=errors)
    def demo(
        corpus_id: str = "wizarding-notes",
        mode: Mode = Mode.COMPARE,
        question_id: str | None = None,
    ) -> ExperimentRun:
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

    @application.post("/api/runs", response_model=ExperimentRun, status_code=201, responses=errors)
    def create_run(request: RunRequest) -> ExperimentRun:
        try:
            return service.create(request)
        except ValueError as error:
            raise HTTPException(422, detail=str(error)) from error

    @application.get("/api/runs/{run_id}", response_model=ExperimentRun, responses=errors)
    def get_run(run_id: str) -> ExperimentRun:
        run = service.view(run_id)
        if run is None:
            raise HTTPException(404, detail="Experiment not found.")
        return run

    @application.post("/api/runs/{run_id}/cancel", response_model=ExperimentRun, responses=errors)
    def cancel_run(run_id: str) -> ExperimentRun:
        run = service.cancel(run_id)
        if run is None:
            raise HTTPException(404, detail="Experiment not found.")
        return run

    @application.get(
        "/api/runs/{run_id}/evidence/{citation_id}",
        response_model=EvidenceResponse,
        responses=errors,
    )
    def evidence(run_id: str, citation_id: str) -> EvidenceResponse:
        run = service.view(run_id)
        if run is not None:
            for branch in run.branches:
                for claim in branch.claims:
                    for citation in claim.citations:
                        if citation.id == citation_id:
                            source = next(
                                source for source in run.sources if source.id == citation.source_id
                            )
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
