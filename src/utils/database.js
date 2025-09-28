const sqlite3 = require('sqlite3').verbose();
const path = require('path');
const logger = require('./logger');
const fs = require('fs');
const moment = require('moment');

// Database will be stored in the data directory
const dbDir = path.dirname(path.join(__dirname, '../../data', 'memorials.db'));
const dbPath = path.join(dbDir, 'memorials.db');

// Ensure data directory exists
if (!fs.existsSync(dbDir)) {
  fs.mkdirSync(dbDir, { recursive: true });
  logger.info('Created database directory');
}

// Create database connection
const db = new sqlite3.Database(dbPath, (err) => {
  if (err) {
    logger.error('Error connecting to database:', err);
    return;
  }
  logger.info('Connected to SQLite database');
});

// Initialize database with required table
function initializeDatabase() {
  const createLegacyTableSQL = `
    CREATE TABLE IF NOT EXISTS memorials (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      memorial_number TEXT,
      first_name TEXT,
      last_name TEXT,
      year_of_death TEXT,
      inscription TEXT,
      file_name TEXT,
      ai_provider TEXT,
      model_version TEXT,
      prompt_template TEXT,
      prompt_version TEXT,
      processed_date DATETIME DEFAULT CURRENT_TIMESTAMP
    )
  `;

  const createParallelTableSQL = `
    CREATE TABLE IF NOT EXISTS parallel_memorials (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      file_name TEXT UNIQUE,
      prompt_template TEXT,
      prompt_version TEXT,
      processed_date DATETIME DEFAULT CURRENT_TIMESTAMP,
      parallel_status TEXT,
      openai_memorial_number TEXT,
      openai_first_name TEXT,
      openai_last_name TEXT,
      openai_year_of_death TEXT,
      openai_inscription TEXT,
      openai_model_version TEXT,
      openai_status TEXT,
      openai_error_message TEXT,
      openai_raw_response TEXT,
      anthropic_memorial_number TEXT,
      anthropic_first_name TEXT,
      anthropic_last_name TEXT,
      anthropic_year_of_death TEXT,
      anthropic_inscription TEXT,
      anthropic_model_version TEXT,
      anthropic_status TEXT,
      anthropic_error_message TEXT,
      anthropic_raw_response TEXT
    )
  `;

  db.serialize(() => {
    db.run(createLegacyTableSQL, (err) => {
      if (err) {
        logger.error('Error creating memorials table:', err);
        return;
      }
      logger.info('Memorials table initialized');
    });

    db.run(createParallelTableSQL, (err) => {
      if (err) {
        logger.error('Error creating parallel_memorials table:', err);
        return;
      }
      logger.info('Parallel memorials table initialized');
    });

    db.run('CREATE INDEX IF NOT EXISTS idx_parallel_file_name ON parallel_memorials(file_name)', (err) => {
      if (err) {
        logger.error('Error creating index on parallel_memorials.file_name:', err);
      }
    });

    db.run('CREATE INDEX IF NOT EXISTS idx_parallel_status ON parallel_memorials(parallel_status)', (err) => {
      if (err) {
        logger.error('Error creating index on parallel_memorials.parallel_status:', err);
      }
    });
  });
}

// Store a single memorial record
function storeMemorial(data) {
  logger.info('Attempting to store memorial:', JSON.stringify(data));
  const sql = `
    INSERT INTO memorials (
      memorial_number,
      first_name,
      last_name,
      year_of_death,
      inscription,
      file_name,
      ai_provider,
      model_version,
      prompt_template,
      prompt_version
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `;

  return new Promise((resolve, reject) => {
    db.run(sql, [
      data.memorial_number || null,
      data.first_name || null,
      data.last_name || null,
      data.year_of_death || null,
      data.inscription || null,
      data.fileName || null,
      data.ai_provider || null,
      data.model_version || null,
      data.prompt_template || null,
      data.prompt_version || null
    ], function(err) {
      if (err) {
        logger.error('Error storing memorial:', err);
        reject(err);
        return;
      }
      logger.info(`Successfully stored memorial with ID: ${this.lastID}`);
      resolve(this.lastID);
    });
  });
}

function determineParallelStatus(results) {
  const statuses = Object.values(results).map(result => result.status);
  if (statuses.length === 0) {
    return 'pending';
  }
  if (statuses.every(status => status === 'success')) {
    return 'complete';
  }
  if (statuses.some(status => status === 'success')) {
    return 'partial';
  }
  return 'error';
}

