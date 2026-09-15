import json
import os
from ..config import settings

SYSTEM_PROMPT = """You are a Curriculum-Grounded Educational Content Generator.
You MUST ONLY use the provided retrieved textbook chunks as source of truth.
Rules:
- If the query is not covered in the retrieved context, say "This topic is not found in the uploaded syllabus/textbooks. Available topics: [briefly list available source filenames]." and do not hallucinate.
- Every factual statement must be citable. Add citations like [Source: filename, p.X] where X is page number from metadata.
- Generate valid JSON ONLY, no markdown, no explanation outside JSON.
- Structure must match exactly:
{
  "explanation": "detailed topic explanation for class level",
  "key_concepts": ["concept1: definition", "concept2: definition"],
  "worked_examples": ["Example 1: problem + step-by-step solution", "Example 2: ..."],
  "mcqs": [{"question": "...", "options": ["A) ...", "B) ...", "C) ...", "D) ..."], "answer": "A", "explanation": "why A"}],
  "descriptive_questions": [{"question": "...", "answer": "detailed answer with citations"}],
  "quiz": [{"question": "...", "difficulty": "easy|medium|hard", "answer": "..."}],
  "revision_notes": "bullet revision notes",
  "citations": [{"source": "filename", "page": 1, "text_snippet": "first 100 chars of chunk"}]
}
- Difficulty: easy=class level -2, medium=class level, hard=competitive exam level.
"""

def build_prompt(query: str, chunks: list, difficulty: str, class_level: str = "Class 11"):
    context = ""
    for i, c in enumerate(chunks):
        meta = c.get("metadata", {})
        src = meta.get("source", "textbook")
        page = meta.get("page", "?")
        context += f"\n[Chunk {i+1} | Source: {src}, p.{page} | Score: {c.get('score',0):.2f}]\n{c['text']}\n"
    user_prompt = f"""
Class Level: {class_level}
Difficulty: {difficulty}
Student Query: {query}

Retrieved Context:
{context}

Generate the 7-section JSON now. Ground every section in context. If context insufficient, set warning in explanation but still return JSON.
"""
    return SYSTEM_PROMPT, user_prompt

def call_openai(system_prompt: str, user_prompt: str):
    from openai import OpenAI
    client = OpenAI(api_key=settings.OPENAI_API_KEY)
    resp = client.chat.completions.create(
        model=settings.OPENAI_MODEL,
        messages=[
            {"role": "system", "content": system_prompt},
            {"role": "user", "content": user_prompt}
        ],
        temperature=0.2,
        response_format={"type": "json_object"}
    )
    return resp.choices[0].message.content

def call_gemini(system_prompt: str, user_prompt: str):
    import google.generativeai as genai
    genai.configure(api_key=settings.GEMINI_API_KEY)
    model = genai.GenerativeModel(settings.GEMINI_MODEL, generation_config={"response_mime_type": "application/json", "temperature": 0.2})
    resp = model.generate_content(f"{system_prompt}\n\n{user_prompt}")
    return resp.text

def call_groq(system_prompt: str, user_prompt: str):
    from openai import OpenAI
    client = OpenAI(api_key=settings.GROQ_API_KEY, base_url="https://api.groq.com/openai/v1")
    resp = client.chat.completions.create(
        model=settings.GROQ_MODEL,
        messages=[
            {"role": "system", "content": system_prompt},
            {"role": "user", "content": user_prompt}
        ],
        temperature=0.2,
        response_format={"type": "json_object"}
    )
    return resp.choices[0].message.content

def generate_content(query: str, chunks: list, difficulty: str = "medium", class_level: str = "Class 11"):
    if not chunks:
        # No context fallback
        return {
            "explanation": f"This topic '{query}' is not found in the uploaded syllabus/textbooks. Please ensure the teacher has uploaded the relevant textbook/notes or try a query from available PDFs.",
            "key_concepts": [],
            "worked_examples": [],
            "mcqs": [],
            "descriptive_questions": [],
            "quiz": [],
            "revision_notes": "No revision notes - topic not in syllabus.",
            "citations": [],
            "warning": "No retrieved context. Grounded generation blocked to prevent hallucination."
        }
    system_prompt, user_prompt = build_prompt(query, chunks, difficulty, class_level)
    provider = settings.LLM_PROVIDER.lower()
    raw = None
    try:
        if provider == "gemini" and settings.GEMINI_API_KEY:
            raw = call_gemini(system_prompt, user_prompt)
        elif provider == "groq" and settings.GROQ_API_KEY:
            raw = call_groq(system_prompt, user_prompt)
        elif settings.OPENAI_API_KEY:
            raw = call_openai(system_prompt, user_prompt)
        else:
            # mock grounded response if no key
            return mock_response(query, chunks, difficulty)
    except Exception as e:
        print("LLM error:", e)
        return mock_response(query, chunks, difficulty, error=str(e))

    # parse JSON
    try:
        # clean markdown fences if any
        if "```" in raw:
            raw = raw.split("```")[1]
            if raw.startswith("json"):
                raw = raw[4:]
        data = json.loads(raw)
        # ensure citations from chunks if missing
        if not data.get("citations"):
            data["citations"] = [{"source": c["metadata"].get("source","doc"), "page": c["metadata"].get("page","?"), "text_snippet": c["text"][:100]} for c in chunks[:3]]
        return data
    except Exception as e:
        print("JSON parse error", e, raw[:500])
        return mock_response(query, chunks, difficulty)

def mock_response(query: str, chunks: list, difficulty: str, error=None):
    # Grounded mock using actual chunks
    expl = f"**{query}** (Mock grounded generation - set API key for full LLM). Based on uploaded material:\n\n" + "\n\n".join([c['text'][:400] + f" [Source: {c['metadata'].get('source','doc')}, p.{c['metadata'].get('page','?')}]" for c in chunks[:2]])
    return {
        "explanation": expl,
        "key_concepts": [f"Concept from {c['metadata'].get('source','doc')} p.{c['metadata'].get('page','?')}: {c['text'][:120]}" for c in chunks[:3]],
        "worked_examples": [f"Example based on chunk p.{chunks[0]['metadata'].get('page','?')}: Apply concept to solve numerical related to '{query}'"],
        "mcqs": [
            {"question": f"What is the core principle of {query} as per uploaded textbook?", "options": ["A) Option A", "B) Option B", "C) Option C", "D) Option D"], "answer": "A", "explanation": "Grounded in chunk 1"},
            {"question": f"Which example illustrates {query}?", "options": ["A) Ex A", "B) Ex B", "C) Ex C", "D) Ex D"], "answer": "B", "explanation": "From chunk 2"}
        ],
        "descriptive_questions": [{"question": f"Explain {query} in detail with reference to textbook.", "answer": chunks[0]['text'][:500]}],
        "quiz": [
            {"question": f"Easy: Define {query}", "difficulty": "easy", "answer": "Definition from textbook"},
            {"question": f"Medium: Explain {query} with example", "difficulty": "medium", "answer": "Detailed explanation"},
            {"question": f"Hard: Solve advanced problem on {query}", "difficulty": "hard", "answer": "Hard solution"}
        ],
        "revision_notes": f"Revision: {query} - Key points from uploaded PDFs: " + "; ".join([c['text'][:80] for c in chunks[:2]]),
        "citations": [{"source": c["metadata"].get("source","doc"), "page": c["metadata"].get("page","?"), "text_snippet": c["text"][:100]} for c in chunks[:3]],
        "warning": f"Mock response (no API key). Error: {error}" if error else "Mock response - configure OPENAI_API_KEY for real LLM"
    }
