
import csv
import sys

def analyze_structure(csv_path):
    print(f"Analyzing Structure: {csv_path}")
    
    total = 0
    interment_counts = {}
    null_counts = {
        'grave_dimensions': 0,
        'grave_status': 0,
        'grave_structure_type': 0,
        'inscription_text': 0
    }
    
    # Semantic Anomalies
    long_text_no_interments = []
    
    try:
        with open(csv_path, 'r', encoding='utf-8') as f:
            reader = csv.DictReader(f)
            headers = reader.fieldnames
            
            # Identify max interment index dynamically
            max_interment_idx = 0
            for h in headers:
                if h.startswith('interments_') and '_name_full_name' in h:
                    idx = int(h.split('_')[1])
                    if idx > max_interment_idx:
                        max_interment_idx = idx
            
            print(f"Detailed Headers Found: Up to interments_{max_interment_idx}")

            for row in reader:
                total += 1
                
                # Check metrics
                if not row.get('grave_dimensions_raw_text') and not row.get('grave_dimensions_length_ft'):
                    null_counts['grave_dimensions'] += 1
                
                if not row.get('grave_status'):
                    null_counts['grave_status'] += 1

                if not row.get('grave_structure_type'):
                    null_counts['grave_structure_type'] += 1

                insc_text = row.get('inscription_text', '')
                if not insc_text:
                    null_counts['inscription_text'] += 1
                
                # Count interments
                count = 0
                for i in range(max_interment_idx + 1):
                    key = f'interments_{i}_name_full_name'
                    if row.get(key):
                        count += 1
                
                interment_counts[count] = interment_counts.get(count, 0) + 1
                
                # Heuristic: Long text but 0 interments?
                if len(insc_text) > 50 and count == 0:
                    long_text_no_interments.append({
                        'id': row.get('id'),
                        'len': len(insc_text),
                        'preview': insc_text[:60] + "..."
                    })

        print("\n--- Structural Metrics ---")
        print(f"Total Records: {total}")
        
        print("\nNull Rates (Missing Data):")
        for k, v in null_counts.items():
            print(f"  {k}: {v} ({ (v/total)*100:.1f}%)")

        print("\nInterment Count Distribution:")
        for k in sorted(interment_counts.keys()):
            print(f"  {k} interments: {interment_counts[k]} cards")
            
        print(f"\nPotential Missed Extractions (Long Text > 50 chars, 0 Interments): {len(long_text_no_interments)}")
        if long_text_no_interments:
            print(f"{'ID':<6} | {'Length':<6} | {'Inscription Preview'}")
            print("-" * 80)
            for item in long_text_no_interments:
                print(f"{item['id']:<6} | {item['len']:<6} | {item['preview']}")

    except Exception as e:
        print(f"Error: {e}")

if __name__ == "__main__":
    if len(sys.argv) < 2:
        print("Usage: python analyze_structure.py <path_to_csv>")
        sys.exit(1)
    
    analyze_structure(sys.argv[1])
