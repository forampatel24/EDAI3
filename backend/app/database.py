from sqlalchemy import create_engine, inspect, text
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.orm import sessionmaker
from .config import settings

engine = create_engine(
    settings.DATABASE_URL, connect_args={"check_same_thread": False}
)
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
Base = declarative_base()


def run_light_migrations():
    """Tiny SQLite migrations for columns added after the first schema version.

    create_all() only creates missing tables, not missing columns, so existing
    databases need the new columns added here. Safe to run on every startup.
    """
    insp = inspect(engine)
    with engine.begin() as conn:
        if "quizzes" in insp.get_table_names():
            cols = {c["name"] for c in insp.get_columns("quizzes")}
            if "max_attempts" not in cols:
                conn.execute(text("ALTER TABLE quizzes ADD COLUMN max_attempts INTEGER NOT NULL DEFAULT 0"))
        if "quiz_attempts" in insp.get_table_names():
            cols = {c["name"] for c in insp.get_columns("quiz_attempts")}
            if "started_at" not in cols:
                conn.execute(text("ALTER TABLE quiz_attempts ADD COLUMN started_at DATETIME"))
            if "completed" not in cols:
                conn.execute(text("ALTER TABLE quiz_attempts ADD COLUMN completed BOOLEAN NOT NULL DEFAULT 1"))


def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()
