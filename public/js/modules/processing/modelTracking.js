// Model information
const modelInfo = {
  "openai": {
    name: "OpenAI GPT-4o",
    processingTime: 15, // seconds per image
    messages: {
      processing: "Processing with OpenAI GPT-4o - optimized for speed",
      error: "Error processing with OpenAI GPT-4o - retrying",
      complete: "Processing complete with OpenAI GPT-4o"
    }
  },
  "anthropic": {
    name: "Anthropic Claude 3.7",
    processingTime: 25, // seconds per image
    messages: {
      processing: "Processing with Anthropic Claude - optimized for accuracy",
      error: "Error processing with Anthropic Claude - retrying",
      complete: "Processing complete with Anthropic Claude"
    }
  }
};

/**
 * Initialize model tracking on the processing page
 */
export function initModelTracking() {
  const selectedModel = getSelectedModel();
  updateModelDisplay(selectedModel);
  updateEstimatedTime(0);
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
 * Update progress bar and estimated time
 * @param {number} percentComplete - Progress percentage (0-100)
 */
export function updateProgress(percentComplete) {
  const progressBar = document.getElementById('progressBar');
  if (progressBar) {
    progressBar.style.width = `${percentComplete}%`;
  }
  
  updateEstimatedTime(percentComplete);
}

/**
 * Update the estimated time remaining based on progress
 * @param {number} percentComplete - Progress percentage (0-100)
 */
function updateEstimatedTime(percentComplete) {
  const selectedModel = getSelectedModel();
  const model = modelInfo[selectedModel];
  
  const estimatedTimeElement = document.getElementById('estimatedTime');
  if (estimatedTimeElement) {
    const remainingPercent = 100 - percentComplete;
    const secondsRemaining = Math.ceil((remainingPercent / 100) * model.processingTime);
    estimatedTimeElement.textContent = `${secondsRemaining} seconds remaining`;
  }
}

/**
 * Get status message for current processing state
 * @param {string} status - Current status (processing, error, complete)
 * @param {string} modelKey - Model identifier
 * @returns {string} Status message
 */
export function getStatusMessage(status, modelKey) {
  const model = modelInfo[modelKey];
  if (!model || !model.messages[status]) {
    console.warn(`Unknown status or model: ${status}, ${modelKey}`);
    return 'Unknown status';
  }
  return model.messages[status];
} 