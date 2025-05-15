const sqlite3 = require('sqlite3').verbose();
const path = require('path');
const logger = require('../src/utils/logger');

// Database path
const dbPath = path.join(__dirname, '..', 'data', 'memorials.db');

// Create/connect to database
const db = new sqlite3.Database(dbPath, (err) => {
  if (err) {
    logger.error('Error connecting to database:', err);
    process.exit(1);
  }
  logger.info('Connected to database');
});

// Create tables with updated schema
db.serialize(() => {
  db.run(`
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
      processed_date DATETIME DEFAULT CURRENT_TIMESTAMP
    )
  `, (err) => {
    if (err) {
      logger.error('Error creating memorials table:', err);
      process.exit(1);
    }
    logger.info('Memorials table created successfully');
    
    // Close database connection
    db.close((err) => {
      if (err) {
        logger.error('Error closing database:', err);
        process.exit(1);
      }
      logger.info('Database initialized successfully');
      process.exit(0);
    });
  });
}); 