/**
 * @jest-environment jsdom
 */
import { ProgressBarUI } from '../ProgressBarUI.js';
import { ProgressClient } from '../ProgressClient.js';
import { ProgressController } from '../ProgressController.js';

describe('Processing Integration', () => {
  let container;
  let progressBar;
  let progressClient;
  let progressController;

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

    // Initialize components
    progressBar = new ProgressBarUI('progress-container');
    progressClient = new ProgressClient();
    progressController = new ProgressController(progressBar, progressClient);

    // Mock fetch
    global.fetch = jest.fn();

    // Spy on showComplete and showError
    jest.spyOn(progressBar, 'showComplete');
    jest.spyOn(progressBar, 'showError');
  });

  afterEach(() => {
    document.body.removeChild(container);
    jest.clearAllMocks();
    if (progressController) {
      progressController.stopPolling();
    }
  });

  test('should initialize components correctly', () => {
    expect(progressBar).toBeInstanceOf(ProgressBarUI);
    expect(progressClient).toBeInstanceOf(ProgressClient);
    expect(progressController).toBeInstanceOf(ProgressController);
  });

  test('should start polling when processing begins', async () => {
    // Mock getProgress method
    const mockProgress = {
      progress: 50,
      status: 'processing',
      errors: [],
      files: {}
    };

    global.fetch.mockResolvedValueOnce({
      ok: true,
      status: 200,
      json: () => Promise.resolve(mockProgress),
      headers: new Headers()
    });

    await progressController.startPolling();
    await progressController.pollProgress();
    
    expect(fetch).toHaveBeenCalledWith('/processing-status', expect.any(Object));
    expect(container.querySelector('.progress-bar__fill').style.width).toBe('50%');
    expect(container.querySelector('.progress-bar__status').textContent).toBe('processing');
  });

  test('should handle completion correctly', async () => {
    // Mock completion response
    const mockCompletion = {
      progress: 100,
      status: 'complete',
      errors: [],
      files: {}
    };

    await progressController.handleProgress(mockCompletion);
    
    expect(progressBar.showComplete).toHaveBeenCalled();
    expect(container.querySelector('.progress-bar').classList.contains('complete')).toBe(true);
  });

  test('should handle errors correctly', async () => {
    const mockError = {
      progress: 50,
      status: 'processing',
      errors: [{ message: 'Test error' }],
      files: {}
    };

    await progressController.handleProgress(mockError);
    
    // The controller logs warnings for errors but continues processing
    // It doesn't set error state unless there's a critical failure
    expect(container.querySelector('.progress-bar__fill').style.width).toBe('50%');
    expect(container.querySelector('.progress-bar__status').textContent).toBe('processing');
  });
}); 