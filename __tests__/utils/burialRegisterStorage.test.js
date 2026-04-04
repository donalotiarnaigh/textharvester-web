/**
 * @jest-environment node
 */

// Mock sqlite3 BEFORE importing modules
const mockRun = jest.fn();
const mockGet = jest.fn();
const mockAll = jest.fn();

const MockDatabase = jest.fn(() => ({
  run: mockRun,
  get: mockGet,
  all: mockAll,
  serialize: jest.fn(cb => cb()),
  close: jest.fn()
}));

const mockVerbose = jest.fn(() => ({
  Database: MockDatabase
}));

jest.mock('sqlite3', () => ({
  verbose: mockVerbose,
  Database: MockDatabase
}));

jest.mock('../../src/utils/logger', () => ({
  error: jest.fn(),
  info: jest.fn(),
  warn: jest.fn(),
  debug: jest.fn()
}));

jest.mock('fs', () => ({
  ...jest.requireActual('fs'),
  existsSync: jest.fn(() => true),
  mkdirSync: jest.fn(),
  promises: {
    mkdir: jest.fn(() => Promise.resolve()),
    writeFile: jest.fn(() => Promise.resolve())
  }
}));

describe('Burial Register Storage: updateBurialRegisterEntry()', () => {
  let updateBurialRegisterEntry;

  beforeEach(() => {
    jest.resetModules();
    jest.clearAllMocks();
    const storage = require('../../src/utils/burialRegisterStorage');
    updateBurialRegisterEntry = storage.updateBurialRegisterEntry;
  });

  it('should update editable fields and return updated entry', async () => {
    const updates = {
      name_raw: 'JANE DOE',
      burial_date_raw: '1857-04-10'
    };

    const updatedEntry = {
      id: 1,
      name_raw: 'JANE DOE',
      burial_date_raw: '1857-04-10',
      edited_at: '2026-04-03T12:00:00.000Z',
      edited_fields: JSON.stringify(['name_raw', 'burial_date_raw'])
    };

    mockRun.mockImplementationOnce((sql, params, cb) => {
      expect(sql).toContain('UPDATE burial_register_entries');
      expect(sql).toContain('name_raw');
      expect(sql).toContain('burial_date_raw');
      cb(null);
    });

    mockGet.mockImplementationOnce((sql, params, cb) => {
      cb(null, updatedEntry);
    });

    const result = await updateBurialRegisterEntry(1, updates);
    expect(result).toEqual(updatedEntry);
  });

  it('should return null for non-existent id', async () => {
    const updates = { name_raw: 'JANE' };

    mockRun.mockImplementationOnce((sql, params, cb) => cb(null));
    mockGet.mockImplementationOnce((sql, params, cb) => {
      cb(null, null);
    });

    const result = await updateBurialRegisterEntry(999, updates);
    expect(result).toBeNull();
  });

  it('should ignore non-editable fields (ai_provider, processed_date, etc.)', async () => {
    const updates = {
      name_raw: 'JANE',
      ai_provider: 'anthropic', // Should be ignored
      processed_date: '2026-04-03', // Should be ignored
      input_tokens: 500 // Should be ignored
    };

    mockRun.mockImplementationOnce((sql, params, cb) => {
      expect(sql).toContain('name_raw');
      expect(sql).not.toContain('ai_provider');
      expect(sql).not.toContain('processed_date');
      expect(sql).not.toContain('input_tokens');
      cb(null);
    });

    mockGet.mockImplementationOnce((sql, params, cb) => {
      cb(null, { id: 1, name_raw: 'JANE' });
    });

    await updateBurialRegisterEntry(1, updates);
  });

  it('should set edited_at timestamp', async () => {
    const updates = { name_raw: 'JANE' };

    let capturedSql = '';
    mockRun.mockImplementationOnce((sql, params, cb) => {
      capturedSql = sql;
      cb(null);
    });

    mockGet.mockImplementationOnce((sql, params, cb) => {
      cb(null, { id: 1 });
    });

    await updateBurialRegisterEntry(1, updates);
    expect(capturedSql).toContain('edited_at');
    expect(capturedSql).toContain('CURRENT_TIMESTAMP');
  });

  it('should store edited_fields as JSON array', async () => {
    const updates = {
      name_raw: 'JANE',
      burial_date_raw: '1857-04-10'
    };

    let capturedParams;
    mockRun.mockImplementationOnce((sql, params, cb) => {
      capturedParams = params;
      cb(null);
    });

    mockGet.mockImplementationOnce((sql, params, cb) => {
      cb(null, { id: 1 });
    });

    await updateBurialRegisterEntry(1, updates);

    // edited_fields should be in params as JSON string
    const editedFieldsJson = capturedParams.find(p =>
      typeof p === 'string' && p.includes('name_raw')
    );
    expect(editedFieldsJson).toBeTruthy();
  });

  it('should throw error for invalid id', async () => {
    const error = await updateBurialRegisterEntry(0, { name_raw: 'JANE' })
      .catch(e => e);
    expect(error).toBeInstanceOf(Error);
    expect(error.message).toContain('Invalid');
  });

  it('should throw error for empty fields', async () => {
    const error = await updateBurialRegisterEntry(1, {})
      .catch(e => e);
    expect(error).toBeInstanceOf(Error);
    expect(error.message).toContain('No fields');
  });

  it('should throw error if only non-editable fields provided', async () => {
    const updates = {
      ai_provider: 'openai',
      processed_date: '2026-04-03'
    };

    const error = await updateBurialRegisterEntry(1, updates)
      .catch(e => e);
    expect(error).toBeInstanceOf(Error);
    expect(error.message).toContain('No valid editable fields');
  });

  it('should handle database errors gracefully', async () => {
    const updates = { name_raw: 'JANE' };

    const dbError = new Error('Database error');
    mockRun.mockImplementationOnce((sql, params, cb) => {
      cb(dbError);
    });

    const error = await updateBurialRegisterEntry(1, updates)
      .catch(e => e);
    expect(error).toBe(dbError);
  });
});
