/**
 * Manages provider-specific prompt templates and formatting
 */
class ProviderPromptManager {
  constructor() {
    this.templates = new Map();
  }

  /**
   * Register a provider-specific template
   * @param {string} providerName Name of the AI provider
   * @param {Object} template Template configuration
   * @param {string} template.provider Provider identifier
   * @param {string} template.systemPrompt System-level prompt
   * @param {string} template.formatInstructions Format-specific instructions
   * @param {Object} template.typeFormatting Type conversion mapping
   */
  registerPromptTemplate(providerName, template) {
    // Validate template structure
    if (!template.systemPrompt || !template.formatInstructions || !template.typeFormatting) {
      throw new Error('Invalid template structure');
    }

    // Ensure provider name matches
    if (template.provider !== providerName) {
      throw new Error('Provider name mismatch');
    }

    this.templates.set(providerName, template);
  }

  /**
   * Get a registered template
   * @param {string} providerName Name of the AI provider
   * @returns {Object} Template configuration
   */
  getTemplate(providerName) {
    return this.templates.get(providerName);
  }

  /**
   * Format a prompt for a specific provider
   * @param {BasePrompt} prompt The prompt instance to format
   * @param {string} providerName Name of the AI provider
   * @returns {Object} Formatted prompt with system prompt and user prompt
   */
  formatPrompt(prompt, providerName) {
    const template = this.templates.get(providerName);
    if (!template) {
      throw new Error(`No template registered for provider: ${providerName}`);
    }

    // Format type definitions according to provider's preferences
    const typeDefinitions = Object.entries(prompt.typeDefinitions)
      .map(([field, type]) => {
        const formattedType = template.typeFormatting[type] || type;
        return `${field}: ${formattedType}`;
      })
      .join('\n');

    // Combine base prompt with provider-specific formatting
    const formattedPrompt = `${prompt.getPromptText()}

Type Definitions:
${typeDefinitions}

${template.formatInstructions}`;

    return {
      systemPrompt: template.systemPrompt,
      prompt: formattedPrompt
    };
  }

  /**
   * Validate a prompt against a provider's template
   * @param {BasePrompt} prompt The prompt to validate
   * @param {string} providerName Name of the AI provider
   * @returns {Object} Validation result with isValid flag and any errors
   */
  validatePrompt(prompt, providerName) {
    const template = this.templates.get(providerName);
    if (!template) {
      return {
        isValid: false,
        errors: [`No template registered for provider: ${providerName}`]
      };
    }

    const errors = [];

    // Check if all types in the prompt are supported by the provider
    Object.entries(prompt.typeDefinitions).forEach(([field, type]) => {
      if (!template.typeFormatting[type]) {
        errors.push(`Type "${type}" not supported by provider ${providerName}`);
      }
    });

    return {
      isValid: errors.length === 0,
      errors
    };
  }
}

module.exports = ProviderPromptManager; 