
import os
from pathlib import Path

from dotenv import load_dotenv
from groq import Groq

load_dotenv(Path(__file__).resolve().parent / ".env")

api_key = os.getenv("GROQ_API_KEY")
model = os.getenv("GROQ_MODEL", "openai/gpt-oss-20b")

if not api_key or api_key == "paste_your_real_key_here":
    raise RuntimeError("Set your real Groq API key in backend/.env")

client = Groq(api_key=api_key)

response = client.chat.completions.create(
    model=model,
    messages=[
        {
            "role": "user",
            "content": "Reply with exactly: Groq connection successful",
        }
    ],
    max_tokens=50,
)

print(response.choices[0].message.content)
