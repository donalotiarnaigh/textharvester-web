/**
 * @jest-environment jsdom
 */

import { initModelTracking, getSelectedModel, updateProgress, getStatusMessage } from '../modules/processing/modelTracking.js';

describe('Processing Page Model Selection Features', () => {
  beforeEach(() => {
    // Set up DOM elements
    document.body.innerHTML = `
      <div id="modelDisplay"></div>
      <div id="progressBar" class="progress-bar"></div>
      <div id="statusMessage"></div>
      <div id="estimatedTime"></div>
    `;
    
    // Clear localStorage before each test
    localStorage.clear();
  });

  describe('Model Display', () => {
    test('should display selected model name when model is in localStorage', () => {
      localStorage.setItem('selectedModel', 'openai');
      initModelTracking();
      expect(document.getElementById('modelDisplay').textContent)
        .toContain('OpenAI GPT-4o');
    });

    test('should display default model when no model is selected', () => {
      initModelTracking();
      expect(document.getElementById('modelDisplay').textContent)
        .toContain('OpenAI GPT-4o');
    });
  });

  describe('Progress Tracking', () => {
    test('should update progress bar with correct model-specific timing estimates', () => {
      localStorage.setItem('selectedModel', 'anthropic');
      initModelTracking();
      
      updateProgress(50); // 50% complete
      const progressBar = document.getElementById('progressBar');
      
      expect(progressBar.style.width).toBe('50%');
      expect(document.getElementById('estimatedTime').textContent)
        .toMatch(/\d+ seconds remaining/);
    });
  });

  describe('Status Messages', () => {
    test('should display model-specific status messages during processing', () => {
      localStorage.setItem('selectedModel', 'openai');
      const message = getStatusMessage('processing', 'openai');
      expect(message).toContain('Processing with OpenAI GPT-4o');
    });

    test('should handle model-specific errors appropriately', () => {
      localStorage.setItem('selectedModel', 'anthropic');
      const message = getStatusMessage('error', 'anthropic');
      expect(message).toContain('Error processing with Anthropic Claude');
    });
  });
}); 