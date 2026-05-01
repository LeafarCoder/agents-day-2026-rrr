from __future__ import annotations

import glob

from fastapi import FastAPI
from starlette.middleware.sessions import SessionMiddleware

from config import SECRET_KEY
from api.routes import auth, scan, preferences, profile

app = FastAPI(title="Email Travel Parser")

app.add_middleware(SessionMiddleware, secret_key=SECRET_KEY)

app.include_router(auth.router)
app.include_router(scan.router)
app.include_router(preferences.router)
app.include_router(profile.router)
