/**
 * @jest-environment jsdom
 */

import { jest } from '@jest/globals';
import { initModelSelection, getSelectedModel } from '../public/js/modules/index/modelSelection.js';

describe('Model Selection Module', () => {
  // Setup and teardown
  beforeEach(() => {
    // Create a fresh DOM for each test
    document.body.innerHTML = `
      <div class="container">
        <div class="form-check"></div>
      </div>
    `;
  });

  afterEach(() => {
    document.body.innerHTML = '';
    jest.resetModules();
  });

  describe('initModelSelection', () => {
    it('should insert model selection HTML before form-check', () => {
      initModelSelection();
      
      const modelSelect = document.getElementById('modelSelect');
      expect(modelSelect).toBeTruthy();
      expect(modelSelect.options.length).toBe(2);
      expect(modelSelect.options[0].value).toBe('openai');
      expect(modelSelect.options[1].value).toBe('anthropic');
    });

    it('should initialize with OpenAI as default model', () => {
      initModelSelection();
      
      const modelSelect = document.getElementById('modelSelect');
      expect(modelSelect.value).toBe('openai');
      
      const modelInfo = document.querySelector('.model-info');
      expect(modelInfo.textContent).toContain('Fast and accurate');
    });

    it('should update model info when selection changes', () => {
      initModelSelection();
      
      const modelSelect = document.getElementById('modelSelect');
      const modelInfo = document.querySelector('.model-info');
      
      // Simulate changing to Anthropic
      modelSelect.value = 'anthropic';
      modelSelect.dispatchEvent(new Event('change'));
      
      expect(modelInfo.textContent).toContain('complex or degraded inscriptions');
    });
  });

  describe('getSelectedModel', () => {
    it('should return the currently selected model', () => {
      initModelSelection();
      
      const modelSelect = document.getElementById('modelSelect');
      expect(getSelectedModel()).toBe('openai'); // Default
      
      modelSelect.value = 'anthropic';
      expect(getSelectedModel()).toBe('anthropic');
    });

    it('should return openai as fallback if select element not found', () => {
      expect(getSelectedModel()).toBe('openai');
    });
  });
}); 