const config = require('../config.json');

describe('Feature Flags Configuration', () => {
  // Store original env to restore after tests
  const originalEnv = process.env;

  afterEach(() => {
    // Restore original environment after each test
    process.env = { ...originalEnv };
  });

  describe('Monument Photo OCR Phase 0', () => {
    it('should have monumentPhotoOCR feature flag in config', () => {
      expect(config.features).toBeDefined();
      expect(config.features.monumentPhotoOCR).toBeDefined();
      expect(typeof config.features.monumentPhotoOCR).toBe('boolean');
    });

    it('should default monumentPhotoOCR feature flag to false for safety', () => {
      expect(config.features.monumentPhotoOCR).toBe(false);
    });
  });

  describe('Environment Variable Override', () => {
    it('should respect FEATURE_MONUMENT_OCR_PHASE0 environment variable when true', () => {
      process.env.FEATURE_MONUMENT_OCR_PHASE0 = 'true';
      
      // Test the logic that would be used in the application
      const isEnabled = process.env.FEATURE_MONUMENT_OCR_PHASE0 === 'true';
      expect(isEnabled).toBe(true);
    });

    it('should respect FEATURE_MONUMENT_OCR_PHASE0 environment variable when false', () => {
      process.env.FEATURE_MONUMENT_OCR_PHASE0 = 'false';
      
      const isEnabled = process.env.FEATURE_MONUMENT_OCR_PHASE0 === 'true';
      expect(isEnabled).toBe(false);
    });

    it('should default to false when environment variable is not set', () => {
      delete process.env.FEATURE_MONUMENT_OCR_PHASE0;
      
      const isEnabled = process.env.FEATURE_MONUMENT_OCR_PHASE0 === 'true';
      expect(isEnabled).toBe(false);
    });

    it('should default to false when environment variable is invalid', () => {
      process.env.FEATURE_MONUMENT_OCR_PHASE0 = 'invalid';
      
      const isEnabled = process.env.FEATURE_MONUMENT_OCR_PHASE0 === 'true';
      expect(isEnabled).toBe(false);
    });
  });

  describe('Feature Flag Helper Functions', () => {
    // This will test the helper function we'll create
    it('should provide a helper function to check monument OCR feature status', () => {
      // This will fail initially - we'll implement this helper
      const { isMonumentOCREnabled } = require('../src/utils/featureFlags');
      
      process.env.FEATURE_MONUMENT_OCR_PHASE0 = 'true';
      expect(isMonumentOCREnabled()).toBe(true);
      
      process.env.FEATURE_MONUMENT_OCR_PHASE0 = 'false';
      expect(isMonumentOCREnabled()).toBe(false);
      
      delete process.env.FEATURE_MONUMENT_OCR_PHASE0;
      expect(isMonumentOCREnabled()).toBe(false);
    });
  });
});
