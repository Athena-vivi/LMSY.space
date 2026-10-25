/**
 * Renders a JSON-LD payload as a script tag. Server-only: the payload must be
 * in the SSR HTML for crawlers to see it, so this component is intentionally
 * not marked 'use client'.
 */
export function JsonLd({ data }: { data: object }) {
  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: JSON.stringify(data) }}
    />
  );
}
