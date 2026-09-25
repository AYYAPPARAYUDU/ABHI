"""Unit tests for LanceDB serverless vector storage and hybrid search."""

import pytest
from backend.app.services.rag.vector_store import LocalVectorStore


@pytest.mark.asyncio
async def test_lancedb_ingest_and_search(tmp_path):
    test_db_dir = str(tmp_path / "test_lancedb")
    store = LocalVectorStore(db_dir=test_db_dir)

    doc_text = "FastAPI is a modern fast web framework for building APIs with Python based on standard type hints."
    chunk_ids = await store.ingest_document(source="fastapi_doc.md", content=doc_text, tags="fastapi,python")
    assert len(chunk_ids) > 0

    # Search for relevant query
    results = await store.hybrid_search(query="building web APIs in Python", top_k=3)
    assert len(results) > 0
    top_hit = results[0]
    assert "fastapi_doc.md" in top_hit.source
    assert top_hit.score > 0.0
    assert "[fastapi_doc.md" in top_hit.citation
