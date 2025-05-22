/**
 * @jest-environment jsdom
 */

describe('Error Handler UI Component', () => {
  // Import error handler module
  let errorHandler;
  
  // DOM elements
  let errorContainer;
  
  beforeEach(() => {
    // Set up DOM elements
    document.body.innerHTML = `
      <div id="errorContainer" style="display: none;">
        <h3>Processing Notices</h3>
        <div id="errorList"></div>
      </div>
    `;
    
    errorContainer = document.getElementById('errorContainer');
    
    // Clear mocks between tests
    jest.resetModules();
    
    // Import module
    errorHandler = require('../errorHandler');
  });
  
  it('should display error messages when errors are present', () => {
    const errors = [
      {
        fileName: 'file1.jpg',
        error: true,
        errorType: 'empty_sheet',
        errorMessage: 'No readable text found on the sheet'
      },
      {
        fileName: 'file2.jpg',
        error: true,
        errorType: 'validation',
        errorMessage: 'Invalid year format'
      }
    ];
    
    errorHandler.updateErrorMessages(errors);
    
    // Container should be visible
    expect(errorContainer.style.display).toBe('block');
    
    // Error list should contain both errors
    const errorItems = document.querySelectorAll('.error-item');
    expect(errorItems.length).toBe(2);
    
    // Verify content of error messages
    expect(errorItems[0].innerHTML).toContain('file1.jpg');
    expect(errorItems[0].innerHTML).toContain('empty_sheet');
    expect(errorItems[0].innerHTML).toContain('No readable text found on the sheet');
    
    expect(errorItems[1].innerHTML).toContain('file2.jpg');
    expect(errorItems[1].innerHTML).toContain('validation');
    expect(errorItems[1].innerHTML).toContain('Invalid year format');
  });
  
  it('should hide container when no errors are present', () => {
    // First set container to visible
    errorContainer.style.display = 'block';
    
    // Update with empty errors array
    errorHandler.updateErrorMessages([]);
    
    // Container should be hidden
    expect(errorContainer.style.display).toBe('none');
  });
  
  it('should clear previous errors when updating', () => {
    // First add some errors
    const initialErrors = [
      {
        fileName: 'file1.jpg',
        error: true,
        errorType: 'empty_sheet',
        errorMessage: 'No readable text found on the sheet'
      }
    ];
    
    errorHandler.updateErrorMessages(initialErrors);
    expect(document.querySelectorAll('.error-item').length).toBe(1);
    
    // Now update with new errors
    const newErrors = [
      {
        fileName: 'file2.jpg',
        error: true,
        errorType: 'validation',
        errorMessage: 'Invalid year format'
      }
    ];
    
    errorHandler.updateErrorMessages(newErrors);
    
    // Should only have the new error
    const errorItems = document.querySelectorAll('.error-item');
    expect(errorItems.length).toBe(1);
    expect(errorItems[0].innerHTML).toContain('file2.jpg');
  });
  
  it('should format errors based on type', () => {
    const errors = [
      {
        fileName: 'file1.jpg',
        error: true,
        errorType: 'empty_sheet',
        errorMessage: 'No readable text found on the sheet'
      },
      {
        fileName: 'file2.jpg',
        error: true,
        errorType: 'processing_failed',
        errorMessage: 'Processing failed after 3 attempts'
      },
      {
        fileName: 'file3.jpg',
        error: true,
        errorType: 'unknown',
        errorMessage: 'An unknown error occurred'
      }
    ];
    
    errorHandler.updateErrorMessages(errors);
    
    // Verify content has specific formatting for different error types
    const errorItems = document.querySelectorAll('.error-item');
    
    // Empty sheet errors should be formatted as empty sheet notices
    expect(errorItems[0].innerHTML).toContain('empty sheet');
    expect(errorItems[0].innerHTML).toContain('skipped');
    
    // Processing failed errors should mention retries
    expect(errorItems[1].innerHTML).toContain('processing failed');
    expect(errorItems[1].innerHTML).toContain('multiple attempts');
    
    // Unknown errors should still show the message
    expect(errorItems[2].innerHTML).toContain('file3.jpg');
    expect(errorItems[2].innerHTML).toContain('An unknown error occurred');
  });
}); 