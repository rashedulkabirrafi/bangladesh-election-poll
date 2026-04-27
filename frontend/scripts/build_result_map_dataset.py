import csv
import json
import base64
import math
import os
from pathlib import Path


ROOT = Path(__file__).resolve().parents[1]
CONSTITUENCIES_PATH = ROOT / "src" / "assets" / "constituencies.json"
ALLIANCE_INPUT_PATH = ROOT / "public" / "result_assets" / "dict" / "alliance_level_data.csv"
CENTERS_INPUT_PATH = ROOT.parent / "all_center_wise_results.csv"
SHERPUR3_INPUT_PATH = ROOT.parent / "sherpur 3.csv"
OUTPUT_PATH = ROOT / "public" / "result_assets" / "dict" / "alliance_level_data_merged.csv"
INLINE_OUTPUT_PATH = ROOT / "public" / "result_assets" / "dict" / "inline-data.b64"
INLINE_TOUCH_OUTPUT_PATH = ROOT / "public" / "result_assets" / "dict" / "inline-data-touch.b64"
INLINE_CONSTITUENCY_OUTPUT_PATH = ROOT / "public" / "result_assets" / "dict" / "inline-constituency-data.b64"
GIS_INPUT_CANDIDATES = [
    ROOT / "scripts" / "data" / "geoBoundaries-BGD-ADM4_simplified.geojson",
    ROOT / "public" / "result_assets" / "dict" / "geoBoundaries-BGD-ADM4_simplified.geojson",
    ROOT.parent / "geoBoundaries-BGD-ADM4_simplified.geojson",
    Path("/home/rafi/cap/geoBoundaries-BGD-ADM4-all/geoBoundaries-BGD-ADM4_simplified.geojson"),
]

BANGLA_DIGITS = str.maketrans("০১২৩৪৫৬৭৮৯", "0123456789")
PARTY_KEYS = [
    "BNP-led alliance",
    "Independent",
    "Jamaat-led alliance",
    "Other party",
]
BANGLA_CONSTITUENCY_REPLACEMENTS = [
    ("চট্রগ্রাম", "চট্টগ্রাম"),
    ("ময়মনসিংহ", "ময়মনসিংহ"),
    ("কুড়িগ্রাম", "কুড়িগ্রাম"),
    ("কুষ্টিয়া", "কুষ্টিয়া"),
    ("খাগড়াছড়ি", "খাগড়াছড়ি"),
    ("চুয়াডাঙ্গা", "চুয়াডাঙ্গা"),
    ("জয়পুরহাট", "জয়পুরহাট"),
    ("ঝালোকাঠি", "ঝালকাঠি"),
    ("টাংগাইল", "টাঙ্গাইল"),
    ("নারায়ণগঞ্জ", "নারায়ণগঞ্জ"),
    ("নেত্রকোণা", "নেত্রকোনা"),
    ("নোয়াখালী", "নোয়াখালী"),
    ("নড়াইল", "নড়াইল"),
    ("ব্রাক্ষণবাড়িয়া", "ব্রাহ্মণবাড়িয়া"),
    ("পঞ্চগড়", "পঞ্চগড়"),
    ("মাগুড়া", "মাগুরা"),
    ("রাজবাড়ী", "রাজবাড়ী"),
    ("শরীয়তপুর", "শরীয়তপুর"),
    ("লক্ষীপুর", "লক্ষ্মীপুর"),
]
SHERPUR3_PARTY_TOTALS = {
    "BNP-led alliance": 166117,
    "Independent": 0,
    "Jamaat-led alliance": 47051,
    "Other party": 480,
}
SHERPUR3_UNIONS = [
    ("Sreebardi", "Bhelua"),
    ("Sreebardi", "Garjaripa"),
    ("Sreebardi", "Gosaipur"),
    ("Sreebardi", "Kakilakura"),
    ("Sreebardi", "Kharia Kazir Char"),
    ("Sreebardi", "Kurikahania"),
    ("Sreebardi", "Rani Shimul"),
    ("Sreebardi", "Singa Baruna"),
    ("Sreebardi", "Sreebardi"),
    ("Sreebardi", "Sreebardi Paurashava"),
    ("Sreebardi", "Tantihati"),
    ("Jhenaigati", "Dhanshail"),
    ("Jhenaigati", "Gauripur"),
    ("Jhenaigati", "Hatibandha"),
    ("Jhenaigati", "Jhenaigati"),
    ("Jhenaigati", "Kangsha"),
    ("Jhenaigati", "Malijhikanda"),
    ("Jhenaigati", "Nalkura"),
]


