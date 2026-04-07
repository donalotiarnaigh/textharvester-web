const SchemaManager = require('../../src/services/SchemaManager');
const SchemaDDLGenerator = require('../../src/utils/SchemaDDLGenerator');
const { db } = require('../../src/utils/database');

// Mock dependencies
jest.mock('../../src/utils/database', () => ({
  db: {
    run: jest.fn(),
    get: jest.fn(),
    all: jest.fn(),
    serialize: jest.fn(cb => cb()) // Mock serialize to execute callback immediately
  },
  runColumnMigration: jest.fn()
}));

jest.mock('../../src/utils/SchemaDDLGenerator');
jest.mock('../../src/utils/logger', () => ({
  info: jest.fn(),
  error: jest.fn(),
  warn: jest.fn()
}));

describe('SchemaManager', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('createSchema', () => {
    const validDef = {
      name: 'Test Schema',
      tableName: 'test_schema',
      fields: [{ name: 'field1', type: 'string' }]
    };

    test('should create schema and table successfully', async () => {
      // Setup mocks
      SchemaDDLGenerator.generateCreateTableSQL.mockReturnValue('CREATE TABLE custom_test_schema ...');

      // Mock db.run to succeed
      // db.run has different signatures. Usually (sql, params, callback).
      // We need to implement a helper to promisify it in the service, or the service uses util.promisify?
      // Or we can mock the implementation to callback with null (success).
      db.run.mockImplementation((sql, params, cb) => {
        if (typeof params === 'function') cb = params;
        if (cb) cb(null); // Success
      });

      const result = await SchemaManager.createSchema(validDef);

      expect(SchemaDDLGenerator.generateCreateTableSQL).toHaveBeenCalledWith(validDef);
      expect(db.run).toHaveBeenCalledTimes(2); // 1. Insert meta, 2. Create table
      expect(result).toHaveProperty('id');
      expect(result.name).toBe(validDef.name);
    });

    test('should rollback if table creation fails', async () => {
      // Mock insert success, but create table fail
      let callCount = 0;
      db.run.mockImplementation((sql, params, cb) => {
        if (typeof params === 'function') cb = params;
        callCount++;
        if (callCount === 1) {
          // Insert meta success
          cb(null);
        } else {
          // Create table fail
          cb(new Error('SQL Error'));
        }
      });

      await expect(SchemaManager.createSchema(validDef)).rejects.toThrow('SQL Error');

      // Expect rollback (delete from custom_schemas)
      // This implies transaction usage or manual rollback
      // Expect at least 3 calls: Insert, Create Table, Delete (Rollback)
      expect(db.run).toHaveBeenCalledTimes(3);
      expect(db.run).toHaveBeenLastCalledWith(expect.stringMatching(/DELETE FROM custom_schemas/), expect.any(Array), expect.any(Function));
    });

    test('should throw error if name already exists', async () => {
      // Implementation might check name first OR rely on DB unique constraint.
      // If relying on DB constraint, the first db.run (insert) will fail.
      db.run.mockImplementation((sql, params, cb) => {
        if (typeof params === 'function') cb = params;
        const err = new Error('UNIQUE constraint failed');
        err.code = 'SQLITE_CONSTRAINT';
        cb(err);
      });

      await expect(SchemaManager.createSchema(validDef)).rejects.toThrow('UNIQUE constraint failed');
    });
  });

  describe('getSchema', () => {
    test('should return schema by id', async () => {
      const mockSchema = { id: '123', name: 'Test', json_schema: '{"fields":[]}' };
      db.get.mockImplementation((sql, params, cb) => {
        cb(null, mockSchema);
      });

      const result = await SchemaManager.getSchema('123');
      expect(result.id).toBe('123');
      expect(result.json_schema).toBeInstanceOf(Object); // Should parse JSON string
    });

    test('should return null if not found', async () => {
      db.get.mockImplementation((sql, params, cb) => {
        cb(null, undefined);
      });
      const result = await SchemaManager.getSchema('999');
      expect(result).toBeNull();
    });
  });

  describe('listSchemas', () => {
    test('should return list of schemas', async () => {
      const rows = [
        { id: '1', name: 'A', json_schema: '{}' },
        { id: '2', name: 'B', json_schema: '{}' }
      ];
      db.all.mockImplementation((sql, params, cb) => {
        if (typeof params === 'function') cb = params;
        cb(null, rows);
      });

      const results = await SchemaManager.listSchemas();
      expect(results).toHaveLength(2);
      expect(results[0]).toHaveProperty('name', 'A');
    });
  });

  describe('updateSchema', () => {
    const existingSchema = {
      id: 'schema-123',
      version: 1,
      name: 'Test Schema',
      table_name: 'custom_test_schema',
      json_schema: JSON.stringify({
        type: 'object',
        properties: {
          field1: { type: 'string', description: 'Field 1' },
          field2: { type: 'number', description: 'Field 2' }
        },
        required: ['field1']
      })
    };

    beforeEach(() => {
      // Reset all mocks before each updateSchema test
      jest.clearAllMocks();
      db.serialize.mockImplementation(cb => cb());
    });

    test('should reject if schema not found', async () => {
      db.get.mockImplementation((sql, params, cb) => {
        cb(null, undefined);
      });

      await expect(SchemaManager.updateSchema('nonexistent', {})).rejects.toThrow('not found');
    });

    test('should reject type changes', async () => {
      db.get.mockImplementation((sql, params, cb) => {
        cb(null, existingSchema);
      });

      const changes = {
        jsonSchema: {
          type: 'object',
          properties: {
            field1: { type: 'number' }, // Changed from string to number
            field2: { type: 'number' }
          },
          required: ['field1']
        }
      };

      await expect(SchemaManager.updateSchema('schema-123', changes)).rejects.toThrow(/not supported|type/i);
    });

    test('should reject field removal', async () => {
      db.get.mockImplementation((sql, params, cb) => {
        cb(null, existingSchema);
      });

      const changes = {
        jsonSchema: {
          type: 'object',
          properties: {
            field1: { type: 'string' }
            // field2 removed
          },
          required: ['field1']
        }
      };

      await expect(SchemaManager.updateSchema('schema-123', changes)).rejects.toThrow(/removing/i);
    });

    test('should allow adding new fields', async () => {
      let getCallCount = 0;
      db.get.mockImplementation((sql, params, cb) => {
        getCallCount++;
        if (getCallCount === 1) {
          // First call: fetch existing schema
          cb(null, existingSchema);
        } else {
          // Second call: fetch after update (return with new schema version)
          const updated = {
            ...existingSchema,
            version: 2,
            json_schema: JSON.stringify({
              type: 'object',
              properties: {
                field1: { type: 'string' },
                field2: { type: 'number' },
                field3: { type: 'boolean' }
              },
              required: ['field1']
            })
          };
          cb(null, updated);
        }
      });

      db.run.mockImplementation((sql, params, cb) => {
        if (typeof params === 'function') cb = params;
        cb(null);
      });

      db.serialize.mockImplementation(cb => cb());

      const changes = {
        jsonSchema: {
          type: 'object',
          properties: {
            field1: { type: 'string' },
            field2: { type: 'number' },
            field3: { type: 'boolean' } // New field
          },
          required: ['field1']
        }
      };

      const result = await SchemaManager.updateSchema('schema-123', changes);

      expect(result).toBeDefined();
      expect(result.id).toBe('schema-123');
      expect(result.migration).toBeDefined();
      expect(result.migration.addedColumns).toContain('field3');
    });

    test('should increment version on update', async () => {
      let getCallCount = 0;
      db.get.mockImplementation((sql, params, cb) => {
        getCallCount++;
        if (getCallCount === 1) {
          cb(null, existingSchema);
        } else {
          const updated = {
            ...existingSchema,
            version: 2,
            json_schema: JSON.stringify({
              type: 'object',
              properties: {
                field1: { type: 'string' },
                field2: { type: 'number' },
                field3: { type: 'string' }
              },
              required: ['field1']
            })
          };
          cb(null, updated);
        }
      });

      db.run.mockImplementation((sql, params, cb) => {
        if (typeof params === 'function') cb = params;
        // Verify UPDATE sets version = version + 1
        if (sql && sql.includes('UPDATE') && sql.includes('version')) {
          expect(sql).toContain('version = version + 1');
        }
        cb(null);
      });

      db.serialize.mockImplementation(cb => cb());

      const changes = {
        jsonSchema: {
          type: 'object',
          properties: {
            field1: { type: 'string' },
            field2: { type: 'number' },
            field3: { type: 'string' } // New field
          },
          required: ['field1']
        }
      };

      await SchemaManager.updateSchema('schema-123', changes);
      expect(db.run).toHaveBeenCalled();
    });

    test('should allow description-only changes (no migration)', async () => {
      let getCallCount = 0;
      db.get.mockImplementation((sql, params, cb) => {
        getCallCount++;
        if (getCallCount === 1) {
          cb(null, existingSchema);
        } else {
          const updated = {
            ...existingSchema,
            json_schema: JSON.stringify({
              type: 'object',
              properties: {
                field1: { type: 'string', description: 'Updated description' },
                field2: { type: 'number', description: 'Different description' }
              },
              required: ['field1']
            })
          };
          cb(null, updated);
        }
      });

      db.run.mockImplementation((sql, params, cb) => {
        if (typeof params === 'function') cb = params;
        cb(null);
      });

      db.serialize.mockImplementation(cb => cb());

      const changes = {
        jsonSchema: {
          type: 'object',
          properties: {
            field1: { type: 'string', description: 'Updated description' },
            field2: { type: 'number', description: 'Different description' }
          },
          required: ['field1']
        }
      };

      const result = await SchemaManager.updateSchema('schema-123', changes);

      // Should return migration with empty addedColumns
      expect(result.migration.addedColumns).toHaveLength(0);
    });

    test('should allow required status changes', async () => {
      let getCallCount = 0;
      db.get.mockImplementation((sql, params, cb) => {
        getCallCount++;
        if (getCallCount === 1) {
          cb(null, existingSchema);
        } else {
          const updated = {
            ...existingSchema,
            json_schema: JSON.stringify({
              type: 'object',
              properties: {
                field1: { type: 'string' },
                field2: { type: 'number' }
              },
              required: ['field1', 'field2']
            })
          };
          cb(null, updated);
        }
      });

      db.run.mockImplementation((sql, params, cb) => {
        if (typeof params === 'function') cb = params;
        cb(null);
      });

      db.serialize.mockImplementation(cb => cb());

      const changes = {
        jsonSchema: {
          type: 'object',
          properties: {
            field1: { type: 'string' },
            field2: { type: 'number' }
          },
          required: ['field1', 'field2'] // field2 now required
        }
      };

      const result = await SchemaManager.updateSchema('schema-123', changes);

      expect(result).toBeDefined();
      expect(result.migration.addedColumns).toHaveLength(0);
    });
  });
});
