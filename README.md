# EDAI3 - Curriculum-Grounded RAG

## Run Backend
```
cd backend
pip install -r requirements.txt
uvicorn main:app --reload --port 8000
```
Docs: http://localhost:8000/docs

## Run Frontend
```
cd frontend
npm install
npm run dev
```
App: http://localhost:5173

## Demo Flow
1. Signup as teacher -> Create Collection (e.g., Physics Class 11) -> Upload PDFs -> Manage (preview/delete)
2. Signup as student -> See catalog (names only) -> Select collection -> Generate
3. Generate: Prompt + difficulty -> 7-section output with citations + retrieved chunks + grounded validator

## Env
Set GEMINI_API_KEY or GROQ_API_KEY (or OPENAI_API_KEY as fallback) in backend/.env and set LLM_PROVIDER=gemini|groq accordingly. Default is gemini. Without key, mock grounded generation is used.

## Tech
FastAPI, SQLite, JWT, ChromaDB, MiniLM embeddings, PyMuPDF, React Vite, React Router, Axios
