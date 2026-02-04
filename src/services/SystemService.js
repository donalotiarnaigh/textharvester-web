const fs = require('fs').promises;
const { CLIError } = require('../cli/errors');
const logger = require('../utils/logger');
const database = require('../utils/database');
const burialRegisterStorage = require('../utils/burialRegisterStorage');
const graveCardStorage = require('../utils/graveCardStorage');
const fileQueue = require('../utils/fileQueue');

class SystemService {
  constructor(config) {
    this.config = config;
    this.dbPath = config.dbPath || './data/memorials.db';
  }

  /**
     * Initialize database tables
     * @returns {Promise<Object>}
     */
  async initDb() {
    try {
      logger.info('Initializing system databases...');

      // Initialize main memorials table
      database.initializeDatabase();

      // Initialize burial register table
      database.initializeBurialRegisterTable();

      // Initialize grave cards table
      await graveCardStorage.initialize();

      return {
        success: true,
        message: 'Database initialized successfully'
      };
    } catch (error) {
      logger.error('Database initialization failed:', error);
      throw new CLIError('DATABASE_ERROR', `Database initialization failed: ${error.message}`, { error });
    }
  }

  /**
     * Get system status including queue length and record counts
     * @returns {Promise<Object>}
     */
  async getStatus() {
    try {
      // Get DB stats
      let dbStats = {
        path: this.dbPath,
        size_bytes: 0,
        last_modified: null
      };

      try {
        const stats = await fs.stat(this.dbPath);
        dbStats.size_bytes = stats.size;
        dbStats.last_modified = stats.mtime.toISOString();
      } catch (err) {
        if (err.code !== 'ENOENT') {
          logger.warn('Could not get database file stats:', err);
        }
      }

      // Get record counts
      // Note: getAll* methods might be heavy for large DBs, 
      // ideally we'd implement getCount* methods in storageutils in future refactoring.
      const memorials = await database.getAllMemorials();
      const burialRegisters = await burialRegisterStorage.getAllBurialRegisterEntries();
      const graveCards = await graveCardStorage.getAllGraveCards();

      // Get queue status
      const progress = fileQueue.getProcessingProgress();
      const queueStatus = progress.queue || { size: 0, pending: 0, processing: 0 };

      return {
        database: {
          ...dbStats,
          records: {
            memorial: memorials.length,
            burial_register: burialRegisters.length,
            grave_record_card: graveCards.length
          }
        },
        queue: {
          pending: queueStatus.size, // Approximate mapping based on available fields
          processing: 0 // queueMonitor details not fully exposed in simple struct, using size
        },
        system: {
          timestamp: new Date().toISOString()
        }
      };
    } catch (error) {
      logger.error('Failed to get system status:', error);
      throw new CLIError('INTERNAL_ERROR', `Failed to get system status: ${error.message}`);
    }
  }

  /**
     * Clear the processing queue
     * @param {boolean} confirm - Confirmation flag required for destructive operation
     * @returns {Promise<Object>}
     */
  async clearQueue(confirm = false) {
    if (!confirm) {
      throw new CLIError('CONFIRMATION_REQUIRED', 'Destructive operation requires --confirm flag');
    }

    try {
      const initialCount = fileQueue.getTotalFiles();
      fileQueue.cancelProcessing();

      return {
        success: true,
        message: 'Queue cleared successfully',
        cleared_count: initialCount
      };
    } catch (error) {
      logger.error('Failed to clear queue:', error);
      throw new CLIError('INTERNAL_ERROR', `Failed to clear queue: ${error.message}`);
    }
  }

  /**
     * Perform cleanup operations (e.g., close DB connection)
     * @returns {Promise<void>}
     */
  async cleanup() {
    try {
      if (database.db) {
        await new Promise((resolve, reject) => {
          database.db.close((err) => {
            if (err) reject(err);
            else resolve();
          });
        });
        logger.info('Database connection closed');
      }
    } catch (error) {
      logger.error('Error during cleanup:', error);
      // Don't throw here, just log, as we're likely exiting anyway
    }
  }
  /**
     * Clear data from the database
     * @param {string} type - data type to clear (memorial, burial_register, grave_record_card, all)
     * @param {boolean} confirm - Confirmation flag required for destructive operation
     * @returns {Promise<Object>}
     */
  async clearData(type = 'all', confirm = false) {
    if (!confirm) {
      throw new CLIError('CONFIRMATION_REQUIRED', 'Destructive operation requires --confirm flag');
    }

    try {
      const results = {};

      if (type === 'all' || type === 'memorial' || type === 'transcription') { // Handle 'transcription' alias if used
        try {
          // Assuming clearAllMemorials returns a promise (it does in database.js)
          await database.clearAllMemorials();
          results.memorials = 'Cleared';
        } catch (e) {
          results.memorials = `Failed: ${e.message}`;
        }
      }

      if (type === 'all' || type === 'burial_register') {
        try {
          await burialRegisterStorage.clearAllBurialRegisterEntries();
          results.burial_registers = 'Cleared';
        } catch (e) {
          results.burial_registers = `Failed: ${e.message}`;
        }
      }

      if (type === 'all' || type === 'grave_record_card') {
        try {
          await graveCardStorage.clearAllGraveCards();
          results.grave_cards = 'Cleared';
        } catch (e) {
          results.grave_cards = `Failed: ${e.message}`;
        }
      }

      // Also clear custom schemas if 'all' or 'custom'
      if (type === 'all' || type === 'custom') {
        // Logic for custom schemas would go here, skipping for now to keep it simple and consistent with current capabilities
      }

      return {
        success: true,
        message: 'Data clear operation completed',
        details: results
      };
    } catch (error) {
      logger.error('Failed to clear data:', error);
      throw new CLIError('INTERNAL_ERROR', `Failed to clear data: ${error.message}`);
    }
  }
}

module.exports = SystemService;
