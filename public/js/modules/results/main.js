
// main.js

/**
 * Main module for the results page with expandable rows
 */

import { formatDateTime as formatDate } from './date.js';
import { tableEnhancements } from './tableEnhancements.js';
import { updateModelInfoPanel } from './modelInfoPanel.js';

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

// Source Type utility functions
function formatSourceType(sourceType) {
  if (!sourceType) return 'Unknown';

  const typeMap = {
    'record_sheet': 'Record Sheet',
    'monument_photo': 'Monument Photo',
    'grave_record_card': 'Grave Record Card'
  };

  return typeMap[sourceType] || sourceType.charAt(0).toUpperCase() + sourceType.slice(1);
}

function getSourceTypeBadgeClass(sourceType) {
  const classMap = {
    'record_sheet': 'badge-primary',
    'monument_photo': 'badge-success',
    'grave_record_card': 'badge-warning'
  };

  return classMap[sourceType] || 'badge-secondary';
}

// HTML Sanitization utilities
const SanitizeUtils = {
  /**
   * Sanitize text content for safe HTML insertion
   * @param {string} text - Text to sanitize
   * @returns {string} Sanitized text safe for HTML content
   */
  sanitizeText(text) {
    if (text == null) return '';
    const stringText = String(text);

    // Escape HTML special characters
    return stringText
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#x27;')
      .replace(/\//g, '&#x2F;');
  },

  /**
   * Sanitize text for use in HTML attributes
   * @param {string} text - Text to sanitize
   * @returns {string} Sanitized text safe for HTML attributes
   */
  sanitizeAttribute(text) {
    if (text == null) return '';
    const stringText = String(text);

    // For attributes, we need to escape quotes and other special characters
    return stringText
      .replace(/&/g, '&amp;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#x27;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;');
  },

  /**
   * Sanitize numeric values
   * @param {number|string} value - Value to sanitize
   * @returns {string} Sanitized numeric string
   */
  sanitizeNumber(value) {
    if (value == null || value === '') return 'N/A';
    const num = parseFloat(value);
    return isNaN(num) ? 'N/A' : String(num);
  },

  /**
   * Sanitize memorial number (can be alphanumeric)
   * @param {string|number} value - Memorial number to sanitize
   * @returns {string} Sanitized memorial number
   */
  sanitizeMemorialNumber(value) {
    if (value == null || value === '') return 'N/A';
    // Memorial numbers can be alphanumeric, so treat as text but sanitize
    return this.sanitizeText(String(value));
  },

  /**
   * Sanitize memorial data object for safe HTML insertion
   * @param {Object} memorial - Memorial data object
   * @returns {Object} Sanitized memorial data
   */
  sanitizeMemorial(memorial) {
    if (!memorial || typeof memorial !== 'object') return {};

    return {
      memorial_number: this.sanitizeMemorialNumber(memorial.memorial_number),
      first_name: this.sanitizeText(memorial.first_name),
      last_name: this.sanitizeText(memorial.last_name),
      year_of_death: this.sanitizeNumber(memorial.year_of_death),
      inscription: this.sanitizeText(memorial.inscription),
      ai_provider: this.sanitizeText(memorial.ai_provider),
      prompt_template: this.sanitizeText(memorial.prompt_template),
      prompt_version: this.sanitizeText(memorial.prompt_version),
      fileName: this.sanitizeAttribute(memorial.fileName),
      processed_date: memorial.processed_date, // Date objects are safe as they're processed by formatDate
      source_type: memorial.source_type // Keep original value for logic, will be sanitized in display functions
    };
  },

  /**
   * Sanitize grave card data object for safe HTML insertion
   * @param {Object} card - Grave card data object
   * @returns {Object} Sanitized grave card data
   */
  sanitizeGraveCard(card) {
    if (!card || typeof card !== 'object') return {};

    // Helper to safely parse JSON field if needed
    let data = {};
    try {
      if (typeof card.data_json === 'string') {
        data = JSON.parse(card.data_json);
      } else if (typeof card.data_json === 'object') {
        data = card.data_json;
      }
    } catch (e) {
      console.warn('Failed to parse grave card JSON', e);
    }

    // Merge top-level fields with parsed JSON data, prioritizing top-level
    // The specific fields we need for display
    return {
      id: card.id,
      fileName: this.sanitizeAttribute(card.file_name),
      section: this.sanitizeText(card.section),
      grave_number: this.sanitizeText(card.grave_number),
      processed_date: card.processed_date,
      ai_provider: this.sanitizeText(card.ai_provider),
      source_type: 'grave_record_card', // Explicitly set for this type

      // Fields from the JSON blob
      grave_location: this.sanitizeText(data.grave_location),
      grave_dimensions: this.sanitizeText(data.grave_dimensions),
      grave_status: this.sanitizeText(data.grave_status),
      inscription: this.sanitizeText(data.inscription),
      // Interments list (will need specific handling in detail view)
      interments: Array.isArray(data.interments) ? data.interments : [],
      burial_count: Array.isArray(data.interments) ? data.interments.length : 0
    };
  },

  /**
   * Create safe HTML content from memorial data
   * @param {Object} memorial - Memorial data object
   * @param {number} colSpan - Column span for the table cell
   * @param {string} uniqueId - Unique identifier for this memorial
   * @returns {string} Safe HTML string
   */
  createSafeDetailHTML(memorial, colSpan, uniqueId) {
    const safe = this.sanitizeMemorial(memorial);

    return `
    <td colspan="${colSpan}">
      <div class="detail-content p-3">
        <div class="row">
          <div class="col-12">
            <h5 class="mb-3">
              ${safe.memorial_number} - ${safe.first_name} ${safe.last_name}
            </h5>
          </div>
        </div>

        <div class="card mb-3">
          <div class="card-header bg-light">
            <strong>Inscription</strong>
          </div>
          <div class="card-body">
            <p class="inscription-text">${safe.inscription || 'No inscription available'}</p>
          </div>
        </div>

        <div class="row">
          <div class="col-md-6">
            <div class="detail-info">
              <h6>Processing Information</h6>
              <dl class="row">
                <dt class="col-sm-4">Source Type:</dt>
                <dd class="col-sm-8">
                  <span class="badge ${getSourceTypeBadgeClass(safe.source_type)}">
                    ${formatSourceType(safe.source_type)}
                  </span>
                </dd>

                <dt class="col-sm-4">Model:</dt>
                <dd class="col-sm-8">${safe.ai_provider || 'N/A'}</dd>

                <dt class="col-sm-4">Template:</dt>
                <dd class="col-sm-8">${safe.prompt_template || 'N/A'}</dd>

                <dt class="col-sm-4">Version:</dt>
                <dd class="col-sm-8">${safe.prompt_version || 'N/A'}</dd>

                <dt class="col-sm-4">Source File:</dt>
                <dd class="col-sm-8">${safe.fileName || 'N/A'}</dd>
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
                <dd class="col-sm-8">${safe.year_of_death}</dd>
              </dl>
            </div>
          </div>
        </div>

        <div class="mt-3">
          <button class="btn btn-sm btn-secondary close-detail" data-memorial="${uniqueId}">
            <i class="fas fa-chevron-up"></i> Close Details
          </button>
          <button class="btn btn-sm btn-info copy-inscription ml-2" data-inscription="${safe.inscription.replace(/"/g, '&quot;')}">
            <i class="fas fa-copy"></i> Copy Inscription
          </button>
        </div>
      </div>
    </td>
    `;
  },

  /**
   * Create safe HTML for main table row
   * @param {Object} memorial - Memorial data object
   * @param {string} uniqueId - Unique identifier for this memorial
   * @returns {string} Safe HTML string for main table row
   */
  createSafeMainRowHTML(memorial, uniqueId) {
    const safe = this.sanitizeMemorial(memorial);

    return `
      <td class="text-center">
        <button class="btn btn-sm btn-outline-secondary expand-toggle"
          data-toggle-memorial="${uniqueId}"
          title="Click to expand/collapse details">
          <i class="fas fa-chevron-down"></i>
        </button>
      </td>
      <td>${safe.memorial_number}</td>
      <td>${safe.first_name} ${safe.last_name}</td>
      <td>${safe.year_of_death}</td>
      <td class="source-type-cell" data-source-type="${safe.source_type || 'unknown'}">
        <span class="badge ${getSourceTypeBadgeClass(safe.source_type)}">
          ${formatSourceType(safe.source_type)}
        </span>
      </td>
      <td>${safe.ai_provider || 'N/A'}</td>
      <td>${safe.prompt_template || 'N/A'}</td>
      <td>${safe.prompt_version || 'N/A'}</td>
      <td>${formatDate(memorial.processed_date)}</td>
    `;
  },

  /**
   * Create safe HTML for grave card main table row
   * @param {Object} card - Grave card data object
   * @param {string} uniqueId - Unique identifier for this card
   * @returns {string} Safe HTML string for main table row
   */
  createGraveCardMainRowHTML(card, uniqueId) {
    const safe = this.sanitizeGraveCard(card);

    return `
      <td class="text-center">
        <button class="btn btn-sm btn-outline-secondary expand-toggle"
          data-toggle-memorial="${uniqueId}"
          title="Click to expand/collapse details">
          <i class="fas fa-chevron-down"></i>
        </button>
      </td>
      <td>${safe.fileName}</td>
      <td>${safe.section || 'N/A'}</td>
      <td>${safe.grave_number || 'N/A'}</td>
      <td>${safe.burial_count}</td>
      <td class="source-type-cell" data-source-type="grave_record_card">
        <span class="badge ${getSourceTypeBadgeClass('grave_record_card')}">
          ${formatSourceType('grave_record_card')}
        </span>
      </td>
      <td>${safe.ai_provider || 'N/A'}</td>
      <td>${formatDate(card.processed_date)}</td>
    `;
  },

  /**
   * Create safe HTML content for grave card detail row
   * @param {Object} card - Grave card data object
   * @param {number} colSpan - Column span
   * @param {string} uniqueId - Unique identifier
   * @returns {string} Safe HTML string
   */
  createGraveCardDetailHTML(card, colSpan, uniqueId) {
    const safe = this.sanitizeGraveCard(card);

    // Build Interments Table
    let intermentsHtml = '<p class="text-muted">No interments recorded.</p>';
    if (safe.interments.length > 0) {
      const rows = safe.interments.map((burial, idx) => `
        <tr>
          <td>${idx + 1}</td>
          <td>${this.sanitizeText(burial.name)}</td>
          <td>${this.sanitizeText(burial.date)}</td>
          <td>${this.sanitizeText(burial.age)}</td>
          <td>${this.sanitizeText(burial.details || '')}</td>
        </tr>
      `).join('');

      intermentsHtml = `
        <div class="table-responsive">
          <table class="table table-sm table-bordered">
            <thead class="thead-light">
              <tr>
                <th style="width: 5%">#</th>
                <th style="width: 30%">Name</th>
                <th style="width: 20%">Date</th>
                <th style="width: 15%">Age</th>
                <th>Details</th>
              </tr>
            </thead>
            <tbody>${rows}</tbody>
          </table>
        </div>
      `;
    }

    return `
    <td colspan="${colSpan}">
      <div class="detail-content p-3">
        <div class="row">
          <div class="col-12">
            <h5 class="mb-3">
              Grave ${safe.section || '?'}-${safe.grave_number || '?'} <small class="text-muted">(${safe.burial_count} burials)</small>
            </h5>
          </div>
        </div>

        <div class="row mb-3">
          <div class="col-md-6">
            <div class="card h-100">
              <div class="card-header bg-light"><strong>Grave Details</strong></div>
              <div class="card-body">
                <dl class="row mb-0">
                  <dt class="col-sm-4">Section:</dt> <dd class="col-sm-8">${safe.section || 'N/A'}</dd>
                  <dt class="col-sm-4">Number:</dt> <dd class="col-sm-8">${safe.grave_number || 'N/A'}</dd>
                  <dt class="col-sm-4">Status:</dt> <dd class="col-sm-8">${safe.grave_status || 'N/A'}</dd>
                  <dt class="col-sm-4">Dimensions:</dt> <dd class="col-sm-8">${safe.grave_dimensions || 'N/A'}</dd>
                  <dt class="col-sm-4">Location:</dt> <dd class="col-sm-8">${safe.grave_location || 'N/A'}</dd>
                </dl>
              </div>
            </div>
          </div>
          <div class="col-md-6">
             <div class="card h-100">
              <div class="card-header bg-light"><strong>Inscription</strong></div>
              <div class="card-body">
                <p class="inscription-text" style="white-space: pre-wrap;">${safe.inscription || 'No inscription recorded.'}</p>
              </div>
            </div>
          </div>
        </div>

        <div class="card mb-3">
          <div class="card-header bg-light"><strong>Interments</strong></div>
          <div class="card-body p-0">
            ${intermentsHtml}
          </div>
        </div>

        <div class="row">
          <div class="col-md-12">
            <div class="detail-info">
              <h6>Processing Information</h6>
              <dl class="row">
                <dt class="col-sm-2">Source:</dt> <dd class="col-sm-4">${safe.fileName}</dd>
                <dt class="col-sm-2">Model:</dt> <dd class="col-sm-4">${safe.ai_provider}</dd>
                <dt class="col-sm-2">Processed:</dt> <dd class="col-sm-4">${formatDate(safe.processed_date)}</dd>
              </dl>
            </div>
          </div>
        </div>

        <div class="mt-3">
          <button class="btn btn-sm btn-secondary close-detail" data-memorial="${uniqueId}">
            <i class="fas fa-chevron-up"></i> Close Details
          </button>
        </div>
      </div>
    </td>
    `;
  }
};

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

// Function to display error summary with XSS protection
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

  // Add each error to the list with sanitization
  errors.forEach(error => {
    const listItem = document.createElement('li');
    // Use warning style for conflicts (resolved), error style for actual errors
    const itemClass = error.errorType === 'page_number_conflict'
      ? 'list-group-item list-group-item-warning'
      : 'list-group-item list-group-item-danger';
    listItem.className = itemClass;

    // Sanitize error data to prevent XSS
    const safeFileName = SanitizeUtils.sanitizeText(error.fileName || 'Unknown file');
    const safeErrorMessage = SanitizeUtils.sanitizeText(error.errorMessage || 'An unknown error occurred');
    const safeProvider = SanitizeUtils.sanitizeText(error.ai_provider);

    let message = `<strong>${safeFileName}</strong>: `;

    // Format message based on error type (using sanitized data)
    switch (error.errorType) {
      case 'empty_sheet':
        message += 'Empty or unreadable sheet detected.';
        break;
      case 'processing_failed':
        message += 'Processing failed after multiple attempts.';
        break;
      case 'page_number_conflict':
        message += safeErrorMessage;
        break;
      default:
        message += safeErrorMessage;
    }

    // Add model info if available (sanitized)
    if (error.ai_provider) {
      message += ` <span class="text-muted">(${safeProvider} model)</span> `;
    }

    listItem.innerHTML = message;
    errorList.appendChild(listItem);
  });
}

