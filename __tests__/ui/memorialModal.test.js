/**
 * @jest-environment jsdom
 */

describe('MemorialModal', () => {
  let modalInstance;
  let mockBootstrapModal;

  const mockMemorial = {
    memorial_number: 'HG123',
    first_name: 'John',
    last_name: 'Doe',
    inscription: 'Test inscription',
    ai_provider: 'openai',
    prompt_template: 'memorial_ocr',
    prompt_version: '1.0.0',
    fileName: 'test.pdf',
    processed_date: '2024-03-20T10:00:00.000Z'
  };

  beforeEach(() => {
    // Mock Bootstrap Modal
    mockBootstrapModal = {
      show: jest.fn(),
      hide: jest.fn(),
      handleUpdate: jest.fn(),
      dispose: jest.fn()
    };

    // Mock the Bootstrap global object
    global.bootstrap = {
      Modal: jest.fn(() => mockBootstrapModal)
    };

    // Set up our document body
    document.body.innerHTML = `
      <div class="modal fade" id="inscriptionModal" tabindex="-1">
        <div class="modal-dialog">
          <div class="modal-content">
            <div class="modal-header">
              <h5 class="modal-title">Inscription Details</h5>
              <button type="button" class="btn-close" data-bs-dismiss="modal" aria-label="Close"></button>
            </div>
            <div class="modal-body" id="modalBody">
              <div class="memorial-content">
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
                    <p><strong>Template:</strong> <span id="modalTemplate"></span></p>
                    <p><strong>Version:</strong> <span id="modalVersion"></span></p>
                    <p><strong>Source File:</strong> <span id="modalFileName"></span></p>
                  </div>
                  <div class="col-md-6">
                    <p><strong>Processed:</strong> <span id="modalProcessDate"></span></p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
      <table id="resultsTable">
        <tbody>
          <tr data-memorial-id="HG123">
            <td>HG123</td>
            <td>John</td>
            <td>DOE</td>
            <td>
              <button class="btn btn-primary btn-sm view-memorial">View</button>
            </td>
          </tr>
        </tbody>
      </table>
    `;

    // Import the modal class after DOM setup
    const { MemorialModal } = require('../../public/js/modules/results/modal');
    modalInstance = new MemorialModal();
  });

  afterEach(() => {
    // Clean up
    delete global.bootstrap;
    jest.clearAllMocks();
  });

  describe('Initialization', () => {
    test('should initialize with modal element', () => {
      expect(modalInstance.modal).toBeTruthy();
      expect(modalInstance.modal.id).toBe('inscriptionModal');
    });

    test('should set up event listeners', () => {
      const modalSpy = jest.spyOn(modalInstance.modal, 'addEventListener');
      const documentSpy = jest.spyOn(document, 'addEventListener');
      
      modalInstance.setupListeners();
      
      expect(modalSpy).toHaveBeenCalledWith('show.bs.modal', expect.any(Function));
      expect(documentSpy).toHaveBeenCalledWith('memorial-selected', expect.any(Function));
    });
  });

  describe('Loading State', () => {
    test('should show loading state when modal is about to show', () => {
      modalInstance.handlePreShow();
      
      const modalBody = document.getElementById('modalBody');
      expect(modalBody.innerHTML).toContain('spinner-border');
      expect(modalBody.innerHTML).toContain('Loading');
    });

    test('should hide loading state when content is populated', () => {
      // First show loading state
      modalInstance.showLoading();
      expect(document.getElementById('modalBody').innerHTML).toContain('spinner-border');
      
      // Then populate content
      modalInstance.populateModal(mockMemorial);
      expect(document.getElementById('modalBody').innerHTML).not.toContain('spinner-border');
    });
  });

  describe('Content Population', () => {
    test('should populate all modal fields correctly', () => {
      modalInstance.populateModal(mockMemorial);
      
      expect(document.getElementById('modalMemorialInfo').textContent)
        .toBe('HG123 - John DOE');
      expect(document.getElementById('modalInscription').textContent)
        .toBe('Test inscription');
      expect(document.getElementById('modalModel').textContent)
        .toBe('openai');
      expect(document.getElementById('modalTemplate').textContent)
        .toBe('memorial_ocr');
      expect(document.getElementById('modalVersion').textContent)
        .toBe('1.0.0');
      expect(document.getElementById('modalFileName').textContent)
        .toBe('test.pdf');
      expect(document.getElementById('modalProcessDate').textContent)
        .toMatch(/2024-03-20/); // Date format might vary
    });

    test('should handle missing data gracefully', () => {
      const incompleteMemorial = {
        memorial_number: 'HG123',
        last_name: 'DOE'
      };
      
      modalInstance.populateModal(incompleteMemorial);
      
      expect(document.getElementById('modalMemorialInfo').textContent)
        .toBe('HG123 -  DOE');
      expect(document.getElementById('modalInscription').textContent)
        .toBe('No inscription available');
      expect(document.getElementById('modalModel').textContent)
        .toBe('N/A');
    });
  });

  describe('Event Handling', () => {
    test('should handle memorial-selected event', () => {
      const populateSpy = jest.spyOn(modalInstance, 'populateModal');
      
      document.dispatchEvent(new CustomEvent('memorial-selected', {
        detail: mockMemorial
      }));
      
      expect(populateSpy).toHaveBeenCalledWith(mockMemorial);
      expect(populateSpy).toHaveBeenCalledTimes(1);
    });

    test('should handle modal show event', () => {
      const showLoadingSpy = jest.spyOn(modalInstance, 'showLoading');
      
      modalInstance.modal.dispatchEvent(new Event('show.bs.modal'));
      
      expect(showLoadingSpy).toHaveBeenCalled();
      expect(showLoadingSpy).toHaveBeenCalledTimes(1);
    });
  });

  describe('View Button Integration', () => {
    test('should attach click handlers to view buttons', () => {
      const viewButton = document.querySelector('.view-memorial');
      const dispatchSpy = jest.spyOn(document, 'dispatchEvent');
      
      // Trigger click event
      viewButton.click();
      
      // Verify that the click handler dispatched the memorial-selected event
      expect(dispatchSpy).toHaveBeenCalledWith(
        expect.any(CustomEvent)
      );
      expect(dispatchSpy.mock.calls[0][0].type).toBe('memorial-selected');
    });

    test('should include memorial data in dispatched event', () => {
      const viewButton = document.querySelector('.view-memorial');
      let capturedEvent;
      
      document.addEventListener('memorial-selected', (event) => {
        capturedEvent = event;
      });
      
      viewButton.click();
      
      expect(capturedEvent.detail).toEqual(expect.objectContaining({
        memorial_number: 'HG123'
      }));
    });
  });

  describe('Bootstrap Modal Integration', () => {
    test('should initialize Bootstrap modal', () => {
      expect(modalInstance.bootstrapModal).toBeTruthy();
      expect(typeof modalInstance.bootstrapModal.show).toBe('function');
    });

    test('should show modal when view button is clicked', () => {
      const viewButton = document.querySelector('.view-memorial');
      const showSpy = jest.spyOn(modalInstance.bootstrapModal, 'show');
      
      viewButton.click();
      
      expect(showSpy).toHaveBeenCalled();
    });

    test('should hide loading state when modal is hidden', () => {
      // First show loading state
      modalInstance.showLoading();
      expect(document.getElementById('modalBody').innerHTML).toContain('spinner-border');
      
      // Hide modal
      modalInstance.modal.dispatchEvent(new Event('hidden.bs.modal'));
      
      // Check that loading state is cleared
      expect(document.getElementById('modalBody').innerHTML).not.toContain('spinner-border');
      expect(document.getElementById('modalBody').innerHTML).toContain('memorial-content');
    });
  });

  describe('Error Handling', () => {
    test('should handle missing memorial data gracefully', () => {
      const viewButton = document.querySelector('.view-memorial');
      // Remove the data attribute
      viewButton.parentElement.parentElement.removeAttribute('data-memorial-id');
      
      viewButton.click();
      
      expect(document.getElementById('modalMemorialInfo').textContent)
        .toBe('N/A -');
      expect(document.getElementById('modalInscription').textContent)
        .toBe('No inscription available');
    });

    test('should show error message for failed data loading', () => {
      modalInstance.handleError(new Error('Failed to load memorial data'));
      
      expect(document.getElementById('modalBody').innerHTML)
        .toContain('Error loading memorial details');
      expect(document.getElementById('modalBody').innerHTML)
        .toContain('Failed to load memorial data');
    });
  });
}); 