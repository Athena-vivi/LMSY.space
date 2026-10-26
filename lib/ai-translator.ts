/**
 * AI Translation Service
 *
 * 使用 OpenRouter API 调用 Claude 模型进行多语言翻译
 * 支持翻译: EN / ZH (中文) / TH (泰文)
 *
 * 环境变量:
 * - OPENROUTER_API_KEY: OpenRouter API Key
 * - OPENROUTER_MODEL: 模型名称 (默认: anthropic/claude-3.5-sonnet)
 */

// 🔒 SECURITY: Server-side only
if (typeof window !== 'undefined') {
  throw new Error(
    'CRITICAL SECURITY ERROR: AI translator must only be used on the server side.'
  );
}

import type { MultilingualContent, SupportedLanguage } from './supabase/types';

/**
 * 翻译请求接口
 */
export interface TranslationRequest {
  // 原始文本（可能包含多语言混合）
  text: string;
  // 要翻译的目标语言（如果为空，则翻译所有支持的语言）
  targetLanguages?: SupportedLanguage[];
  // 上下文信息（帮助 AI 更好地翻译）
  context?: {
    sourcePlatform?: string; // 来源平台
    contentType?: 'title' | 'description'; // 内容类型
    originalLanguage?: string; // 原始语言（如果已知）
  };
}

/**
 * 翻译结果接口
 */
export interface TranslationResult {
  success: boolean;
  translations?: MultilingualContent;
  error?: string;
  model?: string;
  tokensUsed?: number;
}

/**
 * OpenRouter API 配置
 */
const OPENROUTER_API_URL = 'https://openrouter.ai/api/v1/chat/completions';
const DEFAULT_MODEL = 'anthropic/claude-3.5-sonnet';
const FALLBACK_MODELS = [
  'anthropic/claude-3.5-sonnet',
  'anthropic/claude-3-haiku',
  'openai/gpt-4o-mini',
  'google/gemini-flash-1.5',
];

/**
 * 获取 API 配置
 */
function getApiConfig() {
  const apiKey = process.env.OPENROUTER_API_KEY;
  if (!apiKey) {
    throw new Error('OPENROUTER_API_KEY environment variable is not set');
  }

  const model = process.env.OPENROUTER_MODEL || DEFAULT_MODEL;

  return { apiKey, model };
}

/**
 * 检测文本语言（简单启发式方法）
 */
function detectLanguage(text: string): string {
  // 泰文范围: U+0E00-U+0E7F
  const thaiRegex = /[\u0E00-\u0E7F]/;
  if (thaiRegex.test(text)) {
    return 'th';
  }

  // 中文范围
  const chineseRegex = /[\u4E00-\u9FFF\u3400-\u4DBF]/;
  if (chineseRegex.test(text)) {
    return 'zh';
  }

  // 默认英文
  return 'en';
}

/**
 * 构建翻译 Prompt
 */
function buildTranslationPrompt(
  text: string,
  targetLanguages: SupportedLanguage[],
  context?: TranslationRequest['context']
): string {
  const languageMap: Record<SupportedLanguage, string> = {
    en: 'English',
    zh: 'Simplified Chinese (简体中文)',
    th: 'Thai (ภาษาไทย)',
  };

  const targetLanguagesStr = targetLanguages
    .map(lang => languageMap[lang])
    .join(', ');

  const contextInfo = context
    ? `
Context:
- Source Platform: ${context.sourcePlatform || 'unknown'}
- Content Type: ${context.contentType || 'general'}
- Original Language: ${context.originalLanguage || 'auto-detected'}
`.trim()
    : '';

  return `You are a professional translator for a Thai GL (Girls' Love) fansite dedicated to the actress duo Lookmhee & Sonya.

TRANSLATION STYLE GUIDE:
- Tone: Warm, affectionate, fan-oriented (like fan community posts)
- Names: Always use "Lookmhee" and "Sonya" (never transliterated)
- Emotions: Preserve emotional nuance and fan affection
- Format: Return ONLY valid JSON, no markdown

${contextInfo}

TASK: Translate the following text to: ${targetLanguagesStr}

INPUT TEXT:
"""${text}"""

OUTPUT FORMAT (JSON only):
\`\`\`json
{
  "en": "English translation (if original is not English, otherwise return original)",
  "zh": "简体中文翻译",
  "th": "คำแปลภาษาไทย"
}
\`\`\`

IMPORTANT:
1. Return ONLY the JSON object, no markdown code blocks
2. If the input is already in a target language, keep it as-is
3. For titles: keep it concise and engaging
4. For descriptions: preserve emotional tone and meaning`;
}

/**
 * 调用 OpenRouter API 进行翻译
 */
async function callOpenRouter(
  prompt: string,
  model: string,
  apiKey: string
): Promise<{
  content: string;
  model: string;
  tokensUsed: number;
}> {
  const response = await fetch(OPENROUTER_API_URL, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
      'HTTP-Referer': 'https://lmsy.space',
      'X-Title': 'LMSY Archive',
    },
    body: JSON.stringify({
      model,
      messages: [
        {
          role: 'user',
          content: prompt,
        },
      ],
      temperature: 0.3, // 低温度以获得一致的翻译
      max_tokens: 1000,
    }),
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`OpenRouter API error: ${response.status} ${response.statusText}\n${errorText}`);
  }

  const data = await response.json();

  return {
    content: data.choices[0]?.message?.content || '',
    model: data.model || model,
    tokensUsed: data.usage?.total_tokens || 0,
  };
}

