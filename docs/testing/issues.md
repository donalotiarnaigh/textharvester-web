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