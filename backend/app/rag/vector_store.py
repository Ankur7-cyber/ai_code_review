
from pathlib import Path

import chromadb
from chromadb.utils.embedding_functions import (
    SentenceTransformerEmbeddingFunction,
)

BACKEND_DIR = Path(__file__).resolve().parents[2]
DATABASE_DIR = BACKEND_DIR / "data" / "chroma"

DATABASE_DIR.mkdir(parents=True, exist_ok=True)

embedding_function = SentenceTransformerEmbeddingFunction(
    model_name="all-MiniLM-L6-v2"
)

client = chromadb.PersistentClient(
    path=str(DATABASE_DIR)
)

collection = client.get_or_create_collection(
    name="code_review_knowledge",
    embedding_function=embedding_function,
    metadata={"description": "Code review and security knowledge"},
)


def add_knowledge(
    document_id: str,
    document: str,
    category: str,
) -> None:
    collection.upsert(
        ids=[document_id],
        documents=[document],
        metadatas=[{"category": category}],
    )


def search_knowledge(query: str, limit: int = 3) -> list[dict]:
    if not query.strip():
        return []

    results = collection.query(
        query_texts=[query],
        n_results=min(limit, collection.count()),
        include=["documents", "metadatas", "distances"],
    )

    matches = []

    for i, document in enumerate(results["documents"][0]):
        matches.append({
            "document": document,
            "metadata": results["metadatas"][0][i],
            "distance": results["distances"][0][i],
        })

    return matches
