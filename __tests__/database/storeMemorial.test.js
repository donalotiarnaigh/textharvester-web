const sqlite3 = require('sqlite3').verbose();

// Mock the logger
jest.mock('../../src/utils/logger', () => ({
  error: jest.fn(),
  info: jest.fn()
}));

describe('storeMemorial Function', () => {
  let db;
  let storeMemorial;

  beforeEach(() => {
    // Clear module cache
    jest.resetModules();
    
    // Get fresh instances
    const sqlite3 = require('sqlite3').verbose();
    db = new sqlite3.Database(':memory:');
    
    // Mock the database module
    jest.mock('../../src/utils/database', () => ({
      db,
      storeMemorial: require('../../src/utils/database').storeMemorial
    }));

    // Import the function
    storeMemorial = require('../../src/utils/database').storeMemorial;
  });

  it('should store memorial with model information', async () => {
    const testData = {
      memorial_number: 'TEST001',
      first_name: 'John',
      last_name: 'Doe',
      year_of_death: '1900',
      inscription: 'Test inscription',
      fileName: 'test.jpg',
      ai_provider: 'openai',
      model_version: 'gpt-4-vision'
    };

    // Store the memorial
    const id = await storeMemorial(testData);
    expect(id).toBeDefined();

    // Retrieve and verify the stored data
    const result = await new Promise((resolve, reject) => {
      db.get('SELECT * FROM memorials WHERE id = ?', [id], (err, row) => {
        if (err) reject(err);
        else resolve(row);
      });
    });

    expect(result).toMatchObject({
      memorial_number: testData.memorial_number,
      first_name: testData.first_name,
      last_name: testData.last_name,
      year_of_death: testData.year_of_death,
      inscription: testData.inscription,
      file_name: testData.fileName,
      ai_provider: testData.ai_provider,
      model_version: testData.model_version
    });
  });

  it('should handle missing model information', async () => {
    const testData = {
      memorial_number: 'TEST002',
      first_name: 'Jane',
      last_name: 'Doe',
      fileName: 'test2.jpg'
    };

    // Store the memorial
    const id = await storeMemorial(testData);
    expect(id).toBeDefined();

    // Retrieve and verify the stored data
    const result = await new Promise((resolve, reject) => {
      db.get('SELECT * FROM memorials WHERE id = ?', [id], (err, row) => {
        if (err) reject(err);
        else resolve(row);
      });
    });

    expect(result).toMatchObject({
      memorial_number: testData.memorial_number,
      first_name: testData.first_name,
      last_name: testData.last_name,
      file_name: testData.fileName,
      ai_provider: null,
      model_version: null
    });
  });

  it('should handle all fields being null except fileName', async () => {
    const testData = {
      fileName: 'test3.jpg'
    };

    // Store the memorial
    const id = await storeMemorial(testData);
    expect(id).toBeDefined();

    // Retrieve and verify the stored data
    const result = await new Promise((resolve, reject) => {
      db.get('SELECT * FROM memorials WHERE id = ?', [id], (err, row) => {
        if (err) reject(err);
        else resolve(row);
      });
    });

    expect(result).toMatchObject({
      memorial_number: null,
      first_name: null,
      last_name: null,
      year_of_death: null,
      inscription: null,
      file_name: testData.fileName,
      ai_provider: null,
      model_version: null
    });
  });
}); 