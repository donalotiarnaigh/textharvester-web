# Grave Card Section A Statistics
**Date:** 2025-12-14
**Dataset:** Grave Record Cards (Section A)

## 1. Volume Metrics
*   **Total Input Files:** 93
*   **Total Output Records:** 93
*   **Coverage:** 100% (No missing files)
*   **Unique IDs:** 93 (0 Duplicates)

## 2. Interment Distribution
Breakdown of number of interments found per card:
*   **0 Interments:** 6 cards (Vacant/Metadata only)
*   **1 Interment:** 17 cards
*   **2 Interments:** 30 cards (Most common)
*   **3 Interments:** 11 cards
*   **4 Interments:** 13 cards
*   **5+ Interments:** 16 cards

## 3. Data Quality & Completeness
*   **Grave Status:** 100% Populated (0% Null)
*   **Structure Type:** 96.8% Null (Field rarely identified)
*   **Inscription Text:** 67.7% Populated (32.3% Null/Empty)
*   **Dimensions:** 65.6% Populated (34.4% Null)

## 4. Identity Analysis
*   **Identity Match Rate:** 11.8%
    *   *Definition:* Percentage of cards where `location_grave_number` exactly matches the digits in the filename.
    *   *Insight:* Low match rate confirms that filenames (e.g., `Section_A_28`) usually refer to Card Numbers, which differ from the physical Grave Numbers (e.g., `26+27`) inscribed on the card.
    *   *Conclusion:* **File Name** is the correct unique identifier for this dataset.

## 5. Validation Logic
*   **Constraint Used:** `UNIQUE(file_name)`
*   **Outcome:** 0 Rejections, 0 Conflicts.
