"""Phase 2: teacher workspace grounded generation.

Same evidence-gated RAG pipeline as /generate, but with per-template prompts
(structured lesson/quiz/paper/activity + free-form custom). No LLM call when
evidence is insufficient — caller abstains instead.
"""
import json
from ..config import settings

KINDS = ["lesson_plan", "quiz", "question_paper", "activity", "explanation", "custom"]

TEMPLATE_SPECS = {
    "lesson_plan": {
        "label": "Lesson Plan",
        "shape": (
            '{"objectives": ["..."], "introduction": "...", "concepts": ["..."], '
            '"explanation": "...", "examples": ["..."], "activities": ["..."], '
            '"assessment": ["..."], "homework": "...", "revision_notes": "...", '
            '"citations": [{"source": "filename", "page": 1, "text_snippet": "..."}]}'
        ),
    },
    "quiz": {
        "label": "Quiz",
        "shape": (
            '{"questions": [{"question": "...", "type": "MCQ|descriptive", '
            '"options": ["A) ...", "B) ...", "C) ...", "D) ..."], "answer": "...", '
            '"marks": 1, "difficulty": "easy|medium|hard", "explanation": "..."}], '
            '"answer_key": [{"question_no": 1, "answer": "..."}], '
            '"citations": [{"source": "filename", "page": 1, "text_snippet": "..."}]}'
        ),
    },
    "question_paper": {
        "label": "Question Paper",
        "shape": (
            '{"sections": [{"name": "Section A", "marks": 10, "questions": '
            '[{"question": "...", "marks": 2, "difficulty": "easy|medium|hard"}]}], '
            '"answer_key": [{"question": "...", "answer": "...", "marks": 2}], '
            '"citations": [{"source": "filename", "page": 1, "text_snippet": "..."}]}'
        ),
    },
    "activity": {
        "label": "Classroom Activity",
        "shape": (
            '{"goal": "...", "materials": ["..."], "steps": ["..."], '
            '"duration_minutes": 20, "assessment": "...", '
            '"citations": [{"source": "filename", "page": 1, "text_snippet": "..."}]}'
        ),
    },
    "explanation": {
        "label": "Explanation",
        "shape": (
            '{"explanation": "...", "key_concepts": ["..."], "examples": ["..."], '
            '"revision_notes": "...", '
            '"citations": [{"source": "filename", "page": 1, "text_snippet": "..."}]}'
        ),
    },
    "custom": {
        "label": "Custom",
        "shape": (
            '{"title": "...", "content": "...", '
            '"citations": [{"source": "filename", "page": 1, "text_snippet": "..."}]}'
        ),
    },
}


def build_workspace_prompt(kind: str, params: dict, chunks: list):
    spec = TEMPLATE_SPECS.get(kind, TEMPLATE_SPECS["custom"])
    context = ""
    for i, c in enumerate(chunks):
        meta = c.get("metadata", {}) or {}
        context += (
            f"\n[Chunk {i+1} | Source: {meta.get('source','textbook')}, "
            f"p.{meta.get('page','?')} | Score: {c.get('score',0):.2f}]\n{c['text']}\n"
        )
    detail_lines = [
        f"Topic: {params.get('topic','')}",
        f"Subject: {params.get('subject','')}",
        f"Class: {params.get('class_level','')}",
        f"Difficulty: {params.get('difficulty','medium')}",
    ]
    if params.get("duration_minutes"):
        detail_lines.append(f"Duration: {params['duration_minutes']} minutes")
    if params.get("num_questions"):
        detail_lines.append(f"Number of questions: {params['num_questions']}")
    if params.get("question_type"):
        detail_lines.append(f"Question type: {params['question_type']}")
    if params.get("objectives"):
        detail_lines.append(f"Objectives: {params['objectives']}")
    if params.get("custom_instructions"):
        detail_lines.append(f"Extra instructions: {params['custom_instructions']}")
    system = (
        "You are a Curriculum-Grounded Teaching Assistant. "
        "Use ONLY the retrieved curriculum chunks as source of truth. "
        "If the request is not covered, say so inside the JSON (do not hallucinate). "
        "Every factual claim must be citable as [Source: filename, p.X]. "
        f"Generate valid JSON ONLY matching exactly: {spec['shape']}"
    )
    user = (
        f"Material type: {spec['label']}\n" + "\n".join(detail_lines)
        + f"\n\nRetrieved Context:\n{context}\n\nGenerate the {spec['label']} JSON now."
    )
    return system, user


