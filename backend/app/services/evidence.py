"""Phase 1: evidence sufficiency gate + query reformulation + repair loop.

Theory: retrieval returning chunks does not mean the chunks actually cover the
question. This module decides SUFFICIENT vs INSUFFICIENT before any LLM call,
reformulates the query when weak, re-searches the SAME approved collection,
merges evidence, and re-checks. Only sufficient evidence reaches generation.
"""
import re

# Tunable thresholds (cosine score = 1 - distance, MiniLM).
# Relevant hits usually score ~0.4-0.8, irrelevant ~ -0.2..0.2.
SUFFICIENT_SCORE = 0.30   # evidence_score >= this -> generate
MARGINAL_SCORE = 0.15     # >= this -> worth one repair attempt
MAX_REPAIR_ATTEMPTS = 1   # extra reformulated searches after the first

STOPWORDS = {
    "what", "when", "where", "which", "who", "whom", "whose", "why", "how",
    "is", "are", "was", "were", "be", "been", "being", "do", "does", "did",
    "the", "a", "an", "and", "or", "of", "in", "on", "for", "to", "with",
    "explain", "describe", "define", "tell", "give", "write", "create",
    "about", "please", "class", "students", "student", "lesson", "topic",
}


def key_terms(query: str):
    words = re.findall(r"[a-zA-Z0-9]+", query.lower())
    terms = [w for w in words if w not in STOPWORDS and len(w) > 2]
    # dedupe, keep order
    seen, out = set(), []
    for w in terms:
        if w not in seen:
            seen.add(w)
            out.append(w)
    return out


def reformulate_queries(query: str, max_variants: int = 3):
    """Heuristic reformulations (no LLM cost): keyword focus + statement form."""
    variants = []
    terms = key_terms(query)
    if terms:
        variants.append(" ".join(terms))
    # strip question framing into a statement
    statement = re.sub(
        r"^(please\s+)?(explain|describe|define|tell me about|give me|write about|create a lesson on)\s+",
        "", query.strip(), flags=re.IGNORECASE,
    ).strip(" ?.")
    if statement and statement.lower() != query.strip().lower():
        variants.append(statement)
    if terms:
        variants.append(" ".join(terms) + " definition explanation example")
    # dedupe vs original, keep order
    out = []
    for v in variants:
        v = v.strip()
        if v and v.lower() != query.strip().lower() and v.lower() not in out:
            out.append(v.lower())
    return out[:max_variants]


def evidence_score(chunks: list) -> float:
    """Composite: 0.7 * max score + 0.3 * mean of top-3. Empty -> 0.0."""
    if not chunks:
        return 0.0
    scores = sorted([c.get("score", 0) or 0 for c in chunks], reverse=True)
    top3 = scores[:3]
    mean_top3 = sum(top3) / len(top3)
    return round(0.7 * scores[0] + 0.3 * mean_top3, 4)


def check_sufficiency(chunks: list, query: str):
    """Return (sufficient: bool, score: float, reason: str)."""
    if not chunks:
        return False, 0.0, "No chunks retrieved from the selected collection."
    score = evidence_score(chunks)
    best = max(c.get("score", 0) or 0 for c in chunks)
    if score >= SUFFICIENT_SCORE:
        return True, score, (
            f"Sufficient evidence: best match {best:.2f}, "
            f"composite {score:.2f} across {len(chunks)} chunks."
        )
    if score >= MARGINAL_SCORE:
        return False, score, (
            f"Weak evidence: best match {best:.2f}, composite {score:.2f} "
            f"below sufficiency {SUFFICIENT_SCORE:.2f} — repair recommended."
        )
    return False, score, (
        f"Insufficient evidence: best match {best:.2f}, composite {score:.2f} "
        f"below sufficiency {SUFFICIENT_SCORE:.2f}."
    )


def merge_chunks(base: list, extra: list):
    seen = {c["text"][:100] for c in base}
    merged = list(base)
    for c in extra:
        if c["text"][:100] not in seen:
            seen.add(c["text"][:100])
            merged.append(c)
    # keep best-scoring first
    merged.sort(key=lambda c: c.get("score", 0) or 0, reverse=True)
    return merged


def get_collection_sources(collection_name: str):
    """Distinct source filenames indexed in a Chroma collection (for abstain guidance)."""
    try:
        from .embeddings import get_chroma_client
        coll = get_chroma_client().get_collection(collection_name)
        data = coll.get(include=["metadatas"])
        sources = set()
        for m in (data.get("metadatas") or []):
            if m and m.get("source"):
                sources.add(m["source"])
        return sorted(sources)
    except Exception:
        return []


def retrieve_with_repair(collection_name: str, query: str, top_k: int = 5, max_repair: int = MAX_REPAIR_ATTEMPTS):
    """First retrieval -> gate -> reformulated re-retrieval(s) -> re-gate.

    Returns (chunks, info dict). Never calls the LLM. Same-collection only.
    """
    from .retrieval import retrieve

    attempts = [query]
    chunks = retrieve(collection_name, query, top_k=top_k)
    sufficient, score, reason = check_sufficiency(chunks, query)
    repaired = False

    if not sufficient and score >= MARGINAL_SCORE and max_repair > 0:
        # one repair round: try reformulations, merge best
        for variant in reformulate_queries(query):
            if len(attempts) - 1 >= max_repair + 1:
                break
            attempts.append(variant)
            extra = retrieve(collection_name, variant, top_k=top_k)
            if extra:
                repaired = True
                chunks = merge_chunks(chunks, extra)
        sufficient, score, reason = check_sufficiency(chunks, query)
        if repaired:
            reason = f"After evidence repair ({len(attempts)-1} extra searches): " + reason

    if not sufficient and not repaired and score >= MARGINAL_SCORE:
        # marginal but repair disabled/empty — still report clearly
        pass

    info = {
        "sufficient": sufficient,
        "evidence_score": score,
        "reason": reason,
        "repaired": repaired,
        "attempts": attempts,
        "sources": get_collection_sources(collection_name),
    }
    return chunks, info


def abstain_response(query: str, info: dict, class_level: str = "Class 11"):
    """Safe-abstention payload: no hallucinated content, guidance to available topics."""
    sources = info.get("sources", [])
    if sources:
        available = ", ".join(sources[:8])
        guidance = (
            f"Available sources in this collection: {available}. "
            f"Please ask a question from these materials."
        )
    else:
        guidance = "The teacher has not uploaded readable material to this collection yet."
    return {
        "explanation": (
            f"This topic '{query}' is not sufficiently supported by the approved "
            f"curriculum sources in the selected collection ({class_level}). {guidance}"
        ),
        "key_concepts": [],
        "worked_examples": [],
        "mcqs": [],
        "descriptive_questions": [],
        "quiz": [],
        "revision_notes": "No revision notes — topic not in the selected syllabus material.",
        "citations": [],
        "warning": f"Abstained: {info.get('reason', 'insufficient evidence.')}",
    }