def load_constituency_rows():
    return json.loads(CONSTITUENCIES_PATH.read_text(encoding="utf-8"))


def load_bangla_constituency_order(rows):
    ordered = []
    seen = set()
    for row in rows:
        name = normalize_bangla_constituency(row.get("constituency", ""))
        if not name or name in seen:
            continue
        seen.add(name)
        ordered.append(name)
    return ordered


def load_alliance_rows():
    with ALLIANCE_INPUT_PATH.open(newline="", encoding="utf-8-sig") as handle:
        reader = csv.DictReader(handle)
        rows = list(reader)
        fieldnames = list(reader.fieldnames or [])

    eng_by_id = {}
    for row in rows:
        constituency_id = int(row["constituency_id"])
        eng_by_id.setdefault(constituency_id, row["constituency_name_en"])

    return rows, fieldnames, eng_by_id


def load_sherpur3_totals():
    if not SHERPUR3_INPUT_PATH.exists():
        return None

    valid = 0
    rejected = 0
    absent = 0
    total_voters = 0
    center_count = 0

    with SHERPUR3_INPUT_PATH.open(newline="", encoding="utf-8-sig") as handle:
        reader = csv.DictReader(handle)
        for row in reader:
            center_count += 1
            valid += int(normalize_numeric_text(row["বৈধ ভোট"]) or 0)
            rejected += int(normalize_numeric_text(row["বাতিল ভোট"]) or 0)
            absent += int(normalize_numeric_text(row["অনুপস্থিত ভোটার"]) or 0)
            total_voters += int(normalize_numeric_text(row["মোট ভোটার"]) or 0)

    return {
        "center_count": center_count,
        "valid_votes": valid,
        "rejected_votes": rejected,
        "absent_voters": absent,
        "total_voters": total_voters,
    }


def build_constituency_mapping(bangla_order, english_by_id):
    return {
        bangla_order[constituency_id - 1]: english_by_id[constituency_id]
        for constituency_id in range(1, len(bangla_order) + 1)
        if constituency_id in english_by_id
    }


def build_constituency_meta(rows, english_by_id):
    meta = {}
    for constituency_id, english_name in english_by_id.items():
        index = constituency_id - 1
        if index < 0 or index >= len(rows):
            continue
        row = rows[index]
        meta[english_name] = {
            "division": str(row.get("division", "")).strip(),
            "district_bn": str(row.get("district", "")).strip(),
            "constituency_bn": str(row.get("constituency", "")).strip(),
        }
    return meta


def normalize_center_no(value):
    return str(value or "").strip().translate(BANGLA_DIGITS)


def normalize_numeric_text(value):
    return str(value or "").strip().translate(BANGLA_DIGITS)


def normalize_bangla_constituency(value):
    text = str(value or "").strip()
    for source, target in BANGLA_CONSTITUENCY_REPLACEMENTS:
        text = text.replace(source, target)
    return text


def merge_center_totals(alliance_rows, bn_to_en_constituency):
    lookup = {}
    for index, row in enumerate(alliance_rows):
        key = (row["constituency_name_en"], normalize_center_no(row["center_no"]))
        lookup[key] = index

    matched = 0
    unmatched = 0

    with CENTERS_INPUT_PATH.open(newline="", encoding="utf-8-sig") as handle:
        reader = csv.reader(handle)
        next(reader, None)

        for row in reader:
            if len(row) < 10:
                continue

            bangla_constituency = normalize_bangla_constituency(row[3] or row[1])
            english_constituency = bn_to_en_constituency.get(bangla_constituency)
            if not english_constituency:
                unmatched += 1
                continue

            key = (english_constituency, normalize_center_no(row[4]))
            alliance_index = lookup.get(key)
            if alliance_index is None:
                unmatched += 1
                continue

            target = alliance_rows[alliance_index]
            target["valid_votes"] = normalize_numeric_text(row[6])
            target["rejected_votes"] = normalize_numeric_text(row[7])
            target["absent_voters"] = normalize_numeric_text(row[8])
            target["total_voters"] = normalize_numeric_text(row[9])
            matched += 1

    return matched, unmatched


