import json
import os
import time
from datetime import datetime
from pathlib import Path
from shutil import copy2
from urllib.parse import urlparse

import requests
from bs4 import BeautifulSoup

BASE = os.getenv("CANDIDATE_SOURCE_BASE", "http://103.183.38.66")
ELECTION_TYPE_ID = int(os.getenv("ELECTION_TYPE_ID", "1"))
CANDIDATE_TYPE_ID = int(os.getenv("CANDIDATE_TYPE_ID", "1"))
STATUS_ID = os.getenv("STATUS_ID", "11")
ELECTION_ID = os.getenv("ELECTION_ID")

DOWNLOAD_ASSETS = os.getenv("DOWNLOAD_ASSETS", "1") == "1"
ASSET_DIR_NAME = os.getenv("CANDIDATE_ASSET_DIR_NAME", "candidatess").strip("/").strip()
ASSET_BASE = os.getenv("CANDIDATE_ASSET_BASE", f"/{ASSET_DIR_NAME}").rstrip("/")
PHOTO_DIR_NAME = os.getenv("CANDIDATE_PHOTO_DIR", "photoss").strip("/")
TAX_DIR_NAME = os.getenv("CANDIDATE_TAX_DIR", "taxx").strip("/")
EXPENSE_DIR_NAME = os.getenv("CANDIDATE_EXPENSE_DIR", "expensee").strip("/")
AFFIDAVIT_DIR_NAME = os.getenv("CANDIDATE_AFFIDAVIT_DIR", "affidavitt").strip("/")

REQUEST_RETRIES = int(os.getenv("REQUEST_RETRIES", "3"))
REQUEST_BACKOFF = float(os.getenv("REQUEST_BACKOFF", "1.5"))
ALLOW_OFFLINE = os.getenv("ALLOW_OFFLINE", "0") == "1"
REQUIRE_LOCAL_ASSETS = os.getenv("REQUIRE_LOCAL_ASSETS", "1") == "1"
USE_LEGACY_ASSETS = os.getenv("USE_LEGACY_ASSETS", "1") == "1"
PHOTO_PLACEHOLDER = os.getenv("PHOTO_PLACEHOLDER", "1") == "1"
EXPENSE_PLACEHOLDER = os.getenv("EXPENSE_PLACEHOLDER", "1") == "1"

ROOT = Path(__file__).resolve().parents[1]
OUTPUT_PATH = ROOT / "src" / "assets" / "candidates.json"
OUTPUT_PATH_LOCAL = ROOT / "src" / "assets" / "candidates_new.json"

BACKEND_PUBLIC = ROOT.parent / "backend" / "public"
ASSET_ROOT = BACKEND_PUBLIC / ASSET_DIR_NAME
LEGACY_ASSET_ROOT = BACKEND_PUBLIC / "candidates"

SESSION = requests.Session()
SESSION.headers.update({"User-Agent": "Mozilla/5.0"})

ASSET_ROOT.mkdir(parents=True, exist_ok=True)

ASSET_SUBDIRS = {
    "photo": ASSET_ROOT / PHOTO_DIR_NAME,
    "affidavit": ASSET_ROOT / AFFIDAVIT_DIR_NAME,
    "expense": ASSET_ROOT / EXPENSE_DIR_NAME,
    "tax": ASSET_ROOT / TAX_DIR_NAME,
}

for path in ASSET_SUBDIRS.values():
    path.mkdir(parents=True, exist_ok=True)

LEGACY_SUBDIRS = {
    "photo": LEGACY_ASSET_ROOT / "photos",
    "affidavit": LEGACY_ASSET_ROOT / "affidavit",
    "expense": LEGACY_ASSET_ROOT / "expense",
    "tax": LEGACY_ASSET_ROOT / "tax",
}

DOWNLOAD_CACHE = {}
PLACEHOLDER_PATH = ASSET_SUBDIRS["photo"] / "placeholder.svg"
EXPENSE_PLACEHOLDER_PATH = ASSET_SUBDIRS["expense"] / "placeholder.pdf"


def pick_latest_election(elections):
    def parse_date(item):
        value = item.get("date_of_election") or ""
        try:
            return datetime.strptime(value, "%Y-%m-%d %H:%M:%S")
        except ValueError:
            return datetime.min

    return max(elections, key=parse_date)


def request_with_retries(url, params=None):
    last_error = None
    for attempt in range(REQUEST_RETRIES):
        try:
            response = SESSION.get(url, params=params, timeout=30)
            response.raise_for_status()
            return response
        except requests.RequestException as exc:
            last_error = exc
            if attempt < REQUEST_RETRIES - 1:
                time.sleep(REQUEST_BACKOFF * (attempt + 1))
                continue
            raise last_error


