import { useMemo } from 'react';
import { generateGalleryCatalogNumber, generateProjectCatalogNumber, getCategoryName } from '@/lib/catalog';

interface CatalogNumberProps {
  id: string;
  createdAt: string;
  index?: number;
  type?: 'gallery' | 'project';
  category?: string;
  className?: string;
  showCategory?: boolean;
}

export function CatalogNumber({
  id,
  createdAt,
  index = 0,
  type = 'gallery',
  category = '',
  className = '',
  showCategory = false,
}: CatalogNumberProps) {
  const catalogNumber = useMemo(() => {
    if (type === 'project') {
      return generateProjectCatalogNumber(id, createdAt, category, index);
    }
    return generateGalleryCatalogNumber(id, createdAt, index);
  }, [id, createdAt, index, type, category]);

  const categoryName = useMemo(() => {
    return getCategoryName(catalogNumber);
  }, [catalogNumber]);

  return (
    <div
      className={`
        flex items-center gap-2 text-[10px] md:text-[11px]
        font-mono tracking-wider
        text-muted-foreground/60
        select-none
        ${className}
      `}
      style={{
        fontFamily: '"Courier New", Courier, monospace',
        fontVariantNumeric: 'tabular-nums',
      }}
    >
      {showCategory && (
        <span className="opacity-40">[{categoryName}]</span>
      )}
      <span className="opacity-60">{catalogNumber}</span>
    </div>
  );
}

/**
 * Compact version for image overlays
 */
export function CompactCatalogNumber({
  id,
  createdAt,
  index = 0,
  className = '',
}: {
  id: string;
  createdAt: string;
  index?: number;
  className?: string;
}) {
  const catalogNumber = useMemo(() => {
    return generateGalleryCatalogNumber(id, createdAt, index);
  }, [id, createdAt, index]);

  return (
    <div
      className={`
        text-[9px] font-mono tracking-wide
        text-foreground/40
        ${className}
      `}
      style={{
        fontFamily: '"Courier New", Courier, monospace',
      }}
    >
      {catalogNumber}
    </div>
  );
}
