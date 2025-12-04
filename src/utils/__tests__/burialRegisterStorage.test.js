jest.unmock('fs');
jest.unmock('sqlite3');

const fs = require('fs');
const path = require('path');
const sqlite3 = require('sqlite3').verbose();

jest.mock('../logger', () => ({
  error: jest.fn(),
  info: jest.fn(),
  debug: jest.fn(),
  debugPayload: jest.fn()
}));

describe('burialRegisterStorage', () => {
  let db;
  let storePageJSON;
  let storeBurialRegisterEntry;
  let getBurialRegisterBaseDir;
  let burialRegisterBaseDir;

  const removeDirectory = async (targetPath) => {
    if (fs.promises.rm) {
      await fs.promises.rm(targetPath, { recursive: true, force: true });
      return;
    }

    try {
      await fs.promises.rmdir(targetPath, { recursive: true });
    } catch (error) {
      if (error.code !== 'ENOENT') {
        throw error;
      }
    }
  };

  const createTable = () => new Promise((resolve, reject) => {
    db.run(`
      CREATE TABLE IF NOT EXISTS burial_register_entries (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        volume_id TEXT NOT NULL,
        page_number INTEGER NOT NULL,
        row_index_on_page INTEGER NOT NULL,
        entry_id TEXT NOT NULL,
        entry_no_raw TEXT,
        name_raw TEXT,
        abode_raw TEXT,
        burial_date_raw TEXT,
        age_raw TEXT,
        officiant_raw TEXT,
        marginalia_raw TEXT,
        extra_notes_raw TEXT,
        row_ocr_raw TEXT,
        parish_header_raw TEXT,
        county_header_raw TEXT,
        year_header_raw TEXT,
        model_name TEXT,
        model_run_id TEXT,
        uncertainty_flags TEXT,
        file_name TEXT,
        ai_provider TEXT NOT NULL,
        prompt_template TEXT,
        prompt_version TEXT,
        processed_date DATETIME DEFAULT CURRENT_TIMESTAMP,
        UNIQUE(volume_id, page_number, row_index_on_page, ai_provider)
      )
    `, (err) => {
      if (err) {
        reject(err);
        return;
      }
      resolve();
    });
  });

  beforeEach(async () => {
    jest.resetModules();
    delete process.env.BURIAL_REGISTER_OUTPUT_DIR;
    db = new sqlite3.Database(':memory:');
    await createTable();

    jest.doMock('../database', () => ({ db }));
    ({ storePageJSON, storeBurialRegisterEntry, getBurialRegisterBaseDir } = require('../burialRegisterStorage'));
    burialRegisterBaseDir = getBurialRegisterBaseDir();
  });

  afterEach(async () => {
    await new Promise((resolve) => db.close(resolve));
    await removeDirectory(getBurialRegisterBaseDir());
    jest.resetModules();
  });

  test('storePageJSON writes page data to the expected path', async () => {
    const pageData = {
      volume_id: 'vol-test',
      page_number: 1,
      parish_header_raw: 'Parish',
      entries: []
    };

    const storedPath = await storePageJSON(pageData, 'gpt', 'vol-test', 1);
    const expectedPath = path.join(burialRegisterBaseDir, 'vol-test', 'pages', 'gpt', 'page_001.json');

    expect(storedPath).toBe(expectedPath);

    const storedContent = await fs.promises.readFile(storedPath, 'utf-8');
    expect(JSON.parse(storedContent)).toEqual(pageData);
  });

  test('storePageJSON respects BURIAL_REGISTER_OUTPUT_DIR override', async () => {
    const customBaseDir = path.join(__dirname, '..', '..', '..', 'tmp_burial_output');
    process.env.BURIAL_REGISTER_OUTPUT_DIR = customBaseDir;

    const pageData = {
      volume_id: 'vol-custom',
      page_number: 2,
      entries: []
    };

    try {
      const storedPath = await storePageJSON(pageData, 'anthropic', 'vol-custom', 2);
      expect(storedPath.startsWith(customBaseDir)).toBe(true);
      const expectedPath = path.join(customBaseDir, 'vol-custom', 'pages', 'anthropic', 'page_002.json');
      expect(storedPath).toBe(expectedPath);
    } finally {
      await removeDirectory(customBaseDir);
      delete process.env.BURIAL_REGISTER_OUTPUT_DIR;
    }
  });

  test('storeBurialRegisterEntry inserts entry with uncertainty flags', async () => {
    const sampleEntry = {
      volume_id: 'vol1',
      page_number: 2,
      row_index_on_page: 3,
      entry_id: 'vol1_p002_r003',
      entry_no_raw: '5',
      name_raw: 'John Doe',
      abode_raw: 'London',
      burial_date_raw: '12 Jan 1899',
      age_raw: '45',
      officiant_raw: 'J Smith',
      marginalia_raw: 'Some note',
      extra_notes_raw: 'Extra',
      row_ocr_raw: 'ocr text',
      parish_header_raw: 'Parish',
      county_header_raw: 'County',
      year_header_raw: '1899',
      model_name: 'gpt-4o',
      model_run_id: 'run-123',
      uncertainty_flags: ['flag1'],
      fileName: 'page2.png',
      ai_provider: 'openai',
      prompt_template: 'burialRegister',
      prompt_version: '1.0.0'
    };

    const result = await storeBurialRegisterEntry(sampleEntry);
    expect(result).toHaveProperty('rowId', 1);
    expect(result).toHaveProperty('conflictResolved', false);

    const rows = await new Promise((resolve, reject) => {
      db.all('SELECT * FROM burial_register_entries', (err, result) => {
        if (err) {
          reject(err);
          return;
        }
        resolve(result);
      });
    });

    expect(rows).toHaveLength(1);
    const stored = rows[0];

    expect(stored.volume_id).toBe('vol1');
    expect(stored.page_number).toBe(2);
    expect(stored.row_index_on_page).toBe(3);
    expect(stored.entry_id).toBe('vol1_p002_r003');
    expect(stored.file_name).toBe('page2.png');
    expect(stored.ai_provider).toBe('openai');
    expect(stored.model_name).toBe('gpt-4o');
    expect(stored.prompt_template).toBe('burialRegister');
    expect(stored.uncertainty_flags).toBe('["flag1"]');
  });

  test('storeBurialRegisterEntry handles multiple rows for the same page', async () => {
    const entryOne = {
      volume_id: 'vol1',
      page_number: 5,
      row_index_on_page: 1,
      entry_id: 'vol1_p005_r001',
      ai_provider: 'openai'
    };

    const entryTwo = {
      volume_id: 'vol1',
      page_number: 5,
      row_index_on_page: 2,
      entry_id: 'vol1_p005_r002',
      ai_provider: 'openai'
    };

    const firstResult = await storeBurialRegisterEntry(entryOne);
    const secondResult = await storeBurialRegisterEntry(entryTwo);

    expect(firstResult).toHaveProperty('rowId', 1);
    expect(firstResult).toHaveProperty('conflictResolved', false);
    expect(secondResult).toHaveProperty('rowId', 2);
    expect(secondResult).toHaveProperty('conflictResolved', false);

    const rows = await new Promise((resolve, reject) => {
      db.all('SELECT entry_id, row_index_on_page FROM burial_register_entries ORDER BY row_index_on_page', (err, result) => {
        if (err) {
          reject(err);
          return;
        }
        resolve(result);
      });
    });

    expect(rows).toEqual([
      { entry_id: 'vol1_p005_r001', row_index_on_page: 1 },
      { entry_id: 'vol1_p005_r002', row_index_on_page: 2 }
    ]);
  });
});
