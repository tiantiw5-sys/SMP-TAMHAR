#!/usr/bin/env python3
"""Import semua sheet dari Excel daftar siswa → initialStudents.ts"""

from __future__ import annotations

import json
import re
from pathlib import Path

import pandas as pd

EXCEL = Path(r"C:\Users\tiant\Downloads\8355 kelas 8_2526.xls")
# Data asli sekarang hidup di Supabase (tabel `students`), bukan di source
# code — skrip ini sekarang hanya dipakai untuk generate file JSON mentah
# (di luar src/, tidak ikut ter-bundle) yang lalu diimpor manual ke Supabase.
OUT_JSON = Path(__file__).resolve().parents[1] / "private-student-data" / "students-kelas8-2526-full.json"


def parse_sheet(df: pd.DataFrame) -> list[dict]:
    students: list[dict] = []
    current_class = ""
    for _, row in df.iterrows():
        c0 = str(row[0]).strip() if pd.notna(row[0]) else ""
        if c0.startswith("KELAS VIII"):
            current_class = c0.replace("KELAS ", "").strip()
            continue
        if not c0.isdigit():
            continue
        if pd.isna(row[1]) or pd.isna(row[3]):
            continue
        nis = str(row[1]).strip()
        gender_raw = str(row[4]).strip() if pd.notna(row[4]) else "L"
        students.append(
            {
                "id": nis,
                "nis": nis,
                "nisn": str(row[2]).strip() if pd.notna(row[2]) else "",
                "name": str(row[3]).strip(),
                "className": current_class,
                "gender": "P" if gender_raw.upper().startswith("P") else "L",
                "schoolYear": "2025/2026",
                "active": True,
            }
        )
    return students


def main() -> None:
    if not EXCEL.exists():
        raise SystemExit(f"File tidak ditemukan: {EXCEL}")

    all_students: list[dict] = []
    xl = pd.ExcelFile(EXCEL)
    for sheet in xl.sheet_names:
        df = pd.read_excel(EXCEL, sheet_name=sheet, header=None)
        all_students.extend(parse_sheet(df))

    OUT_JSON.parent.mkdir(parents=True, exist_ok=True)
    OUT_JSON.write_text(json.dumps(all_students, ensure_ascii=False, indent=2), encoding="utf-8")
    print(f"Ditulis ke {OUT_JSON} — import isinya ke tabel `students` di Supabase secara manual, JANGAN ditaruh di src/.")

    from collections import Counter

    counts = Counter(s["className"] for s in all_students)
    print(json.dumps({"total": len(all_students), "per_class": dict(counts), "sheets": xl.sheet_names}, indent=2))


if __name__ == "__main__":
    main()