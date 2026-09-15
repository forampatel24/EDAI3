@echo off
cd backend
echo Starting FastAPI on http://localhost:8000
echo Docs: http://localhost:8000/docs
python -m uvicorn main:app --reload --port 8000
