# Monument Photo OCR - Phase 1 Technical Design

## Intelligent Cropping for Batch Processing

### Overview
Phase 1 focuses on **intelligent monument shape detection and cropping** to solve file size limitations and improve OCR accuracy for batch-processed monument photos. This addresses the critical issue identified in Phase 0 UAT where high-quality images with extensive background detail exceeded API provider limits.

---

## 1. Problem Statement

### Current Issues (Phase 0)
- **File Size Limits**: High-quality monument photos exceed API provider limits (5MB for Claude, 20MB for OpenAI)
- **Background Noise**: Extensive background detail reduces OCR accuracy
- **Processing Inefficiency**: Large images slow down batch processing
- **API Costs**: Larger images consume more tokens and cost more

### Root Cause Analysis
- Users submit high-resolution monument photos with significant background detail
- Current resizing approach reduces quality but doesn't focus on relevant content
- Monument text is barely detectable, making text-based cropping unreliable
- Batch processing requires fully automated solutions (no user interaction)

---

## 2. Solution Overview

### Core Strategy: Monument Shape Detection
Instead of text detection (unreliable for weathered monuments), focus on **geometric monument characteristics**:
- Rectangular stone blocks with clear edges
- Uniform stone texture vs natural background
- Consistent proportions and orientation
- Distinct boundaries from surrounding landscape

### Expected Outcomes
- **60%+ reduction** in average image size
- **95%+ of images** under API provider limits
- **25%+ improvement** in OCR accuracy
- **30%+ faster** batch processing

---

## 3. Technical Architecture

### 3.1 System Components

```
src/utils/imageProcessing/
├── monumentShapeDetector.js      # Core shape detection logic
├── edgeDetection.js             # OpenCV edge detection
├── rectangleDetector.js         # Rectangle shape detection
├── contourAnalyzer.js           # Contour-based detection
├── textureAnalyzer.js           # Texture uniformity analysis
└── cropOptimizer.js             # Crop area optimization
```

### 3.2 Processing Pipeline

```
Phase 0: Image → Resize → Base64 → AI Provider → JSON
Phase 1: Image → Shape Detection → Crop → Optimize → Base64 → AI Provider → JSON
```

### 3.3 Detection Methods (Priority Order)

#### Method 1: Edge Detection + Rectangle Detection
- **Reliability**: High (monuments have clear edges)
- **Performance**: Fast
- **Accuracy**: 70-80% for typical monuments

#### Method 2: Contour Analysis
- **Reliability**: Medium-High (backup method)
- **Performance**: Medium
- **Accuracy**: 60-70% for irregular monuments

#### Method 3: Texture/Color Analysis
- **Reliability**: Medium (validation only)
- **Performance**: Slow
- **Accuracy**: 50-60% (used for validation)

---

## 4. Detailed Implementation

### 4.1 Core Shape Detection Engine

