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
    maxDimension: 4096,             // Increased to 4096px for better monument OCR (Claude supports up to 8000px)
    minDimension: 200               // Minimum to avoid performance degradation
  },
  openai: {
    maxFileSize: 20 * 1024 * 1024,  // 20MB limit for OpenAI
    maxDimension: 3072,             // Higher resolution for better monument OCR
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
    // Get image metadata and file stats
    const stats = await fs.stat(inputPath);
    const image = sharp(inputPath);
    const metadata = await image.metadata();
    
    logger.info(`[ImageProcessor] Original image: ${metadata.width}x${metadata.height}, ${Math.round(metadata.size / 1024)}KB`);
    logger.info(`[ImageProcessor] Original file size: ${(stats.size / (1024 * 1024)).toFixed(2)}MB`);
    logger.info(`[ImageProcessor] EXIF orientation: ${metadata.orientation || 'not specified'}`);
    
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
    
    // Auto-rotate based on EXIF orientation data
    processedImage = processedImage.rotate();
    
    if (needsResize) {
      processedImage = processedImage.resize(width, height, {
        kernel: sharp.kernel.lanczos3,  // High-quality resampling for text
        withoutEnlargement: true        // Don't enlarge smaller images
      });
    }
    
    // Configure JPEG compression for OCR quality
    // For Claude, use adaptive quality based on file size to stay under 5MB
    let jpegQuality;
    if (provider === 'openai') {
      jpegQuality = 95;  // OpenAI can handle larger files
    } else {
      // For Claude, start with high quality but be prepared to reduce
      jpegQuality = 90;  // Good balance for text readability while staying under 5MB
    }
    processedImage = processedImage.jpeg({
      quality: jpegQuality,  // Adaptive quality based on provider
      progressive: false,    // Better for OCR processing
      mozjpeg: true         // Use mozjpeg encoder for better compression
    });
    
    // Convert to buffer and check size
    const buffer = await processedImage.toBuffer();
    const finalSizeKB = Math.round(buffer.length / 1024);
    const finalSizeMB = (buffer.length / (1024 * 1024)).toFixed(2);
    
    logger.info(`[ImageProcessor] Final image: ${width}x${height}, ${finalSizeKB}KB (${finalSizeMB}MB)`);
    logger.info(`[ImageProcessor] Compression ratio: ${((1 - buffer.length / stats.size) * 100).toFixed(1)}% reduction`);
    
    // Get final metadata to check if rotation occurred
    const finalMetadata = await sharp(buffer).metadata();
    logger.info(`[ImageProcessor] Final orientation: ${finalMetadata.orientation || 'not specified'}`);
    
    // Debug image saving removed - orientation fix confirmed working
    
    // Verify size is within limits
    if (buffer.length > providerLimits.maxFileSize) {
      logger.warn(`[ImageProcessor] Image still too large: ${finalSizeMB}MB > ${providerLimits.maxFileSize / (1024 * 1024)}MB`);
      
      // Try more aggressive compression if still too large
      logger.info(`[ImageProcessor] Applying more aggressive compression...`);
      
      // Calculate more aggressive dimensions - reduce to 70% of calculated size
      const aggressiveWidth = Math.round(width * 0.7);
      const aggressiveHeight = Math.round(height * 0.7);
      
      const aggressiveBuffer = await sharp(inputPath)
        .resize(aggressiveWidth, aggressiveHeight, {
          kernel: sharp.kernel.lanczos3,
          withoutEnlargement: true
        })
        .jpeg({
          quality: 80,        // More aggressive compression but still readable
          progressive: false,
          mozjpeg: true
        })
        .toBuffer();
        
      const aggressiveSizeMB = (aggressiveBuffer.length / (1024 * 1024)).toFixed(2);
      const aggressiveCompressionRatio = ((1 - aggressiveBuffer.length / stats.size) * 100).toFixed(1);
      logger.info(`[ImageProcessor] Aggressive compression result: ${aggressiveWidth}x${aggressiveHeight}, ${aggressiveSizeMB}MB (${aggressiveCompressionRatio}% reduction)`);
      
      if (aggressiveBuffer.length <= providerLimits.maxFileSize) {
        return aggressiveBuffer.toString('base64');
      }
      
      // If still too large, try even more aggressive compression
      logger.info(`[ImageProcessor] Applying ultra-aggressive compression...`);
      
      const ultraAggressiveBuffer = await sharp(inputPath)
        .resize(Math.round(aggressiveWidth * 0.8), Math.round(aggressiveHeight * 0.8), {
          kernel: sharp.kernel.lanczos3,
          withoutEnlargement: true
        })
        .jpeg({
          quality: 70,        // Ultra-aggressive compression but preserve text
          progressive: false,
          mozjpeg: true
        })
        .toBuffer();
        
      const ultraSizeMB = (ultraAggressiveBuffer.length / (1024 * 1024)).toFixed(2);
      const ultraCompressionRatio = ((1 - ultraAggressiveBuffer.length / stats.size) * 100).toFixed(1);
      logger.info(`[ImageProcessor] Ultra-aggressive compression result: ${ultraSizeMB}MB (${ultraCompressionRatio}% reduction)`);
      
      if (ultraAggressiveBuffer.length <= providerLimits.maxFileSize) {
        return ultraAggressiveBuffer.toString('base64');
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
    
    // Debug logging for Claude optimization issues
    logger.info(`[ImageProcessor] Analyzing image for ${provider}: ${path.basename(imagePath)}`);
    logger.info(`[ImageProcessor] File size: ${analysis.originalSizeMB}MB, Dimensions: ${analysis.dimensions}`);
    logger.info(`[ImageProcessor] Provider limits: ${providerLimits.maxFileSize / (1024 * 1024)}MB file, ${providerLimits.maxDimension}px max dimension`);
    
    // Check file size - account for base64 encoding overhead (~33% increase)
    const base64Size = Math.round(stats.size * 1.33); // Base64 encoding increases size by ~33%
    const base64SizeMB = (base64Size / (1024 * 1024)).toFixed(2);
    
    logger.info(`[ImageProcessor] Estimated base64 size: ${base64SizeMB}MB (${base64Size} bytes)`);
    
    if (base64Size > providerLimits.maxFileSize) {
      analysis.needsOptimization = true;
      analysis.reasons.push(`Base64 encoded size ${base64SizeMB}MB exceeds ${providerLimits.maxFileSize / (1024 * 1024)}MB limit`);
    }
    
    // Check dimensions
    if (metadata.width > providerLimits.maxDimension || metadata.height > providerLimits.maxDimension) {
      analysis.needsOptimization = true;
      analysis.reasons.push(`Dimensions ${analysis.dimensions} exceed ${providerLimits.maxDimension}px recommendation`);
    }
    
    logger.info(`[ImageProcessor] Analysis result: needsOptimization=${analysis.needsOptimization}, reasons=[${analysis.reasons.join(', ')}]`);
    
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
