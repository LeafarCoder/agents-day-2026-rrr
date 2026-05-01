from __future__ import annotations
import os
from dotenv import load_dotenv

load_dotenv()

SECRET_KEY       = os.environ.get("SECRET_KEY", "dev-secret-change-in-prod")
SUPABASE_URL     = os.environ.get("SUPABASE_URL", "")
SUPABASE_KEY     = os.environ.get("SUPABASE_KEY", "")
CREDENTIALS_FILE = os.path.join(os.path.dirname(__file__), "credentials.json")
SCOPES           = ["https://www.googleapis.com/auth/gmail.readonly"]
FRONTEND_URL     = os.environ.get("FRONTEND_URL", "http://localhost:3042")

# Allow HTTP for local development — remove in production
os.environ.setdefault("OAUTHLIB_INSECURE_TRANSPORT", "1")