def write_output(rows, fieldnames):
    OUTPUT_PATH.parent.mkdir(parents=True, exist_ok=True)
    with OUTPUT_PATH.open("w", newline="", encoding="utf-8") as handle:
        writer = csv.DictWriter(handle, fieldnames=fieldnames)
        writer.writeheader()
        writer.writerows(rows)


def to_number(value):
    text = normalize_numeric_text(value).replace(",", "")
    if not text:
        return 0
    try:
        return float(text)
    except ValueError:
        return 0


def parse_geometry(value):
    text = str(value or "").strip()
    if not text:
        return None
    return json.loads(text.replace("'", '"'))


def geometry_points(geometry):
    if not geometry:
        return
    geometry_type = geometry.get("type")
    coordinates = geometry.get("coordinates") or []
    if geometry_type == "Polygon":
        for ring in coordinates:
            for lon, lat in ring:
                yield lon, lat
    elif geometry_type == "MultiPolygon":
        for polygon in coordinates:
            for ring in polygon:
                for lon, lat in ring:
                    yield lon, lat


def geometry_stats(geometry):
    xs = []
    ys = []
    for lon, lat in geometry_points(geometry):
        xs.append(float(lon))
        ys.append(float(lat))
    if not xs:
        return {
            "centroid": (0.0, 0.0),
            "bbox": (0.0, 0.0, 0.0, 0.0),
        }
    min_x = min(xs)
    min_y = min(ys)
    max_x = max(xs)
    max_y = max(ys)
    return {
        "centroid": (sum(xs) / len(xs), sum(ys) / len(ys)),
        "bbox": (min_x, min_y, max_x, max_y),
    }


def normalized_name(value):
    return (
        str(value or "")
        .strip()
        .lower()
        .replace("pourashava", "paurashava")
        .replace("municipality", "paurashava")
    )


def bbox_overlap_ratio(a, b):
    ax1, ay1, ax2, ay2 = a
    bx1, by1, bx2, by2 = b
    inter_x1 = max(ax1, bx1)
    inter_y1 = max(ay1, by1)
    inter_x2 = min(ax2, bx2)
    inter_y2 = min(ay2, by2)
    if inter_x2 <= inter_x1 or inter_y2 <= inter_y1:
        return 0.0
    inter_area = (inter_x2 - inter_x1) * (inter_y2 - inter_y1)
    a_area = max((ax2 - ax1) * (ay2 - ay1), 1e-12)
    b_area = max((bx2 - bx1) * (by2 - by1), 1e-12)
    return inter_area / max(min(a_area, b_area), 1e-12)


def centroid_distance(a, b):
    return math.hypot(a[0] - b[0], a[1] - b[1])


def resolve_gis_input_path():
    env_path = str(os.environ.get("GIS_INPUT_PATH", "")).strip()
    if env_path:
        return Path(env_path)
    for path in GIS_INPUT_CANDIDATES:
        if path.exists():
            return path
    return GIS_INPUT_CANDIDATES[0]


def load_gis_features():
    gis_path = resolve_gis_input_path()
    if not gis_path.exists():
        return {}

    with gis_path.open(encoding="utf-8") as handle:
        data = json.load(handle)

    grouped = {}
    for feature in data["features"]:
        geometry = feature.get("geometry")
        name = normalized_name(feature.get("properties", {}).get("shapeName"))
        if not geometry or not name:
            continue
        stats = geometry_stats(geometry)
        grouped.setdefault(name, []).append(
            {
                "geometry": geometry,
                "centroid": stats["centroid"],
                "bbox": stats["bbox"],
            }
        )
    return grouped


