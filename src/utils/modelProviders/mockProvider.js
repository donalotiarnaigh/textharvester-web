const BaseVisionProvider = require('./baseProvider');
const logger = require('../logger');

/**
 * Mock provider for testing and development.
 * Returns predefined responses based on the prompt template.
 */
class MockProvider extends BaseVisionProvider {
  constructor(config = {}) {
    super(config);
    this.model = 'mock-v1';
  }

  /**
     * Get the current model version
     * @returns {string} The model version
     */
  getModelVersion() {
    return this.model;
  }

  /**
     * Process an image (mock implementation)
     * @param {string} base64Image - Base64 encoded image (ignored)
     * @param {string} prompt - The prompt (ignored)
     * @param {Object} options - Additional options
     * @returns {Promise<Object>} - Parsed JSON response
     */
  async processImage(base64Image, prompt, options = {}) {
    logger.info('MockProvider: Processing image request');

    // Simulate API latency
    await new Promise(resolve => setTimeout(resolve, 50));

    const templateName = options.promptTemplate?.templateName || 'memorialOCR';

    if (templateName === 'burialRegister') {
      return this.getMockBurialRegisterResponse();
    } else if (templateName === 'graveCard') {
      return this.getMockGraveCardResponse();
    } else {
      return this.getMockMemorialResponse();
    }
  }

  getMockMemorialResponse() {
    return {
      memorial_number: 123,
      first_name: 'John',
      last_name: 'Doe',
      year_of_death: 1900,
      description: 'In loving memory of John Doe',
      inscription: 'Rest in Peace'
    };
  }

  getMockBurialRegisterResponse() {
    return {
      volume_id: 'vol1',
      page_number: 1,
      entries: [
        {
          entry_no: '123',
          name: 'Jane Doe',
          burial_date: '1900-01-01',
          age: '50',
          abode: 'Local Area',
          parish: 'St. Marys'
        }
      ]
    };
  }

  getMockGraveCardResponse() {
    return {
      grave_number: 'A123',
      section: 'North',
      deceased_name: 'John Smith',
      interment_date: '1920-05-15'
    };
  }

  /**
     * Validate provider-specific configuration
     * @returns {boolean} True
     */
  validateConfig() {
    return true;
  }

  /**
     * Validate a prompt template
     * @returns {Object} Validation result
     */
  validatePromptTemplate(/* eslint-disable-line no-unused-vars */ promptTemplate) {
    return { isValid: true };
  }
}

module.exports = MockProvider;