def get_json(path, params=None):
    url = f"{BASE}{path}"
    response = request_with_retries(url, params=params)
    return response.json()


def normalize_url(url):
    if not url:
        return ""
    if url.startswith("http"):
        return url
    return f"{BASE}{url}"


def pick_extension(url, default_ext, content_type=None):
    parsed = urlparse(url)
    suffix = Path(parsed.path).suffix.lower()
    if suffix in {".pdf", ".jpg", ".jpeg", ".png", ".webp"}:
        return suffix
    if content_type:
        content_type = content_type.lower()
        if "pdf" in content_type:
            return ".pdf"
        if "png" in content_type:
            return ".png"
        if "webp" in content_type:
            return ".webp"
        if "jpeg" in content_type or "jpg" in content_type:
            return ".jpg"
    return default_ext


def is_pdf_bytes(data):
    return data[:4] == b"%PDF"


def slugify(value, max_len=48):
    cleaned = []
    prev_dash = False
    for ch in value.lower():
        if ch.isalnum():
            cleaned.append(ch)
            prev_dash = False
        else:
            if not prev_dash:
                cleaned.append("-")
                prev_dash = True
    slug = "".join(cleaned).strip("-")
    if len(slug) > max_len:
        slug = slug[:max_len].rstrip("-")
    return slug or "candidate"


def ensure_placeholder():
    if PLACEHOLDER_PATH.exists():
        return
    svg = """<svg xmlns="http://www.w3.org/2000/svg" width="160" height="200" viewBox="0 0 160 200">
  <rect width="160" height="200" rx="12" fill="#f1f5f9"/>
  <circle cx="80" cy="70" r="30" fill="#cbd5e1"/>
  <rect x="28" y="120" width="104" height="16" rx="8" fill="#cbd5e1"/>
  <rect x="40" y="148" width="80" height="12" rx="6" fill="#e2e8f0"/>
</svg>
"""
    PLACEHOLDER_PATH.write_text(svg, encoding="utf-8")


def ensure_expense_placeholder():
    if EXPENSE_PLACEHOLDER_PATH.exists():
        return
    pdf = (
        b"%PDF-1.4\n"
        b"1 0 obj << /Type /Catalog /Pages 2 0 R >> endobj\n"
        b"2 0 obj << /Type /Pages /Kids [3 0 R] /Count 1 >> endobj\n"
        b"3 0 obj << /Type /Page /Parent 2 0 R /MediaBox [0 0 612 792] "
        b"/Contents 4 0 R /Resources << /Font << /F1 5 0 R >> >> >> endobj\n"
        b"4 0 obj << /Length 44 >> stream\n"
        b"BT /F1 18 Tf 72 720 Td (Document not available) Tj ET\n"
        b"endstream endobj\n"
        b"5 0 obj << /Type /Font /Subtype /Type1 /BaseFont /Helvetica >> endobj\n"
        b"xref\n"
        b"0 6\n"
        b"0000000000 65535 f \n"
        b"0000000010 00000 n \n"
        b"0000000060 00000 n \n"
        b"0000000117 00000 n \n"
        b"0000000247 00000 n \n"
        b"0000000344 00000 n \n"
        b"trailer << /Size 6 /Root 1 0 R >>\n"
        b"startxref\n"
        b"420\n"
        b"%%EOF\n"
    )
    EXPENSE_PLACEHOLDER_PATH.write_bytes(pdf)


def try_copy_legacy_asset(url, kind, target_path):
    if not USE_LEGACY_ASSETS:
        return False
    legacy_dir = LEGACY_SUBDIRS.get(kind)
    if not legacy_dir or not legacy_dir.exists():
        return False
    import hashlib

    digest = hashlib.sha256(url.encode("utf-8")).hexdigest()[:24]
    matches = list(legacy_dir.glob(f"{digest}.*"))
    if not matches:
        return False
    legacy_path = matches[0]
    if kind == "photo" and legacy_path.suffix.lower() == ".pdf":
        return False
    target_path.parent.mkdir(parents=True, exist_ok=True)
    copy2(legacy_path, target_path)
    return True