def build_sherpur3_supplement_rows(gis_by_name, fieldnames):
    totals = load_sherpur3_totals()
    if totals is None:
        return []

    rows = []
    for upazila, union_name in SHERPUR3_UNIONS:
        candidates = gis_by_name.get(normalized_name(union_name), [])
        if not candidates:
            continue

        row = {field: "" for field in fieldnames}
        row.update(
            {
                "center_id": f"SHERPUR3::{upazila}::{union_name}",
                "BNP-led alliance": str(SHERPUR3_PARTY_TOTALS["BNP-led alliance"]),
                "Independent": str(SHERPUR3_PARTY_TOTALS["Independent"]),
                "Jamaat-led alliance": str(SHERPUR3_PARTY_TOTALS["Jamaat-led alliance"]),
                "Other party": str(SHERPUR3_PARTY_TOTALS["Other party"]),
                "constituency_id": "SHERPUR3",
                "constituency_name_en": "Sherpur-3",
                "center_name": "Sherpur-3 constituency-wide supplement",
                "total_voters": str(totals["total_voters"]),
                "valid_votes": str(totals["valid_votes"]),
                "rejected_votes": str(totals["rejected_votes"]),
                "absent_voters": str(totals["absent_voters"]),
                "Union": union_name,
                "Upazila": upazila,
                "District": "Sherpur",
                "geometry": json.dumps(candidates[0]["geometry"], ensure_ascii=False, separators=(",", ":")),
                "supplement": "constituency_estimate",
                "supplement_center_count": str(totals["center_count"]),
            }
        )
        rows.append(row)

    return rows


def apply_gis_geometries(rows):
    gis_by_name = load_gis_features()
    union_samples = {}

    for row in rows:
        union_name = str(row.get("Union", "")).strip()
        upazila = str(row.get("Upazila", "")).strip()
        district = str(row.get("District", "")).strip()
        geometry = parse_geometry(row.get("geometry"))
        if not union_name or not geometry:
            continue
        key = f"{district}||{upazila}||{union_name}"
        union_samples.setdefault(
            key,
            {
                "union_name": union_name,
                "stats": geometry_stats(geometry),
            },
        )

    replacements = {}
    matched = 0
    fallback = 0

    for key, sample in union_samples.items():
        candidates = gis_by_name.get(normalized_name(sample["union_name"]), [])
        if not candidates:
            fallback += 1
            continue

        chosen = None
        best_score = None
        for candidate in candidates:
            overlap = bbox_overlap_ratio(sample["stats"]["bbox"], candidate["bbox"])
            distance = centroid_distance(sample["stats"]["centroid"], candidate["centroid"])
            score = (overlap, -distance)
            if best_score is None or score > best_score:
                best_score = score
                chosen = candidate

        if chosen is not None:
            replacements[key] = chosen["geometry"]
            matched += 1
        else:
            fallback += 1

    for row in rows:
        union_name = str(row.get("Union", "")).strip()
        upazila = str(row.get("Upazila", "")).strip()
        district = str(row.get("District", "")).strip()
        key = f"{district}||{upazila}||{union_name}"
        geometry = replacements.get(key)
        if geometry is not None:
            row["geometry"] = json.dumps(geometry, ensure_ascii=False, separators=(",", ":"))

    return matched, fallback


