"""
File parser service
Handles CSV (.csv) and Excel (.xlsx, .xls) parsing
Returns: headers (list), rows (list of dicts), sheet_names (list)
"""

import io
import csv
from typing import Tuple, List, Dict, Optional


def parse_file(
    contents: bytes,
    ext: str,
    filename: str
) -> Tuple[List[str], List[Dict], List[str]]:
    """
    Parse CSV or Excel file into headers + rows.
    Returns (headers, rows, sheet_names)
    """
    if ext == ".csv":
        return parse_csv(contents)
    elif ext in (".xlsx", ".xls"):
        return parse_excel(contents, ext)
    else:
        raise ValueError(f"Unsupported extension: {ext}")


def parse_csv(contents: bytes) -> Tuple[List[str], List[Dict], List[str]]:
    """Parse CSV bytes into headers + rows"""
    # Try multiple encodings
    text = None
    for encoding in ["utf-8", "utf-8-sig", "latin-1", "cp1252"]:
        try:
            text = contents.decode(encoding)
            break
        except UnicodeDecodeError:
            continue

    if text is None:
        raise ValueError("Could not decode CSV file. Please ensure it's UTF-8 or Latin-1 encoded.")

    # Detect delimiter
    sample = text[:4096]
    try:
        dialect = csv.Sniffer().sniff(sample, delimiters=",;\t|")
        delimiter = dialect.delimiter
    except csv.Error:
        delimiter = ","

    reader = csv.DictReader(io.StringIO(text), delimiter=delimiter)

    headers = [h.strip().replace("\ufeff", "") for h in (reader.fieldnames or [])]
    if not headers:
        raise ValueError("CSV has no headers.")

    rows = []
    for row in reader:
        clean_row = {h: str(row.get(h, "") or "").strip() for h in headers}
        rows.append(clean_row)

    if not rows:
        raise ValueError("CSV has no data rows.")

    return headers, rows, ["Sheet1"]


def parse_excel(contents: bytes, ext: str) -> Tuple[List[str], List[Dict], List[str]]:
    """Parse Excel file using openpyxl (xlsx) or xlrd (xls)"""
    if ext == ".xlsx":
        return _parse_xlsx(contents)
    else:
        return _parse_xls(contents)


def _parse_xlsx(contents: bytes) -> Tuple[List[str], List[Dict], List[str]]:
    """Parse .xlsx using openpyxl"""
    try:
        import openpyxl
    except ImportError:
        raise ImportError("openpyxl is required for Excel support. Run: pip install openpyxl")

    wb = openpyxl.load_workbook(io.BytesIO(contents), read_only=True, data_only=True)
    sheet_names = wb.sheetnames

    # Use first sheet
    ws = wb.active

    rows_raw = []
    for row in ws.iter_rows(values_only=True):
        rows_raw.append(row)

    if not rows_raw:
        raise ValueError("Excel file is empty.")

    # Find header row (first non-empty row)
    header_row_idx = 0
    for i, row in enumerate(rows_raw):
        if any(cell is not None and str(cell).strip() for cell in row):
            header_row_idx = i
            break

    headers = [
        str(cell).strip() if cell is not None else f"Column_{ci}"
        for ci, cell in enumerate(rows_raw[header_row_idx])
        if cell is not None or ci < 5
    ]
    # Remove empty trailing headers
    while headers and (not headers[-1] or headers[-1].startswith("Column_")):
        headers.pop()

    if not headers:
        raise ValueError("Could not find headers in Excel file.")

    rows = []
    for raw_row in rows_raw[header_row_idx + 1:]:
        row_dict = {}
        empty = True
        for ci, h in enumerate(headers):
            val = raw_row[ci] if ci < len(raw_row) else None
            str_val = "" if val is None else str(val).strip()
            if str_val:
                empty = False
            row_dict[h] = str_val
        if not empty:
            rows.append(row_dict)

    wb.close()
    return headers, rows, sheet_names


def _parse_xls(contents: bytes) -> Tuple[List[str], List[Dict], List[str]]:
    """Parse .xls using xlrd"""
    try:
        import xlrd
    except ImportError:
        raise ImportError("xlrd is required for .xls support. Run: pip install xlrd")

    wb = xlrd.open_workbook(file_contents=contents)
    sheet_names = wb.sheet_names()
    ws = wb.sheet_by_index(0)

    if ws.nrows < 2:
        raise ValueError("Excel file has insufficient data.")

    headers = [str(ws.cell_value(0, ci)).strip() or f"Column_{ci}" for ci in range(ws.ncols)]

    rows = []
    for ri in range(1, ws.nrows):
        row_dict = {}
        empty = True
        for ci, h in enumerate(headers):
            val = ws.cell_value(ri, ci)
            str_val = str(val).strip() if val != "" else ""
            # Handle xlrd date values
            if ws.cell_type(ri, ci) == xlrd.XL_CELL_DATE:
                import datetime
                try:
                    dt = xlrd.xldate_as_datetime(val, wb.datemode)
                    str_val = dt.strftime("%Y-%m-%d")
                except Exception:
                    pass
            if str_val:
                empty = False
            row_dict[h] = str_val
        if not empty:
            rows.append(row_dict)

    return headers, rows, sheet_names
