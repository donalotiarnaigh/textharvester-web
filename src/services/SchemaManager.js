const { db } = require('../utils/database');
const SchemaDDLGenerator = require('../utils/SchemaDDLGenerator');
const crypto = require('crypto');
const logger = require('../utils/logger');

class SchemaManager {
  /**
     * Creates a new custom schema and the corresponding database table
     * @param {Object} schemaDefinition
     * @returns {Promise<Object>} Created schema object
     */
  static async createSchema(schemaDefinition) {
    const id = crypto.randomUUID();
    let { name, tableName, fields, jsonSchema } = schemaDefinition;

    // 1a. Derive table name if missing
    if (!tableName && name) {
      tableName = 'custom_' + SchemaDDLGenerator.sanitizeIdentifier(name);
    }
    schemaDefinition.tableName = tableName; // Update original object for consistency

    // 1b. Derive fields from jsonSchema if missing (for DDL generation)
    if ((!fields || fields.length === 0) && jsonSchema && jsonSchema.properties) {
      fields = Object.entries(jsonSchema.properties).map(([fieldName, prop]) => ({
        name: fieldName,
        type: prop.type,
        description: prop.description
      }));
      schemaDefinition.fields = fields;
    }

    // 1. Generate SQL for the dynamic table
    const ddl = SchemaDDLGenerator.generateCreateTableSQL(schemaDefinition); // Validation happens here

    // 2. Prepare Metadata Insertion
    // Note: json_schema column stores the validation schema. 
    // If not present in def, we assume the def itself represents the structure.
    const jsonSchemaStr = JSON.stringify(schemaDefinition.jsonSchema || schemaDefinition);

    const insertSQL = `
      INSERT INTO custom_schemas (id, name, table_name, json_schema, created_at)
      VALUES (?, ?, ?, ?, CURRENT_TIMESTAMP)
    `;

    return new Promise((resolve, reject) => {
      // Use serialize to ensure operations run sequentially on this connection
      db.serialize(() => {
        // A. Insert Metadata
        db.run(insertSQL, [id, name, tableName, jsonSchemaStr], function (err) {
          if (err) {
            logger.error('SchemaManager: Metadata insertion failed', err);
            return reject(err);
          }

          // B. Create Dynamic Table
          db.run(ddl, [], function (err2) {
            if (err2) {
              logger.error(`SchemaManager: DDL execution failed for ${tableName}, rolling back.`, err2);

              // C. Rollback (Best Effort)
              db.run('DELETE FROM custom_schemas WHERE id = ?', [id], (err3) => {
                if (err3) logger.error('SchemaManager: Rollback failed', err3);
              });

              return reject(err2);
            }

            // Success
            logger.info(`Schema created: ${name} (${id})`);
            resolve({ ...schemaDefinition, id });
          });
        });
      });
    });
  }

  /**
     * Retrieves a schema by ID
     * @param {string} id
     * @returns {Promise<Object>} Schema object or null
     */
  static async getSchema(id) {
    return new Promise((resolve, reject) => {
      db.get('SELECT * FROM custom_schemas WHERE id = ?', [id], (err, row) => {
        if (err) return reject(err);
        if (!row) return resolve(null);

        try {
          if (row.json_schema) {
            row.json_schema = JSON.parse(row.json_schema);
          }
          resolve(row);
        } catch (parseErr) {
          logger.error(`SchemaManager: Failed to parse json_schema for ${id}`, parseErr);
          reject(parseErr);
        }
      });
    });
  }

  /**
     * Lists all custom schemas
     * @returns {Promise<Array>} List of schemas
     */
  static async listSchemas() {
    return new Promise((resolve, reject) => {
      db.all('SELECT * FROM custom_schemas ORDER BY created_at DESC', [], (err, rows) => {
        if (err) return reject(err);

        const schemas = rows.map(row => {
          try {
            return {
              ...row,
              json_schema: row.json_schema ? JSON.parse(row.json_schema) : {}
            };
          } catch {
            return row;
          }
        });
        resolve(schemas);
      });
    });
  }
}

module.exports = SchemaManager;
