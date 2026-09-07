"""
AI routes - Ollama integration
Handles report generation (6 sections) and chat
Uses streaming for real-time responses
"""

from fastapi import APIRouter, HTTPException
from fastapi.responses import StreamingResponse
from pydantic import BaseModel
from typing import Optional, AsyncGenerator
import httpx, json, os, asyncio
from routes.upload import get_session_data

router = APIRouter()
OLLAMA_URL = os.getenv("OLLAMA_URL", "http://localhost:11434")
DEFAULT_MODEL = os.getenv("OLLAMA_MODEL", "llama3.2")


def build_dataset_summary(session: dict) -> str:
    an = session["analysis"]
    stats = an.get("stats", {})
    num_cols = an.get("num_cols", [])
    cat_cols = an.get("cat_cols", [])
    brand = session.get("brand", {})

    lines = [
        f"Dataset: \"{session['filename']}\" | {session['row_count']} rows × {len(session['headers'])} columns",
        f"Domain: {brand.get('name', 'General')} | Quality Score: {an.get('quality_score', 0)}/100",
        f"Issues: {an.get('dupes', 0)} duplicates, {an.get('missing_cells', 0)} missing values, {an.get('outlier_cells', 0)} outliers",
        "",
        "NUMERIC COLUMNS:"
    ]
    for col in num_cols[:8]:
        st = stats.get(col, {})
        lines.append(f"  {col}: mean={st.get('mean')}, std={st.get('std')}, min={st.get('min')}, max={st.get('max')}, outliers={st.get('outlier_pct')}%")

    lines.append("\nCATEGORICAL COLUMNS:")
    for col in cat_cols[:5]:
        st = stats.get(col, {})
        top = st.get("top_values", [])[:3]
        top_str = ", ".join(f"{v}({c})" for v, c in top)
        lines.append(f"  {col}: {st.get('unique')} unique, top=[{top_str}]")

    return "\n".join(lines)


async def ollama_generate(prompt: str, model: str = None, system: str = "") -> str:
    """Single non-streaming call to Ollama"""
    model = model or DEFAULT_MODEL
    payload = {
        "model": model,
        "prompt": prompt,
        "system": system,
        "stream": False,
        "options": {"temperature": 0.3, "num_predict": 1000}
    }
    try:
        async with httpx.AsyncClient(timeout=120.0) as client:
            r = await client.post(f"{OLLAMA_URL}/api/generate", json=payload)
            if r.status_code != 200:
                raise HTTPException(502, f"Ollama error {r.status_code}: {r.text[:200]}")
            return r.json().get("response", "")
    except httpx.ConnectError:
        raise HTTPException(503, "Cannot connect to Ollama. Make sure Ollama is running: `ollama serve`")
    except httpx.TimeoutException:
        raise HTTPException(504, "Ollama request timed out. Try a smaller model or shorter prompt.")


async def ollama_stream(prompt: str, model: str = None, system: str = "") -> AsyncGenerator[str, None]:
    """Streaming call to Ollama - yields text chunks"""
    model = model or DEFAULT_MODEL
    payload = {
        "model": model,
        "prompt": prompt,
        "system": system,
        "stream": True,
        "options": {"temperature": 0.3, "num_predict": 1000}
    }
    try:
        async with httpx.AsyncClient(timeout=120.0) as client:
            async with client.stream("POST", f"{OLLAMA_URL}/api/generate", json=payload) as resp:
                if resp.status_code != 200:
                    yield f"Error: Ollama returned {resp.status_code}"
                    return
                async for line in resp.aiter_lines():
                    if line:
                        try:
                            data = json.loads(line)
                            token = data.get("response", "")
                            if token:
                                yield token
                            if data.get("done"):
                                break
                        except json.JSONDecodeError:
                            pass
    except httpx.ConnectError:
        yield "\n\n**Error:** Cannot connect to Ollama. Run `ollama serve` in your terminal."
    except httpx.TimeoutException:
        yield "\n\n**Error:** Ollama timed out. Try a smaller/faster model."


# ── Models endpoint ──────────────────────────────────────────────
@router.get("/models")
async def list_models():
    try:
        async with httpx.AsyncClient(timeout=5.0) as client:
            r = await client.get(f"{OLLAMA_URL}/api/tags")
            if r.status_code == 200:
                models = [m["name"] for m in r.json().get("models", [])]
                return {"models": models, "default": DEFAULT_MODEL}
    except Exception:
        pass
    return {"models": [], "default": DEFAULT_MODEL, "error": "Ollama not reachable"}


