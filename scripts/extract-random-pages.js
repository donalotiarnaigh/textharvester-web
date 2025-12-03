#!/usr/bin/env node

/**
 * Extract 5 random pages from a PDF and convert them to JPG files
 * Usage: node scripts/extract-random-pages.js [pdf-path] [output-dir]
 */

const { exec } = require('child_process');
const { promisify } = require('util');
const fs = require('fs').promises;
const path = require('path');

const execAsync = promisify(exec);

async function getPdfPageCount(pdfPath) {
  try {
    const { stdout } = await execAsync(`pdfinfo "${pdfPath}" | grep Pages`);
    const match = stdout.match(/Pages:\s+(\d+)/);
    if (match) {
      return parseInt(match[1], 10);
    }
    throw new Error('Could not determine page count');
  } catch (error) {
    // Fallback: try pdftocairo to get page count
    try {
      const { stdout } = await execAsync(`pdftocairo -list "${pdfPath}" 2>&1 || echo "0"`);
      // If pdftocairo doesn't support -list, try a different approach
      // Extract first page to test, then count
      const testOutput = await execAsync(`pdftocairo -jpeg -f 1 -l 1 "${pdfPath}" /tmp/test_page 2>&1 || true`);
      // Use pdfinfo if available, otherwise estimate
      const { stdout: info } = await execAsync(`pdfinfo "${pdfPath}" 2>&1 || echo ""`);
      const pageMatch = info.match(/Pages:\s+(\d+)/);
      if (pageMatch) {
        return parseInt(pageMatch[1], 10);
      }
    } catch (e) {
      // If pdfinfo not available, try to extract all and count
    }
    throw new Error('Could not determine page count. Make sure pdfinfo or pdftocairo is installed.');
  }
}

function getRandomPages(totalPages, count = 5) {
  const pages = [];
  while (pages.length < count) {
    const page = Math.floor(Math.random() * totalPages) + 1; // 1-indexed
    if (!pages.includes(page)) {
      pages.push(page);
    }
  }
  return pages.sort((a, b) => a - b);
}

async function extractPage(pdfPath, pageNumber, outputPath) {
  const outputFile = path.join(outputPath, `page_${String(pageNumber).padStart(3, '0')}.jpg`);
  
  // Use pdftocairo to extract specific page
  const command = `pdftocairo -jpeg -scale-to 2048 -f ${pageNumber} -l ${pageNumber} "${pdfPath}" "${outputFile}"`;
  
  try {
    await execAsync(command);
    console.log(`✓ Extracted page ${pageNumber} → ${path.basename(outputFile)}`);
    return outputFile;
  } catch (error) {
    throw new Error(`Failed to extract page ${pageNumber}: ${error.message}`);
  }
}

async function main() {
  const pdfPath = process.argv[2] || '/Users/danieltierney/projects/historic-graves/11_Douglas/data/raw/St Lukes Church_Burial Register_Book1_1840-1893.pdf';
  const outputDir = process.argv[3] || path.join(__dirname, '..', 'test-data', 'burial-register-test-pages');

  // Validate PDF exists
  try {
    await fs.access(pdfPath);
  } catch (error) {
    console.error(`Error: PDF file not found: ${pdfPath}`);
    process.exit(1);
  }

  // Create output directory
  try {
    await fs.mkdir(outputDir, { recursive: true });
    console.log(`Output directory: ${outputDir}`);
  } catch (error) {
    console.error(`Error creating output directory: ${error.message}`);
    process.exit(1);
  }

  console.log(`\nExtracting random pages from: ${path.basename(pdfPath)}\n`);

  try {
    // Get total page count
    console.log('Determining PDF page count...');
    const totalPages = await getPdfPageCount(pdfPath);
    console.log(`Total pages in PDF: ${totalPages}\n`);

    // Select 5 random pages
    const selectedPages = getRandomPages(totalPages, 5);
    console.log(`Selected pages: ${selectedPages.join(', ')}\n`);

    // Extract each page
    const extractedFiles = [];
    for (const pageNumber of selectedPages) {
      const filePath = await extractPage(pdfPath, pageNumber, outputDir);
      extractedFiles.push(filePath);
    }

    console.log(`\n✓ Successfully extracted ${extractedFiles.length} pages`);
    console.log(`\nFiles saved to: ${outputDir}`);
    console.log('\nExtracted files:');
    extractedFiles.forEach(file => {
      console.log(`  - ${path.basename(file)}`);
    });

  } catch (error) {
    console.error(`\nError: ${error.message}`);
    process.exit(1);
  }
}

if (require.main === module) {
  main();
}

module.exports = { extractPage, getRandomPages, getPdfPageCount };

