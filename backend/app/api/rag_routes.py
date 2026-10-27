
from fastapi import APIRouter, HTTPException
from pydantic import BaseModel, Field

from app.rag.knowledge_base import seed_knowledge_base
from app.rag.vector_store import search_knowledge

router = APIRouter(prefix="/rag", tags=["RAG"])


class SearchRequest(BaseModel):
    query: str = Field(min_length=1, max_length=5000)
    limit: int = Field(default=3, ge=1, le=10)


@router.post("/initialize")
def initialize_knowledge():
    try:
        return seed_knowledge_base()
    except Exception:
        raise HTTPException(
            status_code=500,
            detail="Failed to initialize the knowledge base",
        )


@router.post("/search")
def retrieve_knowledge(request: SearchRequest):
    try:
        results = search_knowledge(
            request.query,
            limit=request.limit,
        )

        return {
            "query": request.query,
            "results_count": len(results),
            "results": results,
        }
    except Exception:
        raise HTTPException(
            status_code=500,
            detail="Knowledge retrieval failed",
        )
