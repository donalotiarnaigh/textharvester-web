require('openai/shims/node');
const OpenAI = require('openai');
const BaseVisionProvider = require('./baseProvider');
const { promptManager } = require('../prompts/templates/providerTemplates');
const PerformanceTracker = require('../performanceTracker');
const logger = require('../logger');

/**
 * OpenAI-specific implementation for vision models
 * Handles integration with the prompt modularization system
 */
class OpenAIProvider extends BaseVisionProvider {
  constructor(config) {
    super(config);
    this.client = new OpenAI({
      apiKey: this.config.OPENAI_API_KEY || process.env.OPENAI_API_KEY
    });
    this.model = this.config.OPENAI_MODEL || this.config.openAI?.model || 'gpt-4o';
    this.maxTokens = this.config.MAX_TOKENS || this.config.openAI?.maxTokens || 4000;
    this.temperature = this.config.TEMPERATURE || 0;
  }

  /**
   * Get the current model version
   * @returns {string} The model version
   */
  getModelVersion() {
    return this.model;
  }

  /**
   * Process an image using OpenAI's vision capabilities
   * @param {string} base64Image - Base64 encoded image
   * @param {string} prompt - The prompt to send to the model
   * @param {Object} options - Additional options for processing
   * @param {boolean} options.raw - Whether to return raw response without JSON parsing
   * @param {BasePrompt} options.promptTemplate - Optional prompt template to use
   * @returns {Promise<Object>} - Parsed JSON response
   */
  async processImage(base64Image, prompt, options = {}) {
    const maxRetries = 3;
    const baseTimeout = 30000; // 30 seconds base timeout
    
    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      try {
        // Format prompt if template is provided
        let systemPrompt = options.systemPrompt || 'Return a JSON object with the extracted text details.';
        let userPrompt = prompt;

        if (options.promptTemplate) {
          // Use the new prompt template system
          const formatted = options.promptTemplate.getProviderPrompt('openai');
          systemPrompt = formatted.systemPrompt || systemPrompt;
          userPrompt = formatted.userPrompt || formatted;
        }

      const requestPayload = {
        model: this.model,
        messages: [
          {
            role: 'system',
            content: systemPrompt,
          },
          {
            role: 'user',
            content: [
              { type: 'text', text: userPrompt },
              {
                type: 'image_url',
                image_url: {
                  url: `data:image/jpeg;base64,${base64Image}`,
                },
              },
            ],
          },
        ],
        response_format: { type: 'json_object' },
        max_completion_tokens: this.maxTokens
      };

      // Include temperature for models that support it
      requestPayload.temperature = this.temperature;

        // Calculate timeout with exponential backoff
        const timeout = baseTimeout * attempt;
        
        // Track API performance with timeout
        const result = await PerformanceTracker.trackAPICall(
          'openai',
          this.model,
          'processImage',
          async () => {
            // Create timeout promise
            const timeoutPromise = new Promise((_, reject) => {
              setTimeout(() => reject(new Error(`Request timeout after ${timeout}ms`)), timeout);
            });
            
            // Race between API call and timeout
            return Promise.race([
              this.client.chat.completions.create(requestPayload),
              timeoutPromise
            ]);
          },
          {
            imageSize: base64Image ? Math.round(base64Image.length * 0.75) : 0, // Approximate bytes
            promptLength: userPrompt ? userPrompt.length : 0,
            systemPromptLength: systemPrompt ? systemPrompt.length : 0,
            maxTokens: this.maxTokens,
            temperature: requestPayload.temperature || 1,
            attempt: attempt,
            timeout: timeout
          }
        );
      
        const content = result.choices[0].message.content;
        
        // Return raw content if requested
        if (options.raw) {
          return content;
        }

        try {
          return JSON.parse(content);
        } catch (parseError) {
          logger.error(`OpenAI JSON parsing failed for model ${this.model}`, parseError, {
            phase: 'response_parsing',
            operation: 'processImage',
            contentPreview: content.substring(0, 200),
            attempt: attempt
          });
          throw new Error(`OpenAI processing failed: ${parseError.message}`);
        }
        
      } catch (error) {
        logger.warn(`OpenAI API attempt ${attempt}/${maxRetries} failed for model ${this.model}`, {
          error: error.message,
          attempt: attempt,
          maxRetries: maxRetries
        });
        
        // If this is the last attempt, throw the error
        if (attempt === maxRetries) {
          logger.error(`OpenAI API error for model ${this.model} after ${maxRetries} attempts`, error, {
            phase: 'api_call',
            operation: 'processImage'
          });
          throw new Error(`OpenAI processing failed: ${error.message}`);
        }
        
        // Wait before retry (exponential backoff)
        const waitTime = Math.min(1000 * Math.pow(2, attempt - 1), 10000); // Max 10 seconds
        logger.info(`Retrying OpenAI API call in ${waitTime}ms (attempt ${attempt + 1}/${maxRetries})`);
        await new Promise(resolve => setTimeout(resolve, waitTime));
      }
    }
  }

  /**
   * Validate provider-specific configuration
   * @returns {boolean} True if configuration is valid
   * @throws {Error} If configuration is invalid
   */
  validateConfig() {
    if (!this.client) {
      throw new Error('OpenAI client not initialized. Check API key configuration.');
    }
    if (!this.model.includes('vision') && !this.model.includes('gpt-4o')) {
      throw new Error('Invalid model specified. Must be a vision-capable model.');
    }
    return true;
  }

  /**
   * Validate a prompt template for use with this provider
   * @param {BasePrompt} promptTemplate The prompt template to validate
   * @returns {Object} Validation result
   */
  validatePromptTemplate(promptTemplate) {
    return promptManager.validatePrompt(promptTemplate, 'openai');
  }
}

module.exports = OpenAIProvider; 