#!/usr/bin/env python3
"""
download_forms.py — Download all PDFs from the Service NSW forms page.

Usage:
    pip install requests beautifulsoup4
    python3 download_forms.py

PDFs are saved to ./pdfs/ with their original filenames.
A manifest (pdfs/manifest.json) is written with name, url, filename, category.
"""

import os
import re
import json
import time
import hashlib
import urllib.parse

import requests
from bs4 import BeautifulSoup

BASE_URL = "https://www.service.nsw.gov.au"
FORMS_URL = "https://www.service.nsw.gov.au/guide/forms-in-pdf-format"
OUTPUT_DIR = "pdfs"
MANIFEST_FILE = os.path.join(OUTPUT_DIR, "manifest.json")

HEADERS = {
    "User-Agent": (
        "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) "
        "AppleWebKit/537.36 (KHTML, like Gecko) "
        "Chrome/124.0.0.0 Safari/537.36"
    ),
    "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
    "Accept-Language": "en-AU,en;q=0.9",
    "Referer": "https://www.service.nsw.gov.au/",
}

# Delay between downloads (seconds) — be polite to the server
DOWNLOAD_DELAY = 1.0


def slugify(text):
    """Convert text to a safe filename slug."""
    text = text.lower().strip()
    text = re.sub(r"[^\w\s-]", "", text)
    text = re.sub(r"[\s_-]+", "-", text)
    return text[:80]


def get_filename_from_url(url, fallback_name="form"):
    """Extract filename from URL, falling back to a slugified name."""
    path = urllib.parse.urlparse(url).path
    name = os.path.basename(path)
    if name.lower().endswith(".pdf"):
        return name
    return slugify(fallback_name) + ".pdf"


def get_filename_from_response(resp, fallback):
    """Try to get filename from Content-Disposition header."""
    cd = resp.headers.get("Content-Disposition", "")
    match = re.search(r'filename[^;=\n]*=\s*["\']?([^"\';\n]+)', cd, re.IGNORECASE)
    if match:
        return match.group(1).strip().strip('"\'')
    return fallback


def scrape_links(session):
    """Fetch the forms page and extract all PDF links with context."""
    print(f"Fetching {FORMS_URL} …")
    resp = session.get(FORMS_URL, headers=HEADERS, timeout=30)
    resp.raise_for_status()

    soup = BeautifulSoup(resp.text, "html.parser")
    forms = []

    # Walk through the page, collecting h2/h3 headings as category names
    # and <a href="*.pdf"> links as form entries.
    current_category = "General"

    for el in soup.find_all(["h2", "h3", "h4", "a", "li"]):
        tag = el.name

        # Track category from headings
        if tag in ("h2", "h3", "h4"):
            text = el.get_text(strip=True)
            if text:
                current_category = text

        # Collect PDF links
        if tag == "a":
            href = el.get("href", "")
            text = el.get_text(strip=True)

            # Match direct .pdf links or links that look like form downloads
            if href.lower().endswith(".pdf") or "/forms/" in href.lower() or "pdf" in href.lower():
                # Make absolute
                if href.startswith("http"):
                    full_url = href
                else:
                    full_url = urllib.parse.urljoin(BASE_URL, href)

                if not text:
                    text = get_filename_from_url(full_url)

                forms.append({
                    "name": text,
                    "url": full_url,
                    "category": current_category,
                    "filename": None,  # filled after download
                })

    # Deduplicate by URL
    seen = set()
    unique_forms = []
    for f in forms:
        if f["url"] not in seen:
            seen.add(f["url"])
            unique_forms.append(f)

    print(f"Found {len(unique_forms)} PDF links.")
    return unique_forms


def download_pdf(session, form_entry, output_dir):
    """Download a single PDF. Returns the saved filename or None on failure."""
    url = form_entry["url"]
    fallback_name = get_filename_from_url(url, form_entry["name"])

    try:
        resp = session.get(url, headers=HEADERS, timeout=60, stream=True)
        resp.raise_for_status()

        filename = get_filename_from_response(resp, fallback_name)
        # Ensure .pdf extension
        if not filename.lower().endswith(".pdf"):
            filename += ".pdf"

        # Sanitise filename
        filename = re.sub(r'[\\/:*?"<>|]', "_", filename)

        filepath = os.path.join(output_dir, filename)

        # If a file with the same name exists, check size to avoid re-downloading
        if os.path.exists(filepath):
            content_length = resp.headers.get("Content-Length")
            if content_length and os.path.getsize(filepath) == int(content_length):
                print(f"  ✓ Already downloaded: {filename}")
                return filename

        with open(filepath, "wb") as f:
            for chunk in resp.iter_content(chunk_size=65536):
                if chunk:
                    f.write(chunk)

        size_kb = os.path.getsize(filepath) // 1024
        print(f"  ↓ {filename} ({size_kb} KB)")
        return filename

    except requests.HTTPError as e:
        print(f"  ✗ HTTP {e.response.status_code}: {url}")
    except Exception as e:
        print(f"  ✗ Error downloading {url}: {e}")

    return None


