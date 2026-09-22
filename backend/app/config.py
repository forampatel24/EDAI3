from pydantic_settings import BaseSettings
import os
from pathlib import Path

# Absolute base dir = backend/ (parent of app/)
BASE_DIR = Path(__file__).resolve().parent.parent

class Settings(BaseSettings):
    SECRET_KEY: str = "super-secret-key-change-in-prod-EDAI3-2026"
    ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 60 * 24  # 24h
    DATABASE_URL: str = f"sqlite:///{(BASE_DIR / 'edai3.db').as_posix()}"
    UPLOAD_DIR: str = "uploads"
    CHROMA_DIR: str = "chroma_db"
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
        env_file = ".env"
        extra = "ignore"

settings = Settings()
# Resolve .env relative DATABASE_URL to absolute for SQLAlchemy, keep UPLOAD/CHROMA relative for chroma Windows bug
if settings.DATABASE_URL.startswith("sqlite:///./"):
    rel = settings.DATABASE_URL.replace("sqlite:///./","")
    settings.DATABASE_URL = f"sqlite:///{(BASE_DIR / rel).as_posix()}"
elif settings.DATABASE_URL.startswith("sqlite:////"):
    pass  # already absolute
# Ensure UPLOAD_DIR and CHROMA_DIR are created relative to BASE_DIR (not CWD)
# start_backend.bat already cd to backend, but also handle manual runs from repo root
for _dir in [settings.UPLOAD_DIR, settings.CHROMA_DIR]:
    # create both cwd-relative and BASE_DIR-absolute to be safe
    os.makedirs(BASE_DIR / _dir, exist_ok=True)
    os.makedirs(_dir, exist_ok=True)
