#!/usr/bin/env node

/**
 * Compare Mistral OCR results with TextHarvester GPT-4 results
 * 
 * Usage:
 *   node scripts/compare_ocr_results.js <mistral_dir> <gpt_results_file>
 */

const fs = require('fs');
const path = require('path');

// Parse command line arguments
const args = process.argv.slice(2);
if (args.length < 2) {
    console.error('Usage: node compare_ocr_results.js <mistral_dir> <gpt_results_file>');
    console.error('Example: node compare_ocr_results.js /path/to/mistral/results /path/to/results.json');
    process.exit(1);
}

const mistralDir = args[0];
const gptResultsFile = args[1];

/**
 * Normalize filename for comparison
 * Mistral uses: "Section A_2.PDF"
 * GPT-4 uses: "Section_A_2_1766078700749.PDF"
 */
function normalizeFilename(filename) {
    // Extract section and number (e.g., "A" and "2")
    const match = filename.match(/Section[\s_]([A-Z])[\s_](\d+)/i);
    if (match) {
        return `Section_${match[1]}_${match[2]}`;
    }
    return filename;
}

/**
 * Load Mistral OCR results from directory structure
 */
function loadMistralResults(baseDir) {
    const results = {};

    // Read all subdirectories (one per PDF)
    const entries = fs.readdirSync(baseDir, { withFileTypes: true });

    for (const entry of entries) {
        if (!entry.isDirectory()) continue;

        const pdfName = entry.name;
        const pdfDir = path.join(baseDir, pdfName);

        // Read markdown.md for OCR text
        const markdownPath = path.join(pdfDir, 'markdown.md');
        const schemaPath = path.join(pdfDir, 'document-annotation.json');

        if (fs.existsSync(markdownPath)) {
            const ocrText = fs.readFileSync(markdownPath, 'utf8');

            // Normalize the key for matching
            const normalizedKey = normalizeFilename(pdfName);

            results[normalizedKey] = {
                originalFilename: pdfName,
                filename: normalizedKey,
                ocrText: ocrText,
                schema: null
            };

            // Note: document-annotation.json appears to be the schema definition, not the extracted data
            if (fs.existsSync(schemaPath)) {
                results[normalizedKey].schemaFile = schemaPath;
            }
        }
    }

    return results;
}

/**
 * Load GPT-4 results from TextHarvester
 */
function loadGPTResults(filePath) {
    const content = fs.readFileSync(filePath, 'utf8');
    const data = JSON.parse(content);

    // Index by normalized filename for easy comparison
    const results = {};

    if (Array.isArray(data)) {
        for (const record of data) {
            const filename = record.file_name || record.filename || 'unknown';
            const normalizedKey = normalizeFilename(filename);
            results[normalizedKey] = record;
        }
    } else if (data.results && Array.isArray(data.results)) {
        for (const record of data.results) {
            const filename = record.file_name || record.filename || 'unknown';
            const normalizedKey = normalizeFilename(filename);
            results[normalizedKey] = record;
        }
    }

    return results;
}

/**
 * Compare results and generate report
 */
function compareResults(mistralResults, gptResults) {
    console.log('\n=== OCR COMPARISON REPORT ===\n');
    console.log(`Mistral Results: ${Object.keys(mistralResults).length} files`);
    console.log(`GPT-4 Results: ${Object.keys(gptResults).length} files`);
    console.log('\n---\n');

    // Find matching files
    const mistralFiles = new Set(Object.keys(mistralResults));
    const gptFiles = new Set(Object.keys(gptResults));

    const commonFiles = [...mistralFiles].filter(f => gptFiles.has(f));
    const mistralOnly = [...mistralFiles].filter(f => !gptFiles.has(f));
    const gptOnly = [...gptFiles].filter(f => !mistralFiles.has(f));

    console.log(`Common files: ${commonFiles.length}`);
    console.log(`Mistral only: ${mistralOnly.length}`);
    console.log(`GPT-4 only: ${gptOnly.length}`);
    console.log('\n---\n');

    // Detailed comparison for each file
    for (const filename of commonFiles.sort()) {
        console.log(`\n### ${filename}\n`);

        const mistral = mistralResults[filename];
        const gpt = gptResults[filename];

        console.log(`**Mistral Directory:** ${mistral.originalFilename}`);
        console.log(`**GPT-4 Filename:** ${gpt.file_name}`);
        console.log('\n**Mistral OCR Text:**');
        console.log(mistral.ocrText);
        console.log('\n**GPT-4 Structured Data:**');
        console.log(JSON.stringify(gpt.data, null, 2));
        console.log('\n---');
    }

    // Summary statistics
    console.log('\n\n=== SUMMARY ===\n');

    // Analyze OCR text quality (basic metrics)
    let totalMistralChars = 0;
    let totalMistralLines = 0;

    for (const result of Object.values(mistralResults)) {
        totalMistralChars += result.ocrText.length;
        totalMistralLines += result.ocrText.split('\n').length;
    }

    console.log(`Mistral - Avg chars per file: ${(totalMistralChars / Object.keys(mistralResults).length).toFixed(0)}`);
    console.log(`Mistral - Avg lines per file: ${(totalMistralLines / Object.keys(mistralResults).length).toFixed(1)}`);

    return {
        mistralCount: mistralFiles.size,
        gptCount: gptFiles.size,
        commonCount: commonFiles.length,
        mistralOnly,
        gptOnly,
        commonFiles
    };
}

// Main execution
try {
    console.log('Loading Mistral OCR results...');
    const mistralResults = loadMistralResults(mistralDir);

    console.log('Loading GPT-4 results...');
    const gptResults = loadGPTResults(gptResultsFile);

    const comparison = compareResults(mistralResults, gptResults);

    // Write detailed report to file
    const reportPath = path.join(__dirname, '../ocr_comparison_report.md');
    const reportStream = fs.createWriteStream(reportPath);

    reportStream.write('# OCR Comparison Report\n\n');
    reportStream.write(`**Generated:** ${new Date().toISOString()}\n\n`);
    reportStream.write(`## Summary\n\n`);
    reportStream.write(`- Mistral files: ${comparison.mistralCount}\n`);
    reportStream.write(`- GPT-4 files: ${comparison.gptCount}\n`);
    reportStream.write(`- Common files: ${comparison.commonCount}\n\n`);

    reportStream.write(`## File-by-File Comparison\n\n`);

    for (const filename of comparison.commonFiles) {
        const mistral = mistralResults[filename];
        const gpt = gptResults[filename];

        reportStream.write(`### ${filename}\n\n`);
        reportStream.write(`- **Mistral Directory**: \`${mistral.originalFilename}\`\n`);
        reportStream.write(`- **GPT-4 Filename**: \`${gpt.file_name}\`\n\n`);
        reportStream.write(`#### Mistral OCR Output\n\`\`\`\n${mistral.ocrText}\n\`\`\`\n\n`);
        reportStream.write(`#### GPT-4 Structured Output\n\`\`\`json\n${JSON.stringify(gpt.data, null, 2)}\n\`\`\`\n\n`);
        reportStream.write(`---\n\n`);
    }

    reportStream.end();

    console.log(`\n\nDetailed report written to: ${reportPath}`);

} catch (error) {
    console.error('Error:', error.message);
    process.exit(1);
}