// Function to create expandable detail row with XSS protection
function createDetailRow(memorial, colSpan) {
  const detailRow = document.createElement('tr');
  detailRow.className = 'detail-row';
  detailRow.style.display = 'none';

  // Sanitize memorial data to prevent XSS
  let uniqueId;
  let htmlContent;

  if (memorial.source_type === 'grave_record_card' || memorial.file_name) {
    // It's a grave card (checking file_name is a heuristic if source_type is missing/ambiguous, but source_type is preferred)
    uniqueId = memorial.id || `grave-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    // We will implement createGraveCardDetailHTML next, for now use standard safe detail as placeholder or specific one if ready
    // For this step, we'll implement the specific function later in the file, so we call it here.
    htmlContent = SanitizeUtils.createGraveCardDetailHTML ?
      SanitizeUtils.createGraveCardDetailHTML(memorial, colSpan, uniqueId) :
      SanitizeUtils.createSafeDetailHTML(memorial, colSpan, uniqueId);
  } else {
    // Standard memorial
    uniqueId = memorial.id || memorial.memorial_id || `memorial-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    htmlContent = SanitizeUtils.createSafeDetailHTML(memorial, colSpan, uniqueId);
  }


  // Use the generated HTML
  detailRow.innerHTML = htmlContent;

  return detailRow;
}

