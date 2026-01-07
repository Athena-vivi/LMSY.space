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
import { useBanner } from '@/components/construction-banner';
import { LanguageSwitcher } from '@/components/language-switcher';
import { ThemeSwitcher } from '@/components/theme-switcher';
import { SearchCommand } from '@/components/search-command';
import { t } from '@/lib/languages';

const mainNavItems = [
  { key: 'nav.chronicle', href: '/chronicle' },
  { key: 'nav.exhibitions', href: '/exhibitions' },
  { key: 'nav.editorial', href: '/editorial' },
  { key: 'nav.duality', href: '#', hasDropdown: true },
];

const dualitySubItems = [
  { key: 'nav.lmsy', href: '/profiles' },
  { key: 'nav.lookmhee', href: '/profiles/lookmhee' },
  { key: 'nav.sonya', href: '/profiles/sonya' },
];

export function SiteHeader() {
  const pathname = usePathname();
  const [isOpen, setIsOpen] = useState(false);
  const [dualityOpen, setDualityOpen] = useState(false);
  const { language } = useLanguage();
  const { showBanner } = useBanner();

  const handleLogoClick = () => {
    showBanner();
  };

  return (
    <header className="sticky top-0 z-50 w-full border-b border-border/50 bg-background/80 backdrop-blur-md supports-[backdrop-filter]:bg-background/60">
      <div className="container mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex h-16 items-center justify-between">
          {/* Logo */}
          {pathname === '/' ? (
            // On homepage: button to show banner
            <button
              onClick={handleLogoClick}
              className="flex items-center gap-3 hover:opacity-80 transition-opacity"
              title="Click to view announcement"
            >
              <div className="relative h-8 w-8 md:h-9 md:w-9">
                <Image
                  src="/lmsy-logo.png"
                  alt="LMSY Logo"
                  fill
                  className="object-contain"
                  priority
                />
              </div>
              <span className="font-serif text-xl md:text-2xl font-bold tracking-tight bg-gradient-to-r from-lmsy-yellow to-lmsy-blue bg-clip-text text-transparent">
                LMSY
              </span>
            </button>
          ) : (
            // On other pages: link to homepage
            <Link
              href="/"
              className="flex items-center gap-3 hover:opacity-80 transition-opacity"
              title="Go to homepage"
            >
              <div className="relative h-8 w-8 md:h-9 md:w-9">
                <Image
                  src="/lmsy-logo.png"
                  alt="LMSY Logo"
                  fill
                  className="object-contain"
                  priority
                />
              </div>
              <span className="font-serif text-xl md:text-2xl font-bold tracking-tight bg-gradient-to-r from-lmsy-yellow to-lmsy-blue bg-clip-text text-transparent">
                LMSY
              </span>
            </Link>
          )}

          {/* Desktop Navigation */}
          <nav className="hidden md:flex md:items-center md:space-x-8 lg:space-x-12">
            {mainNavItems.map((item) => (
              <div
                key={item.href}
                className="relative"
                onMouseEnter={() => item.hasDropdown && setDualityOpen(true)}
                onMouseLeave={() => item.hasDropdown && setDualityOpen(false)}
              >
                <Link
                  href={item.href}
                  className="group relative font-serif text-sm uppercase tracking-[0.15em] text-muted-foreground transition-colors duration-300 hover:text-foreground py-2 inline-block"
                >
                  {t(language, item.key as any)}

                  {/* Gradient underline on hover */}
                  <motion.span
                    className="absolute bottom-0 left-0 right-0 h-[1px] bg-gradient-to-r from-lmsy-yellow to-lmsy-blue"
                    initial={{ scaleX: 0, opacity: 0 }}
                    whileHover={{ scaleX: 1, opacity: 1 }}
                    transition={{ duration: 0.4, ease: 'easeInOut' }}
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
                        <div className="relative min-w-[200px] bg-background/90 backdrop-blur-xl rounded-xl border border-border/50 shadow-2xl overflow-hidden">
                          {/* Dropdown arrow */}
                          <div className="absolute top-0 left-1/2 -translate-x-1/2 -translate-y-1 w-2 h-2 bg-background/90 backdrop-blur-xl border-l border-t border-border/50 transform rotate-45" />

                          <div className="py-2">
                            {dualitySubItems.map((subItem, index) => (
                              <Link
                                key={subItem.href}
                                href={subItem.href}
                                className="block px-6 py-3 font-serif text-xs uppercase tracking-wider text-muted-foreground hover:text-foreground hover:bg-muted/50 transition-all duration-200"
                                style={{
                                  transitionDelay: `${index * 50}ms`,
                                }}
                              >
                                {t(language, subItem.key as any)}
                              </Link>
                            ))}
                          </div>
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>
                )}
              </div>
            ))}
          </nav>

          {/* Theme Toggle, Language Switcher & Mobile Menu */}
          <div className="flex items-center space-x-2">
            <SearchCommand />
            <div className="hidden md:flex items-center gap-6">
              <LanguageSwitcher />
              <span className="text-muted-foreground/40 text-xs">|</span>
              <ThemeSwitcher />
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
                  <AnimatePresence>
                    {mainNavItems.map((item, index) => (
                      <motion.div
                        key={item.href}
                        initial={{ opacity: 0, x: 20 }}
                        animate={{ opacity: 1, x: 0 }}
                        exit={{ opacity: 0, x: 20 }}
                        transition={{ delay: index * 0.1 }}
                      >
                        <Link
                          href={item.href}
                          onClick={() => setIsOpen(false)}
                          className="block py-2 font-serif text-lg uppercase tracking-wider font-medium transition-colors hover:text-foreground text-muted-foreground"
                        >
                          {t(language, item.key as any)}
                        </Link>

                        {/* Mobile dropdown for DUALITY */}
                        {item.hasDropdown && (
                          <div className="ml-6 mt-2 space-y-2">
                            {dualitySubItems.map((subItem) => (
                              <Link
                                key={subItem.href}
                                href={subItem.href}
                                onClick={() => setIsOpen(false)}
                                className="block py-1 text-sm text-muted-foreground hover:text-foreground transition-colors"
                              >
                                {t(language, subItem.key as any)}
                              </Link>
                            ))}
                          </div>
                        )}

                        {index < mainNavItems.length - 1 && <Separator className="mt-2" />}
                      </motion.div>
                    ))}
                  </AnimatePresence>
                </nav>
                <div className="mt-8 space-y-4">
                  <div className="flex items-center gap-2">
                    <LanguageSwitcher />
                    <span className="text-sm text-muted-foreground">Language</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <ThemeSwitcher />
                    <span className="text-sm text-muted-foreground">Theme</span>
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
