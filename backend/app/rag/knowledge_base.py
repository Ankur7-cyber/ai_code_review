
from app.rag.vector_store import add_knowledge, collection


KNOWLEDGE = [
    {
        "id": "python-unsafe-eval",
        "category": "security",
        "text": (
            "Avoid eval() on untrusted input. It can execute arbitrary "
            "Python expressions. Prefer explicit parsing or safe data "
            "formats such as JSON when appropriate."
        ),
    },
    {
        "id": "python-sql-injection",
        "category": "security",
        "text": (
            "Prevent SQL injection by using parameterized queries or "
            "prepared statements. Do not build SQL commands by directly "
            "concatenating untrusted user input."
        ),
    },
    {
        "id": "python-nested-loops",
        "category": "complexity",
        "text": (
            "Two nested loops that each iterate n times may take O(n^2) "
            "time. Confirm loop bounds and input relationships before "
            "assigning a complexity estimate."
        ),
    },
    {
        "id": "python-dictionary-lookup",
        "category": "optimization",
        "text": (
            "Python dictionary lookups are O(1) on average. Replacing "
            "repeated linear membership searches with a set or dictionary "
            "can improve performance when data structures are suitable."
        ),
    },
    {
        "id": "python-exceptions",
        "category": "quality",
        "text": (
            "Catch specific exceptions rather than using a broad except "
            "clause. Handle expected errors and avoid silently hiding "
            "unexpected failures."
        ),
    },
]


def seed_knowledge_base() -> dict:
    for item in KNOWLEDGE:
        add_knowledge(
            document_id=item["id"],
            document=item["text"],
            category=item["category"],
        )

    return {
        "message": "Knowledge base initialized",
        "documents_added": len(KNOWLEDGE),
        "total_documents": collection.count(),
    }

