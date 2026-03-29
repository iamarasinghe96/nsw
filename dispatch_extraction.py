#!/usr/bin/env python3
"""
dispatch_extraction.py
───────────────────────
Sends each form's PNG pages to the Claude API (claude-sonnet-4-6) with the
extraction prompt, then commits the resulting JSON array to the
iamarasinghe96/extraction GitHub repo under data/final_fields.json.

Processes one form at a time — waits for each commit before moving on.
Skips forms that already have an entry in the remote final_fields.json.

Dependencies:
  pip install anthropic PyGithub

Usage:
  python dispatch_extraction.py
  python dispatch_extraction.py --extracted "D:/path/to/_extracted"
  python dispatch_extraction.py --only 45061655   # run one form by catalogue number
  python dispatch_extraction.py --dry-run         # print prompts, don't call API
"""

import argparse
import base64
import json
import sys
import time
from pathlib import Path

try:
    import anthropic
except ImportError:
    sys.exit("anthropic not installed. Run: pip install anthropic")

try:
    from github import Github, GithubException
except ImportError:
    sys.exit("PyGithub not installed. Run: pip install PyGithub")


# ── Config ────────────────────────────────────────────────────────────────────

DEFAULT_EXTRACTED = r"D:\Downloads\NSW Forms\Attempt 2\Service_NSW_Forms\_extracted"

ANTHROPIC_API_KEY = ""          # or set env var ANTHROPIC_API_KEY
GITHUB_TOKEN      = ""          # or set env var GITHUB_TOKEN
GITHUB_REPO       = "iamarasinghe96/extraction"
GITHUB_BRANCH     = "main"
GITHUB_FILE_PATH  = "data/final_fields.json"

MODEL             = "claude-sonnet-4-6"
MAX_TOKENS        = 8192
RETRY_DELAY       = 5           # seconds between API retries

# ── Extraction prompt (full schema prompt) ────────────────────────────────────

EXTRACTION_PROMPT = """You are extracting a Service NSW government form from PDF page images into a structured JSON format for a digital kiosk application.

## Output Format

Produce a single JSON array. Every element is a block. Four categories:

### 1. Display Blocks
{ "type": "instruction", "text": "...", "page": 1 }
{ "type": "heading",     "text": "...", "page": 1 }
{ "type": "disclosure",  "text": "...", "page": 1 }

- instruction: Short contextual guidance, explanatory notes, pre-stated facts.
- heading: Section titles only, include section number if shown.
- disclosure: Formal legal/statutory text — declarations, privacy notices, caution warnings, consent paragraphs.

### 2. Field Blocks
{ "label": "...", "field_name": "snake_case", "type": "...", "options": [], "required": true, "page": 1 }

Field types:
- text: Single-line free text
- number: True numeric quantity (count, age) — NOT codes
- date: Single date (date picker)
- textarea: Multi-line free text
- checkbox: Single tick-box to confirm/agree
- radio: Pick exactly one from options
- dropdown: Select from predefined list
- signature: Signature pad

CRITICAL type rules:
- postcode, BSB, ABN, licence number, registration number, phone, fax → ALWAYS "text", never "number"
- Only use "number" for true quantities: "How many years…", "Number of vehicles"

field_name: snake_case, unique, descriptive. Suffix repeated rows with _1 _2 _3.
required: true if asterisked, bold, or logically essential. false if optional/conditional.
options: [] unless radio or dropdown — then list every option exactly as printed.

### 3. Table Blocks (repeating rows)
Expand as flat fields with row suffixes (_1, _2, _3). First row required:true, rest required:false. Max 3 rows unless PDF shows more. Precede with instruction block.

### 4. Skip entirely
Any section marked "For Office Use Only", "Staff Use", "For departmental use". Skip JP/witness signature fields.

## Page Numbering
- "page" = logical step number, not physical PDF page number.
- 5–10 user inputs per logical page. Split large pages. Merge tiny pages.
- Headings/instructions share the page number of their following fields.

## Extraction Rules
1. Read every word — grey boxes, footnotes, small print are often disclosures.
2. Pre-filled static values → instruction block, not a field.
3. Applicant signature → signature field. JP/witness/officer signature → skip.
4. Split date fields ("this ___ day of ___") → one date field.
5. Paired Yes/No checkboxes → radio ["Yes","No"].
6. Cross-out questions ("I am / am not…") → radio with full options.
7. "If yes, provide details" → textarea immediately after, required:false.
8. Application type radio (New/Renewal/Upgrade) → required:true.
9. Privacy and Important Notice blocks → disclosure on last logical page.
10. Do not invent fields. Do not omit fields.
11. Strip filler from labels: "Please enter your Family Name" → "Family Name".
12. Self-check: count every fillable field in the PDF, confirm all are in your JSON.

## Standard Option Lists
states:    ["NSW","VIC","QLD","SA","WA","TAS","ACT","NT"]
states_nz: ["NSW","VIC","QLD","SA","WA","TAS","ACT","NT","New Zealand"]
yes_no:    ["Yes","No"]
gender:    ["Male","Female","Non-binary","Prefer not to say"]

## Return Format
Return ONLY the raw JSON array. No explanation, no markdown fences, no preamble.
Start with [ and end with ]. Nothing else."""


