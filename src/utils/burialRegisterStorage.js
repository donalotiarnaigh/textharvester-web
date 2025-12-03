const fs = require('fs');
const path = require('path');
const { db } = require('./database');
const logger = require('./logger');

const BURIAL_REGISTER_BASE_DIR = path.join(__dirname, '..', '..', 'data', 'burial_register');

function padPageNumber(pageNumber) {
  if (pageNumber === null || pageNumber === undefined) {
    return '000';
  }

  const parsedNumber = Number.parseInt(pageNumber, 10);
  const pageValue = Number.isNaN(parsedNumber) ? pageNumber : parsedNumber;

  return String(pageValue).padStart(3, '0');
}

async function storePageJSON(pageData, provider, volumeId, pageNumber) {
  const paddedPage = padPageNumber(pageNumber);
  const pagesDir = path.join(BURIAL_REGISTER_BASE_DIR, volumeId, 'pages', provider);
  await fs.promises.mkdir(pagesDir, { recursive: true });

  const filePath = path.join(pagesDir, `page_${paddedPage}.json`);
  await fs.promises.writeFile(filePath, JSON.stringify(pageData, null, 2), 'utf-8');
  logger.info(`Stored burial register page JSON at ${filePath}`);

  return filePath;
}

function buildBurialEntryParams(entry) {
  const fileName = entry.fileName || entry.file_name || null;
  const pageNumber = entry.page_number !== undefined && entry.page_number !== null
    ? Number.parseInt(entry.page_number, 10)
    : null;
  const rowIndex = entry.row_index_on_page !== undefined && entry.row_index_on_page !== null
    ? Number.parseInt(entry.row_index_on_page, 10)
    : null;

  const uncertaintyFlags = Array.isArray(entry.uncertainty_flags)
    ? JSON.stringify(entry.uncertainty_flags)
    : entry.uncertainty_flags === undefined || entry.uncertainty_flags === null
      ? JSON.stringify([])
      : typeof entry.uncertainty_flags === 'string'
        ? entry.uncertainty_flags
        : JSON.stringify([]);

  return [
    entry.volume_id || null,
    pageNumber,
    rowIndex,
    entry.entry_id || null,
    entry.entry_no_raw || null,
    entry.name_raw || null,
    entry.abode_raw || null,
    entry.burial_date_raw || null,
    entry.age_raw || null,
    entry.officiant_raw || null,
    entry.marginalia_raw || null,
    entry.extra_notes_raw || null,
    entry.row_ocr_raw || null,
    entry.parish_header_raw || null,
    entry.county_header_raw || null,
    entry.year_header_raw || null,
    entry.model_name || null,
    entry.model_run_id || null,
    uncertaintyFlags,
    fileName,
    entry.ai_provider || null,
    entry.prompt_template || null,
    entry.prompt_version || null
  ];
}

async function storeBurialRegisterEntry(entry) {
  if (!entry || typeof entry !== 'object') {
    throw new Error('Entry data is required for storage');
  }

  const sql = `
    INSERT INTO burial_register_entries (
      volume_id,
      page_number,
      row_index_on_page,
      entry_id,
      entry_no_raw,
      name_raw,
      abode_raw,
      burial_date_raw,
      age_raw,
      officiant_raw,
      marginalia_raw,
      extra_notes_raw,
      row_ocr_raw,
      parish_header_raw,
      county_header_raw,
      year_header_raw,
      model_name,
      model_run_id,
      uncertainty_flags,
      file_name,
      ai_provider,
      prompt_template,
      prompt_version
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `;

  const params = buildBurialEntryParams(entry);

  return new Promise((resolve, reject) => {
    db.run(sql, params, function(err) {
      if (err) {
        logger.error('Error storing burial register entry:', err);
        reject(err);
        return;
      }
      logger.info(`Successfully stored burial register entry with ID: ${this.lastID}`);
      resolve(this.lastID);
    });
  });
}

module.exports = {
  storePageJSON,
  storeBurialRegisterEntry
};