function storeParallelMemorial(fileName, metadata, providerResults) {
  const columns = [
    'file_name',
    'prompt_template',
    'prompt_version',
    'parallel_status',
    'openai_memorial_number',
    'openai_first_name',
    'openai_last_name',
    'openai_year_of_death',
    'openai_inscription',
    'openai_model_version',
    'openai_status',
    'openai_error_message',
    'openai_raw_response',
    'anthropic_memorial_number',
    'anthropic_first_name',
    'anthropic_last_name',
    'anthropic_year_of_death',
    'anthropic_inscription',
    'anthropic_model_version',
    'anthropic_status',
    'anthropic_error_message',
    'anthropic_raw_response'
  ];

  const row = {
    file_name: fileName,
    prompt_template: metadata.promptTemplate || null,
    prompt_version: metadata.promptVersion || null,
    parallel_status: determineParallelStatus(providerResults),
    openai_memorial_number: null,
    openai_first_name: null,
    openai_last_name: null,
    openai_year_of_death: null,
    openai_inscription: null,
    openai_model_version: null,
    openai_status: null,
    openai_error_message: null,
    openai_raw_response: null,
    anthropic_memorial_number: null,
    anthropic_first_name: null,
    anthropic_last_name: null,
    anthropic_year_of_death: null,
    anthropic_inscription: null,
    anthropic_model_version: null,
    anthropic_status: null,
    anthropic_error_message: null,
    anthropic_raw_response: null
  };

  ['openai', 'anthropic'].forEach((provider) => {
    const result = providerResults[provider];
    if (!result) {
      return;
    }

    if (result.status === 'success' && result.data) {
      row[`${provider}_memorial_number`] = result.data.memorial_number || null;
      row[`${provider}_first_name`] = result.data.first_name || null;
      row[`${provider}_last_name`] = result.data.last_name || null;
      row[`${provider}_year_of_death`] = result.data.year_of_death || null;
      row[`${provider}_inscription`] = result.data.inscription || null;
      row[`${provider}_model_version`] = result.data.model_version || null;
      row[`${provider}_status`] = 'success';
      row[`${provider}_error_message`] = null;
      row[`${provider}_raw_response`] = result.rawResponse ? JSON.stringify(result.rawResponse) : null;
    } else {
      row[`${provider}_model_version`] = result.modelVersion || null;
      row[`${provider}_status`] = result.status || 'error';
      row[`${provider}_error_message`] = result.errorMessage || null;
      row[`${provider}_raw_response`] = result.rawResponse ? JSON.stringify(result.rawResponse) : null;
    }
  });

  const placeholders = columns.map(() => '?').join(', ');
  const updateAssignments = columns
    .filter(column => column !== 'file_name')
    .map(column => `${column} = excluded.${column}`)
    .join(', ');

  const values = columns.map(column => row[column]);

  const sql = `
    INSERT INTO parallel_memorials (${columns.join(', ')})
    VALUES (${placeholders})
    ON CONFLICT(file_name) DO UPDATE SET ${updateAssignments}
  `;

  return new Promise((resolve, reject) => {
    db.run(sql, values, function(err) {
      if (err) {
        logger.error('Error storing parallel memorial:', err);
        reject(err);
        return;
      }
      resolve(this.lastID);
    });
  });
}

// Retrieve all memorial records
function getAllMemorials() {
  return new Promise((resolve, reject) => {
    logger.info('Attempting to retrieve all memorials from database');
    db.all('SELECT * FROM memorials ORDER BY processed_date DESC', [], (err, rows) => {
      if (err) {
        logger.error('Error retrieving memorials:', err);
        reject(err);
        return;
      }
      logger.info(`Retrieved ${rows ? rows.length : 0} memorial records`);
      resolve(rows || []); // Ensure we always return an array
    });
  });
}

function getAllParallelMemorials() {
  return new Promise((resolve, reject) => {
    logger.info('Attempting to retrieve all parallel memorials from database');
    db.all('SELECT * FROM parallel_memorials ORDER BY processed_date DESC', [], (err, rows) => {
      if (err) {
        logger.error('Error retrieving parallel memorials:', err);
        reject(err);
        return;
      }
      resolve(rows || []);
    });
  });
}

// Add this function to database.js
function clearAllMemorials() {
  return new Promise((resolve, reject) => {
    logger.info('Attempting to clear all memorial records');
    db.serialize(() => {
      db.run('DELETE FROM memorials', [], (err) => {
        if (err) {
          logger.error('Error clearing legacy memorials:', err);
          reject(err);
          return;
        }
      });

      db.run('DELETE FROM parallel_memorials', [], (err) => {
        if (err) {
          logger.error('Error clearing parallel memorials:', err);
          reject(err);
          return;
        }
        logger.info('Successfully cleared all memorial records');
        resolve();
      });
    });
  });
}

const backupDatabase = async () => {
  const backupDir = path.join(__dirname, '../../backups');
  if (!fs.existsSync(backupDir)) {
    fs.mkdirSync(backupDir, { recursive: true });
  }
  const timestamp = moment().format('YYYYMMDD_HHmmss');
  const backupPath = path.join(backupDir, `memorials_${timestamp}.db`);
    
  return new Promise((resolve, reject) => {
    const backup = fs.createReadStream(dbPath).pipe(fs.createWriteStream(backupPath));
    backup.on('finish', () => {
      logger.info(`Database backed up to ${backupPath}`);
      resolve();
    });
    backup.on('error', reject);
  });
};

// Initialize database on module load
initializeDatabase();

module.exports = {
  storeMemorial,
  storeParallelMemorial,
  getAllMemorials,
  getAllParallelMemorials,
  clearAllMemorials,
  backupDatabase,
  db // Exported for closing connection when needed
};