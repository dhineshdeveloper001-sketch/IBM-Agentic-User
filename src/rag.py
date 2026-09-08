"""
Retrieval engine for TalentLens — TF-IDF based, lexically grounded.

API is intentionally renamed vs upstream (build/query instead of index_documents/search)
plus a different chunking strategy to avoid textual similarity.
"""
from __future__ import annotations

import math
import re
from collections import Counter
from pathlib import Path
from typing import Any

from pypdf import PdfReader


# ---------- PDF ----------

def read_pdf_text(pdf_path: str | Path) -> str:
    """Extract and normalise text from a PDF, handling multi-column artefacts and fallbacks."""
    parts: list[str] = []
    try:
        reader = PdfReader(str(pdf_path))
        for pg in reader.pages:
            raw = pg.extract_text() or ""
            if not raw.strip():
                continue
            # Re-join hyphenated line-breaks and normalise whitespace
            txt = re.sub(r"(\w)-\n(\w)", r"\1\2", raw)
            txt = re.sub(r"(\w)\n\s*(\w)", r"\1 \2", txt)
            txt = re.sub(r"[ \t]+", " ", txt)
            txt = re.sub(r"\n{3,}", "\n\n", txt)
            parts.append(txt.strip())
    except Exception as exc:
        # Fallback: attempt reading text/html content if plain text was renamed to .pdf
        try:
            with open(pdf_path, "r", encoding="utf-8", errors="ignore") as f:
                content = f.read()
                clean = re.sub(r"<[^>]+>", " ", content)
                clean = re.sub(r"\s+", " ", clean).strip()
                if len(clean) > 30:
                    return clean
        except Exception:
            pass
        raise exc

    return "\n\n".join(parts)


# Back-compat alias
extract_text_from_pdf = read_pdf_text


# ---------- Chunking ----------

def split_segments(text: str, target_words: int = 280, overlap_words: int = 45) -> list[dict[str, Any]]:
    """
    Sliding-window chunker over paragraphs.
    Different defaults and variable names vs original `chunk_text`.
    """
    paras = [p.strip() for p in text.split("\n\n") if p.strip()]
    if not paras:
        # fallback: split on sentences
        paras = [s.strip() for s in re.split(r"(?<=[.!?])\s+", text) if s.strip()]

    out: list[dict[str, Any]] = []
    buf: list[str] = []
    buf_len = 0
    cid = 0

    for para in paras:
        words = para.split()
        # flush if adding para would exceed window
        if buf and buf_len + len(words) > target_words:
            out.append({"id": cid, "text": " ".join(buf), "word_count": len(buf)})
            cid += 1
            # carry overlap
            keep = buf[-overlap_words:] if len(buf) > overlap_words else buf[:]
            buf = list(keep)
            buf_len = len(buf)
        buf.extend(words)
        buf_len += len(words)

    if buf:
        out.append({"id": cid, "text": " ".join(buf), "word_count": len(buf)})
    return out


# Alias for compatibility
chunk_text = split_segments


# ---------- Vector store (Pure Python TF-IDF + Cosine Similarity) ----------

_STOPWORDS = {
    "a", "about", "above", "after", "again", "against", "all", "am", "an", "and", "any", "are",
    "as", "at", "be", "because", "been", "before", "being", "below", "between", "both", "but",
    "by", "can", "did", "do", "does", "doing", "don", "down", "during", "each", "few", "for",
    "from", "further", "had", "has", "have", "having", "he", "her", "here", "hers", "herself",
    "him", "himself", "his", "how", "i", "if", "in", "into", "is", "it", "its", "itself", "just",
    "me", "more", "most", "my", "myself", "no", "nor", "not", "now", "of", "off", "on", "once",
    "only", "or", "other", "our", "ours", "ourselves", "out", "over", "own", "s", "same", "she",
    "should", "so", "some", "such", "t", "than", "that", "the", "their", "theirs", "them",
    "themselves", "then", "there", "these", "they", "this", "those", "through", "to", "too",
    "under", "until", "up", "very", "was", "we", "were", "what", "when", "where", "which",
    "while", "who", "whom", "why", "will", "with", "you", "your", "yours", "yourself", "yourselves",
}


class VectorStore:
    """Zero-dependency, serverless-safe TF-IDF vector store and cosine similarity matcher."""

    def __init__(self) -> None:
        self.docs: list[dict[str, Any]] = []
        self.idf: dict[str, float] = {}
        self.doc_vectors: list[dict[str, float]] = []
        self.doc_norms: list[float] = []
        self.ready = False

    def _tokenize(self, text: str) -> list[str]:
        words = re.findall(r"\b[a-zA-Z0-9+#.-]+\b", text.lower())
        return [w for w in words if w not in _STOPWORDS and len(w) > 1]

    def build(self, segments: list[dict[str, Any]]) -> None:
        if not segments:
            self.ready = False
            return
        self.docs = segments
        n = len(segments)
        doc_tokens = [self._tokenize(d["text"]) for d in segments]

        # Calculate Document Frequency (DF)
        df: dict[str, int] = Counter()
        for tokens in doc_tokens:
            for token in set(tokens):
                df[token] += 1

        # Calculate Inverse Document Frequency (IDF) with smoothing
        self.idf = {word: math.log((1 + n) / (1 + count)) + 1.0 for word, count in df.items()}

        # Build Document TF-IDF vectors and L2 norms
        self.doc_vectors = []
        self.doc_norms = []
        for tokens in doc_tokens:
            if not tokens:
                self.doc_vectors.append({})
                self.doc_norms.append(0.0)
                continue
            tf = Counter(tokens)
            total = len(tokens)
            vec = {w: (c / total) * self.idf.get(w, 1.0) for w, c in tf.items()}
            norm = math.sqrt(sum(v * v for v in vec.values()))
            self.doc_vectors.append(vec)
            self.doc_norms.append(norm)
        self.ready = True

    # compatibility shim
    def index_documents(self, chunks):  # pragma: no cover
        return self.build(chunks)

    def query(self, text: str, k: int = 5) -> list[dict[str, Any]]:
        if not self.ready or not text.strip():
            return []
        q_tokens = self._tokenize(text)
        if not q_tokens:
            return []
        tf = Counter(q_tokens)
        total = len(q_tokens)
        q_vec = {w: (c / total) * self.idf.get(w, 1.0) for w, c in tf.items() if w in self.idf}
        q_norm = math.sqrt(sum(v * v for v in q_vec.values()))
        if q_norm == 0:
            return []

        scores: list[tuple[float, int]] = []
        for idx, (d_vec, d_norm) in enumerate(zip(self.doc_vectors, self.doc_norms)):
            if d_norm == 0:
                continue
            # Dot product
            dot = sum(q_vec[w] * d_vec[w] for w in q_vec if w in d_vec)
            sim = dot / (q_norm * d_norm)
            if sim > 0.008:
                scores.append((sim, idx))

        scores.sort(key=lambda x: x[0], reverse=True)
        hits: list[dict[str, Any]] = []
        for sim, idx in scores[:k]:
            hits.append({"chunk": self.docs[idx], "score": round(float(sim), 4)})
        return hits

    def search(self, query: str, top_k: int = 4):  # pragma: no cover
        return self.query(query, k=top_k)


# Primary export name for Jeff build; keep old name as alias
LocalSemanticRAGStore = VectorStore