// Function to toggle row expansion
function toggleRow(memorialId) {
  const detailRow = document.getElementById(`detail-${memorialId}`);
  const toggleBtn = document.querySelector(`[data-toggle-memorial="${memorialId}"]`);

  if (!detailRow) return;

  if (expandedRows.has(memorialId)) {
    // Collapse the row
    detailRow.style.display = 'none';
    expandedRows.delete(memorialId);

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
    expandedRows.add(memorialId);

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
    // Create main row with XSS protection
    const row = document.createElement('tr');
    row.className = 'memorial-row';
    row.style.cursor = 'pointer';

    // Generate unique ID for this memorial (same logic as in createDetailRow)
    const uniqueId = memorial.id || memorial.memorial_id || `memorial-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

    // Store unique ID as data attribute for event delegation
    row.setAttribute('data-memorial-id', uniqueId);

    // Use safe HTML generation to prevent XSS, passing the unique ID
    if (memorial.source_type === 'grave_record_card') {
      row.innerHTML = SanitizeUtils.createGraveCardMainRowHTML(memorial, uniqueId);
    } else {
      row.innerHTML = SanitizeUtils.createSafeMainRowHTML(memorial, uniqueId);
    }

    tableBody.appendChild(row);

    // Create detail row (initially hidden)
    const detailRow = createDetailRow(memorial, 9); // 9 columns total
    tableBody.appendChild(detailRow);

    // Event handling is now done via delegation on tableBody (no individual listeners)
  });

  // Update export button visibility
  updateExportButton(memorials);
}

/**
 * Update the export button visibility and behavior
 * @param {Array} memorials - List of memorials/cards
 */
function updateExportButton(memorials) {
  // Check if we have grave cards
  const hasGraveCards = memorials && memorials.length > 0 &&
    (memorials[0].source_type === 'grave_record_card' || memorials[0].file_name); // Heuristic if source_type missing

  const containerId = 'table-actions-container';
  let container = document.getElementById(containerId);

  // Create container if it doesn't exist (insert before table)
  if (!container) {
    const tableFn = document.getElementById('resultsTable');
    if (tableFn) {
      container = document.createElement('div');
      container.id = containerId;
      container.className = 'd-flex justify-content-end mb-2';
      tableFn.parentNode.insertBefore(container, tableFn);
    }
  }

  if (!container) return;

  // Clear container
  container.innerHTML = '';

  if (hasGraveCards) {
    const btn = document.createElement('button');
    btn.className = 'btn btn-success btn-sm';
    btn.innerHTML = '<i class="fas fa-file-csv"></i> Export Grave Cards (CSV)';
    // We need to dyn import or access the api module. 
    // Since main.js imports from api/graveCards.js is not established yet (main.js is self-contained or uses global imports usually?),
    // But graveCards.js was an ES module. main.js is likely an ES module too.
    // We should allow the global window object or add an event listener that calls the exported function if feasible.
    // OR we can just define the fetch call inline here to keep it simple as per "api/graveCards.js" logic.
    // For now, let's attach an event listener that calls window.exportGraveCards (if we expose it) or imports it.
    // Assuming main.js is a module, we can import at the top. But I can't add imports at the top right now easily without shifting lines heavily.
    // I will use a direct click handler that calls the API endpoint directly for simplicity, reusing the logic from graveCards.js

    btn.onclick = async () => {
      try {
        btn.disabled = true;
        btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Exporting...';
        const response = await fetch('/api/grave-cards/csv');
        if (!response.ok) throw new Error('Export failed');
        const blob = await response.blob();
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.style.display = 'none';
        a.href = url;
        a.setAttribute('download', 'grave_cards.csv');
        document.body.appendChild(a);
        a.click();
        window.URL.revokeObjectURL(url);
        document.body.removeChild(a);
        btn.disabled = false;
        btn.innerHTML = '<i class="fas fa-file-csv"></i> Export Grave Cards (CSV)';
      } catch (e) {
        console.error(e);
        alert('Failed to export CSV');
        btn.disabled = false;
        btn.innerHTML = '<i class="fas fa-exclamation-circle"></i> Error';
      }
    };

    container.appendChild(btn);
  }
}

/**
 * Update table headers based on source type
 * @param {string} sourceType - 'burial_register' or 'memorial'
 */
function updateTableHeaders(sourceType) {
  const thead = document.querySelector('#resultsTable thead tr');
  if (!thead) return;

  if (sourceType === 'burial_register') {
    thead.innerHTML = `
  <th style="width: 50px;"></th>
      <th class="sortable" data-sort="entry_id">Entry ID <i class="fas fa-sort"></i></th>
      <th class="sortable" data-sort="name_raw">Name <i class="fas fa-sort"></i></th>
      <th class="sortable" data-sort="burial_date_raw">Burial Date <i class="fas fa-sort"></i></th>
      <th class="sortable" data-sort="age_raw">Age <i class="fas fa-sort"></i></th>
      <th class="sortable" data-sort="page_number">Page <i class="fas fa-sort"></i></th>
      <th class="sortable" data-sort="row_index_on_page">Row <i class="fas fa-sort"></i></th>
      <th class="sortable" data-sort="ai_provider">AI Model <i class="fas fa-sort"></i></th>
      <th class="sortable" data-sort="processed_date">Processed <i class="fas fa-sort"></i></th>
`;
  } else if (sourceType === 'grave_record_card') {
    thead.innerHTML = `
  <th style="width: 50px;"></th>
      <th class="sortable" data-sort="file_name">File Name <i class="fas fa-sort"></i></th>
      <th class="sortable" data-sort="section">Section <i class="fas fa-sort"></i></th>
      <th class="sortable" data-sort="grave_number">Grave # <i class="fas fa-sort"></i></th>
      <th class="sortable">Burials</th>
      <th class="sortable" data-sort="source_type">Source Type <i class="fas fa-sort"></i></th>
      <th class="sortable" data-sort="ai_provider">AI Model <i class="fas fa-sort"></i></th>
      <th class="sortable" data-sort="processed_date">Processed <i class="fas fa-sort"></i></th>
`;
  } else {
    // Default memorial headers
    thead.innerHTML = `
  <th style="width: 50px;"></th>
      <th class="sortable" data-sort="memorial_number">Memorial # <i class="fas fa-sort"></i></th>
      <th class="sortable" data-sort="name">Name <i class="fas fa-sort"></i></th>
      <th class="sortable" data-sort="year_of_death">Year of Death <i class="fas fa-sort"></i></th>
      <th class="sortable" data-sort="source_type">Source Type <i class="fas fa-sort"></i></th>
      <th class="sortable" data-sort="ai_provider">AI Model <i class="fas fa-sort"></i></th>
      <th>Prompt Template</th>
      <th>Template Version</th>
      <th class="sortable" data-sort="processed_date">Processed <i class="fas fa-sort"></i></th>
`;
  }
}

/**
 * Sanitize burial register entry data
 * @param {Object} entry - Burial register entry object
 * @returns {Object} Sanitized entry data
 */
function sanitizeBurialRegisterEntry(entry) {
  if (!entry || typeof entry !== 'object') return {};

  return {
    id: entry.id,
    entry_id: SanitizeUtils.sanitizeText(entry.entry_id),
    name_raw: SanitizeUtils.sanitizeText(entry.name_raw),
    burial_date_raw: SanitizeUtils.sanitizeText(entry.burial_date_raw),
    age_raw: SanitizeUtils.sanitizeText(entry.age_raw),
    abode_raw: SanitizeUtils.sanitizeText(entry.abode_raw),
    page_number: SanitizeUtils.sanitizeNumber(entry.page_number),
    row_index_on_page: SanitizeUtils.sanitizeNumber(entry.row_index_on_page),
    entry_no_raw: SanitizeUtils.sanitizeText(entry.entry_no_raw),
    officiant_raw: SanitizeUtils.sanitizeText(entry.officiant_raw),
    marginalia_raw: SanitizeUtils.sanitizeText(entry.marginalia_raw),
    extra_notes_raw: SanitizeUtils.sanitizeText(entry.extra_notes_raw),
    row_ocr_raw: SanitizeUtils.sanitizeText(entry.row_ocr_raw),
    parish_header_raw: SanitizeUtils.sanitizeText(entry.parish_header_raw),
    county_header_raw: SanitizeUtils.sanitizeText(entry.county_header_raw),
    year_header_raw: SanitizeUtils.sanitizeText(entry.year_header_raw),
    uncertainty_flags: entry.uncertainty_flags,
    ai_provider: SanitizeUtils.sanitizeText(entry.ai_provider),
    model_name: SanitizeUtils.sanitizeText(entry.model_name),
    prompt_template: SanitizeUtils.sanitizeText(entry.prompt_template),
    prompt_version: SanitizeUtils.sanitizeText(entry.prompt_version),
    fileName: SanitizeUtils.sanitizeAttribute(entry.fileName || entry.file_name),
    volume_id: SanitizeUtils.sanitizeText(entry.volume_id),
    processed_date: entry.processed_date
  };
}

/**
 * Create safe HTML for burial register entry main row
 * @param {Object} entry - Burial register entry object
 * @param {string} uniqueId - Unique identifier for this entry
 * @returns {string} Safe HTML string for main table row
 */
function createBurialRegisterMainRowHTML(entry, uniqueId) {
  const safe = sanitizeBurialRegisterEntry(entry);

  return `
  <td class="text-center">
    <button class="btn btn-sm btn-outline-secondary expand-toggle"
      data-toggle-memorial="${uniqueId}"
      title="Click to expand/collapse details">
      <i class="fas fa-chevron-down"></i>
    </button>
    </td>
    <td>${safe.entry_id || 'N/A'}</td>
    <td>${safe.name_raw || 'N/A'}</td>
    <td>${safe.burial_date_raw || 'N/A'}</td>
    <td>${safe.age_raw || 'N/A'}</td>
    <td>${safe.page_number || 'N/A'}</td>
    <td>${safe.row_index_on_page || 'N/A'}</td>
    <td>${safe.ai_provider || 'N/A'}</td>
    <td>${formatDate(entry.processed_date)}</td>
`;
}

/**
 * Create safe HTML for burial register entry detail row
 * @param {Object} entry - Burial register entry object
 * @param {number} colSpan - Column span for the table cell
 * @param {string} uniqueId - Unique identifier for this entry
 * @returns {string} Safe HTML string
 */
function createBurialRegisterDetailHTML(entry, colSpan, uniqueId) {
  const safe = sanitizeBurialRegisterEntry(entry);

  // Parse uncertainty flags if it's a JSON string
  let uncertaintyFlags = [];
  try {
    if (typeof safe.uncertainty_flags === 'string') {
      uncertaintyFlags = JSON.parse(safe.uncertainty_flags);
    } else if (Array.isArray(safe.uncertainty_flags)) {
      uncertaintyFlags = safe.uncertainty_flags;
    }
  } catch (e) {
    // If parsing fails, leave as empty array
  }

  return `
  <td colspan="${colSpan}">
    <div class="detail-content p-3">
      <div class="row">
        <div class="col-12">
          <h5 class="mb-3">
            ${safe.entry_id || 'N/A'} - ${safe.name_raw || 'N/A'}
          </h5>
        </div>
      </div>

      <div class="card mb-3">
        <div class="card-header bg-light">
          <strong>Entry Details</strong>
        </div>
        <div class="card-body">
          <div class="row">
            <div class="col-md-6">
              <p><strong>Entry Number:</strong> ${safe.entry_no_raw || 'N/A'}</p>
              <p><strong>Name:</strong> ${safe.name_raw || 'N/A'}</p>
              <p><strong>Abode:</strong> ${safe.abode_raw || 'N/A'}</p>
              <p><strong>Burial Date:</strong> ${safe.burial_date_raw || 'N/A'}</p>
              <p><strong>Age:</strong> ${safe.age_raw || 'N/A'}</p>
              <p><strong>Officiant:</strong> ${safe.officiant_raw || 'N/A'}</p>
            </div>
            <div class="col-md-6">
              <p><strong>Page Number:</strong> ${safe.page_number}</p>
              <p><strong>Row Index:</strong> ${safe.row_index_on_page}</p>
              <p><strong>Volume ID:</strong> ${safe.volume_id || 'N/A'}</p>
              ${uncertaintyFlags.length > 0 ? `<p><strong>Uncertainty Flags:</strong> ${uncertaintyFlags.join(', ')}</p>` : ''}
            </div>
          </div>
          ${safe.marginalia_raw ? `<p><strong>Marginalia:</strong> ${safe.marginalia_raw}</p>` : ''}
          ${safe.extra_notes_raw ? `<p><strong>Extra Notes:</strong> ${safe.extra_notes_raw}</p>` : ''}
          ${safe.row_ocr_raw ? `<p><strong>Row OCR:</strong> <code>${safe.row_ocr_raw}</code></p>` : ''}
        </div>
      </div>

      <div class="card mb-3">
        <div class="card-header bg-light">
          <strong>Page Header Information</strong>
        </div>
        <div class="card-body">
          <div class="row">
            <div class="col-md-4">
              <p><strong>Parish:</strong> ${safe.parish_header_raw || 'N/A'}</p>
            </div>
            <div class="col-md-4">
              <p><strong>County:</strong> ${safe.county_header_raw || 'N/A'}</p>
            </div>
            <div class="col-md-4">
              <p><strong>Year:</strong> ${safe.year_header_raw || 'N/A'}</p>
            </div>
          </div>
        </div>
      </div>

      <div class="row">
        <div class="col-md-6">
          <div class="detail-info">
            <h6>Processing Information</h6>
            <dl class="row">
              <dt class="col-sm-4">Model:</dt>
              <dd class="col-sm-8">${safe.ai_provider || 'N/A'} ${safe.model_name ? `(${safe.model_name})` : ''}</dd>

              <dt class="col-sm-4">Template:</dt>
              <dd class="col-sm-8">${safe.prompt_template || 'N/A'}</dd>

              <dt class="col-sm-4">Version:</dt>
              <dd class="col-sm-8">${safe.prompt_version || 'N/A'}</dd>

              <dt class="col-sm-4">Source File:</dt>
              <dd class="col-sm-8">${safe.fileName || 'N/A'}</dd>
            </dl>
          </div>
        </div>

        <div class="col-md-6">
          <div class="detail-info">
            <h6>Additional Details</h6>
            <dl class="row">
              <dt class="col-sm-4">Processed:</dt>
              <dd class="col-sm-8">${formatDate(entry.processed_date)}</dd>
            </dl>
          </div>
        </div>
      </div>

      <div class="mt-3">
        <button class="btn btn-sm btn-secondary close-detail" data-memorial="${uniqueId}">
          <i class="fas fa-chevron-up"></i> Close Details
        </button>
      </div>
    </div>
    </td>
  `;
}

/**
 * Create detail row for burial register entry
 * @param {Object} entry - Burial register entry object
 * @param {number} colSpan - Column span
 * @returns {HTMLElement} Detail row element
 */
function createBurialRegisterDetailRow(entry, colSpan) {
  const detailRow = document.createElement('tr');
  detailRow.className = 'detail-row';
  detailRow.style.display = 'none';

  const uniqueId = entry.id || `burial-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  detailRow.id = `detail-${uniqueId}`;
  detailRow.setAttribute('data-memorial-id', uniqueId);

  detailRow.innerHTML = createBurialRegisterDetailHTML(entry, colSpan, uniqueId);

  return detailRow;
}

// Function to display burial register entries with expandable rows
function displayBurialRegisterEntries(entries) {
  const tableBody = document.getElementById('resultsTableBody');
  const emptyState = document.getElementById('emptyState');

  // Clear existing content and reset expanded rows
  tableBody.innerHTML = '';
  expandedRows.clear();

  // Check if there are any entries
  if (!entries || entries.length === 0) {
    if (emptyState) {
      emptyState.classList.remove('d-none');
    }
    return;
  }

  // Hide empty state
  if (emptyState) {
    emptyState.classList.add('d-none');
  }

  // Create rows for each entry
  entries.forEach(entry => {
    // Create main row
    const row = document.createElement('tr');
    row.className = 'memorial-row';
    row.style.cursor = 'pointer';

    // Generate unique ID
    const uniqueId = entry.id || `burial-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    row.setAttribute('data-memorial-id', uniqueId);

    // Use safe HTML generation
    row.innerHTML = createBurialRegisterMainRowHTML(entry, uniqueId);

    tableBody.appendChild(row);

    // Create detail row (initially hidden)
    const detailRow = createBurialRegisterDetailRow(entry, 9); // 9 columns total
    tableBody.appendChild(detailRow);
  });
}

// Function to setup event delegation for memorial rows (prevents memory leaks)
function setupEventDelegation() {
  const tableBody = document.getElementById('resultsTableBody');

  if (!tableBody) return;

  // Remove any existing delegated listener to prevent duplicates
  tableBody.removeEventListener('click', handleTableClick);

  // Add delegated event listener
  tableBody.addEventListener('click', handleTableClick);
}

// Delegated event handler for table clicks
function handleTableClick(event) {
  const target = event.target;

  // Handle memorial row clicks (for expanding/collapsing)
  const memorialRow = target.closest('tr.memorial-row');
  if (memorialRow && !target.closest('.expand-toggle')) {
    const memorialId = memorialRow.getAttribute('data-memorial-id');
    if (memorialId) {
      toggleRow(memorialId);
    }
  }
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
      const error = new Error(`HTTP ${response.status}: ${response.statusText} `);
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

    // Display data based on source type
    if (data.sourceType === 'burial_register' && data.burialRegisterEntries) {
      updateTableHeaders('burial_register');
      displayBurialRegisterEntries(data.burialRegisterEntries);

      // Update model info panel with data from the first entry
      if (data.burialRegisterEntries.length > 0) {
        const latestEntry = data.burialRegisterEntries.reduce((latest, current) =>
          new Date(current.processed_date) > new Date(latest.processed_date) ? current : latest
        );
        updateModelInfoPanel(latestEntry);
      }

      // Initialize table enhancements
      if (data.burialRegisterEntries.length > 0) {
        tableEnhancements.init(data.burialRegisterEntries);
        enableDownloadButtons();
      }
    } else {
      // Default to memorials display
      updateTableHeaders('memorial');
      displayMemorials(data.memorials || []);

      // Update model info panel with data from the first memorial (or aggregate)
      if (data.memorials && data.memorials.length > 0) {
        // Use the most recent memorial's data for the model info panel
        const latestMemorial = data.memorials.reduce((latest, current) =>
          new Date(current.processed_date) > new Date(latest.processed_date) ? current : latest
        );
        updateModelInfoPanel(latestMemorial);
      }

      // Initialize table enhancements
      if (data.memorials && data.memorials.length > 0) {
        tableEnhancements.init(data.memorials);
        enableDownloadButtons();
      }
    }

    // Display error summary (common for both types)
    displayErrorSummary(data.errors);

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
window.downloadJsonResults = function (filenameInput, format) {
  const filename = filenameInput.value || 'results';
  window.location.href = `/download-json?filename=${encodeURIComponent(filename)}&format=${format}`;
};

window.downloadCsvResults = function (filenameInput) {
  const filename = filenameInput.value || 'results';
  window.location.href = `/download-csv?filename=${encodeURIComponent(filename)}`;
};

// Initialize on document load
document.addEventListener('DOMContentLoaded', () => {
  loadResults();

  // Initialize clipboard functionality
  new ClipboardJS('.copy-info');

  // Setup event delegation once on page load (prevents memory leaks)
  setupEventDelegation();

  // Listen for filtered memorials event
  document.addEventListener('memorials-filtered', (event) => {
    displayMemorials(event.detail.memorials);
  });
});

// Event delegation for dynamic elements
document.addEventListener('click', function (event) {
  // Handle expand toggle button clicks
  if (event.target.closest('.expand-toggle')) {
    event.preventDefault();
    event.stopPropagation();
    const button = event.target.closest('.expand-toggle');
    const memorialId = button.getAttribute('data-toggle-memorial');
    toggleRow(memorialId);
  }

  // Handle close detail button clicks
  if (event.target.closest('.close-detail')) {
    event.preventDefault();
    const button = event.target.closest('.close-detail');
    const memorialId = button.getAttribute('data-memorial');
    toggleRow(memorialId);
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
export { expandedRows, toggleRow, formatSourceType, getSourceTypeBadgeClass };

// Expose retry function globally for HTML button onclick handlers
window.retryLoadResults = retryLoadResults;
