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
import { useTheme } from '@/components/theme-provider';
import { useLanguage } from '@/components/language-provider';
import { LanguageSwitcher } from '@/components/language-switcher';
import { ThemeSwitcher } from '@/components/theme-switcher';
import { t } from '@/lib/languages';

const navItems = [
  { key: 'nav.home', href: '/' },
  { key: 'nav.profiles', href: '/profiles' },
  { key: 'nav.gallery', href: '/gallery' },
  { key: 'nav.projects', href: '/projects' },
  { key: 'nav.schedule', href: '/schedule' },
];

export function SiteHeader() {
  const pathname = usePathname();
  const [isOpen, setIsOpen] = useState(false);
  const { theme, setTheme } = useTheme();
  const { language } = useLanguage();
  const [isLogoHovered, setIsLogoHovered] = useState(false);

  return (
    <header className="sticky top-0 z-50 w-full border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="container mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex h-16 items-center justify-between">
          {/* Logo */}
          <Link
            href="/"
            className="flex items-center gap-3"
            onMouseEnter={() => setIsLogoHovered(true)}
            onMouseLeave={() => setIsLogoHovered(false)}
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
            <div className="relative">
              <span className="font-serif text-xl md:text-2xl font-bold tracking-tight bg-gradient-to-r from-lmsy-yellow to-lmsy-blue bg-clip-text text-transparent">
                LMSY
              </span>
              <AnimatePresence>
                {isLogoHovered && (
                  <motion.div
                    initial={{ opacity: 0, y: 5 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: 5 }}
                    transition={{ duration: 0.2 }}
                    className="absolute -bottom-6 left-1/2 -translate-x-1/2 whitespace-nowrap text-xs bg-gradient-to-r from-lmsy-yellow to-lmsy-blue bg-clip-text text-transparent font-medium"
                  >
                    Hello, Besties! 💛💙
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          </Link>

          {/* Desktop Navigation */}
          <nav className="hidden md:flex md:items-center md:space-x-8">
            {navItems.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                className={`text-sm font-medium transition-all duration-300 hover:text-transparent hover:bg-gradient-to-r hover:from-lmsy-yellow hover:to-lmsy-blue hover:bg-clip-text ${
                  pathname === item.href
                    ? 'text-transparent bg-gradient-to-r from-lmsy-yellow to-lmsy-blue bg-clip-text border-b-2 border-lmsy-yellow pb-0.5'
                    : 'text-muted-foreground'
                }`}
              >
                {t(language, item.key as any)}
              </Link>
            ))}
          </nav>

          {/* Theme Toggle, Language Switcher & Mobile Menu */}
          <div className="flex items-center space-x-2">
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
                    {navItems.map((item, index) => (
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
                          className={`block py-2 text-lg font-medium transition-colors hover:text-primary ${
                            pathname === item.href
                              ? 'text-primary'
                              : 'text-muted-foreground'
                          }`}
                        >
                          {t(language, item.key as any)}
                        </Link>
                        {index < navItems.length - 1 && <Separator className="mt-2" />}
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
