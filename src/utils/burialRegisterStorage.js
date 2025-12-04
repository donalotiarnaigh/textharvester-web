const fs = require('fs');
const path = require('path');
const { db } = require('./database');
const logger = require('./logger');
const config = require('../../config.json');
const { generateEntryId } = require('./burialRegisterFlattener');

const burialRegisterConfig = config.burialRegister || {};

/**
 * Resolve the base directory for burial register outputs.
 * @returns {string} Absolute path to the burial register base directory
 */
function getBurialRegisterBaseDir() {
  const outputDir = process.env.BURIAL_REGISTER_OUTPUT_DIR || burialRegisterConfig.outputDir;

  if (outputDir) {
    return path.resolve(outputDir);
  }

  return path.join(__dirname, '..', '..', 'data', 'burial_register');
}

/**
 * Pad the page number to a three digit string.
 * @param {number|string|null} pageNumber Page number to pad
 * @returns {string} Three-character padded page number
 */
function padPageNumber(pageNumber) {
  if (pageNumber === null || pageNumber === undefined) {
    return '000';
  }

  const parsedNumber = Number.parseInt(pageNumber, 10);
  const pageValue = Number.isNaN(parsedNumber) ? pageNumber : parsedNumber;

  return String(pageValue).padStart(3, '0');
}

/**
 * Persist validated burial register page JSON to disk.
 * @param {Object} pageData Validated page data
 * @param {string} provider AI provider name
 * @param {string} volumeId Volume identifier
 * @param {number|string} pageNumber Page number
 * @returns {Promise<string>} Absolute path to the stored JSON file
 */
async function storePageJSON(pageData, provider, volumeId, pageNumber) {
  if (!pageData || typeof pageData !== 'object') {
    throw new Error('pageData is required to store burial register JSON');
  }
  if (!provider) {
    throw new Error('provider is required to store burial register JSON');
  }
  if (!volumeId) {
    throw new Error('volumeId is required to store burial register JSON');
  }
  if (pageNumber === null || pageNumber === undefined) {
    throw new Error('pageNumber is required to store burial register JSON');
  }

  const paddedPage = padPageNumber(pageNumber);
  const pagesDir = path.join(getBurialRegisterBaseDir(), volumeId, 'pages', provider);
  
  try {
    await fs.promises.mkdir(pagesDir, { recursive: true });
  } catch (err) {
    logger.error(`Error creating directory for burial register page JSON: ${pagesDir}`, err);
    throw err;
  }

  const filePath = path.join(pagesDir, `page_${paddedPage}.json`);
  await fs.promises.writeFile(filePath, JSON.stringify(pageData, null, 2), 'utf-8');
  logger.info(`Stored burial register page JSON: volume_id=${volumeId}, page_number=${pageNumber}, provider=${provider}, path=${filePath}`);

  return filePath;
}

/**
 * Extract page number from filename if it matches the expected pattern.
 * Pattern: page_{NNN}.jpg, page_{NNN}.png, etc. where NNN is 1-3 digits
 * @param {string} fileName Filename to extract page number from
 * @returns {number|null} Extracted page number or null if pattern doesn't match
 */
function extractPageNumberFromFilename(fileName) {
  if (!fileName || typeof fileName !== 'string') {
    return null;
  }

  // Match pattern: page_ followed by 1-3 digits, then extension
  const match = fileName.match(/page_(\d{1,3})\.(jpg|png|jpeg)/i);
  if (match && match[1]) {
    const pageNumber = Number.parseInt(match[1], 10);
    if (!Number.isNaN(pageNumber) && pageNumber > 0) {
      return pageNumber;
    }
  }

  return null;
}

/**
 * Check if a unique constraint error is due to a page_number conflict (different file_name)
 * or a true duplicate (same file_name).
 * @param {Object} entry Entry that failed to store
 * @returns {Promise<Object|null>} Conflict info if page_number conflict detected, null otherwise
 */
