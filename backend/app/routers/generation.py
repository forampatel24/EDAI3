from fastapi import APIRouter, Depends, HTTPException, UploadFile, File, Form
from sqlalchemy.orm import Session
import os, uuid, shutil
from ..database import get_db
from ..models import User, Collection, Document
from ..auth import get_current_user, require_role
from ..config import settings
from ..services.ingestion import extract_text, better_chunk
from ..services.embeddings import get_or_create_collection, embed_texts
from ..services.retrieval import retrieve
from ..services.generation import generate_content
from ..services.validator import validate_grounding
from ..schemas import GenerateRequest, GenerateResponse

router = APIRouter(tags=["generation"])

@router.post("/collections/{collection_id}/upload")
async def upload_pdfs(collection_id: int, files: list[UploadFile] = File(...), db: Session = Depends(get_db), current_user: User = Depends(require_role("teacher"))):
    col = db.query(Collection).filter(Collection.id == collection_id, Collection.teacher_id == current_user.id).first()
    if not col:
        raise HTTPException(status_code=404, detail="Collection not found or not owned")
    saved = []
    for file in files:
        if not file.filename.lower().endswith(".pdf"):
            raise HTTPException(status_code=400, detail="Only PDFs allowed")
        # save
        uid = str(uuid.uuid4())[:8]
        safe_name = f"{uid}_{file.filename}"
        file_path = os.path.join(settings.UPLOAD_DIR, safe_name)
        with open(file_path, "wb") as buffer:
            shutil.copyfileobj(file.file, buffer)
        # extract & chunk
        pages_text, n_pages = extract_text(file_path)
        chunks = better_chunk(pages_text)
        if not chunks:
            os.remove(file_path)
            raise HTTPException(status_code=400, detail=f"No text extracted from {file.filename}")
        # embed & store
        texts = [c["text"] for c in chunks]
        embeddings = embed_texts(texts)
        chroma_coll = get_or_create_collection(col.chroma_collection_name)
        ids = [f"{collection_id}_{uid}_{i}" for i in range(len(chunks))]
        metadatas = [{"source": file.filename, "page": c["page"], "collection_id": collection_id, "teacher_id": current_user.id, "doc_id": 0} for c in chunks]  # doc_id updated after db
        # temporary placeholder, will update doc_id after insert
        chroma_coll.add(ids=ids, embeddings=embeddings, documents=texts, metadatas=metadatas)
        # db record
        doc = Document(
            collection_id=collection_id,
            filename=safe_name,
            original_filename=file.filename,
            file_path=file_path,
            pages=n_pages,
            chunks=len(chunks)
        )
        db.add(doc)
        db.commit()
        db.refresh(doc)
        # update chroma metadata with real doc_id
        try:
            new_metas = [{"source": file.filename, "page": c["page"], "collection_id": collection_id, "teacher_id": current_user.id, "doc_id": doc.id} for c in chunks]
            chroma_coll.update(ids=ids, metadatas=new_metas)
        except:
            pass
        saved.append({"filename": file.filename, "pages": n_pages, "chunks": len(chunks), "doc_id": doc.id})
    return {"detail": f"Uploaded {len(saved)} files", "files": saved}

@router.post("/generate", response_model=GenerateResponse)
def generate(req: GenerateRequest, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    col = db.query(Collection).filter(Collection.id == req.collection_id).first()
    if not col:
        raise HTTPException(status_code=404, detail="Collection not found")
    # retrieval
    chunks = retrieve(col.chroma_collection_name, req.prompt, top_k=5)
    # class_level for prompt
    class_level = col.class_level or "Class 11"
    data = generate_content(req.prompt, chunks, difficulty=req.difficulty, class_level=class_level)
    grounded, warning = validate_grounding(data, chunks)
    # add warning if needed
    if warning and not data.get("warning"):
        data["warning"] = warning
    # prepare response
    citations = data.get("citations", [])
    # ensure retrieved_chunks format
    retrieved = [{"text": c["text"], "metadata": c["metadata"], "score": c["score"]} for c in chunks]
    return GenerateResponse(
        explanation=data.get("explanation",""),
        key_concepts=data.get("key_concepts",[]),
        worked_examples=data.get("worked_examples",[]),
        mcqs=data.get("mcqs",[]),
        descriptive_questions=data.get("descriptive_questions",[]),
        quiz=data.get("quiz",[]),
        revision_notes=data.get("revision_notes",""),
        citations=citations,
        retrieved_chunks=retrieved,
        grounded=grounded,
        warning=data.get("warning")
    )

@router.get("/catalog")
def catalog(db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    """Student catalog: collections with PDF names only"""
    cols = db.query(Collection).all()
    out = []
    for c in cols:
        docs = db.query(Document).filter(Document.collection_id == c.id).all()
        teacher = db.query(User).filter(User.id == c.teacher_id).first()
        out.append({
            "id": c.id,
            "name": c.name,
            "subject": c.subject,
            "class_level": c.class_level,
            "description": c.description,
            "teacher_name": teacher.name if teacher else "Unknown",
            "teacher_email": teacher.email if teacher else "",
            "pdf_names": [d.original_filename for d in docs],
            "pdf_count": len(docs),
            "created_at": c.created_at
        })
    return out
