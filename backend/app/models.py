from sqlalchemy import Column, Integer, String, DateTime, ForeignKey, Text
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
