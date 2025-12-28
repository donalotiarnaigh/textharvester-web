const fs = require('fs').promises;
const path = require('path');
const Ajv = require('ajv');
const SchemaManager = require('../services/SchemaManager');
const { db } = require('./database');
const { createProvider } = require('./modelProviders');
const defaultLogger = require('./logger');
const { analyzeImageForProvider, optimizeImageForProvider } = require('./imageProcessor');

class DynamicProcessor {
  constructor(logger = defaultLogger) {
    this.ajv = new Ajv({ allErrors: true });
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

    // Image Optimization Logic
    let base64Image;
    // Simple check: if optimization throws or isn't needed, read file.
    // We accept that analyzeImageForProvider is robust.
    try {
      const analysis = await analyzeImageForProvider(filePath, providerName);
      if (analysis.needsOptimization) {
        base64Image = await optimizeImageForProvider(filePath, providerName);
      } else {
        base64Image = await fs.readFile(filePath, { encoding: 'base64' });
      }
    } catch (err) {
      // Fallback to direct read if analysis fails
      this.logger.warn(`Optimization check failed for ${filePath}, falling back to raw read`, err);
      base64Image = await fs.readFile(filePath, { encoding: 'base64' });
    }

    const provider = createProvider({ AI_PROVIDER: providerName });
    const modelVersion = provider.getModelVersion();

    // Construct Prompts
    const systemPrompt = schema.system_prompt || 'Analyze this image and extract the data based on the requirements.';
    // User prompt is usually fixed or strictly driven by fields for dynamic schemas
    const userPrompt = schema.user_prompt_template || 'Extract the data fields matching the schema.';

    // 3. Call LLM
    this.logger.info(`Processing ${path.basename(filePath)} with schema ${schema.name} (${schemaId})`);
    let rawResponse;
    try {
      rawResponse = await provider.processImage(base64Image, userPrompt, { systemPrompt });
    } catch (err) {
      this.logger.error('LLM Error', err);
      throw err;
    }

    // 4. Validate
    let data;
    try {
      // Handle "```json" blocks if provider returns markdown
      const cleanJson = rawResponse.replace(/```json\n?|```/g, '').trim();
      data = JSON.parse(cleanJson);
    } catch (e) {
      this.logger.warn('JSON Parse Error', e);
      throw new Error(`LLM returned invalid JSON: ${rawResponse ? rawResponse.substring(0, 100) : 'null'}...`);
    }

    // JSON Schema Validation
    const validate = this.ajv.compile(schema.json_schema);
    const valid = validate(data);

    if (!valid) {
      const errorDetails = {
        schemaId,
        validationErrors: validate.errors,
        rawValue: data
      };
      this.logger.error(`Validation failed for ${filePath}:`, errorDetails);
      throw new Error(`Validation failed: ${this.ajv.errorsText(validate.errors)}`);
    }

    // 5. Insert
    const tableName = schema.table_name;

    // Metadata columns (Standard columns required by design)
    const metadata = {
      file_name: path.basename(filePath),
      processed_date: new Date().toISOString(),
      ai_provider: providerName,
      model_version: modelVersion,
      batch_id: file.batchId || null
    };

    const allData = { ...data, ...metadata };
    const columns = Object.keys(allData);

    // Safety: Ensure column names are safe (should be if valid JSON key, but strict SQL would prefer whitelist)
    // In our design, the TABLE is created from schema.
    // But if LLM hallucinated an extra field that AJV allowed (if additionalProperties=true by default in some JSON schemas),
    // SQL insert will FAIL because column doesn't exist.
    // Ideally, we restrict `allData` keys to those present in the table.
    // But we don't know table columns here easily without querying DB or Schema definition deeply.
    // For now, allow DB to error if column is missing, or rely on AJV strictness.

    const placeholders = columns.map(() => '?').join(', ');
    const values = columns.map(col => {
      const val = allData[col];
      return (typeof val === 'object' && val !== null) ? JSON.stringify(val) : val;
    });

    // Sanitize table name (it comes from our DB, trusted, but good practice)
    // It should have been sanitized on creation.
    const safeTableName = tableName.replace(/[^a-z0-9_]/g, '');

    const sql = `INSERT INTO ${safeTableName} (${columns.map(c => c.replace(/[^a-z0-9_]/g, '')).join(', ')}) VALUES (${placeholders})`;

    const logger = this.logger;

    return new Promise((resolve, reject) => {
      db.run(sql, values, function (err) {
        if (err) {
          logger.error('Database insertion failed', { schemaId, error: err, sql: sql.substring(0, 200) });
          return reject(err);
        }
        resolve({
          success: true,
          recordId: this.lastID,
          data: allData
        });
      });
    });
  }
}

module.exports = DynamicProcessor;
