export type AdminTranslateTarget = 'zh' | 'th';
export type AdminTranslateContentType = 'title' | 'description';

interface TranslateTextOptions {
  text: string;
  targetLang: AdminTranslateTarget;
  contentType?: AdminTranslateContentType;
}

export async function translateAdminText({
  text,
  targetLang,
  contentType = 'description',
}: TranslateTextOptions) {
  const trimmed = text.trim();
  if (!trimmed) return '';

  const response = await fetch('/api/admin/translate', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      text: trimmed,
      targetLang,
      contentType,
    }),
  });

  const result = await response.json();
  if (!response.ok || !result.success) {
    throw new Error(result.error || 'Translation failed');
  }

  return result.data?.text || '';
}

export async function translateFieldMap<T extends Record<string, string>>(
  fields: T,
  targetLang: AdminTranslateTarget,
  contentTypes: Partial<Record<keyof T, AdminTranslateContentType>> = {}
): Promise<T> {
  const entries = Object.entries(fields) as Array<[keyof T, string]>;
  const translated = await Promise.all(
    entries.map(async ([key, value]) => [
      key,
      await translateAdminText({
        text: value,
        targetLang,
        contentType: contentTypes[key] || 'description',
      }),
    ])
  );

  return Object.fromEntries(translated) as T;
}