```javascript
// src/utils/imageProcessing/monumentShapeDetector.js
class MonumentShapeDetector {
  constructor() {
    this.minWidth = 200;           // Minimum monument width (pixels)
    this.minHeight = 300;          // Minimum monument height (pixels)
    this.minArea = 60000;          // Minimum monument area (pixels²)
    this.aspectRatioMin = 0.3;     // Minimum aspect ratio (width/height)
    this.aspectRatioMax = 2.0;     // Maximum aspect ratio (width/height)
    this.compactnessThreshold = 20; // Maximum compactness score
  }

  async detectMonument(imageBuffer) {
    try {
      // Method 1: Edge detection + rectangle detection
      const rectangleCrop = await this.detectByRectangles(imageBuffer);
      if (rectangleCrop && this.validateCrop(rectangleCrop)) {
        return rectangleCrop;
      }

      // Method 2: Contour analysis
      const contourCrop = await this.detectByContours(imageBuffer);
      if (contourCrop && this.validateCrop(contourCrop)) {
        return contourCrop;
      }

      // Method 3: Fallback - return null (use original image)
      return null;

    } catch (error) {
      console.error('Monument detection failed:', error);
      return null;
    }
  }

  async detectByRectangles(imageBuffer) {
    // Step 1: Edge detection using Canny algorithm
    const edges = await this.detectEdges(imageBuffer);
    
    // Step 2: Find rectangular shapes using Hough transform
    const rectangles = await this.findRectangles(edges);
    
    // Step 3: Filter for monument characteristics
    const monumentCandidates = rectangles.filter(rect => 
      this.isMonumentLike(rect)
    );
    
    // Step 4: Select best candidate (largest, most centered)
    return this.selectBestCandidate(monumentCandidates);
  }

  async detectByContours(imageBuffer) {
    // Step 1: Find all contours in the image
    const contours = await this.findContours(imageBuffer);
    
    // Step 2: Filter for monument-like contours
    const monumentContours = contours.filter(contour => 
      this.isMonumentContour(contour)
    );
    
    // Step 3: Select best contour
    return this.selectBestContour(monumentContours);
  }

  isMonumentLike(rectangle) {
    return rectangle.width >= this.minWidth &&
           rectangle.height >= this.minHeight &&
           rectangle.area >= this.minArea &&
           rectangle.aspectRatio >= this.aspectRatioMin &&
           rectangle.aspectRatio <= this.aspectRatioMax;
  }

  isMonumentContour(contour) {
    const area = contour.area;
    const aspectRatio = contour.boundingRect.width / contour.boundingRect.height;
    const compactness = (contour.perimeter * contour.perimeter) / area;

    return area >= this.minArea &&
           aspectRatio >= this.aspectRatioMin &&
           aspectRatio <= this.aspectRatioMax &&
           compactness <= this.compactnessThreshold;
  }

  async validateCrop(cropArea) {
    if (!cropArea) return false;
    
    // Basic validation
    if (cropArea.width < this.minWidth || cropArea.height < this.minHeight) {
      return false;
    }
    
    // Texture validation (optional)
    const textureScore = await this.analyzeTexture(cropArea);
    return textureScore > 0.5; // Threshold for stone-like texture
  }
}
```

### 4.2 Edge Detection Implementation

```javascript
// src/utils/imageProcessing/edgeDetection.js
class EdgeDetector {
  async detectEdges(imageBuffer) {
    // Convert to OpenCV Mat
    const mat = await this.bufferToMat(imageBuffer);
    
    // Convert to grayscale
    const gray = await this.toGrayscale(mat);
    
    // Apply Gaussian blur to reduce noise
    const blurred = await this.gaussianBlur(gray, 5);
    
    // Apply Canny edge detection
    const edges = await this.cannyEdgeDetection(blurred, 50, 150);
    
    return edges;
  }

  async findRectangles(edges) {
    // Find contours
    const contours = await this.findContours(edges);
    
    // Approximate contours to polygons
    const rectangles = [];
    for (const contour of contours) {
      const approx = await this.approximatePolygon(contour, 0.02);
      
      // Check if it's a rectangle (4 vertices)
      if (approx.length === 4) {
        const rect = this.contourToRectangle(approx);
        if (this.isValidRectangle(rect)) {
          rectangles.push(rect);
        }
      }
    }
    
    return rectangles;
  }
}
```

### 4.3 Integration with Processing Pipeline

```javascript
// src/utils/fileProcessing.js (enhanced)
const processFile = async (filePath, options = {}) => {
  const providerName = options.provider || process.env.AI_PROVIDER || 'openai';
  const sourceType = options.source_type || 'record_sheet';
  
  // ... existing code ...
  
  if (sourceType === 'monument_photo') {
    // NEW: Monument shape detection and cropping
    const shapeDetector = new MonumentShapeDetector();
    const cropArea = await shapeDetector.detectMonument(imageBuffer);
    
    let processedImage;
    let cropApplied = false;
    
    if (cropArea) {
      // Apply intelligent crop
      processedImage = await applyCrop(imageBuffer, cropArea);
      cropApplied = true;
      logger.info(`Monument cropped: ${cropArea.width}x${cropArea.height} at (${cropArea.x}, ${cropArea.y})`);
    } else {
      // Fallback: Use original image with resize
      processedImage = await resizeImage(imageBuffer);
      logger.warn('Monument detection failed, using original image with resize');
    }
    
    // Optimize for API limits
    const optimizedImage = await optimizeImageForProvider(processedImage, provider);
    
    // Process with AI
    const result = await provider.processImage(optimizedImage, prompt);
    
    // Add cropping metadata to result
    return {
      ...result,
      cropApplied,
      cropArea: cropArea || null,
      originalSize: imageBuffer.length,
      processedSize: optimizedImage.length
    };
  }
  
  // ... existing record sheet processing ...
};

async function applyCrop(imageBuffer, cropArea) {
  return sharp(imageBuffer)
    .extract({
      left: cropArea.x,
      top: cropArea.y,
      width: cropArea.width,
      height: cropArea.height
    })
    .jpeg({ quality: 90 }); // Higher quality since image is smaller
}
```

