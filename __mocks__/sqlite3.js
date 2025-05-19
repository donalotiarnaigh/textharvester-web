// Mock SQLite3 implementation
class Database {
  constructor() {
    this.data = [];
    this.lastId = 0;
    this.schema = new Map();
    this.indexes = new Map();
  }

  run(sql, params, callback) {
    if (typeof params === 'function') {
      callback = params;
      params = [];
    }

    if (sql.includes('DROP TABLE')) {
      const tableName = sql.match(/DROP TABLE.*?(\w+)/)[1];
      this.schema.delete(tableName);
      this.data = [];
      if (callback) callback.call({ lastID: null });
      return;
    }

    if (sql.includes('CREATE TABLE')) {
      // Store table schema
      const tableName = sql.match(/CREATE TABLE.*?(\w+)/)[1];
      this.schema.set(tableName, sql);
      if (callback) callback.call({ lastID: null });
      return;
    }

    if (sql.includes('CREATE INDEX')) {
      // Store index
      const indexName = sql.match(/CREATE INDEX.*?(\w+)/)[1];
      this.indexes.set(indexName, sql);
      if (callback) callback.call({ lastID: null });
      return;
    }

    if (sql.includes('DELETE FROM')) {
      this.data = [];
      if (callback) callback.call({ lastID: null });
      return;
    }

    if (sql.includes('INSERT INTO memorials')) {
      try {
        // Extract column names from SQL, handling multi-line SQL
        const sqlNoNewlines = sql.replace(/\s+/g, ' ');
        const columnMatch = sqlNoNewlines.match(/\((.*?)\)\s+VALUES/);
        if (!columnMatch) {
          throw new Error('Invalid INSERT statement format');
        }
        const columns = columnMatch[1].split(',').map(c => c.trim());
        
        // Create record object from params
        const record = {};
        columns.forEach((col, index) => {
          record[col] = params[index];
        });

        // Validate NOT NULL constraint for file_name
        if (!record.file_name) {
          const error = new Error('SQLITE_CONSTRAINT: NOT NULL constraint failed: file_name');
          if (callback) callback.call(null, error);
          return;
        }

        // Validate year_of_death constraint
        if (record.year_of_death) {
          const currentYear = new Date().getFullYear();
          if (record.year_of_death <= 1500 || record.year_of_death > currentYear + 1) {
            const error = new Error('SQLITE_CONSTRAINT: CHECK constraint failed: valid_year');
            if (callback) callback.call(null, error);
            return;
          }
        }

        // Add metadata
        this.lastId++;
        record.id = this.lastId;
        record.processed_date = new Date().toISOString();

        // Store record
        this.data.push(record);
        if (callback) callback.call({ lastID: this.lastId });
      } catch (error) {
        if (callback) callback.call(null, error);
      }
      return;
    }

    // Default callback for unhandled queries
    if (callback) callback.call({ lastID: null });
  }

  get(sql, params, callback) {
    if (typeof params === 'function') {
      callback = params;
      params = [];
    }

    if (sql.includes('sqlite_master')) {
      if (sql.includes("type='table'")) {
        const tableName = sql.match(/name='(\w+)'/)[1];
        const result = this.schema.get(tableName) ? { sql: this.schema.get(tableName) } : null;
        if (callback) callback(null, result);
        return;
      }
      if (sql.includes("type='index'")) {
        const indexes = Array.from(this.indexes.entries()).map(([name, sql]) => ({ name, sql }));
        if (callback) callback(null, indexes);
        return;
      }
    }

    if (sql.includes('typeof')) {
      // Handle type checking queries
      const row = {
        num_type: 'integer',
        year_type: 'integer'
      };
      if (callback) callback(null, row);
      return;
    }

    // Handle normal SELECT queries
    if (sql.includes('SELECT *')) {
      if (sql.includes('ORDER BY')) {
        const orderBy = sql.match(/ORDER BY\s+(\w+)/)[1];
        this.data.sort((a, b) => a[orderBy] - b[orderBy]);
      }
      if (callback) callback(null, this.data);
      return;
    }

    // Default to returning first record for other queries
    if (callback) callback(null, this.data[0] || null);
  }

  all(sql, params, callback) {
    if (typeof params === 'function') {
      callback = params;
      params = [];
    }
    
    if (sql.includes('sqlite_master')) {
      const indexes = Array.from(this.indexes.entries()).map(([name, sql]) => ({ name, sql }));
      if (callback) callback(null, indexes);
      return;
    }

    if (callback) callback(null, this.data);
  }

  close(callback) {
    if (callback) callback();
  }

  serialize(fn) {
    fn();
  }
}

module.exports = {
  verbose: () => ({
    Database
  })
}; 