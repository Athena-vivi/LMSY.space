'use client';

import Link from 'next/link';
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
 * Homepage header. Same four entries as every inner page, but with the softer
 * glass treatment the hero sits behind. Search keeps the centre seat.
 */
const LEFT_ITEMS = mainNavItems.slice(0, 2);
const RIGHT_ITEMS = mainNavItems.slice(2);

export function HomeHeader() {
  const [isOpen, setIsOpen] = useState(false);
  const { language } = useLanguage();

  const renderLink = (item: (typeof mainNavItems)[number]) => (
    <Link
      key={item.href}
      href={item.href}
      className="group relative font-serif text-sm uppercase tracking-[0.15em] text-ink-2 transition-colors duration-300 hover:text-ink py-2 inline-block"
    >
      {t(language, item.key as TranslationKey)}
      <motion.span
        className="absolute bottom-0 left-0 right-0 h-[1px] bg-gradient-to-r from-lmsy-yellow to-lmsy-blue"
        initial={{ scaleX: 0, opacity: 0 }}
        whileHover={{ scaleX: 1, opacity: 1 }}
        transition={{ duration: 0.4, ease: 'easeInOut' }}
      />
    </Link>
  );

  return (
    <header
      className="sticky top-0 z-50 w-full backdrop-blur-xl border-b border-white/5"
      style={{ backgroundColor: 'rgba(255, 255, 255, 0.02)' }}
    >
      <div className="container mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex h-16 items-center justify-between gap-4">
          {/* Logo */}
          <Link href="/" className="flex items-center gap-3 hover:opacity-80 transition-opacity shrink-0">
            <div className="relative h-8 w-8 md:h-9 md:w-9">
              <motion.div
                className="absolute inset-0 rounded-full"
                style={{
                  background:
                    'linear-gradient(135deg, rgba(251, 191, 36, 0.3) 0%, rgba(56, 189, 248, 0.3) 100%)',
                  filter: 'blur(8px)',
                }}
                animate={{ opacity: [0.3, 0.6, 0.3], scale: [1, 1.1, 1] }}
                transition={{ duration: 3, repeat: Infinity, ease: 'easeInOut' }}
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
                      transition={{ delay: index * 0.1 }}
                    >
                      <Link
                        href={item.href}
                        onClick={() => setIsOpen(false)}
                        className="block py-2 font-serif text-lg uppercase tracking-wider font-medium transition-colors hover:text-ink text-ink-2"
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
