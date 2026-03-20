/**
 * POST /api/admin/translate - Translate content to specific language
 * Admin API for on-demand translation
 */

import { NextRequest, NextResponse } from 'next/server';
import { translateText } from '@/lib/ai-translator';

interface TranslateRequest {
  text?: string;
  title?: string;
  description?: string;
  contentType?: 'title' | 'description';
  targetLang: 'zh' | 'th';
}

export async function POST(request: NextRequest) {
  try {
    const body: TranslateRequest = await request.json();
    const { text, title, description, contentType, targetLang } = body;

    if (!targetLang || (targetLang !== 'zh' && targetLang !== 'th')) {
      return NextResponse.json(
        { success: false, error: 'Invalid target language. Use "zh" or "th".' },
        { status: 400 }
      );
    }

    if (!text && !title && !description) {
      return NextResponse.json(
        { success: false, error: 'Either text, title or description is required' },
        { status: 400 }
      );
    }

    console.log('[TRANSLATE_API] Translating to:', targetLang);

    // Translate both title and description
    const textToTranslate = text || title || description || '';
    if (!textToTranslate) {
      return NextResponse.json(
        { success: false, error: 'No text to translate' },
        { status: 400 }
      );
    }

    const result = await translateText({
      text: textToTranslate,
      targetLanguages: ['en', targetLang],
      context: {
        contentType: contentType || (title ? 'title' : 'description'),
      },
    });

    if (!result.success || !result.translations) {
      return NextResponse.json(
        { success: false, error: result.error || 'Translation failed' },
        { status: 500 }
      );
    }

    // Return the translation
    return NextResponse.json({
      success: true,
      data: {
        text: text ? result.translations[targetLang] : '',
        title: title ? result.translations[targetLang] : '',
        description: description ? result.translations[targetLang] : '',
      },
    });
  } catch (error) {
    console.error('[TRANSLATE_API] Error:', error);
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    );
  }
}
