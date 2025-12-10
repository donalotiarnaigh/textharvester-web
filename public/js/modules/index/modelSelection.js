/* eslint-disable quotes */
// modelSelection.js

// Model information for tooltips
const modelInfo = {
  "openai": {
    name: "OpenAI GPT-5.1",
    description: "Excellent for weathered monuments and challenging images"
  },
  "anthropic": {
    name: "Anthropic Claude Sonnet 4.5",
    description: "Good for clear images, more conservative with weathered text"
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
            <option value="openai">OpenAI GPT-5.1 (recommended)</option>
            <option value="anthropic">Anthropic Claude Sonnet 4.5</option>
          </select>
          <small class="model-info"></small>
          <div id="anthropic-warning" class="alert alert-info mt-2" style="display: none;">
            <strong>Note:</strong> Anthropic Claude has a 5MB file size limit and may be more conservative with weathered monuments. For best results with challenging images, we recommend GPT-5.1.
          </div>
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
    
    // Listen for upload mode changes to update model availability
    setupModeChangeListener();
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
 * Set up listener for upload mode changes to update model availability
 */
function setupModeChangeListener() {
  // Listen for changes to upload mode radio buttons
  const uploadModeRadios = document.querySelectorAll('input[name="uploadMode"]');
  uploadModeRadios.forEach(radio => {
    radio.addEventListener('change', (e) => {
      updateModelAvailability(e.target.value);
    });
  });
  
  // Check initial state
  const checkedMode = document.querySelector('input[name="uploadMode"]:checked');
  if (checkedMode) {
    updateModelAvailability(checkedMode.value);
  }
}

/**
 * Update model availability based on upload mode
 * @param {string} uploadMode - The selected upload mode ('record_sheet' or 'monument_photo')
 */
function updateModelAvailability(uploadMode) {
  const modelSelect = document.getElementById('modelSelect');
  const anthropicOption = modelSelect?.querySelector('option[value="anthropic"]');
  const anthropicWarning = document.getElementById('anthropic-warning');
  
  if (!modelSelect || !anthropicOption) return;
  
  if (uploadMode === 'monument_photo') {
    // Enable Anthropic for monument photos with info warning
    anthropicOption.disabled = false;
    anthropicOption.textContent = 'Anthropic Claude Sonnet 4.5';
    
    // Show info warning about file size limit and model characteristics
    if (anthropicWarning) {
      anthropicWarning.style.display = 'block';
    }
  } else {
    // Enable Anthropic for record sheets
    anthropicOption.disabled = false;
    anthropicOption.textContent = 'Anthropic Claude Sonnet 4.5';
    
    // Hide warning
    if (anthropicWarning) {
      anthropicWarning.style.display = 'none';
    }
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