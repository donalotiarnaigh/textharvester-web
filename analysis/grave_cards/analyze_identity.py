
import csv
import re
import sys
import os

def check_identity(csv_path):
    print(f"Analyzing Identity: {csv_path}")
    
    total = 0
    matches = 0
    mismatches = 0
    errors = []

    # Regex to extract number from filename like "Section_A_85_123456.pdf" -> "85"
    # Adjust regex based on actual filename format in CSV
    filename_pattern = re.compile(r'Section_[A-Z]_(\d+)_')

    try:
        with open(csv_path, 'r', encoding='utf-8') as f:
            reader = csv.DictReader(f)
            
            for row in reader:
                total += 1
                file_name = row.get('file_name', '')
                ai_grave_num = row.get('location_grave_number', '').strip()
                
                # Extract reliable number from filename
                match = filename_pattern.search(file_name)
                if not match:
                    # Try alternate pattern if needed, or log warning
                    # Some files might be "Section A_31.pdf" logic from early manual tests vs "Section_A_85..."
                    match_alt = re.search(r'Section A_(\d+)', file_name)
                    if match_alt:
                        file_num = match_alt.group(1)
                    else:
                        errors.append({'id': row.get('id'), 'file': file_name, 'error': 'Could not extract number from filename'})
                        continue
                else:
                    file_num = match.group(1)

                # Normalize specific edge cases if needed (e.g. 08 vs 8)
                # Compare
                if ai_grave_num == file_num:
                    matches += 1
                else:
                    mismatches += 1
                    errors.append({
                        'id': row.get('id'),
                        'file': file_name,
                        'expected': file_num,
                        'found': ai_grave_num,
                        'status': row.get('grave_status')
                    })
        
        print(f"Total Records: {total}")
        print(f"Matches: {matches}")
        print(f"Mismatches: {mismatches}")
        print(f"Accuracy: {(matches/total)*100:.2f}%")
        
        if mismatches > 0:
            print("\n--- Mismatch Details ---")
            print(f"{'ID':<6} | {'Filename':<35} | {'Exp':<5} | {'Found':<10} | {'Status'}")
            print("-" * 80)
            for e in errors:
                if 'expected' in e:
                    print(f"{e['id']:<6} | {e['file']:<35} | {e['expected']:<5} | {e['found']:<10} | {e['status']}")
                else:
                    print(f"{e['id']:<6} | {e['file']:<35} | PARSE ERROR: {e['error']}")

    except Exception as e:
        print(f"Error processing CSV: {e}")

if __name__ == "__main__":
    if len(sys.argv) < 2:
        print("Usage: python analyze_identity.py <path_to_csv>")
        sys.exit(1)
    
    check_identity(sys.argv[1])