def build_inline_union_rows(rows, supplement_rows, constituency_meta):
    union_map = {}

    for row in rows:
        union_name = str(row.get("Union", "")).strip()
        upazila = str(row.get("Upazila", "")).strip()
        district = str(row.get("District", "")).strip()
        geometry_text = str(row.get("geometry", "")).strip()
        if not union_name or not geometry_text:
            continue

        key = f"{district}||{upazila}||{union_name}"
        union = union_map.get(key)
        if union is None:
            constituency_name = str(
                row.get("constituency_name_en") or row.get("constituency_name") or ""
            ).strip()
            meta = constituency_meta.get(constituency_name, {})
            union = {
                "key": key,
                "union": union_name,
                "upazila": upazila,
                "district": district,
                "division": meta.get("division", ""),
                "totals": {party: 0 for party in PARTY_KEYS},
                "centerIds": set(),
                "constituencyNames": set(),
                "total_voters": 0,
                "valid_votes": 0,
                "geometry": parse_geometry(geometry_text),
            }
            union_map[key] = union

        center_id = str(row.get("center_id", "")).strip()
        if center_id:
            union["centerIds"].add(center_id)

        constituency_name = str(
            row.get("constituency_name_en") or row.get("constituency_name") or ""
        ).strip()
        if constituency_name:
            union["constituencyNames"].add(constituency_name)

        for party in PARTY_KEYS:
            union["totals"][party] += to_number(row.get(party))

        union["total_voters"] += int(to_number(row.get("total_voters")))
        union["valid_votes"] += int(to_number(row.get("valid_votes")))

    inline_rows = []
    for union in union_map.values():
        if not union["geometry"]:
            continue
        inline_rows.append(
            {
                "key": union["key"],
                "union": union["union"],
                "upazila": union["upazila"],
                "district": union["district"],
                "division": union["division"],
                "totals": union["totals"],
                "centerCount": len(union["centerIds"]),
                "constituencyNames": sorted(union["constituencyNames"]),
                "total_voters": union["total_voters"],
                "valid_votes": union["valid_votes"],
                "geometry": union["geometry"],
            }
        )

    for row in supplement_rows:
        inline_rows.append(
            {
                "key": f"Sherpur||{row['Upazila']}||{row['Union']}",
                "union": row["Union"],
                "upazila": row["Upazila"],
                "district": row["District"],
                "division": "ময়মনসিংহ",
                "totals": {party: to_number(row.get(party)) for party in PARTY_KEYS},
                "centerCount": int(to_number(row.get("supplement_center_count"))),
                "constituencyNames": ["Sherpur-3"],
                "total_voters": int(to_number(row.get("total_voters"))),
                "valid_votes": int(to_number(row.get("valid_votes"))),
                "geometry": parse_geometry(row.get("geometry")),
                "supplement": "constituency_estimate",
                "supplement_note": "Sherpur-3 added from constituency-wide by-election result; union-level party breakdown unavailable.",
            }
        )

    return inline_rows


def geometry_to_multipolygon_coordinates(geometry):
    if not geometry:
        return []
    geometry_type = geometry.get("type")
    coordinates = geometry.get("coordinates") or []
    if geometry_type == "Polygon":
        return [coordinates]
    if geometry_type == "MultiPolygon":
        return coordinates
    return []


def build_inline_constituency_rows(rows, constituency_meta):
    constituency_map = {}

    for row in rows:
        constituency_name = str(
            row.get("constituency_name_en") or row.get("constituency_name") or ""
        ).strip()
        geometry = parse_geometry(row.get("geometry"))
        if not constituency_name or not geometry:
            continue

        entry = constituency_map.get(constituency_name)
        if entry is None:
            meta = constituency_meta.get(constituency_name, {})
            entry = {
                "key": constituency_name,
                "constituency": constituency_name,
                "division": meta.get("division", ""),
                "districts": set(),
                "upazilas": set(),
                "totals": {party: 0 for party in PARTY_KEYS},
                "centerIds": set(),
                "unionKeys": set(),
                "total_voters": 0,
                "valid_votes": 0,
                "geometry_parts": [],
            }
            constituency_map[constituency_name] = entry

        district = str(row.get("District", "")).strip()
        upazila = str(row.get("Upazila", "")).strip()
        union_name = str(row.get("Union", "")).strip()
        center_id = str(row.get("center_id", "")).strip()

        if district:
            entry["districts"].add(district)
        if upazila:
            entry["upazilas"].add(upazila)
        if center_id:
            entry["centerIds"].add(center_id)

        for party in PARTY_KEYS:
            entry["totals"][party] += to_number(row.get(party))

        entry["total_voters"] += int(to_number(row.get("total_voters")))
        entry["valid_votes"] += int(to_number(row.get("valid_votes")))

        union_key = f"{district}||{upazila}||{union_name}"
        if union_name and union_key not in entry["unionKeys"]:
            entry["unionKeys"].add(union_key)
            entry["geometry_parts"].extend(geometry_to_multipolygon_coordinates(geometry))

    inline_rows = []
    for entry in constituency_map.values():
        if not entry["geometry_parts"]:
            continue
        geometry = (
            {"type": "Polygon", "coordinates": entry["geometry_parts"][0]}
            if len(entry["geometry_parts"]) == 1
            else {"type": "MultiPolygon", "coordinates": entry["geometry_parts"]}
        )
        inline_rows.append(
            {
                "key": entry["key"],
                "constituency": entry["constituency"],
                "division": entry["division"],
                "districts": sorted(entry["districts"]),
                "upazilas": sorted(entry["upazilas"]),
                "totals": entry["totals"],
                "centerCount": len(entry["centerIds"]),
                "unionCount": len(entry["unionKeys"]),
                "total_voters": entry["total_voters"],
                "valid_votes": entry["valid_votes"],
                "geometry": geometry,
            }
        )

    return inline_rows


