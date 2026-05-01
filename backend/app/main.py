import asyncio
import logging
import uuid
from contextlib import asynccontextmanager

from dotenv import load_dotenv

load_dotenv()

from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware

from app.graph import create_graph
from app.models import RunRequest, RunResponse, RunStatus
from app.supabase_client import get_supabase

logger = logging.getLogger(__name__)
logging.basicConfig(level=logging.INFO)

# ---------------------------------------------------------------------------
# Background task registry (prevents GC of running tasks)
# ---------------------------------------------------------------------------

background_tasks: set[asyncio.Task] = set()


# ---------------------------------------------------------------------------
# Pipeline background task
# ---------------------------------------------------------------------------


async def run_pipeline_task(run_id: str, request: RunRequest) -> None:
    try:
        graph = create_graph()
        await graph.ainvoke(
            {
                "latitude": request.latitude,
                "longitude": request.longitude,
                "session_id": request.session_id,
                "run_id": run_id,
                "city_name": "",
                "neighborhood": "",
                "destination_id": "395",
                "travel_date": "",
                "preference_categories": [],
                "viator_tag_ids": [],
                "search_results": [],
                "available_products": [],
                "itinerary": None,
                "steps": [],
            }
        )
        # Nodes write their own status; ensure "done" if the graph exits cleanly
        sb = get_supabase()
        row = sb.table("runs").select("status").eq("id", run_id).single().execute()
        if row.data and row.data["status"] == "running":
            sb.table("runs").update({"status": "done"}).eq("id", run_id).execute()

    except Exception as exc:
        logger.exception("Pipeline failed for run_id=%s: %s", run_id, exc)
        try:
            sb = get_supabase()
            sb.table("runs").update(
                {"status": "error", "result": {"error": str(exc)}}
            ).eq("id", run_id).execute()
        except Exception as db_exc:
            logger.error("Could not write error status to DB: %s", db_exc)


# ---------------------------------------------------------------------------
# App lifecycle
# ---------------------------------------------------------------------------


@asynccontextmanager
async def lifespan(app: FastAPI):
    # Warm up Supabase client on startup
    try:
        get_supabase()
        logger.info("Supabase client initialised")
    except Exception as exc:
        logger.warning("Supabase client warm-up failed: %s", exc)
    yield
    # Cancel any still-running background tasks on shutdown
    for task in list(background_tasks):
        task.cancel()


# ---------------------------------------------------------------------------
# FastAPI app
# ---------------------------------------------------------------------------

app = FastAPI(title="B Planner API", version="1.0.0", lifespan=lifespan)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


# ---------------------------------------------------------------------------
# Routes
# ---------------------------------------------------------------------------


@app.get("/healthz")
async def healthz():
    return {"status": "ok"}


@app.post("/api/run", response_model=RunResponse, status_code=202)
async def create_run(request: RunRequest):
    run_id = str(uuid.uuid4())

    # Persist initial run row
    try:
        sb = get_supabase()
        sb.table("runs").insert(
            {
                "id": run_id,
                "session_id": request.session_id,
                "status": "running",
                "steps": [],
                "result": None,
            }
        ).execute()
    except Exception as exc:
        logger.error("Failed to create run row: %s", exc)
        raise HTTPException(status_code=500, detail="Failed to initialise run")

    # Fire pipeline in background
    task = asyncio.create_task(run_pipeline_task(run_id, request))
    background_tasks.add(task)
    task.add_done_callback(background_tasks.discard)

    return RunResponse(run_id=run_id)


@app.get("/api/runs/{run_id}", response_model=RunStatus)
async def get_run(run_id: str):
    try:
        sb = get_supabase()
        resp = (
            sb.table("runs")
            .select("id, session_id, status, steps, result")
            .eq("id", run_id)
            .single()
            .execute()
        )
    except Exception as exc:
        logger.error("DB error fetching run %s: %s", run_id, exc)
        raise HTTPException(status_code=500, detail="Database error")

    if not resp.data:
        raise HTTPException(status_code=404, detail="Run not found")

    row = resp.data
    return RunStatus(
        id=row["id"],
        session_id=row["session_id"],
        status=row["status"],
        steps=row.get("steps") or [],
        result=row.get("result"),
    )
