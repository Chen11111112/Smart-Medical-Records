"""Extract JSON blocks from docs/fake_data.md into lib/data/demo/."""
import json
import re
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
MD_PATH = ROOT / "docs" / "fake_data.md"
OUT_DIR = ROOT / "lib" / "data" / "demo"


def extract_blocks() -> dict[str, str]:
    content = MD_PATH.read_text(encoding="utf-8")
    sections = {
        "patientSession": r"\[home\].*?```\s*\n(.*?)\n```",
        "spHistory": r"\[過去病歷\].*?```\s*\n(.*?)\n```",
        "vitalSigns": r"\[生命徵象\].*?```\s*\n(.*?)\n```",
        "aiChiefComplaint": r"### 主敘推論\s*\n```\s*\n(.*?)\n```",
        "aiIcd": r"### ICD診斷建議\s*\n```\s*\n(.*?)\n```",
        "aiHistorySummary": r"### 歷程記錄摘要\s*\n```\s*\n(.*?)\n```",
        "aiCurrentAssessment": r"### 本次病況AI診斷推論\s*\n```\s*\n(.*?)\n```",
        "aiAdmission": r"### 轉住院AI生成病歷\s*\n```\s*\n(.*?)\n```",
    }
    result = {}
    for name, pattern in sections.items():
        m = re.search(pattern, content, re.DOTALL)
        if m:
            result[name] = m.group(1).strip()
    return result


def main() -> None:
    OUT_DIR.mkdir(parents=True, exist_ok=True)
    blocks = extract_blocks()
    for name, raw in blocks.items():
        data = json.loads(raw)
        (OUT_DIR / f"{name}.json").write_text(
            json.dumps(data, ensure_ascii=False, indent=2), encoding="utf-8"
        )
        print(f"wrote {name}.json")


if __name__ == "__main__":
    main()
