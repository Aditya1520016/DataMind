"""
Upload route - handles CSV (.csv) and Excel (.xlsx, .xls) files
Returns parsed data + full analysis
"""

from fastapi import APIRouter, UploadFile, File, HTTPException
from fastapi.responses import JSONResponse
import io, uuid, os, json
from services.parser import parse_file
from services.analyzer import full_analysis
from services.cleaner import auto_clean

router = APIRouter()

# In-memory session store (use Redis in production)
SESSION_STORE: dict = {}

@router.post("/")
async def upload_file(file: UploadFile = File(...)):
    # Validate file type
    allowed = {".csv", ".xlsx", ".xls"}
    ext = os.path.splitext(file.filename)[1].lower()
    if ext not in allowed:
        raise HTTPException(400, f"Unsupported file type '{ext}'. Use CSV, XLSX, or XLS.")

    # Read file bytes
    contents = await file.read()
    if len(contents) > 100 * 1024 * 1024:  # 100MB limit
        raise HTTPException(413, "File too large. Maximum size is 100MB.")

    try:
        # Parse file into headers + rows
        headers, rows, sheet_names = parse_file(contents, ext, file.filename)

        if not headers or len(rows) == 0:
            raise HTTPException(400, "File appears empty or could not be parsed.")

        # Run full statistical analysis
        analysis = full_analysis(headers, rows)

        # Auto-clean data
        cleaned_rows, clean_log = auto_clean(rows, headers, analysis["stats"])

        # Re-analyze cleaned data
        clean_analysis = full_analysis(headers, cleaned_rows)

        # Detect brand/domain
        from utils.brand import detect_brand
        brand = detect_brand(headers, rows[:10], file.filename)

        # Store session
        session_id = str(uuid.uuid4())
        SESSION_STORE[session_id] = {
            "id": session_id,
            "filename": file.filename,
            "ext": ext,
            "headers": headers,
            "rows": cleaned_rows,
            "original_rows": rows,
            "analysis": clean_analysis,
            "original_analysis": analysis,
            "clean_log": clean_log,
            "brand": brand,
            "sheet_names": sheet_names,
            "row_count": len(cleaned_rows),
            "original_row_count": len(rows),
        }

        return {
            "session_id": session_id,
            "filename": file.filename,
            "ext": ext,
            "sheet_names": sheet_names,
            "headers": headers,
            "preview": cleaned_rows[:20],  # First 20 rows for preview
            "row_count": len(cleaned_rows),
            "original_row_count": len(rows),
            "analysis": clean_analysis,
            "clean_log": clean_log,
            "brand": brand,
        }

    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(500, f"Error processing file: {str(e)}")


@router.get("/session/{session_id}")
async def get_session(session_id: str):
    if session_id not in SESSION_STORE:
        raise HTTPException(404, "Session not found. Please re-upload the file.")
    s = SESSION_STORE[session_id]
    return {k: v for k, v in s.items() if k != "rows"}  # Don't send all rows on refresh


@router.get("/session/{session_id}/rows")
async def get_rows(session_id: str, page: int = 0, page_size: int = 50):
    if session_id not in SESSION_STORE:
        raise HTTPException(404, "Session not found.")
    rows = SESSION_STORE[session_id]["rows"]
    start = page * page_size
    return {
        "rows": rows[start:start + page_size],
        "total": len(rows),
        "page": page,
        "pages": (len(rows) + page_size - 1) // page_size
    }


@router.get("/sessions")
async def list_sessions():
    return [
        {"id": sid, "filename": s["filename"], "row_count": s["row_count"], "brand": s["brand"]}
        for sid, s in SESSION_STORE.items()
    ]


def get_session_data(session_id: str):
    """Helper for other routes to retrieve session data"""
    if session_id not in SESSION_STORE:
        raise HTTPException(404, "Session not found.")
    return SESSION_STORE[session_id]
