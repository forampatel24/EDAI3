"""Phase 3: digital classroom — classes, join codes, assignments, quizzes, scores."""
import json
import os
import uuid
import shutil
from datetime import datetime
from fastapi import APIRouter, Depends, HTTPException, UploadFile, File, Form
from sqlalchemy.orm import Session
from ..database import get_db
from ..models import (
    User, Classroom, ClassroomMember, Assignment, AssignmentSubmission,
    Quiz, QuizAttempt,
)
from ..auth import get_current_user, require_role
from ..config import settings
from ..services.classroom import generate_code, score_quiz
from ..schemas import (
    ClassroomCreate, ClassroomOut, ClassroomJoinRequest, MemberOut,
    AssignmentCreate, AssignmentOut, SubmissionOut, GradeRequest,
    QuizCreate, QuizOut, AttemptCreate, AttemptOut,
)

router = APIRouter(prefix="/classrooms", tags=["classroom"])


def _counts(db: Session, classroom_id: int):
    members = db.query(ClassroomMember).filter(ClassroomMember.classroom_id == classroom_id).count()
    assigns = db.query(Assignment).filter(Assignment.classroom_id == classroom_id).count()
    quizzes = db.query(Quiz).filter(Quiz.classroom_id == classroom_id).count()
    return members, assigns, quizzes


def _class_out(db: Session, c: Classroom):
    teacher = db.query(User).filter(User.id == c.teacher_id).first()
    m, a, q = _counts(db, c.id)
    return ClassroomOut(
        id=c.id, name=c.name, subject=c.subject, class_level=c.class_level,
        division=c.division, code=c.code, description=c.description,
        teacher_name=teacher.name if teacher else None,
        member_count=m, assignment_count=a, quiz_count=q, created_at=c.created_at,
    )


def _own_classroom(db: Session, classroom_id: int, teacher_id: int) -> Classroom:
    c = db.query(Classroom).filter(Classroom.id == classroom_id, Classroom.teacher_id == teacher_id).first()
    if not c:
        raise HTTPException(status_code=404, detail="Classroom not found or not owned")
    return c


def _member_classroom(db: Session, classroom_id: int, student_id: int) -> Classroom:
    c = db.query(Classroom).filter(Classroom.id == classroom_id).first()
    if not c:
        raise HTTPException(status_code=404, detail="Classroom not found")
    mem = db.query(ClassroomMember).filter(
        ClassroomMember.classroom_id == classroom_id, ClassroomMember.student_id == student_id
    ).first()
    if not mem:
        raise HTTPException(status_code=403, detail="Join this classroom first (ask teacher for the code)")
    return c


# ---------- teacher: classes ----------

@router.post("", response_model=ClassroomOut)
def create_classroom(payload: ClassroomCreate, db: Session = Depends(get_db), current_user: User = Depends(require_role("teacher"))):
    for _ in range(5):
        code = generate_code()
        if not db.query(Classroom).filter(Classroom.code == code).first():
            break
    else:
        raise HTTPException(status_code=500, detail="Could not generate a unique class code")
    c = Classroom(
        teacher_id=current_user.id, name=payload.name, subject=payload.subject,
        class_level=payload.class_level, division=payload.division,
        description=payload.description, code=code,
    )
    db.add(c); db.commit(); db.refresh(c)
    return _class_out(db, c)


@router.get("/my", response_model=list[ClassroomOut])
def my_classrooms(db: Session = Depends(get_db), current_user: User = Depends(require_role("teacher"))):
    rooms = db.query(Classroom).filter(Classroom.teacher_id == current_user.id).order_by(Classroom.created_at.desc()).all()
    return [_class_out(db, c) for c in rooms]


