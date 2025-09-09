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

// Store original localStorage
const originalLocalStorage = global.localStorage;

// Mock localStorage globally
Object.defineProperty(global, 'localStorage', {
  value: localStorageMock,
  writable: true,
});

describe('Intelligent Crop Toggle UI', () => {
  let initIntelligentCropToggle;

  beforeAll(async () => {
    const module = await import('../../public/js/modules/index/intelligentCropToggle.js');
    initIntelligentCropToggle = module.initIntelligentCropToggle;
  });

  afterAll(() => {
    global.localStorage = originalLocalStorage;
  });

  beforeEach(() => {
    document.body.innerHTML = '';
    const container = document.createElement('div');
    container.id = 'intelligent-crop-container';
    document.body.appendChild(container);
    localStorageMock.getItem.mockClear();
    localStorageMock.setItem.mockClear();
  });

  afterEach(() => {
    document.body.innerHTML = '';
  });

  describe('Initialization', () => {
    it('should render checkbox with default unchecked', () => {
      localStorageMock.getItem.mockReturnValue(null);
      initIntelligentCropToggle();
      const checkbox = document.getElementById('intelligentCrop');
      expect(checkbox).not.toBeNull();
      expect(checkbox.type).toBe('checkbox');
      expect(checkbox.checked).toBe(false);
    });

    it('should load saved state from localStorage', () => {
      localStorageMock.getItem.mockReturnValue('true');
      initIntelligentCropToggle();
      const checkbox = document.getElementById('intelligentCrop');
      expect(checkbox.checked).toBe(true);
      expect(localStorageMock.getItem).toHaveBeenCalledWith('intelligentCrop');
    });
  });

  describe('Event Handling', () => {
    it('should save state to localStorage when changed', () => {
      localStorageMock.getItem.mockReturnValue(null);
      initIntelligentCropToggle();
      const checkbox = document.getElementById('intelligentCrop');
      checkbox.checked = true;
      checkbox.dispatchEvent(new Event('change', { bubbles: true }));
      expect(localStorageMock.setItem).toHaveBeenCalledWith('intelligentCrop', 'true');
    });
  });
});
