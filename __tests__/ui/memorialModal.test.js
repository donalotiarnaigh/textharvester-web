/**
 * @jest-environment jsdom
 */

describe('MemorialModal', () => {
  let modalInstance;
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
    // Set up our document body
    document.body.innerHTML = `
      <div class="modal fade" id="inscriptionModal" tabindex="-1">
        <div class="modal-dialog">
          <div class="modal-content">
            <div class="modal-header">
              <h5 class="modal-title">Inscription Details</h5>
              <button type="button" class="close" data-dismiss="modal">
                <span aria-hidden="true">&times;</span>
              </button>
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
    `;

    // Import the modal class after DOM setup
    const { MemorialModal } = require('../../public/js/modules/results/modal');
    modalInstance = new MemorialModal();
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
}); 