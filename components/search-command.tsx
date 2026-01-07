'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Search, X, FileImage, FolderKanban, Calendar, Hash } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useKeyPress } from '@/lib/hooks';

interface SearchResult {
  id: string;
  type: 'gallery' | 'project' | 'schedule';
  title: string;
  description?: string | null;
  subtitle?: string;
  url: string;
}

export function SearchCommand() {
  const [isOpen, setIsOpen] = useState(false);
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<SearchResult[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [selectedIndex, setSelectedIndex] = useState(0);
  const router = useRouter();
  const inputRef = useRef<HTMLInputElement>(null);
  const searchRef = useRef<HTMLDivElement>(null);

  // Keyboard shortcuts
  useKeyPress(['Meta+k', 'Ctrl+k'], (e) => {
    e.preventDefault();
    setIsOpen(prev => !prev);
  });

  useKeyPress(['Escape'], () => {
    setIsOpen(false);
    setQuery('');
    setResults([]);
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
      router.push(results[selectedIndex].url);
      setIsOpen(false);
      setQuery('');
      setResults([]);
    }
  });

  // Focus input when opened
  useEffect(() => {
    if (isOpen) {
      setTimeout(() => inputRef.current?.focus(), 100);
    }
  }, [isOpen]);

  // Search function
  const performSearch = useCallback(async (searchQuery: string) => {
    if (!searchQuery.trim()) {
      setResults([]);
      return;
    }

    setIsLoading(true);

    try {
      const response = await fetch(`/api/search?q=${encodeURIComponent(searchQuery)}`);
      const data = await response.json();

      setResults(data.results || []);
      setSelectedIndex(0);
    } catch (error) {
      console.error('Search error:', error);
      setResults([]);
    } finally {
      setIsLoading(false);
    }
  }, []);

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

  const getIcon = (type: string) => {
    switch (type) {
      case 'gallery':
        return FileImage;
      case 'project':
        return FolderKanban;
      case 'schedule':
        return Calendar;
      default:
        return Search;
    }
  };

  const getTypeColor = (type: string) => {
    switch (type) {
      case 'gallery':
        return 'text-lmsy-yellow bg-lmsy-yellow/10 border-lmsy-yellow/20';
      case 'project':
        return 'text-lmsy-blue bg-lmsy-blue/10 border-lmsy-blue/20';
      case 'schedule':
        return 'text-purple-500 bg-purple-500/10 border-purple-500/20';
      default:
        return 'text-muted-foreground bg-muted';
    }
  };

  const highlightMatch = (text: string, query: string) => {
    if (!query) return text;

    const regex = new RegExp(`(${query.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')})`, 'gi');
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

  return (
    <>
      {/* Trigger Button - Icon only */}
      <button
        onClick={() => setIsOpen(true)}
        className="p-2 hover:bg-muted rounded-full transition-colors group"
        aria-label="Search"
      >
        <Search className="h-5 w-5 text-muted-foreground group-hover:text-foreground transition-colors" />
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
                  <Search className="h-5 w-5 text-muted-foreground" />
                  <input
                    ref={inputRef}
                    type="text"
                    value={query}
                    onChange={(e) => setQuery(e.target.value)}
                    placeholder="Search photos, projects, events..."
                    className="flex-1 bg-transparent text-foreground placeholder:text-muted-foreground focus:outline-none text-lg"
                  />
                  {query && (
                    <button
                      onClick={() => {
                        setQuery('');
                        setResults([]);
                      }}
                      className="p-1 hover:bg-muted rounded-full transition-colors"
                    >
                      <X className="h-5 w-5 text-muted-foreground" />
                    </button>
                  )}
                  <kbd className="hidden sm:inline-flex items-center gap-1 px-2 py-1 text-xs font-medium text-muted-foreground bg-muted rounded">
                    ESC
                  </kbd>
                </div>

                {/* Search Results */}
                <div className="max-h-[400px] overflow-y-auto">
                  {isLoading ? (
                    <div className="flex items-center justify-center py-12">
                      <div className="animate-spin rounded-full h-8 w-8 border-2 border-muted border-t-foreground" />
                    </div>
                  ) : query && results.length > 0 ? (
                    <div className="p-2">
                      {results.map((result, index) => {
                        const Icon = getIcon(result.type);
                        const isSelected = index === selectedIndex;

                        return (
                          <motion.button
                            key={result.id}
                            onClick={() => {
                              router.push(result.url);
                              setIsOpen(false);
                              setQuery('');
                              setResults([]);
                            }}
                            initial={{ opacity: 0, x: -10 }}
                            animate={{ opacity: 1, x: 0 }}
                            transition={{ delay: index * 0.05 }}
                            className={`w-full flex items-start gap-3 p-3 rounded-lg transition-all ${
                              isSelected
                                ? 'bg-gradient-to-r from-lmsy-yellow/10 to-lmsy-blue/10 border border-lmsy-yellow/20'
                                : 'hover:bg-muted'
                            }`}
                          >
                            <div className={`p-2 rounded-lg border ${getTypeColor(result.type)}`}>
                              <Icon className="h-4 w-4" />
                            </div>
                            <div className="flex-1 text-left">
                              <div className="font-medium text-foreground">
                                {highlightMatch(result.title, query)}
                              </div>
                              {result.description && (
                                <div className="text-sm text-muted-foreground line-clamp-1">
                                  {highlightMatch(result.description, query)}
                                </div>
                              )}
                              {result.subtitle && (
                                <div className="text-xs text-muted-foreground mt-1 flex items-center gap-1">
                                      <Hash className="h-3 w-3" />
                                      {result.subtitle}
                                </div>
                              )}
                            </div>
                          </motion.button>
                        );
                      })}
                    </div>
                  ) : query ? (
                    <div className="flex flex-col items-center justify-center py-12 text-center">
                      <Search className="h-12 w-12 text-muted-foreground/30 mb-3" />
                      <p className="text-muted-foreground">No results found for "{query}"</p>
                      <p className="text-sm text-muted-foreground mt-1">
                        Try different keywords or browse the gallery
                      </p>
                    </div>
                  ) : (
                    <div className="p-4">
                      <p className="text-sm text-muted-foreground mb-4">Quick Access</p>
                      <div className="grid grid-cols-2 gap-2">
                        {[
                          { label: 'Gallery', url: '/gallery', icon: FileImage, color: 'text-lmsy-yellow' },
                          { label: 'Projects', url: '/projects', icon: FolderKanban, color: 'text-lmsy-blue' },
                          { label: 'Profiles', url: '/profiles', icon: Hash, color: 'text-purple-500' },
                          { label: 'Schedule', url: '/schedule', icon: Calendar, color: 'text-green-500' },
                        ].map((item) => {
                          const Icon = item.icon;
                          return (
                            <button
                              key={item.label}
                              onClick={() => {
                                router.push(item.url);
                                setIsOpen(false);
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
                  <div className="flex items-center justify-between text-xs text-muted-foreground">
                    <div className="flex items-center gap-3">
                      <span className="hidden sm:inline">Use arrows to navigate</span>
                      <span>Enter to select</span>
                    </div>
                    <span>Esc to close</span>
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
