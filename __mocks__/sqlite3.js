// Mock SQLite3 implementation
class Database {
  constructor() {
    this.data = [];
    this.lastId = 0;
  }

  run(sql, params, callback) {
    if (typeof params === 'function') {
      callback = params;
      params = [];
    }

    if (sql.includes('CREATE TABLE')) {
      // Simulate table creation
      if (callback) callback.call({ lastID: null });
      return;
    }

    if (sql.includes('DELETE FROM')) {
      // Simulate table clearing
      this.data = [];
      if (callback) callback.call({ lastID: null });
      return;
    }

    if (sql.includes('INSERT INTO')) {
      // Simulate insert
      this.lastId++;
      const record = {
        id: this.lastId,
        ...Object.fromEntries(
          ['memorial_number', 'first_name', 'last_name', 'year_of_death', 'inscription', 'file_name', 'ai_provider', 'model_version']
          .map((key, index) => [key, params[index]])
        ),
        processed_date: new Date().toISOString()
      };
      this.data.push(record);
      if (callback) callback.call({ lastID: this.lastId });
      return;
    }
  }

  get(sql, params, callback) {
    if (typeof params === 'function') {
      callback = params;
      params = [];
    }

    const id = params[0];
    const record = this.data.find(r => r.id === id);
    if (callback) callback(null, record || null);
  }

  all(sql, callback) {
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