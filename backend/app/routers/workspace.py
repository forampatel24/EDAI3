"""Phase 2: teacher workspace CRUD (teacher-only). Generation is evidence-gated."""
import json
from datetime import datetime
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from ..database import get_db
from ..models import User, Collection, WorkspaceItem
from ..auth import require_role
from ..services.evidence import retrieve_with_repair, abstain_response
from ..services.workspace import KINDS, generate_workspace_content
from ..services.validator import validate_citations, check_alignment
from ..schemas import WorkspaceGenerateRequest, WorkspaceItemOut, WorkspaceUpdateRequest, WorkspacePublishRequest

router = APIRouter(prefix="/workspace", tags=["workspace"])


def _to_out(item: WorkspaceItem, collection_name: str = None):
    try:
        params = json.loads(item.params_json or "{}")
    except Exception:
        params = {}
    try:
        content = json.loads(item.content_json or "{}")
    except Exception:
        content = {}
    return WorkspaceItemOut(
        id=item.id, kind=item.kind, title=item.title,
        collection_id=item.collection_id, collection_name=collection_name,
        status=item.status, abstained=item.abstained,
        evidence_score=item.evidence_score,
        evidence_status=("sufficient" if not item.abstained else "insufficient"),
        repair_used=params.get("_repair_used", False),
        params=params, content=content,
        warning=content.get("warning") if isinstance(content, dict) else None,
        created_at=item.created_at, updated_at=item.updated_at,
    )


@router.post("/generate", response_model=WorkspaceItemOut)
def workspace_generate(
    req: WorkspaceGenerateRequest, db: Session = Depends(get_db),
    current_user: User = Depends(require_role("teacher")),
):
    if req.kind not in KINDS:
        raise HTTPException(status_code=400, detail=f"kind must be one of {KINDS}")
    col = db.query(Collection).filter(
        Collection.id == req.collection_id, Collection.teacher_id == current_user.id
    ).first()
    if not col:
        raise HTTPException(status_code=404, detail="Collection not found or not owned")
    params = {
        "topic": req.topic,
        "subject": req.subject or col.subject,
        "class_level": req.class_level or col.class_level or "Class 11",
        "duration_minutes": req.duration_minutes,
        "difficulty": req.difficulty or "medium",
        "num_questions": req.num_questions,
        "question_type": req.question_type,
        "objectives": req.objectives,
        "custom_instructions": req.custom_instructions,
    }
    query = f"{req.topic} {req.subject or col.subject}".strip()
    chunks, ev = retrieve_with_repair(col.chroma_collection_name, query, top_k=5)
    params["_repair_used"] = ev["repaired"]
    title = req.title or f"{req.kind.replace('_',' ').title()}: {req.topic}"
    if not ev["sufficient"]:
        data = abstain_response(query, ev, class_level=params["class_level"])
        item = WorkspaceItem(
            teacher_id=current_user.id, collection_id=col.id, kind=req.kind,
            title=title, params_json=json.dumps(params),
            content_json=json.dumps(data), status="draft",
            abstained=True, evidence_score=ev["evidence_score"],
        )
        db.add(item); db.commit(); db.refresh(item)
        return _to_out(item, col.name)
    data = generate_workspace_content(req.kind, params, chunks)
    # informational checks (same as /generate)
    issues = validate_citations(data, chunks)
    align = check_alignment(query, chunks, subject=params["subject"], class_level=params["class_level"])
    extra = []
    if issues:
        extra.append("Citation issue: " + "; ".join(issues[:2]))
    if align:
        extra.append(align)
    if extra:
        data["warning"] = ((data.get("warning") or "") + " | " + " | ".join(extra)).strip(" |")
    item = WorkspaceItem(
        teacher_id=current_user.id, collection_id=col.id, kind=req.kind,
        title=title, params_json=json.dumps(params),
        content_json=json.dumps(data), status="draft",
        abstained=False, evidence_score=ev["evidence_score"],
    )
    db.add(item); db.commit(); db.refresh(item)
    return _to_out(item, col.name)


@router.get("", response_model=list[WorkspaceItemOut])
def workspace_list(db: Session = Depends(get_db), current_user: User = Depends(require_role("teacher"))):
    items = db.query(WorkspaceItem).filter(
        WorkspaceItem.teacher_id == current_user.id
    ).order_by(WorkspaceItem.updated_at.desc()).all()
    out = []
    for it in items:
        col = db.query(Collection).filter(Collection.id == it.collection_id).first()
        out.append(_to_out(it, col.name if col else None))
    return out