def _call_llm(system: str, user: str):
    provider = settings.LLM_PROVIDER.lower()
    if provider == "gemini" and settings.GEMINI_API_KEY:
        from .generation import call_gemini
        return call_gemini(system, user)
    if provider == "groq" and settings.GROQ_API_KEY:
        from .generation import call_groq
        return call_groq(system, user)
    if settings.OPENAI_API_KEY:
        from .generation import call_openai
        return call_openai(system, user)
    raise RuntimeError("no_api_key")


def mock_workspace_content(kind: str, params: dict, chunks: list, error=None):
    cites = [
        {"source": c["metadata"].get("source", "doc"),
         "page": c["metadata"].get("page", "?"),
         "text_snippet": c["text"][:100]}
        for c in chunks[:3]
    ]
    base = {
        "citations": cites,
        "warning": (f"Mock workspace content ({error})" if error
                    else "Mock workspace content — set an LLM API key for full generation."),
    }
    topic = params.get("topic", "topic")
    if kind == "lesson_plan":
        base.update({
            "objectives": [f"Understand {topic} (from uploaded material)"],
            "introduction": chunks[0]["text"][:400] if chunks else topic,
            "concepts": [c["text"][:120] for c in chunks[:3]],
            "explanation": chunks[0]["text"][:600] if chunks else topic,
            "examples": ["See retrieved chunk example"],
            "activities": ["Discuss the worked example in pairs"],
            "assessment": [f"Short quiz on {topic}"],
            "homework": f"Revise {topic} notes",
            "revision_notes": "; ".join(c["text"][:80] for c in chunks[:2]),
        })
    elif kind in ("quiz", "question_paper"):
        base.update({
            "questions" if kind == "quiz" else "sections": (
                [{"question": f"Explain {topic} with reference to the textbook.",
                  "options": ["A) ...", "B) ...", "C) ...", "D) ..."],
                  "answer": "A", "marks": 2, "difficulty": params.get("difficulty", "medium"),
                  "explanation": "From chunk 1"}]
                if kind == "quiz" else
                [{"name": "Section A", "marks": 10, "questions": [
                    {"question": f"Explain {topic}.", "marks": 5,
                     "difficulty": params.get("difficulty", "medium")}]}]
            ),
            "answer_key": [{"question_no": 1, "answer": "See textbook chunk"}]
            if kind == "quiz" else [{"question": f"Explain {topic}.", "answer": "See chunk", "marks": 5}],
        })
    elif kind == "activity":
        base.update({
            "goal": f"Explore {topic} through group work",
            "materials": ["Textbook chunk printouts"],
            "steps": ["Read chunk", "Discuss", "Present"],
            "duration_minutes": params.get("duration_minutes") or 20,
            "assessment": "Observe group explanations",
        })
    elif kind == "explanation":
        base.update({
            "explanation": chunks[0]["text"][:600] if chunks else topic,
            "key_concepts": [c["text"][:120] for c in chunks[:3]],
            "examples": ["See chunk example"],
            "revision_notes": "; ".join(c["text"][:80] for c in chunks[:2]),
        })
    else:
        base.update({"title": params.get("title") or topic, "content": chunks[0]["text"][:600] if chunks else topic})
    return base


def generate_workspace_content(kind: str, params: dict, chunks: list):
    """Returns dict (parsed JSON or grounded mock). Raises RuntimeError('no_api_key') if none."""
    if kind not in KINDS:
        raise ValueError(f"Unknown workspace kind '{kind}'. Choose from {KINDS}.")
    system, user = build_workspace_prompt(kind, params, chunks)
    try:
        raw = _call_llm(system, user)
    except RuntimeError:
        return mock_workspace_content(kind, params, chunks)
    except Exception as e:
        print("Workspace LLM error:", e)
        return mock_workspace_content(kind, params, chunks, error=str(e))
    try:
        if "```" in raw:
            raw = raw.split("```")[1]
            if raw.startswith("json"):
                raw = raw[4:]
        data = json.loads(raw)
        if not data.get("citations"):
            data["citations"] = [
                {"source": c["metadata"].get("source", "doc"),
                 "page": c["metadata"].get("page", "?"),
                 "text_snippet": c["text"][:100]} for c in chunks[:3]
            ]
        return data
    except Exception as e:
        print("Workspace JSON parse error", e, (raw or "")[:300])
        return mock_workspace_content(kind, params, chunks)