/**
 * 解析 AI 返回的 JSON
 */
function parseTranslationResponse(
  content: string
): MultilingualContent | null {
  try {
    // 尝试直接解析
    return JSON.parse(content);
  } catch {
    // 尝试提取 JSON 代码块
    const jsonMatch = content.match(/```(?:json)?\s*(\{[\s\S]*?\})\s*```/);
    if (jsonMatch) {
      try {
        return JSON.parse(jsonMatch[1]);
      } catch {
        // 忽略解析错误
      }
    }

    // 尝试找到 JSON 对象
    const objectMatch = content.match(/\{[\s\S]*?\}/);
    if (objectMatch) {
      try {
        return JSON.parse(objectMatch[0]);
      } catch {
        // 忽略解析错误
      }
    }

    return null;
  }
}

/**
 * 翻译文本到多语言
 *
 * @param request - 翻译请求
 * @returns 翻译结果
 */
export async function translateText(
  request: TranslationRequest
): Promise<TranslationResult> {
  const { text, targetLanguages = ['en', 'zh', 'th'], context } = request;

  if (!text || text.trim().length === 0) {
    return {
      success: false,
      error: 'Input text is empty',
    };
  }

  console.log(`[TRANSLATOR] Starting translation:`, {
    textLength: text.length,
    targetLanguages,
    context,
  });

  const { apiKey, model } = getApiConfig();

  // 检测原始语言（如果没有提供）
  const detectedLanguage = context?.originalLanguage || detectLanguage(text);

  // 构建完整的 context
  const fullContext = {
    ...context,
    originalLanguage: detectedLanguage,
  };

  // 构建 Prompt
  const prompt = buildTranslationPrompt(text, targetLanguages, fullContext);

  try {
    // 调用 OpenRouter API
    const result = await callOpenRouter(prompt, model, apiKey);

    // 解析响应
    const translations = parseTranslationResponse(result.content);

    if (!translations) {
      console.error('[TRANSLATOR] Failed to parse AI response:', result.content);
      return {
        success: false,
        error: 'Failed to parse translation response',
        model: result.model,
      };
    }

    // 验证所有语言都有值
    const validatedTranslations: MultilingualContent = {
      en: translations.en || '',
      zh: translations.zh || '',
      th: translations.th || '',
    };

    console.log(`[TRANSLATOR] Translation successful:`, {
      model: result.model,
      tokensUsed: result.tokensUsed,
      translations: validatedTranslations,
    });

    return {
      success: true,
      translations: validatedTranslations,
      model: result.model,
      tokensUsed: result.tokensUsed,
    };
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    console.error('[TRANSLATOR] Translation failed:', errorMessage);

    return {
      success: false,
      error: errorMessage,
    };
  }
}

/**
 * 翻译草稿项内容（包含 title 和 description）
 *
 * @param title - 原始标题
 * @param description - 原始描述
 * @param context - 上下文信息
 * @returns 翻译结果
 */
export async function translateDraftItem(
  title?: string | null,
  description?: string | null,
  context?: TranslationRequest['context']
): Promise<{
  success: boolean;
  title?: MultilingualContent;
  description?: MultilingualContent;
  error?: string;
  model?: string;
  totalTokensUsed?: number;
}> {
  const results = await Promise.allSettled([
    // 翻译标题
    title
      ? translateText({
          text: title,
          targetLanguages: ['en', 'zh', 'th'],
          context: { ...context, contentType: 'title' },
        })
      : Promise.resolve({ success: true, translations: { en: '', zh: '', th: '' } }),

    // 翻译描述
    description
      ? translateText({
          text: description,
          targetLanguages: ['en', 'zh', 'th'],
          context: { ...context, contentType: 'description' },
        })
      : Promise.resolve({ success: true, translations: { en: '', zh: '', th: '' } }),
  ]);

  const [titleResult, descriptionResult] = results;

  if (results.some(r => r.status === 'rejected' || !r.value.success)) {
    const errors = results
      .map((r, i) => {
        if (r.status === 'rejected') return `${i === 0 ? 'Title' : 'Description'}: ${r.reason}`;
        if (!r.value.success) {
          const error = (r.value as TranslationResult).error;
          return `${i === 0 ? 'Title' : 'Description'}: ${error || 'Unknown error'}`;
        }
        return null;
      })
      .filter(Boolean);

    return {
      success: false,
      error: errors.join('; '),
      title: titleResult.status === 'fulfilled' && titleResult.value.success ? titleResult.value.translations : undefined,
      description: descriptionResult.status === 'fulfilled' && descriptionResult.value.success ? descriptionResult.value.translations : undefined,
    };
  }

  // 计算总 token 使用量
  const totalTokensUsed =
    (titleResult.status === 'fulfilled' ? (titleResult.value as TranslationResult).tokensUsed || 0 : 0) +
    (descriptionResult.status === 'fulfilled' ? (descriptionResult.value as TranslationResult).tokensUsed || 0 : 0);

  console.log(`[TRANSLATOR] Draft item translation complete. Total tokens: ${totalTokensUsed}`);

  return {
    success: true,
    title: titleResult.status === 'fulfilled' ? titleResult.value.translations : undefined,
    description: descriptionResult.status === 'fulfilled' ? descriptionResult.value.translations : undefined,
    model: titleResult.status === 'fulfilled' ? (titleResult.value as TranslationResult).model : undefined,
    totalTokensUsed,
  };
}

