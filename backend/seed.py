"""Seed dummy users for demo"""
from app.database import SessionLocal, Base, engine
from app.models import User
from app.auth import hash_password

Base.metadata.create_all(bind=engine)
db = SessionLocal()

def get_or_create(email, password, role, name):
    u = db.query(User).filter(User.email==email).first()
    if u:
        print(f"Exists: {email} ({role})")
        return u
    u = User(email=email, password_hash=hash_password(password), role=role, name=name)
    db.add(u); db.commit(); db.refresh(u)
    print(f"Created: {email} / {password} ({role})")
    return u

get_or_create("teacher@demo.com", "teacher123", "teacher", "Demo Teacher")
get_or_create("student@demo.com", "student123", "student", "Demo Student")
db.close()
print("Seeding done. Login with above credentials.")
