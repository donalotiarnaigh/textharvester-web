const sqlite3 = {
  verbose: () => ({
    Database: class {
      constructor() {}
      run() {}
      all() {}
      get() {}
      close() {}
    }
  })
};

module.exports = sqlite3; 