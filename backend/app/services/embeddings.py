import chromadb
from chromadb.config import Settings as ChromaSettings
from sentence_transformers import SentenceTransformer
import os
from ..config import settings

_client = None
_model = None

def get_chroma_client():
    global _client
    if _client is None:
        _client = chromadb.PersistentClient(path=settings.CHROMA_DIR, settings=ChromaSettings(anonymized_telemetry=False))
    return _client

def get_embedding_model():
    global _model
    if _model is None:
        _model = SentenceTransformer(settings.EMBEDDING_MODEL)
    return _model

def embed_texts(texts):
    model = get_embedding_model()
    return model.encode(texts, show_progress_bar=False).tolist()

def get_or_create_collection(name: str):
    client = get_chroma_client()
    return client.get_or_create_collection(name=name, metadata={"hnsw:space": "cosine"})
