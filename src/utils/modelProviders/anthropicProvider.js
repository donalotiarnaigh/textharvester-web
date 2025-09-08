require('@anthropic-ai/sdk/shims/node');
const Anthropic = require('@anthropic-ai/sdk');
const BaseVisionProvider = require('./baseProvider');
const { promptManager } = require('../prompts/templates/providerTemplates');
const PerformanceTracker = require('../performanceTracker');
const logger = require('../logger');

/**
 * Anthropic-specific implementation for vision models
 * Handles integration with the prompt modularization system
 */
class AnthropicProvider extends BaseVisionProvider {
  constructor(config) {
    super(config);
    this.client = new Anthropic({
      apiKey: this.config.ANTHROPIC_API_KEY || process.env.ANTHROPIC_API_KEY
    });
    this.model = this.config.ANTHROPIC_MODEL || this.config.anthropic?.model || 'claude-4-sonnet-20250514';
    this.maxTokens = this.config.MAX_TOKENS || this.config.anthropic?.maxTokens || 8000;  // Increased for monument photos
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
   * Process an image using Anthropic Claude's vision capabilities
   * @param {string} base64Image - Base64 encoded image
   * @param {string|Object} prompt - The prompt to send to the model
   * @param {Object} options - Additional options for processing
   * @param {boolean} options.raw - Whether to return raw response without JSON parsing
   * @param {BasePrompt} options.promptTemplate - Optional prompt template to use
   * @returns {Promise<Object>} - Parsed JSON response
   */
  async processImage(base64Image, prompt, options = {}) {
    try {
      // Format prompt if template is provided
      let systemPrompt = options.systemPrompt || 'Return a JSON object with the extracted text details.';
      let userPrompt = '';

      // Handle different prompt formats
      if (typeof prompt === 'string') {
        userPrompt = prompt;
      } else if (prompt && typeof prompt === 'object') {
        systemPrompt = prompt.systemPrompt || systemPrompt;
        userPrompt = prompt.userPrompt || '';
      }

      if (options.promptTemplate) {
        // Use the new prompt template system
        const formatted = options.promptTemplate.getProviderPrompt('anthropic');
        systemPrompt = formatted.systemPrompt || systemPrompt;
        userPrompt = formatted.userPrompt || formatted;
      }

      // Ensure userPrompt is a valid string
      if (typeof userPrompt !== 'string') {
        userPrompt = JSON.stringify(userPrompt);
      }

      // Log the prompt being sent to Claude for debugging
      logger.info(`[AnthropicProvider] Sending prompt to Claude: ${userPrompt.substring(0, 200)}...`);
      logger.info(`[AnthropicProvider] System prompt: ${systemPrompt}`);

      // Track API performance
      const result = await PerformanceTracker.trackAPICall(
        'anthropic',
        this.model,
        'processImage',
        async () => {
          return await this.client.messages.create({
            model: this.model,
            max_tokens: this.maxTokens,
            temperature: this.temperature,
            system: systemPrompt,
            messages: [
              {
                role: 'user',
                content: [
                  { type: 'text', text: userPrompt },
                  { 
                    type: 'image', 
                    source: { 
                      type: 'base64', 
                      media_type: 'image/jpeg', 
                      data: base64Image 
                    } 
                  }
                ]
              }
            ]
          });
        },
        {
          imageSize: base64Image ? Math.round(base64Image.length * 0.75) : 0, // Approximate bytes
          promptLength: userPrompt ? userPrompt.length : 0,
          systemPromptLength: systemPrompt ? systemPrompt.length : 0,
          maxTokens: this.maxTokens,
          temperature: this.temperature
        }
      );

      // Extract the text content from the response
      const content = result.content.find(item => item.type === 'text')?.text;
      
      if (!content) {
        throw new Error('No text content in response');
      }

      // Return raw content if requested
      if (options.raw) {
        return content;
      }

      // Parse the JSON response, handling the case where it's wrapped in a code block
      let jsonContent = content;
      
      // Check if the content is wrapped in a code block (```json ... ```)
      const codeBlockMatch = content.match(/```(?:json)?\s*([\s\S]*?)```/);
      if (codeBlockMatch) {
        jsonContent = codeBlockMatch[1].trim();
      }
      
      // Try to extract JSON from the response if it contains extra text
      const jsonMatch = jsonContent.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        jsonContent = jsonMatch[0];
      }
      
      // Log response length for debugging
      logger.info(`[AnthropicProvider] Response length: ${content.length} characters`);
      logger.info(`[AnthropicProvider] JSON content length: ${jsonContent.length} characters`);
      logger.info(`[AnthropicProvider] Response ends with: "${content.slice(-50)}"`);
      logger.info(`[AnthropicProvider] JSON content ends with: "${jsonContent.slice(-50)}"`);
      
      try {
        const parsedResponse = JSON.parse(jsonContent);
        
        // Validate that the response contains actual text, not just dashes
        if (this.isInvalidResponse(parsedResponse)) {
          logger.warn(`[AnthropicProvider] Response appears to contain invalid data (likely dashes instead of actual text)`);
          throw new Error('Invalid response: Claude returned dashes instead of actual text. This may indicate image quality issues or prompt confusion.');
        }
        
        return parsedResponse;
      } catch (jsonError) {
        logger.error(`Anthropic JSON parsing failed for model ${this.model}`, jsonError, {
          phase: 'response_parsing',
          operation: 'processImage',
          contentLength: content.length,
          jsonContentLength: jsonContent.length,
          contentPreview: jsonContent.substring(0, 500)
        });
        
        // Try to fix common JSON issues
        let fixedJson = jsonContent;
        
        // Fix unterminated strings by adding closing quotes
        if (jsonError.message.includes('Unterminated string')) {
          // Check if the string is at the very end (truncated response)
          if (jsonContent.length === 21863) {
            logger.warn(`[AnthropicProvider] Response appears to be truncated at exactly 21863 characters`);
            // Try to close the JSON properly
            if (jsonContent.endsWith('"')) {
              // Already ends with quote, just close the JSON
              fixedJson = jsonContent + '}';
            } else {
              // Add closing quote and brace
              fixedJson = jsonContent + '"}';
            }
          } else {
            fixedJson = fixedJson.replace(/"([^"]*)$/, '"$1"');
          }
        }
        
        // Try parsing the fixed JSON
        try {
          logger.info(`[AnthropicProvider] Attempting to fix JSON and retry parsing`);
          const parsedResponse = JSON.parse(fixedJson);
          
          // Validate the fixed response too
          if (this.isInvalidResponse(parsedResponse)) {
            logger.warn(`[AnthropicProvider] Fixed response still contains invalid data`);
            throw new Error('Invalid response: Claude returned dashes instead of actual text. This may indicate image quality issues or prompt confusion.');
          }
          
          return parsedResponse;
        } catch (retryError) {
          logger.debugPayload('Anthropic JSON parsing error details:', {
            model: this.model,
            originalError: jsonError.message,
            retryError: retryError.message,
            jsonContent: jsonContent.substring(0, 1000)
          });
          throw new Error(`Failed to parse JSON response: ${jsonError.message}`);
        }
      }
    } catch (error) {
      logger.error(`Anthropic API error for model ${this.model}`, error, {
        phase: 'api_call',
        operation: 'processImage'
      });
      logger.debugPayload('Anthropic API error details:', {
        model: this.model,
        error: error.message,
        stack: error.stack
      });
      throw new Error(`Anthropic processing failed: ${error.message}`);
    }
  }

  /**
   * Check if the response contains invalid data (like dashes instead of actual text)
   * @param {Object} response The parsed JSON response
   * @returns {boolean} True if the response appears invalid
   */
  isInvalidResponse(response) {
    if (!response || typeof response !== 'object') {
      return true;
    }
    
    // Check if inscription field contains mostly dashes
    if (response.inscription && typeof response.inscription === 'string') {
      const inscription = response.inscription.trim();
      
      // If inscription is very long and contains mostly dashes, it's likely invalid
      if (inscription.length > 1000) {
        const dashCount = (inscription.match(/-/g) || []).length;
        const dashRatio = dashCount / inscription.length;
        
        // If more than 80% of the text is dashes, it's likely invalid
        if (dashRatio > 0.8) {
          logger.warn(`[AnthropicProvider] Inscription field contains ${dashRatio.toFixed(2)} dashes (${dashCount}/${inscription.length} characters)`);
          return true;
        }
      }
      
      // Check for patterns that indicate invalid responses
      if (inscription.includes('----------|----------|----------')) {
        logger.warn(`[AnthropicProvider] Inscription contains repeated dash patterns`);
        return true;
      }
    }
    
    // Check if name fields contain only dashes
    if (response.first_name && typeof response.first_name === 'string') {
      const firstName = response.first_name.trim();
      if (firstName.length > 10 && /^-+$/.test(firstName)) {
        logger.warn(`[AnthropicProvider] First name contains only dashes: "${firstName}"`);
        return true;
      }
    }
    
    if (response.last_name && typeof response.last_name === 'string') {
      const lastName = response.last_name.trim();
      if (lastName.length > 10 && /^-+$/.test(lastName)) {
        logger.warn(`[AnthropicProvider] Last name contains only dashes: "${lastName}"`);
        return true;
      }
    }
    
    return false;
  }

  /**
   * Validate provider-specific configuration
   * @returns {boolean} True if configuration is valid
   * @throws {Error} If configuration is invalid
   */
  validateConfig() {
    if (!this.client) {
      throw new Error('Anthropic client not initialized. Check API key configuration.');
    }
    if (!this.model.includes('sonnet') && !this.model.includes('haiku') && !this.model.includes('claude-4')) {
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
    return promptManager.validatePrompt(promptTemplate, 'anthropic');
  }
}

module.exports = AnthropicProvider; 