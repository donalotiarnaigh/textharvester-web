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

export const initModelSelection = () => {
  console.log("Initializing model selection");
  
  // Create and insert the model selection HTML
  const modelSelectionHtml = `
    <div class="form-group mb-3">
      <label for="modelSelect">Select AI Model</label>
      <select class="form-control" id="modelSelect">
        <option value="openai">OpenAI GPT-4o (Faster)</option>
        <option value="anthropic">Anthropic Claude 3.7 (More Accurate)</option>
      </select>
      <small class="form-text text-muted model-info"></small>
    </div>
  `;
  
  // Insert before the replace existing checkbox
  const replaceExistingDiv = document.querySelector('.form-check').parentElement;
  replaceExistingDiv.insertAdjacentHTML('beforebegin', modelSelectionHtml);
  
  // Initialize tooltip text
  updateModelInfo('openai');
  
  // Add event listener to update info when model changes
  document.getElementById('modelSelect').addEventListener('change', (e) => {
    const selectedModel = e.target.value;
    updateModelInfo(selectedModel);
  });
};

// Function to update the model info text
function updateModelInfo(modelKey) {
  const info = modelInfo[modelKey];
  const infoElement = document.querySelector('.model-info');
  if (info && infoElement) {
    infoElement.textContent = `${info.description}. Average processing time: ${info.processingTime}`;
  }
}

// Function to get the selected model (to be used by other modules)
export const getSelectedModel = () => {
  const selectElement = document.getElementById('modelSelect');
  return selectElement ? selectElement.value : 'openai';
}; 