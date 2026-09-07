"""
Full statistical analysis engine
Computes: type detection, descriptive stats, correlations, quality score
"""

import math
import statistics
from typing import List, Dict, Any, Tuple
import re


def full_analysis(headers: List[str], rows: List[Dict]) -> Dict[str, Any]:
    stats = {}
    num_cols = []
    cat_cols = []
    date_cols = []

    for col in headers:
        values = [r.get(col, "") for r in rows]
        non_empty = [v for v in values if v != "" and v is not None]

        if not non_empty:
            stats[col] = {"type": "empty", "count": 0, "missing": len(rows)}
            cat_cols.append(col)
            continue

        # Try numeric
        nums = []
        for v in non_empty:
            try:
                f = float(str(v).replace(",", "").replace("$", "").replace("%", ""))
                nums.append(f)
            except (ValueError, TypeError):
                pass

        numeric_ratio = len(nums) / len(non_empty)

        # Try date
        date_pattern = re.compile(
            r"\d{4}[-/]\d{2}[-/]\d{2}|\d{2}[-/]\d{2}[-/]\d{4}|\d{4}-\d{2}|\b(Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)\b",
            re.IGNORECASE
        )
        is_date = numeric_ratio < 0.7 and any(date_pattern.search(str(v)) for v in non_empty[:20])

        missing = len(rows) - len(non_empty)

        if numeric_ratio >= 0.7 and len(nums) > 0:
            num_cols.append(col)
            stats[col] = compute_numeric_stats(col, nums, missing)

        elif is_date:
            date_cols.append(col)
            stats[col] = {
                "type": "date",
                "count": len(non_empty),
                "missing": missing,
                "unique": len(set(non_empty)),
                "sample": non_empty[:5],
            }
        else:
            cat_cols.append(col)
            stats[col] = compute_categorical_stats(col, non_empty, missing)

    # Pearson correlations
    correlations = compute_correlations(rows, num_cols)

    # Data quality score
    total_cells = len(rows) * len(headers)
    missing_cells = sum(st.get("missing", 0) for st in stats.values())
    dupes = compute_duplicates(rows)
    outlier_cells = sum(st.get("outlier_count", 0) for st in stats.values() if st.get("type") == "numeric")

    quality_score = max(0, round(
        100
        - (missing_cells / max(total_cells, 1)) * 40
        - (dupes / max(len(rows), 1)) * 30
        - (outlier_cells / max(total_cells, 1)) * 30
    ))

    return {
        "stats": stats,
        "num_cols": num_cols,
        "cat_cols": cat_cols,
        "date_cols": date_cols,
        "correlations": correlations,
        "quality_score": quality_score,
        "dupes": dupes,
        "missing_cells": missing_cells,
        "outlier_cells": outlier_cells,
        "total_cells": total_cells,
        "row_count": len(rows),
    }


def compute_numeric_stats(col: str, nums: List[float], missing: int) -> Dict:
    n = len(nums)
    sorted_nums = sorted(nums)
    mean = sum(nums) / n
    variance = sum((v - mean) ** 2 for v in nums) / n
    std = math.sqrt(variance)

    q1_idx = max(0, int(n * 0.25))
    q3_idx = min(n - 1, int(n * 0.75))
    q1 = sorted_nums[q1_idx]
    q3 = sorted_nums[q3_idx]
    iqr = q3 - q1
    lower_fence = q1 - 1.5 * iqr
    upper_fence = q3 + 1.5 * iqr

    outliers = [v for v in nums if v < lower_fence or v > upper_fence]

    # Histogram
    if sorted_nums[-1] != sorted_nums[0]:
        bucket_count = min(10, max(3, int(math.sqrt(n))))
        bw = (sorted_nums[-1] - sorted_nums[0]) / bucket_count
        histogram = []
        for i in range(bucket_count):
            lo = sorted_nums[0] + i * bw
            hi = lo + bw
            count = sum(1 for v in nums if lo <= v < hi)
            histogram.append({"range": f"{lo:.1f}", "count": count})
    else:
        histogram = [{"range": str(sorted_nums[0]), "count": n}]

    # Skewness (Pearson's second)
    skewness = 3 * (mean - sorted_nums[n // 2]) / (std or 1)

    cv = std / abs(mean) if mean != 0 else 0

    return {
        "type": "numeric",
        "count": n,
        "missing": missing,
        "mean": round(mean, 4),
        "median": sorted_nums[n // 2],
        "std": round(std, 4),
        "min": sorted_nums[0],
        "max": sorted_nums[-1],
        "q1": round(q1, 4),
        "q3": round(q3, 4),
        "iqr": round(iqr, 4),
        "sum": round(sum(nums), 4),
        "outlier_count": len(outliers),
        "outlier_pct": round(len(outliers) / n * 100, 2),
        "skewness": round(skewness, 4),
        "cv": round(cv, 4),
        "histogram": histogram,
        "lower_fence": round(lower_fence, 4),
        "upper_fence": round(upper_fence, 4),
    }


def compute_categorical_stats(col: str, values: List[str], missing: int) -> Dict:
    freq: Dict[str, int] = {}
    for v in values:
        freq[v] = freq.get(v, 0) + 1

    top = sorted(freq.items(), key=lambda x: x[1], reverse=True)
    n = len(values)

    # Shannon entropy
    entropy = 0.0
    for _, count in top:
        p = count / n
        if p > 0:
            entropy -= p * math.log2(p)

    return {
        "type": "categorical",
        "count": n,
        "missing": missing,
        "unique": len(top),
        "mode": top[0][0] if top else None,
        "top_values": [[v, c] for v, c in top[:12]],
        "entropy": round(entropy, 3),
    }


def compute_correlations(rows: List[Dict], num_cols: List[str]) -> Dict[str, Dict[str, float]]:
    """Compute Pearson correlation matrix"""
    # Extract numeric arrays
    arrays: Dict[str, List[float]] = {}
    for col in num_cols:
        arr = []
        for r in rows:
            try:
                arr.append(float(r.get(col, "")))
            except (ValueError, TypeError):
                arr.append(None)
        arrays[col] = arr

    corr = {}
    for c1 in num_cols:
        corr[c1] = {}
        for c2 in num_cols:
            if c1 == c2:
                corr[c1][c2] = 1.0
                continue
            a1 = arrays[c1]
            a2 = arrays[c2]
            # Pair-wise valid
            pairs = [(x, y) for x, y in zip(a1, a2) if x is not None and y is not None]
            if len(pairs) < 3:
                corr[c1][c2] = 0.0
                continue
            xs, ys = zip(*pairs)
            n = len(xs)
            mx = sum(xs) / n
            my = sum(ys) / n
            num = sum((x - mx) * (y - my) for x, y in zip(xs, ys))
            dx = math.sqrt(sum((x - mx) ** 2 for x in xs))
            dy = math.sqrt(sum((y - my) ** 2 for y in ys))
            corr[c1][c2] = round(num / (dx * dy), 4) if dx * dy != 0 else 0.0

    return corr


def compute_duplicates(rows: List[Dict]) -> int:
    seen = set()
    dupes = 0
    for row in rows:
        key = tuple(sorted(row.items()))
        if key in seen:
            dupes += 1
        seen.add(key)
    return dupes
