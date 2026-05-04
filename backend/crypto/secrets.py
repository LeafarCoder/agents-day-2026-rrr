from __future__ import annotations

from config import SECRETS_ENCRYPTION_KEY


def _fernet():
    from cryptography.fernet import Fernet
    if not SECRETS_ENCRYPTION_KEY:
        raise RuntimeError(
            "SECRETS_ENCRYPTION_KEY is not set — cannot encrypt/decrypt user secrets. "
            "Generate one with: python3 -c \"from cryptography.fernet import Fernet; print(Fernet.generate_key().decode())\""
        )
    return Fernet(SECRETS_ENCRYPTION_KEY.encode())


def encrypt_secret(plaintext: str) -> bytes:
    return _fernet().encrypt(plaintext.encode())


def decrypt_secret(blob: bytes) -> str:
    return _fernet().decrypt(blob).decode()


def decrypt_stored_key(raw: str) -> str:
    """Decode an OpenRouter key from any storage format.

    Handles: plaintext, raw Fernet token, hex(Fernet), and PostgreSQL bytea
    double-hex (\\x prefix + hex-of-hex-string).
    """
    # Strip PostgreSQL bytea \\x prefix
    if raw.startswith("\\x"):
        raw = raw[2:]

    candidates: list[bytes | str] = [raw]
    try:
        once = bytes.fromhex(raw)
        candidates.append(once)
        try:
            candidates.append(bytes.fromhex(once.decode("ascii")))
        except Exception:
            pass
    except ValueError:
        candidates.append(raw.encode())

    for blob in candidates:
        if isinstance(blob, str):
            blob = blob.encode()
        try:
            return decrypt_secret(blob)
        except Exception:
            continue

    return raw  # already plaintext
