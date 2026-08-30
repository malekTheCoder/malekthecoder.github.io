#!/usr/bin/env python3
"""Render assets/Malek_Swilam_Resume.pdf to one SVG per page in assets/resume/.

The resume page shows these images rather than embedding the PDF itself. Mobile Safari and
Firefox render an embedded <object> PDF badly or not at all, and even where it works you get
the browser's viewer chrome instead of something that looks like a sheet of paper. SVG stays
crisp at any zoom and renders identically everywhere.

Run this after replacing the PDF:
    python3 scripts/render_resume.py
"""
import json
import pathlib
import re
import shutil
import subprocess
import sys

ROOT = pathlib.Path(__file__).resolve().parent.parent
PDF = ROOT / "assets" / "Malek_Swilam_Resume.pdf"
OUT = ROOT / "assets" / "resume"

if not PDF.exists():
    sys.exit(f"no PDF at {PDF}")
if not shutil.which("pdftocairo"):
    sys.exit("pdftocairo not found (brew install poppler)")

pages = int(subprocess.run(["pdfinfo", str(PDF)], capture_output=True, text=True)
            .stdout.split("Pages:")[1].split()[0])

for old in OUT.glob("page-*.svg"):
    old.unlink()

sizes = []
for n in range(1, pages + 1):
    dest = OUT / f"page-{n}.svg"
    subprocess.run(["pdftocairo", "-svg", "-f", str(n), "-l", str(n), str(PDF), str(dest)],
                   check=True)
    head = dest.read_text(errors="ignore")[:400]
    w = re.search(r'width="([\d.]+)', head)
    h = re.search(r'height="([\d.]+)', head)
    sizes.append({"page": n,
                  "w": round(float(w.group(1))) if w else 612,
                  "h": round(float(h.group(1))) if h else 792})
    print(f"  page {n}: {dest.relative_to(ROOT)}  {sizes[-1]['w']}x{sizes[-1]['h']}")

(OUT / "pages.json").write_text(json.dumps(sizes, indent=2) + "\n")
print(f"  {pages} page(s) rendered")
