const express = require('express');
const router = express.Router();
const SchemaManager = require('../services/SchemaManager');
const SchemaGenerator = require('../services/SchemaGenerator');
const { createProvider } = require('../utils/modelProviders');
const logger = require('../utils/logger');
const config = require('../../config.json');

// POST /propose - Analyze files and propose a schema
router.post('/propose', async (req, res) => {
  try {
    const { files } = req.body;

    if (!files || !Array.isArray(files) || files.length === 0) {
      return res.status(400).json({ error: 'No files provided for analysis' });
    }

    // Initialize Provider
    // We default to OpenAI or env setting, similar to other parts of the system
    const providerName = req.body.provider || process.env.AI_PROVIDER || 'openai';

    let provider;
    try {
      provider = createProvider({
        AI_PROVIDER: providerName,
        ...config
      });
    } catch (err) {
      logger.error('Failed to initialize AI provider for schema proposal', err);
      return res.status(500).json({ error: 'Failed to initialize AI provider' });
    }

    const generator = new SchemaGenerator(provider);
    const analysis = await generator.generateSchema(files);

    res.status(200).json(analysis);

  } catch (error) {
    logger.error('Error in schema proposal:', error);
    res.status(500).json({ error: error.message || 'Internal Server Error' });
  }
});

// GET / - List all schemas
router.get('/', async (req, res) => {
  try {
    const schemas = await SchemaManager.listSchemas();
    res.status(200).json(schemas);
  } catch (error) {
    logger.error('Error listing schemas:', error);
    res.status(500).json({ error: 'Failed to list schemas' });
  }
});

// GET /:id - Get a specific schema
router.get('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const schema = await SchemaManager.getSchema(id);

    if (!schema) {
      return res.status(404).json({ error: 'Schema not found' });
    }

    res.status(200).json(schema);
  } catch (error) {
    logger.error(`Error getting schema ${req.params.id}:`, error);
    res.status(500).json({ error: 'Failed to retrieve schema' });
  }
});

// POST / - Create a new schema
router.post('/', async (req, res) => {
  try {
    const schemaDefinition = req.body;

    // Basic validation
    if (!schemaDefinition.name || !schemaDefinition.jsonSchema) {
      return res.status(400).json({ error: 'Invalid schema definition. Name and jsonSchema are required.' });
    }

    // SchemaManager handles creation logic including table generation
    const createdSchema = await SchemaManager.createSchema(schemaDefinition);

    res.status(201).json(createdSchema);

  } catch (error) {
    logger.error('Error creating schema:', error);
    // Handle unique constraint violations if possible, but 500 is fine for now
    res.status(500).json({ error: error.message || 'Failed to create schema' });
  }
});

module.exports = router;
