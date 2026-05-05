from __future__ import annotations

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from starlette.middleware.sessions import SessionMiddleware
from config import FRONTEND_URL, SECRET_KEY, SESSION_COOKIE_SAMESITE, SESSION_COOKIE_SECURE
from api.routes import auth, scan, preferences, profile, experiences, demo, settings, trips

app = FastAPI(title="Travel DNA")

app.add_middleware(
    SessionMiddleware,
    secret_key=SECRET_KEY,
    same_site=SESSION_COOKIE_SAMESITE,
    https_only=SESSION_COOKIE_SECURE,
)
app.add_middleware(
    CORSMiddleware,
    allow_origins=[FRONTEND_URL],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Middleware: if the request includes Authorization: Bearer <token>,
# populate request.session from our server-side session store so the
# existing code (which reads request.session) continues to work.
from fastapi import Request
from api.session_store import get_session as _get_server_session

@app.middleware("http")
async def bearer_to_session_middleware(request: Request, call_next):
    auth = request.headers.get("authorization") or request.headers.get("Authorization")
    if auth and auth.lower().startswith("bearer "):
        token = auth.split(" ", 1)[1].strip()
        sess = _get_server_session(token)
        if isinstance(sess, dict):
            try:
                # Clear any existing session keys and update
                request.session.clear()
                request.session.update(sess)
            except Exception:
                # As a fallback, set the scope session directly
                request.scope["session"] = sess
    response = await call_next(request)
    return response

app.include_router(auth.router)
app.include_router(scan.router)
app.include_router(preferences.router)
app.include_router(profile.router)
app.include_router(experiences.router)
app.include_router(demo.router)
app.include_router(settings.router)
app.include_router(trips.router)
