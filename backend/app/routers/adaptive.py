"""Phase 4: adaptive loop — overview, targeted practice, feedback, class insights."""
import json
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from ..database import get_db
from ..models import User, Collection, Classroom, ClassroomMember, Quiz, QuizAttempt, WorkspaceItem
from ..auth import get_current_user, require_role
from ..services.adaptive import concept_of, aggregate, overall_accuracy, suggested_difficulty, difficulty_for_concept
from ..services.evidence import retrieve_with_repair, abstain_response
from ..services.workspace import generate_workspace_content
from ..schemas import (
    AdaptiveOverviewOut, ConceptStatOut, PracticeRequest, PracticeOut,
    AttemptFeedbackOut, FeedbackItemOut, ClassroomInsightsOut,
)

router = APIRouter(prefix="/adaptive", tags=["adaptive"])


def _questions_by_quiz(db: Session, attempts: list) -> dict:
    """One query for all referenced quizzes instead of one per attempt."""
    qids = {a.quiz_id for a in attempts}
    if not qids:
        return {}
    out = {}
    for q in db.query(Quiz).filter(Quiz.id.in_(qids)).all():
        try:
            out[q.id] = json.loads(q.questions_json or "[]")
        except Exception:
            out[q.id] = []
    return out


def _iter_scored(att: QuizAttempt, questions: list):
    """Yield (index, detail, question, marks, awarded, correct) for each scored item.

    Single source of truth for turning a stored attempt into per-question results —
    used by both the aggregate stats and the per-question feedback view.
    """
    try:
        details = json.loads(att.details_json or "[]")
    except Exception:
        details = []
    for i, d in enumerate(details):
        if not isinstance(d, dict) or d.get("teacher_override"):
            continue
        qq = questions[i] if i < len(questions) and isinstance(questions[i], dict) else {}
        marks = float(d.get("marks", 1) or 1)
        awarded = float(d.get("marks_awarded", 0) or 0)
        correct = awarded >= marks * 0.99 and marks > 0
        yield i, d, qq, marks, awarded, correct


def _records_for_attempts(attempts: list, questions_by_quiz: dict):
    records = []
    for att in attempts:
        questions = questions_by_quiz.get(att.quiz_id, [])
        for i, _d, qq, _m, _a, correct in _iter_scored(att, questions):
            records.append({
                "concept": concept_of(qq, i),
                "correct": correct,
            })
    return records


def _completed_attempts(db: Session, query):
    return query.filter(QuizAttempt.completed.is_(True))


@router.get("/overview", response_model=AdaptiveOverviewOut)
def my_overview(db: Session = Depends(get_db), current_user: User = Depends(require_role("student"))):
    attempts = _completed_attempts(db, db.query(QuizAttempt).filter(QuizAttempt.student_id == current_user.id)).all()
    stats = aggregate(_records_for_attempts(attempts, _questions_by_quiz(db, attempts)))
    weak = [s["concept"] for s in stats if s["possible_misconception"]]
    return AdaptiveOverviewOut(
        concepts=[ConceptStatOut(**s) for s in stats],
        total_attempts=sum(s["attempts"] for s in stats),
        overall_accuracy=overall_accuracy(stats),
        suggested_difficulty=suggested_difficulty(stats),
        weak_concepts=weak,
    )


@router.post("/practice", response_model=PracticeOut)
def targeted_practice(payload: PracticeRequest, db: Session = Depends(get_db), current_user: User = Depends(require_role("student"))):
    col = db.query(Collection).filter(Collection.id == payload.collection_id).first()
    if not col:
        raise HTTPException(status_code=404, detail="Collection not found")
    attempts = _completed_attempts(db, db.query(QuizAttempt).filter(QuizAttempt.student_id == current_user.id)).all()
    stats = aggregate(_records_for_attempts(attempts, _questions_by_quiz(db, attempts)))
    difficulty = payload.difficulty or "auto"
    if difficulty == "auto":
        difficulty = difficulty_for_concept(stats, payload.concept, default="medium")
    query = f"{payload.concept}".strip()
    chunks, ev = retrieve_with_repair(col.chroma_collection_name, query, top_k=5)
    if not ev["sufficient"]:
        abs_data = abstain_response(query, ev, class_level=col.class_level or "Class 11")
        return PracticeOut(
            concept=payload.concept, difficulty=difficulty, abstained=True,
            evidence_score=ev["evidence_score"], questions=[],
            citations=[], warning=abs_data["warning"],
        )
    params = {
        "topic": payload.concept, "subject": col.subject,
        "class_level": col.class_level or "Class 11", "difficulty": difficulty,
        "num_questions": payload.num_questions or 5,
        "question_type": "mixed",
        "custom_instructions": f"Follow-up practice for a student who needs reinforcement on '{payload.concept}'.",
    }
    data = generate_workspace_content("quiz", params, chunks)
    questions = data.get("questions", []) if isinstance(data, dict) else []
    return PracticeOut(
        concept=payload.concept, difficulty=difficulty, abstained=False,
        evidence_score=ev["evidence_score"], questions=questions,
        citations=data.get("citations", []) if isinstance(data, dict) else [],
        warning=data.get("warning") if isinstance(data, dict) else None,
    )


