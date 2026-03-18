# Debug Image Processing Features

This document explains the enhanced debug logging and image saving features added to the TextHarvester image preprocessing pipeline.

## Quick Start

Debug features are **enabled by default** and will automatically run during normal image processing:

1. **Process any image** through the normal upload flow
2. **Check debug output** in the logs and `data/temp/debug_images/` folder
3. **Review saved images** to see each processing step

## Disabling Debug Features

To disable debug features, set these environment variables:
```bash
export DEBUG_IMAGE_PROCESSING=false
export SAVE_DEBUG_IMAGES=false
```

## What's New

### 🔍 Enhanced Debug Logging

The image processor now provides detailed step-by-step logging for every processing stage:

- **Image Analysis**: Original metadata, file size, EXIF data
- **Dimension Calculation**: Optimal sizing calculations
- **Processing Pipeline**: EXIF rotation, resizing, compression
- **Fallback Compression**: Aggressive and ultra-aggressive compression levels
- **Final Results**: Compression ratios, size reductions, success metrics

### 📸 Debug Image Saving

Images are saved at each processing stage for manual review:

- `00_original`: Before any processing
- `01_processed`: After initial optimization
- `02_aggressive`: After aggressive compression (if needed)
- `03_ultra_aggressive`: After ultra-aggressive compression (if needed)

### 📊 Detailed Metrics

Each processing step includes comprehensive metrics:

- File sizes (original, processed, base64)
- Dimensions and aspect ratios
- Compression ratios and size reductions
- Provider limit comparisons
- Processing time and success indicators

## Environment Variables

| Variable | Description | Default |
|----------|-------------|---------|
| `DEBUG_IMAGE_PROCESSING` | Enable detailed debug logging | `true` (enabled by default) |
| `SAVE_DEBUG_IMAGES` | Save debug images to temp folder | `true` (enabled by default) |
| `NODE_ENV` | Development mode | `production` |

## Usage Examples

### Normal Processing (Debug Enabled by Default)
```bash
# Start the application - debug features automatically enabled
npm start

# Upload images through the web interface
# Debug output will appear in logs and debug images will be saved
```

### Disabling Debug Features
```bash
# Disable debug logging
DEBUG_IMAGE_PROCESSING=false npm start

# Disable debug image saving
SAVE_DEBUG_IMAGES=false npm start

# Disable both debug features
DEBUG_IMAGE_PROCESSING=false SAVE_DEBUG_IMAGES=false npm start
```

### Programmatic Usage
```javascript
const { optimizeImageForProvider } = require('./src/utils/imageProcessor');

// Debug logging will show detailed processing steps
const base64Image = await optimizeImageForProvider('./image.jpg', 'anthropic');
```

## Debug Output Structure

### Log Format
```
[ImageProcessor] ===== STEP_NAME =====
[ImageProcessor] key1: value1
[ImageProcessor] key2: value2
[ImageProcessor] ===== END STEP_NAME =====
```

### Image Naming Convention
```
{original_filename}_{stage}_{timestamp}.jpg
```

Example:
```
monument_001_00_original_2024-01-15_14-30-25-123.jpg
monument_001_01_processed_2024-01-15_14-30-25-456.jpg
```

## Debug Folder Structure

```
data/temp/debug_images/
├── monument_001_00_original_2024-01-15_14-30-25-123.jpg
├── monument_001_01_processed_2024-01-15_14-30-25-456.jpg
├── monument_001_02_aggressive_2024-01-15_14-30-25-789.jpg
└── monument_001_03_ultra_aggressive_2024-01-15_14-30-25-012.jpg
```

## Performance Considerations

- **Debug logging**: Minimal performance impact
- **Debug image saving**: Moderate impact due to file I/O
- **Recommendation**: Use only during development and testing

## Troubleshooting

### Debug images not saving
1. Check `SAVE_DEBUG_IMAGES=true` is set
2. Verify write permissions to `data/temp/debug_images/`
3. Ensure sufficient disk space

### Debug logging not appearing
1. Confirm `DEBUG_IMAGE_PROCESSING=true` is set
2. Check logger configuration
3. Verify environment variables are loaded

### Large debug folder
- Debug images are not automatically cleaned up
- Manually delete old debug images periodically
- Consider adding cleanup scripts for production

## Integration with Existing Code

The debug features are fully backward compatible:

- No changes required to existing code
- Debug features are opt-in via environment variables
- All existing functionality remains unchanged
- Debug features can be enabled/disabled at runtime

## Next Steps

1. **Test the features** with your own images
2. **Review the debug output** to understand processing decisions
3. **Compare debug images** to see the effect of each processing step
4. **Adjust processing parameters** based on your findings
5. **Disable debug features** for production use

For more detailed information, see `docs/debug-image-processing.md`.
