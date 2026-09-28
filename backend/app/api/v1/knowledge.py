"""Knowledge & LanceDB Hybrid RAG Retrieval API Endpoints."""

from typing import Any, Dict, List, Optional
from fastapi import APIRouter, HTTPException, Query
from pydantic import BaseModel, Field
from backend.app.services.rag.vector_store import vector_store

router = APIRouter(prefix="/knowledge", tags=["Knowledge & LanceDB Vector RAG"])


class KnowledgeSearchRequest(BaseModel):
    query: str = Field(..., min_length=1, description="Natural language search query")
    top_k: int = Field(default=5, ge=1, le=50, description="Max ranked chunks to retrieve")
    source_filter: Optional[str] = Field(default=None, description="Optional document source filter")


class IngestDocumentRequest(BaseModel):
    source: str = Field(..., min_length=1, description="Document identifier or filename")
    content: str = Field(..., min_length=1, description="Raw text content to split and embed")
    tags: str = Field(default="", description="Comma-separated metadata tags")


@router.post("/search", response_model=Dict[str, Any])
async def search_knowledge(request: KnowledgeSearchRequest):
    """Execute hybrid vector semantic search and BM25 keyword matching via LanceDB."""
    results = await vector_store.hybrid_search(
        query=request.query,
        top_k=request.top_k,
        source_filter=request.source_filter
    )
    return {
        "query": request.query,
        "total_results": len(results),
        "results": [
            {
                "chunk_id": r.chunk_id,
                "source": r.source,
                "text": r.text,
                "score": r.score,
                "tags": r.tags.split(",") if r.tags else [],
                "citation": r.citation
            }
            for r in results
        ]
    }


@router.get("/sources", response_model=Dict[str, Any])
async def list_sources():
    """List indexed knowledge sources and storage statistics."""
    sources = vector_store.list_sources()
    total = vector_store.count_chunks()
    return {
        "sources": sources,
        "total_chunks": total,
        "vector_dimension": vector_store.VECTOR_DIM,
        "table_name": vector_store.TABLE_NAME
    }


@router.get("/chunks", response_model=Dict[str, Any])
async def list_chunks(
    limit: int = Query(default=50, ge=1, le=100),
    offset: int = Query(default=0, ge=0)
):
    """List indexed knowledge chunks with pagination."""
    chunks = vector_store.get_all_chunks(limit=limit, offset=offset)
    total = vector_store.count_chunks()
    return {
        "chunks": chunks,
        "total": total,
        "limit": limit,
        "offset": offset
    }


@router.post("/ingest", response_model=Dict[str, Any])
async def ingest_document(request: IngestDocumentRequest):
    """Chunk and embed a document into local LanceDB vector storage."""
    chunk_ids = await vector_store.ingest_document(
        source=request.source,
        content=request.content,
        tags=request.tags
    )
    return {
        "status": "ingested",
        "source": request.source,
        "chunks_created": len(chunk_ids),
        "chunk_ids": chunk_ids
    }


@router.get("/context", response_model=Dict[str, Any])
async def get_retrieval_context(
    query: str = Query(..., min_length=1),
    top_k: int = Query(default=3, ge=1, le=10)
):
    """Retrieve structured contextual chunks with provenance citations for task planning."""
    results = await vector_store.hybrid_search(query=query, top_k=top_k)
    return {
        "query": query,
        "retrieved_context": [
            {
                "chunk_id": r.chunk_id,
                "source": r.source,
                "excerpt": r.text[:300] + ("..." if len(r.text) > 300 else ""),
                "score": r.score,
                "citation": r.citation
            }
            for r in results
        ]
    }
