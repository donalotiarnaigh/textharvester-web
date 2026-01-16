const RESERVED_KEYWORDS = [
  'select', 'from', 'table', 'insert', 'update', 'delete', 'drop',
  'where', 'order', 'limit', 'group', 'by', 'having', 'join',
  'on', 'create', 'alter', 'index', 'view'
];

/**
 * SchemaDDLGenerator
 * 
 * Utility for generating SQL DDL statements from CustomSchema definitions.
 * Handles sanitization, type mapping, and standard column inclusion.
 */
class SchemaDDLGenerator {
  /**
     * Generates a CREATE TABLE SQL statement for the given schema
     * @param {Object} schemaDefinition - The CustomSchema object
     * @returns {string} The SQL CREATE TABLE statement
     */
  static generateCreateTableSQL(schemaDefinition) {
    if (!schemaDefinition || !schemaDefinition.tableName || !schemaDefinition.fields) {
      throw new Error('Invalid schema definition');
    }

    const tableName = this.sanitizeIdentifier(schemaDefinition.tableName);
    const columns = [
      'id INTEGER PRIMARY KEY AUTOINCREMENT',
      'file_name TEXT',
      'processed_date DATETIME',
      'ai_provider TEXT',
      'model_version TEXT',
      'batch_id TEXT'
    ];

    schemaDefinition.fields.forEach(field => {
      const fieldName = this.sanitizeIdentifier(field.name);
      let sqlType = 'TEXT';

      switch (field.type) {
      case 'number':
        sqlType = 'REAL';
        break;
      case 'boolean':
        sqlType = 'INTEGER';
        break;
      case 'date':
        sqlType = 'TEXT';
        break;
      case 'string':
      default:
        sqlType = 'TEXT';
        break;
      }
      columns.push(`${fieldName} ${sqlType}`);
    });

    return `CREATE TABLE ${tableName} (\n  ${columns.join(',\n  ')}\n);`;
  }

  /**
     * Sanitizes a string for use as a SQL identifier
     * @param {string} name 
     * @returns {string}
     */
  static sanitizeIdentifier(name) {
    if (!name) return '';

    // Lowercase and replace non-alphanumeric (except underscores) with underscores
    let sanitized = name.toLowerCase().replace(/[^a-z0-9_]/g, '_');

    // Remove repeated underscores
    sanitized = sanitized.replace(/_+/g, '_');

    // Remove leading/trailing underscores
    sanitized = sanitized.replace(/^_+|_+$/g, '');

    // Check reserved words
    if (RESERVED_KEYWORDS.includes(sanitized)) {
      return `extracted_${sanitized}`;
    }

    return sanitized;
  }
}

module.exports = SchemaDDLGenerator;
