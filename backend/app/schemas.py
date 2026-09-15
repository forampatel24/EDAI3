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