def _feedback_for_attempt(db: Session, att: QuizAttempt):
    q = db.query(Quiz).filter(Quiz.id == att.quiz_id).first()
    if not q:
        raise HTTPException(status_code=404, detail="Quiz not found")
    try:
        questions = json.loads(q.questions_json or "[]")
    except Exception:
        questions = []
    # grounded study pointers: top-1 chunk from the linked curriculum collection
    chroma_name = None
    if q.source_workspace_item_id:
        item = db.query(WorkspaceItem).filter(WorkspaceItem.id == q.source_workspace_item_id).first()
        if item:
            coll = db.query(Collection).filter(Collection.id == item.collection_id).first()
            chroma_name = coll.chroma_collection_name if coll else None
    items = []
    for i, d, qq, _marks, _awarded, correct in _iter_scored(att, questions):
        concept = concept_of(qq, i)
        pointer = None
        if not correct:
            pointer = f"Review '{concept}' in the classroom material."
            if chroma_name:
                try:
                    from ..services.retrieval import retrieve
                    hits = retrieve(chroma_name, concept, top_k=1)
                    if hits:
                        meta = hits[0].get("metadata", {}) or {}
                        pointer = (
                            f"Review '{concept}' — see {meta.get('source','textbook')} "
                            f"p.{meta.get('page','?')}: {hits[0]['text'][:160]}..."
                        )
                except Exception:
                    pass
        items.append(FeedbackItemOut(
            question_no=i + 1, question=str(qq.get("question", "")),
            concept=concept, student_answer=str(d.get("student_answer", "")),
            correct_answer=str(d.get("correct_answer", "")),
            was_correct=correct, study_pointer=pointer,
        ))
    return q, att, items


@router.get("/feedback/{attempt_id}", response_model=AttemptFeedbackOut)
def attempt_feedback(attempt_id: int, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    att = db.query(QuizAttempt).filter(QuizAttempt.id == attempt_id).first()
    if not att:
        raise HTTPException(status_code=404, detail="Attempt not found")
    q = db.query(Quiz).filter(Quiz.id == att.quiz_id).first()
    if not q:
        raise HTTPException(status_code=404, detail="Quiz not found")
    if current_user.role == "student" and att.student_id != current_user.id:
        raise HTTPException(status_code=403, detail="Not your attempt")
    if current_user.role == "teacher":
        room = db.query(Classroom).filter(Classroom.id == q.classroom_id).first()
        if not room or room.teacher_id != current_user.id:
            raise HTTPException(status_code=403, detail="Not your classroom")
    quiz, attempt, items = _feedback_for_attempt(db, att)
    return AttemptFeedbackOut(
        attempt_id=att.id, quiz_title=quiz.title, score=att.score,
        total=att.total, items=items,
    )


@router.get("/classroom/{classroom_id}", response_model=ClassroomInsightsOut)
def classroom_insights(classroom_id: int, db: Session = Depends(get_db), current_user: User = Depends(require_role("teacher"))):
    room = db.query(Classroom).filter(Classroom.id == classroom_id, Classroom.teacher_id == current_user.id).first()
    if not room:
        raise HTTPException(status_code=404, detail="Classroom not found or not owned")
    quizzes = db.query(Quiz).filter(Quiz.classroom_id == classroom_id).all()
    qids = [q.id for q in quizzes]
    attempts = _completed_attempts(db, db.query(QuizAttempt).filter(QuizAttempt.quiz_id.in_(qids))).all() if qids else []
    cache = _questions_by_quiz(db, attempts)
    stats = aggregate(_records_for_attempts(attempts, cache))
    per_student, by_student = [], {}
    for a in attempts:
        by_student.setdefault(a.student_id, []).append(a)
    students = {u.id: u for u in db.query(User).filter(User.id.in_(by_student.keys())).all()} if by_student else {}
    for sid, atts in by_student.items():
        u = students.get(sid)
        s = aggregate(_records_for_attempts(atts, cache))
        per_student.append({
            "student_id": sid, "name": u.name if u else None,
            "attempts": sum(x["attempts"] for x in s),
            "accuracy": overall_accuracy(s),
            "weak_concepts": [x["concept"] for x in s if x["possible_misconception"]],
        })
    return ClassroomInsightsOut(
        classroom_id=classroom_id, concepts=[ConceptStatOut(**s) for s in stats],
        total_attempts=sum(s["attempts"] for s in stats),
        overall_accuracy=overall_accuracy(stats),
        weak_concepts=[s["concept"] for s in stats if s["possible_misconception"]],
        per_student=per_student,
    )
