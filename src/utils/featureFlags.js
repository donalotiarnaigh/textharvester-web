const config = require('../../config.json');

/**
 * Check if Monument Photo OCR feature is enabled
 * Priority: Environment variable > config.json
 * @returns {boolean} True if the feature is enabled
 */
function isMonumentOCREnabled() {
  // Environment variable takes precedence
  if (process.env.FEATURE_MONUMENT_OCR_PHASE0 !== undefined) {
    return process.env.FEATURE_MONUMENT_OCR_PHASE0 === 'true';
  }
  
  // Fall back to config.json
  return config.features?.monumentPhotoOCR || false;
}

/**
 * Get the final source type based on feature flag and requested type
 * @param {string} requestedSourceType - The source type requested by the user
 * @returns {string} The final source type to use ('record_sheet' or 'monument_photo')
 */
function getFinalSourceType(requestedSourceType) {
  const validSourceTypes = ['record_sheet', 'monument_photo'];
  const validatedSourceType = validSourceTypes.includes(requestedSourceType) 
    ? requestedSourceType 
    : 'record_sheet';
  
  // Feature flag guard - coerce monument_photo to record_sheet if disabled
  const monumentOCREnabled = isMonumentOCREnabled();
  const finalSourceType = (monumentOCREnabled && validatedSourceType === 'monument_photo') 
    ? 'monument_photo' 
    : 'record_sheet';
    
  return finalSourceType;
}

/**
 * Check if a specific feature is enabled
 * @param {string} featureName - Name of the feature to check
 * @returns {boolean} True if the feature is enabled
 */
function isFeatureEnabled(featureName) {
  switch (featureName) {
    case 'monumentPhotoOCR':
      return isMonumentOCREnabled();
    default:
      return config.features?.[featureName] || false;
  }
}

module.exports = {
  isMonumentOCREnabled,
  getFinalSourceType,
  isFeatureEnabled
};
