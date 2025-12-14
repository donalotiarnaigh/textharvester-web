
import csv
import sys

def analyze_coverage(csv_path):
    print(f"Analyzing Coverage: {csv_path}")
    
    records = 0
    unique_files = set()
    unique_ids = set()
    
    try:
        with open(csv_path, 'r', encoding='utf-8') as f:
            reader = csv.DictReader(f)
            for row in reader:
                records += 1
                if row.get('fileName'):
                    unique_files.add(row['fileName'])
                if row.get('id'):
                    unique_ids.add(row['id'])

        print(f"Total Rows in CSV: {records}")
        print(f"Unique File Names: {len(unique_files)}")
        print(f"Unique Database IDs: {len(unique_ids)}")
        
        # Check integrity
        if records == len(unique_files) == len(unique_ids):
            print("\nResult: PERFECT COVERAGE ✅")
            print("1:1 Mapping between Rows, Files, and IDs.")
        else:
            print("\nResult: COVERAGE ANOMALY ⚠️")
            if len(unique_files) < records:
                print(f"  - Duplicate Files detected: {records - len(unique_files)}")
            if len(unique_ids) < records:
                print(f"  - Duplicate IDs detected: {records - len(unique_ids)}")

    except Exception as e:
        print(f"Error: {e}")

if __name__ == "__main__":
    if len(sys.argv) < 2:
        print("Usage: python analyze_coverage.py <path_to_csv>")
        sys.exit(1)
    
    analyze_coverage(sys.argv[1])
