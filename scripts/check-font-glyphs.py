"""Verify the sample text's non-ASCII glyphs in committed WOFF2 assets."""
from __future__ import annotations

import json
from pathlib import Path
from fontTools.ttLib import TTFont

ROOT = Path(__file__).resolve().parent.parent
TARGET = "äöüÄÖÜß«»"
FAMILIES = {
    "Libre Baskerville": ROOT / "public/fonts/google/libre-baskerville",
    "EB Garamond": ROOT / "public/fonts/google/eb-garamond",
    "Cormorant": ROOT / "public/fonts/google/cormorant",
    "Inter": ROOT / "public/fonts/google/inter",
    "Montserrat": ROOT / "public/fonts/google/montserrat",
    "Lato": ROOT / "public/fonts/google/lato",
    "Oswald": ROOT / "public/fonts/google/oswald",
    "Outfit": ROOT / "public/fonts/google/outfit",
    "Pretendard": ROOT / "public/fonts/pretendard",
    "Wanted Sans": ROOT / "public/fonts/wanted-sans",
    "열린명조": ROOT / "public/fonts/yeolrin",
    "열린고딕": ROOT / "public/fonts/yeolrin",
}

def coverage(directory: Path, matching: str | None = None) -> dict[str, object]:
    files = sorted(directory.glob("*.woff2"))
    if matching:
        files = [path for path in files if matching in path.name]
    characters: set[int] = set()
    for path in files:
        font = TTFont(path, lazy=True)
        characters.update(codepoint for table in font["cmap"].tables if table.isUnicode() for codepoint in table.cmap)
        font.close()
    return {"files": [str(path.relative_to(ROOT)).replace("\\", "/") for path in files], "missing": [character for character in TARGET if ord(character) not in characters]}

results = {family: coverage(directory, "Myeongjo" if family == "열린명조" else "Gothic" if family == "열린고딕" else None) for family, directory in FAMILIES.items()}
(ROOT / "public/fonts/GLYPH-COVERAGE.json").write_text(json.dumps({"characters": TARGET, "families": results}, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
expected_missing = {"열린명조", "열린고딕"}
unexpected = [family for family, result in results.items() if result["missing"] and family not in expected_missing]
print("Glyph coverage report written; unexpected missing families:", len(unexpected))
if unexpected:
    raise SystemExit("A font family without an explicit fallback lacks required sample glyphs.")
