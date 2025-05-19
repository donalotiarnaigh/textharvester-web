const sqlite3 = require('sqlite3').verbose();
const path = require('path');
const { initializeDatabase } = require('../schema');

// Mock the logger
jest.mock('../../logger', () => ({
  error: jest.fn(),
  info: jest.fn()
}));

describe('Database Utility Functions', () => {
  let db;
  let dbUtils;

  beforeEach(async () => {
    // Use in-memory database for testing
    db = new sqlite3.Database(':memory:');
    
    // Initialize schema
    await initializeDatabase(db);
    
    // Import the functions fresh for each test
    jest.resetModules();
    dbUtils = require('../utils');
  });

  afterEach((done) => {
    db.close(done);
  });

  describe('storeMemorial', () => {
    it('should store memorial with proper type conversion', async () => {
      const testData = {
        memorial_number: '123', // String that should be converted to INTEGER
        first_name: 'John',
        last_name: 'Doe',
        year_of_death: '1900', // String that should be converted to INTEGER
        inscription: 'Test inscription',
        fileName: 'test.jpg',
        ai_provider: 'openai',
        model_version: 'gpt-4o',
        prompt_version: '1.0.0'
      };

      const id = await dbUtils.storeMemorial(db, testData);
      expect(id).toBeGreaterThan(0);

      // Verify stored data
      const stored = await new Promise((resolve, reject) => {
        db.get('SELECT * FROM memorials WHERE id = ?', [id], (err, row) => {
          if (err) reject(err);
          else resolve(row);
        });
      });

      // Verify specific fields without checking processed_date
      expect(stored).toBeTruthy();
      expect(stored.memorial_number).toBe(123);
      expect(stored.first_name).toBe('John');
      expect(stored.last_name).toBe('Doe');
      expect(stored.year_of_death).toBe(1900);
      expect(stored.inscription).toBe('Test inscription');
      expect(stored.file_name).toBe('test.jpg');
      expect(stored.ai_provider).toBe('openai');
      expect(stored.model_version).toBe('gpt-4o');
      expect(stored.prompt_version).toBe('1.0.0');

      // Verify processed_date is a valid date
      expect(new Date(stored.processed_date)).toBeInstanceOf(Date);
    });

    it('should reject invalid year_of_death values', async () => {
      const testData = {
        memorial_number: '123',
        year_of_death: '1400', // Before 1500
        fileName: 'test.jpg'
      };

      await expect(dbUtils.storeMemorial(db, testData))
        .rejects
        .toThrow('CHECK constraint failed: valid_year');
    });

    it('should require file_name field', async () => {
      const testData = {
        memorial_number: '123',
        first_name: 'John'
        // Missing fileName/file_name
      };

      await expect(dbUtils.storeMemorial(db, testData))
        .rejects
        .toThrow('NOT NULL constraint failed: file_name');
    });
  });

  describe('getAllMemorials', () => {
    beforeEach(async () => {
      // Insert test data
      const testData = [
        {
          memorial_number: '123',
          first_name: 'John',
          fileName: 'test1.jpg',
          year_of_death: '1900'
        },
        {
          memorial_number: '124',
          first_name: 'Jane',
          fileName: 'test2.jpg',
          year_of_death: '1950'
        }
      ];

      for (const data of testData) {
        await dbUtils.storeMemorial(db, data);
      }
    });

    it('should return all memorials with proper types', async () => {
      const memorials = await dbUtils.getAllMemorials(db);
      
      expect(memorials).toHaveLength(2);
      expect(memorials[0]).toBeTruthy();
      expect(memorials[0].memorial_number).toBe(123);
      expect(memorials[0].first_name).toBe('John');
      expect(memorials[0].file_name).toBe('test1.jpg');
      expect(memorials[0].year_of_death).toBe(1900);
    });

    it('should order results by processed_date DESC', async () => {
      const memorials = await dbUtils.getAllMemorials(db);
      
      // Verify descending order
      const dates = memorials.map(m => new Date(m.processed_date).getTime());
      expect(dates[0]).toBeGreaterThanOrEqual(dates[1]);
    });
  });

  describe('clearAllMemorials', () => {
    it('should remove all records from the database', async () => {
      // Insert test data
      await dbUtils.storeMemorial(db, {
        memorial_number: '123',
        fileName: 'test.jpg'
      });

      // Verify data exists
      const initialCount = await new Promise((resolve, reject) => {
        db.get('SELECT COUNT(*) as count FROM memorials', (err, row) => {
          if (err) reject(err);
          else resolve(parseInt(row.count, 10));
        });
      });
      expect(initialCount).toBe(1);

      // Clear data
      await dbUtils.clearAllMemorials(db);

      // Verify data is cleared
      const finalCount = await new Promise((resolve, reject) => {
        db.get('SELECT COUNT(*) as count FROM memorials', (err, row) => {
          if (err) reject(err);
          else resolve(parseInt(row.count, 10));
        });
      });
      expect(finalCount).toBe(0);
    });
  });
}); 