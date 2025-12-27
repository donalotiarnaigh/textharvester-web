#!/usr/bin/env node

/**
 * Test Mistral OCR API with structured extraction using JSON schema
 * 
 * Usage:
 *   MISTRAL_API_KEY=your_key node scripts/test_mistral_ocr_structured.js <pdf_path>
 */

const fs = require('fs');
const path = require('path');

// Check for API key
const apiKey = process.env.MISTRAL_API_KEY;

if (!apiKey) {
    console.error('Error: MISTRAL_API_KEY environment variable not set');
    process.exit(1);
}

// Parse command line arguments
const args = process.argv.slice(2);
if (args.length < 1) {
    console.error('Usage: node test_mistral_ocr_structured.js <pdf_path>');
    console.error('Example: node test_mistral_ocr_structured.js "sample_data/source_sets/grave_cards/Section A_3.PDF"');
    process.exit(1);
}

const pdfPath = args[0];

// Encode PDF file to base64
function encodeFile(filePath) {
    const fileBuffer = fs.readFileSync(filePath);
    const base64Pdf = fileBuffer.toString('base64');
    return base64Pdf;
}

// Grave card schema
const graveCardSchema = {
    "$schema": "http://json-schema.org/draft-07/schema#",
    "title": "Grave Record Card",
    "description": "Schema for genealogical and plot data extracted from historical Grave Record Cards",
    "type": "object",
    "required": ["location", "grave"],
    "properties": {
        "card_metadata": {
            "type": "object",
            "properties": {
                "source_reference": {
                    "type": "string",
                    "description": "filename or id"
                },
                "card_version": {
                    "type": "string"
                },
                "notes": {
                    "type": "string"
                }
            }
        },
        "location": {
            "type": "object",
            "required": ["section", "grave_number"],
            "properties": {
                "section": {
                    "type": "string"
                },
                "grave_number": {
                    "type": ["string", "number"],
                    "description": "The extracted grave number, may differ from card number"
                },
                "plot_identifier": {
                    "type": "string"
                }
            }
        },
        "grave": {
            "type": "object",
            "properties": {
                "number_buried": {
                    "type": ["number", "string"]
                },
                "status": {
                    "type": "string",
                    "enum": ["occupied", "vacant", "unknown"],
                    "default": "unknown"
                },
                "description_of_grave": {
                    "type": "string",
                    "description": "e.g. Headstone"
                },
                "structure_type": {
                    "type": "string"
                },
                "dimensions": {
                    "type": "object",
                    "properties": {
                        "raw_text": {
                            "type": "string"
                        },
                        "length_ft": {
                            "type": "number"
                        },
                        "width_ft": {
                            "type": "number"
                        },
                        "height_ft": {
                            "type": "number"
                        },
                        "unit": {
                            "type": "string"
                        }
                    }
                },
                "plot_owned_by": {
                    "type": "string"
                },
                "comments": {
                    "type": "string"
                }
            }
        },
        "interments": {
            "type": "array",
            "items": {
                "type": "object",
                "required": ["name"],
                "properties": {
                    "sequence_number": {
                        "type": "number"
                    },
                    "name": {
                        "type": "object",
                        "properties": {
                            "surname": {
                                "type": "string"
                            },
                            "given_names": {
                                "type": "string"
                            },
                            "full_name": {
                                "type": "string"
                            }
                        }
                    },
                    "date_of_death": {
                        "type": "object",
                        "properties": {
                            "iso": {
                                "type": "string",
                                "format": "date"
                            },
                            "raw_text": {
                                "type": "string"
                            },
                            "certainty": {
                                "type": "string",
                                "enum": ["certain", "estimated", "uncertain"]
                            }
                        }
                    },
                    "date_of_burial": {
                        "type": "object",
                        "properties": {
                            "iso": {
                                "type": "string",
                                "format": "date"
                            },
                            "raw_text": {
                                "type": "string"
                            }
                        }
                    },
                    "age_at_death": {
                        "type": ["number", "string"]
                    },
                    "notes": {
                        "type": "string"
                    }
                }
            }
        },
        "inscription": {
            "type": "object",
            "properties": {
                "text": {
                    "type": "string"
                },
                "scripture_or_quote_refs": {
                    "type": "array",
                    "items": {
                        "type": "string"
                    }
                },
                "notes": {
                    "type": "string"
                }
            }
        },
        "sketch": {
            "type": "object",
            "properties": {
                "present": {
                    "type": "boolean"
                },
                "description": {
                    "type": "string"
                }
            }
        }
    }
};

// Main execution
async function main() {
    try {
        console.log(`Processing: ${pdfPath}`);
        console.log('Encoding PDF to base64...');

        const base64File = encodeFile(pdfPath);

        console.log('Calling Mistral OCR API with structured extraction...');

        const response = await fetch('https://api.mistral.ai/v1/ocr', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${apiKey}`
            },
            body: JSON.stringify({
                model: 'mistral-ocr-latest',
                document: {
                    type: 'document_url',
                    document_url: `data:application/pdf;base64,${base64File}`
                },
                document_annotation_format: {
                    type: 'json_schema',
                    json_schema: {
                        name: 'GraveRecordCard',
                        schema: graveCardSchema
                    }
                }
            })
        });

        if (!response.ok) {
            const errorText = await response.text();
            throw new Error(`API request failed: ${response.status} ${response.statusText}\n${errorText}`);
        }

        const result = await response.json();

        console.log('\n=== MISTRAL OCR STRUCTURED RESULT ===\n');
        console.log(JSON.stringify(result, null, 2));

        // Save result to file
        const outputPath = path.join(__dirname, '../mistral_ocr_structured_result.json');
        fs.writeFileSync(outputPath, JSON.stringify(result, null, 2));
        console.log(`\n\nResult saved to: ${outputPath}`);

    } catch (error) {
        console.error('Error:', error.message);
        process.exit(1);
    }
}

main();