def main():
    os.makedirs(OUTPUT_DIR, exist_ok=True)

    session = requests.Session()
    # First hit the main site to get any session cookies
    session.get(BASE_URL, headers=HEADERS, timeout=15)

    forms = scrape_links(session)

    if not forms:
        print("\nNo PDF links found. The page structure may have changed.")
        print("Try opening the page in a browser, saving as HTML, then running:")
        print("  python3 download_forms.py --local saved_page.html")
        return

    print(f"\nDownloading {len(forms)} PDFs to ./{OUTPUT_DIR}/\n")

    manifest = []
    for i, form in enumerate(forms, 1):
        print(f"[{i}/{len(forms)}] {form['name'][:60]}")
        filename = download_pdf(session, form, OUTPUT_DIR)
        manifest.append({
            "name": form["name"],
            "url": form["url"],
            "category": form["category"],
            "filename": filename,
            "downloaded": filename is not None,
        })
        if i < len(forms):
            time.sleep(DOWNLOAD_DELAY)

    # Write manifest
    with open(MANIFEST_FILE, "w", encoding="utf-8") as f:
        json.dump(manifest, f, indent=2, ensure_ascii=False)

    ok = sum(1 for m in manifest if m["downloaded"])
    print(f"\nDone. {ok}/{len(manifest)} PDFs downloaded to ./{OUTPUT_DIR}/")
    print(f"Manifest written to {MANIFEST_FILE}")


# ---------------------------------------------------------------------------
# Optional: run with --local <html_file> to parse a locally saved HTML page
# (useful when the site blocks automated requests)
# ---------------------------------------------------------------------------
if __name__ == "__main__":
    import sys

    if "--local" in sys.argv:
        idx = sys.argv.index("--local")
        html_file = sys.argv[idx + 1]
        print(f"Parsing local HTML file: {html_file}")

        with open(html_file, encoding="utf-8") as f:
            html = f.read()

        os.makedirs(OUTPUT_DIR, exist_ok=True)
        session = requests.Session()

        soup = BeautifulSoup(html, "html.parser")
        forms = []
        current_category = "General"

        for el in soup.find_all(["h2", "h3", "h4", "a"]):
            if el.name in ("h2", "h3", "h4"):
                text = el.get_text(strip=True)
                if text:
                    current_category = text
            if el.name == "a":
                href = el.get("href", "")
                text = el.get_text(strip=True)
                if href.lower().endswith(".pdf") or "/forms/" in href.lower() or "pdf" in href.lower():
                    if href.startswith("http"):
                        full_url = href
                    else:
                        full_url = urllib.parse.urljoin(BASE_URL, href)
                    forms.append({
                        "name": text or get_filename_from_url(full_url),
                        "url": full_url,
                        "category": current_category,
                        "filename": None,
                    })

        seen = set()
        forms = [f for f in forms if not (f["url"] in seen or seen.add(f["url"]))]
        print(f"Found {len(forms)} PDF links in local file.")

        manifest = []
        for i, form in enumerate(forms, 1):
            print(f"[{i}/{len(forms)}] {form['name'][:60]}")
            filename = download_pdf(session, form, OUTPUT_DIR)
            manifest.append({
                "name": form["name"],
                "url": form["url"],
                "category": form["category"],
                "filename": filename,
                "downloaded": filename is not None,
            })
            if i < len(forms):
                time.sleep(DOWNLOAD_DELAY)

        with open(MANIFEST_FILE, "w", encoding="utf-8") as f:
            json.dump(manifest, f, indent=2, ensure_ascii=False)

        ok = sum(1 for m in manifest if m["downloaded"])
        print(f"\nDone. {ok}/{len(manifest)} PDFs downloaded to ./{OUTPUT_DIR}/")
        print(f"Manifest written to {MANIFEST_FILE}")
    else:
        main()
