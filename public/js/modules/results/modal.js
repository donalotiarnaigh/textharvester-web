/**
 * Class representing the memorial details modal
 */
class MemorialModal {
  constructor() {
    this.modal = document.getElementById('inscriptionModal');
    this.setupListeners();
  }

  /**
   * Set up event listeners for modal and memorial selection
   */
  setupListeners() {
    // Listen for modal events
    this.modal.addEventListener('show.bs.modal', this.handlePreShow.bind(this));
    
    // Listen for memorial selection
    document.addEventListener('memorial-selected', this.handleMemorialSelected.bind(this));
  }

  /**
   * Handle modal pre-show event
   * @param {Event} event - The modal show event
   */
  handlePreShow(event) {
    this.showLoading();
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
    return `${memorial.memorial_number || 'N/A'} - ${firstName} ${lastName}`;
  }

  /**
   * Populate modal with memorial data
   * @param {Object} memorial - The memorial data object
   */
  populateModal(memorial) {
    const modalBody = document.getElementById('modalBody');
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