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
        row_str = row.strip().lower()
        cleaned = clean_for_match(row_str)
        for k, standard_name in SECTION_MAP.items():
            if cleaned.startswith(k):
                if standard_name not in discovered_sections:
                    discovered_sections.append(standard_name)

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

        is_section_header = False
        for k, standard_name in SECTION_MAP.items():
            if cleaned.startswith(k):
                # Ensure the section is recognized
                if standard_name in discovered_sections:
                    if pending_swara:
                        pairs.append({"swara": pending_swara, "sahitya": ""})
                        pending_swara = None
                        
                    if pairs:
                        if current_section not in data:
                            data[current_section] = []
                        data[current_section].extend(pairs)
                        
                    pairs = []
                    current_section = standard_name
                    is_section_header = True
                    break
                    
        if is_section_header:
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
            if pending_swara:
                pairs.append({"swara": pending_swara, "sahitya": ""})
            pending_swara = row_str
        else:
            if pending_swara:
                pairs.append({"swara": pending_swara, "sahitya": row_str})
                pending_swara = None

    if pending_swara:
        pairs.append({"swara": pending_swara, "sahitya": ""})
        
    if pairs:
        if current_section not in data:
            data[current_section] = []
        data[current_section].extend(pairs)

    return data

if __name__ == "__main__":
    if len(sys.argv) > 1:
        pdf_path = sys.argv[1]
        data = extract_from_pdf(pdf_path)
        print(json.dumps(data, indent=2))
    else:
        print("Please provide a PDF path")
