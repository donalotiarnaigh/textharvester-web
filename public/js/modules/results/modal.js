/**
 * Class representing the memorial details modal
 */
class MemorialModal {
  constructor() {
    this.modal = document.getElementById('inscriptionModal');
    this.bootstrapModal = new bootstrap.Modal(this.modal);
    this.setupListeners();
    this.attachViewButtonHandlers();
  }

  /**
   * Set up event listeners for modal and memorial selection
   */
  setupListeners() {
    // Listen for modal events
    this.modal.addEventListener('show.bs.modal', this.handlePreShow.bind(this));
    this.modal.addEventListener('hidden.bs.modal', this.handleHidden.bind(this));
    
    // Listen for memorial selection
    document.addEventListener('memorial-selected', this.handleMemorialSelected.bind(this));
  }

  /**
   * Attach click handlers to view buttons
   */
  attachViewButtonHandlers() {
    const viewButtons = document.querySelectorAll('.view-memorial');
    viewButtons.forEach(button => {
      // Remove any existing click handlers
      const newButton = button.cloneNode(true);
      button.parentNode.replaceChild(newButton, button);
      
      // Add new click handler
      newButton.addEventListener('click', this.handleViewButtonClick.bind(this));
    });
  }

  /**
   * Handle view button click
   * @param {Event} event - The click event
   */
  handleViewButtonClick(event) {
    const button = event.currentTarget;
    const row = button.closest('tr');
    const memorialId = row?.dataset?.memorialId;

    // Dispatch memorial-selected event
    document.dispatchEvent(new CustomEvent('memorial-selected', {
      detail: {
        memorial_number: memorialId || 'N/A'
      }
    }));

    // Show the modal
    this.bootstrapModal.show();
  }

  /**
   * Handle modal pre-show event
   * @param {Event} event - The modal show event
   */
  handlePreShow(event) {
    this.showLoading();
  }

  /**
   * Handle modal hidden event
   * @param {Event} event - The modal hidden event
   */
  handleHidden(event) {
    // Reset modal content to empty state
    this.populateModal({});
  }

  /**
   * Handle memorial selection event
   * @param {CustomEvent} event - The memorial selection event
   */
  handleMemorialSelected(event) {
    const memorial = event.detail;
    this.populateModal(memorial);
  }

  /**
   * Show loading state in modal
   */
  showLoading() {
    const modalBody = document.getElementById('modalBody');
    modalBody.innerHTML = `
      <div class="text-center p-4">
        <div class="spinner-border text-primary" role="status">
          <span class="sr-only">Loading...</span>
        </div>
        <p class="mt-2">Loading memorial details...</p>
      </div>
    `;
  }

  /**
   * Handle error state
   * @param {Error} error - The error that occurred
   */
  handleError(error) {
    const modalBody = document.getElementById('modalBody');
    modalBody.innerHTML = `
      <div class="alert alert-danger" role="alert">
        <h4 class="alert-heading">Error loading memorial details</h4>
        <p>${error.message}</p>
      </div>
    `;
  }

  /**
   * Format a date string for display
   * @param {string} dateString - The date string to format
   * @returns {string} Formatted date string
   */
  formatDate(dateString) {
    if (!dateString) return 'N/A';
    try {
      const date = new Date(dateString);
      return date.toISOString().split('T')[0];
    } catch (error) {
      console.warn('Error formatting date:', error);
      return dateString;
    }
  }

  /**
   * Format name components for display
   * @param {Object} memorial - The memorial data object
   * @returns {string} Formatted name string
   */
  formatName(memorial) {
    const firstName = memorial.first_name || '';
    const lastName = (memorial.last_name || '').toUpperCase();
    const memorialNumber = memorial.memorial_number || 'N/A';
    return firstName || lastName ? `${memorialNumber} - ${firstName} ${lastName}` : `${memorialNumber} -`;
  }

  /**
   * Populate modal with memorial data
   * @param {Object} memorial - The memorial data object
   */
  populateModal(memorial = {}) {
    const modalBody = document.getElementById('modalBody');
    
    // If no memorial data is provided, show empty state
    if (!memorial || Object.keys(memorial).length === 0) {
      modalBody.innerHTML = `
        <div class="memorial-content">
          <h6 class="mb-3" id="modalMemorialInfo">N/A -</h6>
          <div class="card mb-3">
            <div class="card-header">
              <strong>Inscription</strong>
            </div>
            <div class="card-body">
              <p id="modalInscription">No inscription available</p>
            </div>
          </div>
          <div class="row">
            <div class="col-md-6">
              <p><strong>Model:</strong> <span id="modalModel">N/A</span></p>
              <p><strong>Template:</strong> <span id="modalTemplate">N/A</span></p>
              <p><strong>Version:</strong> <span id="modalVersion">N/A</span></p>
              <p><strong>Source File:</strong> <span id="modalFileName">N/A</span></p>
            </div>
            <div class="col-md-6">
              <p><strong>Processed:</strong> <span id="modalProcessDate">N/A</span></p>
            </div>
          </div>
        </div>
      `;
      return;
    }

    modalBody.innerHTML = `
      <div class="memorial-content">
        <h6 class="mb-3" id="modalMemorialInfo">${this.formatName(memorial)}</h6>
        <div class="card mb-3">
          <div class="card-header">
            <strong>Inscription</strong>
          </div>
          <div class="card-body">
            <p id="modalInscription">${memorial.inscription || 'No inscription available'}</p>
          </div>
        </div>
        <div class="row">
          <div class="col-md-6">
            <p><strong>Model:</strong> <span id="modalModel">${memorial.ai_provider || 'N/A'}</span></p>
            <p><strong>Template:</strong> <span id="modalTemplate">${memorial.prompt_template || 'N/A'}</span></p>
            <p><strong>Version:</strong> <span id="modalVersion">${memorial.prompt_version || 'N/A'}</span></p>
            <p><strong>Source File:</strong> <span id="modalFileName">${memorial.fileName || 'N/A'}</span></p>
          </div>
          <div class="col-md-6">
            <p><strong>Processed:</strong> <span id="modalProcessDate">${this.formatDate(memorial.processed_date)}</span></p>
          </div>
        </div>
      </div>
    `;
  }
}

// Export the class
module.exports = { MemorialModal };


