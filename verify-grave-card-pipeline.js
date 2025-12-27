#!/usr/bin/env node
/**
 * End-to-End Verification Script for Grave Card Pipeline
 * 
 * This script tests the complete grave card processing pipeline:
 * 1. Processes a sample PDF through GraveCardProcessor
 * 2. Validates the response through GraveCardPrompt
 * 3. Stores the result in the database
 * 4. Exports to CSV and verifies the format
 * 
 * Usage:
 *   node verify-grave-card-pipeline.js <path-to-pdf>
 * 
 * Example:
 *   node verify-grave-card-pipeline.js /Users/danieltierney/projects/historic-graves/11_Douglas/sample.pdf
 */

const { processFile } = require('./src/utils/fileProcessing');
const { exportCardsToCsv } = require('./src/utils/graveCardStorage');
const { db } = require('./src/utils/database');
const fs = require('fs').promises;
const path = require('path');

// Configuration
const OUTPUT_CSV = './data/grave_cards_verification_export.csv';
const PROVIDER = process.env.AI_PROVIDER || 'openai'; // Change to 'anthropic' if needed

async function verifyPipeline(pdfPath) {
  console.log('╔════════════════════════════════════════════════════════════════╗');
  console.log('║   Grave Card Pipeline - End-to-End Verification                ║');
  console.log('╚════════════════════════════════════════════════════════════════╝\n');

  // Validate PDF exists
  try {
    await fs.access(pdfPath);
  } catch {
    console.error(`❌ ERROR: PDF file not found: ${pdfPath}`);
    console.error('Please provide a valid path to a 2-page grave card PDF.');
    process.exit(1);
  }

  console.log(`📄 Input PDF: ${path.basename(pdfPath)}`);
  console.log(`🤖 AI Provider: ${PROVIDER}`);
  console.log('\n' + '─'.repeat(70) + '\n');

  try {
    // Step 1: Process the PDF
    console.log('STEP 1: Processing PDF through pipeline...');
    console.log('  → GraveCardProcessor (PDF → stitched image)');
    console.log('  → AI Provider (image → JSON)');
    console.log('  → GraveCardPrompt (validate schema)');
    console.log('  → GraveCardStorage (save to database)\n');

    const startTime = Date.now();
    const result = await processFile(pdfPath, {
      sourceType: 'grave_record_card',
      provider: PROVIDER
    });
    const duration = Date.now() - startTime;

    console.log(`✅ Processing complete in ${duration}ms\n`);

    // Step 2: Verify the result structure
    console.log('STEP 2: Verifying result structure...\n');

    const checks = [
      { name: 'Has location', pass: !!result.location },
      { name: 'Has grave', pass: !!result.grave },
      { name: 'Has interments array', pass: Array.isArray(result.interments) },
      { name: 'Has fileName', pass: !!result.fileName },
      { name: 'Has ai_provider', pass: !!result.ai_provider },
      { name: 'Has source_type', pass: result.source_type === 'grave_record_card' }
    ];

    checks.forEach(check => {
      console.log(`  ${check.pass ? '✓' : '✗'} ${check.name}`);
    });

    const allPassed = checks.every(c => c.pass);
    if (!allPassed) {
      console.error('\n❌ Structure validation failed!');
      process.exit(1);
    }

    console.log('\n✅ Structure validation passed\n');

    // Step 3: Display extracted data
    console.log('STEP 3: Extracted Data Summary...\n');
    console.log(`  Section: ${result.location?.section || 'N/A'}`);
    console.log(`  Grave Number: ${result.location?.grave_number || 'N/A'}`);
    console.log(`  Grave Status: ${result.grave?.status || 'N/A'}`);
    console.log(`  Number of Interments: ${result.interments?.length || 0}`);

    if (result.interments && result.interments.length > 0) {
      console.log('\n  Interments:');
      result.interments.forEach((interment, index) => {
        const name = interment.name?.full_name ||
          `${interment.name?.given_names || ''} ${interment.name?.surname || ''}`.trim() ||
          'Unknown';
        const date = interment.date_of_death?.iso || interment.date_of_death?.raw_text || 'N/A';
        console.log(`    ${index + 1}. ${name} (d. ${date})`);
      });
    }

    if (result.inscription?.text) {
      console.log(`\n  Inscription: ${result.inscription.text.substring(0, 100)}${result.inscription.text.length > 100 ? '...' : ''}`);
    }

    console.log('\n' + '─'.repeat(70) + '\n');

    // Step 4: Verify database entry
    console.log('STEP 4: Verifying database entry...\n');

    const dbCheck = await new Promise((resolve, reject) => {
      db.get(
        'SELECT * FROM grave_cards ORDER BY id DESC LIMIT 1',
        [],
        (err, row) => {
          if (err) reject(err);
          else resolve(row);
        }
      );
    });

    if (!dbCheck) {
      console.error('❌ No entry found in grave_cards table!');
      process.exit(1);
    }

    console.log(`  ✓ Record ID: ${dbCheck.id}`);
    console.log(`  ✓ File Name: ${dbCheck.file_name}`);
    console.log(`  ✓ Section: ${dbCheck.section || 'NULL'}`);
    console.log(`  ✓ Grave Number: ${dbCheck.grave_number || 'NULL'}`);
    console.log(`  ✓ AI Provider: ${dbCheck.ai_provider}`);
    console.log(`  ✓ Processed Date: ${dbCheck.processed_date}`);
    console.log(`  ✓ Data JSON: ${dbCheck.data_json.length} characters`);

    console.log('\n✅ Database entry verified\n');
    console.log('─'.repeat(70) + '\n');

    // Step 5: Test CSV export
    console.log('STEP 5: Testing CSV export...\n');

    const csv = await exportCardsToCsv();

    if (!csv) {
      console.error('❌ CSV export returned empty!');
      process.exit(1);
    }

    const lines = csv.split('\n');
    const headers = lines[0].split(',');

    console.log(`  ✓ CSV generated: ${lines.length - 1} rows`);
    console.log(`  ✓ Columns: ${headers.length}`);

    // Check for interment columns
    const intermentCols = headers.filter(h => h.startsWith('interment_'));
    console.log(`  ✓ Interment columns: ${intermentCols.length}`);

    if (intermentCols.length > 0) {
      console.log('\n  Sample interment columns:');
      intermentCols.slice(0, 5).forEach(col => {
        console.log(`    - ${col}`);
      });
      if (intermentCols.length > 5) {
        console.log(`    ... and ${intermentCols.length - 5} more`);
      }
    }

    // Save CSV to file
    await fs.writeFile(OUTPUT_CSV, csv);
    console.log(`\n  ✓ CSV saved to: ${OUTPUT_CSV}`);

    console.log('\n✅ CSV export verified\n');
    console.log('─'.repeat(70) + '\n');

    // Final summary
    console.log('╔════════════════════════════════════════════════════════════════╗');
    console.log('║                  ✅ ALL VERIFICATIONS PASSED!                  ║');
    console.log('╚════════════════════════════════════════════════════════════════╝\n');

    console.log('Summary:');
    console.log(`  • PDF processed successfully in ${duration}ms`);
    console.log(`  • Database entry created (ID: ${dbCheck.id})`);
    console.log(`  • CSV exported with ${lines.length - 1} records`);
    console.log(`  • Extracted ${result.interments?.length || 0} interment(s)\n`);

    console.log('Next steps:');
    console.log('  1. Review the CSV file: ' + OUTPUT_CSV);
    console.log('  2. Check the database: sqlite3 ./data/memorials.db "SELECT * FROM grave_cards;"');
    console.log('  3. Mark Task 5.2 as complete in docs/grave-card-pipeline/tasks.md\n');

    process.exit(0);

  } catch (error) {
    console.error('\n╔════════════════════════════════════════════════════════════════╗');
    console.error('║                    ❌ VERIFICATION FAILED                      ║');
    console.error('╚════════════════════════════════════════════════════════════════╝\n');
    console.error('Error:', error.message);
    console.error('\nStack trace:');
    console.error(error.stack);
    process.exit(1);
  }
}

// Main execution
const pdfPath = process.argv[2];

if (!pdfPath) {
  console.error('Usage: node verify-grave-card-pipeline.js <path-to-pdf>');
  console.error('\nExample:');
  console.error('  node verify-grave-card-pipeline.js /Users/danieltierney/projects/historic-graves/11_Douglas/sample.pdf');
  process.exit(1);
}

verifyPipeline(pdfPath);
