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
  const createTableSQL = `
    CREATE TABLE IF NOT EXISTS memorials (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      memorial_number TEXT,
      first_name TEXT,
      last_name TEXT,
      year_of_death TEXT CONSTRAINT valid_year CHECK (
        year_of_death IS NULL OR 
        year_of_death = '-' OR
        year_of_death GLOB '*-*' OR
        (CAST(year_of_death AS INTEGER) >= 1500 AND CAST(year_of_death AS INTEGER) <= 2100)
      ),
      inscription TEXT,
      file_name TEXT,
      ai_provider TEXT,
      model_version TEXT,
      prompt_template TEXT,
      prompt_version TEXT,
      processed_date DATETIME DEFAULT CURRENT_TIMESTAMP,
      source_type TEXT
    )
  `;

  db.run(createTableSQL, (err) => {
    if (err) {
      logger.error('Error creating memorials table:', err);
      return;
    }
    logger.info('Memorials table initialized');
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
      prompt_version,
      source_type
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
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
      data.prompt_version || null,
      data.source_type || null
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

// Add this function to database.js
function clearAllMemorials() {
  return new Promise((resolve, reject) => {
    logger.info('Attempting to clear all memorial records');
    db.run('DELETE FROM memorials', [], (err) => {
      if (err) {
        logger.error('Error clearing memorials:', err);
        reject(err);
        return;
      }
      logger.info('Successfully cleared all memorial records');
      resolve();
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
  getAllMemorials,
  clearAllMemorials,
  backupDatabase,
  db // Exported for closing connection when needed
}; 