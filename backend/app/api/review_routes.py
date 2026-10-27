
import ast

from fastapi import APIRouter, HTTPException
from pydantic import BaseModel, Field

from app.analysis.complexity import analyze_code
from app.rag.vector_store import search_knowledge
from app.services.llm_service import generate_review

router = APIRouter(prefix="/review", tags=["AI Code Review"])


class ReviewRequest(BaseModel):
    code: str = Field(min_length=1, max_length=30000)


def build_retrieval_query(code: str, analysis: dict) -> str:
    signals = [
        "Python code review",
        "security vulnerabilities",
        "correctness",
        "performance",
        "maintainability",
    ]

    try:
        tree = ast.parse(code)
    except SyntaxError:
        return " ".join(signals)

    for node in ast.walk(tree):
        if isinstance(node, (ast.FunctionDef, ast.AsyncFunctionDef)):
            signals.append("function implementation")

        elif isinstance(node, ast.Call):
            if isinstance(node.func, ast.Name):
                if node.func.id == "eval":
                    signals.append("unsafe eval arbitrary code execution")
                elif node.func.id == "exec":
                    signals.append("unsafe exec arbitrary code execution")
                elif node.func.id == "input":
                    signals.append("untrusted user input validation")

            elif isinstance(node.func, ast.Attribute):
                if node.func.attr == "execute":
                    signals.append(
                        "SQL injection parameterized database queries"
                    )

        elif isinstance(node, (ast.For, ast.AsyncFor, ast.While)):
            signals.append("loop algorithmic time complexity")

        elif isinstance(node, ast.Try):
            signals.append("exception handling best practices")

    for function in analysis.get("functions", []):
        complexity = function.get("complexity", 0)

        if complexity > 10:
            signals.append("high cyclomatic complexity simplify function")

    return " ".join(dict.fromkeys(signals))


@router.post("/")
def review_code(request: ReviewRequest):
    try:
        analysis = analyze_code(request.code)

        if not analysis.get("success"):
            raise HTTPException(
                status_code=422,
                detail=analysis.get("error", "Invalid Python code"),
            )

        query = build_retrieval_query(request.code, analysis)
        knowledge = search_knowledge(query, limit=5)

        review = generate_review(
            code=request.code,
            analysis=analysis,
            knowledge=knowledge,
        )

        return {
            "success": True,
            "language": "python",
            "static_analysis": analysis,
            "retrieval_query": query,
            "knowledge_documents_retrieved": len(knowledge),
            "ai_review": review,
        }

    except HTTPException:
        raise
    except Exception:
        raise HTTPException(
            status_code=502,
            detail="Code review failed. Check server logs for details.",
        )
