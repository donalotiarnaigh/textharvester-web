const { getFinalSourceType, isMonumentOCREnabled } = require('../src/utils/featureFlags');

describe('Feature Flag Integration', () => {
  // Store original env to restore after tests
  const originalEnv = process.env;

  afterEach(() => {
    // Restore original environment after each test
    process.env = { ...originalEnv };
  });

  describe('getFinalSourceType', () => {
    describe('when monument OCR is enabled', () => {
      beforeEach(() => {
        process.env.FEATURE_MONUMENT_OCR_PHASE0 = 'true';
      });

      it('should allow monument_photo source type', () => {
        const result = getFinalSourceType('monument_photo');
        expect(result).toBe('monument_photo');
      });

      it('should allow record_sheet source type', () => {
        const result = getFinalSourceType('record_sheet');
        expect(result).toBe('record_sheet');
      });

      it('should default invalid source types to record_sheet', () => {
        const result = getFinalSourceType('invalid_type');
        expect(result).toBe('record_sheet');
      });
    });

    describe('when monument OCR is disabled', () => {
      beforeEach(() => {
        process.env.FEATURE_MONUMENT_OCR_PHASE0 = 'false';
      });

      it('should coerce monument_photo to record_sheet', () => {
        const result = getFinalSourceType('monument_photo');
        expect(result).toBe('record_sheet');
      });

      it('should allow record_sheet source type', () => {
        const result = getFinalSourceType('record_sheet');
        expect(result).toBe('record_sheet');
      });

      it('should default invalid source types to record_sheet', () => {
        const result = getFinalSourceType('invalid_type');
        expect(result).toBe('record_sheet');
      });
    });

    describe('when environment variable is not set', () => {
      beforeEach(() => {
        delete process.env.FEATURE_MONUMENT_OCR_PHASE0;
      });

      it('should coerce monument_photo to record_sheet (default disabled)', () => {
        const result = getFinalSourceType('monument_photo');
        expect(result).toBe('record_sheet');
      });
    });
  });

  describe('Upload Handler Integration', () => {
    // We'll test the actual integration with upload handler logic
    it('should provide the logic needed for upload handler feature flag guard', () => {
      const sourceType = 'monument_photo';
      const validSourceTypes = ['record_sheet', 'monument_photo'];
      const validatedSourceType = validSourceTypes.includes(sourceType) ? sourceType : 'record_sheet';
      
      // Test with feature enabled
      process.env.FEATURE_MONUMENT_OCR_PHASE0 = 'true';
      const monumentOCREnabled = isMonumentOCREnabled();
      const finalSourceType = (monumentOCREnabled && validatedSourceType === 'monument_photo') 
        ? 'monument_photo' 
        : 'record_sheet';
      
      expect(finalSourceType).toBe('monument_photo');
      
      // Test with feature disabled
      process.env.FEATURE_MONUMENT_OCR_PHASE0 = 'false';
      const monumentOCRDisabled = isMonumentOCREnabled();
      const finalSourceTypeDisabled = (monumentOCRDisabled && validatedSourceType === 'monument_photo') 
        ? 'monument_photo' 
        : 'record_sheet';
      
      expect(finalSourceTypeDisabled).toBe('record_sheet');
    });
  });
});
