import sharp from 'sharp';

/**
 * Image processing utilities for R2 uploads
 * - High-quality WebP conversion (95 quality for archival standards)
 * - Original resolution preservation for editorial content
 * - Metadata extraction
 */

export interface ProcessedImageResult {
  buffer: Buffer;
  width: number;
  height: number;
  format: string;
  sizeBytes: number;
}

/**
 * Convert an image to WebP format with ARCHIVAL QUALITY
 * @param file - Original file (File or Buffer)
 * @param quality - WebP quality (1-100), default 95 for archival quality
 * @param isEditorial - Whether this is editorial content (preserves original resolution)
 * @returns Processed image buffer and metadata
 */
export async function convertToWebP(
  file: File | Buffer,
  quality: number = 95,
  isEditorial: boolean = false
): Promise<ProcessedImageResult> {
  try {
    let inputBuffer: Buffer;

    if (file instanceof File) {
      const arrayBuffer = await file.arrayBuffer();
      inputBuffer = Buffer.from(arrayBuffer);
    } else {
      inputBuffer = file;
    }

    // Get original metadata for quality preservation
    const metadata = await sharp(inputBuffer).metadata();
    const originalWidth = metadata.width || 0;
    const originalHeight = metadata.height || 0;

    console.log(`[IMAGE_PROCESSING] Original: ${originalWidth}x${originalHeight}, quality: ${quality}, editorial: ${isEditorial}`);
    console.log(`[IMAGE_PROCESSING] EXIF Orientation: ${metadata.orientation || 'none'}`);

    // Build sharp pipeline with archival quality settings
    // 🔒 CRITICAL: Call rotate() with NO parameters to auto-orient based on EXIF
    // This physically rotates the image to the correct orientation before WebP conversion
    let pipeline = sharp(inputBuffer).rotate();

    // Get corrected dimensions after rotation
    const rotatedMetadata = await pipeline.metadata();
    const correctedWidth = rotatedMetadata.width || originalWidth;
    const correctedHeight = rotatedMetadata.height || originalHeight;

    console.log(`[IMAGE_PROCESSING] Corrected: ${correctedWidth}x${correctedHeight}`);

    // 🔒 CRITICAL: For editorial content, NEVER resize - preserve original resolution
    // For regular content, we still preserve original (no resizing)
    // Archival standard: no quality degradation

    pipeline = pipeline.webp({
      quality,
      // nearLossless: true for max quality on photos
      nearLossless: quality >= 95,
      // effort: 6 is maximum compression effort (slower but better quality/size ratio)
      effort: 6,
      // smartSubsample: true for better chroma subsampling
      smartSubsample: true,
      // alphaQuality: full quality for transparency
      alphaQuality: 100,
    });

    const processedImage = await pipeline.toBuffer({ resolveWithObject: true });

    console.log(`[IMAGE_PROCESSING] Output: ${processedImage.info.width}x${processedImage.info.height}, size: ${(processedImage.data.length / 1024).toFixed(2)} KB`);

    return {
      buffer: processedImage.data,
      width: correctedWidth,
      height: correctedHeight,
      format: 'webp',
      sizeBytes: processedImage.data.length,
    };
  } catch (error) {
    console.error('WebP conversion error:', error);
    throw new Error(`Failed to convert image to WebP: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}

/**
 * Generate blur hash data for placeholder
 * @param file - Image file
 * @returns Base64 encoded small blur data URI
 */
export async function generateBlurData(file: File | Buffer): Promise<string> {
  try {
    let inputBuffer: Buffer;

    if (file instanceof File) {
      const arrayBuffer = await file.arrayBuffer();
      inputBuffer = Buffer.from(arrayBuffer);
    } else {
      inputBuffer = file;
    }

    // 🔒 CRITICAL: Apply auto-rotation for consistent blur data
    const thumbnail = await sharp(inputBuffer)
      .rotate() // Auto-orient based on EXIF
      .resize(20, 20, { fit: 'cover' })
      .webp({ quality: 50 })
      .toBuffer();

    return `data:image/webp;base64,${thumbnail.toString('base64')}`;
  } catch (error) {
    console.error('Blur data generation error:', error);
    return '';
  }
}

/**
 * Extract basic image metadata
 * @param file - Image file
 * @returns Image metadata
 */
export async function getImageMetadata(file: File | Buffer): Promise<{
  width: number;
  height: number;
  format: string;
  sizeBytes: number;
}> {
  try {
    let inputBuffer: Buffer;

    if (file instanceof File) {
      const arrayBuffer = await file.arrayBuffer();
      inputBuffer = Buffer.from(arrayBuffer);
    } else {
      inputBuffer = file;
    }

    const metadata = await sharp(inputBuffer).metadata();

    return {
      width: metadata.width || 0,
      height: metadata.height || 0,
      format: metadata.format || 'unknown',
      sizeBytes: inputBuffer.length,
    };
  } catch (error) {
    console.error('Metadata extraction error:', error);
    return {
      width: 0,
      height: 0,
      format: 'unknown',
      sizeBytes: 0,
    };
  }
}