@router.get("/{classroom_id}", response_model=ClassroomOut)
def classroom_detail(classroom_id: int, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    c = db.query(Classroom).filter(Classroom.id == classroom_id).first()
    if not c:
        raise HTTPException(status_code=404, detail="Classroom not found")
    if current_user.role == "teacher" and c.teacher_id != current_user.id:
        raise HTTPException(status_code=403, detail="Not your classroom")
    if current_user.role == "student":
        _member_classroom(db, classroom_id, current_user.id)
    return _class_out(db, c)


@router.delete("/{classroom_id}")
def delete_classroom(classroom_id: int, db: Session = Depends(get_db), current_user: User = Depends(require_role("teacher"))):
    c = _own_classroom(db, classroom_id, current_user.id)
    # cascade manually (SQLite-safe)
    for a in db.query(Assignment).filter(Assignment.classroom_id == c.id).all():
        db.query(AssignmentSubmission).filter(AssignmentSubmission.assignment_id == a.id).delete()
        db.delete(a)
    for q in db.query(Quiz).filter(Quiz.classroom_id == c.id).all():
        db.query(QuizAttempt).filter(QuizAttempt.quiz_id == q.id).delete()
        db.delete(q)
    db.query(ClassroomMember).filter(ClassroomMember.classroom_id == c.id).delete()
    db.delete(c); db.commit()
    return {"detail": "deleted"}


@router.get("/{classroom_id}/members", response_model=list[MemberOut])
def classroom_members(classroom_id: int, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    c = db.query(Classroom).filter(Classroom.id == classroom_id).first()
    if not c:
        raise HTTPException(status_code=404, detail="Classroom not found")
    if current_user.role == "teacher" and c.teacher_id != current_user.id:
        raise HTTPException(status_code=403, detail="Not your classroom")
    if current_user.role == "student":
        _member_classroom(db, classroom_id, current_user.id)
    mems = db.query(ClassroomMember).filter(ClassroomMember.classroom_id == classroom_id).all()
    out = []
    for m in mems:
        u = db.query(User).filter(User.id == m.student_id).first()
        out.append(MemberOut(student_id=m.student_id, name=u.name if u else None,
                             email=u.email if u else None, joined_at=m.joined_at))
    return out


# ---------- student: join + joined ----------

@router.post("/join", response_model=ClassroomOut)
def join_classroom(payload: ClassroomJoinRequest, db: Session = Depends(get_db), current_user: User = Depends(require_role("student"))):
    c = db.query(Classroom).filter(Classroom.code == payload.code.strip().upper()).first()
    if not c:
        raise HTTPException(status_code=404, detail="Invalid class code")
    existing = db.query(ClassroomMember).filter(
        ClassroomMember.classroom_id == c.id, ClassroomMember.student_id == current_user.id
    ).first()
    if not existing:
        db.add(ClassroomMember(classroom_id=c.id, student_id=current_user.id))
        db.commit()
    return _class_out(db, c)


@router.get("/joined/list", response_model=list[ClassroomOut])
def joined_classrooms(db: Session = Depends(get_db), current_user: User = Depends(require_role("student"))):
    mems = db.query(ClassroomMember).filter(ClassroomMember.student_id == current_user.id).all()
    out = []
    for m in mems:
        c = db.query(Classroom).filter(Classroom.id == m.classroom_id).first()
        if c:
            out.append(_class_out(db, c))
    return out


# ---------- teacher: assignments ----------

@router.post("/{classroom_id}/assignments", response_model=AssignmentOut)
async def create_assignment(
    classroom_id: int, title: str = Form(...), description: str = Form(None),
    instructions: str = Form(None), deadline: str = Form(None),
    source_workspace_item_id: int = Form(None),
    file: UploadFile = File(None),
    db: Session = Depends(get_db), current_user: User = Depends(require_role("teacher")),
):
    c = _own_classroom(db, classroom_id, current_user.id)
    dl = None
    if deadline:
        try:
            dl = datetime.fromisoformat(deadline)
        except Exception:
            raise HTTPException(status_code=400, detail="deadline must be ISO datetime")
    attach_name, attach_path, stored = None, None, None
    if file is not None and file.filename:
        adir = os.path.join(settings.UPLOAD_DIR, "assignments")
        os.makedirs(adir, exist_ok=True)
        stored = f"{uuid.uuid4().hex[:8]}_{file.filename}"
        attach_name = file.filename
        attach_path = os.path.join(adir, stored)
        with open(attach_path, "wb") as buf:
            shutil.copyfileobj(file.file, buf)
    a = Assignment(
        classroom_id=c.id, teacher_id=current_user.id, title=title,
        description=description, instructions=instructions, deadline=dl,
        attachment_filename=attach_name,
        attachment_path=attach_path, source_workspace_item_id=source_workspace_item_id,
    )
    db.add(a); db.commit(); db.refresh(a)
    return _assignment_out(db, a, None)


def _assignment_out(db: Session, a: Assignment, student_id=None):
    count = db.query(AssignmentSubmission).filter(AssignmentSubmission.assignment_id == a.id).count()
    mine, my_score = False, None
    if student_id:
        sub = db.query(AssignmentSubmission).filter(
            AssignmentSubmission.assignment_id == a.id, AssignmentSubmission.student_id == student_id
        ).order_by(AssignmentSubmission.submitted_at.desc()).first()
        if sub:
            mine, my_score = True, sub.score
    stored = os.path.basename(a.attachment_path) if a.attachment_path else None
    return AssignmentOut(
        id=a.id, classroom_id=a.classroom_id, title=a.title, description=a.description,
        instructions=a.instructions, deadline=a.deadline, attachment_filename=a.attachment_filename,
        attachment_file=stored,
        source_workspace_item_id=a.source_workspace_item_id, submission_count=count,
        my_submitted=mine, my_score=my_score, created_at=a.created_at,
    )


@router.get("/{classroom_id}/assignments", response_model=list[AssignmentOut])
def list_assignments(classroom_id: int, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    c = db.query(Classroom).filter(Classroom.id == classroom_id).first()
    if not c:
        raise HTTPException(status_code=404, detail="Classroom not found")
    if current_user.role == "teacher" and c.teacher_id != current_user.id:
        raise HTTPException(status_code=403, detail="Not your classroom")
    sid = current_user.id if current_user.role == "student" else None
    if sid:
        _member_classroom(db, classroom_id, sid)
    assigns = db.query(Assignment).filter(Assignment.classroom_id == classroom_id).order_by(Assignment.created_at.desc()).all()
    return [_assignment_out(db, a, sid) for a in assigns]


@router.get("/assignments/{assignment_id}/submissions", response_model=list[SubmissionOut])
def assignment_submissions(assignment_id: int, db: Session = Depends(get_db), current_user: User = Depends(require_role("teacher"))):
    a = db.query(Assignment).filter(Assignment.id == assignment_id).first()
    if not a:
        raise HTTPException(status_code=404, detail="Assignment not found")
    _own_classroom(db, a.classroom_id, current_user.id)
    subs = db.query(AssignmentSubmission).filter(AssignmentSubmission.assignment_id == assignment_id).all()
    out = []
    for s in subs:
        u = db.query(User).filter(User.id == s.student_id).first()
        out.append(SubmissionOut(
            id=s.id, assignment_id=s.assignment_id, student_id=s.student_id,
            student_name=u.name if u else None, student_email=u.email if u else None,
            text=s.text, file_filename=s.file_filename,
            file_stored=os.path.basename(s.file_path) if s.file_path else None,
            submitted_at=s.submitted_at,
            score=s.score, feedback=s.feedback,
        ))
    return out


@router.put("/submissions/{submission_id}/grade", response_model=SubmissionOut)
def grade_submission(submission_id: int, payload: GradeRequest, db: Session = Depends(get_db), current_user: User = Depends(require_role("teacher"))):
    s = db.query(AssignmentSubmission).filter(AssignmentSubmission.id == submission_id).first()
    if not s:
        raise HTTPException(status_code=404, detail="Submission not found")
    a = db.query(Assignment).filter(Assignment.id == s.assignment_id).first()
    _own_classroom(db, a.classroom_id, current_user.id)
    s.score = payload.score
    s.feedback = payload.feedback
    db.commit(); db.refresh(s)
    u = db.query(User).filter(User.id == s.student_id).first()
    return SubmissionOut(
        id=s.id, assignment_id=s.assignment_id, student_id=s.student_id,
        student_name=u.name if u else None, student_email=u.email if u else None,
        text=s.text, file_filename=s.file_filename,
        file_stored=os.path.basename(s.file_path) if s.file_path else None,
        submitted_at=s.submitted_at,
        score=s.score, feedback=s.feedback,
    )


# ---------- student: assignment submit ----------

@router.post("/assignments/{assignment_id}/submit", response_model=SubmissionOut)
async def submit_assignment(
    assignment_id: int, text: str = Form(None), file: UploadFile = File(None),
    db: Session = Depends(get_db), current_user: User = Depends(require_role("student")),
):
    a = db.query(Assignment).filter(Assignment.id == assignment_id).first()
    if not a:
        raise HTTPException(status_code=404, detail="Assignment not found")
    _member_classroom(db, a.classroom_id, current_user.id)
    if a.deadline and datetime.utcnow() > a.deadline:
        raise HTTPException(status_code=400, detail="Deadline has passed")
    if not (text and text.strip()) and not (file and file.filename):
        raise HTTPException(status_code=400, detail="Submit text or a file")
    orig, f_path = None, None
    if file is not None and file.filename:
        sdir = os.path.join(settings.UPLOAD_DIR, "submissions")
        os.makedirs(sdir, exist_ok=True)
        orig = file.filename
        f_path = os.path.join(sdir, f"{uuid.uuid4().hex[:8]}_{file.filename}")
        with open(f_path, "wb") as buf:
            shutil.copyfileobj(file.file, buf)
    s = db.query(AssignmentSubmission).filter(
        AssignmentSubmission.assignment_id == assignment_id, AssignmentSubmission.student_id == current_user.id
    ).first()
    if s:
        s.text = text
        if f_path:
            s.file_filename, s.file_path = orig, f_path
        s.submitted_at = datetime.utcnow()
        s.score, s.feedback = None, None  # resubmit clears old grade
    else:
        s = AssignmentSubmission(
            assignment_id=assignment_id, student_id=current_user.id, text=text,
            file_filename=orig, file_path=f_path,
        )
        db.add(s)
    db.commit(); db.refresh(s)
    return SubmissionOut(
        id=s.id, assignment_id=s.assignment_id, student_id=s.student_id,
        student_name=current_user.name, student_email=current_user.email,
        text=s.text, file_filename=s.file_filename,
        file_stored=os.path.basename(s.file_path) if s.file_path else None,
        submitted_at=s.submitted_at,
        score=s.score, feedback=s.feedback,
    )


# ---------- teacher: quizzes ----------

@router.post("/{classroom_id}/quizzes", response_model=QuizOut)
def create_quiz(
    classroom_id: int, payload: QuizCreate,
    db: Session = Depends(get_db), current_user: User = Depends(require_role("teacher")),
):
    c = _own_classroom(db, classroom_id, current_user.id)
    if not payload.questions:
        raise HTTPException(status_code=400, detail="Quiz needs at least one question")
    q = Quiz(
        classroom_id=c.id, teacher_id=current_user.id, title=payload.title,
        topic=payload.topic, duration_minutes=payload.duration_minutes,
        available_from=payload.available_from, available_until=payload.available_until,
        questions_json=json.dumps(payload.questions),
        source_workspace_item_id=payload.source_workspace_item_id,
    )
    db.add(q); db.commit(); db.refresh(q)
    return _quiz_out(db, q, None)


def _quiz_out(db: Session, q: Quiz, student_id=None):
    try:
        questions = json.loads(q.questions_json or "[]")
    except Exception:
        questions = []
    attempts = db.query(QuizAttempt).filter(QuizAttempt.quiz_id == q.id).count()
    best, mine = None, 0
    if student_id:
        mine_q = db.query(QuizAttempt).filter(QuizAttempt.quiz_id == q.id, QuizAttempt.student_id == student_id).all()
        mine = len(mine_q)
        if mine_q:
            best = max(a.score for a in mine_q)
    # hide correct answers from students in list view
    if student_id:
        questions = [{k: v for k, v in (qq.items() if isinstance(qq, dict) else {}) .items() if k != "answer"} for qq in questions]
    return QuizOut(
        id=q.id, classroom_id=q.classroom_id, title=q.title, topic=q.topic,
        duration_minutes=q.duration_minutes, available_from=q.available_from,
        available_until=q.available_until, questions=questions,
        source_workspace_item_id=q.source_workspace_item_id,
        attempt_count=attempts, my_best=best, my_attempts=mine, created_at=q.created_at,
    )


@router.get("/{classroom_id}/quizzes", response_model=list[QuizOut])
def list_quizzes(classroom_id: int, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    c = db.query(Classroom).filter(Classroom.id == classroom_id).first()
    if not c:
        raise HTTPException(status_code=404, detail="Classroom not found")
    if current_user.role == "teacher" and c.teacher_id != current_user.id:
        raise HTTPException(status_code=403, detail="Not your classroom")
    sid = current_user.id if current_user.role == "student" else None
    if sid:
        _member_classroom(db, classroom_id, sid)
    quizzes = db.query(Quiz).filter(Quiz.classroom_id == classroom_id).order_by(Quiz.created_at.desc()).all()
    return [_quiz_out(db, q, sid) for q in quizzes]


@router.get("/quizzes/{quiz_id}/attempts", response_model=list[AttemptOut])
def quiz_attempts(quiz_id: int, db: Session = Depends(get_db), current_user: User = Depends(require_role("teacher"))):
    q = db.query(Quiz).filter(Quiz.id == quiz_id).first()
    if not q:
        raise HTTPException(status_code=404, detail="Quiz not found")
    _own_classroom(db, q.classroom_id, current_user.id)
    atts = db.query(QuizAttempt).filter(QuizAttempt.quiz_id == quiz_id).all()
    out = []
    for a in atts:
        u = db.query(User).filter(User.id == a.student_id).first()
        out.append(AttemptOut(
            id=a.id, quiz_id=a.quiz_id, student_id=a.student_id,
            student_name=u.name if u else None,
            answers=json.loads(a.answers_json or "[]"),
            score=a.score, total=a.total,
            details=json.loads(a.details_json or "[]"),
            submitted_at=a.submitted_at,
        ))
    return out


@router.put("/quiz-attempts/{attempt_id}/grade", response_model=AttemptOut)
def grade_attempt(attempt_id: int, payload: GradeRequest, db: Session = Depends(get_db), current_user: User = Depends(require_role("teacher"))):
    a = db.query(QuizAttempt).filter(QuizAttempt.id == attempt_id).first()
    if not a:
        raise HTTPException(status_code=404, detail="Attempt not found")
    q = db.query(Quiz).filter(Quiz.id == a.quiz_id).first()
    _own_classroom(db, q.classroom_id, current_user.id)
    a.score = payload.score
    details = json.loads(a.details_json or "[]")
    details.append({"teacher_override": True, "score": payload.score, "feedback": payload.feedback})
    a.details_json = json.dumps(details)
    db.commit(); db.refresh(a)
    u = db.query(User).filter(User.id == a.student_id).first()
    return AttemptOut(
        id=a.id, quiz_id=a.quiz_id, student_id=a.student_id,
        student_name=u.name if u else None,
        answers=json.loads(a.answers_json or "[]"),
        score=a.score, total=a.total,
        details=json.loads(a.details_json or "[]"),
        submitted_at=a.submitted_at,
    )


# ---------- student: quiz attempt ----------

@router.post("/quizzes/{quiz_id}/attempt", response_model=AttemptOut)
def attempt_quiz(quiz_id: int, payload: AttemptCreate, db: Session = Depends(get_db), current_user: User = Depends(require_role("student"))):
    q = db.query(Quiz).filter(Quiz.id == quiz_id).first()
    if not q:
        raise HTTPException(status_code=404, detail="Quiz not found")
    _member_classroom(db, q.classroom_id, current_user.id)
    now = datetime.utcnow()
    if q.available_from and now < q.available_from:
        raise HTTPException(status_code=400, detail="Quiz is not open yet")
    if q.available_until and now > q.available_until:
        raise HTTPException(status_code=400, detail="Quiz is closed")
    questions = json.loads(q.questions_json or "[]")
    answers = payload.answers or []
    score, total, details = score_quiz(questions, answers)
    att = QuizAttempt(
        quiz_id=q.id, student_id=current_user.id,
        answers_json=json.dumps(answers), score=score, total=total,
        details_json=json.dumps(details),
    )
    db.add(att); db.commit(); db.refresh(att)
    return AttemptOut(
        id=att.id, quiz_id=att.quiz_id, student_id=att.student_id,
        student_name=current_user.name, answers=answers,
        score=score, total=total, details=details, submitted_at=att.submitted_at,
    )


@router.get("/quizzes/{quiz_id}/my", response_model=list[AttemptOut])
def my_attempts(quiz_id: int, db: Session = Depends(get_db), current_user: User = Depends(require_role("student"))):
    q = db.query(Quiz).filter(Quiz.id == quiz_id).first()
    if not q:
        raise HTTPException(status_code=404, detail="Quiz not found")
    _member_classroom(db, q.classroom_id, current_user.id)
    atts = db.query(QuizAttempt).filter(
        QuizAttempt.quiz_id == quiz_id, QuizAttempt.student_id == current_user.id
    ).order_by(QuizAttempt.submitted_at.desc()).all()
    return [AttemptOut(
        id=a.id, quiz_id=a.quiz_id, student_id=a.student_id,
        student_name=current_user.name,
        answers=json.loads(a.answers_json or "[]"),
        score=a.score, total=a.total,
        details=json.loads(a.details_json or "[]"),
        submitted_at=a.submitted_at,
    ) for a in atts]
