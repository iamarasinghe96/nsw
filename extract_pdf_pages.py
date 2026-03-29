#!/usr/bin/env python3
"""
extract_pdf_pages.py
────────────────────
Converts every PDF in a folder to per-page PNGs, organised into subfolders
named after the PDF (catalogue-slug).

Output structure:
  _extracted/
    45061655-driving-instructor-licence-app/
      page_01.png
      page_02.png
    45062462-driving-instructor-mutual-recognition/
      page_01.png
      ...

Dependencies:
  pip install pymupdf

Usage:
  python extract_pdf_pages.py
  python extract_pdf_pages.py --input "D:/My Forms" --dpi 180
"""

import argparse
import sys
from pathlib import Path

try:
    import fitz  # pymupdf
except ImportError:
    sys.exit("pymupdf not installed. Run: pip install pymupdf")


# ── Config ────────────────────────────────────────────────────────────────────

DEFAULT_INPUT = r"D:\Downloads\NSW Forms\Attempt 2\Service_NSW_Forms"
DEFAULT_DPI   = 200   # 200 DPI — sharp enough for Claude vision, ~200-400 KB/page
                      # Drop to 150 if you want smaller files (still readable)

# ── Core ──────────────────────────────────────────────────────────────────────

def extract_pdf(pdf_path: Path, out_dir: Path, dpi: int) -> int:
    """Render every page of pdf_path to PNG files inside out_dir.
    Returns the number of pages extracted."""
    out_dir.mkdir(parents=True, exist_ok=True)
    matrix = fitz.Matrix(dpi / 72, dpi / 72)  # 72 pt = 1 inch in PDF space

    doc = fitz.open(str(pdf_path))
    try:
        for i, page in enumerate(doc, start=1):
            pix = page.get_pixmap(matrix=matrix, colorspace=fitz.csRGB)
            out_path = out_dir / f"page_{i:02d}.png"
            pix.save(str(out_path))
            kb = out_path.stat().st_size // 1024
            print(f"    page_{i:02d}.png  ({kb} KB)")
    finally:
        doc.close()

    return len(doc)


def main():
    parser = argparse.ArgumentParser(description="Extract PDF pages to PNG")
    parser.add_argument("--input",  default=DEFAULT_INPUT,
                        help="Folder containing PDF files")
    parser.add_argument("--output", default=None,
                        help="Output root (default: <input>/_extracted)")
    parser.add_argument("--dpi",    type=int, default=DEFAULT_DPI,
                        help="Render resolution (default: 200)")
    args = parser.parse_args()

    input_dir  = Path(args.input)
    output_dir = Path(args.output) if args.output else input_dir / "_extracted"

    if not input_dir.exists():
        sys.exit(f"Input folder not found: {input_dir}")

    pdfs = sorted(input_dir.glob("*.pdf"))
    if not pdfs:
        sys.exit(f"No PDF files found in: {input_dir}")

    output_dir.mkdir(parents=True, exist_ok=True)

    print(f"Input  : {input_dir}")
    print(f"Output : {output_dir}")
    print(f"DPI    : {args.dpi}")
    print(f"PDFs   : {len(pdfs)} found\n")
    print("─" * 60)

    ok = fail = 0
    for pdf_path in pdfs:
        form_key = pdf_path.stem   # e.g. "45062462-driving-instructor-mutual-recognition"
        out_dir  = output_dir / form_key

        print(f"\n{pdf_path.name}")
        try:
            n = extract_pdf(pdf_path, out_dir, args.dpi)
            print(f"  ✓  {n} page(s) → {form_key}/")
            ok += 1
        except Exception as e:
            print(f"  ✗  ERROR: {e}")
            fail += 1

    print("\n" + "─" * 60)
    print(f"Done.  {ok} succeeded,  {fail} failed.")
    print(f"Output: {output_dir}")


if __name__ == "__main__":
    main()
