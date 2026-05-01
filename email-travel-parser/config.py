from __future__ import annotations
import os

SECRET_KEY = os.environ.get("SECRET_KEY", "dev-secret-change-in-prod")
CREDENTIALS_FILE = os.path.join(os.path.dirname(__file__), "credentials.json")
SCOPES = ["https://www.googleapis.com/auth/gmail.readonly"]

# Allow HTTP for local development — remove in production
os.environ.setdefault("OAUTHLIB_INSECURE_TRANSPORT", "1")
