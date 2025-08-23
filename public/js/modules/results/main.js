/* eslint-disable quotes */
// main.js

/**
 * Main module for the results page with expandable rows
 */

import { formatDateTime as formatDate } from './date.js';
import { tableEnhancements } from './tableEnhancements.js';

// Error handling utilities
const ErrorTypes = {
  NETWORK: 'network',
  SERVER: 'server',
  TIMEOUT: 'timeout',
  PARSE: 'parse',
  VALIDATION: 'validation',
  UNKNOWN: 'unknown'
};

const ErrorMessages = {
  [ErrorTypes.NETWORK]: {
    title: 'Connection Error',
    message: 'Unable to connect to the server. Please check your internet connection and try again.',
    userAction: 'Check your internet connection and click "Retry" to try again.',
    canRetry: true
  },
  [ErrorTypes.SERVER]: {
    title: 'Server Error',
    message: 'The server encountered an error while processing your request.',
    userAction: 'This might be a temporary issue. Click "Retry" to try again, or contact support if the problem persists.',
    canRetry: true
  },
  [ErrorTypes.TIMEOUT]: {
    title: 'Request Timeout',
    message: 'The request took too long to complete.',
    userAction: 'This might be due to slow internet or server load. Click "Retry" to try again.',
    canRetry: true
  },
  [ErrorTypes.PARSE]: {
    title: 'Data Error',
    message: 'Unable to process the received data.',
    userAction: 'This might be a temporary issue with the data. Click "Retry" to try again.',
    canRetry: true
  },
  [ErrorTypes.VALIDATION]: {
    title: 'Data Validation Error',
    message: 'The received data contains validation errors.',
    userAction: 'Please contact support if this problem persists.',
    canRetry: false
  },
  [ErrorTypes.UNKNOWN]: {
    title: 'Unexpected Error',
    message: 'An unexpected error occurred.',
    userAction: 'Please try refreshing the page. If the problem persists, contact support.',
    canRetry: true
  }
};

// Error state management
let currentError = null;
let retryCount = 0;
const MAX_RETRY_ATTEMPTS = 3;

// Track expanded rows
const expandedRows = new Set();

// Error handling functions
function classifyError(error) {
  if (error.name === 'TypeError' && error.message.includes('fetch')) {
    return ErrorTypes.NETWORK;
  }

  if (error.name === 'SyntaxError' && error.message.includes('JSON')) {
    return ErrorTypes.PARSE;
  }

  if (error.message && error.message.includes('timeout')) {
    return ErrorTypes.TIMEOUT;
  }

  if (error.status >= 500) {
    return ErrorTypes.SERVER;
  }

  if (error.status >= 400 && error.status < 500) {
    return ErrorTypes.VALIDATION;
  }

  return ErrorTypes.UNKNOWN;
}

function showErrorState(error, canRetry = true) {
  const tableBody = document.getElementById('resultsTableBody');
  const loadingState = document.getElementById('loadingState');
  const emptyState = document.getElementById('emptyState');

  // Hide loading and empty states
  if (loadingState) loadingState.style.display = 'none';
  if (emptyState) emptyState.classList.add('d-none');

  if (!tableBody) return;

  const errorType = classifyError(error);
  const errorInfo = ErrorMessages[errorType];

  const retryButton = canRetry && retryCount < MAX_RETRY_ATTEMPTS ?
    `<button class="btn btn-primary btn-sm" onclick="retryLoadResults()">Retry (${MAX_RETRY_ATTEMPTS - retryCount} attempts left)</button>` : '';

  tableBody.innerHTML = `
    <tr>
      <td colspan="8" class="text-center py-5">
        <div class="alert alert-danger" role="alert">
          <h5 class="alert-heading">
            <i class="fas fa-exclamation-triangle"></i> ${errorInfo.title}
          </h5>
          <p class="mb-3">${errorInfo.message}</p>
          <p class="mb-3 text-muted">${errorInfo.userAction}</p>
          <div class="d-flex gap-2 justify-content-center">
            ${retryButton}
            <button class="btn btn-secondary btn-sm" onclick="window.location.reload()">Refresh Page</button>
          </div>
          ${retryCount > 0 ? `<small class="text-muted d-block mt-2">Retry attempts: ${retryCount}/${MAX_RETRY_ATTEMPTS}</small>` : ''}
        </div>
      </td>
    </tr>
  `;

  currentError = { error, errorType, canRetry };
}

