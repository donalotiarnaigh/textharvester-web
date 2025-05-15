const sqlite3 = require('sqlite3').verbose();
const path = require('path');

// Mock the logger
jest.mock('../../src/utils/logger', () => ({
  error: jest.fn(),
  info: jest.fn()
}));

const migrateAddModelColumns = require('../../src/utils/migrations/addModelColumns');

// Increase Jest timeout for all tests
jest.setTimeout(30000);

describe('Add Model Columns Migration', () => {
  let db;
  
  beforeAll(async () => {
    // Use in-memory database for testing
    db = new sqlite3.Database(':memory:');
    
    // Create initial table structure
    await new Promise((resolve, reject) => {
      db.run(`
        CREATE TABLE memorials (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          memorial_number TEXT,
          first_name TEXT,
          last_name TEXT
        )
      `, (err) => {
        if (err) reject(err);
        else resolve();
      });
    });
  });

  afterAll(async () => {
    await new Promise((resolve) => db.close(resolve));
  });

  it('should add model columns and handle duplicates', async () => {
    // First migration
    await migrateAddModelColumns(db);
    
    // Check columns were added
    const tableInfo = await new Promise((resolve, reject) => {
      db.all("PRAGMA table_info(memorials)", (err, rows) => {
        if (err) reject(err);
        else resolve(rows);
      });
    });

    const columnNames = tableInfo.map(col => col.name);
    expect(columnNames).toContain('ai_provider');
    expect(columnNames).toContain('model_version');

    // Second migration should not throw
    await expect(migrateAddModelColumns(db)).resolves.not.toThrow();
  });

  it('should maintain existing data after migration', async () => {
    // Insert test data
    await new Promise((resolve, reject) => {
      db.run(`
        INSERT INTO memorials (memorial_number, first_name, last_name)
        VALUES (?, ?, ?)
      `, ['001', 'John', 'Doe'], (err) => {
        if (err) reject(err);
        else resolve();
      });
    });

    // Run migration
    await migrateAddModelColumns(db);

    // Verify data persists
    const result = await new Promise((resolve, reject) => {
      db.get('SELECT * FROM memorials WHERE memorial_number = ?', ['001'], (err, row) => {
        if (err) reject(err);
        else resolve(row);
      });
    });

    expect(result.first_name).toBe('John');
    expect(result.last_name).toBe('Doe');
    expect(result.ai_provider).toBeNull();
    expect(result.model_version).toBeNull();
  });
}); 