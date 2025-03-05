const fs = require('fs');
const { storeMemorial } = require('./database');
const logger = require('./logger');

const migrateFromJson = async (jsonPath) => {
  try {
    const jsonData = JSON.parse(fs.readFileSync(jsonPath));
    for (const record of jsonData) {
      await storeMemorial(record);
    }
    logger.info('Successfully migrated data from JSON to SQLite');
  } catch (error) {
    logger.error('Error migrating data:', error);
  }
};

module.exports = { migrateFromJson }; 