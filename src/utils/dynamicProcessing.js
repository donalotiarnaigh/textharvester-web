const fs = require('fs').promises;
const path = require('path');
const Ajv = require('ajv');
const SchemaManager = require('../services/SchemaManager');
const { db } = require('./database');
const { createProvider } = require('./modelProviders');
const defaultLogger = require('./logger');
const { analyzeImageForProvider, optimizeImageForProvider } = require('./imageProcessor');
const { convertPdfToJpegs } = require('./pdfConverter');

class DynamicProcessor {
  constructor(logger = defaultLogger) {
    // Allow coerceTypes to cast strings to numbers/booleans, nullable allows null for any type
    this.ajv = new Ajv({ allErrors: true, coerceTypes: true, nullable: true });
    this.logger = logger;
  }

  /**
       * Process a file using a specific dynamic schema.
       * @param {Object} file - File object (path, provider, etc.)
       * @param {string} schemaId - UUID of the custom schema
       * @returns {Promise<Object>} Result with recordId and data
       */
  async processFileWithSchema(file, schemaId) {
    // 1. Retrieve Schema
    const schema = await SchemaManager.getSchema(schemaId);
    if (!schema) {
      throw new Error('Invalid Schema ID');
    }

    // 2. Prepare Context (File & Prompt)
    const filePath = file.path || file.filepath; // Handle typical multer or direct objects
    if (!filePath) {
      throw new Error('File path missing in file object');
    }

    const providerName = file.provider || process.env.AI_PROVIDER || 'openai';

    // PDF Conversion if needed
    let fileToProcess = filePath;
    let cleanupFile = null;

    if (path.extname(filePath).toLowerCase() === '.pdf') {
      try {
        // keepSource: true because IngestService might manage the source file
        const images = await convertPdfToJpegs(filePath, { keepSource: true });
        if (images.length > 0) {
          fileToProcess = images[0];
          cleanupFile = images[0];

          // Clean up other pages immediately if any
          for (let i = 1; i < images.length; i++) {
            await fs.unlink(images[i]).catch(() => { });
          }
        }
      } catch (err) {
        this.logger.warn(`PDF conversion failed for ${filePath}`, err);
        throw err;
      }
    }

    try {
      // Image Optimization Logic
      let base64Image;
      try {
        const analysis = await analyzeImageForProvider(fileToProcess, providerName);
        if (analysis.needsOptimization) {
          base64Image = await optimizeImageForProvider(fileToProcess, providerName);
        } else {
          base64Image = await fs.readFile(fileToProcess, { encoding: 'base64' });
        }
      } catch (err) {
        // Fallback to direct read if analysis fails
        this.logger.warn(`Optimization check failed for ${fileToProcess}, falling back to raw read`, err);
        base64Image = await fs.readFile(fileToProcess, { encoding: 'base64' });
      }

      const provider = createProvider({ AI_PROVIDER: providerName });
      const modelVersion = provider.getModelVersion();

      // Construct Prompts
      const systemPrompt = (schema.system_prompt || 'Analyze this image and extract the data based on the requirements.') + ' Return valid JSON.';
      const fieldList = schema.json_schema && schema.json_schema.properties ? Object.keys(schema.json_schema.properties).join(', ') : '';
      const userPrompt = (schema.user_prompt_template || 'Extract the data fields matching the schema.') + (fieldList ? ` Ensure you use these exact keys: ${fieldList}.` : '');

      // 3. Call LLM
      this.logger.info(`Processing ${path.basename(filePath)} with schema ${schema.name} (${schemaId})`);
      let rawResponse;
      try {
        rawResponse = await provider.processImage(base64Image, userPrompt, { systemPrompt });
      } catch (err) {
        this.logger.error('LLM Error', err);
        throw err;
      }

      // 4. Validate and Normalise
      let data;
      let records = [];
      try {
        if (typeof rawResponse === 'object') {
          data = rawResponse;
        } else {
          // Handle "```json" blocks if provider returns markdown
          const cleanJson = rawResponse.replace(/```json\n?|```/g, '').trim();
          data = JSON.parse(cleanJson);
        }
      } catch (e) {
        this.logger.warn('JSON Parse Error', e);
        // Only call substring if rawResponse is a string
        const responseStr = typeof rawResponse === 'string' ? rawResponse : JSON.stringify(rawResponse);
        throw new Error(`LLM returned invalid JSON: ${responseStr ? responseStr.substring(0, 100) : 'null'}...`);
      }

      // Helper to validate a single record against schema
      const validateRecord = (record) => {
        const validate = this.ajv.compile(schema.json_schema);
        const valid = validate(record);
        if (!valid) return { valid: false, errors: validate.errors };
        return { valid: true };
      };

      // Helper to sanitize record based on schema types
      const sanitizeRecord = (record, jsonSchema) => {
        const clean = { ...record };
        const props = jsonSchema.properties || {};

        Object.keys(clean).forEach(key => {
          const type = props[key]?.type;
          let value = clean[key];

          // Handle Booleans (Yes/No, empty strings become null)
          if (type === 'boolean') {
            if (typeof value === 'string') {
              const lower = value.toLowerCase().trim();
              if (['yes', 'y', 'true', '1'].includes(lower)) {
                clean[key] = true;
              } else if (['no', 'n', 'false', '0'].includes(lower)) {
                clean[key] = false;
              } else if (lower === '' || lower === 'null' || lower === 'n/a' || lower === 'na' || lower === '-') {
                // Empty or null-like strings for booleans become null
                clean[key] = null;
              }
            } else if (value === null || value === undefined) {
              clean[key] = null;
            }
          }

          // Handle Numbers (remove commas, handle numeric strings)
          if ((type === 'number' || type === 'integer') && typeof value === 'string') {
            // Remove commas from numbers like "1,000"
            const numStr = value.replace(/,/g, '').trim();
            if (numStr === '' || numStr.toLowerCase() === 'null') {
              clean[key] = null; // Let validation decide if null is allowed
            } else if (!isNaN(Number(numStr))) {
              clean[key] = Number(numStr);
            }
          }

          // Handle Null strings
          if (typeof value === 'string' && value.toLowerCase() === 'null') {
            clean[key] = null;
          }
        });
        return clean;
      };

      // Determine if we have one record or multiple
      if (Array.isArray(data)) {
        records = data;
      } else if (typeof data === 'object' && data !== null) {
        // Check if it matches schema directly
        const singleValidation = validateRecord(data);
        if (singleValidation.valid) {
          records = [data];
        } else {
          // Check for nested array property that might contain records
          // Heuristic: Recursive search for first array, accumulating context (parent fields)
          const findArrayWithContext = (obj, context = {}) => {
            if (!obj || typeof obj !== 'object') return null;

            // 1. Gather current level primitives to add to context
            const currentContext = { ...context };
            for (const key of Object.keys(obj)) {
              if (typeof obj[key] !== 'object' || obj[key] === null) {
                currentContext[key] = obj[key];
              }
            }

            // 2. Check for direct array child (nested records)
            for (const key of Object.keys(obj)) {
              if (Array.isArray(obj[key])) {
                const arr = obj[key];
                // Only accept arrays if they contain objects
                if (arr.length > 0 && typeof arr[0] === 'object' && arr[0] !== null) {
                  return { array: arr, context: currentContext };
                }
              }
            }

            // 3. Check for Column-Oriented Data (arrays of primitives as fields)
            const arrayKeys = Object.keys(obj).filter(k => Array.isArray(obj[k]));
            if (arrayKeys.length > 0) {
              const lengths = arrayKeys.map(k => obj[k].length);
              // Check if all found arrays have same length (or we take the max/mode?)
              // Let's rely on the first array's length as the anchor, or check consistency.
              const anchorLength = lengths[0];
              const consistentEntryCount = lengths.every(l => l === anchorLength);

              // Minimum 2 records to be considered columnar? OR just > 0
              if (consistentEntryCount && anchorLength > 0) {
                // We have a columnar structure!
                // Pivot to rows
                const rows = [];
                for (let i = 0; i < anchorLength; i++) {
                  const row = {};
                  // Copy primitives from parent (context)
                  Object.assign(row, currentContext);

                  // Add array values for this index
                  for (const key of arrayKeys) {
                    row[key] = obj[key][i];
                  }

                  // Add non-array, non-object properties from THIS object (local context)
                  for (const key of Object.keys(obj)) {
                    if (!Array.isArray(obj[key]) && (typeof obj[key] !== 'object' || obj[key] === null)) {
                      row[key] = obj[key];
                    }
                  }
                  rows.push(row);
                }
                // Return as if it was a finding. Context is already merged in.
                return { array: rows, context: {} };
              }
            }

            // 3. Recursive check for nested objects
            for (const key of Object.keys(obj)) {
              if (typeof obj[key] === 'object' && !Array.isArray(obj[key]) && obj[key] !== null) {
                const found = findArrayWithContext(obj[key], currentContext);
                if (found) return found;
              }
            }
            return null;
          };

          const result = findArrayWithContext(data);

          if (result) {
            const { array: recordsArray, context } = result;
            this.logger.info(`Detected nested array containing ${recordsArray.length} items, attempting to extract records with inherited context.`);
            if (recordsArray.length > 0) {
              this.logger.info(`Sample record structure: ${JSON.stringify(recordsArray[0]).substring(0, 200)}`);
            }

            // Merge context into each record
            records = recordsArray.map(rec => {
              if (typeof rec === 'object' && rec !== null) {
                return { ...context, ...rec };
              }
              return rec;
            });
          } else {
            // It failed validation and no array found. Throw the original error.
            const errorDetails = {
              schemaId,
              validationErrors: singleValidation.errors,
              rawValue: data
            };
            this.logger.error(`Validation failed for ${filePath}:`, errorDetails);
            throw new Error(`Validation failed: ${this.ajv.errorsText(singleValidation.errors)}`);
          }
        }
      }

      // Validate all extracted records
      const validRecords = [];
      for (const [index, rec] of records.entries()) {
        const cleanedRec = sanitizeRecord(rec, schema.json_schema);
        const val = validateRecord(cleanedRec);
        if (val.valid) {
          validRecords.push(cleanedRec);
        } else {
          this.logger.warn(`Record ${index} failed validation, skipping.`, { errors: val.errors });
        }
      }

      if (validRecords.length === 0) {
        throw new Error('No valid records found in LLM output matching schema.');
      }

      this.logger.info(`Found ${validRecords.length} valid records to insert.`);

      // 5. Insert
      const tableName = schema.table_name;
      const safeTableName = tableName.replace(/[^a-z0-9_]/g, '');

      // Metadata columns
      const metadata = {
        file_name: path.basename(filePath),
        processed_date: new Date().toISOString(),
        ai_provider: providerName,
        model_version: modelVersion,
        batch_id: file.batchId || null
      };

      let insertedCount = 0;
      let lastID = 0;

      // Use a transaction or Promise.all for multiple inserts
      // SQLite in Node is usually serial, but let's do sequential to be safe with db.run

      for (const record of validRecords) {
        const allData = { ...record, ...metadata };

        // Generate columns based on keys present in this record that match valid schema columns + metadata
        // Note: This dynamic SQL generation is safe because we controlled table creation, but ideally we'd filter against known columns.
        // Since we don't have table definition loaded, we trust the valid record keys + metadata.

        const columns = Object.keys(allData);

        const placeholders = columns.map(() => '?').join(', ');
        const values = columns.map(col => {
          const val = allData[col];
          return (typeof val === 'object' && val !== null) ? JSON.stringify(val) : val;
        });

        const sanitizedCols = columns.map(c => c.replace(/[^a-z0-9_]/g, ''));
        const sql = `INSERT INTO ${safeTableName} (${sanitizedCols.join(', ')}) VALUES (${placeholders})`;

        await new Promise((resolve, reject) => {
          db.run(sql, values, function (err) {
            if (err) reject(err);
            else {
              lastID = this.lastID;
              resolve(this.lastID);
            }
          });
        });
        insertedCount++;
      }

      return {
        success: true,
        recordCount: insertedCount,
        recordId: lastID, // Backward compatibility for single record
        data: validRecords // Return the array of extracted data
      };
    } catch (err) {
      if (err.message.includes('Validation failed')) {
        // Already logged in validation step
      } else {
        this.logger.error('Processing failed', { schemaId, error: err });
        // Specifically for DB errors which might trigger the test expectation
        if (err.message.includes('SQL') || err.message.includes('Database')) {
          this.logger.error('Database insertion failed', { schemaId, error: err });
        }
      }
      throw err;
    } finally {
      if (cleanupFile) {
        await fs.unlink(cleanupFile).catch(err =>
          this.logger.warn('Failed to cleanup temp file', { file: cleanupFile, error: err })
        );
      }
    }
  }
}

module.exports = DynamicProcessor;
