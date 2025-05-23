/**
 * @jest-environment jsdom
 */

const { ProcessingStateManager } = require('../../../utils/ProcessingStateManager');
const { ProgressTracker } = require('../ProgressTracker');

describe('ProgressTracker', () => {
  let stateManager;
  let progressTracker;
  let progressBar;
  let statusMessage;
  let phaseIndicator;

  beforeEach(() => {
    // Set up DOM elements
    document.body.innerHTML = `
      <div class="progress">
        <div id="progressBar" class="progress-bar" role="progressbar"></div>
      </div>
      <div id="statusMessage"></div>
      <div id="phaseIndicator"></div>
      <div id="fileProgress"></div>
    `;

    progressBar = document.getElementById('progressBar');
    statusMessage = document.getElementById('statusMessage');
    phaseIndicator = document.getElementById('phaseIndicator');

    stateManager = new ProcessingStateManager();
    progressTracker = new ProgressTracker(stateManager);
  });

  describe('UI Updates', () => {
    it('should update progress bar with normalized progress', () => {
      stateManager.addFiles(['file1.jpg']);
      progressTracker.updateUI({
        files: new Map([['file1.jpg', {
          phases: { upload: 50, ocr: 0, analysis: 0, validation: 0 },
          status: 'pending'
        }]]),
        totalFiles: 1,
        processedFiles: 0
      });

      // With upload weight of 0.2, 50% progress in upload = 10% total
      expect(progressBar.style.width).toBe('10%');
      expect(progressBar.getAttribute('aria-valuenow')).toBe('10');
    });

    it('should show current processing phase', () => {
      stateManager.addFiles(['file1.jpg']);
      progressTracker.updateUI({
        files: new Map([['file1.jpg', {
          phases: { upload: 100, ocr: 50, analysis: 0, validation: 0 },
          status: 'pending'
        }]]),
        totalFiles: 1,
        processedFiles: 0,
        phase: 'ocr'
      });

      expect(phaseIndicator.textContent).toContain('OCR Processing');
    });

    it('should handle multiple files with different phases', () => {
      stateManager.addFiles(['file1.jpg', 'file2.jpg']);
      progressTracker.updateUI({
        files: new Map([
          ['file1.jpg', {
            phases: { upload: 100, ocr: 50, analysis: 0, validation: 0 },
            status: 'pending'
          }],
          ['file2.jpg', {
            phases: { upload: 100, ocr: 0, analysis: 0, validation: 0 },
            status: 'pending'
          }]
        ]),
        totalFiles: 2,
        processedFiles: 0
      });

      // File1: (100*0.2 + 50*0.3) = 35%
      // File2: (100*0.2) = 20%
      // Average: (35 + 20) / 2 = 27.5%
      expect(progressBar.style.width).toBe('27.5%');
    });
  });

  describe('Status Messages', () => {
    it('should show appropriate status for each phase', () => {
      const phases = ['upload', 'ocr', 'analysis', 'validation'];
      const messages = {
        upload: 'Uploading files...',
        ocr: 'Performing OCR...',
        analysis: 'Analyzing content...',
        validation: 'Validating results...'
      };

      phases.forEach(phase => {
        progressTracker.updateUI({
          files: new Map(),
          totalFiles: 1,
          processedFiles: 0,
          phase
        });
        expect(statusMessage.textContent).toBe(messages[phase]);
      });
    });

    it('should show completion message when done', () => {
      progressTracker.updateUI({
        files: new Map([['file1.jpg', {
          phases: { upload: 100, ocr: 100, analysis: 100, validation: 100 },
          status: 'complete'
        }]]),
        totalFiles: 1,
        processedFiles: 1
      });

      expect(statusMessage.textContent).toBe('Processing complete!');
    });

    it('should show error message when errors occur', () => {
      progressTracker.updateUI({
        files: new Map([['file1.jpg', {
          phases: { upload: 50, ocr: 0, analysis: 0, validation: 0 },
          status: 'error'
        }]]),
        totalFiles: 1,
        processedFiles: 0,
        errors: new Map([['file1.jpg', new Error('Test error')]])
      });

      expect(statusMessage.textContent).toContain('Error processing');
    });
  });

  describe('Progress Normalization', () => {
    it('should normalize progress to never exceed 100%', () => {
      stateManager.addFiles(['file1.jpg']);
      progressTracker.updateUI({
        files: new Map([['file1.jpg', {
          phases: { upload: 100, ocr: 100, analysis: 100, validation: 100 },
          status: 'complete'
        }]]),
        totalFiles: 1,
        processedFiles: 1
      });

      expect(progressBar.style.width).toBe('100%');
      expect(parseInt(progressBar.getAttribute('aria-valuenow'))).toBeLessThanOrEqual(100);
    });

    it('should handle zero progress gracefully', () => {
      stateManager.addFiles(['file1.jpg']);
      progressTracker.updateUI({
        files: new Map([['file1.jpg', {
          phases: { upload: 0, ocr: 0, analysis: 0, validation: 0 },
          status: 'pending'
        }]]),
        totalFiles: 1,
        processedFiles: 0
      });

      expect(progressBar.style.width).toBe('0%');
      expect(progressBar.getAttribute('aria-valuenow')).toBe('0');
    });
  });

  describe('Animation and Smoothing', () => {
    it('should apply smooth transitions to progress updates', () => {
      expect(window.getComputedStyle(progressBar).transition)
        .toContain('width');
    });

    it('should not jump backwards in progress', () => {
      // First update
      progressTracker.updateUI({
        files: new Map([['file1.jpg', {
          phases: { upload: 50, ocr: 0, analysis: 0, validation: 0 },
          status: 'pending'
        }]]),
        totalFiles: 1,
        processedFiles: 0
      });

      const firstProgress = parseInt(progressBar.getAttribute('aria-valuenow'));

      // Second update with seemingly less progress but in a later phase
      progressTracker.updateUI({
        files: new Map([['file1.jpg', {
          phases: { upload: 100, ocr: 10, analysis: 0, validation: 0 },
          status: 'pending'
        }]]),
        totalFiles: 1,
        processedFiles: 0
      });

      const secondProgress = parseInt(progressBar.getAttribute('aria-valuenow'));
      expect(secondProgress).toBeGreaterThan(firstProgress);
    });
  });
}); 