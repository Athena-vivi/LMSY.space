import { NextRequest, NextResponse } from 'next/server';
import { getPlaiceholder } from 'plaiceholder';

export async function POST(request: NextRequest) {
  try {
    const { image } = await request.json();

    if (!image) {
      return NextResponse.json(
        { error: 'No image data provided' },
        { status: 400 }
      );
    }

    // Convert base64 to Buffer
    const base64Data = image.split(',')[1] || image;
    const buffer = Buffer.from(base64Data, 'base64');

    // Generate blur placeholder
    const { base64 } = await getPlaiceholder(buffer, {
      size: 32, // Very small for performance
    });

    return NextResponse.json({
      blurData: base64,
    });
  } catch (error) {
    console.error('Blur generation error:', error);
    return NextResponse.json(
      { error: 'Failed to generate blur placeholder' },
      { status: 500 }
    );
  }
}
