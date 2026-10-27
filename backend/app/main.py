
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from app.api.rag_routes import router as rag_router
from app.api.review_routes import router as review_router

from app.api.routes import router

app = FastAPI(
    title="AI Code Reviewer",
    description="AI code review and complexity analysis API",
    version="1.0.0",
)
app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:5173",
        "http://127.0.0.1:5173",
    ],
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(router)
app.include_router(rag_router)
app.include_router(review_router)


@app.get("/")
def root():
    return {
        "message": "AI Code Reviewer API is running",
        "status": "healthy",
    }


@app.get("/health")
def health():
    return {"status": "ok"}
