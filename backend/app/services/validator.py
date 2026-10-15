def validate_grounding(generated: dict, chunks: list, threshold: float = 0.7):
    """
    Base validator: checks if generated content cites sources and if chunks exist.
    Returns grounded bool + warnings. Kept for backward compatibility.
    """
    if not chunks:
        return False, "No source chunks - ungrounded"
    citations = generated.get("citations", [])
    if not citations:
        return False, "No citations - possible hallucination"
    # check citation count vs chunks
    grounded = len(citations) > 0 and len(chunks) > 0
    warning = None
    if generated.get("warning"):
        warning = generated["warning"]
        grounded = False
    # Additional: check if explanation contains [Source:
    expl = generated.get("explanation", "")
    if "[Source" not in expl and grounded:
        warning = (warning or "") + " | Missing inline citations"
    return grounded, warning


def validate_citations(generated: dict, chunks: list):
    """Phase 1: every citation must trace to retrieved evidence.

    Checks each citation's source filename and page against the retrieved
    chunk metadata. Returns a list of human-readable issues (empty = clean).
    A citation is NOT trusted just because the LLM produced it.
    """
    issues = []
    citations = generated.get("citations", []) or []
    if not citations:
        return issues
    retrieved = set()
    for c in chunks:
        meta = c.get("metadata", {}) or {}
        retrieved.add((str(meta.get("source", "")).lower(), str(meta.get("page", "?"))))
    retrieved_sources = {s for s, _ in retrieved}
    for i, cit in enumerate(citations):
        src = str(cit.get("source", "") or "")
        page = str(cit.get("page", "") or "?")
        if not src:
            issues.append(f"Citation {i+1} has no source filename.")
            continue
        if src.lower() not in retrieved_sources:
            issues.append(
                f"Citation {i+1} cites '{src}' which was not in the retrieved evidence."
            )
        elif (src.lower(), page) not in retrieved:
            issues.append(
                f"Citation {i+1} cites '{src}' p.{page} which was not retrieved "
                f"(source exists, page mismatch)."
            )
    return issues


def check_alignment(query: str, chunks: list, subject: str = "", class_level: str = ""):
    """Phase 1: curriculum-scope warning.

    Warns when the query looks outside the selected collection's scope or when
    evidence is only marginally relevant. Returns a warning string or None.
    Informational only — does not block generation.
    """
    import re
    if not chunks:
        return None
    scores = [c.get("score", 0) or 0 for c in chunks]
    best = max(scores) if scores else 0
    # marginal evidence -> scope drift suspected
    if best < 0.35:
        scope = f"{subject} {class_level}".strip() or "the selected collection"
        return (
            f"Possible scope drift: best evidence match {best:.2f} is weak for "
            f"{scope}; verify the question belongs to this syllabus."
        )
    # explicit level mismatch, e.g. Class 12 question on a Class 11 collection
    q = query.lower()
    m = re.search(r"class\s*(\d{1,2})", q)
    if m and class_level and m.group(0).lower() not in class_level.lower():
        return (
            f"Level mismatch: question mentions '{m.group(0)}' but collection is "
            f"'{class_level}'."
        )
    return None
