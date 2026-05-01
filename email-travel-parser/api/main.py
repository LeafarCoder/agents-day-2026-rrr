from __future__ import annotations

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from starlette.middleware.sessions import SessionMiddleware

from config import FRONTEND_URL, SECRET_KEY
from api.routes import auth, scan, preferences, profile, experiences

app = FastAPI(title="Travel DNA")

app.add_middleware(SessionMiddleware, secret_key=SECRET_KEY)
app.add_middleware(
    CORSMiddleware,
    allow_origins=[FRONTEND_URL],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(auth.router)
app.include_router(scan.router)
app.include_router(preferences.router)
app.include_router(profile.router)
app.include_router(experiences.router)
