# Tabular Results Implementation Plan

## 1. Database Integration

### 1.1 Update Database Schema
Create a migration script to add model columns:

```sql
ALTER TABLE memorials ADD COLUMN ai_provider TEXT;
ALTER TABLE memorials ADD COLUMN model_version TEXT;
```

### 1.2 Create Migration Script
```javascript
// src/utils/migrations/addModelColumns.js
const db = require('../database').db;
const logger = require('../logger');

async function migrateAddModelColumns() {
  return new Promise((resolve, reject) => {
    db.run('BEGIN TRANSACTION', (err) => {
      if (err) {
        logger.error('Error beginning transaction:', err);
        reject(err);
        return;
      }
      
      // Add ai_provider column
      db.run('ALTER TABLE memorials ADD COLUMN ai_provider TEXT', (err) => {
        if (err && !err.message.includes('duplicate column')) {
          logger.error('Error adding ai_provider column:', err);
          db.run('ROLLBACK');
          reject(err);
          return;
        }
        
        // Add model_version column
        db.run('ALTER TABLE memorials ADD COLUMN model_version TEXT', (err) => {
          if (err && !err.message.includes('duplicate column')) {
            logger.error('Error adding model_version column:', err);
            db.run('ROLLBACK');
            reject(err);
            return;
          }
          
          // Commit transaction
          db.run('COMMIT', (err) => {
            if (err) {
              logger.error('Error committing transaction:', err);
              db.run('ROLLBACK');
              reject(err);
              return;
            }
            
            logger.info('Successfully added model columns to memorials table');
            resolve();
          });
        });
      });
    });
  });
}

module.exports = migrateAddModelColumns;
```

## 2. Update File Processing Logic

### 2.1 Update storeMemorial Function in database.js
```javascript
// Update in src/utils/database.js
function storeMemorial(data) {
  logger.info('Attempting to store memorial:', JSON.stringify(data));
  const sql = `
        INSERT INTO memorials (
            memorial_number,
            first_name,
            last_name,
            year_of_death,
            inscription,
            file_name,
            ai_provider,
            model_version
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `;

  return new Promise((resolve, reject) => {
    db.run(sql, [
      data.memorial_number || null,
      data.first_name || null,
      data.last_name || null,
      data.year_of_death || null,
      data.inscription || null,
      data.fileName || null,
      data.ai_provider || null,
      data.model_version || null
    ], function(err) {
      if (err) {
        logger.error('Error storing memorial:', err);
        reject(err);
        return;
      }
      logger.info(`Successfully stored memorial with ID: ${this.lastID}`);
      resolve(this.lastID);
    });
  });
}
```

## 3. UI Implementation

### 3.1 Results HTML Update
Replace the JSON display in results.html with a responsive table:

```html
<!-- Replace code-block div in public/results.html -->
<div class="table-responsive mt-4">
  <table class="table table-striped table-bordered" id="resultsTable">
    <thead class="thead-light">
      <tr>
        <th>Memorial #</th>
        <th>Name</th>
        <th>Year of Death</th>
        <th>AI Model</th>
        <th>Processed</th>
        <th>Actions</th>
      </tr>
    </thead>
    <tbody id="resultsTableBody">
      <!-- Data will be populated via JavaScript -->
    </tbody>
  </table>
  
  <!-- Empty state message -->
  <div id="emptyState" class="text-center p-4 d-none">
    <i class="fas fa-search fa-3x mb-3 text-muted"></i>
    <p class="lead">No results found</p>
  </div>
  
  <!-- Loading state -->
  <div id="loadingState" class="text-center p-4">
    <div class="spinner-border text-primary" role="status">
      <span class="sr-only">Loading...</span>
    </div>
    <p class="mt-2">Loading results...</p>
  </div>
</div>

<!-- Modal for viewing full inscription -->
<div class="modal fade" id="inscriptionModal" tabindex="-1" aria-labelledby="inscriptionModalLabel" aria-hidden="true">
  <div class="modal-dialog modal-lg">
    <div class="modal-content">
      <div class="modal-header">
        <h5 class="modal-title" id="inscriptionModalLabel">Inscription Details</h5>
        <button type="button" class="close" data-dismiss="modal" aria-label="Close">
          <span aria-hidden="true">&times;</span>
        </button>
      </div>
      <div class="modal-body">
        <h6 class="mb-3" id="modalMemorialInfo"></h6>
        <div class="card mb-3">
          <div class="card-header">
            <strong>Inscription</strong>
          </div>
          <div class="card-body">
            <p id="modalInscription"></p>
          </div>
        </div>
        <div class="row">
          <div class="col-md-6">
            <p><strong>Model:</strong> <span id="modalModel"></span></p>
            <p><strong>Source File:</strong> <span id="modalFileName"></span></p>
          </div>
          <div class="col-md-6">
            <p><strong>Processed:</strong> <span id="modalProcessDate"></span></p>
          </div>
        </div>
      </div>
      <div class="modal-footer">
        <button type="button" class="btn btn-secondary" data-dismiss="modal">Close</button>
      </div>
    </div>
  </div>
</div>
```

### 3.2 Update main.js to Render the Table
```javascript
// Update public/js/modules/results/main.js

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
  const status = getQueryParam("status");
  if (status === "cancelled") {
    const infoMessageElement = document.querySelector(".info-message");
    infoMessageElement.textContent =
      "Note: Processing was cancelled and the results may be incomplete.";
    infoMessageElement.style.backgroundColor = "#ffcccc";
  }

  // Fetch results data from the server
  fetch('/results-data')
    .then(response => response.json())
    .then(data => {
      populateResultsTable(data);
      
      // Enable download buttons
      document.getElementById('downloadButton').disabled = false;
      document.getElementById('downloadCsvButton').disabled = false;
    })
    .catch(error => {
      console.error('Error fetching results:', error);
      document.getElementById('loadingState').innerHTML = 
        '<div class="alert alert-danger">Error loading results</div>';
    });

  // Validate filename input in real-time
  validateFilenameInput(filenameInput);

  // Modify download functions to include the dynamic filename
  window.downloadJsonResults = () => downloadJsonResults(filenameInput);
  window.downloadCsvResults = () => downloadCsvResults(filenameInput);
}

// Event listener for page load
document.addEventListener("DOMContentLoaded", initializePage);
```

## 4. Update Export Functionality

### 4.1 Update dataConversion.js for CSV exports
```javascript
// Update src/utils/dataConversion.js
function jsonToCsv(jsonData) {
  if (!jsonData || !jsonData.length) {
    return '';
  }

  // Define headers based on our database structure
  const headers = [
    'memorial_number',
    'first_name',
    'last_name',
    'year_of_death',
    'inscription',
    'file_name',
    'ai_provider',
    'processed_date'
  ];

  // Create CSV header row
  let csv = headers.join(',') + '\n';

  // Add data rows
  jsonData.forEach(record => {
    const row = headers.map(header => {
      const value = record[header] || '';
      // Escape quotes and wrap in quotes if contains comma or newline
      return value.toString().includes(',') || value.toString().includes('\n') || value.toString().includes('"')
        ? `"${value.toString().replace(/"/g, '""')}"` 
        : value;
    });
    csv += row.join(',') + '\n';
  });

  return csv;
}
```

## 5. Add CSS Styles

### 5.1 Update styles.css
```css
/* Add to public/css/styles.css */