@router.get("/{item_id}", response_model=WorkspaceItemOut)
def workspace_get(item_id: int, db: Session = Depends(get_db), current_user: User = Depends(require_role("teacher"))):
    it = db.query(WorkspaceItem).filter(
        WorkspaceItem.id == item_id, WorkspaceItem.teacher_id == current_user.id
    ).first()
    if not it:
        raise HTTPException(status_code=404, detail="Workspace item not found")
    col = db.query(Collection).filter(Collection.id == it.collection_id).first()
    return _to_out(it, col.name if col else None)


@router.put("/{item_id}", response_model=WorkspaceItemOut)
def workspace_update(
    item_id: int, req: WorkspaceUpdateRequest, db: Session = Depends(get_db),
    current_user: User = Depends(require_role("teacher")),
):
    it = db.query(WorkspaceItem).filter(
        WorkspaceItem.id == item_id, WorkspaceItem.teacher_id == current_user.id
    ).first()
    if not it:
        raise HTTPException(status_code=404, detail="Workspace item not found")
    if req.title is not None:
        it.title = req.title
    if req.content is not None:
        it.content_json = json.dumps(req.content)
    if req.status is not None:
        if req.status not in ("draft", "ready"):
            raise HTTPException(status_code=400, detail="status must be draft or ready")
        it.status = req.status
    it.updated_at = datetime.utcnow()
    db.commit(); db.refresh(it)
    col = db.query(Collection).filter(Collection.id == it.collection_id).first()
    return _to_out(it, col.name if col else None)


@router.delete("/{item_id}")
def workspace_delete(item_id: int, db: Session = Depends(get_db), current_user: User = Depends(require_role("teacher"))):
    it = db.query(WorkspaceItem).filter(
        WorkspaceItem.id == item_id, WorkspaceItem.teacher_id == current_user.id
    ).first()
    if not it:
        raise HTTPException(status_code=404, detail="Workspace item not found")
    db.delete(it); db.commit()
    return {"detail": "deleted"}


@router.post("/{item_id}/publish")
def workspace_publish(
    item_id: int, payload: WorkspacePublishRequest = None,
    db: Session = Depends(get_db), current_user: User = Depends(require_role("teacher")),
):
    """Phase 3: mark ready, or publish directly into a classroom as assignment/quiz."""
    from ..models import Classroom, Assignment, Quiz
    from ..services.classroom import workspace_to_quiz_questions
    it = db.query(WorkspaceItem).filter(
        WorkspaceItem.id == item_id, WorkspaceItem.teacher_id == current_user.id
    ).first()
    if not it:
        raise HTTPException(status_code=404, detail="Workspace item not found")
    if it.abstained:
        raise HTTPException(status_code=400, detail="Cannot publish abstained content (insufficient evidence)")
    target = (payload.target if payload and payload.target else "none").lower()
    classroom_id = payload.classroom_id if payload else None
    if target in ("assignment", "quiz"):
        if not classroom_id:
            raise HTTPException(status_code=400, detail="classroom_id required to publish")
        room = db.query(Classroom).filter(
            Classroom.id == classroom_id, Classroom.teacher_id == current_user.id
        ).first()
        if not room:
            raise HTTPException(status_code=404, detail="Classroom not found or not owned")
        content = json.loads(it.content_json or "{}")
        if target == "assignment":
            intro = content.get("introduction") or content.get("explanation") or content.get("content") or ""
            a = Assignment(
                classroom_id=room.id, teacher_id=current_user.id, title=it.title,
                description=str(intro)[:500], instructions="Generated from Teacher Workspace.",
                source_workspace_item_id=it.id,
            )
            db.add(a)
            it.status = "published"
            db.commit()
            return {"detail": f"Published as assignment in {room.name}.", "item_id": it.id,
                    "status": it.status, "assignment_id": a.id, "classroom_id": room.id}
        questions = workspace_to_quiz_questions(content)
        if not questions:
            raise HTTPException(status_code=400, detail="No questions found in this workspace item to publish as quiz")
        params = json.loads(it.params_json or "{}")
        q = Quiz(
            classroom_id=room.id, teacher_id=current_user.id, title=it.title,
            topic=params.get("topic"), duration_minutes=params.get("duration_minutes"),
            questions_json=json.dumps(questions), source_workspace_item_id=it.id,
        )
        db.add(q)
        it.status = "published"
        db.commit()
        return {"detail": f"Published as quiz ({len(questions)} questions) in {room.name}.",
                "item_id": it.id, "status": it.status, "quiz_id": q.id, "classroom_id": room.id}
    it.status = "ready"
    it.updated_at = datetime.utcnow()
    db.commit()
    return {"detail": "Marked ready for classroom publishing.", "item_id": it.id, "status": it.status}
