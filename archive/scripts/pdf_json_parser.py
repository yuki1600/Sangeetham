import sys
import json
import re
from pypdf import PdfReader

# Map various spellings to standard section names. Order matters: longer
# / more specific keys must come before their prefixes (e.g.
# `muktayisvarasahityam` before `muktayiswaram`, `chittaswaram` before
# `swaram`, `ettugadapallavi` before `pallavi`).
SECTION_MAP = {
    # Muktayi Svara Sahityam (the swara passage with attached sahityam after
    # the anupallavi in a varnam) — multiple romanized spellings exist.
    "muktayisvarasahityam":   "Muktayi Svara Sahityam",
    "muktayisvarasahitya":    "Muktayi Svara Sahityam",
    "mukthayisvarasahityam":  "Muktayi Svara Sahityam",
    "mukthayisvarasahitya":   "Muktayi Svara Sahityam",
    "muktayiswarasahityam":   "Muktayi Svara Sahityam",
    "muktayiswarasahitya":    "Muktayi Svara Sahityam",
    "muktayiswaram":          "Muktayi Swaram",
    "muktayisvaram":          "Muktayi Svaram",

    # Chitta swaram (the closing pure-swara passage of a kriti).
    "chittasvaram":           "Chitta Svaram",
    "chittaswaram":           "Chitta Svaram",
    "chittaiswaram":          "Chitteswaram",
    "chitteswaram":           "Chitteswaram",
    "chittasvaras":           "Chitta Svaram",
    "chittaswaras":           "Chitta Svaram",

    # Ettugada (charanam-style alternating swara/sahityam passages, varnams).
    "ettugadapallavi":        "Ettugada Pallavi",
    "ettugadaswaram":         "Ettugada Swaram",
    "ettugadasvaram":         "Ettugada Swaram",

    # Madhyamakala (faster-tempo continuation of a kriti).
    "madhyamakalasahityam":   "Madhyamakala Sahityam",
    "madhyamakalaswaram":     "Madhyamakala Swaram",
    "madhyamakalasvaram":     "Madhyamakala Swaram",

    # Anupallavi (must come before Pallavi prefix matching).
    "anupallavi":             "Anupallavi",

    # Pallavi.
    "pallavi":                "Pallavi",

    # Charanam.
    "charanam":               "Charanam",
    "caranam":                "Charanam",

    # Generic suffix matchers for free-floating "Swaram"/"Sahityam" labels.
    "swaram":                 "Charanam Swaram",
    "svaram":                 "Charanam Svaram",
    "sahityam":               "Charanam Sahityam",
    "sahitya":                "Charanam Sahityam",
}

def clean_for_match(s):
    return s.strip().lower().replace(":", "").replace(" ", "").replace("\t", "")

SWARA_LETTERS = set('SRGMPDNsrgmpdn')

def is_swara_line(line):
    """Return True if the line looks like a swara notation line
    (only contains swara letters S/R/G/M/P/D/N, bars, dashes, digits, etc.)"""
    stripped = re.sub(r"[\s\|\-,\d\.;()]", "", line)
    if not stripped:
        return False
    return all(c in SWARA_LETTERS for c in stripped)

def detect_section(cleaned):
    """If the cleaned line starts with a known section keyword, return the
    standardized full section name (including any trailing number, e.g.
    'Charanam 1'). Otherwise return None."""
    for k, standard_name in SECTION_MAP.items():
        if cleaned.startswith(k):
            rest = cleaned[len(k):]
            m = re.match(r"^(\d+)", rest)
            if m:
                return f"{standard_name} {m.group(1)}"
            return standard_name
    return None

def extract_from_pdf(pdf_path):
    reader = PdfReader(pdf_path)
    lines = []
    for page in reader.pages:
        text = page.extract_text()
        if text:
            lines.extend(text.split('\n'))

    discovered_sections = []

    # Pass 1: Discover ALL valid sections present in the document
    for row in lines:
        cleaned = clean_for_match(row)
        name = detect_section(cleaned)
        if name and name not in discovered_sections:
            discovered_sections.append(name)

    # fallback to Pallavi if nothing was discovered (extremely unlikely)
    if not discovered_sections:
        discovered_sections = ["Pallavi"]

    # Pass 2: Extract notations using only the discovered sections
    data = {}
    pairs = []
    current_section = discovered_sections[0]
    pending_swara = None

    for row in lines:
        row_str = row.strip()
        if not row_str:
            continue

        row_str = row_str.replace('\u2013', '-')
        cleaned = clean_for_match(row_str)

        name = detect_section(cleaned)
        if name and name in discovered_sections:
            if pending_swara:
                pairs.append({"swara": pending_swara, "sahitya": ""})
                pending_swara = None
            if pairs:
                data.setdefault(current_section, []).extend(pairs)
            pairs = []
            current_section = name
            continue

        row_lower = row_str.lower()
        if row_lower.startswith("sahithya") or row_lower.startswith("sahitya") or row_lower.startswith("meaning"):
            continue

        row_clean_upper = row_str.replace(" ", "").upper()
        if row_clean_upper.startswith("ARO") or row_clean_upper.startswith("AVA"):
            continue

        if re.match(r'^[\d\s\|]+$', row_str):
            continue

        if "||" in row_str:
            if pending_swara is None:
                pending_swara = row_str
            else:
                # Two consecutive ||-bearing lines: the second is either
                # another swara line or the sahitya for the pending swara.
                if is_swara_line(row_str):
                    pairs.append({"swara": pending_swara, "sahitya": ""})
                    pending_swara = row_str
                else:
                    pairs.append({"swara": pending_swara, "sahitya": row_str})
                    pending_swara = None
        else:
            if pending_swara:
                pairs.append({"swara": pending_swara, "sahitya": row_str})
                pending_swara = None

    if pending_swara:
        pairs.append({"swara": pending_swara, "sahitya": ""})

    if pairs:
        data.setdefault(current_section, []).extend(pairs)

    return data

if __name__ == "__main__":
    if len(sys.argv) > 1:
        pdf_path = sys.argv[1]
        data = extract_from_pdf(pdf_path)
        print(json.dumps(data, indent=2))
    else:
        print("Please provide a PDF path")
