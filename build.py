#!/usr/bin/env python3
"""
Builds the site's pages from _src/.

The nav, <head> and footer live in ONE place (_src/head_nav.html and
_src/footer.html). Each page is just a list of section files plus its own
title/description. Change the nav once, re-run this, every page updates.

    python3 build.py

Outputs a single index.html. The nav, <head> and footer still live in one
place, so editing them once updates the page.
"""

from pathlib import Path

ROOT = Path(__file__).parent
SRC = ROOT / "_src"
SITE = "https://malekswilam.dev"

HEAD = (SRC / "head_nav.html").read_text()
FOOT = (SRC / "footer.html").read_text()


def section(name: str) -> str:
    return (SRC / "sections" / f"{name}.html").read_text()


# page slug -> (output path, sections, <title>, meta description, og:title)
PAGES = {
    "home": (
        "index.html",
        ["home", "about", "experience", "projects", "skills", "education", "contact"],
        "Malek Swilam",
        "Malek Swilam is a Computer Engineering student at George Mason University's "
        "Honors College specializing in machine learning, computer vision, and robotics. "
        "Eagle Scout, ML researcher, and FTC programming lead.",
        "Malek Swilam \u00b7 Computer Engineering @ GMU",
    ),
}


def build() -> None:
    for slug, (out, sections, title, desc, og_title) in PAGES.items():
        canonical = SITE + "/" + ("" if out == "index.html" else out.replace("index.html", ""))
        head = (HEAD.replace("{{TITLE}}", title)
                    .replace("{{DESCRIPTION}}", desc)
                    .replace("{{CANONICAL}}", canonical)
                    .replace("{{OG_TITLE}}", og_title))
        body = "\n\n".join(section(s) for s in sections)
        page = f"{head}\n{body}\n\n{FOOT}"

        dest = ROOT / out
        dest.parent.mkdir(parents=True, exist_ok=True)
        dest.write_text(page)
        print(f"  {out:<26} {len(page.splitlines()):>4} lines   "
              f"sections: {', '.join(sections)}")


if __name__ == "__main__":
    print("building:")
    build()
    print("\ndone. preview with:  python3 -m http.server 3456")
