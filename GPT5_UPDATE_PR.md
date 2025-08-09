# Pull Request: Update OpenAI Integration to GPT-5

## Summary
This PR updates the Text Harvester application to use OpenAI's latest GPT-5 model (gpt-5-2025-08-07) for enhanced vision capabilities and improved OCR performance.

## Changes Made

### Configuration Updates
- **config.json**: Updated default OpenAI model from `gpt-4o` to `gpt-5-2025-08-07`
- **openaiProvider.js**: Updated default model fallback to `gpt-5-2025-08-07`

### Code Changes
1. **Model Provider Updates**
   - Modified `src/utils/modelProviders/openaiProvider.js` to use GPT-5 as the default model
   - Updated model validation to recognize GPT-5 models as vision-capable by default
   
2. **Documentation Updates**
   - Updated README.md to highlight GPT-5 support with enhanced vision capabilities
   - Listed GPT-5 as the primary OpenAI model with GPT-4o as legacy support

### Test Updates
All test files have been updated to reflect the new GPT-5 model:
- `src/utils/modelProviders/__tests__/openaiProvider.test.js`
- `__tests__/processFile.test.js`
- `__tests__/database/storeMemorial.test.js`
- `__tests__/downloadFunctionality.test.js`
- `__tests__/utils/dataConversion.test.js`
- `__tests__/dataConversion.test.js`
- `__tests__/ui/resultsTable.test.js`
- `__tests__/ui/modelInfoPanel.test.js`
- `src/utils/database/schema.js` (example data)
- `src/utils/database/__tests__/schema.test.js`
- `scripts/test-provider-prompts.js`
- `src/utils/prompts/providers/__tests__/provider-integration.test.js`

## Testing
All tests pass successfully with the new GPT-5 model configuration:
- ✅ 551 tests passed
- ✅ 69 test suites passed
- ✅ No failing tests

## Benefits
1. **Enhanced Vision Capabilities**: GPT-5 provides improved image understanding and OCR accuracy
2. **Better Performance**: Latest model offers faster processing and more accurate text extraction
3. **Future-Proof**: Positions the application to use OpenAI's latest technology

## Backward Compatibility
- The application maintains support for GPT-4o as a legacy option
- Users can still configure the model via environment variables or config files
- No breaking changes to the API or user interface

## Deployment Notes
- Ensure the OpenAI API key has access to the GPT-5 model
- Monitor API usage as GPT-5 may have different pricing than GPT-4o
- Consider updating any documentation or user guides to mention the new model

## Next Steps
1. Review and approve the PR
2. Test in staging environment with real memorial images
3. Monitor performance and accuracy improvements
4. Update user documentation if needed