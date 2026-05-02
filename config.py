from __future__ import annotations
import os
import json
from dotenv import load_dotenv

load_dotenv()

SECRET_KEY           = os.environ.get("SECRET_KEY", "dev-secret-change-in-prod")
SUPABASE_URL         = os.environ.get("SUPABASE_URL", "")
SUPABASE_KEY         = os.environ.get("SUPABASE_KEY", "")
CREDENTIALS_FILE     = os.path.join(os.path.dirname(__file__), "credentials.json")
SCOPES               = ["https://www.googleapis.com/auth/gmail.readonly"]
FRONTEND_URL         = os.environ.get("FRONTEND_URL", "http://localhost:3042")
GOOGLE_REDIRECT_URI  = os.environ.get("GOOGLE_REDIRECT_URI", "")
OPENROUTER_API_KEY   = os.environ.get("OPENROUTER_API_KEY", "")
OPENROUTER_MODEL     = os.environ.get("OPENROUTER_MODEL", "minimax/minimax-m1")
OLLAMA_HOST          = os.environ.get("OLLAMA_HOST", "http://localhost:11434")
EMBEDDING_PROVIDER   = os.environ.get("EMBEDDING_PROVIDER", "openrouter")
OPENROUTER_EMBEDDING_MODEL = os.environ.get("OPENROUTER_EMBEDDING_MODEL", "openai/text-embedding-3-small")
EMBEDDING_DIMENSIONS = int(os.environ.get("EMBEDDING_DIMENSIONS", "768"))
LLM_CONCURRENCY      = int(os.environ.get("LLM_CONCURRENCY", "5"))
SESSION_COOKIE_SAMESITE = os.environ.get("SESSION_COOKIE_SAMESITE", "lax")
SESSION_COOKIE_SECURE   = os.environ.get("SESSION_COOKIE_SECURE", "0") == "1"

# On PaaS platforms (Railway, Render) files can't be mounted — supply credentials.json
# as base64: base64 -i credentials.json | tr -d '\n'
_GOOGLE_CREDENTIALS_JSON = os.environ.get("GOOGLE_CREDENTIALS_JSON", "")
GOOGLE_CREDENTIALS_ERROR = ""
if _GOOGLE_CREDENTIALS_JSON and not os.path.exists(CREDENTIALS_FILE):
    import base64 as _b64
    import binascii as _binascii

    try:
        _payload = _GOOGLE_CREDENTIALS_JSON.strip()
        if (_payload.startswith('"') and _payload.endswith('"')) or (
            _payload.startswith("'") and _payload.endswith("'")
        ):
            _payload = _payload[1:-1]

        _raw: bytes
        try:
            _raw = _b64.b64decode(_payload, validate=True)
        except _binascii.Error:
            _raw = _payload.encode("utf-8")

        json.loads(_raw.decode("utf-8"))
        with open(CREDENTIALS_FILE, "wb") as _f:
            _f.write(_raw)
    except Exception as exc:
        GOOGLE_CREDENTIALS_ERROR = str(exc)

# Set to 0 in production (HTTPS)
os.environ.setdefault("OAUTHLIB_INSECURE_TRANSPORT", "1")
