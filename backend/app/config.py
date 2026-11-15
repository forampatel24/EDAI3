from pydantic_settings import BaseSettings
import os
import secrets
from pathlib import Path

# Absolute base dir = backend/ (parent of app/)
BASE_DIR = Path(__file__).resolve().parent.parent

# Known placeholder values that must never be used as the real signing key
_PLACEHOLDER_SECRETS = {
    "change-me",
    "super-secret-key-change-in-prod",
    "super-secret-key-change-in-prod-EDAI3-2026",
}


def _load_or_create_secret() -> str:
    """Use the env/file secret if set; otherwise generate one and persist it so
    JWTs survive restarts. Never ship the example placeholder as the real key."""
    key_file = BASE_DIR / ".jwt_secret"
    if key_file.exists():
        stored = key_file.read_text(encoding="utf-8").strip()
        if stored:
            return stored
    key = secrets.token_urlsafe(48)
    key_file.write_text(key, encoding="utf-8")
    return key


class Settings(BaseSettings):
    # Left empty in code: resolved below from env -> .jwt_secret file -> generated
    SECRET_KEY: str = ""
    ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 60 * 24  # 24h
    DATABASE_URL: str = f"sqlite:///{(BASE_DIR / 'edai3.db').as_posix()}"
    UPLOAD_DIR: str = str(BASE_DIR / "uploads")
    CHROMA_DIR: str = str(BASE_DIR / "chroma_db")
    # Comma-separated list of allowed frontend origins
    CORS_ORIGINS: str = "http://localhost:5173,http://127.0.0.1:5173"
    # LLM
    LLM_PROVIDER: str = "gemini"  # gemini | groq | openai
    OPENAI_API_KEY: str = ""
    GEMINI_API_KEY: str = ""
    GROQ_API_KEY: str = ""
    OPENAI_MODEL: str = "gpt-4o-mini"
    GEMINI_MODEL: str = "gemini-flash-latest"
    GROQ_MODEL: str = "openai/gpt-oss-20b"
    EMBEDDING_MODEL: str = "sentence-transformers/all-MiniLM-L6-v2"

    class Config:
        env_file = str(BASE_DIR / ".env")
        extra = "ignore"


settings = Settings()

# SECRET_KEY: generate & persist a strong key when none (or the placeholder) is configured
if not settings.SECRET_KEY or settings.SECRET_KEY in _PLACEHOLDER_SECRETS:
    settings.SECRET_KEY = _load_or_create_secret()

# Anchor relative upload/chroma paths to BASE_DIR so the server behaves the same
# no matter which directory it was launched from.
for _attr in ("UPLOAD_DIR", "CHROMA_DIR"):
    _val = Path(getattr(settings, _attr))
    if not _val.is_absolute():
        _val = BASE_DIR / _val
    setattr(settings, _attr, str(_val))
    os.makedirs(_val, exist_ok=True)
