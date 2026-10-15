"""Phase 4: adaptive + misconception-aware helpers (pure functions).

Concepts come from question metadata ("concept" field) when teachers provide
it, else fall back to the question text prefix. A flagged misconception is
always a *possible* misunderstanding, never a certain diagnosis.
"""
import re

MIN_ATTEMPTS_FOR_FLAG = 2
MISCONCEPTION_ACCURACY = 0.5


def concept_of(question: dict, index: int = 0) -> str:
    if isinstance(question, dict) and question.get("concept"):
        return str(question["concept"]).strip()[:80]
    text = ""
    if isinstance(question, dict):
        text = str(question.get("question", "") or "")
    text = re.sub(r"\s+", " ", text).strip()
    if len(text) > 80:
        text = text[:77] + "..."
    return text or f"Question {index + 1}"


def aggregate(records: list):
    """records: [{concept, correct: bool}]. Returns per-concept stats dict."""
    stats = {}
    for r in records:
        c = r.get("concept", "General") or "General"
        s = stats.setdefault(c, {"attempts": 0, "correct": 0})
        s["attempts"] += 1
        if r.get("correct"):
            s["correct"] += 1
    out = []
    for concept, s in stats.items():
        acc = round(s["correct"] / s["attempts"], 3) if s["attempts"] else 0.0
        out.append({
            "concept": concept,
            "attempts": s["attempts"],
            "correct": s["correct"],
            "accuracy": acc,
            "possible_misconception": (
                s["attempts"] >= MIN_ATTEMPTS_FOR_FLAG and acc < MISCONCEPTION_ACCURACY
            ),
        })
    out.sort(key=lambda x: (x["accuracy"], -x["attempts"]))
    return out


def overall_accuracy(stats: list) -> float:
    att = sum(s["attempts"] for s in stats)
    cor = sum(s["correct"] for s in stats)
    return round(cor / att, 3) if att else 0.0


def suggested_difficulty(stats: list) -> str:
    """Next difficulty from demonstrated performance (inside same curriculum)."""
    if not stats:
        return "medium"
    acc = overall_accuracy(stats)
    weak = [s for s in stats if s["possible_misconception"]]
    if weak:
        return "easy"
    if acc >= 0.8:
        return "hard"
    if acc >= 0.5:
        return "medium"
    return "easy"


def difficulty_for_concept(stats: list, concept: str, default: str = "medium") -> str:
    for s in stats:
        if s["concept"] == concept:
            if s["accuracy"] >= 0.8:
                return "hard"
            if s["accuracy"] >= 0.5:
                return "medium"
            return "easy"
    return default
