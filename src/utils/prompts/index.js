const BasePrompt = require('./BasePrompt');

// Registry to store prompt classes by name and version
let promptRegistry = new Map();

/**
 * Clear the prompt registry (for testing purposes)
 */
function clearRegistry() {
  promptRegistry = new Map();
}

/**
 * Validate that a class is a valid prompt implementation
 * @param {Function} PromptClass The class to validate
 * @returns {boolean} True if valid, throws error if invalid
 */
function validatePromptClass(PromptClass) {
  const testInstance = new PromptClass();
  
  if (!(testInstance instanceof BasePrompt)) {
    throw new Error('Invalid prompt class: Must extend BasePrompt');
  }
  
  // Verify required methods are implemented
  ['getPromptText', 'getProviderPrompt', 'validateAndConvert'].forEach(method => {
    if (typeof testInstance[method] !== 'function') {
      throw new Error(`Invalid prompt class: Missing required method ${method}`);
    }
  });
  
  return true;
}

/**
 * Register a new prompt type with its versions
 * @param {string} name The name of the prompt
 * @param {Object.<string, Function>} versions Map of version strings to prompt classes
 * @returns {boolean} True if registration successful
 * @throws {Error} If prompt name already exists or class is invalid
 */
function registerPrompt(name, versions) {
  if (promptRegistry.has(name)) {
    throw new Error('Prompt name already registered');
  }
  
  // Validate all versions before registering
  Object.values(versions).forEach(validatePromptClass);
  
  promptRegistry.set(name, versions);
  return true;
}

/**
 * Get a prompt instance by name and version
 * @param {string} name The name of the prompt
 * @param {string} [version='latest'] The version to retrieve
 * @param {Object} [config={}] Configuration options for the prompt
 * @returns {BasePrompt} An instance of the requested prompt
 * @throws {Error} If prompt or version not found
 */
function getPrompt(name, version = 'latest', config = {}) {
  const versions = promptRegistry.get(name);
  if (!versions) {
    throw new Error(`Unknown prompt: ${name}`);
  }
  
  let PromptClass;
  if (version === 'latest') {
    // Get the highest version number
    const latest = Object.keys(versions)
      .sort((a, b) => {
        const [aMajor, aMinor, aPatch] = a.split('.').map(Number);
        const [bMajor, bMinor, bPatch] = b.split('.').map(Number);
        
        if (aMajor !== bMajor) return bMajor - aMajor;
        if (aMinor !== bMinor) return bMinor - aMinor;
        return bPatch - aPatch;
      })[0];
    
    PromptClass = versions[latest];
    // Override the version in config to match what we're actually using
    config = { ...config, version: latest };
  } else {
    PromptClass = versions[version];
    if (!PromptClass) {
      throw new Error(`Version ${version} not found for prompt: ${name}`);
    }
  }
  
  return new PromptClass(config);
}

/**
 * List all registered prompts and their versions
 * @returns {Array<{name: string, versions: string[]}>} Array of prompt information
 */
function listPrompts() {
  return Array.from(promptRegistry.entries()).map(([name, versions]) => ({
    name,
    versions: Object.keys(versions).sort()
  }));
}

module.exports = {
  registerPrompt,
  getPrompt,
  listPrompts,
  clearRegistry // Export for testing
}; 