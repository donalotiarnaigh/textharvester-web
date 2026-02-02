/**
 * Database migration script for Typographic Analysis feature.
 * Adds 5 new columns to the memorials table for storing rich analysis data.
 * 
 * New columns:
 * - transcription_raw: Line-for-line transcription with | separators
 * - stone_condition: Material and weathering description
 * - typography_analysis: JSON-serialized typography details
 * - iconography: JSON-serialized iconography details  
 * - structural_observations: Layout and structural notes
 * 
 * Requirements covered:
 * - 4.2: Migration adds columns without affecting existing data
 * - 5.4: Migration is idempotent (safe to run twice)
 * - 5.7: Running twice detects existing columns and skips
 * 
 * Usage:
 *   node scripts/migrate-add-typographic-analysis.js
 * 
 * @see docs/typographic-analysis/tasks.md Task 1.2
 */

const sqlite3 = require('sqlite3').verbose();
const path = require('path');
const fs = require('fs');
const logger = require('../src/utils/logger');

// Columns to be added by this migration
const NEW_COLUMNS = [
    { name: 'transcription_raw', type: 'TEXT' },
    { name: 'stone_condition', type: 'TEXT' },
    { name: 'typography_analysis', type: 'TEXT' },
    { name: 'iconography', type: 'TEXT' },
    { name: 'structural_observations', type: 'TEXT' }
];

/**
 * Add typographic analysis columns to the memorials table.
 * 
 * @param {string} [dbPath] - Optional database path (defaults to project database)
 * @returns {Promise<boolean>} - Resolves to true on success
 * @throws {Error} - If memorials table doesn't exist or database is inaccessible
 */
async function addTypographicAnalysisColumns(dbPath) {
    // Use provided path or default to project database
    const finalDbPath = dbPath || path.join(__dirname, '../data/memorials.db');

    // Check if database file exists (skip for :memory: databases)
    if (finalDbPath !== ':memory:' && !fs.existsSync(finalDbPath)) {
        logger.info('Database file does not exist. Migration not needed.');
        return true;
    }

    return new Promise((resolve, reject) => {
        const db = new sqlite3.Database(finalDbPath, sqlite3.OPEN_READWRITE, (err) => {
            if (err) {
                logger.error('Error connecting to database for migration:', err);
                reject(err);
                return;
            }

            // First, verify memorials table exists
            db.get(
                "SELECT name FROM sqlite_master WHERE type='table' AND name='memorials'",
                (err, row) => {
                    if (err) {
                        logger.error('Error checking for memorials table:', err);
                        db.close();
                        reject(err);
                        return;
                    }

                    if (!row) {
                        const error = new Error('memorials table does not exist. Cannot run migration.');
                        logger.error(error.message);
                        db.close();
                        reject(error);
                        return;
                    }

                    // Get existing columns
                    db.all('PRAGMA table_info(memorials)', (err, columns) => {
                        if (err) {
                            logger.error('Error checking table structure:', err);
                            db.close();
                            reject(err);
                            return;
                        }

                        const existingColumnNames = columns.map(col => col.name);
                        const columnsToAdd = NEW_COLUMNS.filter(
                            col => !existingColumnNames.includes(col.name)
                        );

                        if (columnsToAdd.length === 0) {
                            logger.info('✓ All typographic analysis columns already exist');
                            db.close();
                            resolve(true);
                            return;
                        }

                        logger.info(`Adding ${columnsToAdd.length} typographic analysis columns...`);

                        // Add columns sequentially using recursive approach
                        const addColumnAtIndex = (index) => {
                            if (index >= columnsToAdd.length) {
                                logger.info('✓ Successfully added all typographic analysis columns');
                                db.close();
                                resolve(true);
                                return;
                            }

                            const col = columnsToAdd[index];
                            const sql = `ALTER TABLE memorials ADD COLUMN ${col.name} ${col.type}`;

                            db.run(sql, (err) => {
                                if (err) {
                                    // Check if it's a "duplicate column" error (shouldn't happen but be safe)
                                    if (err.message && err.message.includes('duplicate column')) {
                                        logger.warn(`Column ${col.name} already exists (concurrent migration?)`);
                                        addColumnAtIndex(index + 1);
                                    } else {
                                        logger.error(`Error adding column ${col.name}:`, err);
                                        db.close();
                                        reject(err);
                                    }
                                } else {
                                    logger.info(`  ✓ Added column: ${col.name}`);
                                    addColumnAtIndex(index + 1);
                                }
                            });
                        };

                        // Start adding columns from index 0
                        addColumnAtIndex(0);
                    });
                }
            );
        });
    });
}

// Run the migration if this script is executed directly
if (require.main === module) {
    addTypographicAnalysisColumns()
        .then(() => {
            logger.info('Migration completed successfully');
            process.exit(0);
        })
        .catch((err) => {
            logger.error('Migration failed:', err);
            process.exit(1);
        });
}

module.exports = { addTypographicAnalysisColumns };