function retryLoadResults() {
  if (currentError && retryCount < MAX_RETRY_ATTEMPTS) {
    retryCount++;
    loadResults();
  }
}

// Function to display error summary
function displayErrorSummary(errors) {
  const errorSummary = document.getElementById('errorSummary');
  const errorList = document.getElementById('errorList');
  
  // Clear previous content
  errorList.innerHTML = '';
  
  // Hide if no errors
  if (!errors || errors.length === 0) {
    errorSummary.style.display = 'none';
    return;
  }
  
  // Show error summary
  errorSummary.style.display = 'block';
  
  // Add each error to the list
  errors.forEach(error => {
    const listItem = document.createElement('li');
    listItem.className = 'list-group-item list-group-item-warning';
    
    let message = `<strong>${error.fileName}</strong>: `;
    
    // Format message based on error type
    switch(error.errorType) {
    case 'empty_sheet':
      message += 'Empty or unreadable sheet detected.';
      break;
    case 'processing_failed':
      message += 'Processing failed after multiple attempts.';
      break;
    default:
      message += error.errorMessage || 'An unknown error occurred';
    }
    
    // Add model info if available
    if (error.ai_provider) {
      message += ` <span class="text-muted">(${error.ai_provider} model)</span>`;
    }
    
    listItem.innerHTML = message;
    errorList.appendChild(listItem);
  });
}

// Function to create expandable detail row
function createDetailRow(memorial, colSpan) {
  const detailRow = document.createElement('tr');
  detailRow.className = 'detail-row';
  detailRow.style.display = 'none';
  detailRow.id = `detail-${memorial.memorial_number}`;
  
  detailRow.innerHTML = `
    <td colspan="${colSpan}">
      <div class="detail-content p-3">
        <div class="row">
          <div class="col-12">
            <h5 class="mb-3">
              ${memorial.memorial_number} - ${memorial.first_name || ''} ${memorial.last_name || ''}
            </h5>
          </div>
        </div>
        
        <div class="card mb-3">
          <div class="card-header bg-light">
            <strong>Inscription</strong>
          </div>
          <div class="card-body">
            <p class="inscription-text">${memorial.inscription || 'No inscription available'}</p>
          </div>
        </div>
        
        <div class="row">
          <div class="col-md-6">
            <div class="detail-info">
              <h6>Processing Information</h6>
              <dl class="row">
                <dt class="col-sm-4">Model:</dt>
                <dd class="col-sm-8">${memorial.ai_provider || 'N/A'}</dd>
                
                <dt class="col-sm-4">Template:</dt>
                <dd class="col-sm-8">${memorial.prompt_template || 'N/A'}</dd>
                
                <dt class="col-sm-4">Version:</dt>
                <dd class="col-sm-8">${memorial.prompt_version || 'N/A'}</dd>
                
                <dt class="col-sm-4">Source File:</dt>
                <dd class="col-sm-8">${memorial.fileName || 'N/A'}</dd>
              </dl>
            </div>
          </div>
          
          <div class="col-md-6">
            <div class="detail-info">
              <h6>Additional Details</h6>
              <dl class="row">
                <dt class="col-sm-4">Processed:</dt>
                <dd class="col-sm-8">${formatDate(memorial.processed_date)}</dd>
                
                <dt class="col-sm-4">Year of Death:</dt>
                <dd class="col-sm-8">${memorial.year_of_death || 'N/A'}</dd>
              </dl>
            </div>
          </div>
        </div>
        
        <div class="mt-3">
          <button class="btn btn-sm btn-secondary close-detail" data-memorial="${memorial.memorial_number}">
            <i class="fas fa-chevron-up"></i> Close Details
          </button>
          <button class="btn btn-sm btn-info copy-inscription ml-2" data-inscription="${(memorial.inscription || '').replace(/"/g, '&quot;')}">
            <i class="fas fa-copy"></i> Copy Inscription
          </button>
        </div>
      </div>
    </td>
  `;
  
  return detailRow;
}