def download_asset(url, kind, default_ext, label=None):
    if not url:
        return "", ""
    cached = DOWNLOAD_CACHE.get(url)
    if cached:
        return cached
    try:
        import hashlib

        digest = hashlib.sha256(url.encode("utf-8")).hexdigest()[:24]
        prefix = f"{slugify(label)}-" if label else ""
        target_dir = ASSET_SUBDIRS[kind]
        filename = f"{prefix}{digest}{default_ext}"
        target_path = target_dir / filename
        if target_path.exists():
            local_path = f"{ASSET_BASE}/{target_dir.name}/{filename}"
            DOWNLOAD_CACHE[url] = (local_path, "")
            return local_path, ""

        if try_copy_legacy_asset(url, kind, target_path):
            local_path = f"{ASSET_BASE}/{target_dir.name}/{filename}"
            DOWNLOAD_CACHE[url] = (local_path, "")
            return local_path, ""

        response = request_with_retries(url)
        content_type = response.headers.get("Content-Type") or ""
        content = response.content
        if kind == "photo":
            if is_pdf_bytes(content) or not content_type.lower().startswith("image/"):
                error = f"non-image content for photo (content-type={content_type})"
                DOWNLOAD_CACHE[url] = ("", error)
                return "", error
        ext = pick_extension(url, default_ext, content_type)
        filename = f"{prefix}{digest}{ext}"
        target_path = target_dir / filename
        if not target_path.exists():
            target_path.write_bytes(content)
        local_path = f"{ASSET_BASE}/{target_dir.name}/{filename}"
        DOWNLOAD_CACHE[url] = (local_path, "")
        return local_path, ""
    except Exception as exc:
        error = str(exc)
        DOWNLOAD_CACHE[url] = ("", error)
        return "", error


def parse_candidates(html):
    soup = BeautifulSoup(html, "html.parser")
    candidates = []
    for row in soup.find_all("tr"):
        cells = row.find_all(["th", "td"])
        if len(cells) < 8:
            continue
        name = cells[1].get_text(strip=True)
        photo_img = cells[2].find("img")
        photo_url = normalize_url(photo_img.get("src") if photo_img else "")
        party = cells[3].get_text(strip=True)
        symbol = cells[4].get_text(strip=True)

        def get_link(cell_index):
            link = cells[cell_index].find("a")
            return normalize_url(link.get("href") if link else "")

        affidavit_url = get_link(5)
        expense_url = get_link(6)
        tax_url = get_link(7)

        if not name:
            continue

        candidate = {
            "name": name,
            "party": party,
            "symbol": symbol,
            "photo": photo_url,
            "affidavit": affidavit_url,
            "expense": expense_url,
            "tax": tax_url,
        }

        if DOWNLOAD_ASSETS:
            photo_local, photo_error = download_asset(photo_url, "photo", ".jpg", label=name)
            affidavit_local, affidavit_error = download_asset(affidavit_url, "affidavit", ".pdf", label=name)
            expense_local, expense_error = download_asset(expense_url, "expense", ".pdf", label=name)
            tax_local, tax_error = download_asset(tax_url, "tax", ".pdf", label=name)

            if photo_local:
                candidate["photo_source"] = candidate["photo"]
                candidate["photo"] = photo_local
            elif PHOTO_PLACEHOLDER:
                ensure_placeholder()
                candidate["photo_missing"] = True
                candidate["photo_source"] = candidate["photo"]
                candidate["photo"] = f"{ASSET_BASE}/{ASSET_SUBDIRS['photo'].name}/placeholder.svg"

            if affidavit_local:
                candidate["affidavit_source"] = candidate["affidavit"]
                candidate["affidavit"] = affidavit_local
            if expense_local:
                candidate["expense_source"] = candidate["expense"]
                candidate["expense"] = expense_local
            elif EXPENSE_PLACEHOLDER:
                ensure_expense_placeholder()
                candidate["expense_missing"] = True
                candidate["expense_source"] = candidate["expense"]
                candidate["expense"] = f"{ASSET_BASE}/{ASSET_SUBDIRS['expense'].name}/placeholder.pdf"
            if tax_local:
                candidate["tax_source"] = candidate["tax"]
                candidate["tax"] = tax_local

            errors = [photo_error, affidavit_error, expense_error, tax_error]
            errors = [err for err in errors if err]
            if errors:
                candidate["asset_errors"] = errors

        candidates.append(candidate)

    unique = []
    seen = set()
    for candidate in candidates:
        key = (candidate["name"], candidate["party"], candidate["symbol"])
        if key in seen:
            continue
        seen.add(key)
        unique.append(candidate)
    return unique