function checkForPageNumberConflict(entry) {
  return new Promise((resolve, reject) => {
    const sql = `
      SELECT file_name, page_number
      FROM burial_register_entries
      WHERE volume_id = ?
        AND page_number = ?
        AND row_index_on_page = ?
        AND ai_provider = ?
      LIMIT 1
    `;

    db.get(sql, [
      entry.volume_id,
      entry.page_number,
      entry.row_index_on_page,
      entry.ai_provider
    ], (err, existingEntry) => {
      if (err) {
        reject(err);
        return;
      }

      if (!existingEntry) {
        // No existing entry found, not a conflict
        resolve(null);
        return;
      }

      const entryFileName = entry.fileName || entry.file_name;
      const existingFileName = existingEntry.file_name;

      // If file names are different, it's a page_number conflict
      // If file names are the same, it's a true duplicate
      if (entryFileName !== existingFileName) {
        resolve({
          isConflict: true,
          existingFileName,
          existingPageNumber: existingEntry.page_number,
          entryFileName
        });
      } else {
        resolve({
          isConflict: false,
          isDuplicate: true
        });
      }
    });
  });
}

/**
 * Map an entry object to the parameter order expected by the burial_register_entries table.
 * @param {Object} entry Entry object ready for storage
 * @returns {Array<*>} Parameter array for sqlite run
 */
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

/**
 * Insert a single burial register entry into the database.
 * Handles page_number conflicts by using filename-based page number as fallback.
 * @param {Object} entry Entry data ready for insertion
 * @returns {Promise<Object>} Object with { rowId, conflictResolved } where conflictResolved indicates if conflict was resolved
 */
