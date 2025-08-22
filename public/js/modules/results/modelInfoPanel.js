 
// modelInfoPanel.js

let clipboard;

/**
 * Format provider name for display
 * @param {string} provider Raw provider name
 * @returns {string} Formatted provider name
 */
function formatProviderName(provider) {
  if (!provider) return 'Unknown';
  
  switch(provider.toLowerCase()) {
  case 'openai':
    return 'OpenAI';
  case 'anthropic':
    return 'Anthropic';
  default:
    return provider;
  }
}

/**
 * Format date for display
 * @param {string} dateString ISO date string
 * @returns {string} Formatted date string
 */
import { formatDate } from './date.js';

/**
 * Update the model info panel with new data
 * @param {Object} data Record data containing model and prompt information
 */
function updateModelInfoPanel(data) {
  if (!data) return;
  
  // Update model information
  document.getElementById('infoProvider').textContent = formatProviderName(data.ai_provider);
  document.getElementById('infoModelVersion').textContent = data.model_version || 'N/A';
  
  // Update prompt information
  document.getElementById('infoTemplate').textContent = data.prompt_template || 'N/A';
  document.getElementById('infoPromptVersion').textContent = data.prompt_version || 'N/A';
  document.getElementById('infoProcessedDate').textContent = data.processed_date ? formatDate(data.processed_date) : 'N/A';
}

/**
 * Handle successful copy action
 * @param {Object} e Clipboard.js event object
 */
function handleCopySuccess(e) {
  const button = e.trigger;
  const originalContent = button.innerHTML;
  
  // Update button to show success
  button.innerHTML = '<i class="fas fa-check"></i> Copied!';
  
  // Reset button after 2 seconds
  setTimeout(() => {
    button.innerHTML = originalContent;
  }, 2000);
}

/**
 * Handle collapse toggle
 * @param {Event} e Click event object
 */
function handleCollapseToggle(e) {
  e.preventDefault();
  const target = e.currentTarget.getAttribute('data-target');
  $(target).collapse('toggle');
}

/**
 * Initialize the model info panel
 */
function initializeModelInfoPanel() {
  // Initialize clipboard functionality
  if (clipboard) {
    clipboard.destroy();
  }
  
  clipboard = new ClipboardJS('.copy-info');
  clipboard.on('success', handleCopySuccess);
  
  // Initialize collapse functionality
  const collapseButtons = document.querySelectorAll('[data-toggle="collapse"]');
  collapseButtons.forEach(button => {
    button.addEventListener('click', handleCollapseToggle);
  });
}

// Make functions available globally for testing
window.updateModelInfoPanel = updateModelInfoPanel;
window.initializeModelInfoPanel = initializeModelInfoPanel;
window.formatProviderName = formatProviderName;
window.formatDate = formatDate;
window.handleCopySuccess = handleCopySuccess;
window.handleCollapseToggle = handleCollapseToggle; 