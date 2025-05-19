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
            const error = new Error('CHECK constraint failed: valid_year');
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

    if (sql.includes('SELECT COUNT(*) as count')) {
      callback(null, { count: this.data.length });
      return;
    }

    if (sql.includes('SELECT * FROM memorials WHERE id = ?')) {
      const id = params[0];
      const record = this.data.find(r => r.id === id);
      callback(null, record);
      return;
    }

    callback(null, null);
  }

  all(sql, params, callback) {
    if (typeof params === 'function') {
      callback = params;
      params = [];
    }

    if (sql.includes('SELECT * FROM memorials ORDER BY processed_date DESC')) {
      const sortedData = [...this.data].sort((a, b) => 
        new Date(b.processed_date).getTime() - new Date(a.processed_date).getTime()
      );
      callback(null, sortedData);
      return;
    }

    callback(null, []);
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