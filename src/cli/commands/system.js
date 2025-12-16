/**
 * System Command Module
 * Placeholder for Task 1.2
 * 
 * Will be fully implemented in Task 10.2.
 */

const { Command } = require('commander');
const { loadConfig } = require('../config');
const SystemService = require('../../services/SystemService');
const { formatOutput, formatError } = require('../output');

const system = new Command('system')
  .description('System administration commands');

// init-db subcommand
system
  .command('init-db')
  .description('Initialize database tables')
  .action(async (options) => {
    try {
      const config = await loadConfig(options);
      const service = new SystemService(config);
      const result = await service.initDb();
      formatOutput(result, 'system init-db', options);
    } catch (error) {
      formatError(error);
      process.exit(1);
    }
  });

// status subcommand
system
  .command('status')
  .description('Show system status (queue, record counts)')
  .action(async (options) => {
    try {
      const config = await loadConfig(options);
      const service = new SystemService(config);
      const result = await service.getStatus();
      formatOutput(result, 'system status', options);
    } catch (error) {
      formatError(error);
      process.exit(1);
    }
  });

// clear-queue subcommand
system
  .command('clear-queue')
  .description('Clear the processing queue')
  .option('--confirm', 'Confirm destructive operation (required in non-interactive mode)')
  .action(async (options) => {
    try {
      const config = await loadConfig(options);
      const service = new SystemService(config);
      const result = await service.clearQueue(options.confirm);
      formatOutput(result, 'system clear-queue', options);
    } catch (error) {
      formatError(error);
      process.exit(1);
    }
  });

module.exports = system;
