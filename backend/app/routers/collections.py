from fastapi import APIRouter, Depends, HTTPException, UploadFile, File
from sqlalchemy.orm import Session
from typing import List
import os, re, shutil
from ..database import get_db
from ..models import User, Collection, Document
from ..schemas import CollectionCreate, CollectionOut, DocumentOut, DocumentNameOnly
from ..auth import get_current_user, require_role
from ..config import settings

router = APIRouter(prefix="/collections", tags=["collections"])

def slugify(s: str) -> str:
    s = re.sub(r'[^a-zA-Z0-9]+', '_', s.lower()).strip('_')
    return s[:30]

@router.post("", response_model=CollectionOut)
def create_collection(payload: CollectionCreate, db: Session = Depends(get_db), current_user: User = Depends(require_role("teacher"))):
    chroma_name = f"t{current_user.id}_{slugify(payload.subject)}_{slugify(payload.name)}".lower()
    # ensure unique
    existing = db.query(Collection).filter(Collection.chroma_collection_name == chroma_name).first()
    counter = 1
    base = chroma_name
    while existing:
        chroma_name = f"{base}_{counter}"
        existing = db.query(Collection).filter(Collection.chroma_collection_name == chroma_name).first()
        counter += 1

    col = Collection(
        name=payload.name,
        subject=payload.subject,
        class_level=payload.class_level,
        description=payload.description,
        teacher_id=current_user.id,
        chroma_collection_name=chroma_name
    )
    db.add(col)
    db.commit()
    db.refresh(col)
    return CollectionOut(
        id=col.id, name=col.name, subject=col.subject, class_level=col.class_level,
        description=col.description, teacher_id=col.teacher_id,
        teacher_email=current_user.email, teacher_name=current_user.name,
        chroma_collection_name=col.chroma_collection_name, document_count=0, created_at=col.created_at
    )

@router.get("", response_model=List[CollectionOut])
def list_collections(db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    cols = db.query(Collection).all()
    out = []
    for c in cols:
        teacher = db.query(User).filter(User.id == c.teacher_id).first()
        doc_count = db.query(Document).filter(Document.collection_id == c.id).count()
        out.append(CollectionOut(
            id=c.id, name=c.name, subject=c.subject, class_level=c.class_level,
            description=c.description, teacher_id=c.teacher_id,
            teacher_email=teacher.email if teacher else None,
            teacher_name=teacher.name if teacher else None,
            chroma_collection_name=c.chroma_collection_name, document_count=doc_count, created_at=c.created_at
        ))
    return out

@router.get("/my", response_model=List[CollectionOut])
def my_collections(db: Session = Depends(get_db), current_user: User = Depends(require_role("teacher"))):
    cols = db.query(Collection).filter(Collection.teacher_id == current_user.id).all()
    out = []
    for c in cols:
        doc_count = db.query(Document).filter(Document.collection_id == c.id).count()
        out.append(CollectionOut(
            id=c.id, name=c.name, subject=c.subject, class_level=c.class_level,
            description=c.description, teacher_id=c.teacher_id,
            teacher_email=current_user.email, teacher_name=current_user.name,
            chroma_collection_name=c.chroma_collection_name, document_count=doc_count, created_at=c.created_at
        ))
    return out

@router.get("/{collection_id}/documents", response_model=List[DocumentOut])
def get_documents(collection_id: int, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    col = db.query(Collection).filter(Collection.id == collection_id).first()
    if not col:
        raise HTTPException(status_code=404, detail="Collection not found")
    # Teacher can see own, student can see any but filtered view handled separately
    docs = db.query(Document).filter(Document.collection_id == collection_id).all()
    # Teacher gets full, student gets name-only but same endpoint returns full; frontend filters. For strict, check role?
    return docs

@router.get("/{collection_id}/documents/names", response_model=List[DocumentNameOnly])
def get_document_names(collection_id: int, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    """Student view - names only"""
    col = db.query(Collection).filter(Collection.id == collection_id).first()
    if not col:
        raise HTTPException(status_code=404, detail="Collection not found")
    docs = db.query(Document).filter(Document.collection_id == collection_id).all()
    return [DocumentNameOnly(id=d.id, original_filename=d.original_filename, pages=d.pages, chunks=d.chunks) for d in docs]

@router.delete("/{collection_id}")
def delete_collection(collection_id: int, db: Session = Depends(get_db), current_user: User = Depends(require_role("teacher"))):
    col = db.query(Collection).filter(Collection.id == collection_id, Collection.teacher_id == current_user.id).first()
    if not col:
        raise HTTPException(status_code=404, detail="Collection not found or not owned")
    # delete chroma collection
    try:
        from ..services.embeddings import get_chroma_client
        client = get_chroma_client()
        try:
            client.delete_collection(col.chroma_collection_name)
        except:
            pass
    except:
        pass
    # delete files
    docs = db.query(Document).filter(Document.collection_id == col.id).all()
    for d in docs:
        try:
            if os.path.exists(d.file_path):
                os.remove(d.file_path)
        except:
            pass
    db.delete(col)
    db.commit()
    return {"detail": "deleted"}

@router.delete("/documents/{doc_id}")
def delete_document(doc_id: int, db: Session = Depends(get_db), current_user: User = Depends(require_role("teacher"))):
    doc = db.query(Document).filter(Document.id == doc_id).first()
    if not doc:
        raise HTTPException(status_code=404, detail="Document not found")
    col = db.query(Collection).filter(Collection.id == doc.collection_id, Collection.teacher_id == current_user.id).first()
    if not col:
        raise HTTPException(status_code=403, detail="Not owner")
    # remove from chroma
    try:
        from ..services.embeddings import get_chroma_client
        client = get_chroma_client()
        coll = client.get_collection(col.chroma_collection_name)
        # delete where document_id == doc_id
        coll.delete(where={"doc_id": doc_id})
    except Exception as e:
        print("chroma delete error", e)
    try:
        if os.path.exists(doc.file_path):
            os.remove(doc.file_path)
    except:
        pass
    db.delete(doc)
    db.commit()
    return {"detail": "deleted"}
