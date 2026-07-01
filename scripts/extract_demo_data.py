"""Extract ICD and model rows from database/Dump20260629.sql into JSON for demo mode."""
import json
import re
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
SQL_PATH = ROOT / "database" / "Dump20260629.sql"
OUT_DIR = ROOT / "lib" / "data" / "demo"


def split_sql_values(values_str: str) -> list[str]:
    rows: list[str] = []
    current: list[str] = []
    in_string = False
    escape = False
    paren_depth = 0

    for ch in values_str:
        if escape:
            current.append(ch)
            escape = False
            continue
        if ch == "\\" and in_string:
            escape = True
            current.append(ch)
            continue
        if ch == "'":
            in_string = not in_string
            current.append(ch)
            continue
        if not in_string:
            if ch == "(":
                if paren_depth == 0:
                    current = ["("]
                else:
                    current.append(ch)
                paren_depth += 1
                continue
            if ch == ")":
                paren_depth -= 1
                current.append(ch)
                if paren_depth == 0:
                    rows.append("".join(current))
                    current = []
                continue
        current.append(ch)
    return rows


def parse_row(row_str: str) -> list[str | None]:
    inner = row_str.strip()[1:-1]
    fields: list[str | None] = []
    buf: list[str] = []
    in_string = False
    escape = False

    for ch in inner:
        if escape:
            buf.append(ch)
            escape = False
            continue
        if ch == "\\" and in_string:
            escape = True
            continue
        if ch == "'":
            in_string = not in_string
            continue
        if ch == "," and not in_string:
            token = "".join(buf).strip()
            fields.append(None if token.upper() == "NULL" else token)
            buf = []
            continue
        buf.append(ch)

    token = "".join(buf).strip()
    fields.append(None if token.upper() == "NULL" else token)
    return fields


def extract_insert(table: str) -> list[list[str | None]]:
    content = SQL_PATH.read_text(encoding="utf-8", errors="replace")
    pattern = rf"INSERT INTO `{table}` VALUES\s*(.+?);"
    match = re.search(pattern, content, re.DOTALL | re.IGNORECASE)
    if not match:
        return []
    return [parse_row(r) for r in split_sql_values(match.group(1))]


def main() -> None:
    OUT_DIR.mkdir(parents=True, exist_ok=True)

    icd_rows = extract_insert("icd")
    icd_items = [
        {
            "id": (row[0] or "").strip(),
            "use": int(row[1] or 0),
            "enName": (row[2] or "").strip(),
            "zhName": (row[3] or "").strip(),
        }
        for row in icd_rows
        if row and row[0]
    ]

    model_rows = extract_insert("model")
    model_items = [
        {
            "ersbkey": int("".join(ch for ch in (row[1] or row[0] or "0") if ch.isdigit()) or "0"),
            "name": (row[1] or "").strip(),
            "department": (row[2] or "").strip(),
            "chiefComplaint": (row[3] or "").strip(),
            "presentIllness": (row[4] or "").strip(),
            "pastHistory": (row[5] or "").strip(),
            "generalCondition": (row[6] or "").strip(),
            "heent": (row[7] or "").strip(),
            "neck": (row[8] or "").strip(),
            "chestAndLungs": (row[9] or "").strip(),
            "abdomen": (row[10] or "").strip(),
            "backAndSpine": (row[11] or "").strip(),
            "exogenitalia": (row[12] or "").strip(),
            "rectalExam": (row[13] or "").strip(),
            "extremities": (row[14] or "").strip(),
            "neurologicalExam": (row[15] or "").strip(),
            "doctorId": (row[18] or "").strip(),
        }
        for row in model_rows
        if row and row[2]
    ]

    (OUT_DIR / "icd.json").write_text(
        json.dumps(icd_items, ensure_ascii=False, indent=2), encoding="utf-8"
    )
    (OUT_DIR / "model.json").write_text(
        json.dumps(model_items, ensure_ascii=False, indent=2), encoding="utf-8"
    )
    print(f"icd: {len(icd_items)}, model: {len(model_items)}")


if __name__ == "__main__":
    main()