def main():
    missing_report = []
    try:
        elections = get_json("/election-settings/get-election-bytype", params={"election_typeID": ELECTION_TYPE_ID})
    except requests.RequestException as exc:
        if ALLOW_OFFLINE and OUTPUT_PATH.exists():
            print(f"Source unavailable: {exc}")
            print(f"Using cached data at {OUTPUT_PATH}")
            return
        raise

    schedules = elections.get("election_schedules", [])
    if not schedules:
        raise SystemExit("No elections returned from source")

    if ELECTION_ID:
        election_id = int(ELECTION_ID)
        election = next((e for e in schedules if int(e.get("electionID")) == election_id), None)
        if not election:
            raise SystemExit(f"Election ID {election_id} not found in source")
    else:
        election = pick_latest_election(schedules)
        election_id = int(election.get("electionID"))

    zillas = get_json("/election-settings/get-election-zilla", params={"electionID": election_id}).get("zillas", [])
    if not zillas:
        raise SystemExit("No zillas returned from source")

    results = {}

    for zilla in zillas:
        zilla_id = zilla.get("zillaID")
        constituencies = get_json(
            "/election/get-setting-constituency",
            params={"zillaID": zilla_id, "electionID": election_id},
        ).get("constituencies", [])

        for constituency in constituencies:
            constituency_id = constituency.get("constituencyID")
            constituency_name = constituency.get("constituency_name")
            params = {
                "zilla_id": zilla_id,
                "constituency_id": constituency_id,
                "candidate_type": CANDIDATE_TYPE_ID,
                "election_id": election_id,
                "status_id": STATUS_ID,
            }
            try:
                response = request_with_retries(f"{BASE}/get/candidate/data", params=params)
                candidates = parse_candidates(response.text)
            except requests.RequestException as exc:
                print(f"Failed to fetch candidates for {constituency_name}: {exc}")
                continue
            results[constituency_name] = candidates

            time.sleep(0.15)

    OUTPUT_PATH.write_text(
        json.dumps(results, ensure_ascii=False, indent=2), encoding="utf-8"
    )

    local_only = {}
    for const, items in results.items():
        sanitized = []
        for candidate in items:
            cleaned = {k: v for k, v in candidate.items() if not k.endswith("_source")}
            for key in ("photo", "affidavit", "expense", "tax"):
                value = cleaned.get(key, "")
                if value.startswith("http"):
                    cleaned[key] = ""
            sanitized.append(cleaned)
        local_only[const] = sanitized

    OUTPUT_PATH_LOCAL.write_text(
        json.dumps(local_only, ensure_ascii=False, indent=2), encoding="utf-8"
    )

    total_candidates = sum(len(items) for items in results.values())
    missing_photo = 0
    missing_affidavit = 0
    missing_expense = 0
    missing_tax = 0

    if DOWNLOAD_ASSETS:
        for items in results.values():
            for candidate in items:
                if not candidate.get("photo", "").startswith(ASSET_BASE):
                    missing_photo += 1
                    missing_report.append({
                        "name": candidate.get("name"),
                        "type": "photo",
                        "url": candidate.get("photo_source") or candidate.get("photo"),
                    })
                if not candidate.get("affidavit", "").startswith(ASSET_BASE):
                    missing_affidavit += 1
                    missing_report.append({
                        "name": candidate.get("name"),
                        "type": "affidavit",
                        "url": candidate.get("affidavit_source") or candidate.get("affidavit"),
                    })
                if not candidate.get("expense", "").startswith(ASSET_BASE):
                    missing_expense += 1
                    missing_report.append({
                        "name": candidate.get("name"),
                        "type": "expense",
                        "url": candidate.get("expense_source") or candidate.get("expense"),
                    })
                if not candidate.get("tax", "").startswith(ASSET_BASE):
                    missing_tax += 1
                    missing_report.append({
                        "name": candidate.get("name"),
                        "type": "tax",
                        "url": candidate.get("tax_source") or candidate.get("tax"),
                    })

    print(f"Election: {election.get('election_name')} (ID {election_id})")
    print(f"Wrote {len(results)} constituencies to {OUTPUT_PATH}")
    print(f"Total candidates: {total_candidates}")
    if DOWNLOAD_ASSETS:
        if missing_report:
            report_path = ASSET_ROOT / "missing_assets.json"
            report_path.write_text(
                json.dumps(missing_report, ensure_ascii=False, indent=2), encoding="utf-8"
            )
            print(f"Missing asset report: {report_path}")
        print(
            "Missing local assets:"
            f" photos={missing_photo},"
            f" affidavits={missing_affidavit},"
            f" expenses={missing_expense},"
            f" tax={missing_tax}"
        )
        if REQUIRE_LOCAL_ASSETS and any([missing_photo, missing_affidavit, missing_expense, missing_tax]):
            raise SystemExit("Missing local assets detected. Check source availability and re-run.")


if __name__ == "__main__":
    main()
