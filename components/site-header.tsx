'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Menu, X } from 'lucide-react';
import { useState } from 'react';
import Image from 'next/image';
import { motion, AnimatePresence } from 'framer-motion';
import { Button } from '@/components/ui/button';
import { Sheet, SheetContent, SheetTrigger } from '@/components/ui/sheet';
import { Separator } from '@/components/ui/separator';
import { useLanguage } from '@/components/language-provider';
import { LanguageSwitcher } from '@/components/language-switcher';
import { SearchCommand } from '@/components/search-command';
import { t } from '@/lib/languages';
import { mainNavItems, dualitySubItems } from '@/lib/nav-items';

/**
 * Global inner-page header. Mounted in the root layout; hidden on the
 * homepage (home header owns that) and on /admin (admin has its own shell).
 * Fixes P1: inner pages previously had no navigation at all.
 */
export function SiteHeader() {
  const pathname = usePathname();
  const [isOpen, setIsOpen] = useState(false);
  const [dualityOpen, setDualityOpen] = useState(false);
  const { language } = useLanguage();

  // Homepage keeps its immersive home-header; admin has its own layout.
  if (pathname === '/' || pathname.startsWith('/admin')) return null;

  const isActive = (href: string) =>
    href !== '#' && (pathname === href || pathname.startsWith(href + '/'));

  return (
    <header className="sticky top-0 z-50 w-full backdrop-blur-xl border-b border-white/10" style={{ backgroundColor: 'rgba(10, 10, 10, 0.85)' }}>
      <div className="container mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex h-16 items-center justify-between">
          {/* Logo */}
          <Link href="/" className="flex items-center gap-3 hover:opacity-80 transition-opacity">
            <div className="relative h-8 w-8 md:h-9 md:w-9">
              <div
                className="absolute inset-0 rounded-full"
                style={{
                  background: 'linear-gradient(135deg, rgba(251, 191, 36, 0.3) 0%, rgba(56, 189, 248, 0.3) 100%)',
                  filter: 'blur(8px)',
                }}
              />
              <Image
                src="/lmsy-logo.png"
                alt="LMSY Logo"
                fill
                className="object-contain relative z-10"
                sizes="32px"
                priority
              />
            </div>
            <span className="font-serif text-xl md:text-2xl font-bold tracking-tight bg-gradient-to-r from-lmsy-yellow to-lmsy-blue bg-clip-text text-transparent">
              LMSY
            </span>
          </Link>

          {/* Desktop Navigation */}
          <nav className="hidden md:flex md:items-center md:space-x-6 lg:space-x-10">
            {mainNavItems.map((item) => (
              <div
                key={item.href}
                className="relative"
                onMouseEnter={() => item.hasDropdown && setDualityOpen(true)}
                onMouseLeave={() => item.hasDropdown && setDualityOpen(false)}
              >
                <Link
                  href={item.href}
                  className={`group relative font-serif text-sm uppercase tracking-[0.15em] transition-colors duration-300 py-2 inline-block ${
                    isActive(item.href) ? 'text-ink' : 'text-ink-2 hover:text-ink'
                  }`}
                >
                  {t(language, item.key as any)}
                  <span
                    className={`absolute bottom-0 left-0 right-0 h-[1px] bg-gradient-to-r from-lmsy-yellow to-lmsy-blue transition-opacity duration-300 ${
                      isActive(item.href) ? 'opacity-100' : 'opacity-0 group-hover:opacity-100'
                    }`}
                  />
                </Link>

                {/* DUALITY Dropdown Menu */}
                {item.hasDropdown && (
                  <AnimatePresence>
                    {dualityOpen && (
                      <motion.div
                        initial={{ opacity: 0, y: -10 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -10 }}
                        transition={{ duration: 0.2 }}
                        className="absolute top-full left-1/2 -translate-x-1/2 pt-4"
                      >
                        <div
                          className="relative min-w-[240px] backdrop-blur-xl rounded-lg overflow-hidden"
                          style={{
                            backgroundColor: 'rgba(26, 26, 26, 0.95)',
                            border: '1px solid rgba(255, 255, 255, 0.12)',
                          }}
                        >
                          <div className="py-2">
                            {dualitySubItems.map((subItem) => {
                              const isLMSY = subItem.key === 'nav.lmsy';
                              const isLookmhee = subItem.key === 'nav.lookmhee';
                              const isSonya = subItem.key === 'nav.sonya';

                              return (
                                <Link
                                  key={subItem.href}
                                  href={subItem.href}
                                  className={`group relative flex items-center gap-3 px-5 py-3 font-serif text-xs uppercase tracking-[0.2em] transition-all duration-300 ${
                                    isActive(subItem.href) ? 'text-ink' : 'text-ink-2 hover:text-ink'
                                  }`}
                                >
                                  {isLookmhee && (
                                    <div
                                      className="h-1 w-1 rounded-full flex-shrink-0"
                                      style={{ backgroundColor: 'rgba(251, 191, 36, 0.9)' }}
                                    />
                                  )}
                                  {isSonya && (
                                    <div
                                      className="h-1 w-1 rounded-full flex-shrink-0"
                                      style={{ backgroundColor: 'rgba(56, 189, 248, 0.9)' }}
                                    />
                                  )}
                                  <span
                                    className="flex-1"
                                    style={{
                                      ...(isLMSY && {
                                        background: 'linear-gradient(135deg, rgba(251, 191, 36, 0.8) 0%, rgba(56, 189, 248, 0.8) 100%)',
                                        WebkitBackgroundClip: 'text',
                                        WebkitTextFillColor: 'transparent',
                                        backgroundClip: 'text',
                                      }),
                                      ...(isLookmhee && { color: 'rgba(251, 191, 36, 0.8)' }),
                                      ...(isSonya && { color: 'rgba(56, 189, 248, 0.8)' }),
                                    }}
                                  >
                                    {t(language, subItem.key as any)}
                                  </span>
                                </Link>
                              );
                            })}
                          </div>
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>
                )}
              </div>
            ))}
          </nav>

          {/* Language Switcher & Mobile Menu */}
          <div className="flex items-center space-x-2">
            <SearchCommand />
            <div className="hidden md:flex items-center gap-6">
              <LanguageSwitcher />
            </div>

            {/* Mobile Navigation */}
            <Sheet open={isOpen} onOpenChange={setIsOpen}>
              <SheetTrigger asChild className="md:hidden">
                <Button variant="ghost" size="icon">
                  {isOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
                  <span className="sr-only">Toggle menu</span>
                </Button>
              </SheetTrigger>
              <SheetContent side="right" className="w-[300px] sm:w-[400px]">
                <nav className="flex flex-col space-y-4 mt-8">
                  {mainNavItems.map((item, index) => (
                    <motion.div
                      key={item.href}
                      initial={{ opacity: 0, x: 20 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: index * 0.05 }}
                    >
                      <Link
                        href={item.href}
                        onClick={() => setIsOpen(false)}
                        className={`block py-2 font-serif text-lg uppercase tracking-wider font-medium transition-colors ${
                          isActive(item.href) ? 'text-ink' : 'text-ink-2 hover:text-ink'
                        }`}
                      >
                        {t(language, item.key as any)}
                      </Link>

                      {item.hasDropdown && (
                        <div className="ml-6 mt-2 space-y-2">
                          {dualitySubItems.map((subItem) => (
                            <Link
                              key={subItem.href}
                              href={subItem.href}
                              onClick={() => setIsOpen(false)}
                              className="block py-1 text-sm text-ink-2 hover:text-ink transition-colors"
                            >
                              {t(language, subItem.key as any)}
                            </Link>
                          ))}
                        </div>
                      )}

                      {index < mainNavItems.length - 1 && <Separator className="mt-2" />}
                    </motion.div>
                  ))}
                </nav>
                <div className="mt-8 space-y-4">
                  <div className="flex items-center gap-2">
                    <LanguageSwitcher />
                    <span className="text-sm text-ink-2">Language</span>
                  </div>
                </div>
              </SheetContent>
            </Sheet>
          </div>
        </div>
      </div>
    </header>
  );
}
