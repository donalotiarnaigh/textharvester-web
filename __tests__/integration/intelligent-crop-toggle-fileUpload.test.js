/**
 * @jest-environment jsdom
 */

// Mock localStorage
const localStorageMock = {
  getItem: jest.fn(),
  setItem: jest.fn(),
  removeItem: jest.fn(),
  clear: jest.fn(),
};

Object.defineProperty(global, 'localStorage', {
  value: localStorageMock,
  writable: true,
});

// Mock dependent modules
jest.mock('../../public/js/modules/index/modelSelection.js', () => ({
  getSelectedModel: jest.fn().mockReturnValue('openai'),
}));

jest.mock('../../public/js/modules/index/modeSelector.js', () => ({
  getCurrentUploadMode: jest.fn().mockReturnValue('record_sheet'),
}));

describe('Intelligent Crop Toggle - File Upload Integration', () => {
  let initIntelligentCropToggle;
  let handleFileUpload;

  beforeAll(async () => {
    const toggleModule = await import('../../public/js/modules/index/intelligentCropToggle.js');
    initIntelligentCropToggle = toggleModule.initIntelligentCropToggle;
    const uploadModule = await import('../../public/js/modules/index/fileUpload.js');
    handleFileUpload = uploadModule.handleFileUpload;
  });

  beforeEach(() => {
    document.body.innerHTML = `
      <div id="intelligent-crop-container"></div>
      <input type="checkbox" id="replaceExisting" />
      <button id="submitFiles"></button>
    `;
    localStorageMock.getItem.mockClear();
  });

  afterEach(() => {
    document.body.innerHTML = '';
  });

  it('should include intelligentCrop field in form data based on toggle', () => {
    localStorageMock.getItem.mockImplementation((key) =>
      key === 'intelligentCrop' ? 'true' : null
    );
    initIntelligentCropToggle();

    const mockFormData = { append: jest.fn() };
    const mockFile = { name: 'test.jpg' };
    const mockXHR = {};

    const dropzoneInstance = {
      on: jest.fn((event, callback) => {
        if (event === 'sending') {
          callback(mockFile, mockXHR, mockFormData);
        }
      }),
    };

    handleFileUpload(dropzoneInstance);

    dropzoneInstance.on.mock.calls
      .find(([e]) => e === 'sending')[1](mockFile, mockXHR, mockFormData);

    expect(mockFormData.append).toHaveBeenCalledWith('intelligentCrop', 'true');
  });
});
