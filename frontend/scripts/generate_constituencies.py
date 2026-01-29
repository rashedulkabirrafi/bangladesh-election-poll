import json
from pathlib import Path

import pandas as pd

ROOT = Path(__file__).resolve().parents[1]
XLSX_PATH = ROOT / "src" / "assets" / "Parliamentary_Constituency_Bengali.xlsx"
OUTPUT_PATH = ROOT / "src" / "assets" / "constituencies.json"


def main() -> None:
    if not XLSX_PATH.exists():
        raise SystemExit(f"Missing XLSX file: {XLSX_PATH}")

    df = pd.read_excel(XLSX_PATH)
    cols = list(df.columns)
    if len(cols) < 3:
        raise SystemExit("Expected at least three columns: division, district, constituency")

    rows = []
    for _, row in df.iterrows():
        division = str(row[cols[0]]).strip()
        district = str(row[cols[1]]).strip()
        constituency = str(row[cols[2]]).strip()
        if not division or not district or not constituency:
            continue
        if division == "nan" or district == "nan" or constituency == "nan":
            continue
        rows.append(
            {
                "division": division,
                "district": district,
                "constituency": constituency,
            }
        )

    OUTPUT_PATH.write_text(
        json.dumps(rows, ensure_ascii=False, indent=2), encoding="utf-8"
    )
    print(f"Wrote {len(rows)} rows to {OUTPUT_PATH}")


if __name__ == "__main__":
    main()