/* Results Table Styles */
#resultsTable {
  font-size: 0.95rem;
}

#resultsTable th {
  background-color: #f8f9fa;
  position: sticky;
  top: 0;
  z-index: 10;
}

/* Model Badge Styles */
.badge-primary {
  background-color: #007bff;
}

.badge-info {
  background-color: #17a2b8;
}

.badge-secondary {
  background-color: #6c757d;
}

/* Modal Styles */
.modal-body p {
  margin-bottom: 0.5rem;
}

#modalInscription {
  white-space: pre-line;
  font-family: inherit;
  max-height: 200px;
  overflow-y: auto;
}

/* Responsive Table Container */
.table-responsive {
  margin-bottom: 1rem;
  box-shadow: 0 1px 3px rgba(0,0,0,0.1);
  border-radius: 4px;
  overflow: hidden;
}

/* Empty and Loading States */
#emptyState, #loadingState {
  padding: 3rem;
  color: #6c757d;
}

/* View Details Button */
.view-details {
  padding: 0.25rem 0.5rem;
  font-size: 0.75rem;
}
```

## 6. Implementation Steps:

### Step 1: Database Migration
1. Create and run the migration script to add model columns
2. Verify columns were added successfully

### Step 2: Update storeMemorial Function
1. Update the function to include ai_provider and model_version
2. Ensure proper updating of existing code

### Step 3: HTML and CSS Updates
1. Replace the JSON display with the table HTML structure in results.html
2. Add the modal HTML for viewing details
3. Add the CSS styles to styles.css

### Step 4: JavaScript Updates
1. Update main.js to populate and interact with the table
2. Implement the detail view functionality
3. Update the CSV export to include model information

### Step 5: Testing
1. Test with memorials processed by both OpenAI and Anthropic models
2. Verify the table displays correctly with proper model badges
3. Test the detail view modal functionality
4. Verify CSV and JSON exports include model information
5. Test responsive behavior on mobile devices

### Step 6: Final Checks
1. Ensure backward compatibility for any existing integrations
2. Verify error handling for cases where model information is missing
3. Check accessibility of the table (aria attributes, keyboard navigation)
4. Optimize performance for large datasets 