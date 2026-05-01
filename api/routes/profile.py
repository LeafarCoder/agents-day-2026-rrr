from __future__ import annotations

import asyncio
import shutil

from fastapi import APIRouter, Request
from fastapi.responses import JSONResponse

from config import FRONTEND_URL
from gmail.auth import credentials_from_session
from observability.logger import get

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
    creds = credentials_from_session(request.session)
    if not creds:
        return JSONResponse({"error": "not_authenticated"}, status_code=401)

    if not shutil.which("msgvault"):
        return JSONResponse(
            {"error": "msgvault_not_found",
             "detail": "msgvault is not installed on this server. Run the pipeline locally."},
            status_code=503,
        )

    from googleapiclient.discovery import build as gapi_build
    service = await asyncio.to_thread(gapi_build, "gmail", "v1", credentials=creds)
    user_email = (
        await asyncio.to_thread(lambda: service.users().getProfile(userId="me").execute())
    )["emailAddress"]

    log.info(f"Profile build triggered  user={user_email}")

    from scripts.run_taste_profile import run
    result = await asyncio.to_thread(run, user_email)
    return result
