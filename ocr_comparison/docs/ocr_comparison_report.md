# OCR Comparison Report

**Generated:** 2025-12-18T17:40:55.679Z

## Summary

- Mistral files: 5
- GPT-5.1 files: 5
- Common files: 5

### Mistral API Test Results

**Tested:** Mistral OCR API with multiple approaches for structured extraction

**Finding:** Mistral OCR API provides **OCR-only** (markdown text per page), **not structured data extraction** like GPT-5.1.

- ✅ **Basic OCR works**: Returns markdown text per page with good accuracy
- ❌ **Structured extraction not supported**: Tested both `document_annotation_format` and `bbox_annotation_format` with JSON schema - both only return OCR text
- 📊 **Output format**: Returns `pages[]` array with markdown, images, tables, hyperlinks, dimensions per page
- 💡 **Note**: The `json_schema` mode mentioned in Mistral docs applies to their **chat/completion API**, not the OCR endpoint
- 🔧 **Scripts created**: 
  - [`test_mistral_ocr.js`](file:///Users/danieltierney/projects/textharvester-web/scripts/test_mistral_ocr.js) - Basic OCR
  - [`test_mistral_ocr_structured.js`](file:///Users/danieltierney/projects/textharvester-web/scripts/test_mistral_ocr_structured.js) - Structured extraction attempt (document_annotation_format)
  - [`test_mistral_bbox.js`](file:///Users/danieltierney/projects/textharvester-web/scripts/test_mistral_bbox.js) - Structured extraction attempt (bbox_annotation_format)

**Conclusion:** For structured grave card data, a two-stage pipeline would be needed:
1. **Mistral OCR API** → extract markdown text (fast/cheap)
2. **Mistral Chat API or GPT-5.1** → structure the text into schema (accurate extraction)

This hybrid approach could potentially be faster/cheaper than GPT-5.1 vision API, but requires benchmarking.

## File-by-File Comparison

### Section_A_2

- **Mistral Directory**: `Section A_2.PDF`
- **GPT-5.1 Filename**: `Section_A_2_1766078700749.PDF`

#### Mistral OCR Output
```
SECTION: A
GRAVE NO: 2
NO. WARREN:
NAMES OF DECEASED:
DATES OF DEATH:

DATES OF EARIAL:
DEPOSITIVE OF GRAVE: Plot measuring 14.6" x 12'.0"

PLOT OWNED:
CONTENTS:
THIS PLOT IS VACANT

INSCRIPTION:
SKETCH:
```

#### GPT-5.1 Structured Output
```json
{
  "card_metadata": {
    "source_reference": "",
    "card_version": "",
    "notes": ""
  },
  "location": {
    "section": "A",
    "grave_number": "2",
    "plot_identifier": ""
  },
  "grave": {
    "number_buried": "",
    "status": "vacant",
    "description_of_grave": "Plot measuring 14'.6\" x 12'. 0\"",
    "structure_type": "",
    "dimensions": {
      "raw_text": "Plot measuring 14'.6\" x 12'. 0\"",
      "length_ft": 14.5,
      "width_ft": 12,
      "height_ft": null,
      "unit": "ft"
    },
    "plot_owned_by": "",
    "comments": "This plot is vacant"
  },
  "interments": [],
  "inscription": {
    "text": "",
    "scripture_or_quote_refs": [],
    "notes": ""
  },
  "sketch": {
    "present": false,
    "description": ""
  },
  "fileName": "Section_A_2_1766078700749.PDF",
  "ai_provider": "openai",
  "model_version": "gpt-5.1",
  "prompt_template": "graveCard",
  "prompt_version": "1.0.0",
  "source_type": "grave_record_card"
}
```

---

### Section_A_3

- **Mistral Directory**: `Section A_3.PDF`
- **GPT-5.1 Filename**: `Section_A_3_1766078700754.PDF`

#### Mistral OCR Output
```
|  SECTION: | GRAVE NO: | BO. BURIED:  |
| --- | --- | --- |
|  A | 3 | 4  |
|  NAMES OF DECEASED: |   | DATES OF DEATH  |
|  SURNAME
1. GRAY
4. HOWARD
2. GRAY
3. GRAY | CHRISTIAN NAME
1. CAPT. R.T.
4. ANNE
2. JANE ALICIA
RICHARD REEVES | 1. 12TH SEPT. 1904
28TH FEB. 23YRS
2. 22ND JULY 1879
MAY 18TH 1904  |
|  DATES OF BURIAL: | DESCRIPTION OF GRAVE:  |   |
|  1. SEPTEMBER 15TH 1904
2.
3. MAY 20TH 1904
4. | RAILED IN 82 HEADSTONES
14' X 12'  |   |
|  PLOT OWNED BY: | CONTENTS:  |   |
|  CAPTAIN R.T. GRAY | PLOT WAS BOUGHT IN 1879  |   |

INSCRIPTION:

(1st) R.T.S

IN MEMORY OF CAPTAIN R.T. GRAY OF LOTA VILLE DIED 12TH SEPT. 1904 AGED 76 YEARS PEACE PERFECT PEACE IN THIS DARK WORLD OF SUN THE VOICE OF SESUS WHISPERS PEACE WITHIN

(2nd) J.A.S. DMC CARTHY

JANE ALICIA GRAY WIFE OF CAPT. R.T. GRAY LOTA VILLE WHO DEPARTED THIS LIFE JULY 22ND 1879

IN SURE AND CERTAIN HOPE OF THE RESURRECTION TO ETERNAL LIFE THROUGH OUR LORD SESUS CHRIST

"AS FOR ME, I WILL BEHOLD THE PRESENCE IN RIGHTEOUSNESS AND WHEN I AWAKE UP AFTER THE LIKENESS, I SHALL BE SATISFIED" PSALMXVII.16

THIS MONUMENT WAS ERECTED BY A FOND HUSBAND AND CHILDREN IN LOVING REMEMBRANCE OF A GOOD WIFE AND MOTHER

G.

SKETCH

G. 5

G. 5
```

#### GPT-5.1 Structured Output
```json
{
  "card_metadata": {
    "notes": "Green ink additions appear to be later annotations."
  },
  "location": {
    "section": "A",
    "grave_number": "3",
    "plot_identifier": "4"
  },
  "grave": {
    "number_buried": "4",
    "status": "occupied",
    "description_of_grave": "RAILED IN 2 HEADSTONES 14' X 12'",
    "dimensions": {
      "raw_text": "14' X 12'"
    },
    "plot_owned_by": "CAPTAIN R.T. GRAY",
    "comments": "PLOT WAS BOUGHT IN 1879"
  },
  "interments": [
    {
      "sequence_number": 1,
      "name": {
        "surname": "Gray",
        "given_names": "Capt. R.T.",
        "full_name": "Capt. R.T. Gray"
      },
      "date_of_death": {
        "iso": "1904-09-12",
        "raw_text": "12TH SEPT. 1904",
        "certainty": "certain"
      },
      "date_of_burial": {
        "iso": "1904-09-15",
        "raw_text": "SEPTEMBER 15TH 1904"
      },
      "age_at_death": "76 years",
      "notes": "OF LOTA VILLE"
    },
    {
      "sequence_number": 2,
      "name": {
        "surname": "Gray",
        "given_names": "Jane Alicia",
        "full_name": "Jane Alicia Gray"
      },
      "date_of_death": {
        "iso": "1879-07-22",
        "raw_text": "22ND July 1879",
        "certainty": "certain"
      },
      "date_of_burial": {
        "raw_text": ""
      },
      "age_at_death": "",
      "notes": "WIFE OF CAPT R.T. GRAY|LOTA VILLE"
    },
    {
      "sequence_number": 3,
      "name": {
        "surname": "GRAY",
        "given_names": "RICHARD REEVES",
        "full_name": "RICHARD REEVES GRAY"
      },
      "date_of_death": {
        "iso": "1904-05-18",
        "raw_text": "MAY 18TH 1904",
        "certainty": "certain"
      },
      "date_of_burial": {
        "iso": "1904-05-20",
        "raw_text": "MAY 20TH 1904"
      },
      "age_at_death": "",
      "notes": ""
    },
    {
      "sequence_number": 4,
      "name": {
        "surname": "Howard",
        "given_names": "Anne",
        "full_name": "Anne Howard"
      },
      "date_of_death": {
        "raw_text": "28TH Feb. 23 yrs",
        "certainty": "uncertain"
      },
      "date_of_burial": {
        "raw_text": ""
      },
      "age_at_death": "23 yrs",
      "notes": ""
    }
  ],
  "inscription": {
    "text": "(1st) R.T.G|IN MEMORY OF|CAPTAIN R.T. GRAY|OF LOTA VILLE|DIED 12TH SEPT. 1904|AGED 76 YEARS|PEACE PERFECT PEACE|IN THIS DARK WORLD OF SIN|THE VOICE OF JESUS|WHISPERS PEACE WITHIN|(2nd) J.A.G D McCARTHY|JANE ALICIA GRAY|WIFE OF CAPT R.T. GRAY|LOTA VILLE|WHO DEPARTED THIS LIFE|July 22ND 1879|IN SURE AND CERTAIN HOPE|THE RESURRECTION TO ETERNAL LIFE|THROUGH OUR LORD JESUS CHRIST|AS FOR ME, I WILL BEHOLD THY|PRESENCE IN RIGHTEOUSNESS AND|WHEN I AWAKE UP AFTER THY|LIKENESS, I SHALL BE SATISFIED\"|PSALM XVII. 16|THIS MONUMENT WAS ERECTED|BY A FOND HUSBAND AND CHILDREN|IN LOVING REMEMBRANCE OF|A GOOD WIFE AND MOTHER",
    "scripture_or_quote_refs": [
      "PSALM XVII. 16"
    ]
  },
  "sketch": {
    "present": true,
    "description": "Sketch of an upright headstone monument on a multi-tiered base."
  },
  "fileName": "Section_A_3_1766078700754.PDF",
  "ai_provider": "openai",
  "model_version": "gpt-5.1",
  "prompt_template": "graveCard",
  "prompt_version": "1.0.0",
  "source_type": "grave_record_card"
}
```

---

### Section_A_4

- **Mistral Directory**: `Section A_4.PDF`
- **GPT-5.1 Filename**: `Section_A_4_1766078700741.PDF`

#### Mistral OCR Output
```
SECTION: A
GRAVE NO: 4
NO. BURIED: --

|  NAMES OF DECEASED: | DATES OF DEATH  |
| --- | --- |
|  -- | --  |
|  DATES OF BURIAL: | DESCRIPTION OF GRAVE:  |
| --- | --- |
|  -- | 13' x 12'  |
|  PLOT OWNED BY: | COMMENTS:  |
| --- | --- |
|  -- | THIS PLOT IS VACANT ☑  |

INSCRIPTION:
SKETCH:
```

#### GPT-5.1 Structured Output
```json
{
  "location": {
    "section": "A",
    "grave_number": "4"
  },
  "grave": {
    "number_buried": "-",
    "status": "vacant",
    "description_of_grave": "13' x 12'",
    "comments": "This plot is vacant"
  },
  "interments": [],
  "inscription": {
    "text": ""
  },
  "sketch": {
    "present": false
  },
  "fileName": "Section_A_4_1766078700741.PDF",
  "ai_provider": "openai",
  "model_version": "gpt-5.1",
  "prompt_template": "graveCard",
  "prompt_version": "1.0.0",
  "source_type": "grave_record_card"
}
```

---

### Section_A_5

- **Mistral Directory**: `Section A_5.PDF`
- **GPT-5.1 Filename**: `Section_A_5_1766078700745.PDF`

#### Mistral OCR Output
```
|  SECTION: | GRAVE NO: | NO. DURIED:  |
| --- | --- | --- |
|  A | 5 | —  |
|  NAMES OF DECEASED: | DATES OF DEATH  |   |
|  — | — | —  |
|  DATES OF BURIAL: | DESCRIPTION OF GRAVE:  |   |
|  — | 12' x 12'  |   |
|  PLOT (WEED BY): | COMMENTS:  |   |
|  — | THIS PLOT IS VACANT ☑  |   |

|  INSCRIPTION: | SKETCH:  |
| --- | --- |
|  |   |
```

#### GPT-5.1 Structured Output
```json
{
  "location": {
    "section": "A",
    "grave_number": "5"
  },
  "grave": {
    "number_buried": "-",
    "status": "vacant",
    "description_of_grave": "12' x 12'",
    "plot_owned_by": "-",
    "comments": "THIS PLOT IS VACANT ✓"
  },
  "interments": [],
  "inscription": {
    "text": ""
  },
  "sketch": {
    "present": false
  },
  "fileName": "Section_A_5_1766078700745.PDF",
  "ai_provider": "openai",
  "model_version": "gpt-5.1",
  "prompt_template": "graveCard",
  "prompt_version": "1.0.0",
  "source_type": "grave_record_card"
}
```

---

### Section_A_6

- **Mistral Directory**: `Section A_6.PDF`
- **GPT-5.1 Filename**: `Section_A_6_1766078700757.PDF`

#### Mistral OCR Output
```
AFIRST CARD

SECTION:
A

GRAVE NO:
6

NO. BURIED:
6

NAMES OF DECEASED:

|  SURNAME | CHRISTIAN NAME | DATE OF DEATH  |
| --- | --- | --- |
|  1. HIGHET | 1. SEANNIE | 1. 23rd JAN. 1886  |
|  2. HIGHET | 2. JOHN | 2. 2nd JULY 1911  |
|  3. HIGHET | 3. MARY | 3. 8TH APRIL 1936  |
|  4. HIGHET (LOGAN) | 4. ELIZABETH | 4. 9TH AUG. 1957  |
|  5. HIGHET (ATKINS) | 5. MADGE | 5. 23rd FEB. 1900  |
|  6. HIGHET | 6. SARAH | 6. 22nd DEC. 1900  |

DATES OF BURIAL:
1. 5TH JULY 1911
2. 11TH APRIL 1936
3. 12TH AUGUST 1957
4. 5. 26TH FEB. 1900 / AGED 25

DESCRIPTION OF GRAVE:
KERB &amp; MONUMENT
12' X 8'

PLOT OWNED BY:
JOHN HIGHET

PLOT WAS BOUGHT
FEBRUARY 21ST 1886

INSCRIPTION:
ERECTED
By
JOHN HIGHET
IN LOVING MEMORY OF
HIS DAUGHTER
JEANNLE
WHO DIED
JANUARY 23RD 1886
AGED 23 YEARS
THE ABOVE
JOHN HIGHET
DIED 2ND JULY 1911
AGED 48 YEARS
“THY WILL BE DONE”
ARRIVED IN CORK 13TH MAR. 1856
“S. S. V. VARDEER”
ALSO HIS WIFE
MARY HIGHET
WHO DIED
8TH APRIL 1936
AGED 95 YEARS
HIS DAUGHTER
ELIZABETH
WIFE OF
JAMES W. LOGAN U.S.A.

WHO DIED 9TH AUGUST 1954
AGED 92 YEARS
ALSO HIS DAUGHTER
MADGE
WIFE OF G. P. ATKINS
WHO DIED 23RD FEB. 1900
AGED 25 YEARS
HIS DAUGHTER SARAH
WIFE OF
JAMES THOMPSON BE.
WHO DIED 22ND DEC. 1900
AT PERTH, WEST AUSTRALIA
18 AGED 37 YEARS
J. H.
SKETCH
```

#### GPT-5.1 Structured Output
```json
{
  "card_metadata": {
    "source_reference": "FIRST CARD",
    "notes": "Some annotations in green ink."
  },
  "location": {
    "section": "A",
    "grave_number": "6",
    "plot_identifier": "6"
  },
  "grave": {
    "number_buried": "6",
    "status": "occupied",
    "description_of_grave": "KERB & MONUMENT",
    "dimensions": {
      "raw_text": "12' x 8'"
    },
    "plot_owned_by": "JOHN HIGHET",
    "comments": "PLOT WAS BOUGHT FEBRUARY 21ST 1886"
  },
  "interments": [
    {
      "sequence_number": 1,
      "name": {
        "surname": "HIGHET",
        "given_names": "JEANNIE",
        "full_name": "JEANNIE HIGHET"
      },
      "date_of_death": {
        "iso": "1886-01-23",
        "raw_text": "23RD JAN. 1886",
        "certainty": "certain"
      },
      "date_of_burial": {
        "raw_text": ""
      },
      "age_at_death": "23 YEARS",
      "notes": ""
    },
    {
      "sequence_number": 2,
      "name": {
        "surname": "HIGHET",
        "given_names": "JOHN",
        "full_name": "JOHN HIGHET"
      },
      "date_of_death": {
        "iso": "1911-07-02",
        "raw_text": "2ND JULY 1911",
        "certainty": "certain"
      },
      "date_of_burial": {
        "iso": "1911-07-05",
        "raw_text": "5TH JULY 1911"
      },
      "age_at_death": "78 YEARS",
      "notes": ""
    },
    {
      "sequence_number": 3,
      "name": {
        "surname": "HIGHET",
        "given_names": "MARY",
        "full_name": "MARY HIGHET"
      },
      "date_of_death": {
        "iso": "1936-04-08",
        "raw_text": "8TH APRIL 1936",
        "certainty": "certain"
      },
      "date_of_burial": {
        "iso": "1936-04-11",
        "raw_text": "11TH APRIL 1936"
      },
      "age_at_death": "95 YEARS",
      "notes": ""
    },
    {
      "sequence_number": 4,
      "name": {
        "surname": "HIGHET (LOGAN)",
        "given_names": "ELIZABETH",
        "full_name": "ELIZABETH HIGHET (LOGAN)"
      },
      "date_of_death": {
        "iso": "1957-08-09",
        "raw_text": "9TH AUG. 1957",
        "certainty": "certain"
      },
      "date_of_burial": {
        "iso": "1954-08-12",
        "raw_text": "12TH AUGUST 1954"
      },
      "age_at_death": "92 YEARS",
      "notes": "WIFE OF JAMES W. LOGAN U.S."
    },
    {
      "sequence_number": 5,
      "name": {
        "surname": "HIGHET (ATKINS)",
        "given_names": "WADGE",
        "full_name": "WADGE HIGHET (ATKINS)"
      },
      "date_of_death": {
        "iso": "1900-02-23",
        "raw_text": "23RD FEB. 1900",
        "certainty": "certain"
      },
      "date_of_burial": {
        "iso": "1900-02-26",
        "raw_text": "26TH FEB. 1900/AGED 25"
      },
      "age_at_death": "25 YEARS",
      "notes": "WIFE OF G.P. ATKINS"
    },
    {
      "sequence_number": 6,
      "name": {
        "surname": "HIGHET",
        "given_names": "SARAH",
        "full_name": "SARAH HIGHET"
      },
      "date_of_death": {
        "iso": "1900-12-22",
        "raw_text": "22ND DEC. 1900",
        "certainty": "certain"
      },
      "date_of_burial": {
        "raw_text": ""
      },
      "age_at_death": "37 YEARS",
      "notes": "WIFE OF JAMES THOMPSON BE. WHO DIED 22ND DEC. 1900 AT PERTH, WEST AUSTRALIA"
    }
  ],
  "inscription": {
    "text": "ERECTED|BY|JOHN HIGHET|IN LOVING MEMORY OF|HIS DAUGHTER|JEANNIE|WHO DIED|JANUARY 23RD 1886|AGED 23 YEARS|THE ABOVE|JOHN HIGHET|DIED 2ND JULY 1911|AGED 78 YEARS|\"THY WILL BE DONE\"|ARRIVED IN CORK 13TH MAR. 1856|\"S.S. VJARDEER\"|ALSO HIS WIFE|MARY HIGHET|WHO DIED|8TH APRIL 1936|AGED 95 YEARS|HIS DAUGHTER|ELIZABETH|WIFE OF|JAMES W. LOGAN U.S.|WHO DIED 9TH AUGUST 1957|AGED 92 YEARS|ALSO HIS DAUGHTER|WADGE|WIFE OF G.P. ATKINS|WHO DIED 23RD FEB. 1900|AGED 25 YEARS|HIS DAUGHTER SARAH|WIFE OF|JAMES THOMPSON BE.|WHO DIED 22ND DEC. 1900|AT PERTH, WEST AUSTRALIA|AGED 37 YEARS|J. H.",
    "scripture_or_quote_refs": [],
    "notes": ""
  },
  "sketch": {
    "present": false,
    "description": "SKETCH"
  },
  "fileName": "Section_A_6_1766078700757.PDF",
  "ai_provider": "openai",
  "model_version": "gpt-5.1",
  "prompt_template": "graveCard",
  "prompt_version": "1.0.0",
  "source_type": "grave_record_card"
}
```

---

