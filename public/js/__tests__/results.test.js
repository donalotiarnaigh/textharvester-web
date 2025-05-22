/**
 * @jest-environment jsdom
 */

describe('Results Page with Error Summary', () => {
  // Mock fetch
  global.fetch = jest.fn();
  
  beforeEach(() => {
    // Set up DOM elements
    document.body.innerHTML = `
      <div id="memorials-container"></div>
      <div id="errorSummary" style="display: none;">
        <h3>Processing Notices</h3>
        <p>The following files could not be processed:</p>
        <ul id="errorList"></ul>
      </div>
    `;
    
    // Reset mocks between tests
    jest.resetModules();
    jest.clearAllMocks();
  });
  
  it('should display memorials and error summary when both are present', async () => {
    // Mock fetch to return memorials and errors
    global.fetch.mockResolvedValue({
      json: jest.fn().mockResolvedValue({
        memorials: [
          {
            memorial_number: 'HG-123',
            first_name: 'JOHN',
            last_name: 'DOE',
            year_of_death: 1950,
            inscription: 'Rest in peace'
          }
        ],
        errors: [
          {
            fileName: 'file2.jpg',
            error: true,
            errorType: 'empty_sheet',
            errorMessage: 'No readable text found on the sheet'
          }
        ]
      })
    });
    
    // Import the results module
    const resultsModule = require('../results');
    
    // Call loadResults function
    await resultsModule.loadResults();
    
    // Verify memorials were displayed
    const memorialsContainer = document.getElementById('memorials-container');
    expect(memorialsContainer.innerHTML).toContain('HG-123');
    expect(memorialsContainer.innerHTML).toContain('JOHN');
    expect(memorialsContainer.innerHTML).toContain('DOE');
    
    // Verify error summary is visible and contains error
    const errorSummary = document.getElementById('errorSummary');
    expect(errorSummary.style.display).toBe('block');
    
    const errorList = document.getElementById('errorList');
    expect(errorList.children.length).toBe(1);
    expect(errorList.innerHTML).toContain('file2.jpg');
    expect(errorList.innerHTML).toContain('No readable text found on the sheet');
  });
  
  it('should hide error summary when no errors are present', async () => {
    // Mock fetch to return only memorials
    global.fetch.mockResolvedValue({
      json: jest.fn().mockResolvedValue({
        memorials: [
          {
            memorial_number: 'HG-123',
            first_name: 'JOHN',
            last_name: 'DOE',
            year_of_death: 1950,
            inscription: 'Rest in peace'
          }
        ],
        errors: []
      })
    });
    
    // Import the results module
    const resultsModule = require('../results');
    
    // Call loadResults function
    await resultsModule.loadResults();
    
    // Verify error summary is hidden
    const errorSummary = document.getElementById('errorSummary');
    expect(errorSummary.style.display).toBe('none');
  });
  
  it('should display appropriate message when only errors are present', async () => {
    // Mock fetch to return only errors
    global.fetch.mockResolvedValue({
      json: jest.fn().mockResolvedValue({
        memorials: [],
        errors: [
          {
            fileName: 'file1.jpg',
            error: true,
            errorType: 'empty_sheet',
            errorMessage: 'No readable text found on the sheet'
          },
          {
            fileName: 'file2.jpg',
            error: true,
            errorType: 'empty_sheet',
            errorMessage: 'No readable text found on the sheet'
          }
        ]
      })
    });
    
    // Import the results module
    const resultsModule = require('../results');
    
    // Call loadResults function
    await resultsModule.loadResults();
    
    // Verify memorials container shows "No results" message
    const memorialsContainer = document.getElementById('memorials-container');
    expect(memorialsContainer.innerHTML).toContain('No results');
    
    // Verify error summary is visible and contains both errors
    const errorSummary = document.getElementById('errorSummary');
    expect(errorSummary.style.display).toBe('block');
    
    const errorList = document.getElementById('errorList');
    expect(errorList.children.length).toBe(2);
  });
  
  it('should handle fetch errors gracefully', async () => {
    // Mock fetch to throw an error
    global.fetch.mockRejectedValue(new Error('Failed to fetch'));
    
    // Mock console.error to capture error messages
    console.error = jest.fn();
    
    // Import the results module
    const resultsModule = require('../results');
    
    // Call loadResults function
    await resultsModule.loadResults();
    
    // Verify error was logged
    expect(console.error).toHaveBeenCalledWith('Error loading results:', expect.any(Error));
    
    // Verify memorials container shows error message
    const memorialsContainer = document.getElementById('memorials-container');
    expect(memorialsContainer.innerHTML).toContain('Error loading results');
  });
}); 