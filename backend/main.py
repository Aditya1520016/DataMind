"""
DataMind Enterprise - FastAPI Backend
Handles file uploads, data processing, Ollama AI integration
"""

from fastapi import FastAPI, UploadFile, File, HTTPException, BackgroundTasks
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse, FileResponse
from fastapi.staticfiles import StaticFiles
import uvicorn
import os

from routes import upload, analysis, ai, export, health

app = FastAPI(
    title="DataMind Enterprise API",
    description="AI-powered data analysis platform using Ollama",
    version="3.0.0"
)

# CORS - allow frontend dev server
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000", "http://localhost:5173", "http://127.0.0.1:3000"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Register routers
app.include_router(health.router,   prefix="/api",        tags=["Health"])
app.include_router(upload.router,   prefix="/api/upload", tags=["Upload"])
app.include_router(analysis.router, prefix="/api/analysis", tags=["Analysis"])
app.include_router(ai.router,       prefix="/api/ai",     tags=["AI"])
app.include_router(export.router,   prefix="/api/export", tags=["Export"])

@app.get("/")
def root():
    return {"message": "DataMind Enterprise API v3.0", "status": "running"}

if __name__ == "__main__":
    uvicorn.run("main:app", host="0.0.0.0", port=8000, reload=True)