# ── Helpers ───────────────────────────────────────────────────────────────────

def load_images_as_b64(folder: Path) -> list[dict]:
    """Load all page_NN.png files from a folder as base64 image blocks."""
    pages = sorted(folder.glob("page_*.png"))
    if not pages:
        raise FileNotFoundError(f"No page_*.png files in {folder}")

    blocks = []
    for p in pages:
        data = base64.standard_b64encode(p.read_bytes()).decode()
        blocks.append({
            "type": "image",
            "source": {
                "type": "base64",
                "media_type": "image/png",
                "data": data,
            },
        })
        kb = p.stat().st_size // 1024
        print(f"    loaded {p.name}  ({kb} KB)")
    return blocks


def call_claude(client: anthropic.Anthropic, image_blocks: list, form_key: str) -> str:
    """Send images + prompt to Claude, return raw JSON string."""
    content = image_blocks + [
        {
            "type": "text",
            "text": (
                f"The form key for final_fields.json is: {form_key}\n\n"
                + EXTRACTION_PROMPT
            ),
        }
    ]

    for attempt in range(1, 4):
        try:
            response = client.messages.create(
                model=MODEL,
                max_tokens=MAX_TOKENS,
                messages=[{"role": "user", "content": content}],
            )
            return response.content[0].text.strip()
        except anthropic.RateLimitError:
            print(f"    rate limited — waiting {RETRY_DELAY * attempt}s...")
            time.sleep(RETRY_DELAY * attempt)
        except anthropic.APIError as e:
            print(f"    API error (attempt {attempt}): {e}")
            if attempt == 3:
                raise
            time.sleep(RETRY_DELAY)

    raise RuntimeError("Claude API failed after 3 attempts")


def get_or_create_json(gh_repo) -> tuple[dict, str]:
    """Fetch current final_fields.json from GitHub. Returns (data, sha)."""
    try:
        f = gh_repo.get_contents(GITHUB_FILE_PATH, ref=GITHUB_BRANCH)
        data = json.loads(f.decoded_content.decode())
        return data, f.sha
    except GithubException as e:
        if e.status == 404:
            return {}, ""   # file doesn't exist yet
        raise


def commit_form(gh_repo, form_key: str, array: list, current_data: dict, sha: str):
    """Insert/replace form_key in final_fields.json and commit."""
    current_data[form_key] = array
    content = json.dumps(current_data, indent=2, ensure_ascii=False)

    if sha:
        gh_repo.update_file(
            path=GITHUB_FILE_PATH,
            message=f"Add fields: {form_key}",
            content=content,
            sha=sha,
            branch=GITHUB_BRANCH,
        )
    else:
        gh_repo.create_file(
            path=GITHUB_FILE_PATH,
            message=f"Add fields: {form_key}",
            content=content,
            branch=GITHUB_BRANCH,
        )
    print(f"    ✓ committed → {GITHUB_FILE_PATH} [{form_key}]")


# ── Main ──────────────────────────────────────────────────────────────────────

