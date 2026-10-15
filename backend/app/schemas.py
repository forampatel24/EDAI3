from pydantic import BaseModel, EmailStr
from typing import Optional, List
from datetime import datetime

# Auth
class UserSignup(BaseModel):
    email: EmailStr
    password: str
    role: str  # teacher | student
    name: Optional[str] = None

class UserLogin(BaseModel):
    email: EmailStr
    password: str

class UserOut(BaseModel):
    id: int
    email: str
    role: str
    name: Optional[str]
    class Config:
        from_attributes = True

class Token(BaseModel):
    access_token: str
    token_type: str = "bearer"
    user: UserOut

# Collections
class CollectionCreate(BaseModel):
    name: str
    subject: str
    class_level: Optional[str] = None
    description: Optional[str] = None

class CollectionOut(BaseModel):
    id: int
    name: str
    subject: str
    class_level: Optional[str]
    description: Optional[str]
    teacher_id: int
    teacher_email: Optional[str] = None
    teacher_name: Optional[str] = None
    chroma_collection_name: str
    document_count: int = 0
    created_at: datetime
    class Config:
        from_attributes = True

class DocumentOut(BaseModel):
    id: int
    collection_id: int
    filename: str
    original_filename: str
    pages: int
    chunks: int
    created_at: datetime
    class Config:
        from_attributes = True

class DocumentNameOnly(BaseModel):
    id: int
    original_filename: str
    pages: int
    chunks: int
    class Config:
        from_attributes = True

# Workspace (Phase 2)
WORKSPACE_KINDS = ["lesson_plan", "quiz", "question_paper", "activity", "explanation", "custom"]

class WorkspaceGenerateRequest(BaseModel):
    collection_id: int
    kind: str  # lesson_plan | quiz | question_paper | activity | explanation | custom
    topic: str
    title: Optional[str] = None
    subject: Optional[str] = None
    class_level: Optional[str] = None
    duration_minutes: Optional[int] = None
    difficulty: Optional[str] = "medium"
    num_questions: Optional[int] = 10
    question_type: Optional[str] = "MCQ"  # MCQ | descriptive | mixed
    objectives: Optional[str] = None
    custom_instructions: Optional[str] = None

class WorkspaceItemOut(BaseModel):
    id: int
    kind: str
    title: str
    collection_id: int
    collection_name: Optional[str] = None
    status: str
    abstained: bool = False
    evidence_score: Optional[float] = None
    evidence_status: Optional[str] = None
    repair_used: Optional[bool] = False
    params: dict = {}
    content: dict = {}
    warning: Optional[str] = None
    created_at: datetime
    updated_at: datetime
    class Config:
        from_attributes = True

class WorkspaceUpdateRequest(BaseModel):
    title: Optional[str] = None
    content: Optional[dict] = None
    status: Optional[str] = None  # draft | ready

# Generation
class GenerateRequest(BaseModel):
    collection_id: int
    prompt: str
    difficulty: Optional[str] = "medium"  # easy | medium | hard

class GenerateResponse(BaseModel):
    explanation: str
    key_concepts: List[str]
    worked_examples: List[str]
    mcqs: List[dict]
    descriptive_questions: List[dict]
    quiz: List[dict]
    revision_notes: str
    citations: List[dict]
    retrieved_chunks: List[dict]
    grounded: bool
    warning: Optional[str] = None
    # Phase 1: evidence-gated generation fields
    abstained: bool = False
    evidence_score: Optional[float] = None
    evidence_status: Optional[str] = None  # sufficient | insufficient
    repair_used: bool = False
    citation_issues: Optional[List[str]] = None
    alignment_warning: Optional[str] = None

# Classroom (Phase 3)
class ClassroomCreate(BaseModel):
    name: str
    subject: str
    class_level: Optional[str] = None
    division: Optional[str] = None
    description: Optional[str] = None

class ClassroomOut(BaseModel):
    id: int
    name: str
    subject: str
    class_level: Optional[str] = None
    division: Optional[str] = None
    code: str
    description: Optional[str] = None
    teacher_name: Optional[str] = None
    member_count: int = 0
    assignment_count: int = 0
    quiz_count: int = 0
    created_at: datetime
    class Config:
        from_attributes = True

class ClassroomJoinRequest(BaseModel):
    code: str

class MemberOut(BaseModel):
    student_id: int
    name: Optional[str] = None
    email: Optional[str] = None
    joined_at: datetime

class AssignmentCreate(BaseModel):
    title: str
    description: Optional[str] = None
    instructions: Optional[str] = None
    deadline: Optional[datetime] = None
    source_workspace_item_id: Optional[int] = None

