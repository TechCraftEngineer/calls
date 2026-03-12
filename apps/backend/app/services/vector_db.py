"""Vector DB (ChromaDB) for RAG: embedding and similarity search over call transcripts."""

from __future__ import annotations

import logging
import uuid
from pathlib import Path
from typing import Any, Dict, List, Optional

from app.core.config import settings

logger = logging.getLogger(__name__)

# Resolve Chroma persist path (relative to backend root)
_backend_root = Path(__file__).parent.parent.parent
CHROMA_PERSIST_DIR = (_backend_root / settings.CHROMA_PERSIST_DIR).resolve()
CHROMA_PERSIST_DIR.mkdir(parents=True, exist_ok=True)

_collection = None
_embedding_model = None


def _get_client():
    import chromadb
    return chromadb.PersistentClient(path=str(CHROMA_PERSIST_DIR))


def _get_embedding_model():
    global _embedding_model
    if _embedding_model is None:
        from sentence_transformers import SentenceTransformer
        _embedding_model = SentenceTransformer(settings.EMBEDDING_MODEL)
    return _embedding_model


def _get_collection():
    global _collection
    if _collection is None:
        client = _get_client()
        _collection = client.get_or_create_collection(
            name=settings.CHROMA_COLLECTION_NAME,
            metadata={"description": "Call transcript chunks for RAG"},
        )
    return _collection


def _chunk_text(text: str, chunk_size: int = 1500, overlap: int = 200) -> List[str]:
    """Split text into overlapping chunks (approx 300-500 tokens ~ 1200-2000 chars)."""
    if not (text or text.strip()):
        return []
    chunks = []
    start = 0
    text = text.strip()
    while start < len(text):
        end = start + chunk_size
        chunk = text[start:end]
        if end < len(text):
            last_space = chunk.rfind("\n") if "\n" in chunk else chunk.rfind(" ")
            if last_space > chunk_size // 2:
                end = start + last_space + 1
                chunk = text[start:end]
        chunks.append(chunk.strip())
        if end >= len(text):
            break
        start = end - overlap
    return [c for c in chunks if c]


def embed_texts(texts: List[str]) -> List[List[float]]:
    """Compute embeddings for a list of texts."""
    if not texts:
        return []
    model = _get_embedding_model()
    return model.encode(texts, show_progress_bar=False).tolist()


def delete_by_call_id(call_id: int) -> None:
    """Remove all chunks belonging to the given call (for re-index or call delete)."""
    try:
        coll = _get_collection()
        # ChromaDB delete by where filter
        coll.delete(where={"call_id": call_id})
        logger.info("Vector DB: deleted chunks for call_id=%s", call_id)
    except Exception as e:
        logger.warning("Vector DB delete_by_call_id(%s): %s", call_id, e)


def add_chunks(
    call_id: int,
    text: str,
    metadata: Dict[str, Any],
) -> int:
    """
    Split text into chunks, embed, and add to ChromaDB. Replaces any existing chunks for this call_id.
    metadata must include at least: date (YYYY-MM-DD), internal_number (str).
    Returns number of chunks added.
    """
    logger.debug("add_chunks: call_id=%s text_len=%s metadata=%s", call_id, len(text or ""), metadata)
    delete_by_call_id(call_id)
    chunks = _chunk_text(text, chunk_size=1500, overlap=200)
    if not chunks:
        logger.debug("add_chunks: no chunks produced for call_id=%s", call_id)
        return 0
    date_str = metadata.get("date") or ""
    internal_number = metadata.get("internal_number") or ""
    metadatas = [
        {"call_id": call_id, "date": date_str, "internal_number": internal_number}
        for _ in chunks
    ]
    ids = [f"call_{call_id}_{uuid.uuid4().hex[:12]}" for _ in chunks]
    embeddings = embed_texts(chunks)
    try:
        coll = _get_collection()
        coll.add(
            documents=chunks,
            metadatas=metadatas,
            ids=ids,
            embeddings=embeddings,
        )
        logger.info("Vector DB: added %s chunks for call_id=%s", len(chunks), call_id)
        return len(chunks)
    except Exception as e:
        logger.exception("Vector DB add_chunks failed: %s", e)
        raise


def search_similar_chunks(
    query: str,
    start_date: Optional[str] = None,
    end_date: Optional[str] = None,
    internal_numbers: Optional[List[str]] = None,
    limit: int = 10,
) -> List[Dict[str, Any]]:
    """
    Search for the most relevant transcript chunks. Filter by date range and optional internal_numbers.
    Returns list of dicts with keys: text (document), metadata, distance.
    """
    try:
        coll = _get_collection()
        where_parts = []
        if start_date:
            where_parts.append({"date": {"$gte": start_date}})
        if end_date:
            where_parts.append({"date": {"$lte": end_date}})
        if internal_numbers is not None and len(internal_numbers) > 0:
            where_parts.append({"internal_number": {"$in": internal_numbers}})
        where_filter = {"$and": where_parts} if len(where_parts) > 1 else (where_parts[0] if len(where_parts) == 1 else None)

        logger.debug(
            "RAG search: query=%r start_date=%s end_date=%s internal_numbers=%s where=%s",
            query[:80] + "..." if len(query) > 80 else query,
            start_date,
            end_date,
            internal_numbers,
            where_filter,
        )
        query_embedding = embed_texts([query])
        n_results = min(limit, 20)
        res = coll.query(
            query_embeddings=query_embedding,
            n_results=n_results,
            where=where_filter,
            include=["documents", "metadatas", "distances"],
        )
        out = []
        docs = res["documents"][0] if res["documents"] else []
        metas = res["metadatas"][0] if res["metadatas"] else []
        dists = res["distances"][0] if res.get("distances") else []
        for i, doc in enumerate(docs):
            out.append({
                "text": doc,
                "metadata": metas[i] if i < len(metas) else {},
                "distance": dists[i] if i < len(dists) else None,
            })
        logger.info(
            "RAG search result: found %s chunks for query (date %s..%s)",
            len(out),
            start_date or "any",
            end_date or "any",
        )
        if out and logger.isEnabledFor(logging.DEBUG):
            for i, o in enumerate(out[:3]):
                logger.debug("RAG chunk %s: call_id=%s distance=%s", i + 1, o.get("metadata", {}).get("call_id"), o.get("distance"))
        return out
    except Exception as e:
        logger.exception("Vector DB search_similar_chunks failed: %s", e)
        return []
