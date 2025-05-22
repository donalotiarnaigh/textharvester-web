# Testing Issues Log

## Issue #1: Empty Record Sheet Handling
**Status:** Resolved  
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
The error occurs in the `validateAndConvert` method of `MemorialOCRPrompt` class when attempting to trim a null value. Upon code review, the issue was found on line 150 where `field.transform(value)` is called without checking if the value is null. The transform function for text fields attempts to call `.trim()` on the null value, causing the error.

Specifically:
1. In `src/utils/prompts/templates/MemorialOCRPrompt.js`, the `validateAndConvert` method handles null checks for the 'year_of_death' field case but not for other fields
2. In `src/utils/prompts/types/memorialFields.js`, the transform functions for string fields (e.g., `value.trim()`) assume non-null values
3. The error happens when processing data from an empty record sheet where the AI model returns null values for required fields
4. There's no early validation to reject completely empty sheets before attempting to transform the data

### Solution Implemented
1. Added `ProcessingError` class extending standard Error with type information
2. Implemented helper functions `isEmptySheetError` and `isValidationError`
3. Enhanced `MemorialOCRPrompt` to use these typed errors with descriptive messages
4. Modified `fileProcessing.js` to handle empty sheet errors gracefully by returning error objects
5. Updated `fileQueue.js` to store both successful and error results, continuing processing when empty sheets are encountered
6. Added UI components to display error messages to users

## Issue #2: Progress Bar Malfunction
**Status:** Partially Resolved  
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

### Partial Resolution
Progress tracking has been improved but not fully fixed. Implementation of error handling has resolved some aspects of this issue, but the progress calculation still doesn't increment proportionally with multiple files.

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
**Status:** Partially Resolved  
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

### Partial Resolution
Progress tracking has been improved but not fully fixed. Implementation of error handling has resolved some aspects of this issue, but the progress calculation still doesn't handle multiple files correctly with Anthropic.

## Issue #5: Premature Redirect and Incomplete Results Display
**Status:** Open  
**Date Reported:** 2025-05-22  
**Component:** Progress Tracking and Results Display  
**Severity:** Medium  
**Related:** Issues #2 and #4

### Description
When uploading multiple images (including a mix of valid and empty sheets), the system:
1. Correctly identifies empty sheets and tracks them as errors
2. Prematurely redirects to the results page after processing only some files
3. Shows incomplete results on initial page load
4. Only displays all processed results after manually refreshing the results page

### Reproduction Steps
1. Select 3 images for upload (1 empty sheet, 2 valid sheets)
2. Submit for processing
3. Observe progress bar reaches 100% after processing only some files
4. System redirects to results page showing only one result
5. Refreshing the page shows both valid results and the error for the empty sheet

### Expected Behavior
1. Progress bar should increment proportionally:
   - 33% after processing first file
   - 66% after processing second file
   - 100% after processing all three files
2. Redirect should only occur after all files are completely processed
3. Results page should show all processed results on initial load without requiring refresh

### Analysis
The issue stems from:
1. Incorrect synchronization between file processing and progress tracking
2. Race condition where the redirect occurs before all processing completes
3. Possible caching issue with the results endpoint
4. Progress complete flag being set too early
5. Inconsistent state between the backend processing status and frontend progress tracking

### Proposed Solution
1. Modify the progress tracking to:
   - Accurately reflect the number of files processed vs. total files
   - Only mark as complete when all files (including error cases) are fully processed
2. Delay the redirect until confirmed that all files are processed
3. Ensure the results endpoint returns the most current data
4. Add additional synchronization between file processing and progress reporting
5. Implement a confirmation step before redirecting to ensure all processing has completed
6. Add logging to track the exact sequence of processing events and results retrieval

### Related Files
- `src/utils/fileQueue.js` - Manages file processing queue and completion status
- `src/controllers/resultsManager.js` - Handles results retrieval and reporting
- `public/js/modules/processing/api.js` - Manages frontend progress checking and redirection
- `public/js/modules/results/main.js` - Handles results page loading 