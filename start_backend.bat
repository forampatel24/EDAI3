@echo off
setlocal
REM Resolve repo root as directory of this script
cd /d "%~dp0backend"
echo Starting FastAPI on http://localhost:8000
echo Docs: http://localhost:8000/docs
if exist ".venv\Scripts\python.exe" (
    echo Using venv: backend\.venv\Scripts\python.exe
    ".venv\Scripts\python.exe" -m uvicorn main:app --reload --port 8000
) else (
    echo WARNING: venv not found at backend\.venv - falling back to system python
    python -m uvicorn main:app --reload --port 8000
)
