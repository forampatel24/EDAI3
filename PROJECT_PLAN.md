# Curriculum-Grounded Learning Content Generation System - Project Plan & Understanding

> Source Spec: `PS-1.VITProj (1).md` | Date: 2026-09-15 | Timeline: 2 Days | Demo: Localhost

---

## 1. Core Understanding

### 1.1 Problem (PS-1.VITProj (1).md:8-9)
Generic AI tools generate educational material that may be plausible but is not grounded in prescribed syllabus, textbooks, or academic level. Causes hallucination and syllabus-mismatch.

### 1.2 Proposed System (PS-1.VITProj (1).md:13-14)
RAG application that **retrieves from approved corpus BEFORE generating**. Corpus = textbooks, lecture notes, syllabus documents, question banks uploaded by teachers.

### 1.3 Input / Output Contract
- **Example Input (PS-1.VITProj (1).md:16):** `Create a lesson on Newton's laws for Class 11 students.`
- **Required Generated Output (PS-1.VITProj (1).md:21-27) - 7 sections:**
  1. Topic explanation grounded in uploaded material
  2. Key concepts and definitions
  3. Worked examples
  4. Multiple-choice and descriptive questions
  5. Difficulty-based quizzes
  6. Revision notes
  7. Source references to textbook pages or documents (citation with page no)

### 1.4 Main Components Required (PS-1.VITProj (1).md:31-37)
1. PDF and document ingestion
2. Text chunking and embeddings
3. Vector database (ChromaDB chosen - free, local, persistent)
4. Semantic retrieval
5. LLM-based content generation (API Key - OpenAI/Gemini/Groq)
6. Citation and grounding validator
7. Teacher review interface (now expanded to dual-role)

### 1.5 GenAI Concepts to Demonstrate (PS-1.VITProj (1).md:41)
RAG, embeddings, vector search, prompt engineering, grounded generation, hallucination control.

### 1.6 Evaluation Metrics (PS-1.VITProj (1).md:45)
Retrieval relevance, syllabus coverage, factual correctness, citation accuracy, teacher ratings (1-5).

### 1.7 Extension (PS-1.VITProj (1).md:49)
Generate different versions for students, teachers and exam preparation from same knowledge base (implemented via difficulty/persona param).

---

## 2. Refined Requirements from Discussion

### 2.1 Tech Stack Decisions (Locked)
- **LLM:** API Key based (user has key) - Adapter pattern to support OpenAI `gpt-4o-mini` / Gemini 2.0 Flash / Groq Llama-3.3-70b. Env var `LLM_PROVIDER` + `API_KEY`.
- **Embeddings:** Local free `sentence-transformers/all-MiniLM-L6-v2` (384 dim) - saves API cost, fast, offline. Alternative: `text-embedding-3-small` if user prefers.
- **Vector DB:** **ChromaDB** (chosen over Qdrant/FAISS). Reason: Free, no Docker/server, native `collection` support = perfect for subject-wise collections, persistent `chroma.sqlite3`. User confirmed having both Chorma/Qdrant UI but Chroma fastest for 2-day demo.
- **Backend:** FastAPI + SQLAlchemy + SQLite (for demo) + JWT (bcrypt + python-jose)
- **Frontend:** React (Vite) + React Router + Axios + Tailwind. User said "React Native" -> clarified as **React Web** for localhost demo (React Native = mobile, overkill for 2 days). Will build React Web.
- **PDF Parsing:** PyMuPDF (fitz) + pypdf fallback, RecursiveCharacterTextSplitter (600 tokens, 100 overlap)
- **Demo:** Localhost only. User will download actual Class 11 textbooks of multiple subjects.

### 2.2 Dual-Role System (Critical New Requirement)

#### Teacher Role
- Signup/Login with `role=teacher`
- Create **Collections/Sections based on subject** e.g., `Physics - Class 11`, `Chemistry - Class 11`
- Upload **multiple PDFs/notes per collection**
- View/Manage own uploads (with preview, delete, filename, page count)
- Generate any teaching material (all 7 sections) grounded in selected collection
- View generation history + citations

#### Student Role
- Signup/Login with `role=student`
- **Read-Only Catalog:** See list of collections + PDF filenames uploaded by teachers (e.g., `Teacher: Foram -> Physics Class 11 [3 PDFs: Ncert_Ch1.pdf, Notes_Ch2.pdf]`). **No preview / No download / No upload** - only names so they know what is available and avoid out-of-syllabus queries.
- Select collection -> Query/Generate material ONLY from that collection's corpus
- Cannot upload, cannot see raw PDF content, cannot access other students' data

