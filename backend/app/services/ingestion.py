import fitz  # PyMuPDF
from pypdf import PdfReader
import re

def extract_text_pymupdf(file_path: str):
    doc = fitz.open(file_path)
    pages_text = []
    for i, page in enumerate(doc):
        text = page.get_text("text")
        pages_text.append((i+1, text))
    return pages_text, len(doc)

def extract_text_pypdf(file_path: str):
    reader = PdfReader(file_path)
    pages_text = []
    for i, page in enumerate(reader.pages):
        try:
            text = page.extract_text() or ""
        except:
            text = ""
        pages_text.append((i+1, text))
    return pages_text, len(reader.pages)

def extract_text(file_path: str):
    try:
        pages_text, n = extract_text_pymupdf(file_path)
        if sum(len(t) for _, t in pages_text) < 100:
            # fallback
            pages_text, n = extract_text_pypdf(file_path)
        return pages_text, n
    except Exception as e:
        return extract_text_pypdf(file_path)

def clean_text(text: str) -> str:
    text = re.sub(r'\s+', ' ', text)
    return text.strip()

def chunk_text(pages_text, chunk_size=600, overlap=100):
    """
    pages_text: list of (page_num, text)
    chunk_size in tokens approx = words; we use chars ~ 4 chars/token -> 600 tokens ~ 2400 chars
    """
    char_size = chunk_size * 4
    char_overlap = overlap * 4
    chunks = []
    buffer = ""
    buffer_pages = []
    for page_num, text in pages_text:
        text = clean_text(text)
        if not text:
            continue
        # split by sentences to avoid mid-sentence cut? simple split by period
        # but keep simple: sliding window over words
        words = text.split()
        # reconstruct with page tracking: we will assign chunk to page where most content comes from
        for i in range(0, len(words), (char_size//5) - (char_overlap//5)):  # approx words
            # need char based: convert to chars
            pass
        # simpler: char based chunking
        start = 0
        while start < len(text):
            end = start + char_size
            chunk = text[start:end]
            if len(chunk.strip()) < 50:
                break
            # determine page
            chunks.append({
                "text": chunk.strip(),
                "page": page_num,
                "char_start": start,
                "char_end": end
            })
            if end >= len(text):
                break
            start = end - char_overlap
    # alternative simpler robust:
    # Instead do global concatenation with page markers then chunk
    # For now return above; but need to ensure not empty duplicates
    # Deduplicate tiny overlap artifacts
    deduped = []
    seen = set()
    for c in chunks:
        key = c["text"][:100]
        if key in seen:
            continue
        seen.add(key)
        if len(c["text"]) > 100:
            deduped.append(c)
    return deduped

def better_chunk(pages_text, chunk_size_chars=2500, overlap_chars=400):
    chunks = []
    for page_num, text in pages_text:
        text = clean_text(text)
        if len(text) < 50:
            continue
        start = 0
        while start < len(text):
            end = start + chunk_size_chars
            chunk = text[start:end]
            if len(chunk.strip()) > 100:
                chunks.append({"text": chunk.strip(), "page": page_num})
            if end >= len(text):
                break
            start = end - overlap_chars
    return chunks
