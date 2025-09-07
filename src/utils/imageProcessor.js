const sharp = require('sharp');
const fs = require('fs').promises;
const path = require('path');
const logger = require('./logger');

/**
 * Image processing utility for optimizing images before AI processing
 * Handles provider-specific size limits while maintaining OCR quality
 */

// Provider-specific limits
const PROVIDER_LIMITS = {
  anthropic: {
    maxFileSize: 5 * 1024 * 1024,  // 5MB in bytes
    maxDimension: 1568,             // Recommended by Anthropic for best performance
    minDimension: 200               // Minimum to avoid performance degradation
  },
  openai: {
    maxFileSize: 20 * 1024 * 1024,  // 20MB limit for OpenAI
    maxDimension: 2048,             // Good balance for OpenAI
    minDimension: 200
  }
};

/**
 * Calculate optimal dimensions for resizing while maintaining aspect ratio
 * @param {number} originalWidth - Original image width
 * @param {number} originalHeight - Original image height
 * @param {number} maxDimension - Maximum allowed dimension
 * @returns {Object} - New width and height
 */
function calculateOptimalDimensions(originalWidth, originalHeight, maxDimension) {
  // If image is already within limits, keep original dimensions
  if (originalWidth <= maxDimension && originalHeight <= maxDimension) {
    return { width: originalWidth, height: originalHeight };
  }

  // Calculate scaling factor based on the larger dimension
  const scaleFactor = maxDimension / Math.max(originalWidth, originalHeight);
  
  return {
    width: Math.round(originalWidth * scaleFactor),
    height: Math.round(originalHeight * scaleFactor)
  };
}

/**
 * Optimize image for AI processing based on provider requirements
 * @param {string} inputPath - Path to input image
 * @param {string} provider - AI provider ('anthropic' or 'openai')
 * @param {Object} options - Processing options
 * @returns {Promise<string>} - Base64 encoded optimized image
 */
async function optimizeImageForProvider(inputPath, provider = 'anthropic', options = {}) {
  const providerLimits = PROVIDER_LIMITS[provider] || PROVIDER_LIMITS.anthropic;
  
  logger.info(`[ImageProcessor] Optimizing image for ${provider}: ${path.basename(inputPath)}`);
  
  try {
    // Get image metadata
    const image = sharp(inputPath);
    const metadata = await image.metadata();
    
    logger.info(`[ImageProcessor] Original image: ${metadata.width}x${metadata.height}, ${Math.round(metadata.size / 1024)}KB`);
    
    // Calculate optimal dimensions
    const { width, height } = calculateOptimalDimensions(
      metadata.width, 
      metadata.height, 
      providerLimits.maxDimension
    );
    
    // Check if we need to resize
    const needsResize = width !== metadata.width || height !== metadata.height;
    
    if (needsResize) {
      logger.info(`[ImageProcessor] Resizing to: ${width}x${height}`);
    }
    
    // Process the image
    let processedImage = image;
    
    if (needsResize) {
      processedImage = processedImage.resize(width, height, {
        kernel: sharp.kernel.lanczos3,  // High-quality resampling for text
        withoutEnlargement: true        // Don't enlarge smaller images
      });
    }
    
    // Configure JPEG compression for OCR quality
    processedImage = processedImage.jpeg({
      quality: 85,          // Good balance between quality and size for OCR
      progressive: false,   // Better for OCR processing
      mozjpeg: true        // Use mozjpeg encoder for better compression
    });
    
    // Convert to buffer and check size
    const buffer = await processedImage.toBuffer();
    const finalSizeKB = Math.round(buffer.length / 1024);
    const finalSizeMB = (buffer.length / (1024 * 1024)).toFixed(2);
    
    logger.info(`[ImageProcessor] Final image: ${width}x${height}, ${finalSizeKB}KB (${finalSizeMB}MB)`);
    
    // Verify size is within limits
    if (buffer.length > providerLimits.maxFileSize) {
      logger.warn(`[ImageProcessor] Image still too large: ${finalSizeMB}MB > ${providerLimits.maxFileSize / (1024 * 1024)}MB`);
      
      // Try more aggressive compression if still too large
      if (needsResize) {
        logger.info(`[ImageProcessor] Applying more aggressive compression...`);
        
        const aggressiveBuffer = await sharp(inputPath)
          .resize(Math.round(width * 0.8), Math.round(height * 0.8), {
            kernel: sharp.kernel.lanczos3,
            withoutEnlargement: true
          })
          .jpeg({
            quality: 75,        // More aggressive compression
            progressive: false,
            mozjpeg: true
          })
          .toBuffer();
          
        const aggressiveSizeMB = (aggressiveBuffer.length / (1024 * 1024)).toFixed(2);
        logger.info(`[ImageProcessor] Aggressive compression result: ${aggressiveSizeMB}MB`);
        
        if (aggressiveBuffer.length <= providerLimits.maxFileSize) {
          return aggressiveBuffer.toString('base64');
        }
      }
      
      throw new Error(`Unable to compress image below ${providerLimits.maxFileSize / (1024 * 1024)}MB limit for ${provider}`);
    }
    
    // Convert to base64
    const base64 = buffer.toString('base64');
    
    logger.info(`[ImageProcessor] Image optimization successful for ${provider}`);
    
    return base64;
    
  } catch (error) {
    logger.error(`[ImageProcessor] Failed to optimize image: ${error.message}`);
    throw new Error(`Image optimization failed: ${error.message}`);
  }
}

/**
 * Check if an image needs optimization for a specific provider
 * @param {string} imagePath - Path to image file
 * @param {string} provider - AI provider name
 * @returns {Promise<Object>} - Analysis result with recommendations
 */
async function analyzeImageForProvider(imagePath, provider = 'anthropic') {
  const providerLimits = PROVIDER_LIMITS[provider] || PROVIDER_LIMITS.anthropic;
  
  try {
    const stats = await fs.stat(imagePath);
    const metadata = await sharp(imagePath).metadata();
    
    const analysis = {
      originalSize: stats.size,
      originalSizeMB: (stats.size / (1024 * 1024)).toFixed(2),
      dimensions: `${metadata.width}x${metadata.height}`,
      needsOptimization: false,
      reasons: []
    };
    
    // Check file size
    if (stats.size > providerLimits.maxFileSize) {
      analysis.needsOptimization = true;
      analysis.reasons.push(`File size ${analysis.originalSizeMB}MB exceeds ${providerLimits.maxFileSize / (1024 * 1024)}MB limit`);
    }
    
    // Check dimensions
    if (metadata.width > providerLimits.maxDimension || metadata.height > providerLimits.maxDimension) {
      analysis.needsOptimization = true;
      analysis.reasons.push(`Dimensions ${analysis.dimensions} exceed ${providerLimits.maxDimension}px recommendation`);
    }
    
    return analysis;
    
  } catch (error) {
    throw new Error(`Failed to analyze image: ${error.message}`);
  }
}

module.exports = {
  optimizeImageForProvider,
  analyzeImageForProvider,
  PROVIDER_LIMITS,
  calculateOptimalDimensions
};
