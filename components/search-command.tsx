'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Search, X, FileImage, FolderKanban, LayoutGrid, Hash, AlertCircle } from 'lucide-react';
import Image from 'next/image';
import { useRouter } from 'next/navigation';
import { useKeyPress } from '@/lib/hooks';
import { useLanguage } from '@/components/language-provider';
import { t } from '@/lib/languages';
import { resolveImageUrl } from '@/lib/image-url';
import type { SearchResult, SearchResultType } from '@/lib/search-results';

// Phase 5: consumes the unified search contract (see
// docs/architecture/20261017-search-contract.md). The type badge/icon comes
// from result.type only - never inferred from the title text. All copy goes
// through the three-language keys (search.*), and the Schedule placeholder
// is gone from Quick Access (the /schedule route itself stays).

const TYPE_ICON: Record<SearchResultType, typeof FileImage> = {
  project: FolderKanban,
  gallery: FileImage,
  exhibition: LayoutGrid,
};

const TYPE_COLOR: Record<SearchResultType, string> = {
  gallery: 'text-lmsy-yellow bg-lmsy-yellow/10 border-lmsy-yellow/20',
  project: 'text-lmsy-blue bg-lmsy-blue/10 border-lmsy-blue/20',
  exhibition: 'text-purple-500 bg-purple-500/10 border-purple-500/20',
};

const TYPE_LABEL_KEY: Record<SearchResultType, 'search.typeProject' | 'search.typeGallery' | 'search.typeExhibition'> = {
  project: 'search.typeProject',
  gallery: 'search.typeGallery',
  exhibition: 'search.typeExhibition',
};

