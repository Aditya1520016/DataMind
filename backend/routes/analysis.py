"""
Analysis routes - EDA, correlations, outliers, pivot tables, forecasting
"""

from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from typing import Optional
import math
from routes.upload import get_session_data


def _std(arr: list) -> float:
    """Pure Python population standard deviation."""
    if len(arr) < 2:
        return 0.0
    mean = sum(arr) / len(arr)
    variance = sum((x - mean) ** 2 for x in arr) / len(arr)
    return math.sqrt(variance)

router = APIRouter()


@router.get("/{session_id}/summary")
async def get_summary(session_id: str):
    s = get_session_data(session_id)
    return {
        "session_id": session_id,
        "filename": s["filename"],
        "brand": s["brand"],
        "headers": s["headers"],
        "row_count": s["row_count"],
        "original_row_count": s["original_row_count"],
        "analysis": s["analysis"],
        "clean_log": s["clean_log"],
    }


@router.get("/{session_id}/correlations")
async def get_correlations(session_id: str):
    s = get_session_data(session_id)
    an = s["analysis"]
    corr = an.get("correlations", {})
    num_cols = an.get("num_cols", [])

    # Build strong pairs list
    strong_pairs = []
    seen = set()
    for c1 in num_cols:
        for c2 in num_cols:
            if c1 == c2: continue
            key = tuple(sorted([c1, c2]))
            if key in seen: continue
            seen.add(key)
            v = corr.get(c1, {}).get(c2, 0)
            if abs(v) >= 0.3:
                strong_pairs.append({
                    "col1": c1, "col2": c2, "value": round(v, 4),
                    "strength": "Very Strong" if abs(v) > 0.8 else "Strong" if abs(v) > 0.6 else "Moderate" if abs(v) > 0.4 else "Weak",
                    "direction": "Positive" if v > 0 else "Negative"
                })
    strong_pairs.sort(key=lambda x: abs(x["value"]), reverse=True)
    return {"matrix": corr, "num_cols": num_cols, "strong_pairs": strong_pairs}


class PivotRequest(BaseModel):
    session_id: str
    row_col: str
    value_col: str
    agg: str = "mean"  # mean | sum | count | min | max | median


@router.post("/pivot")
async def pivot_table(req: PivotRequest):
    s = get_session_data(req.session_id)
    rows = s["rows"]
    an = s["analysis"]

    if req.row_col not in s["headers"]:
        raise HTTPException(400, f"Column '{req.row_col}' not found")
    if req.value_col not in s["headers"] and req.agg != "count":
        raise HTTPException(400, f"Column '{req.value_col}' not found")

    groups: dict = {}
    for r in rows:
        key = str(r.get(req.row_col, "Unknown"))
        if key not in groups:
            groups[key] = []
        try:
            v = float(r.get(req.value_col, 0))
            groups[key].append(v)
        except (ValueError, TypeError):
            pass

    result = []
    for group, vals in groups.items():
        if not vals: continue
        arr = sorted(vals)
        n = len(arr)
        mean_v = sum(arr) / n
        result.append({
            "group": group[:30],
            "count": n,
            "mean": round(mean_v, 3),
            "sum": round(sum(arr), 3),
            "min": arr[0],
            "max": arr[-1],
            "median": arr[n // 2],
            "std": round(_std(arr), 3) if n > 1 else 0,
            "value": round({
                "mean": mean_v,
                "sum": sum(arr),
                "count": n,
                "min": arr[0],
                "max": arr[-1],
                "median": arr[n // 2],
            }.get(req.agg, mean_v), 3)
        })

    result.sort(key=lambda x: x["value"], reverse=True)
    return {"data": result[:50], "agg": req.agg, "row_col": req.row_col, "value_col": req.value_col}


@router.get("/{session_id}/outliers")
async def get_outliers(session_id: str):
    s = get_session_data(session_id)
    an = s["analysis"]
    stats = an.get("stats", {})
    num_cols = an.get("num_cols", [])

    result = []
    for col in num_cols:
        st = stats.get(col, {})
        if not st: continue
        result.append({
            "col": col,
            "outlier_count": st.get("outlier_count", 0),
            "outlier_pct": st.get("outlier_pct", 0),
            "q1": st.get("q1", 0),
            "q3": st.get("q3", 0),
            "iqr": st.get("iqr", 0),
            "lower_fence": st.get("q1", 0) - 1.5 * st.get("iqr", 0),
            "upper_fence": st.get("q3", 0) + 1.5 * st.get("iqr", 0),
            "min": st.get("min", 0),
            "max": st.get("max", 0),
            "mean": st.get("mean", 0),
            "std": st.get("std", 0),
            "severity": "High" if st.get("outlier_pct", 0) > 10 else "Medium" if st.get("outlier_pct", 0) > 3 else "Low",
            "histogram": st.get("histogram", []),
        })
    result.sort(key=lambda x: x["outlier_pct"], reverse=True)
    return {"outliers": result}


@router.get("/{session_id}/forecast/{col}")
async def forecast_column(session_id: str, col: str, periods: int = 10):
    """Simple linear trend forecast for a numeric column"""
    s = get_session_data(session_id)
    rows = s["rows"]

    values = []
    for r in rows:
        try:
            v = float(r.get(col, ""))
            values.append(v)
        except (ValueError, TypeError):
            pass

    if len(values) < 5:
        raise HTTPException(400, f"Need at least 5 data points for forecasting. Column '{col}' has {len(values)}.")

    # Simple linear regression
    n = len(values)
    x = list(range(n))
    x_mean = sum(x) / n
    y_mean = sum(values) / n
    num = sum((x[i] - x_mean) * (values[i] - y_mean) for i in range(n))
    den = sum((x[i] - x_mean) ** 2 for i in range(n))
    slope = num / den if den != 0 else 0
    intercept = y_mean - slope * x_mean

    # Residuals for confidence interval
    residuals = [values[i] - (slope * x[i] + intercept) for i in range(n)]
    rmse = (sum(r**2 for r in residuals) / n) ** 0.5

    # Historical points (sample)
    historical = [{"x": i + 1, "y": round(values[i], 3), "type": "actual"} for i in range(min(n, 40))]

    # Forecast points
    forecast = []
    for i in range(periods):
        xi = n + i
        y_pred = slope * xi + intercept
        forecast.append({
            "x": xi + 1,
            "y": round(y_pred, 3),
            "y_upper": round(y_pred + 1.96 * rmse, 3),
            "y_lower": round(y_pred - 1.96 * rmse, 3),
            "type": "forecast"
        })

    trend_direction = "upward" if slope > 0.01 * abs(y_mean) else "downward" if slope < -0.01 * abs(y_mean) else "flat"

    return {
        "col": col,
        "historical": historical,
        "forecast": forecast,
        "slope": round(slope, 6),
        "intercept": round(intercept, 3),
        "rmse": round(rmse, 3),
        "r_squared": round(1 - sum(r**2 for r in residuals) / (sum((v - y_mean)**2 for v in values) or 1), 4),
        "trend_direction": trend_direction,
        "trend_pct_per_period": round((slope / abs(y_mean) * 100) if y_mean != 0 else 0, 2),
    }
