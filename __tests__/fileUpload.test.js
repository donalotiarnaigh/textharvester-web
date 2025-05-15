/**
 * @jest-environment jsdom
 */

import { jest } from '@jest/globals';
import { handleFileUpload } from '../public/js/modules/index/fileUpload.js';
import { getSelectedModel } from '../public/js/modules/index/modelSelection.js';

jest.mock('../public/js/modules/index/modelSelection.js', () => ({
  getSelectedModel: jest.fn().mockReturnValue('openai')
}));

describe('File Upload Module', () => {
  let mockDropzoneInstance;

  beforeEach(() => {
    // Setup DOM
    document.body.innerHTML = `
      <div class="container">
        <input type="checkbox" id="replaceExisting">
        <div id="modelSelect"></div>
      </div>
    `;

    // Mock dropzone instance
    mockDropzoneInstance = {
      on: jest.fn(),
      processQueue: jest.fn()
    };
  });

  afterEach(() => {
    document.body.innerHTML = '';
    jest.clearAllMocks();
  });

  describe('handleFileUpload', () => {
    it('should set up event listeners on dropzone instance', () => {
      handleFileUpload(mockDropzoneInstance);
      
      expect(mockDropzoneInstance.on).toHaveBeenCalledWith('addedfile', expect.any(Function));
      expect(mockDropzoneInstance.on).toHaveBeenCalledWith('complete', expect.any(Function));
      expect(mockDropzoneInstance.on).toHaveBeenCalledWith('queuecomplete', expect.any(Function));
      expect(mockDropzoneInstance.on).toHaveBeenCalledWith('error', expect.any(Function));
      expect(mockDropzoneInstance.on).toHaveBeenCalledWith('sending', expect.any(Function));
    });

    it('should append correct form data on sending', () => {
      // Mock FormData
      const mockFormData = {
        append: jest.fn()
      };

      // Setup the sending event handler
      handleFileUpload(mockDropzoneInstance);
      const sendingHandler = mockDropzoneInstance.on.mock.calls.find(call => call[0] === 'sending')[1];

      // Trigger the sending event
      sendingHandler({}, {}, mockFormData);

      expect(mockFormData.append).toHaveBeenCalledWith('replaceExisting', 'false');
      expect(mockFormData.append).toHaveBeenCalledWith('aiProvider', 'openai');
      expect(getSelectedModel).toHaveBeenCalled();
    });

    it('should redirect to processing page on queue complete', () => {
      // Mock window.location
      const originalLocation = window.location;
      delete window.location;
      window.location = { href: '' };

      handleFileUpload(mockDropzoneInstance);
      
      // Find and trigger the queuecomplete handler
      const queueCompleteHandler = mockDropzoneInstance.on.mock.calls.find(call => call[0] === 'queuecomplete')[1];
      queueCompleteHandler();

      expect(window.location.href).toBe('/processing.html');

      // Restore window.location
      window.location = originalLocation;
    });
  });
}); 