def validate_grounding(generated: dict, chunks: list, threshold: float = 0.7):
    """
    Simple validator: checks if generated content cites sources and if chunks exist.
    Returns grounded bool + warnings.
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
