import sys
import json
import re
from pypdf import PdfReader

# Map various spellings to standard section names
SECTION_MAP = {
    "pallavi": "Pallavi",
    "anupallavi": "Anupallavi",
    "charanam": "Charanam",
    "caranam": "Charanam",
    "chitteswaram": "Chitteswaram",
    "chittaiswaram": "Chitteswaram",
    "muktayiswaram": "Muktayi Swaram",
    "ettugadapallavi": "Ettugada Pallavi",
    "ettugadaswaram": "Ettugada Swaram",
    "madhyamakalasahityam": "Madhyamakala Sahityam",
    "swaram": "Charanam Swaram",
    "sahityam": "Charanam Sahityam"
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
