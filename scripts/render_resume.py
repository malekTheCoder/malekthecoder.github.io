#!/usr/bin/env python3
"""Render assets/Malek_Swilam_Resume.pdf to one SVG per page, plus the link map.

The resume page shows these images rather than embedding the PDF itself. Mobile Safari and
Firefox render an embedded <object> PDF badly or not at all, and even where it works you get
the browser's viewer chrome instead of something that looks like a sheet of paper.

The catch is that rendering to SVG throws away the PDF's link annotations, so every URL on the
resume becomes dead pixels. pdftohtml can still see them, so their rectangles are extracted here
and written to links.json as percentages of the page; the page overlays a real anchor on each.

Run this after replacing the PDF:
    python3 scripts/render_resume.py
"""
import html
import json
import pathlib
import re
import shutil
import subprocess
import sys
import tempfile

ROOT = pathlib.Path(__file__).resolve().parent.parent
PDF = ROOT / "assets" / "Malek_Swilam_Resume.pdf"
OUT = ROOT / "assets" / "resume"

if not PDF.exists():
    sys.exit(f"no PDF at {PDF}")
for tool in ("pdftocairo", "pdftohtml", "pdfinfo"):
    if not shutil.which(tool):
        sys.exit(f"{tool} not found (brew install poppler)")

pages = int(subprocess.run(["pdfinfo", str(PDF)], capture_output=True, text=True)
            .stdout.split("Pages:")[1].split()[0])

for old in OUT.glob("page-*.svg"):
    old.unlink()

sizes = []
for n in range(1, pages + 1):
    dest = OUT / f"page-{n}.svg"
    subprocess.run(["pdftocairo", "-svg", "-f", str(n), "-l", str(n), str(PDF), str(dest)], check=True)
    head = dest.read_text(errors="ignore")[:400]
    w = re.search(r'width="([\d.]+)', head)
    h = re.search(r'height="([\d.]+)', head)
    sizes.append({"page": n,
                  "w": round(float(w.group(1))) if w else 612,
                  "h": round(float(h.group(1))) if h else 792})
    print(f"  page {n}: {dest.relative_to(ROOT)}  {sizes[-1]['w']}x{sizes[-1]['h']}")

# Link rectangles. pdftohtml reports them in its own pixel space, so each page's own
# width/height is used to convert to percentages rather than assuming a fixed scale.
links = {}
with tempfile.TemporaryDirectory() as tmp:
    subprocess.run(["pdftohtml", "-xml", "-i", "-q", str(PDF), f"{tmp}/out"], check=True)
    xml = pathlib.Path(f"{tmp}/out.xml").read_text(encoding="utf8", errors="ignore")

for pm in re.finditer(r'<page number="(\d+)"[^>]*height="(\d+)"[^>]*width="(\d+)"[^>]*>(.*?)</page>', xml, re.S):
    pno, ph, pw, body = int(pm.group(1)), float(pm.group(2)), float(pm.group(3)), pm.group(4)
    found = []
    for t in re.finditer(r'<text top="(\d+)" left="(\d+)" width="(\d+)" height="(\d+)"[^>]*>(.*?)</text>', body, re.S):
        top, left, w_, h_ = (float(t.group(i)) for i in range(1, 5))
        a = re.search(r'<a href="([^"]+)"[^>]*>(.*?)</a>', t.group(5), re.S)
        if not a:
            continue
        label = html.unescape(re.sub(r"<[^>]+>", "", a.group(2))).strip()
        found.append({
            "href": html.unescape(a.group(1)),
            "label": label,
            # a couple of points of padding so the target is not razor thin
            "left": round(max(0, left - 1) / pw * 100, 3),
            "top": round(max(0, top - 1) / ph * 100, 3),
            "width": round((w_ + 2) / pw * 100, 3),
            "height": round((h_ + 2) / ph * 100, 3),
        })
    if found:
        links[str(pno)] = found
        print(f"  page {pno}: {len(found)} link(s)")

(OUT / "pages.json").write_text(json.dumps(sizes, indent=2) + "\n")
(OUT / "links.json").write_text(json.dumps(links, indent=2) + "\n")
print(f"  {pages} page(s), {sum(len(v) for v in links.values())} link(s) mapped")