---

## 5. Implementation Plan

### 5.1 Week 1-2: Core Shape Detection
**Deliverables:**
- Implement `MonumentShapeDetector` class
- Add edge detection using OpenCV.js
- Create rectangle detection algorithm
- Add basic monument shape filtering

**Success Criteria:**
- 70%+ of test monuments detected correctly
- Integration with existing processing pipeline
- Basic validation and fallback mechanisms

### 5.2 Week 3: Contour Analysis Enhancement
**Deliverables:**
- Implement contour-based detection
- Add texture analysis for validation
- Combine multiple detection methods
- Improve candidate selection logic

**Success Criteria:**
- 85%+ of monuments detected correctly
- Robust fallback between detection methods
- Confidence scoring for crop quality

### 5.3 Week 4: Optimization & Testing
**Deliverables:**
- Performance optimization for batch processing
- Comprehensive testing with real monument photos
- Fine-tune detection parameters
- Add monitoring and logging

**Success Criteria:**
- 90%+ detection accuracy on test dataset
- <2 seconds processing time per image
- Production-ready error handling

---

## 6. Testing Strategy

### 6.1 Unit Tests
```javascript
// __tests__/imageProcessing/monumentShapeDetector.test.js
describe('MonumentShapeDetector', () => {
  test('should detect rectangular monuments', async () => {
    const detector = new MonumentShapeDetector();
    const cropArea = await detector.detectByRectangles(testImageBuffer);
    expect(cropArea).toBeDefined();
    expect(cropArea.width).toBeGreaterThan(200);
    expect(cropArea.height).toBeGreaterThan(300);
  });

  test('should validate crop quality', async () => {
    const detector = new MonumentShapeDetector();
    const validCrop = { width: 400, height: 600, x: 100, y: 50 };
    const isValid = await detector.validateCrop(validCrop);
    expect(isValid).toBe(true);
  });

  test('should handle detection failures gracefully', async () => {
    const detector = new MonumentShapeDetector();
    const cropArea = await detector.detectMonument(invalidImageBuffer);
    expect(cropArea).toBeNull();
  });
});
```

### 6.2 Integration Tests
```javascript
// __tests__/integration/monumentCropping.test.js
describe('Monument Cropping Integration', () => {
  test('should process monument photo with cropping', async () => {
    const result = await processFile('test-monument.jpg', { 
      source_type: 'monument_photo' 
    });
    
    expect(result.cropApplied).toBe(true);
    expect(result.cropArea).toBeDefined();
    expect(result.processedSize).toBeLessThan(result.originalSize);
  });

  test('should fallback to original image when detection fails', async () => {
    const result = await processFile('test-no-monument.jpg', { 
      source_type: 'monument_photo' 
    });
    
    expect(result.cropApplied).toBe(false);
    expect(result.cropArea).toBeNull();
  });
});
```

### 6.3 Performance Tests
```javascript
// __tests__/performance/monumentCropping.test.js
describe('Monument Cropping Performance', () => {
  test('should process images within time limits', async () => {
    const startTime = Date.now();
    await processFile('test-monument.jpg', { source_type: 'monument_photo' });
    const processingTime = Date.now() - startTime;
    
    expect(processingTime).toBeLessThan(2000); // 2 seconds max
  });

  test('should handle batch processing efficiently', async () => {
    const files = Array(10).fill('test-monument.jpg');
    const startTime = Date.now();
    
    const results = await Promise.all(
      files.map(file => processFile(file, { source_type: 'monument_photo' }))
    );
    
    const totalTime = Date.now() - startTime;
    expect(totalTime).toBeLessThan(10000); // 10 seconds for 10 images
    expect(results.every(r => r.cropApplied)).toBe(true);
  });
});
```

---

## 7. Success Metrics

