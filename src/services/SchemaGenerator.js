const fs = require('fs');
const path = require('path');
const { convertPdfToJpegs } = require('../utils/pdfConverter');

class SchemaGenerator {
  constructor(llmProvider) {
    this.llmProvider = llmProvider;
    this.reservedKeywords = new Set([
      'select', 'delete', 'update', 'insert', 'drop', 'alter', 'create', 'table', 'from', 'where', 'limit', 'order', 'group', 'by', 'having', 'join', 'on', 'as', 'distinct', 'into', 'values', 'set', 'null', 'not', 'primary', 'key', 'foreign', 'references', 'default', 'check', 'constraint', 'index', 'unique', 'and', 'or', 'in', 'is', 'like', 'between', 'exists', 'case', 'when', 'then', 'else', 'end', 'cast', 'convert', 'full', 'outer', 'inner', 'left', 'right', 'cross', 'natural', 'union', 'except', 'intersect', 'offset', 'fetch', 'row', 'rows', 'only', 'top'
    ]);
  }

  /**
   * Defines the system instructions for the LLM to ensure consistent schema generation.
   * Optimized for token usage while retaining clarity.
   */
  static get SYSTEM_PROMPT() {
    return `You are an expert data architect. Analyze the provided document images to create a JSON Schema definition.
    Requirements:
    1. Identify the document type and suggest a snake_case 'tableName'.
    2. Extract consistent data fields. For each, provide 'name' (snake_case), 'type' (string, number, date, boolean), and 'description'.
    3. Output valid JSON only, matching this structure: { "tableName": "string", "fields": [{ "name": "string", "type": "string", "description": "string" }] }`;
  }

  /**
   * Analyzes example files and generates a schema definition.
   * @param {string[]} filePaths - Paths to the example files.
   * @returns {Promise<Object>} - The generated schema definition.
   */
  async generateSchema(filePaths) {
    // Construct prompt with system instructions
    const prompt = `${SchemaGenerator.SYSTEM_PROMPT}\n\nAnalyze this image and extract a schema definition.`;

    // Limit to first file for now as provider handles single image
    const sampleFile = filePaths[0];
    let fileToProcess = sampleFile;
    let cleanupFile = null;

    try {
      if (path.extname(sampleFile).toLowerCase() === '.pdf') {
        process.stdout.write(`Converting PDF ${path.basename(sampleFile)} for analysis... `);
        // keepSource: true because we are just proposing, we don't own the file to delete it
        const images = await convertPdfToJpegs(sampleFile, { keepSource: true });
        if (images.length > 0) {
          fileToProcess = images[0];
          cleanupFile = images[0]; // We only use the first page

          // Let's clean up unused pages immediately
          for (let i = 1; i < images.length; i++) {
            await fs.promises.unlink(images[i]).catch(() => { });
          }
          console.log('Done.');
        }
      }

      let base64Image;
      try {
        const fileBuffer = fs.readFileSync(fileToProcess);
        base64Image = fileBuffer.toString('base64');
      } catch (err) {
        throw new Error(`Failed to read file ${fileToProcess}: ${err.message}`);
      }

      let response;
      try {
        // Use processImage with raw=true because we handle parsing below
        response = await this.llmProvider.processImage(base64Image, prompt, { raw: true });
      } catch (error) {
        throw new Error(`LLM interaction failed: ${error.message}`);
      }

      // Cleanup temp image if we created one
      if (cleanupFile) {
        await fs.promises.unlink(cleanupFile).catch(() => { });
      }

      let parsed;
      try {
        parsed = JSON.parse(response);
      } catch (error) {
        throw new Error(`Failed to parse LLM response: ${error.message}`);
      }

      if (!parsed || parsed.error) {
        throw new Error('No consistent structure found');
      }

      if (!parsed.tableName || !parsed.fields || !Array.isArray(parsed.fields)) {
        throw new Error('No consistent structure found'); // Generic fallback for malformed schema
      }

      const sanitizedTableName = `custom_${this._sanitizeName(parsed.tableName)}`;
      const sanitizedFields = parsed.fields.map(field => ({
        ...field,
        name: this._sanitizeName(field.name)
      }));

      return {
        recommendedName: this._sanitizeName(parsed.tableName).replace(/_/g, ' '), // Human readable default name
        tableName: sanitizedTableName,
        fields: sanitizedFields,
        // Include system/user prompts for future use by DynamicProcessor
        jsonSchema: {
          type: 'object',
          properties: sanitizedFields.reduce((acc, f) => ({ ...acc, [f.name]: { type: f.type, description: f.description } }), {}),
          required: sanitizedFields.map(f => f.name)
        },
        systemPrompt: 'You are a data entry clerk. Extract the following fields from the document image.',
        userPromptTemplate: `Extract these fields: ${sanitizedFields.map(f => f.name).join(', ')}`
      };

    } catch (e) {
      if (cleanupFile) {
        await fs.promises.unlink(cleanupFile).catch(() => { });
      }
      throw e;
    }
  }

  /**
   * internal helper to sanitize names for SQL
   * @param {string} name
   * @returns {string}
   */
  _sanitizeName(name) {
    if (!name) return 'unnamed_field';

    // 1. Lowercase
    let sanitized = name.toLowerCase();

    // 2. Replace non-alphanumeric with underscores
    sanitized = sanitized.replace(/[^a-z0-9]/g, '_');

    // 3. Remove leading numbers (SQL identifiers can't start with numbers)
    if (/^[0-9]/.test(sanitized)) {
      sanitized = `_${sanitized}`;
    }

    // 4. Check reserved keywords
    if (this.reservedKeywords.has(sanitized)) {
      sanitized = `extracted_${sanitized}`;
    }

    // 5. Dedupe underscores
    sanitized = sanitized.replace(/_+/g, '_');

    // 6. Trim underscores
    sanitized = sanitized.replace(/^_+|_+$/g, '');

    // 7. Ensure not empty after all cleaning
    if (!sanitized) return 'unnamed_field';

    return sanitized;
  }
}

module.exports = SchemaGenerator;