#### Auth & Access Control
- `users(id, email, password_hash, role)`
- `collections(id, name, subject, class_level, teacher_id FK, chroma_collection_name)`
- `documents(id, collection_id FK, filename, pages, upload_date, file_path)`
- JWT contains `{user_id, role, email}`. Middleware `require_role('teacher')` guards upload/create.
- `GET /catalog` for student returns only metadata (names), not file URLs.

### 2.3 Collection Design
- Collection name in Chroma = `t{teacher_id}_{subject_slug}_{class}` e.g., `t1_physics_class11`
- Enables isolation: Student query strictly filtered by `where={"collection_id": X}` or by targeting specific Chroma collection.
- Supports multi-subject, multi-PDF per subject.

---

## 3. Architecture

```
[React Vite Frontend]
  /login, /signup -> POST /auth/*
  /teacher/* (protected, role=teacher) -> Upload, Manage, Generate
  /student/* (protected, role=student) -> Catalog, Generate

[FastAPI Backend]
  /auth/signup, /auth/login
  /collections (POST teacher only, GET both)
  /collections/{id}/upload (teacher only)
  /collections/{id}/documents (teacher: full, student: names only)
  /catalog (student view)
  /query & /generate (both, filtered by collection_id)
  /validator (internal)

[Services]
  Ingestion: PyMuPDF -> Clean -> Chunk (600/100) -> Embed (MiniLM) -> ChromaDB
  Retrieval: Query Embed -> Top-k (5) MMR per collection
  Generation: Prompt (context + strict grounding + citation format [Source: filename, p.X]) -> LLM -> Structured JSON (7 sections)
  Validator: Cosine similarity check, flag hallucinations, ensure citations

[Storage]
  SQLite: users, collections, documents, ratings
  ChromaDB: vectors + metadata {source, page, collection_id, teacher_id}
  /uploads: raw PDFs (teacher preview only)
```

---

## 4. 2-Day Execution Plan

### Day 1 - Backend Core (8 hrs)
1.  **Auth (2 hrs):** FastAPI scaffold, SQLite, JWT, bcrypt, `/auth/signup`, `/auth/login`, `get_current_user`, role guard
2.  **Collections & DB (1.5 hrs):** `collections` + `documents` tables, CRUD, Chroma collection creation `t{teacher_id}_{slug}`
3.  **Ingestion Pipeline (2 hrs):** `POST /collections/{id}/upload` -> PyMuPDF -> RecursiveCharacterTextSplitter (600,100) -> MiniLM embed -> Chroma persist (with {source,page,collection_id})
4.  **Retrieval + Generation + Validator (2.5 hrs):** Semantic search (top 5 MMR), prompt engineering for 7-section JSON, citation formatter `[Source: doc, p.X]`, grounding validator (similarity >0.75)

### Day 2 - Frontend + Polish (7 hrs)
5.  **React Auth + Protected Routes (2 hrs):** Login/Signup (role selector), JWT storage, PrivateRoute, Navbar role-based
6.  **Teacher UI (2.5 hrs):** Dashboard (My Collections cards), Create Collection modal, Upload PDFs (multiple), My PDFs list (preview/delete), Generate page (collection dropdown + prompt + 7-section tab view + sources + rating)
7.  **Student UI (1.5 hrs):** Dashboard (Catalog cards: Teacher -> Subject -> PDF names), No upload button, Generate page (collection select + query + 7-section output + sources), names-only guarantee
8.  **Integration & Seeding (1 hr):** .env for API key, CORS, download 2 NCERT sample PDFs, seed 1 teacher + 1 student, end-to-end test

### Deliverables
- Teacher can create collections, upload PDFs, see previews, generate all 7 sections with citations
- Student can see catalog (PDF names only), select collection, generate grounded content
- No hallucination when query outside corpus -> "Not found in uploaded syllabus"
- Evaluation: retrieval relevance + citation accuracy + teacher rating 1-5
- Extension: difficulty/persona param ready

---

## 5. Open Questions (To Confirm During Build)
1.  Student Catalog Scope: See ALL teachers' collections (simplest) vs only assigned class teacher? Default: ALL.
2.  PDF Preview: Student strictly no preview/download? Confirmed YES.
3.  LLM Provider: Which API key (OpenAI/Gemini/Groq)? Adapter ready.
4.  Demo Users: Seed dummy teacher/student or manual signup?

---

## 6. Risks & Mitigations
- **PDF quality (scanned):** Use PyMuPDF + OCR fallback (pytesseract) if needed
- **Embedding cost:** Keep local MiniLM to stay free
- **Timeline risk:** If Auth takes longer, mock auth fallback (localStorage role) to save 1hr
- **Hallucination control:** Strict prompt + validator threshold tuning

---

*This document preserves all understanding from PS-1.VITProj (1).md and subsequent discussions (collections, dual views, auth, ChromaDB, React, localhost, 2-day constraint).*
