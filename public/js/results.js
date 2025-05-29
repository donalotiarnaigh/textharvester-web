// Function to format date
function formatDate(dateString) {
  if (!dateString) return 'N/A';
  
  const date = new Date(dateString);
  const now = new Date();
  
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
        <button class="btn btn-sm btn-info view-inscription" data-toggle="modal" data-target="#inscriptionModal" 
          data-memorial='${JSON.stringify(memorial)}'>
          <i class="fas fa-eye"></i> View
        </button>
      </td>
    `;
    
    tableBody.appendChild(row);
  });
  
  // Add event listeners for the view buttons
  document.querySelectorAll('.view-inscription').forEach(button => {
    button.addEventListener('click', function() {
      const memorial = JSON.parse(this.getAttribute('data-memorial'));
      displayModalDetails(memorial);
    });
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

// Function to download JSON results
async function downloadJsonResults(filenameInput, format = 'compact') {
  try {
    const filename = filenameInput.value || `memorials_${new Date().toISOString().slice(0,10)}`;
    const response = await fetch(`/download-json?filename=${encodeURIComponent(filename)}&format=${format}`);
    
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }
    
    // Get the blob from the response
    const blob = await response.blob();
    
    // Create a temporary URL for the blob
    const url = window.URL.createObjectURL(blob);
    
    // Create a temporary link element
    const a = document.createElement('a');
    a.href = url;
    a.download = `${filename}.json`;
    
    // Append to body, click, and remove
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    
    // Clean up the URL
    window.URL.revokeObjectURL(url);
  } catch (error) {
    console.error('Error downloading JSON:', error);
    alert('Failed to download JSON results. Please try again.');
  }
}

// Function to download CSV results
async function downloadCsvResults(filenameInput) {
  try {
    const filename = filenameInput.value || `memorials_${new Date().toISOString().slice(0,10)}`;
    const response = await fetch(`/download-csv?filename=${encodeURIComponent(filename)}`);
    
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }
    
    // Get the blob from the response
    const blob = await response.blob();
    
    // Create a temporary URL for the blob
    const url = window.URL.createObjectURL(blob);
    
    // Create a temporary link element
    const a = document.createElement('a');
    a.href = url;
    a.download = `${filename}.csv`;
    
    // Append to body, click, and remove
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    
    // Clean up the URL
    window.URL.revokeObjectURL(url);
  } catch (error) {
    console.error('Error downloading CSV:', error);
    alert('Failed to download CSV results. Please try again.');
  }
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
    const memorialsContainer = document.getElementById('memorials-container');
    if (memorialsContainer) {
      memorialsContainer.innerHTML = '<div class="alert alert-danger">Error loading results. Please try again later.</div>';
    }
    
    throw error;
  }
}

// Make download functions globally available
window.downloadJsonResults = downloadJsonResults;
window.downloadCsvResults = downloadCsvResults;

// Initialize on document load
document.addEventListener('DOMContentLoaded', () => {
  loadResults();
}); 