"""Health check endpoint - also checks Ollama connectivity"""
from fastapi import APIRouter
import httpx
import os

router = APIRouter()
OLLAMA_URL = os.getenv("OLLAMA_URL", "http://localhost:11434")

@router.get("/health")
async def health():
    ollama_ok = False
    ollama_models = []
    try:
        async with httpx.AsyncClient(timeout=3.0) as client:
            r = await client.get(f"{OLLAMA_URL}/api/tags")
            if r.status_code == 200:
                ollama_ok = True
                data = r.json()
                ollama_models = [m["name"] for m in data.get("models", [])]
    except Exception:
        pass

    return {
        "status": "ok",
        "ollama": {"connected": ollama_ok, "url": OLLAMA_URL, "models": ollama_models},
        "version": "3.0.0"
    }
