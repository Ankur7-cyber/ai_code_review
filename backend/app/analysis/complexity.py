
import ast
from radon.complexity import cc_visit
from radon.metrics import mi_visit


def analyze_code(code: str) -> dict:
    try:
        tree = ast.parse(code)
    except SyntaxError as exc:
        return {
            "success": False,
            "error": f"Syntax error at line {exc.lineno}: {exc.msg}",
        }

    blocks = cc_visit(code)
    functions = []

    for block in blocks:
        functions.append({
            "name": block.name,
            "type": block.__class__.__name__,
            "line": block.lineno,
            "complexity": block.complexity,
            "rank": (
                "A" if block.complexity <= 5 else
                "B" if block.complexity <= 10 else
                "C" if block.complexity <= 20 else
                "D" if block.complexity <= 30 else
                "E" if block.complexity <= 40 else "F"
            ),
        })

    return {
        "success": True,
        "language": "python",
        "lines_of_code": len(code.splitlines()),
        "function_count": sum(
            isinstance(node, (ast.FunctionDef, ast.AsyncFunctionDef))
            for node in ast.walk(tree)
        ),
        "class_count": sum(
            isinstance(node, ast.ClassDef)
            for node in ast.walk(tree)
        ),
        "maintainability_index": round(mi_visit(code, multi=True), 2),
        "functions": functions,
    }