async function storeBurialRegisterEntry(entry) {
  if (!entry || typeof entry !== 'object') {
    throw new Error('Entry data is required for storage');
  }

  if (!entry.volume_id) {
    throw new Error('volume_id is required to store a burial register entry');
  }

  if (entry.page_number === undefined || entry.page_number === null) {
    throw new Error('page_number is required to store a burial register entry');
  }

  if (entry.row_index_on_page === undefined || entry.row_index_on_page === null) {
    throw new Error('row_index_on_page is required to store a burial register entry');
  }

  if (!entry.ai_provider) {
    throw new Error('ai_provider is required to store a burial register entry');
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

  const originalPageNumber = entry.page_number;
  const originalEntryId = entry.entry_id;
  const fileName = entry.fileName || entry.file_name;

  const params = buildBurialEntryParams(entry);

  return new Promise((resolve, reject) => {
    db.run(sql, params, async function(err) {
      if (err) {
        // Check if this is a unique constraint violation
        if (err.code === 'SQLITE_CONSTRAINT' && err.message && err.message.includes('UNIQUE constraint failed')) {
          try {
            // Check if this is a page_number conflict (different file_name) or true duplicate
            const conflictInfo = await checkForPageNumberConflict(entry);
            
            if (conflictInfo && conflictInfo.isConflict) {
              // Page number conflict detected - try filename-based fallback
              logger.info(`Page number conflict detected for file ${fileName}: AI extracted page_number=${originalPageNumber}, existing entry has page_number=${conflictInfo.existingPageNumber} from file ${conflictInfo.existingFileName}`);

              const filenamePageNumber = extractPageNumberFromFilename(fileName);
              
              if (filenamePageNumber !== null) {
                logger.info(`Extracted page number ${filenamePageNumber} from filename ${fileName}`);
                
                // Update entry with filename-based page number
                entry.page_number = filenamePageNumber;
                entry.entry_id = generateEntryId(entry.volume_id, filenamePageNumber, entry.row_index_on_page);
                
                logger.debug(`Regenerated entry_id: ${entry.entry_id} (was: ${originalEntryId})`);
                
                // Retry storage with updated values
                const retryParams = buildBurialEntryParams(entry);
                
                db.run(sql, retryParams, function(retryErr) {
                  if (retryErr) {
                    logger.error(`Failed to store entry after page number conflict resolution: ${retryErr.message}`, {
                      error: retryErr,
                      volume_id: entry.volume_id,
                      original_page_number: originalPageNumber,
                      resolved_page_number: filenamePageNumber,
                      entry_id: entry.entry_id,
                      file_name: fileName,
                      ai_provider: entry.ai_provider
                    });
                    reject(retryErr);
                    return;
                  }
                  
                  logger.info(`Successfully stored entry with resolved page_number=${filenamePageNumber} (original: ${originalPageNumber}) for file ${fileName}`);
                  resolve({ 
                    rowId: this.lastID, 
                    conflictResolved: true,
                    originalPageNumber,
                    resolvedPageNumber: filenamePageNumber
                  });
                });
                return;
              } else {
                // Cannot extract page number from filename
                logger.warn(`Cannot extract page number from filename ${fileName}: pattern does not match expected format (page_NNN.jpg/png)`);
                const error = new Error(`Cannot resolve page number conflict: filename ${fileName} does not match expected pattern. Entry will be skipped.`);
                error.conflictInfo = {
                  fileName,
                  originalPageNumber,
                  existingPageNumber: conflictInfo.existingPageNumber,
                  existingFileName: conflictInfo.existingFileName,
                  resolved: false
                };
                reject(error);
                return;
              }
            } else if (conflictInfo && conflictInfo.isDuplicate) {
              // True duplicate - same file_name, same page_number, same row
              logger.warn(`True duplicate entry detected: same file ${fileName}, page_number=${originalPageNumber}, row_index=${entry.row_index_on_page}`);
              reject(err);
              return;
            } else {
              // Unknown conflict type, re-throw original error
              reject(err);
              return;
            }
          } catch (checkError) {
            // Error checking for conflict, re-throw original error
            logger.error('Error checking for page number conflict:', checkError);
            reject(err);
            return;
          }
        } else {
          // Not a unique constraint error, re-throw
          logger.error('Error storing burial register entry:', {
            error: err,
            volume_id: entry.volume_id,
            page_number: entry.page_number,
            row_index_on_page: entry.row_index_on_page,
            entry_id: entry.entry_id,
            entry_no_raw: entry.entry_no_raw,
            ai_provider: entry.ai_provider
          });
          reject(err);
          return;
        }
      }
      
      // Success - no conflict
      logger.debug(`Successfully stored burial register entry with ID: ${this.lastID}, entry_id=${entry.entry_id}`);
      resolve({ 
        rowId: this.lastID, 
        conflictResolved: false 
      });
    });
  });
}

/**
 * Clear all burial register entries from the database.
 * @returns {Promise<void>} Resolves when all entries are cleared
 */
function clearAllBurialRegisterEntries() {
  return new Promise((resolve, reject) => {
    // First, get the count of entries to be deleted
    db.get('SELECT COUNT(*) as count FROM burial_register_entries', [], (err, row) => {
      if (err) {
        logger.error('Error counting burial register entries before deletion:', err);
        reject(err);
        return;
      }

      const count = row?.count || 0;
      logger.info(`Clearing ${count} burial register entries from database`);

      db.run('DELETE FROM burial_register_entries', [], (err2) => {
        if (err2) {
          logger.error('Error clearing burial register entries:', err2);
          reject(err2);
          return;
        }
        logger.info(`Successfully cleared ${count} burial register entries`);
        resolve();
      });
    });
  });
}

/**
 * Retrieve all burial register entries from the database.
 * @returns {Promise<Array>} Resolves with array of burial register entries
 */
function getAllBurialRegisterEntries() {
  return new Promise((resolve, reject) => {
    logger.info('Attempting to retrieve all burial register entries');
    db.all('SELECT * FROM burial_register_entries ORDER BY processed_date DESC', [], (err, rows) => {
      if (err) {
        logger.error('Error retrieving burial register entries:', err);
        reject(err);
        return;
      }
      logger.info(`Retrieved ${rows ? rows.length : 0} burial register entries (most recent first)`);
      resolve(rows || []); // Ensure we always return an array
    });
  });
}

module.exports = {
  storePageJSON,
  storeBurialRegisterEntry,
  getBurialRegisterBaseDir,
  clearAllBurialRegisterEntries,
  getAllBurialRegisterEntries
};
