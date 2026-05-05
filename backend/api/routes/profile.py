from __future__ import annotations

import asyncio
import shutil

from fastapi import APIRouter, Request
from fastapi.responses import JSONResponse

from config import FRONTEND_URL
from gmail.auth import credentials_from_session, get_current_user_email
from observability.logger import get
from api.deps import is_demo_request

log = get("api.profile")
router = APIRouter()


@router.get("/profile")
def profile():
    from fastapi.responses import RedirectResponse
    return RedirectResponse(FRONTEND_URL)


@router.post("/api/profile/build")
async def build_taste_profile(request: Request):
    """
    Trigger the full taste-profile pipeline for the logged-in user:
      msgvault hybrid search → MiniMax extraction → Ollama embedding → Supabase
    Requires msgvault to be installed and synced on the server.
    """
    if is_demo_request(request):
        return JSONResponse({"error": "demo_mode_read_only"}, status_code=403)

    creds = credentials_from_session(request.session)
    if not creds:
        return JSONResponse({"error": "not_authenticated"}, status_code=401)

    if not shutil.which("msgvault"):
        return JSONResponse(
            {"error": "msgvault_not_found",
             "detail": "msgvault is not installed on this server. Run the pipeline locally."},
            status_code=503,
        )

    from api.deps import get_user_email
    user_email = await asyncio.to_thread(get_user_email, request)

    log.info(f"Profile build triggered  user={user_email}")

    from scripts.run_taste_profile import run
    result = await asyncio.to_thread(run, user_email)
    return result
