'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Menu, X } from 'lucide-react';
import { useState } from 'react';
import Image from 'next/image';
import { motion } from 'framer-motion';
import { Button } from '@/components/ui/button';
import { Sheet, SheetContent, SheetTrigger } from '@/components/ui/sheet';
import { Separator } from '@/components/ui/separator';
import { useLanguage } from '@/components/language-provider';
import { LanguageSwitcher } from '@/components/language-switcher';
import { SearchCommand } from '@/components/search-command';
import { t, type TranslationKey } from '@/lib/languages';
import { mainNavItems } from '@/lib/nav-items';

/**
 * Global inner-page header. Mounted in the root layout; hidden on the
 * homepage (home header owns that) and on /admin (admin has its own shell).
 *
 * Phase 7: four entries split two-and-two around the search trigger, so the
 * search sits at the visual centre of the bar instead of being parked next to
 * the language switcher.
 */

/** Search takes the middle seat: two entries, search, two entries. */
const LEFT_ITEMS = mainNavItems.slice(0, 2);
const RIGHT_ITEMS = mainNavItems.slice(2);

export function SiteHeader() {
  const pathname = usePathname();
  const [isOpen, setIsOpen] = useState(false);
  const { language } = useLanguage();

  // Homepage keeps its immersive home-header; admin has its own layout.
  if (pathname === '/' || pathname.startsWith('/admin')) return null;

  const isActive = (href: string) =>
    href !== '#' && (pathname === href || pathname.startsWith(href + '/'));

  const renderLink = (item: (typeof mainNavItems)[number]) => (
    <Link
      key={item.href}
      href={item.href}
      className={`group relative font-serif text-sm uppercase tracking-[0.15em] transition-colors duration-300 py-2 inline-block ${
        isActive(item.href) ? 'text-ink' : 'text-ink-2 hover:text-ink'
      }`}
    >
      {t(language, item.key as TranslationKey)}
      <span
        className={`absolute bottom-0 left-0 right-0 h-[1px] bg-gradient-to-r from-lmsy-yellow to-lmsy-blue transition-opacity duration-300 ${
          isActive(item.href) ? 'opacity-100' : 'opacity-0 group-hover:opacity-100'
        }`}
      />
    </Link>
  );

  return (
    <header
      className="sticky top-0 z-50 w-full backdrop-blur-xl border-b border-white/10"
      style={{ backgroundColor: 'rgba(10, 10, 10, 0.85)' }}
    >
      <div className="container mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex h-16 items-center justify-between gap-4">
          {/* Logo */}
          <Link href="/" className="flex items-center gap-3 hover:opacity-80 transition-opacity shrink-0">
            <div className="relative h-8 w-8 md:h-9 md:w-9">
              <div
                className="absolute inset-0 rounded-full"
                style={{
                  background:
                    'linear-gradient(135deg, rgba(251, 191, 36, 0.3) 0%, rgba(56, 189, 248, 0.3) 100%)',
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

          {/* Desktop Navigation - search in the middle */}
          <nav className="hidden md:flex md:flex-1 md:items-center md:justify-center md:gap-6 lg:gap-8">
            {LEFT_ITEMS.map(renderLink)}
            <div className="flex-1 max-w-[280px] min-w-[180px]">
              <SearchCommand variant="bar" />
            </div>
            {RIGHT_ITEMS.map(renderLink)}
          </nav>

          {/* Language Switcher & Mobile Menu */}
          <div className="flex items-center space-x-2 shrink-0">
            <div className="md:hidden">
              <SearchCommand variant="icon" />
            </div>
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
                        {t(language, item.key as TranslationKey)}
                      </Link>
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