# ── Report Generation ─────────────────────────────────────────────
REPORT_SECTIONS = [
    {
        "key": "executive",
        "title": "Executive Summary",
        "system": "You are a Chief Data Scientist writing a board report. Be concise, professional, and specific. Use actual numbers from the data.",
        "prompt_template": """Dataset information:
{summary}

Write an EXECUTIVE SUMMARY with these exact sections:

**OVERVIEW**
[2-3 sentences describing what this dataset represents and its business significance]

**CRITICAL FINDINGS**
• [Finding with specific numbers from the data]
• [Finding with specific numbers]
• [Finding with specific numbers]
• [Finding with specific numbers]

**BOTTOM LINE**
[1-2 decisive sentences a CEO would use in a meeting]"""
    },
    {
        "key": "kpis",
        "title": "KPI Analysis",
        "system": "You are a Senior Data Analyst. Be precise with numbers. Reference actual statistics from the dataset.",
        "prompt_template": """Dataset information:
{summary}

Write a KPI ANALYSIS. For each of the 4-6 key numeric metrics:

**[METRIC NAME]**
- Current Value: [mean from data]
- Range: [min — max]
- Variability: [Low/Medium/High based on std dev coefficient of variation]
- Outlier Risk: [percentage and what it means]
- Business Implication: [one specific sentence]"""
    },
    {
        "key": "trends",
        "title": "Trend & Pattern Analysis",
        "system": "You are a Data Science Lead. Reference real patterns visible in the dataset statistics.",
        "prompt_template": """Dataset information:
{summary}

Write TREND & PATTERN ANALYSIS:

**KEY PATTERNS IDENTIFIED**
• [Pattern with specific numbers]
• [Pattern with specific numbers]
• [Pattern]

**DISTRIBUTION INSIGHTS**
• [Skewness/spread observations with actual values]
• [Concentration patterns]

**ANOMALIES & OUTLIERS**
• [Specific outlier situation with count and business impact]

**VARIABLE RELATIONSHIPS**
• [Key correlation with business interpretation]"""
    },
    {
        "key": "risks",
        "title": "Risk Assessment",
        "system": "You are a Risk Analytics Director. Be specific about data-driven risks.",
        "prompt_template": """Dataset information:
{summary}

Write a RISK ASSESSMENT:

**RISK MATRIX**
🔴 HIGH: [Risk] — [specific evidence from data]
🔴 HIGH: [Risk] — [evidence]
🟡 MEDIUM: [Risk] — [description]
🟡 MEDIUM: [Risk] — [description]
🟢 LOW: [Risk] — [description]

**DATA QUALITY RISKS**
• [Specific risk from missing values/outliers with counts]

**BUSINESS RISKS**
• [Risk derived from data patterns]
• [Risk derived from data patterns]

**MITIGATION STEPS**
1. [Specific action]
2. [Specific action]
3. [Specific action]"""
    },
    {
        "key": "recommendations",
        "title": "Strategic Recommendations",
        "system": "You are a Strategy Consultant. Give actionable, data-backed recommendations.",
        "prompt_template": """Dataset information:
{summary}

Write STRATEGIC RECOMMENDATIONS:

**IMMEDIATE ACTIONS (0-30 days)**
1. [Action] → Expected outcome: [specific result]
2. [Action] → Expected outcome: [result]
3. [Action] → Expected outcome: [result]

**SHORT-TERM INITIATIVES (1-3 months)**
1. [Initiative with measurable KPI target]
2. [Initiative with measurable KPI target]

**LONG-TERM STRATEGY (3-12 months)**
1. [Strategic direction with goal]
2. [Strategic direction]

**EXPECTED IMPACT**
• [Quantified expected benefit]
• [Risk reduction estimate]"""
    },
    {
        "key": "forecast",
        "title": "Forecast & Outlook",
        "system": "You are a Quantitative Analyst. Be clear about assumptions and confidence levels.",
        "prompt_template": """Dataset information:
{summary}

Write FORECAST & OUTLOOK:

**PROJECTIONS (based on current data trends)**
• [Projection 1 — timeframe, confidence: High/Medium/Low]
• [Projection 2 — timeframe]
• [Projection 3]

**SCENARIO ANALYSIS**
📈 Optimistic: [outcome if positive trends continue]
📊 Base Case: [most likely outcome]
📉 Pessimistic: [downside scenario]

**KEY ASSUMPTIONS**
• [Assumption 1]
• [Assumption 2]

**DATA GAPS & NEXT STEPS**
• [What additional data would improve analysis]
• [Recommended follow-up analyses]"""
    }
]


class ReportRequest(BaseModel):
    session_id: str
    model: Optional[str] = None
    sections: Optional[list] = None  # Which sections to generate; None = all


