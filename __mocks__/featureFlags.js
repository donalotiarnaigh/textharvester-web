// Mock for featureFlags utility
const featureFlags = {
  isMonumentOCREnabled: jest.fn().mockReturnValue(false),
  getFinalSourceType: jest.fn().mockImplementation((sourceType) => sourceType),
  isFeatureEnabled: jest.fn().mockReturnValue(false)
};

module.exports = featureFlags;
