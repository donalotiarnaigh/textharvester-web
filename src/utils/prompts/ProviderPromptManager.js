/**
 * Manages provider-specific prompt templates and formatting
 */
class ProviderPromptManager {
  constructor() {
    this.templates = new Map();
    this.templateVersions = new Map();
  }

  /**
   * Register a provider-specific template
   * @param {string} providerName Name of the AI provider
   * @param {Object} template Template configuration
   * @param {string} template.provider Provider identifier
   * @param {string} template.systemPrompt System-level prompt
   * @param {string} template.formatInstructions Format-specific instructions
   * @param {Object} template.typeFormatting Type conversion mapping
   * @param {string} [version='latest'] Template version
   */
  registerPromptTemplate(providerName, template, version = 'latest') {
    // Validate template structure
    if (!template.systemPrompt || !template.formatInstructions || !template.typeFormatting) {
      throw new Error('Invalid template structure');
    }

    // Ensure provider name matches
    if (template.provider !== providerName) {
      throw new Error('Provider name mismatch');
    }

    // Initialize version map for provider if it doesn't exist
    if (!this.templateVersions.has(providerName)) {
      this.templateVersions.set(providerName, new Map());
    }

    // Store template with version
    const providerVersions = this.templateVersions.get(providerName);
    providerVersions.set(version, template);

    // Update latest version
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
   * Get a specific template version for a provider
   * @param {string} providerName Name of the AI provider
   * @param {string} templateName Name of the template
   * @param {string} [version='latest'] Template version
   * @returns {Object} Template configuration for the specified version
   */
  getPromptTemplate(providerName, templateName, version = 'latest') {
    // For now, we only support one template type per provider
    // In the future, this could be expanded to support multiple template types
    if (!this.templateVersions.has(providerName)) {
      return null;
    }

    const providerVersions = this.templateVersions.get(providerName);
    
    // If version is 'latest' or not found, return the latest version
    if (version === 'latest' || !providerVersions.has(version)) {
      return this.templates.get(providerName);
    }

    return providerVersions.get(version);
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