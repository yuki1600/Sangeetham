import sys
from pypdf import PdfReader

def parse_preamble(pdf_path):
    reader = PdfReader(pdf_path)
    lines = []
    for page in reader.pages:
        text = page.extract_text()
        if text:
            lines.extend(text.split('\n'))

    KNOWN_SECTIONS = ["pallavi", "anupallavi", "charanam", "chitteswaram", "chittaiswaram", 
                      "muktayi swaram", "ettugada pallavi", "ettugada swaram", 
                      "madhyamakala sahityam"]
                      
    discovered_sections = []
    
    for row in lines:
        row_str = row.strip().lower()
        row_clean = row_str.replace(":", "").replace(" ", "")
        
        for sec in KNOWN_SECTIONS:
            sec_clean = sec.replace(" ", "")
            if row_clean.startswith(sec_clean):
                if sec not in discovered_sections:
                    discovered_sections.append(sec)

    print("Discovered:", discovered_sections)

if __name__ == "__main__":
    parse_preamble(sys.argv[1])
