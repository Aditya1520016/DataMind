"""
Auto data cleaning service
Operations: deduplication, missing value imputation, whitespace trimming
"""

from typing import List, Dict, Tuple, Any


def auto_clean(
    rows: List[Dict],
    headers: List[str],
    stats: Dict[str, Any]
) -> Tuple[List[Dict], List[Dict]]:
    """
    Auto-clean dataset.
    Returns (cleaned_rows, clean_log)
    """
    cleaned = list(rows)
    log = []

    # 1. Remove exact duplicates
    seen = set()
    before = len(cleaned)
    deduped = []
    for row in cleaned:
        key = tuple(str(row.get(h, "")) for h in headers)
        if key not in seen:
            seen.add(key)
            deduped.append(row)
    cleaned = deduped
    removed = before - len(cleaned)
    if removed > 0:
        log.append({
            "action": "Removed duplicate rows",
            "count": removed,
            "color": "#EF4444",
            "severity": "warning"
        })

    # 2. Trim whitespace
    trimmed = 0
    for row in cleaned:
        for h in headers:
            if isinstance(row.get(h), str) and row[h] != row[h].strip():
                row[h] = row[h].strip()
                trimmed += 1
    if trimmed > 0:
        log.append({
            "action": "Trimmed whitespace",
            "count": trimmed,
            "color": "#3B82F6",
            "severity": "info"
        })

    # 3. Fill missing values
    filled = 0
    for row in cleaned:
        for h in headers:
            val = row.get(h, "")
            if val == "" or val is None:
                st = stats.get(h, {})
                if st.get("type") == "numeric":
                    imputed = str(st.get("mean", "0"))
                elif st.get("type") == "categorical":
                    imputed = st.get("mode") or "Unknown"
                else:
                    imputed = "Unknown"
                row[h] = imputed
                filled += 1
    if filled > 0:
        log.append({
            "action": "Filled missing values (mean/mode imputation)",
            "count": filled,
            "color": "#10B981",
            "severity": "info"
        })

    # 4. Standardize boolean-like values
    bool_map = {"yes": "Yes", "no": "No", "true": "True", "false": "False",
                "1.0": "1", "0.0": "0", "nan": "", "none": "", "null": "", "n/a": ""}
    standardized = 0
    for row in cleaned:
        for h in headers:
            v = row.get(h, "")
            lower = str(v).lower().strip()
            if lower in bool_map:
                new_v = bool_map[lower]
                if new_v != v:
                    row[h] = new_v
                    standardized += 1
    if standardized > 0:
        log.append({
            "action": "Standardized null/boolean values",
            "count": standardized,
            "color": "#8B5CF6",
            "severity": "info"
        })

    return cleaned, log