class AssignmentOut(BaseModel):
    id: int
    classroom_id: int
    title: str
    description: Optional[str] = None
    instructions: Optional[str] = None
    deadline: Optional[datetime] = None
    attachment_filename: Optional[str] = None
    attachment_file: Optional[str] = None  # stored name under uploads/assignments/
    source_workspace_item_id: Optional[int] = None
    submission_count: int = 0
    my_submitted: bool = False
    my_score: Optional[float] = None
    created_at: datetime
    class Config:
        from_attributes = True

class SubmissionOut(BaseModel):
    id: int
    assignment_id: int
    student_id: int
    student_name: Optional[str] = None
    student_email: Optional[str] = None
    text: Optional[str] = None
    file_filename: Optional[str] = None
    file_stored: Optional[str] = None  # stored name under uploads/submissions/
    submitted_at: datetime
    score: Optional[float] = None
    feedback: Optional[str] = None
    class Config:
        from_attributes = True

class GradeRequest(BaseModel):
    score: float
    feedback: Optional[str] = None

class QuizCreate(BaseModel):
    title: str
    topic: Optional[str] = None
    duration_minutes: Optional[int] = None
    available_from: Optional[datetime] = None
    available_until: Optional[datetime] = None
    questions: List[dict] = []
    source_workspace_item_id: Optional[int] = None

class QuizOut(BaseModel):
    id: int
    classroom_id: int
    title: str
    topic: Optional[str] = None
    duration_minutes: Optional[int] = None
    available_from: Optional[datetime] = None
    available_until: Optional[datetime] = None
    questions: List[dict] = []
    source_workspace_item_id: Optional[int] = None
    attempt_count: int = 0
    my_best: Optional[float] = None
    my_attempts: int = 0
    created_at: datetime
    class Config:
        from_attributes = True

class AttemptCreate(BaseModel):
    answers: List = []

class AttemptOut(BaseModel):
    id: int
    quiz_id: int
    student_id: int
    student_name: Optional[str] = None
    answers: List = []
    score: float
    total: float
    details: List[dict] = []
    submitted_at: datetime
    class Config:
        from_attributes = True

class WorkspacePublishRequest(BaseModel):
    classroom_id: Optional[int] = None
    target: Optional[str] = None  # assignment | quiz | none

# Notes (Phase 4)
class NoteFolderCreate(BaseModel):
    name: str

class NoteFolderOut(BaseModel):
    id: int
    name: str
    note_count: int = 0
    created_at: datetime
    class Config:
        from_attributes = True

class NoteCreate(BaseModel):
    title: str
    folder_id: Optional[int] = None
    collection_id: Optional[int] = None
    source_type: Optional[str] = "generate"  # generate | workspace | quiz | manual
    source_ref_id: Optional[int] = None
    content: dict = {}
    meta: dict = {}

class NoteOut(BaseModel):
    id: int
    title: str
    folder_id: Optional[int] = None
    folder_name: Optional[str] = None
    collection_id: Optional[int] = None
    collection_name: Optional[str] = None
    source_type: str
    source_ref_id: Optional[int] = None
    content: dict = {}
    meta: dict = {}
    created_at: datetime
    updated_at: datetime
    class Config:
        from_attributes = True

class NoteUpdateRequest(BaseModel):
    title: Optional[str] = None
    folder_id: Optional[int] = None
    content: Optional[dict] = None
    meta: Optional[dict] = None

# Adaptive (Phase 4)
class ConceptStatOut(BaseModel):
    concept: str
    attempts: int
    correct: int
    accuracy: float
    possible_misconception: bool = False

class AdaptiveOverviewOut(BaseModel):
    concepts: List[ConceptStatOut] = []
    total_attempts: int = 0
    overall_accuracy: float = 0.0
    suggested_difficulty: str = "medium"
    weak_concepts: List[str] = []

class PracticeRequest(BaseModel):
    collection_id: int
    concept: str
    difficulty: Optional[str] = None  # auto | easy | medium | hard
    num_questions: Optional[int] = 5

class FeedbackItemOut(BaseModel):
    question_no: int
    question: str
    concept: str
    student_answer: str = ""
    correct_answer: str = ""
    was_correct: bool = False
    study_pointer: Optional[str] = None

class AttemptFeedbackOut(BaseModel):
    attempt_id: int
    quiz_title: Optional[str] = None
    score: float
    total: float
    items: List[FeedbackItemOut] = []

class PracticeOut(BaseModel):
    concept: str
    difficulty: str
    abstained: bool = False
    evidence_score: Optional[float] = None
    questions: List[dict] = []
    citations: List[dict] = []
    warning: Optional[str] = None

class ClassroomInsightsOut(BaseModel):
    classroom_id: int
    concepts: List[ConceptStatOut] = []
    total_attempts: int = 0
    overall_accuracy: float = 0.0
    weak_concepts: List[str] = []
    per_student: List[dict] = []