def main():
    parser = argparse.ArgumentParser(description="Dispatch form extraction to Claude")
    parser.add_argument("--extracted", default=DEFAULT_EXTRACTED,
                        help="Root folder containing per-form PNG subfolders")
    parser.add_argument("--only", default=None,
                        help="Process only forms whose key starts with this catalogue number")
    parser.add_argument("--dry-run", action="store_true",
                        help="Load images and build prompt, but do not call API or GitHub")
    args = parser.parse_args()

    extracted_root = Path(args.extracted)
    if not extracted_root.exists():
        sys.exit(f"Extracted folder not found: {extracted_root}\nRun extract_pdf_pages.py first.")

    # ── Clients ──────────────────────────────────────────────────────────────
    import os
    api_key = ANTHROPIC_API_KEY or os.environ.get("ANTHROPIC_API_KEY", "")
    gh_token = GITHUB_TOKEN    or os.environ.get("GITHUB_TOKEN", "")

    if not args.dry_run:
        if not api_key:
            sys.exit("Set ANTHROPIC_API_KEY in the script or as an environment variable.")
        if not gh_token:
            sys.exit("Set GITHUB_TOKEN in the script or as an environment variable.")

    anthropic_client = anthropic.Anthropic(api_key=api_key) if not args.dry_run else None
    gh_repo = Github(gh_token).get_repo(GITHUB_REPO)        if not args.dry_run else None

    # ── Discover forms ────────────────────────────────────────────────────────
    form_dirs = sorted(
        d for d in extracted_root.iterdir()
        if d.is_dir() and list(d.glob("page_*.png"))
    )

    if args.only:
        form_dirs = [d for d in form_dirs if d.name.startswith(args.only)]

    if not form_dirs:
        sys.exit("No form folders with page_*.png found.")

    print(f"Forms to process : {len(form_dirs)}")
    print(f"Dry run          : {args.dry_run}\n")
    print("─" * 60)

    # ── Load existing data to skip already-done forms ─────────────────────────
    existing_data, _ = get_or_create_json(gh_repo) if not args.dry_run else ({}, "")
    already_done = set(existing_data.keys())
    if already_done:
        print(f"Already in repo  : {len(already_done)} forms (will skip)\n")

    ok = skip = fail = 0

    for form_dir in form_dirs:
        form_key = form_dir.name + ".pdf"  # e.g. "45062462-driving-instructor-mutual-recognition.pdf"
        print(f"\n{'─'*60}")
        print(f"Form : {form_key}")

        if form_key in already_done:
            print("  → already extracted, skipping.")
            skip += 1
            continue

        # Load images
        print("  Loading pages...")
        try:
            image_blocks = load_images_as_b64(form_dir)
        except Exception as e:
            print(f"  ✗ {e}")
            fail += 1
            continue

        if args.dry_run:
            print(f"  DRY RUN: would send {len(image_blocks)} image(s) to Claude.")
            ok += 1
            continue

        # Call Claude
        print(f"  Calling Claude ({len(image_blocks)} page(s))...")
        try:
            raw = call_claude(anthropic_client, image_blocks, form_key)
        except Exception as e:
            print(f"  ✗ Claude error: {e}")
            fail += 1
            continue

        # Parse JSON
        try:
            array = json.loads(raw)
            if not isinstance(array, list):
                raise ValueError("Response is not a JSON array")
            print(f"  Parsed {len(array)} blocks.")
        except (json.JSONDecodeError, ValueError) as e:
            print(f"  ✗ JSON parse error: {e}")
            print(f"  Raw response (first 300 chars): {raw[:300]}")
            fail += 1
            continue

        # Commit to GitHub
        print("  Committing to GitHub...")
        try:
            current_data, sha = get_or_create_json(gh_repo)
            commit_form(gh_repo, form_key, array, current_data, sha)
            existing_data[form_key] = array   # keep local copy in sync
            ok += 1
        except Exception as e:
            print(f"  ✗ GitHub error: {e}")
            fail += 1

        # Brief pause to avoid hammering the API
        time.sleep(2)

    print(f"\n{'═'*60}")
    print(f"Done.  {ok} extracted,  {skip} skipped,  {fail} failed.")


if __name__ == "__main__":
    main()
