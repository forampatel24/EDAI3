"""Phase 3 helpers: join codes + quiz auto-scoring.

MCQ/mixed questions with options are auto-scored (letter or full-text match).
Descriptive questions score 0 automatically and are flagged needs_review=True
so the teacher grades them manually. Never invent marks.
"""
import secrets
import string
import re

CODE_ALPHABET = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789"  # no ambiguous chars


def generate_code(length: int = 6) -> str:
    return "".join(secrets.choice(CODE_ALPHABET) for _ in range(length))


def _norm(s) -> str:
    s = str(s or "").strip().lower()
    s = re.sub(r"\s+", " ", s)
    return s


def _letter(s: str) -> str:
    """Leading option letter, e.g. 'B) ...' -> 'b', 'b' -> 'b', else ''."""
    s = _norm(s)
    m = re.match(r"^([a-d])\)", s)
    if m:
        return m.group(1)
    if len(s) == 1 and s in "abcd":
        return s
    return ""


def score_quiz(questions: list, answers: list):
    """Score answers against questions.

    answers: list aligned by index (extra ignored, missing = blank).
    Returns (score, total, details).
    """
    score, total, details = 0.0, 0.0, []
    for i, q in enumerate(questions or []):
        marks = float(q.get("marks", 1) or 1)
        total += marks
        correct = q.get("answer", "")
        qtype = str(q.get("type", "") or ("MCQ" if q.get("options") else "descriptive")).lower()
        student = answers[i] if i < len(answers or []) else ""
        if qtype in ("mcq", "mixed") and q.get("options"):
            cs, ss = _norm(correct), _norm(student)
            cl, sl = _letter(cs), _letter(ss)
            hit = (cl and cl == sl) or (ss and ss == cs)
            awarded = marks if hit else 0.0
            details.append({
                "question_no": i + 1, "student_answer": student,
                "correct_answer": correct, "marks_awarded": awarded,
                "marks": marks, "auto": True, "needs_review": False,
            })
            score += awarded
        else:
            # descriptive: teacher grades later
            details.append({
                "question_no": i + 1, "student_answer": student,
                "correct_answer": correct, "marks_awarded": 0.0,
                "marks": marks, "auto": False, "needs_review": True,
            })
    return round(score, 2), round(total, 2), details


def workspace_to_quiz_questions(content: dict):
    """Extract a question list from workspace quiz/paper content for publishing."""
    if not isinstance(content, dict):
        return []
    if isinstance(content.get("questions"), list) and content["questions"]:
        out = []
        for q in content["questions"]:
            if not isinstance(q, dict):
                continue
            out.append({
                "question": q.get("question", ""),
                "type": q.get("type", "MCQ" if q.get("options") else "descriptive"),
                "options": q.get("options", []),
                "answer": q.get("answer", ""),
                "marks": q.get("marks", 1),
                "difficulty": q.get("difficulty", "medium"),
                "explanation": q.get("explanation", ""),
            })
        return out
    if isinstance(content.get("sections"), list):
        out = []
        for sec in content["sections"]:
            for q in (sec.get("questions") or []):
                if not isinstance(q, dict):
                    continue
                out.append({
                    "question": q.get("question", ""),
                    "type": "descriptive",
                    "options": [],
                    "answer": "",
                    "marks": q.get("marks", 2),
                    "difficulty": q.get("difficulty", "medium"),
                    "explanation": "",
                })
        return out
    return []
