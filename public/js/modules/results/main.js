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

/**
 * Main module for the results page
 */

// Function to format date
function formatDate(dateString) {
  if (!dateString) return 'N/A';
  
  const date = new Date(dateString);
  
  // Check if date is invalid
  if (isNaN(date.getTime())) return 'N/A';
  
  // Format the date string
  return date.toLocaleString();
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

// Function to display memorial data
function displayMemorials(memorials) {
  const tableBody = document.getElementById('resultsTableBody');
  const emptyState = document.getElementById('emptyState');
  
  // Clear existing content
  tableBody.innerHTML = '';
  
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
  
  // Create a row for each memorial
  memorials.forEach(memorial => {
    const row = document.createElement('tr');
    
    // Populate row with memorial data
    row.innerHTML = `
      <td>${memorial.memorial_number || 'N/A'}</td>
      <td>${memorial.first_name || ''} ${memorial.last_name || ''}</td>
      <td>${memorial.year_of_death || 'N/A'}</td>
      <td>${memorial.ai_provider || 'N/A'}</td>
      <td>${memorial.prompt_template || 'N/A'}</td>
      <td>${memorial.prompt_version || 'N/A'}</td>
      <td>${formatDate(memorial.processed_date)}</td>
      <td>
        <button class="btn btn-sm btn-info view-inscription" 
          data-memorial='${JSON.stringify(memorial)}'>
          <i class="fas fa-eye"></i> View
        </button>
      </td>
    `;
    
    tableBody.appendChild(row);
  });
}

// Function to display modal details
function displayModalDetails(memorial) {
  document.getElementById('modalMemorialInfo').textContent = `${memorial.memorial_number} - ${memorial.first_name || ''} ${memorial.last_name || ''}`;
  document.getElementById('modalInscription').textContent = memorial.inscription || 'No inscription available';
  document.getElementById('modalModel').textContent = memorial.ai_provider || 'N/A';
  document.getElementById('modalTemplate').textContent = memorial.prompt_template || 'N/A';
  document.getElementById('modalVersion').textContent = memorial.prompt_version || 'N/A';
  document.getElementById('modalFileName').textContent = memorial.fileName || 'N/A';
  document.getElementById('modalProcessDate').textContent = formatDate(memorial.processed_date);
}

// Function to enable download buttons
function enableDownloadButtons() {
  document.getElementById('downloadButton').disabled = false;
  document.getElementById('downloadPrettyButton').disabled = false;
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
    
    // Enable download buttons if there are results
    if (data.memorials && data.memorials.length > 0) {
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
  
  // Add event delegation for modal view buttons to handle timing issues
  document.addEventListener('click', function(event) {
    if (event.target.closest('.view-inscription')) {
      event.preventDefault();
      const button = event.target.closest('.view-inscription');
      const memorial = JSON.parse(button.getAttribute('data-memorial'));
      
      // Populate modal content first
      displayModalDetails(memorial);
      
      // Then show the modal
      $('#inscriptionModal').modal('show');
    }
  });
});
