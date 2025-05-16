/* eslint-disable quotes */
// modelSelection.js

// Model information for tooltips
const modelInfo = {
  "openai": {
    name: "OpenAI GPT-4o",
    description: "Fast and accurate for most memorial inscriptions",
    processingTime: "~15-20 seconds per image"
  },
  "anthropic": {
    name: "Anthropic Claude 3.7 Sonnet",
    description: "Excellent at handling complex or degraded inscriptions",
    processingTime: "~20-25 seconds per image"
  }
};

/**
 * Initialize the model selection UI
 */
export const initModelSelection = () => {
  console.log("Initializing model selection");
  
  // Create and insert the model selection HTML
  const modelSelectionHtml = `
    <div class="card model-selection-card">
      <div class="card-body">
        <div class="form-group mb-0">
          <label for="modelSelect" class="card-title d-block mb-2">AI Model</label>
          <select class="form-control" id="modelSelect">
            <option value="openai">OpenAI GPT-4o (Faster)</option>
            <option value="anthropic">Anthropic Claude 3.7 (More Accurate)</option>
          </select>
          <small class="model-info"></small>
        </div>
      </div>
    </div>
  `;
  
  // Insert before the replace existing checkbox card
  const replaceExistingCard = document.querySelector('.custom-control-input').closest('.card');
  if (replaceExistingCard) {
    replaceExistingCard.insertAdjacentHTML('beforebegin', modelSelectionHtml);
    
    // Initialize tooltip text
    updateModelInfo('openai');
    
    // Add event listener to update info when model changes
    const modelSelect = document.getElementById('modelSelect');
    if (modelSelect) {
      modelSelect.addEventListener('change', (e) => {
        updateModelInfo(e.target.value);
      });
    }
  }
};

/**
 * Update the model info text
 * @param {string} modelKey - The key of the model to show info for
 */
function updateModelInfo(modelKey) {
  const info = modelInfo[modelKey];
  const infoElement = document.querySelector('.model-info');
  if (info && infoElement) {
    infoElement.textContent = `${info.description}. Average processing time: ${info.processingTime}`;
  }
}

/**
 * Get the currently selected model
 * @returns {string} The selected model key or 'openai' as default
 */
export const getSelectedModel = () => {
  const selectElement = document.getElementById('modelSelect');
  return selectElement ? selectElement.value : 'openai';
}; 