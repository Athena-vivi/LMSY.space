import Image from 'next/image';
import Link from 'next/link';

export const MDXComponents = {
  h1: ({ className, ...props }: React.HTMLAttributes<HTMLHeadingElement>) => (
    <h1 className={`font-serif text-5xl md:text-6xl lg:text-7xl font-bold tracking-tight text-foreground mb-8 mt-12 ${className || ''}`} {...props} />
  ),
  h2: ({ className, ...props }: React.HTMLAttributes<HTMLHeadingElement>) => (
    <h2 className={`font-serif text-3xl md:text-4xl lg:text-5xl font-bold tracking-tight text-foreground mb-6 mt-10 ${className || ''}`} {...props} />
  ),
  h3: ({ className, ...props }: React.HTMLAttributes<HTMLHeadingElement>) => (
    <h3 className={`font-serif text-2xl md:text-3xl font-semibold tracking-tight text-foreground mb-4 mt-8 ${className || ''}`} {...props} />
  ),
  h4: ({ className, ...props }: React.HTMLAttributes<HTMLHeadingElement>) => (
    <h4 className={`font-serif text-xl md:text-2xl font-semibold tracking-tight text-foreground mb-3 mt-6 ${className || ''}`} {...props} />
  ),
  p: ({ className, ...props }: React.HTMLAttributes<HTMLParagraphElement>) => (
    <p className={`font-sans text-lg md:text-xl text-foreground/90 leading-relaxed tracking-wide mb-6 ${className || ''}`} {...props} />
  ),
  a: ({ className, ...props }: React.AnchorHTMLAttributes<HTMLAnchorElement>) => (
    <a className={`text-lmsy-blue hover:text-lmsy-yellow underline decoration-2 underline-offset-4 transition-colors duration-300 ${className || ''}`} {...props} />
  ),
  ul: ({ className, ...props }: React.HTMLAttributes<HTMLUListElement>) => (
    <ul className={`list-disc list-inside space-y-3 mb-6 marker:text-lmsy-yellow ${className || ''}`} {...props} />
  ),
  ol: ({ className, ...props }: React.HTMLAttributes<HTMLOListElement>) => (
    <ol className={`list-decimal list-inside space-y-3 mb-6 marker:text-lmsy-blue ${className || ''}`} {...props} />
  ),
  li: ({ className, ...props }: React.HTMLAttributes<HTMLLIElement>) => (
    <li className={`text-lg md:text-xl text-foreground/90 leading-relaxed ${className || ''}`} {...props} />
  ),
  blockquote: ({ className, ...props }: React.HTMLAttributes<HTMLQuoteElement>) => (
    <blockquote className={`border-l-4 border-lmsy-yellow pl-6 py-2 my-6 bg-muted/30 italic ${className || ''}`} {...props} />
  ),
  code: ({ className, ...props }: React.HTMLAttributes<HTMLElement>) => {
    // Check if it's inline code (no className or only specific highlight.js classes)
    const isInline = !className || className.includes('language-');
    if (isInline) {
      return (
        <code className={`font-mono text-sm bg-muted px-2 py-1 rounded text-lmsy-blue ${className || ''}`} {...props} />
      );
    }
    return <code className={className} {...props} />;
  },
  pre: ({ className, ...props }: React.HTMLAttributes<HTMLPreElement>) => (
    <pre className={`font-mono text-sm bg-muted/50 rounded-lg p-6 overflow-x-auto mb-6 border border-border ${className || ''}`} {...props} />
  ),
  img: ({ src, alt, className }: React.ImgHTMLAttributes<HTMLImageElement>) => {
    if (!src || typeof src !== 'string') return null;
    return (
      <div className="relative my-8 rounded-lg overflow-hidden border border-border">
        <Image
          src={src as string}
          alt={alt || ''}
          width={800}
          height={450}
          className={`object-cover ${className || ''}`}
        />
      </div>
    );
  },
  hr: ({ className, ...props }: React.HTMLAttributes<HTMLHRElement>) => (
    <hr className={`my-12 border-t-2 border-foreground/20 ${className || ''}`} {...props} />
  ),
  table: ({ className, ...props }: React.HTMLAttributes<HTMLTableElement>) => (
    <div className="my-6 overflow-x-auto rounded-lg border border-border">
      <table className={`min-w-full divide-y divide-border ${className || ''}`} {...props} />
    </div>
  ),
  thead: ({ className, ...props }: React.HTMLAttributes<HTMLTableSectionElement>) => (
    <thead className={`bg-muted/50 ${className || ''}`} {...props} />
  ),
  tbody: ({ className, ...props }: React.HTMLAttributes<HTMLTableSectionElement>) => (
    <tbody className={`bg-background divide-y divide-border ${className || ''}`} {...props} />
  ),
  tr: ({ className, ...props }: React.HTMLAttributes<HTMLTableRowElement>) => (
    <tr className={`${className || ''}`} {...props} />
  ),
  th: ({ className, ...props }: React.HTMLAttributes<HTMLTableCellElement>) => (
    <th className={`px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider ${className || ''}`} {...props} />
  ),
  td: ({ className, ...props }: React.HTMLAttributes<HTMLTableCellElement>) => (
    <td className={`px-6 py-4 whitespace-nowrap text-sm text-foreground ${className || ''}`} {...props} />
  ),
};
