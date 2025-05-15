# AI Model Selection Feature Specification

## Overview
Allow users to select which AI model they want to use for processing their images directly from the web interface. This gives users more control over the OCR process and allows them to balance between different models' capabilities, processing speeds, and costs.

## Current Implementation
Currently, the AI model selection is handled through environment variables and configuration files, with no user-facing controls. The system supports OpenAI's GPT-4o and Anthropic's Claude 3.7 Sonnet models.

## Proposed Changes

### 1. Frontend Changes

#### Model Selection UI
- Add a dropdown menu in the upload interface
- Location: Above the file upload zone
- Options:
  - OpenAI GPT-4o (Default)
  - Anthropic Claude 3.7 Sonnet

### 2. Backend Changes

#### API Endpoints
Add new endpoint:
```javascript
POST /api/preferences/model
{
  "provider": "openai" | "anthropic",
  "remember": boolean
}
```

Update existing endpoints:
```javascript
POST /upload
{
  "files": File[],
  "provider": "openai" | "anthropic"  // New field
}
```

#### Database Changes
Add new columns to track model usage:
```sql
ALTER TABLE memorials ADD COLUMN ai_provider TEXT;
ALTER TABLE memorials ADD COLUMN model_version TEXT;
```

### 3. Processing Pipeline Updates
- Modify the file processing queue to handle model-specific configurations
- Update progress tracking to include model-specific status messages
- Implement proper error handling for model-specific failures

### 4. Configuration Updates
Update `config.json`:
```json
{
  "aiProviders": {
    "openai": {
      "displayName": "OpenAI GPT-4o",
      "description": "Fast and accurate for most memorial inscriptions",
      "avgProcessingTime": "15-20 seconds"
    },
    "anthropic": {
      "displayName": "Anthropic Claude 3.7 Sonnet",
      "description": "Excellent at handling complex or degraded inscriptions",
      "avgProcessingTime": "20-25 seconds"
    }
  }
}
```

## User Experience

### Upload Flow
1. User arrives at upload page
2. User can change the model via dropdown
3. Selected model is displayed in the upload progress UI
4. Processing status shows model-specific information

### Results View
- Add model information to the results display
- Include model used in CSV/JSON exports

## Technical Implementation Details

### Frontend Implementation
1. HTML Changes (`public/index.html`):
   ```html
   <!-- Add before the dropzone form -->
   <div class="form-group mb-3">
     <label for="modelSelect">Select AI Model</label>
     <select class="form-control" id="modelSelect">
       <option value="openai">OpenAI GPT-4o (Faster)</option>
       <option value="anthropic">Anthropic Claude 3.7 (More Accurate)</option>
     </select>
     <small class="form-text text-muted model-info"></small>
   </div>
   ```

2. JavaScript Modules:
   - New module: `public/js/modules/index/modelSelection.js`:
     - Handle model selection changes
     - Update Dropzone configuration
     - Display model-specific information
   
   - Update `public/js/modules/index/dropzone.js`:
     - Include selected model in upload parameters
     - Update progress messages

3. Processing Page Updates (`public/processing.html`):
   - Add model information to progress display
   - Update status messages with model-specific details

4. Results Page Updates (`public/results.html`):
   - Display used model in results table
   - Include model info in export files

### Backend Services
1. Update `fileProcessing.js`:
   - Add model selection parameter
   - Update progress tracking
   - Enhance error handling

### Error Handling
- Handle model-specific API errors
- Provide clear error messages for:
  - API key issues
  - Model availability
  - Rate limiting
  - Quota exceeded

## Testing Requirements

### Unit Tests
- Model selection functionality
- API integration
- Error handling

### Integration Tests
- End-to-end upload flow with different models
- Error scenarios

### Performance Tests
- Processing time comparisons
- Concurrent processing with different models
- Memory usage under load

## Deployment and Monitoring

### Deployment Steps
1. Database migrations for new columns
2. Frontend updates
3. Backend API changes
4. Configuration updates

### Monitoring
- Track usage by model
- Monitor processing times
- Error rates by model

## Future Considerations
1. Support for additional AI models
2. Support for both models in parallel

## Documentation Requirements
1. Update API documentation
2. Add user guide section
3. Update deployment guide
4. Add troubleshooting section 