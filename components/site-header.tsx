'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Menu, X } from 'lucide-react';
import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Button } from '@/components/ui/button';
import { Sheet, SheetContent, SheetTrigger } from '@/components/ui/sheet';
import { Separator } from '@/components/ui/separator';
import { useLanguage } from '@/components/language-provider';
import { LanguageSwitcher } from '@/components/language-switcher';
import { SearchCommand } from '@/components/search-command';
import { t } from '@/lib/languages';

const mainNavItems = [
  { key: 'nav.chronicle', href: '/chronicle' },
  { key: 'nav.exhibitions', href: '/exhibitions' },
  { key: 'nav.editorial', href: '/editorial' },
  { key: 'nav.resonance', href: '/resonance' },
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
  const isHomePage = pathname === '/';

  return (
    <header
      className={`sticky top-0 z-50 w-full backdrop-blur-xl ${isHomePage ? 'border-b border-white/5' : ''}`}
      style={{ backgroundColor: 'rgba(255, 255, 255, 0.02)' }}
    >
      <div className={`${isHomePage ? 'container mx-auto px-4 sm:px-6 lg:px-8' : 'px-6 py-4'}`}>
        <div className={`flex ${isHomePage ? 'h-16' : 'h-auto'} items-center ${isHomePage ? 'justify-between' : 'justify-start'}`}>
          {/* 🌌 Logo - Bear-Rabbit Totem */}
          <div className="relative">
            <Link
              href="/"
              className="flex items-center gap-3 hover:opacity-80 transition-opacity"
            >
              <div className="relative h-8 w-8 md:h-9 md:w-9">
                {/* Bear-Rabbit Totem SVG */}
                <svg
                  viewBox="0 0 100 100"
                  className="w-full h-full"
                >
                  <defs>
                    {/* Portal-Bloom Filter */}
                    <filter id="portal-bloom-header" x="-100%" y="-100%" width="300%" height="300%">
                      <feGaussianBlur stdDeviation="2.5" result="coloredBlur" />
                      <feGaussianBlur stdDeviation="5" result="glowBlur" />
                      <feMerge>
                        <feMergeNode in="glowBlur" />
                        <feMergeNode in="coloredBlur" />
                        <feMergeNode in="SourceGraphic" />
                      </feMerge>
                    </filter>

                    {/* Horizon gradient */}
                    <linearGradient id="horizon-grad-header" x1="0%" y1="0%" x2="100%" y2="0%">
                      <stop offset="0%" stopColor="transparent" />
                      <stop offset="50%" stopColor="white" stopOpacity="0.4" />
                      <stop offset="100%" stopColor="transparent" />
                    </linearGradient>
                  </defs>

                  {/* Arced horizon line */}
                  <path
                    d="M 5 82 Q 50 75 95 82"
                    stroke="url(#horizon-grad-header)"
                    strokeWidth="0.8"
                    fill="none"
                  />

                  {/* Base reflection */}
                  <ellipse cx="50" cy="80" rx="35" ry="5" fill="white" className="opacity-[0.03]" />

                  {/* Dual Gates with Portal-Bloom */}
                  <g style={{ mixBlendMode: 'screen' }} filter="url(#portal-bloom-header)">
                    {/* Left: Bear Gate (Lookmhee) */}
                    <motion.path
                      d="M 18 80 C 18 30, 58 30, 58 80"
                      stroke="#FBBF24"
                      strokeWidth="2.8"
                      strokeLinecap="round"
                      fill="none"
                      style={{ filter: 'drop-shadow(0 0 8px rgba(251, 191, 36, 0.4)) drop-shadow(0 0 16px rgba(251, 191, 36, 0.2))' }}
                      animate={{
                        opacity: [0.5, 0.9, 0.5],
                        strokeWidth: [2.5, 2.8, 2.5]
                      }}
                      transition={{ duration: 5, repeat: Infinity, ease: "easeInOut" }}
                    />

                    {/* Right: Rabbit Gate (Sonya) */}
                    <motion.path
                      d="M 42 80 C 42 20, 82 20, 82 80"
                      stroke="#38BDF8"
                      strokeWidth="2.8"
                      strokeLinecap="round"
                      fill="none"
                      style={{ filter: 'drop-shadow(0 0 8px rgba(56, 189, 248, 0.4)) drop-shadow(0 0 16px rgba(56, 189, 248, 0.2))' }}
                      animate={{
                        opacity: [0.5, 0.9, 0.5],
                        strokeWidth: [2.5, 2.8, 2.5]
                      }}
                      transition={{ duration: 5, repeat: Infinity, ease: "easeInOut", delay: 1.5 }}
                    />
                  </g>

                  {/* Anchor stars */}
                  <circle cx="18" cy="80" r="1" fill="#FBBF24" className="animate-pulse" />
                  <circle cx="82" cy="80" r="1" fill="#38BDF8" className="animate-pulse" />
                </svg>
              </div>
              {isHomePage && (
                <span className="font-serif text-xl md:text-2xl font-bold tracking-tight bg-gradient-to-r from-lmsy-yellow to-lmsy-blue bg-clip-text text-transparent">
                  LMSY
                </span>
              )}
            </Link>
          </div>

          {/* Desktop Navigation - Only on Home */}
          {isHomePage && (
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
                        <div
                          className="relative min-w-[240px] backdrop-blur-xl rounded-lg overflow-hidden"
                          style={{
                            backgroundColor: 'rgba(255, 255, 255, 0.08)',
                            border: '1px solid rgba(255, 255, 255, 0.1)',
                          }}
                        >
                          <div className="py-2">
                            {dualitySubItems.map((subItem, index) => {
                              const isLMSY = subItem.key === 'nav.lmsy';
                              const isLookmhee = subItem.key === 'nav.lookmhee';
                              const isSonya = subItem.key === 'nav.sonya';

                              return (
                                <Link
                                  key={subItem.href}
                                  href={subItem.href}
                                  className="group relative flex items-center gap-3 px-5 py-3 font-serif text-xs uppercase tracking-[0.2em] text-white/70 hover:text-white/90 transition-all duration-300"
                                  style={{
                                    transitionDelay: `${index * 50}ms`,
                                  }}
                                >
                                  {/* Color indicator dot */}
                                  {isLookmhee && (
                                    <div
                                      className="h-1 w-1 rounded-full flex-shrink-0"
                                      style={{
                                        backgroundColor: 'rgba(251, 191, 36, 0.9)',
                                        boxShadow: '0 0 8px rgba(251, 191, 36, 0.5)',
                                      }}
                                    />
                                  )}
                                  {isSonya && (
                                    <div
                                      className="h-1 w-1 rounded-full flex-shrink-0"
                                      style={{
                                        backgroundColor: 'rgba(56, 189, 248, 0.9)',
                                        boxShadow: '0 0 8px rgba(56, 189, 248, 0.5)',
                                      }}
                                    />
                                  )}

                                  {/* Text with gradient color or hover color change */}
                                  <span
                                    className="flex-1"
                                    style={{
                                      ...(isLMSY && {
                                        background: 'linear-gradient(135deg, rgba(251, 191, 36, 0.8) 0%, rgba(56, 189, 248, 0.8) 100%)',
                                        WebkitBackgroundClip: 'text',
                                        WebkitTextFillColor: 'transparent',
                                        backgroundClip: 'text',
                                      }),
                                      ...(isLookmhee && {
                                        color: 'rgba(251, 191, 36, 0.8)',
                                      }),
                                      ...(isSonya && {
                                        color: 'rgba(56, 189, 248, 0.8)',
                                      }),
                                    }}
                                  >
                                    {t(language, subItem.key as any)}
                                  </span>

                                  {/* Hover gradient background for LMSY */}
                                  {isLMSY && (
                                    <motion.div
                                      className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-300"
                                      style={{
                                        background: 'linear-gradient(135deg, rgba(251, 191, 36, 0.2) 0%, rgba(56, 189, 248, 0.2) 100%)',
                                      }}
                                      initial={false}
                                    />
                                  )}

                                  {/* Hover glow for individual members */}
                                  {(isLookmhee || isSonya) && (
                                    <motion.div
                                      className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-300"
                                      style={{
                                        background: isLookmhee
                                          ? 'linear-gradient(90deg, rgba(251, 191, 36, 0.15) 0%, transparent 100%)'
                                          : 'linear-gradient(90deg, rgba(56, 189, 248, 0.15) 0%, transparent 100%)',
                                      }}
                                      initial={false}
                                    />
                                  )}
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
          )}

          {/* Theme Toggle, Language Switcher & Mobile Menu - Only on Home */}
          {isHomePage && (
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
                </div>
              </SheetContent>
            </Sheet>
          </div>
          )}
        </div>
      </div>
    </header>
  );
}
