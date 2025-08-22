/* eslint-disable quotes */
// main.js

/**
 * Main module for the results page with expandable rows
 */

import { formatDateTime as formatDate } from './date.js';
import { tableEnhancements } from './tableEnhancements.js';

// Track expanded rows
const expandedRows = new Set();

// Expose globally for table enhancements
window.expandedRows = expandedRows;
window.toggleRow = toggleRow;

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

// Function to load results data
export async function loadResults() {
  try {
    const loadingState = document.getElementById('loadingState');
    
    // Show loading state
    if (loadingState) {
      loadingState.style.display = 'block';
    }
    
    // Fetch results from API
    const response = await fetch('/results-data');
    const data = await response.json();
    
    // Hide loading state
    if (loadingState) {
      loadingState.style.display = 'none';
    }
    
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
    console.error('Error loading results:', error);
    
    // Hide loading state
    const loadingState = document.getElementById('loadingState');
    if (loadingState) {
      loadingState.style.display = 'none';
    }
    
    // Show error message
    const tableBody = document.getElementById('resultsTableBody');
    if (tableBody) {
      tableBody.innerHTML = '<tr><td colspan="8" class="text-center text-danger">Error loading results. Please try again later.</td></tr>';
    }
    
    throw error;
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
