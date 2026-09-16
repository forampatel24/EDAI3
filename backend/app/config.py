from pydantic_settings import BaseSettings
import os
from pathlib import Path

# Absolute base dir = backend/ (parent of app/)
BASE_DIR = Path(__file__).resolve().parent.parent

class Settings(BaseSettings):
    SECRET_KEY: str = "super-secret-key-change-in-prod-EDAI3-2026"
    ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 60 * 24  # 24h
    DATABASE_URL: str = f"sqlite:///{BASE_DIR / 'edai3.db'}"
    UPLOAD_DIR: str = str(BASE_DIR / "uploads")
    CHROMA_DIR: str = str(BASE_DIR / "chroma_db")
    # LLM
    LLM_PROVIDER: str = "gemini"  # gemini | groq | openai
    OPENAI_API_KEY: str = ""
    GEMINI_API_KEY: str = ""
    GROQ_API_KEY: str = ""
    OPENAI_MODEL: str = "gpt-4o-mini"
    GEMINI_MODEL: str = "gemini-1.5-flash"
    GROQ_MODEL: str = "llama-3.3-70b-versatile"
    EMBEDDING_MODEL: str = "sentence-transformers/all-MiniLM-L6-v2"

    class Config:
        env_file = ".env"
        extra = "ignore"

settings = Settings()
# Resolve relative paths from .env (e.g., sqlite:///./edai3.db or ./uploads) to absolute BASE_DIR
if settings.DATABASE_URL.startswith("sqlite:///./"):
    settings.DATABASE_URL = f"sqlite:///{BASE_DIR / settings.DATABASE_URL.replace('sqlite:///./','')}"
elif settings.DATABASE_URL.startswith("sqlite:////"):
    pass  # already absolute
if not os.path.isabs(settings.UPLOAD_DIR):
    settings.UPLOAD_DIR = str(BASE_DIR / settings.UPLOAD_DIR.lstrip("./").lstrip("/\\"))
if not os.path.isabs(settings.CHROMA_DIR):
    settings.CHROMA_DIR = str(BASE_DIR / settings.CHROMA_DIR.lstrip("./").lstrip("/\\"))
# Ensure dirs
os.makedirs(settings.UPLOAD_DIR, exist_ok=True)
os.makedirs(settings.CHROMA_DIR, exist_ok=True)