// Function to toggle row expansion
function toggleRow(memorialNumber) {
  const detailRow = document.getElementById(`detail-${memorialNumber}`);
  const toggleBtn = document.querySelector(`[data-toggle-memorial="${memorialNumber}"]`);
  
  if (!detailRow) return;
  
  if (expandedRows.has(memorialNumber)) {
    // Collapse the row
    detailRow.style.display = 'none';
    expandedRows.delete(memorialNumber);
    
    // Update toggle button
    if (toggleBtn) {
      toggleBtn.innerHTML = '<i class="fas fa-chevron-down"></i>';
      toggleBtn.classList.remove('btn-secondary');
      toggleBtn.classList.add('btn-outline-secondary');
    }
    
    // Remove highlight from parent row
    const parentRow = detailRow.previousElementSibling;
    if (parentRow) {
      parentRow.classList.remove('table-active');
    }
  } else {
    // Expand the row
    detailRow.style.display = 'table-row';
    expandedRows.add(memorialNumber);
    
    // Update toggle button
    if (toggleBtn) {
      toggleBtn.innerHTML = '<i class="fas fa-chevron-up"></i>';
      toggleBtn.classList.remove('btn-outline-secondary');
      toggleBtn.classList.add('btn-secondary');
    }
    
    // Add highlight to parent row
    const parentRow = detailRow.previousElementSibling;
    if (parentRow) {
      parentRow.classList.add('table-active');
    }
    
    // Smooth scroll to ensure detail is visible
    setTimeout(() => {
      detailRow.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
    }, 100);
  }
}

// Function to display memorial data with expandable rows
function displayMemorials(memorials) {
  const tableBody = document.getElementById('resultsTableBody');
  const emptyState = document.getElementById('emptyState');
  
  // Clear existing content and reset expanded rows
  tableBody.innerHTML = '';
  expandedRows.clear();
  
  // Check if there are any memorials
  if (!memorials || memorials.length === 0) {
    if (emptyState) {
      emptyState.classList.remove('d-none');
    }
    return;
  }
  
  // Hide empty state
  if (emptyState) {
    emptyState.classList.add('d-none');
  }
  
  // Create rows for each memorial
  memorials.forEach(memorial => {
    // Create main row
    const row = document.createElement('tr');
    row.className = 'memorial-row';
    row.style.cursor = 'pointer';
    
    row.innerHTML = `
      <td class="text-center">
        <button class="btn btn-sm btn-outline-secondary expand-toggle" 
          data-toggle-memorial="${memorial.memorial_number}"
          title="Click to expand/collapse details">
          <i class="fas fa-chevron-down"></i>
        </button>
      </td>
      <td>${memorial.memorial_number || 'N/A'}</td>
      <td>${memorial.first_name || ''} ${memorial.last_name || ''}</td>
      <td>${memorial.year_of_death || 'N/A'}</td>
      <td>${memorial.ai_provider || 'N/A'}</td>
      <td>${memorial.prompt_template || 'N/A'}</td>
      <td>${memorial.prompt_version || 'N/A'}</td>
      <td>${formatDate(memorial.processed_date)}</td>
    `;
    
    tableBody.appendChild(row);
    
    // Create detail row (initially hidden)
    const detailRow = createDetailRow(memorial, 8); // 8 columns total
    tableBody.appendChild(detailRow);
    
    // Add click handler to the row (excluding the toggle button)
    row.addEventListener('click', (e) => {
      if (!e.target.closest('.expand-toggle')) {
        toggleRow(memorial.memorial_number);
      }
    });
  });
}

// Function to enable download buttons
function enableDownloadButtons() {
  document.getElementById('downloadButton').disabled = false;
  document.getElementById('downloadCsvButton').disabled = false;
}

