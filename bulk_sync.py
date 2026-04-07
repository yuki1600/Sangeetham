import glob
import json
import os
from pdf_json_parser import extract_from_pdf

def sync_all_json_files():
    json_files = glob.glob('Songs/*.json')
    success_count = 0
    error_count = 0
    
    for json_path in json_files:
        try:
            with open(json_path, 'r', encoding='utf-8') as f:
                data = json.load(f)
                
            pdf_path = data.get('pdfPath')
            if not pdf_path or not os.path.exists(pdf_path):
                print(f"Skipping {json_path}: PDF path missing or invalid ({pdf_path})")
                continue
                
            # Run the extraction directly
            parsed_sections = extract_from_pdf(pdf_path)
            
            # Format to the Editor schema
            new_composition = []
            for sec_name, content_list in parsed_sections.items():
                new_composition.append({
                    "section": sec_name,
                    "content": content_list
                })
                
            # Replace composition only
            data['composition'] = new_composition
            
            # Write back
            with open(json_path, 'w', encoding='utf-8') as f:
                json.dump(data, f, indent=4)
                
            success_count += 1
            
        except Exception as e:
            print(f"Error processing {json_path}: {e}")
            error_count += 1

    print(f"Bulk sync completed. Success: {success_count}, Errors: {error_count}")

if __name__ == "__main__":
    sync_all_json_files()
