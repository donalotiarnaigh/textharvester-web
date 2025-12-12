const logger = require('./logger');
const { db } = require('./database');

/**
 * Initialize the grave_cards table
 */
function initialize() {
  const createTableSQL = `
    CREATE TABLE IF NOT EXISTS grave_cards (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      file_name TEXT NOT NULL,
      section TEXT,
      grave_number TEXT,
      data_json TEXT,
      processed_date DATETIME DEFAULT CURRENT_TIMESTAMP,
      ai_provider TEXT
    )
  `;

  return new Promise((resolve, reject) => {
    db.run(createTableSQL, (err) => {
      if (err) {
        logger.error('Error creating grave_cards table:', err);
        reject(err);
        return;
      }
      logger.info('grave_cards table initialized');
      resolve();
    });
  });
}

/**
 * Store a processed grave card record.
 * @param {Object} data - The complete object including metadata and AI result.
 * @returns {Promise<number>} - The ID of the inserted record.
 */
function storeGraveCard(data) {
  return new Promise((resolve, reject) => {
    if (!data.fileName) {
      const error = new Error('Missing required metadata: fileName');
      logger.error(error.message);
      reject(error);
      return;
    }

    const fileName = data.fileName;
    const aiProvider = data.ai_provider || null;
    const section = data.location?.section || null;
    const graveNumber = data.location?.grave_number || null;
    const dataJson = JSON.stringify(data);

    const sql = `
      INSERT INTO grave_cards (
        file_name,
        section,
        grave_number,
        data_json,
        ai_provider
      ) VALUES (?, ?, ?, ?, ?)
    `;

    db.run(sql, [fileName, section, graveNumber, dataJson, aiProvider], function (err) {
      if (err) {
        logger.error('Error storing grave card:', err);
        reject(err);
        return;
      }
      logger.info(`Successfully stored grave card with ID: ${this.lastID}`);
      resolve(this.lastID);
    });
  });

}

/**
 * Retrieve all grave cards.
 * @returns {Promise<Array>} - List of grave cards with parsed JSON data.
 */
function getAllGraveCards() {
  return new Promise((resolve, reject) => {
    db.all('SELECT * FROM grave_cards ORDER BY processed_date DESC', [], (err, rows) => {
      if (err) {
        logger.error('Error retrieving grave cards:', err);
        reject(err);
        return;
      }

      const cards = rows.map(row => {
        try {
          // Parse the JSON data
          const data = JSON.parse(row.data_json);
          return {
            ...row,
            data
          };
        } catch (e) {
          logger.warn(`Failed to parse JSON for grave card ${row.id}`, e);
          return {
            ...row,
            data: null,
            error: 'Invalid JSON data'
          };
        }
      });
      resolve(cards);
    });
  });
}


/**
 * Export all grave cards to a flattened CSV format.
 * @returns {Promise<string>} - The CSV string.
 */
function exportCardsToCsv() {
  return new Promise((resolve, reject) => {
    db.all('SELECT * FROM grave_cards ORDER BY processed_date DESC', [], (err, rows) => {
      if (err) {
        logger.error('Error retrieving grave cards for export:', err);
        reject(err);
        return;
      }

      if (!rows || rows.length === 0) {
        resolve('');
        return;
      }

      // Process rows to flatten JSON
      const flattenedRows = rows.map(row => {
        let data = {};
        try {
          data = JSON.parse(row.data_json);
        } catch (e) {
          logger.error(`Error parsing JSON for row ${row.id}`, e);
          return null;
        }

        const flat = {
          id: row.id,
          file_name: row.file_name,
          processed_date: row.processed_date,
          ai_provider: row.ai_provider,
          section: row.section,
          grave_number: row.grave_number,
          grave_status: data.grave?.status || '',
          grave_type: data.grave?.type || '',
          grave_notes: data.grave?.notes || '',
          dimensions_length: data.grave?.dimensions?.length_ft || '',
          dimensions_width: data.grave?.dimensions?.width_ft || '',
          inscription_text: data.inscription?.text ? data.inscription.text.replace(/\n/g, ' | ') : '',
          inscription_notes: data.inscription?.notes || '',
          sketch_description: data.sketch?.description || '',
          card_processed_by: data.card_metadata?.processed_by || '',
        };

        // Flatten interments
        if (Array.isArray(data.interments)) {
          data.interments.forEach((interment, index) => {
            const i = index + 1;
            flat[`interment_${i}_name`] = interment.name || '';
            flat[`interment_${i}_date_death`] = interment.date_of_death || '';
            flat[`interment_${i}_date_burial`] = interment.date_of_burial || '';
            flat[`interment_${i}_age`] = interment.age || (interment.age_at_death || '');
            flat[`interment_${i}_notes`] = interment.notes || '';
          });
        }

        return flat;
      }).filter(r => r !== null);

      if (flattenedRows.length === 0) {
        resolve('');
        return;
      }

      // Collect all unique keys for header
      const allKeys = new Set();
      flattenedRows.forEach(row => {
        Object.keys(row).forEach(key => allKeys.add(key));
      });

      // Sort keys: Standard first, then interments sorted by number
      const standardKeys = [
        'id', 'file_name', 'processed_date', 'ai_provider', 'section', 'grave_number',
        'grave_status', 'grave_type', 'grave_notes', 'dimensions_length', 'dimensions_width',
        'inscription_text', 'inscription_notes', 'sketch_description', 'card_processed_by'
      ];

      const intermentKeys = Array.from(allKeys)
        .filter(k => k.startsWith('interment_'))
        .sort((a, b) => {
          // Extract number
          const numA = parseInt(a.match(/interment_(\d+)_/)[1]);
          const numB = parseInt(b.match(/interment_(\d+)_/)[1]);
          if (numA !== numB) return numA - numB;
          return a.localeCompare(b);
        });

      const otherKeys = Array.from(allKeys).filter(k => !standardKeys.includes(k) && !intermentKeys.includes(k));

      const sortedKeys = [...standardKeys, ...intermentKeys, ...otherKeys].filter(k => allKeys.has(k));

      // Build CSV
      const headerRow = sortedKeys.join(',');
      const dataRows = flattenedRows.map(row => {
        return sortedKeys.map(key => {
          let val = row[key] === undefined ? '' : String(row[key]);
          // Escape quotes and wrap in quotes if contains comma or newline
          if (val.includes(',') || val.includes('"') || val.includes('\n')) {
            val = `"${val.replace(/"/g, '""')}"`;
          }
          return val;
        }).join(',');
      });

      resolve([headerRow, ...dataRows].join('\n'));
    });
  });
}

// Auto-initialize if required, or export initialize
// We export initialize for better control in tests but call it if file is loaded in app context usually.
// Initialize table lazily on first use rather than at module load
// This prevents test failures when database isn't mocked properly
// initialize() is called automatically when storeGraveCard is first used
// or can be called explicitly if needed
// initialize();

module.exports = {
  initialize, // Exported for testing/explicit calling
  storeGraveCard,
  exportCardsToCsv,
  getAllGraveCards
};
