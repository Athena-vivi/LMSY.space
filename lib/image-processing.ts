import sharp from 'sharp';

/**
 * Image processing utilities for R2 uploads
 * - WebP conversion for optimization
 * - Resizing if needed
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
 * Convert an image to WebP format with optimization
 * @param file - Original file (File or Buffer)
 * @param quality - WebP quality (1-100), default 85
 * @returns Processed image buffer and metadata
 */
export async function convertToWebP(
  file: File | Buffer,
  quality: number = 85
): Promise<ProcessedImageResult> {
  try {
    let inputBuffer: Buffer;

    if (file instanceof File) {
      const arrayBuffer = await file.arrayBuffer();
      inputBuffer = Buffer.from(arrayBuffer);
    } else {
      inputBuffer = file;
    }

    // Use sharp to convert to WebP
    const processedImage = await sharp(inputBuffer)
      .webp({ quality, effort: 4 }) // effort: 4 is balanced speed/compression
      .toBuffer({ resolveWithObject: true });

    const metadata = await sharp(inputBuffer).metadata();

    return {
      buffer: processedImage.data,
      width: metadata.width || 0,
      height: metadata.height || 0,
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

    // Resize to small thumbnail and convert to base64
    const thumbnail = await sharp(inputBuffer)
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
