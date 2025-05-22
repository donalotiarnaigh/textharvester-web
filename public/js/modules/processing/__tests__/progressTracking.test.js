/**
 * @jest-environment jsdom
 */

describe('Progress Tracking with Error Handling', () => {
  // Mock DOM elements
  let progressBar;
  let statusMessage;
  let errorContainer;
  
  // Import modules - these will be mocked
  let progressModule;
  let errorHandlerModule;

  beforeEach(() => {
    // Set up DOM elements
    document.body.innerHTML = `
      <div id="progressBar" style="width: 0%"></div>
      <div id="statusMessage"></div>
      <div id="errorContainer" style="display: none;">
        <h3>Processing Notices</h3>
        <div id="errorList"></div>
      </div>
    `;
    
    // Get references to DOM elements
    progressBar = document.getElementById('progressBar');
    statusMessage = document.getElementById('statusMessage');
    errorContainer = document.getElementById('errorContainer');
    
    // Reset fetch mock
    global.fetch = jest.fn();
    
    // Clear mocks between tests
    jest.resetModules();
    
    // Mock error handler module
    jest.mock('../errorHandler', () => ({
      updateErrorMessages: jest.fn()
    }));
    
    // Import modules
    progressModule = require('../progressBar');
    errorHandlerModule = require('../errorHandler');
  });

  it('should update progress bar with percentage', () => {
    progressModule.updateProgressBar(50);
    expect(progressBar.style.width).toBe('50%');
    expect(progressBar.textContent).toBe('50%');
  });

  it('should update status message', () => {
    progressModule.updateProcessingMessage('Testing progress');
    expect(statusMessage.textContent).toBe('Testing progress');
  });

  it('should handle errors in progress response', async () => {
    // Mock fetch to return progress with errors
    global.fetch.mockResolvedValue({
      json: jest.fn().mockResolvedValue({
        state: 'processing',
        progress: 50,
        errors: [
          {
            fileName: 'file1.jpg',
            error: true,
            errorType: 'empty_sheet',
            errorMessage: 'No readable text found on the sheet'
          }
        ]
      })
    });
    
    // Import the module that uses fetch
    const apiModule = require('../api');
    
    // Call the checkProgress function
    await apiModule.checkProgress();
    
    // Verify progress and status were updated
    expect(progressBar.style.width).toBe('50%');
    expect(statusMessage.textContent).toBe('Processing files. Please wait...');
    
    // Verify error handler was called with the errors
    expect(errorHandlerModule.updateErrorMessages).toHaveBeenCalledWith([
      {
        fileName: 'file1.jpg',
        error: true,
        errorType: 'empty_sheet',
        errorMessage: 'No readable text found on the sheet'
      }
    ]);
  });
  
  it('should redirect to results page when complete, even with errors', async () => {
    // Mock fetch to return complete status with errors
    global.fetch.mockResolvedValue({
      json: jest.fn().mockResolvedValue({
        state: 'complete',
        progress: 100,
        errors: [
          {
            fileName: 'file1.jpg',
            error: true,
            errorType: 'empty_sheet',
            errorMessage: 'No readable text found on the sheet'
          }
        ]
      })
    });
    
    // Mock window.location.href
    delete window.location;
    window.location = { href: '' };
    
    // Import the module that uses fetch
    const apiModule = require('../api');
    
    // Mock setTimeout to execute immediately
    jest.useFakeTimers();
    
    // Call the checkProgress function
    await apiModule.checkProgress();
    jest.runAllTimers();
    
    // Verify redirect happened
    expect(window.location.href).toBe('/results.html');
  });
}); 