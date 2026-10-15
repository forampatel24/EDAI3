from sqlalchemy import Column, Integer, String, DateTime, ForeignKey, Text, Float, Boolean, UniqueConstraint
from sqlalchemy.orm import relationship
from datetime import datetime
from .database import Base

class User(Base):
    __tablename__ = "users"
    id = Column(Integer, primary_key=True, index=True)
    email = Column(String, unique=True, index=True, nullable=False)
    password_hash = Column(String, nullable=False)
    role = Column(String, nullable=False)  # teacher | student
    name = Column(String, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)

    collections = relationship("Collection", back_populates="teacher", cascade="all, delete-orphan")

class Collection(Base):
    __tablename__ = "collections"
    id = Column(Integer, primary_key=True, index=True)
    name = Column(String, nullable=False)  # e.g., Physics - Class 11
    subject = Column(String, nullable=False)
    class_level = Column(String, nullable=True)  # e.g., Class 11
    description = Column(Text, nullable=True)
    teacher_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    chroma_collection_name = Column(String, unique=True, nullable=False)
    created_at = Column(DateTime, default=datetime.utcnow)

    teacher = relationship("User", back_populates="collections")
    documents = relationship("Document", back_populates="collection", cascade="all, delete-orphan")

class Document(Base):
    __tablename__ = "documents"
    id = Column(Integer, primary_key=True, index=True)
    collection_id = Column(Integer, ForeignKey("collections.id"), nullable=False)
    filename = Column(String, nullable=False)
    original_filename = Column(String, nullable=False)
    file_path = Column(String, nullable=False)
    pages = Column(Integer, default=0)
    chunks = Column(Integer, default=0)
    created_at = Column(DateTime, default=datetime.utcnow)

    collection = relationship("Collection", back_populates="documents")


class WorkspaceItem(Base):
    """Phase 2: teacher-saved lesson/assessment material (editable, publishable in Phase 3)."""
    __tablename__ = "workspace_items"
    id = Column(Integer, primary_key=True, index=True)
    teacher_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    collection_id = Column(Integer, ForeignKey("collections.id"), nullable=False)
    kind = Column(String, nullable=False)  # lesson_plan | quiz | question_paper | activity | explanation | custom
    title = Column(String, nullable=False)
    params_json = Column(Text, nullable=False, default="{}")
    content_json = Column(Text, nullable=False, default="{}")
    status = Column(String, nullable=False, default="draft")  # draft | ready | published (Phase 3)
    abstained = Column(Boolean, nullable=False, default=False)
    evidence_score = Column(Float, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)


class Classroom(Base):
    """Phase 3: teacher-owned class; students join via code."""
    __tablename__ = "classrooms"
    id = Column(Integer, primary_key=True, index=True)
    teacher_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    name = Column(String, nullable=False)  # e.g. Class 11 Physics - Div A
    subject = Column(String, nullable=False)
    class_level = Column(String, nullable=True)
    division = Column(String, nullable=True)
    code = Column(String, unique=True, index=True, nullable=False)  # join code
    description = Column(Text, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)


class ClassroomMember(Base):
    __tablename__ = "classroom_members"
    id = Column(Integer, primary_key=True, index=True)
    classroom_id = Column(Integer, ForeignKey("classrooms.id"), nullable=False)
    student_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    joined_at = Column(DateTime, default=datetime.utcnow)
    __table_args__ = (UniqueConstraint("classroom_id", "student_id", name="uq_class_student"),)


class Assignment(Base):
    __tablename__ = "assignments"
    id = Column(Integer, primary_key=True, index=True)
    classroom_id = Column(Integer, ForeignKey("classrooms.id"), nullable=False)
    teacher_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    title = Column(String, nullable=False)
    description = Column(Text, nullable=True)
    instructions = Column(Text, nullable=True)
    deadline = Column(DateTime, nullable=True)
    attachment_filename = Column(String, nullable=True)
    attachment_path = Column(String, nullable=True)
    source_workspace_item_id = Column(Integer, ForeignKey("workspace_items.id"), nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)


class AssignmentSubmission(Base):
    __tablename__ = "assignment_submissions"
    id = Column(Integer, primary_key=True, index=True)
    assignment_id = Column(Integer, ForeignKey("assignments.id"), nullable=False)
    student_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    text = Column(Text, nullable=True)
    file_filename = Column(String, nullable=True)
    file_path = Column(String, nullable=True)
    submitted_at = Column(DateTime, default=datetime.utcnow)
    score = Column(Float, nullable=True)
    feedback = Column(Text, nullable=True)


class Quiz(Base):
    __tablename__ = "quizzes"
    id = Column(Integer, primary_key=True, index=True)
    classroom_id = Column(Integer, ForeignKey("classrooms.id"), nullable=False)
    teacher_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    title = Column(String, nullable=False)
    topic = Column(String, nullable=True)
    duration_minutes = Column(Integer, nullable=True)
    available_from = Column(DateTime, nullable=True)
    available_until = Column(DateTime, nullable=True)
    questions_json = Column(Text, nullable=False, default="[]")
    source_workspace_item_id = Column(Integer, ForeignKey("workspace_items.id"), nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)


class QuizAttempt(Base):
    __tablename__ = "quiz_attempts"
    id = Column(Integer, primary_key=True, index=True)
    quiz_id = Column(Integer, ForeignKey("quizzes.id"), nullable=False)
    student_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    answers_json = Column(Text, nullable=False, default="[]")
    score = Column(Float, nullable=False, default=0)
    total = Column(Float, nullable=False, default=0)
    details_json = Column(Text, nullable=False, default="[]")
    submitted_at = Column(DateTime, default=datetime.utcnow)


class NoteFolder(Base):
    """Phase 4: user-owned collections for organizing saved notes."""
    __tablename__ = "note_folders"
    id = Column(Integer, primary_key=True, index=True)
    owner_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    name = Column(String, nullable=False)
    created_at = Column(DateTime, default=datetime.utcnow)


class Note(Base):
    """Phase 4: saved AI-generated content with source traceability."""
    __tablename__ = "notes"
    id = Column(Integer, primary_key=True, index=True)
    owner_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    folder_id = Column(Integer, ForeignKey("note_folders.id"), nullable=True)
    title = Column(String, nullable=False)
    collection_id = Column(Integer, ForeignKey("collections.id"), nullable=True)
    source_type = Column(String, nullable=False, default="generate")  # generate | workspace | quiz | manual
    source_ref_id = Column(Integer, nullable=True)
    content_json = Column(Text, nullable=False, default="{}")
    meta_json = Column(Text, nullable=False, default="{}")
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