### 7.1 Detection Accuracy
- **Target**: 90%+ of monuments detected and cropped correctly
- **Fallback Rate**: <10% need to use original image
- **False Positives**: <5% of non-monument images incorrectly cropped

### 7.2 File Size Impact
- **Size Reduction**: 60%+ reduction in average image size
- **API Limits**: 95%+ of images under provider limits
- **Processing Speed**: 30%+ faster due to smaller images

### 7.3 OCR Accuracy
- **Improvement**: 25%+ better OCR results on cropped images
- **Success Rate**: 90%+ of cropped images produce valid results
- **User Satisfaction**: Reduced manual corrections needed

---

## 8. Risk Mitigation

### 8.1 Technical Risks
**Risk**: Shape detection fails on irregular monuments
**Mitigation**: Multiple detection methods with fallback to original image

**Risk**: Performance impact on batch processing
**Mitigation**: Optimize algorithms, add caching, use Web Workers

**Risk**: False positives on non-monument images
**Mitigation**: Strict validation criteria, confidence scoring

### 8.2 Operational Risks
**Risk**: Detection parameters need tuning for different monument types
**Mitigation**: Configurable parameters, A/B testing framework

**Risk**: OpenCV.js compatibility issues
**Mitigation**: Fallback to server-side processing, progressive enhancement

---

## 9. Future Enhancements (Phase 2+)

### 9.1 Advanced Detection
- Machine learning-based monument detection
- Multi-monument detection in single image
- Orientation correction for skewed photos

### 9.2 User Experience
- Preview of detected crop areas
- Manual crop adjustment interface
- Batch crop validation and correction

### 9.3 Analytics
- Detection accuracy tracking
- Performance monitoring
- User feedback integration

---

## 10. Dependencies

### 10.1 New Dependencies
```json
{
  "opencv.js": "^1.2.1",
  "sharp": "^0.32.0"
}
```

### 10.2 Existing Dependencies
- Sharp.js (already in use)
- Node.js image processing capabilities
- Existing AI provider integrations

---

## 11. Configuration

### 11.1 Environment Variables
```bash
# Monument detection configuration
MONUMENT_DETECTION_ENABLED=true
MONUMENT_MIN_WIDTH=200
MONUMENT_MIN_HEIGHT=300
MONUMENT_MIN_AREA=60000
MONUMENT_ASPECT_RATIO_MIN=0.3
MONUMENT_ASPECT_RATIO_MAX=2.0
```

### 11.2 Feature Flags
```javascript
// Enable/disable monument cropping
const MONUMENT_CROPPING_ENABLED = process.env.MONUMENT_DETECTION_ENABLED === 'true';

// Use in processing pipeline
if (MONUMENT_CROPPING_ENABLED && sourceType === 'monument_photo') {
  // Apply intelligent cropping
}
```

---

## 12. Monitoring & Observability

### 12.1 Metrics to Track
- Detection success rate
- Average file size reduction
- Processing time per image
- Fallback rate to original image
- OCR accuracy improvement

### 12.2 Logging
```javascript
logger.info('Monument detection started', { 
  imageSize: imageBuffer.length,
  sourceType: 'monument_photo' 
});

logger.info('Monument detected and cropped', { 
  cropArea: { width, height, x, y },
  sizeReduction: `${((originalSize - croppedSize) / originalSize * 100).toFixed(1)}%`
});

logger.warn('Monument detection failed, using fallback', { 
  error: error.message,
  fallbackReason: 'detection_failed' 
});
```

---

## 13. Conclusion

Phase 1 intelligent cropping addresses the critical file size and accuracy issues identified in Phase 0 UAT. By focusing on monument shape detection rather than text detection, we can reliably crop monument photos to focus on relevant content while maintaining high accuracy.

The implementation is designed for batch processing with minimal user interaction, making it perfect for the current use case. The modular architecture allows for easy enhancement in future phases while delivering immediate value in Phase 1.

**Expected Impact:**
- 60%+ reduction in file sizes
- 25%+ improvement in OCR accuracy
- 30%+ faster batch processing
- 95%+ of images under API limits

This delivers the 80/20 solution: maximum impact with focused implementation effort.

---

*Document Version: 1.0*  
*Last Updated: January 2025*  
*Status: Ready for Implementation*