@router.post("/report/generate")
async def generate_report(req: ReportRequest):
    """Generate full report - returns all sections sequentially"""
    s = get_session_data(req.session_id)
    summary = build_dataset_summary(s)
    model = req.model or DEFAULT_MODEL
    sections_to_gen = req.sections or [sec["key"] for sec in REPORT_SECTIONS]

    result = {}
    errors = {}

    for sec in REPORT_SECTIONS:
        if sec["key"] not in sections_to_gen:
            continue
        prompt = sec["prompt_template"].format(summary=summary)
        try:
            text = await ollama_generate(prompt, model, sec["system"])
            result[sec["key"]] = text
        except HTTPException as e:
            errors[sec["key"]] = str(e.detail)
            result[sec["key"]] = f"**Error generating this section:** {e.detail}"

    return {
        "session_id": req.session_id,
        "model": model,
        "sections": result,
        "errors": errors,
        "success": len(errors) == 0
    }


@router.post("/report/section/{section_key}")
async def generate_section(section_key: str, req: ReportRequest):
    """Generate a single report section"""
    sec = next((s for s in REPORT_SECTIONS if s["key"] == section_key), None)
    if not sec:
        raise HTTPException(404, f"Unknown section '{section_key}'")

    s = get_session_data(req.session_id)
    summary = build_dataset_summary(s)
    prompt = sec["prompt_template"].format(summary=summary)
    model = req.model or DEFAULT_MODEL

    text = await ollama_generate(prompt, model, sec["system"])
    return {"key": section_key, "title": sec["title"], "content": text, "model": model}


@router.post("/report/section/{section_key}/stream")
async def stream_section(section_key: str, req: ReportRequest):
    """Stream a single report section for real-time display"""
    sec = next((s for s in REPORT_SECTIONS if s["key"] == section_key), None)
    if not sec:
        raise HTTPException(404, f"Unknown section '{section_key}'")

    s = get_session_data(req.session_id)
    summary = build_dataset_summary(s)
    prompt = sec["prompt_template"].format(summary=summary)
    model = req.model or DEFAULT_MODEL

    async def event_stream():
        async for token in ollama_stream(prompt, model, sec["system"]):
            yield f"data: {json.dumps({'token': token})}\n\n"
        yield f"data: {json.dumps({'done': True})}\n\n"

    return StreamingResponse(event_stream(), media_type="text/event-stream")


# ── Chat ──────────────────────────────────────────────────────────
class ChatRequest(BaseModel):
    session_id: str
    message: str
    history: list = []
    model: Optional[str] = None


@router.post("/chat")
async def chat(req: ChatRequest):
    """Non-streaming chat with dataset context"""
    s = get_session_data(req.session_id)
    summary = build_dataset_summary(s)

    system = f"""You are DataMind AI, a senior data analyst assistant. You have full context of the uploaded dataset.

DATASET CONTEXT:
{summary}

Answer questions about this data clearly and professionally. Use specific numbers. 
If asked to visualize, describe what chart would best show the insight.
Keep responses concise (under 300 words unless asked for detail)."""

    # Build prompt from history
    history_text = ""
    for msg in req.history[-6:]:  # Last 6 messages for context
        role = "User" if msg.get("role") == "user" else "Assistant"
        history_text += f"{role}: {msg.get('content', '')}\n"

    prompt = f"{history_text}User: {req.message}\nAssistant:"

    text = await ollama_generate(prompt, req.model or DEFAULT_MODEL, system)
    return {"response": text, "model": req.model or DEFAULT_MODEL}


@router.post("/chat/stream")
async def chat_stream(req: ChatRequest):
    """Streaming chat"""
    s = get_session_data(req.session_id)
    summary = build_dataset_summary(s)

    system = f"""You are DataMind AI, a senior data analyst. Dataset context:
{summary}
Be concise, professional, and use actual numbers from the data."""

    history_text = ""
    for msg in req.history[-6:]:
        role = "User" if msg.get("role") == "user" else "Assistant"
        history_text += f"{role}: {msg.get('content', '')}\n"

    prompt = f"{history_text}User: {req.message}\nAssistant:"

    async def event_stream():
        async for token in ollama_stream(prompt, req.model or DEFAULT_MODEL, system):
            yield f"data: {json.dumps({'token': token})}\n\n"
        yield f"data: {json.dumps({'done': True})}\n\n"

    return StreamingResponse(event_stream(), media_type="text/event-stream")


# ── Quick Insights ─────────────────────────────────────────────────
@router.post("/insights/{session_id}")
async def quick_insights(session_id: str, model: Optional[str] = DEFAULT_MODEL):
    """Generate quick bullet-point insights"""
    s = get_session_data(session_id)
    summary = build_dataset_summary(s)

    prompt = f"""Dataset:
{summary}

Give exactly 5 key business insights as bullet points. Each should be one sentence with specific numbers. Start each with •"""

    system = "You are a concise data analyst. Give specific, numbered insights. No preamble."
    text = await ollama_generate(prompt, model, system)
    return {"insights": text, "model": model}
