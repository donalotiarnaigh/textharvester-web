/**
 * Base class for all vision model providers
 * All specific provider implementations should extend this class
 */
class BaseVisionProvider {
  constructor(config) {
    this.config = config;
  }

  /**
   * Process an image with OCR capabilities
   * @param {string} base64Image - Base64 encoded image
   * @param {string} prompt - The prompt to send to the model
   * @returns {Promise<Object>} - Parsed JSON response
   * @abstract This method should be implemented by subclasses
   */
  async processImage(base64Image, prompt) {
    throw new Error('Method not implemented');
  }

  /**
   * Get the current model version
   * @returns {string} The model version
   * @abstract This method should be implemented by subclasses
   */
  getModelVersion() {
    throw new Error('Method not implemented');
  }
}

module.exports = BaseVisionProvider; 