// Function to load results data with comprehensive error handling
export async function loadResults() {
  const loadingState = document.getElementById('loadingState');

  try {
    // Show loading state
    if (loadingState) {
      loadingState.style.display = 'block';
    }

    // Reset error state for new attempts
    if (retryCount === 0) {
      currentError = null;
    }

    // Fetch results from API with timeout
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 30000); // 30 second timeout

    const response = await fetch('/results-data', {
      signal: controller.signal,
      headers: {
        'Accept': 'application/json',
        'Content-Type': 'application/json'
      }
    });

    clearTimeout(timeoutId);

    // Check if response is ok
    if (!response.ok) {
      const error = new Error(`HTTP ${response.status}: ${response.statusText}`);
      error.status = response.status;
      throw error;
    }

    // Parse JSON response
    const data = await response.json();

    // Hide loading state
    if (loadingState) {
      loadingState.style.display = 'none';
    }

    // Reset retry count on success
    retryCount = 0;

    // Display memorials and error summary
    displayMemorials(data.memorials);
    displayErrorSummary(data.errors);

    // Initialize table enhancements
    if (data.memorials && data.memorials.length > 0) {
      tableEnhancements.init(data.memorials);
      enableDownloadButtons();
    }

    return data;

  } catch (error) {
    // Log the error for debugging
    console.error('Error loading results:', error);

    // Determine if this is a retryable error
    const errorType = classifyError(error);
    const canRetry = ErrorMessages[errorType].canRetry && retryCount < MAX_RETRY_ATTEMPTS;

    // Show appropriate error state
    showErrorState(error, canRetry);

    // Don't throw the error - we've handled it with the UI
    return null;
  }
}

// Download functions
window.downloadJsonResults = function(filenameInput, format) {
  const filename = filenameInput.value || 'results';
  window.location.href = `/download-json?filename=${encodeURIComponent(filename)}&format=${format}`;
};

window.downloadCsvResults = function(filenameInput) {
  const filename = filenameInput.value || 'results';
  window.location.href = `/download-csv?filename=${encodeURIComponent(filename)}`;
};

// Initialize on document load
document.addEventListener('DOMContentLoaded', () => {
  loadResults();
  
  // Initialize clipboard functionality
  new ClipboardJS('.copy-info');
  
  // Listen for filtered memorials event
  document.addEventListener('memorials-filtered', (event) => {
    displayMemorials(event.detail.memorials);
  });
});

// Event delegation for dynamic elements
document.addEventListener('click', function(event) {
  // Handle expand toggle button clicks
  if (event.target.closest('.expand-toggle')) {
    event.preventDefault();
    event.stopPropagation();
    const button = event.target.closest('.expand-toggle');
    const memorialNumber = button.getAttribute('data-toggle-memorial');
    toggleRow(memorialNumber);
  }
  
  // Handle close detail button clicks
  if (event.target.closest('.close-detail')) {
    event.preventDefault();
    const button = event.target.closest('.close-detail');
    const memorialNumber = button.getAttribute('data-memorial');
    toggleRow(memorialNumber);
  }
  
  // Handle copy inscription button clicks
  if (event.target.closest('.copy-inscription')) {
    event.preventDefault();
    const button = event.target.closest('.copy-inscription');
    const inscription = button.getAttribute('data-inscription');
    
    // Create temporary textarea for copying
    const textarea = document.createElement('textarea');
    textarea.value = inscription.replace(/&quot;/g, '"');
    textarea.style.position = 'absolute';
    textarea.style.left = '-9999px';
    document.body.appendChild(textarea);
    textarea.select();
    document.execCommand('copy');
    document.body.removeChild(textarea);
    
    // Show feedback
    const originalText = button.innerHTML;
    button.innerHTML = '<i class="fas fa-check"></i> Copied!';
    button.classList.add('btn-success');
    button.classList.remove('btn-info');
    
    setTimeout(() => {
      button.innerHTML = originalText;
      button.classList.remove('btn-success');
      button.classList.add('btn-info');
    }, 2000);
  }
});

// Export functions and state for use by other modules
export { expandedRows, toggleRow };

// Expose retry function globally for HTML button onclick handlers
window.retryLoadResults = retryLoadResults;
