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
        except Exception:
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
