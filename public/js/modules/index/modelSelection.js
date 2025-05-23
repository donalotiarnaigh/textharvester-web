/* eslint-disable quotes */
// modelSelection.js

// Model information for tooltips
const modelInfo = {
  "openai": {
    name: "OpenAI GPT-4o",
    description: "GPT-4o Vision Model"
  },
  "anthropic": {
    name: "Anthropic Claude 3.7 Sonnet",
    description: "Claude 3.7 Sonnet Vision Model"
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
            <option value="openai">OpenAI GPT-4o</option>
            <option value="anthropic">Anthropic Claude 3.7</option>
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
    
    // Initialize model selection
    const initialModel = 'openai';
    localStorage.setItem('selectedModel', initialModel);
    updateModelInfo(initialModel);
    
    // Add event listener to update info when model changes
    const modelSelect = document.getElementById('modelSelect');
    if (modelSelect) {
      modelSelect.addEventListener('change', (e) => {
        const selectedValue = e.target.value;
        // Save selection to localStorage immediately
        localStorage.setItem('selectedModel', selectedValue);
        // Update the info text
        updateModelInfo(selectedValue);
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
    infoElement.textContent = info.description;
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