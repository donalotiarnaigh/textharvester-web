// Model information
const modelInfo = {
  'openai': {
    name: 'OpenAI GPT-4o',
    messages: {
      processing: 'Processing with OpenAI GPT-4o',
      error: 'Error processing with OpenAI GPT-4o - retrying',
      complete: 'Processing complete with OpenAI GPT-4o'
    }
  },
  'anthropic': {
    name: 'Anthropic Claude 4 Sonnet',
    messages: {
      processing: 'Processing with Anthropic Claude 4 Sonnet',
      error: 'Error processing with Anthropic Claude 4 Sonnet - retrying',
      complete: 'Processing complete with Anthropic Claude 4 Sonnet'
    }
  }
};

/**
 * Initialize model tracking on the processing page
 */
export function initModelTracking() {
  const selectedModel = getSelectedModel();
  updateModelDisplay(selectedModel);
  
  // Initialize progress bar ARIA attributes
  const progressBar = document.getElementById('progressBar');
  if (progressBar) {
    progressBar.setAttribute('role', 'progressbar');
    progressBar.setAttribute('aria-valuemin', '0');
    progressBar.setAttribute('aria-valuemax', '100');
    progressBar.setAttribute('aria-valuenow', '0');
  }
}

/**
 * Get the selected model from localStorage or default to OpenAI
 */
export function getSelectedModel() {
  return localStorage.getItem('selectedModel') || 'openai';
}

/**
 * Update the model display text
 * @param {string} modelKey - The model identifier
 */
export function updateModelDisplay(modelKey) {
  const model = modelInfo[modelKey];
  if (!model) return;
  
  const modelDisplay = document.getElementById('modelDisplay');
  if (modelDisplay) {
    modelDisplay.textContent = `Processing with ${model.name}`;
  }
}

/**
 * Get the appropriate status message based on state and model
 * @param {string} state - Current processing state
 * @param {string} modelKey - The model identifier
 * @returns {string} The status message
 */
export function getStatusMessage(state, modelKey = getSelectedModel()) {
  const model = modelInfo[modelKey];
  if (!model) return '';
  
  switch (state) {
  case 'processing':
    return model.messages.processing;
  case 'error':
    return model.messages.error;
  case 'complete':
    return model.messages.complete;
  default:
    return '';
  }
} 