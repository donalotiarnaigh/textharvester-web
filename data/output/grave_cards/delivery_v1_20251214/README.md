# St Luke's Douglas - Grave Card Dataset - Section A

**Delivery Date:** 2025-12-14
**Source:** TextHarvester Web Extraction (GPT-5.1)

## Contents
*   **schema.json**: Formal JSON schema definition used for extraction and validation.
*   **grave_cards_section_a_openai.csv**: The complete dataset containing 93 records extracted from Section A PDF cards.
*   **STATISTICS.md**: Detailed breakdown of data quality, coverage, and metrics.

## Notes
*   **Identifiers:** `file_name` is the unique stable identifier for these records. `location_grave_number` is extracted text and may contain ranges (e.g., "26+27") or differences from the card number.
*   **Flattening:** This CSV uses a "wide" format. Interments are flattened into columns `interments_0_...`, `interments_1_...`, etc. The analysis detected up to 9 interments on a single card.
