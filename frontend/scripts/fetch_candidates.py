import json
import os
import time
from collections import OrderedDict
from datetime import datetime
from pathlib import Path

import requests
from bs4 import BeautifulSoup

BASE = os.getenv("CANDIDATE_SOURCE_BASE", "http://103.183.38.66")
ELECTION_TYPE_ID = int(os.getenv("ELECTION_TYPE_ID", "1"))
CANDIDATE_TYPE_ID = int(os.getenv("CANDIDATE_TYPE_ID", "1"))
STATUS_ID = os.getenv("STATUS_ID", "11")
ELECTION_ID = os.getenv("ELECTION_ID")

ROOT = Path(__file__).resolve().parents[1]
OUTPUT_PATH = ROOT / "src" / "assets" / "candidates.json"

SESSION = requests.Session()
SESSION.headers.update({"User-Agent": "Mozilla/5.0"})


def pick_latest_election(elections):
    def parse_date(item):
        value = item.get("date_of_election") or ""
        try:
            return datetime.strptime(value, "%Y-%m-%d %H:%M:%S")
        except ValueError:
            return datetime.min

    return max(elections, key=parse_date)


def get_json(path, params=None):
    url = f"{BASE}{path}"
    response = SESSION.get(url, params=params, timeout=30)
    response.raise_for_status()
    return response.json()


def normalize_url(url):
    if not url:
        return ""
    if url.startswith("http"):
        return url
    return f"{BASE}{url}"


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

        candidates.append(
            {
                "name": name,
                "party": party,
                "symbol": symbol,
                "photo": photo_url,
                "affidavit": affidavit_url,
                "expense": expense_url,
                "tax": tax_url,
            }
        )

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
    elections = get_json("/election-settings/get-election-bytype", params={"election_typeID": ELECTION_TYPE_ID})
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
            response = SESSION.get(f"{BASE}/get/candidate/data", params=params, timeout=30)
            response.raise_for_status()
            candidates = parse_candidates(response.text)
            results[constituency_name] = candidates

            time.sleep(0.15)

    OUTPUT_PATH.write_text(
        json.dumps(results, ensure_ascii=False, indent=2), encoding="utf-8"
    )

    print(f"Election: {election.get('election_name')} (ID {election_id})")
    print(f"Wrote {len(results)} constituencies to {OUTPUT_PATH}")


if __name__ == "__main__":
    main()