export function SearchCommand() {
  const { language } = useLanguage();
  const [isOpen, setIsOpen] = useState(false);
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<SearchResult[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isError, setIsError] = useState(false);
  const [selectedIndex, setSelectedIndex] = useState(0);
  const router = useRouter();
  const inputRef = useRef<HTMLInputElement>(null);
  const searchRef = useRef<HTMLDivElement>(null);
  const requestIdRef = useRef(0);

  const resetAndClose = useCallback(() => {
    requestIdRef.current += 1;
    setIsOpen(false);
    setQuery('');
    setResults([]);
    setIsLoading(false);
    setIsError(false);
    setSelectedIndex(0);
  }, []);

  const navigateToResult = useCallback((href: string) => {
    // The gallery reads hash changes to resolve an asset that may live beyond
    // the first page. Re-dispatch when the same hash is selected twice so the
    // current /gallery instance does not need to remount.
    if (typeof window !== 'undefined' && href.startsWith('/gallery#') && window.location.pathname === '/gallery') {
      const nextHash = href.slice('/gallery'.length);
      if (window.location.hash === nextHash) {
        window.dispatchEvent(new Event('hashchange'));
      } else {
        window.location.hash = nextHash;
      }
    } else {
      router.push(href);
    }
    resetAndClose();
  }, [resetAndClose, router]);

  // Keyboard shortcuts
  useKeyPress(['Meta+k', 'Ctrl+k'], (e) => {
    e.preventDefault();
    setIsOpen(prev => !prev);
  });

  useKeyPress(['Escape'], () => {
    if (isOpen) resetAndClose();
  });

  useKeyPress(['ArrowDown'], (e) => {
    if (isOpen && results.length > 0) {
      e.preventDefault();
      setSelectedIndex(prev => (prev + 1) % results.length);
    }
  });

  useKeyPress(['ArrowUp'], (e) => {
    if (isOpen && results.length > 0) {
      e.preventDefault();
      setSelectedIndex(prev => (prev - 1 + results.length) % results.length);
    }
  });

  useKeyPress(['Enter'], (e) => {
    if (isOpen && results.length > 0) {
      e.preventDefault();
      const selected = results[selectedIndex] ?? results[0];
      if (selected) navigateToResult(selected.href);
    }
  });

  // Focus input when opened
  useEffect(() => {
    if (isOpen) {
      setTimeout(() => inputRef.current?.focus(), 100);
    }
  }, [isOpen]);

  // Search function: three explicit states - loading / no results / error.
  const performSearch = useCallback(async (searchQuery: string) => {
    const requestId = ++requestIdRef.current;
    if (!searchQuery.trim()) {
      setResults([]);
      setIsLoading(false);
      setIsError(false);
      setSelectedIndex(0);
      return;
    }

    setIsLoading(true);
    setIsError(false);

    try {
      const response = await fetch(
        `/api/search?q=${encodeURIComponent(searchQuery)}&lang=${language}`
      );
      if (!response.ok) throw new Error(`search failed: ${response.status}`);
      const data = await response.json();
      if (requestId !== requestIdRef.current) return;
      setResults(Array.isArray(data.results) ? data.results : []);
      setSelectedIndex(0);
    } catch (error) {
      if (requestId !== requestIdRef.current) return;
      console.error('Search error:', error);
      setResults([]);
      setSelectedIndex(0);
      setIsError(true);
    } finally {
      if (requestId === requestIdRef.current) setIsLoading(false);
    }
  }, [language]);

  // Debounced search
  useEffect(() => {
    const timeoutId = setTimeout(() => {
      performSearch(query);
    }, 300);

    return () => clearTimeout(timeoutId);
  }, [query, performSearch]);

  // Close on click outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (searchRef.current && !searchRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const highlightMatch = (text: string, term: string) => {
    if (!term) return text;

    const regex = new RegExp(`(${term.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')})`, 'gi');
    const parts = text.split(regex);

    return parts.map((part, index) =>
      regex.test(part) ? (
        <mark key={index} className="bg-lmsy-yellow/30 text-foreground rounded px-0.5">
          {part}
        </mark>
      ) : (
        part
      )
    );
  };

  const quickAccess = [
    { label: t(language, 'nav.gallery'), url: '/gallery', icon: FileImage, color: 'text-lmsy-yellow' },
    { label: t(language, 'nav.projects'), url: '/projects', icon: FolderKanban, color: 'text-lmsy-blue' },
    { label: t(language, 'nav.profiles'), url: '/profiles', icon: Hash, color: 'text-purple-500' },
  ];

  return (
    <>
      {/* Trigger Button - Icon only */}
      <button
        onClick={() => setIsOpen(true)}
        className="p-2 hover:bg-muted rounded-full transition-colors group"
        aria-label={t(language, 'search.open')}
      >
        <Search className="h-5 w-5 text-ink-2 group-hover:text-foreground transition-colors" />
      </button>

      {/* Spotlight-style Modal */}
      <AnimatePresence>
        {isOpen && (
          <>
            {/* Backdrop */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.2 }}
              className="fixed inset-0 bg-black/40 backdrop-blur-sm z-50"
              onClick={() => setIsOpen(false)}
            />

            {/* Search Modal */}
            <div className="fixed inset-0 z-50 flex items-start justify-center pt-[15vh] px-4">
              <motion.div
                ref={searchRef}
                initial={{ opacity: 0, scale: 0.95, y: -20 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.95, y: -20 }}
                transition={{ duration: 0.2 }}
                className="w-full max-w-2xl bg-card border border-border rounded-xl shadow-2xl overflow-hidden"
              >
                {/* Search Input */}
                <div className="flex items-center gap-3 px-4 py-4 border-b border-border">
                  <Search className="h-5 w-5 text-ink-2" />
                  <input
                    ref={inputRef}
                    type="text"
                    value={query}
                    onChange={(e) => {
                      requestIdRef.current += 1;
                      setQuery(e.target.value);
                      setSelectedIndex(0);
                      setIsLoading(false);
                      setIsError(false);
                    }}
                    placeholder={t(language, 'search.placeholder')}
                    className="flex-1 bg-transparent text-foreground placeholder:text-ink-2 focus:outline-none text-lg"
                  />
                  {query && (
                    <button
                      onClick={() => {
                        requestIdRef.current += 1;
                        setQuery('');
                        setResults([]);
                        setSelectedIndex(0);
                        setIsLoading(false);
                        setIsError(false);
                      }}
                      className="p-1 hover:bg-muted rounded-full transition-colors"
                      aria-label={t(language, 'search.clear')}
                    >
                      <X className="h-5 w-5 text-ink-2" />
                    </button>
                  )}
                  <kbd className="hidden sm:inline-flex items-center gap-1 px-2 py-1 text-xs font-medium text-ink-2 bg-muted rounded">
                    ESC
                  </kbd>
                </div>

                {/* Search Results */}
                <div className="custom-scrollbar max-h-[400px] overflow-y-auto">
                  {isLoading ? (
                    <div className="flex items-center justify-center py-12">
                      <div className="animate-spin rounded-full h-8 w-8 border-2 border-muted border-t-foreground" />
                    </div>
                  ) : isError ? (
                    /* Request failure - distinct from "no results" */
                    <div className="flex flex-col items-center justify-center py-12 text-center px-4">
                      <AlertCircle className="h-12 w-12 text-ink-2 mb-3" />
                      <p className="text-ink-2">{t(language, 'search.error')}</p>
                    </div>
                  ) : query && results.length > 0 ? (
                    <div className="p-2">
                      {results.map((result, index) => {
                        const Icon = TYPE_ICON[result.type];
                        const isSelected = index === selectedIndex;
                        const imageUrl = result.image ? resolveImageUrl(result.image) : null;

                        return (
                          <motion.button
                            key={`${result.type}-${result.id}`}
                            onClick={() => navigateToResult(result.href)}
                            initial={{ opacity: 0, x: -10 }}
                            animate={{ opacity: 1, x: 0 }}
                            transition={{ delay: Math.min(index, 8) * 0.05 }}
                            className={`w-full flex items-start gap-3 p-3 rounded-lg transition-all ${
                              isSelected
                                ? 'bg-gradient-to-r from-lmsy-yellow/10 to-lmsy-blue/10 border border-lmsy-yellow/20'
                                : 'hover:bg-muted'
                            }`}
                          >
                            {/* Real thumbnail when the contract carries one,
                                unified empty style otherwise */}
                            <div className="relative shrink-0 w-11 h-11 rounded-lg overflow-hidden border border-border bg-gradient-to-br from-lmsy-yellow/10 to-lmsy-blue/10">
                              {imageUrl ? (
                                <Image
                                  src={imageUrl}
                                  alt=""
                                  fill
                                  sizes="44px"
                                  className="object-cover"
                                  unoptimized
                                />
                              ) : (
                                <div className="w-full h-full flex items-center justify-center">
                                  <Icon className={`h-4 w-4 ${result.type === 'gallery' ? 'text-lmsy-yellow' : result.type === 'project' ? 'text-lmsy-blue' : 'text-purple-500'}`} />
                                </div>
                              )}
                            </div>
                            <div className="flex-1 text-left min-w-0">
                              <div className="font-medium text-foreground">
                                {highlightMatch(result.title, query)}
                              </div>
                              {result.description && (
                                <div className="text-sm text-ink-2 line-clamp-1">
                                  {highlightMatch(result.description, query)}
                                </div>
                              )}
                              <div className="text-xs text-ink-2 mt-1 flex items-center gap-1.5 flex-wrap">
                                <span className={`px-1.5 py-0.5 rounded border ${TYPE_COLOR[result.type]}`}>
                                  {t(language, TYPE_LABEL_KEY[result.type])}
                                </span>
                                {result.date && (
                                  <span style={{ fontVariantNumeric: 'tabular-nums' }}>
                                    {result.date.slice(0, 10)}
                                  </span>
                                )}
                              </div>
                            </div>
                          </motion.button>
                        );
                      })}
                    </div>
                  ) : query ? (
                    <div className="flex flex-col items-center justify-center py-12 text-center">
                      <Search className="h-12 w-12 text-ink-2 mb-3" />
                      <p className="text-ink-2">{t(language, 'search.noResults')}</p>
                      <p className="text-sm text-ink-2 mt-1">
                        {t(language, 'search.noResultsHint')}
                      </p>
                    </div>
                  ) : (
                    <div className="p-4">
                      <p className="text-sm text-ink-2 mb-4">{t(language, 'search.quickAccess')}</p>
                      <div className="grid grid-cols-2 gap-2">
                        {quickAccess.map((item) => {
                          const Icon = item.icon;
                          return (
                            <button
                              key={item.label}
                              onClick={() => {
                                router.push(item.url);
                                resetAndClose();
                              }}
                              className="flex items-center gap-2 p-3 rounded-lg hover:bg-muted transition-colors"
                            >
                              <Icon className={`h-4 w-4 ${item.color}`} />
                              <span className="text-sm font-medium text-foreground">{item.label}</span>
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  )}
                </div>

                {/* Footer */}
                <div className="px-4 py-2 border-t border-border bg-muted/30">
                  <div className="flex items-center justify-between text-xs text-ink-2">
                    <div className="flex items-center gap-3">
                      <span className="hidden sm:inline">{t(language, 'search.footerNavigate')}</span>
                      <span>{t(language, 'search.footerEnter')}</span>
                    </div>
                    <span>{t(language, 'search.footerEsc')}</span>
                  </div>
                </div>
              </motion.div>
            </div>
          </>
        )}
      </AnimatePresence>
    </>
  );
}
