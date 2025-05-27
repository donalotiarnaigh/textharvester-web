/**
 * @jest-environment jsdom
 */

const ProgressBarUI = require('../ProgressBarUI');

describe('ProgressBarUI', () => {
  let container;
  let progressBar;

  beforeEach(() => {
    // Set up DOM elements
    container = document.createElement('div');
    container.innerHTML = `
      <div id="progress-container">
        <div class="progress-bar">
          <div class="progress-bar__fill"></div>
        </div>
        <div class="progress-bar__status"></div>
      </div>
    `;
    document.body.appendChild(container);
    progressBar = new ProgressBarUI('progress-container');
  });

  afterEach(() => {
    document.body.removeChild(container);
  });

  test('should initialize correctly', () => {
    expect(progressBar.progressBar).toBeDefined();
    expect(progressBar.progressBarFill).toBeDefined();
    expect(progressBar.statusElement).toBeDefined();
  });

  test('should update progress correctly', () => {
    progressBar.updateProgress(50, 'Processing');
    
    expect(progressBar.progressBarFill.style.width).toBe('50%');
    expect(progressBar.statusElement.textContent).toBe('Processing');
  });

  test('should show error state correctly', () => {
    progressBar.showError();
    
    expect(progressBar.progressBar.classList.contains('error')).toBe(true);
    expect(progressBar.progressBar.classList.contains('complete')).toBe(false);
    expect(progressBar.statusElement.textContent).toBe('Error occurred');
  });

  test('should show complete state correctly', () => {
    // First verify initial state
    expect(progressBar.progressBar.classList.contains('complete')).toBe(false);
    
    // Call showComplete
    progressBar.showComplete();
    
    // Log the element state for debugging
    console.log('Progress bar element:', progressBar.progressBar.outerHTML);
    console.log('Progress bar classes:', progressBar.progressBar.classList.toString());
    
    // Verify final state
    expect(progressBar.progressBarFill.style.width).toBe('100%');
    expect(progressBar.statusElement.textContent).toBe('Complete');
    expect(progressBar.progressBar.classList.contains('error')).toBe(false);
    expect(progressBar.progressBar.classList.contains('complete')).toBe(true);
  });

  test('should handle multiple state changes correctly', () => {
    // Show complete state
    progressBar.showComplete();
    expect(progressBar.progressBar.classList.contains('complete')).toBe(true);
    expect(progressBar.progressBar.classList.contains('error')).toBe(false);
    
    // Switch to error state
    progressBar.showError();
    expect(progressBar.progressBar.classList.contains('complete')).toBe(false);
    expect(progressBar.progressBar.classList.contains('error')).toBe(true);
    
    // Back to complete state
    progressBar.showComplete();
    expect(progressBar.progressBar.classList.contains('complete')).toBe(true);
    expect(progressBar.progressBar.classList.contains('error')).toBe(false);
  });
}); 