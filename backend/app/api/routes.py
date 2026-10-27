
from fastapi import APIRouter
from pydantic import BaseModel, Field

from app.analysis.complexity import analyze_code

router = APIRouter()


class CodeRequest(BaseModel):
    code: str = Field(min_length=1, max_length=100000)


@router.post("/analyze/complexity")
def analyze_complexity(request: CodeRequest):
    return analyze_code(request.code)
