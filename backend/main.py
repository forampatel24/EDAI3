from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
import os

from app.database import Base, engine
from app.models import User, Collection, Document
from app.routers import auth as auth_router
from app.routers import collections as collections_router
from app.routers import generation as gen_router
from app.config import settings

Base.metadata.create_all(bind=engine)

app = FastAPI(title="EDAI3 - RAG Educational Content Generator", version="1.0.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(auth_router.router)
app.include_router(collections_router.router)
app.include_router(gen_router.router)

# serve uploads for teacher preview only (protected ideally, but open for demo with token check on frontend)
if os.path.exists(settings.UPLOAD_DIR):
    app.mount("/uploads", StaticFiles(directory=settings.UPLOAD_DIR), name="uploads")

@app.get("/")
def root():
    return {"status": "ok", "message": "EDAI3 RAG API running", "docs": "/docs"}

@app.get("/health")
def health():
    return {"status": "healthy"}

if __name__ == "__main__":
    import uvicorn
    uvicorn.run("main:app", host="0.0.0.0", port=8000, reload=True)
