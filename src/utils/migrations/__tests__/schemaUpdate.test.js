const sqlite3 = require('sqlite3').verbose();
const { migrateToNewSchema } = require('../schemaUpdate');

describe('Schema Migration', () => {
  let db;

  beforeEach(async () => {
    // Use in-memory database for testing
    db = new sqlite3.Database(':memory:');
    
    // Create old schema
    await new Promise((resolve, reject) => {
      db.run(`
        CREATE TABLE memorials (
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
        if (err) reject(err);
        else resolve();
      });
    });

    // Insert test data
    await new Promise((resolve, reject) => {
      db.run(`
        INSERT INTO memorials (
          memorial_number, first_name, last_name,
          year_of_death, inscription, file_name
        ) VALUES (?, ?, ?, ?, ?, ?)
      `, ['123', 'John', 'Doe', '1900', 'Test inscription', 'test.jpg'], (err) => {
        if (err) reject(err);
        else resolve();
      });
    });
  });

  afterEach((done) => {
    db.close(done);
  });

  it('should migrate data with proper type conversion', async () => {
    await migrateToNewSchema(db);

    const row = await new Promise((resolve, reject) => {
      db.get('SELECT * FROM memorials WHERE id = 1', (err, row) => {
        if (err) reject(err);
        else resolve(row);
      });
    });

    expect(row).toEqual(expect.objectContaining({
      memorial_number: 123, // Now a number
      first_name: 'John',
      last_name: 'Doe',
      year_of_death: 1900, // Now a number
      inscription: 'Test inscription',
      file_name: 'test.jpg'
    }));
  });

  it('should handle empty/null values during conversion', async () => {
    // Insert test data with empty values
    await new Promise((resolve, reject) => {
      db.run(`
        INSERT INTO memorials (
          memorial_number, first_name, last_name,
          year_of_death, inscription, file_name
        ) VALUES (?, ?, ?, ?, ?, ?)
      `, ['', 'Jane', 'Smith', '', 'Another inscription', 'test2.jpg'], (err) => {
        if (err) reject(err);
        else resolve();
      });
    });

    await migrateToNewSchema(db);

    const row = await new Promise((resolve, reject) => {
      db.get('SELECT * FROM memorials WHERE first_name = ?', ['Jane'], (err, row) => {
        if (err) reject(err);
        else resolve(row);
      });
    });

    expect(row).toEqual(expect.objectContaining({
      memorial_number: null, // Empty string converted to null
      first_name: 'Jane',
      last_name: 'Smith',
      year_of_death: null, // Empty string converted to null
      inscription: 'Another inscription',
      file_name: 'test2.jpg'
    }));
  });

  it('should create all required indexes', async () => {
    await migrateToNewSchema(db);

    const indexes = await new Promise((resolve, reject) => {
      db.all("SELECT name, sql FROM sqlite_master WHERE type='index' AND tbl_name='memorials'", (err, rows) => {
        if (err) reject(err);
        else resolve(rows);
      });
    });

    expect(indexes).toHaveLength(3);
    expect(indexes.map(idx => idx.name)).toEqual(
      expect.arrayContaining(['idx_memorial_number', 'idx_name', 'idx_year'])
    );
  });

  it('should enforce NOT NULL constraint on file_name', async () => {
    await migrateToNewSchema(db);

    await expect(
      new Promise((resolve, reject) => {
        db.run('INSERT INTO memorials (memorial_number, first_name) VALUES (?, ?)', 
          [1, 'John'], (err) => {
            if (err) reject(err);
            else resolve();
          });
      })
    ).rejects.toThrow();
  });

  it('should handle transaction rollback on error', async () => {
    // Create a table that will cause the migration to fail
    await new Promise((resolve) => {
      db.run('CREATE TABLE memorials_new (dummy TEXT)', (err) => {
        resolve();
      });
    });

    await expect(migrateToNewSchema(db)).rejects.toThrow();

    // Verify original table still exists and is unchanged
    const row = await new Promise((resolve, reject) => {
      db.get('SELECT * FROM memorials WHERE id = 1', (err, row) => {
        if (err) reject(err);
        else resolve(row);
      });
    });

    expect(row).toBeTruthy();
    expect(row.memorial_number).toBe('123'); // Still a string in old format
  });
}); 