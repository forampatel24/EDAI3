"""Phase 4: personalized notes — save AI content, organize into folders."""
import json
from datetime import datetime
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from ..database import get_db
from ..models import User, Collection, NoteFolder, Note
from ..auth import get_current_user
from ..schemas import NoteFolderCreate, NoteFolderOut, NoteCreate, NoteOut, NoteUpdateRequest

router = APIRouter(prefix="/notes", tags=["notes"])


def _folder_out(db: Session, f: NoteFolder):
    count = db.query(Note).filter(Note.folder_id == f.id, Note.owner_id == f.owner_id).count()
    return NoteFolderOut(id=f.id, name=f.name, note_count=count, created_at=f.created_at)


def _note_out(db: Session, n: Note):
    folder_name, collection_name = None, None
    if n.folder_id:
        f = db.query(NoteFolder).filter(NoteFolder.id == n.folder_id).first()
        folder_name = f.name if f else None
    if n.collection_id:
        c = db.query(Collection).filter(Collection.id == n.collection_id).first()
        collection_name = c.name if c else None
    try:
        content = json.loads(n.content_json or "{}")
    except Exception:
        content = {}
    try:
        meta = json.loads(n.meta_json or "{}")
    except Exception:
        meta = {}
    return NoteOut(
        id=n.id, title=n.title, folder_id=n.folder_id, folder_name=folder_name,
        collection_id=n.collection_id, collection_name=collection_name,
        source_type=n.source_type, source_ref_id=n.source_ref_id,
        content=content, meta=meta, created_at=n.created_at, updated_at=n.updated_at,
    )


@router.post("/folders", response_model=NoteFolderOut)
def create_folder(payload: NoteFolderCreate, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    if not payload.name.strip():
        raise HTTPException(status_code=400, detail="Folder name required")
    f = NoteFolder(owner_id=current_user.id, name=payload.name.strip())
    db.add(f); db.commit(); db.refresh(f)
    return _folder_out(db, f)


@router.get("/folders", response_model=list[NoteFolderOut])
def list_folders(db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    folders = db.query(NoteFolder).filter(NoteFolder.owner_id == current_user.id).order_by(NoteFolder.created_at).all()
    return [_folder_out(db, f) for f in folders]


@router.delete("/folders/{folder_id}")
def delete_folder(folder_id: int, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    f = db.query(NoteFolder).filter(NoteFolder.id == folder_id, NoteFolder.owner_id == current_user.id).first()
    if not f:
        raise HTTPException(status_code=404, detail="Folder not found")
    # unfile notes instead of deleting them
    db.query(Note).filter(Note.folder_id == folder_id).update({"folder_id": None})
    db.delete(f); db.commit()
    return {"detail": "deleted"}


@router.post("", response_model=NoteOut)
def create_note(payload: NoteCreate, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    if not payload.title.strip():
        raise HTTPException(status_code=400, detail="Note title required")
    if payload.folder_id:
        f = db.query(NoteFolder).filter(NoteFolder.id == payload.folder_id, NoteFolder.owner_id == current_user.id).first()
        if not f:
            raise HTTPException(status_code=404, detail="Folder not found")
    n = Note(
        owner_id=current_user.id, folder_id=payload.folder_id,
        title=payload.title.strip(), collection_id=payload.collection_id,
        source_type=payload.source_type or "generate", source_ref_id=payload.source_ref_id,
        content_json=json.dumps(payload.content or {}), meta_json=json.dumps(payload.meta or {}),
    )
    db.add(n); db.commit(); db.refresh(n)
    return _note_out(db, n)


@router.get("", response_model=list[NoteOut])
def list_notes(folder_id: int = None, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    q = db.query(Note).filter(Note.owner_id == current_user.id)
    if folder_id is not None:
        q = q.filter(Note.folder_id == folder_id)
    notes = q.order_by(Note.updated_at.desc()).all()
    return [_note_out(db, n) for n in notes]


@router.get("/{note_id}", response_model=NoteOut)
def get_note(note_id: int, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    n = db.query(Note).filter(Note.id == note_id, Note.owner_id == current_user.id).first()
    if not n:
        raise HTTPException(status_code=404, detail="Note not found")
    return _note_out(db, n)


@router.put("/{note_id}", response_model=NoteOut)
def update_note(note_id: int, payload: NoteUpdateRequest, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    n = db.query(Note).filter(Note.id == note_id, Note.owner_id == current_user.id).first()
    if not n:
        raise HTTPException(status_code=404, detail="Note not found")
    if payload.title is not None:
        n.title = payload.title.strip() or n.title
    if payload.folder_id is not None:
        if payload.folder_id:
            f = db.query(NoteFolder).filter(NoteFolder.id == payload.folder_id, NoteFolder.owner_id == current_user.id).first()
            if not f:
                raise HTTPException(status_code=404, detail="Folder not found")
        n.folder_id = payload.folder_id
    if payload.content is not None:
        n.content_json = json.dumps(payload.content)
    if payload.meta is not None:
        n.meta_json = json.dumps(payload.meta)
    n.updated_at = datetime.utcnow()
    db.commit(); db.refresh(n)
    return _note_out(db, n)


@router.delete("/{note_id}")
def delete_note(note_id: int, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    n = db.query(Note).filter(Note.id == note_id, Note.owner_id == current_user.id).first()
    if not n:
        raise HTTPException(status_code=404, detail="Note not found")
    db.delete(n); db.commit()
    return {"detail": "deleted"}
