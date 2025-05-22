# Testing Issues Log

## Issue #1: Empty Record Sheet Handling
**Status:** Open  
**Date Reported:** 2024-03-22  
**Component:** MemorialOCRPrompt  
**Severity:** High  

### Description
When uploading an empty record sheet, the system fails to handle null values properly, resulting in an unhandled error.

### Error Message
```
[ERROR] Error processing file uploads/page_5_1747903505321.jpg: Error: Cannot read properties of null (reading 'trim')
    at MemorialOCRPrompt.validateAndConvert (/Users/danieltierney/projects/textharvester-web/src/utils/prompts/templates/MemorialOCRPrompt.js:150:15)
    at processFile (/Users/danieltierney/projects/textharvester-web/src/utils/fileProcessing.js:40:42)
    at process.processTicksAndRejections (node:internal/process/task_queues:105:5)
```

### Analysis
The error occurs in the `validateAndConvert` method of `MemorialOCRPrompt` class when attempting to trim a null value. This indicates:
1. No null-checking is being performed before string operations
2. Empty or invalid input is not being properly validated
3. Error handling for invalid input states needs to be improved

### Proposed Solution
1. Add null checks before string operations
2. Implement proper validation for empty/invalid input
3. Add appropriate error messages for invalid states
4. Update tests to cover empty input scenarios

### Related Files
- `src/utils/prompts/templates/MemorialOCRPrompt.js`
- `src/utils/fileProcessing.js`

## Issue #2: Progress Bar Malfunction
**Status:** Open  
**Date Reported:** 2024-03-22  
**Component:** UI/Progress Tracking  
**Severity:** Medium  

### Description
When uploading multiple image files (3 in the test case), the progress bar exhibits incorrect behavior:
1. Starts at 0%
2. Almost immediately jumps to 200%
3. Gets stuck at 200%
4. No automatic redirect to results page occurs
5. Results are processed correctly but require manual navigation to view

### Expected Behavior
1. Progress bar should start at 0%
2. Should increment proportionally based on processing progress
3. Should reach 100% when all files are processed
4. Should automatically redirect to results page upon completion

### Analysis
The issue appears to be related to:
1. Progress calculation logic not properly handling multiple files
2. Progress event handling possibly double-counting events
3. Completion detection not triggering redirect
4. Disconnect between actual processing status and UI representation

### Proposed Solution
1. Review and fix progress calculation logic
2. Ensure progress events are not duplicated
3. Implement proper completion detection
4. Add logging to track progress events
5. Add error handling for progress tracking
6. Update tests to cover multiple file upload scenarios

### Related Files
- `src/components/UploadProgress.js` (or similar UI component)
- `src/utils/fileProcessing.js`
- `src/utils/progressTracking.js` (if exists)

## Issue #3: Missing First Name Validation Error
**Status:** Open  
**Date Reported:** 2024-03-22  
**Component:** MemorialOCRPrompt  
**Severity:** High  

### Description
When processing a PDF with a record containing no first name (e.g., "R.R Talbot Junr"), the system fails with a validation error. The error occurs even though another valid record ("Rev. Peter Butler") exists on the same page.

**Update (2024-03-22):** Different behavior observed with Anthropic provider:
- Anthropic ignores the initials "R.R"
- Takes "Talbot" as first name and "Jun" as last name
- No validation error occurs, but results in incorrect name parsing
- Shows inconsistency in name handling between providers

### Error Message
```
[ERROR] Error processing file uploads/test_17479_1747903798021_page-5.jpg: Error: Invalid name format for first_name
    at MemorialOCRPrompt.validateAndConvert (/Users/danieltierney/projects/textharvester-web/src/utils/prompts/templates/MemorialOCRPrompt.js:150:15)
    at processFile (/Users/danieltierney/projects/textharvester-web/src/utils/fileProcessing.js:40:42)
    at process.processTicksAndRejections (node:internal/process/task_queues:105:5)
```

### Analysis
The issue appears to be related to:
1. Strict validation rules not accommodating missing first names
2. No handling for special cases like initials-only names
3. Validation failing for the entire page when one record is invalid
4. No partial success handling for multiple records on a page
5. Inconsistent name parsing behavior across different providers:
   - Some providers fail validation on initials
   - Others ignore initials and parse remaining text incorrectly
   - No standardized approach to handling special name formats

### Proposed Solution
1. Update name validation rules to handle:
   - Missing first names
   - Initial-only names
   - Titles (e.g., "Rev.", "Jr.", "Junr")
2. Implement partial success handling for multiple records
3. Add more descriptive error messages
4. Add test cases for:
   - Missing first names
   - Initial-only names
   - Multiple records with mixed validity
   - Various title formats
5. Standardize name parsing across providers:
   - Create consistent rules for handling initials
   - Define provider-specific name parsing configurations if needed
   - Add validation to catch incorrect parsing
   - Implement proper handling of suffixes (Jr, Junr, etc.)

### Related Files
- `src/utils/prompts/templates/MemorialOCRPrompt.js`
- `src/utils/fileProcessing.js`
- `src/utils/validation/nameValidation.js` (if exists)

## Issue #4: Progress Bar Over-Counting with Anthropic
**Status:** Open  
**Date Reported:** 2024-03-22  
**Component:** UI/Progress Tracking  
**Severity:** Medium  
**Related:** Issue #2  

### Description
When uploading 3 individual images using the Anthropic provider, the progress bar incorrectly counts up to 300%. This appears to be a variant of Issue #2, but with different behavior specific to the Anthropic provider.

### Analysis
This issue, combined with Issue #2, suggests:
1. Progress tracking is not properly normalized across providers
2. Progress calculation might be:
   - Adding instead of averaging progress
   - Not accounting for provider-specific processing steps
   - Double-counting certain events
3. No upper bound validation on progress percentage
4. Provider-specific progress tracking may need different handling

### Proposed Solution
1. Normalize progress tracking across providers:
   - Implement provider-specific progress calculation if needed
   - Ensure progress is properly bounded (0-100%)
   - Add validation for progress updates
2. Add provider-specific progress tracking configuration
3. Implement progress aggregation logic that:
   - Properly handles multiple files
   - Accounts for provider-specific steps
   - Maintains correct bounds
4. Add logging for progress tracking events to help debug
5. Add tests for:
   - Multiple provider scenarios
   - Multiple file uploads
   - Progress bounds validation
   - Progress aggregation logic

### Related Files
- `src/components/UploadProgress.js` (or similar UI component)
- `src/utils/fileProcessing.js`
- `src/utils/progressTracking.js` (if exists)
- `src/services/anthropicService.js` (if exists) 