def write_inline_payload(path, rows):
    encoded = base64.b64encode(
        json.dumps(rows, ensure_ascii=False, separators=(",", ":")).encode("utf-8")
    ).decode("ascii")
    path.write_text(encoded, encoding="utf-8")


def main():
    if not CONSTITUENCIES_PATH.exists():
        raise SystemExit(f"Missing constituencies file: {CONSTITUENCIES_PATH}")
    if not ALLIANCE_INPUT_PATH.exists():
        raise SystemExit(f"Missing alliance CSV: {ALLIANCE_INPUT_PATH}")
    if not CENTERS_INPUT_PATH.exists():
        raise SystemExit(f"Missing center-wise CSV: {CENTERS_INPUT_PATH}")
    if not SHERPUR3_INPUT_PATH.exists():
        raise SystemExit(f"Missing Sherpur-3 CSV: {SHERPUR3_INPUT_PATH}")

    constituency_rows = load_constituency_rows()
    bangla_order = load_bangla_constituency_order(constituency_rows)
    alliance_rows, fieldnames, english_by_id = load_alliance_rows()
    bn_to_en_constituency = build_constituency_mapping(bangla_order, english_by_id)
    constituency_meta = build_constituency_meta(constituency_rows, english_by_id)
    matched, unmatched = merge_center_totals(alliance_rows, bn_to_en_constituency)
    gis_matched, gis_fallback = apply_gis_geometries(alliance_rows)
    if "supplement" not in fieldnames:
        fieldnames.append("supplement")
    if "supplement_center_count" not in fieldnames:
        fieldnames.append("supplement_center_count")
    gis_by_name = load_gis_features()
    sherpur3_rows = build_sherpur3_supplement_rows(gis_by_name, fieldnames)
    all_rows = alliance_rows + sherpur3_rows
    write_output(all_rows, fieldnames)
    union_inline_rows = build_inline_union_rows(alliance_rows, sherpur3_rows, constituency_meta)
    constituency_inline_rows = build_inline_constituency_rows(all_rows, constituency_meta)
    write_inline_payload(INLINE_OUTPUT_PATH, union_inline_rows)
    write_inline_payload(INLINE_TOUCH_OUTPUT_PATH, union_inline_rows)
    write_inline_payload(INLINE_CONSTITUENCY_OUTPUT_PATH, constituency_inline_rows)
    gis_input_path = resolve_gis_input_path()
    gis_source = (
        gis_input_path.name
        if gis_input_path.exists()
        else "embedded alliance CSV geometry (external GIS file missing)"
    )

    print(
        f"Wrote {len(all_rows)} rows to {OUTPUT_PATH} "
        f"(updated {matched} center rows from {CENTERS_INPUT_PATH.name}, "
        f"left {unmatched} unmatched; mapped {gis_matched} unions to {gis_source}, "
        f"kept {gis_fallback} original geometries; added {len(sherpur3_rows)} Sherpur-3 supplement unions; "
        f"wrote {len(union_inline_rows)} unions to {INLINE_OUTPUT_PATH.name}; "
        f"wrote {len(constituency_inline_rows)} constituencies to {INLINE_CONSTITUENCY_OUTPUT_PATH.name})"
    )


if __name__ == "__main__":
    main()
