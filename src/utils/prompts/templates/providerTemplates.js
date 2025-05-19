/**
 * Default provider-specific prompt templates
 */

const openaiTemplate = {
  provider: 'openai',
  systemPrompt: 'You are an expert OCR system specializing in extracting structured data from memorial inscriptions. Return all data in JSON format.',
  formatInstructions: 'Ensure the response is a valid JSON object with the specified fields. Use response_format: { type: "json_object" }.',
  typeFormatting: {
    integer: 'number',
    float: 'number',
    string: 'string',
    boolean: 'boolean',
    date: 'string',
    array: 'array'
  }
};

const anthropicTemplate = {
  provider: 'anthropic',
  systemPrompt: 'You are an expert OCR system specializing in extracting structured data from memorial inscriptions. Focus on accuracy and proper type conversion.',
  formatInstructions: 'Return data as a JSON object. Convert all numeric values to actual numbers, not text (e.g., "1923" not "nineteen twenty-three"). Handle missing values with null.',
  typeFormatting: {
    integer: 'numeric',
    float: 'decimal',
    string: 'text',
    boolean: 'true/false',
    date: 'YYYY-MM-DD',
    array: 'list'
  }
};

// Initialize the prompt manager with default templates
const ProviderPromptManager = require('../ProviderPromptManager');
const promptManager = new ProviderPromptManager();

promptManager.registerPromptTemplate('openai', openaiTemplate);
promptManager.registerPromptTemplate('anthropic', anthropicTemplate);

module.exports = {
  promptManager,
  openaiTemplate,
  anthropicTemplate
}; 