/* eslint-disable quotes */
// main.js

import { initializeClipboard } from "./clipboard.js";
import {
  validateFilenameInput,
  downloadJsonResults,
  downloadCsvResults,
} from "./download.js";
import { getQueryParam } from "./utils.js";
import { fetchResultsData } from "./api.js";

// Function to format date
function formatDate(dateString) {
  const date = new Date(dateString);
  return date.toLocaleDateString() + ' ' + date.toLocaleTimeString();
}

// Function to display model badge
function getModelBadge(provider) {
  if (!provider) return '<span class="badge badge-secondary">Unknown</span>';
  
  switch(provider.toLowerCase()) {
    case 'openai':
      return '<span class="badge badge-primary">OpenAI</span>';
    case 'anthropic':
      return '<span class="badge badge-info">Anthropic</span>';
    default:
      return `<span class="badge badge-secondary">${provider}</span>`;
  }
}

// Function to get tooltip text for metadata fields
function getTooltipText(field, value) {
  const tooltips = {
    template: {
      'memorial_ocr': 'Standard memorial OCR template for inscription extraction',
      'enhanced_ocr': 'Enhanced template with additional metadata extraction',
      default: 'Template used for text extraction'
    },
    version: {
      '1.0.0': 'Initial release version',
      '1.1.0': 'Improved accuracy and metadata handling',
      '2.0.0': 'Major update with enhanced field detection',
      default: 'Template version number'
    }
  };

  return tooltips[field]?.[value] || tooltips[field]?.default || value;
}

// Function to populate the results table
function populateResultsTable(data) {
  const tableBody = document.getElementById('resultsTableBody');
  const emptyState = document.getElementById('emptyState');
  const loadingState = document.getElementById('loadingState');
  
  // Hide loading state
  loadingState.classList.add('d-none');
  
  if (!data || data.length === 0) {
    emptyState.classList.remove('d-none');
    return;
  }
  
  // Clear existing table data
  tableBody.innerHTML = '';
  
  // Populate table with data
  data.forEach(record => {
    const row = document.createElement('tr');
    
    // Format name
    const fullName = [record.first_name, record.last_name]
      .filter(Boolean)
      .join(' ') || 'N/A';
      
    row.innerHTML = `
      <td>${record.memorial_number || 'N/A'}</td>
      <td>${fullName}</td>
      <td>${record.year_of_death || 'N/A'}</td>
      <td>${getModelBadge(record.ai_provider)}</td>
      <td data-toggle="tooltip" title="${getTooltipText('template', record.prompt_template)}">
        ${record.prompt_template || 'N/A'}
      </td>
      <td data-toggle="tooltip" title="${getTooltipText('version', record.prompt_version)}">
        ${record.prompt_version || 'N/A'}
      </td>
      <td>${formatDate(record.processed_date)}</td>
      <td>
        <button 
          class="btn btn-sm btn-info view-details" 
          data-id="${record.id}"
          data-toggle="modal" 
          data-target="#inscriptionModal"
        >
          <i class="fas fa-eye"></i> View
        </button>
      </td>
    `;
    
    tableBody.appendChild(row);
  });
  
  // Store data for modal use
  window.resultsData = data;
  
  // Initialize tooltips
  $('[data-toggle="tooltip"]').tooltip();
  
  // Initialize detail view buttons
  initializeDetailButtons();
}

// Initialize detail view buttons
function initializeDetailButtons() {
  document.querySelectorAll('.view-details').forEach(button => {
    button.addEventListener('click', function() {
      const id = this.getAttribute('data-id');
      const record = window.resultsData.find(r => r.id == id);
      
      if (record) {
        // Populate modal with record details
        document.getElementById('modalMemorialInfo').textContent = 
          `${record.memorial_number || 'Unknown'} - ${[record.first_name, record.last_name].filter(Boolean).join(' ') || 'Unknown'}`;
        
        document.getElementById('modalInscription').textContent = record.inscription || 'No inscription available';
        document.getElementById('modalModel').textContent = record.ai_provider 
          ? (record.ai_provider === 'openai' ? 'OpenAI GPT-4o' : 'Anthropic Claude 3.7')
          : 'Unknown';
        document.getElementById('modalTemplate').textContent = record.prompt_template || 'N/A';
        document.getElementById('modalVersion').textContent = record.prompt_version || 'N/A';
        document.getElementById('modalFileName').textContent = record.file_name || 'Unknown';
        document.getElementById('modalProcessDate').textContent = formatDate(record.processed_date);
      }
    });
  });
}

// Function to initialize the page
function initializePage() {
  const filenameInput = document.getElementById("filenameInput");

  // Check cancellation status and update message accordingly
  const status = new URLSearchParams(window.location.search).get("status");
  if (status === "cancelled") {
    const infoMessageElement = document.querySelector(".info-message");
    infoMessageElement.textContent =
      "Note: Processing was cancelled and the results may be incomplete.";
    infoMessageElement.style.backgroundColor = "#ffcccc";
  }

  // Initialize download buttons
  const downloadButton = document.getElementById('downloadButton');
  const downloadCsvButton = document.getElementById('downloadCsvButton');

  downloadButton.addEventListener('click', () => downloadJsonResults(filenameInput));
  downloadCsvButton.addEventListener('click', () => downloadCsvResults(filenameInput));

  // Validate filename input in real-time
  validateFilenameInput(filenameInput);

  // Initialize model info panel
  initializeModelInfoPanel();

  // Fetch results data from the server
  fetch('/results-data')
    .then(response => response.json())
    .then(data => {
      populateResultsTable(data);
      
      // Update model info panel with first record's data
      if (data && data.length > 0) {
        updateModelInfoPanel(data[0]);
      }
      
      // Enable download buttons
      downloadButton.disabled = false;
      downloadCsvButton.disabled = false;
    })
    .catch(error => {
      console.error('Error fetching results:', error);
      document.getElementById('loadingState').innerHTML = 
        '<div class="alert alert-danger">Error loading results</div>';
    });
}

// Make functions available globally for testing
window.populateResultsTable = populateResultsTable;
window.getModelBadge = getModelBadge;
window.formatDate = formatDate;
window.getTooltipText = getTooltipText;

// Event listener for page load
document.addEventListener("DOMContentLoaded", initializePage);
