/**
 * @jest-environment jsdom
 */

describe('Results Table UI', () => {
  let container;

  beforeEach(() => {
    // Set up a DOM element as a render target
    container = document.createElement('div');
    document.body.appendChild(container);

    // Add required HTML structure
    container.innerHTML = `
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
          <tbody id="resultsTableBody"></tbody>
        </table>
        
        <div id="emptyState" class="text-center p-4 d-none">
          <i class="fas fa-search fa-3x mb-3 text-muted"></i>
          <p class="lead">No results found</p>
        </div>
        
        <div id="loadingState" class="text-center p-4">
          <div class="spinner-border text-primary" role="status">
            <span class="sr-only">Loading...</span>
          </div>
          <p class="mt-2">Loading results...</p>
        </div>
      </div>

      <!-- Modal -->
      <div class="modal fade" id="inscriptionModal" tabindex="-1">
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
    `;

    // Import and initialize the required JavaScript
    require('../../public/js/modules/results/main.js');
  });

  afterEach(() => {
    document.body.removeChild(container);
    container = null;
    jest.resetModules();
    window.resultsData = null;
  });

  describe('Table Structure', () => {
    it('should have correct column headers', () => {
      const headers = Array.from(container.querySelectorAll('th')).map(th => th.textContent);
      expect(headers).toEqual([
        'Memorial #',
        'Name',
        'Year of Death',
        'AI Model',
        'Processed',
        'Actions'
      ]);
    });

    it('should be responsive', () => {
      const tableContainer = container.querySelector('.table-responsive');
      expect(tableContainer).toBeTruthy();
      expect(tableContainer.classList.contains('mt-4')).toBeTruthy();
    });
  });

  describe('Model Badge Display', () => {
    it('should display OpenAI badge correctly', () => {
      const data = [{
        id: 1,
        memorial_number: 'TEST001',
        first_name: 'John',
        last_name: 'Doe',
        ai_provider: 'openai',
        processed_date: new Date().toISOString()
      }];

      window.populateResultsTable(data);
      const badge = container.querySelector('.badge');
      expect(badge.textContent).toBe('OpenAI');
      expect(badge.classList.contains('badge-primary')).toBeTruthy();
    });

    it('should display Anthropic badge correctly', () => {
      const data = [{
        id: 1,
        memorial_number: 'TEST001',
        first_name: 'John',
        last_name: 'Doe',
        ai_provider: 'anthropic',
        processed_date: new Date().toISOString()
      }];

      window.populateResultsTable(data);
      const badge = container.querySelector('.badge');
      expect(badge.textContent).toBe('Anthropic');
      expect(badge.classList.contains('badge-info')).toBeTruthy();
    });

    it('should display Unknown badge for missing provider', () => {
      const data = [{
        id: 1,
        memorial_number: 'TEST001',
        first_name: 'John',
        last_name: 'Doe',
        processed_date: new Date().toISOString()
      }];

      window.populateResultsTable(data);
      const badge = container.querySelector('.badge');
      expect(badge.textContent).toBe('Unknown');
      expect(badge.classList.contains('badge-secondary')).toBeTruthy();
    });
  });

  describe('Modal Functionality', () => {
    it('should populate modal with correct data', () => {
      const testData = {
        id: 1,
        memorial_number: 'TEST001',
        first_name: 'John',
        last_name: 'Doe',
        inscription: 'Test inscription',
        file_name: 'test.jpg',
        ai_provider: 'openai',
        model_version: 'gpt-4-vision',
        processed_date: new Date().toISOString()
      };

      window.populateResultsTable([testData]);
      const viewButton = container.querySelector('.view-details');
      viewButton.click();

      expect(document.getElementById('modalMemorialInfo').textContent)
        .toBe('TEST001 - John Doe');
      expect(document.getElementById('modalInscription').textContent)
        .toBe('Test inscription');
      expect(document.getElementById('modalModel').textContent)
        .toBe('OpenAI GPT-4o');
      expect(document.getElementById('modalFileName').textContent)
        .toBe('test.jpg');
    });
  });

  describe('Empty and Loading States', () => {
    it('should show empty state when no data', () => {
      window.populateResultsTable([]);
      const emptyState = document.getElementById('emptyState');
      const loadingState = document.getElementById('loadingState');

      expect(emptyState.classList.contains('d-none')).toBeFalsy();
      expect(loadingState.classList.contains('d-none')).toBeTruthy();
    });

    it('should hide loading state after data loads', () => {
      const data = [{
        id: 1,
        memorial_number: 'TEST001',
        first_name: 'John',
        last_name: 'Doe'
      }];

      window.populateResultsTable(data);
      const loadingState = document.getElementById('loadingState');
      expect(loadingState.classList.contains('d-none')).toBeTruthy();
    });
  });
}); 