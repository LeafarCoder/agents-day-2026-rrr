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
