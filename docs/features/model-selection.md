# Model Selection Feature

## Overview
The Text Harvester supports multiple AI providers for OCR processing, allowing users to choose between different models based on their specific needs.

## Supported Models

### **OpenAI GPT-4o** (Recommended)
- **Best for**: Monument photos, weathered text, challenging images
- **Strengths**: Excellent OCR accuracy on weathered stone monuments
- **File Size Limit**: 20MB
- **Max Dimensions**: 3072px

### **Anthropic Claude 4 Sonnet**
- **Best for**: Clear images, high-quality documents
- **Strengths**: Good for well-lit, clear text
- **File Size Limit**: 5MB (with automatic optimization)
- **Max Dimensions**: 4096px

## How It Works

1. **Model Selection**: Users choose their preferred AI model on the upload page
2. **Automatic Optimization**: Images are automatically optimized based on provider limits
3. **Processing**: Selected model processes the image using provider-specific prompts
4. **Results**: Results include model information for tracking and analysis

## User Interface

- **Upload Page**: Model selection dropdown with recommendations
- **Processing Page**: Model-specific status messages and progress tracking
- **Results Page**: Model information displayed in results table and detail views
- **Exports**: Model data included in CSV/JSON exports

## Technical Implementation

- **Database**: Model information stored in `memorials` table
- **Processing**: Provider abstraction layer handles different AI services
- **Image Processing**: Automatic optimization based on provider requirements
- **Error Handling**: Robust error handling and fallback mechanisms

## Best Practices

- **Monument Photos**: Use GPT-4o for best results with weathered text
- **Clear Documents**: Either model works well for high-quality images
- **Large Files**: System automatically optimizes for provider limits
- **Batch Processing**: Same model used for all files in a batch

---

*This feature is fully implemented and production-ready.*
