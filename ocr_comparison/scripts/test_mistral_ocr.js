#!/usr/bin/env node

/**
 * Test Mistral OCR API with structured extraction
 * 
 * Usage:
 *   MISTRAL_API_KEY=your_key node scripts/test_mistral_ocr.js <pdf_path>
 */

const fs = require('fs');
const path = require('path');

// Check for API key
const apiKey = process.env.MISTRAL_API_KEY || '050hgcqokDTRHcZG2XWwoHHIVXWfho5T';

if (!apiKey) {
    console.error('Error: MISTRAL_API_KEY environment variable not set');
    process.exit(1);
}

// Parse command line arguments
const args = process.argv.slice(2);
if (args.length < 1) {
    console.error('Usage: node test_mistral_ocr.js <pdf_path>');
    console.error('Example: node test_mistral_ocr.js "sample_data/source_sets/grave_cards/Section A_3.PDF"');
    process.exit(1);
}

const pdfPath = args[0];

// Encode PDF file to base64
function encodeFile(filePath) {
    const fileBuffer = fs.readFileSync(filePath);
    const base64Pdf = fileBuffer.toString('base64');
    return base64Pdf;
}

// Main execution
async function main() {
    try {
        console.log(`Processing: ${pdfPath}`);
        console.log('Encoding PDF to base64...');

        const base64File = encodeFile(pdfPath);

        console.log('Calling Mistral OCR API (basic OCR without schema)...');

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
                }
            })
        });

        if (!response.ok) {
            const errorText = await response.text();
            throw new Error(`API request failed: ${response.status} ${response.statusText}\n${errorText}`);
        }

        const result = await response.json();

        console.log('\n=== MISTRAL OCR RESULT ===\n');
        console.log(JSON.stringify(result, null, 2));

        // Save result to file
        const outputPath = path.join(__dirname, '../mistral_ocr_result.json');
        fs.writeFileSync(outputPath, JSON.stringify(result, null, 2));
        console.log(`\n\nResult saved to: ${outputPath}`);

    } catch (error) {
        console.error('Error:', error.message);
        process.exit(1);
    }
}

main();
