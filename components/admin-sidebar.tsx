'use client';

import { useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  LayoutDashboard,
  Images,
  FolderKanban,
  FileText,
  PenTool,
  Upload,
  LogOut,
  Shield,
  X,
  ChevronLeft,
  ChevronRight,
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { cn } from '@/lib/utils';
import { useAuth } from '@/components/auth-provider';

const navSections = [
  {
    title: 'WORK 控制台',
    items: [
      { icon: LayoutDashboard, label: 'Dashboard', href: '/admin' },
      { icon: Upload, label: 'Bulk Upload', href: '/admin/upload' },
    ],
  },
  {
    title: 'COLLECTIONS 数据资产',
    items: [
      { icon: Images, label: 'Gallery', href: '/admin/gallery' },
      { icon: FolderKanban, label: 'Projects', href: '/admin/projects' },
    ],
  },
  {
    title: 'CURATION 策展表达',
    items: [
      { icon: FileText, label: 'Chronicle', href: '/admin/chronicle' },
      { icon: PenTool, label: 'Editorial', href: '/admin/editorial' },
    ],
  },
];

interface AdminSidebarProps {
  isCollapsed: boolean;
  onToggle: () => void;
}

export function AdminSidebar({ isCollapsed, onToggle }: AdminSidebarProps) {
  const pathname = usePathname();
  const { user, signOut } = useAuth();

  return (
    <>
      {/* Desktop Sidebar */}
      <aside
        className={cn(
          'hidden md:flex flex-col fixed left-0 top-0 z-50 h-screen border-r bg-black transition-all duration-300',
          isCollapsed ? 'w-20' : 'w-48'
        )}
        style={{ borderColor: 'rgba(255, 255, 255, 0.05)' }}
      >
        {/* Logo & Toggle */}
        <div className="flex h-14 items-center justify-between border-b px-4" style={{ borderColor: 'rgba(255, 255, 255, 0.05)' }}>
          {!isCollapsed && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="flex items-center gap-2 overflow-hidden"
            >
              <Shield className="h-5 w-5 text-lmsy-yellow/80 flex-shrink-0" strokeWidth={1.5} />
              <span className="font-serif text-base font-medium bg-gradient-to-r from-lmsy-yellow/90 to-lmsy-blue/90 bg-clip-text text-transparent whitespace-nowrap">
                LMSY.OS
              </span>
            </motion.div>
          )}
          {isCollapsed && (
            <div className="w-full flex justify-center">
              <Shield className="h-5 w-5 text-lmsy-yellow/80" strokeWidth={1.5} />
            </div>
          )}
          <button
            onClick={onToggle}
            className="rounded-lg p-1.5 hover:bg-white/5 transition-colors flex-shrink-0 text-white/40 hover:text-white/60"
            aria-label={isCollapsed ? 'Expand sidebar' : 'Collapse sidebar'}
          >
            {isCollapsed ? (
              <ChevronRight className="h-3.5 w-3.5" strokeWidth={1.5} />
            ) : (
              <ChevronLeft className="h-3.5 w-3.5" strokeWidth={1.5} />
            )}
          </button>
        </div>

        {/* Navigation */}
        <nav className="flex-1 overflow-y-auto py-4 px-3 space-y-6">
          {navSections.map((section) => (
            <div key={section.title}>
              {!isCollapsed && (
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  className="px-3 mb-2"
                >
                  <h3 className="text-[10px] font-medium text-white/30 uppercase tracking-widest">
                    {section.title}
                  </h3>
                </motion.div>
              )}
              <div className="space-y-0.5">
                {section.items.map((item) => {
                  const Icon = item.icon;
                  const isActive = pathname?.startsWith(item.href);

                  return (
                    <Link
                      key={item.href}
                      href={item.href}
                      className={cn(
                        'flex items-center gap-3 rounded-lg px-3 py-2 transition-all duration-200 relative overflow-hidden group',
                        isActive
                          ? 'text-white/90 font-medium'
                          : 'text-white/40 hover:text-white/70'
                      )}
                    >
                      {/* Glow effect for active item */}
                      {isActive && (
                        <motion.div
                          layoutId="activeGlow"
                          className="absolute inset-0 bg-gradient-to-r from-lmsy-yellow/5 to-lmsy-blue/5 rounded-lg"
                          style={{
                                boxShadow: isActive ? '0 0 20px rgba(251, 191, 36, 0.1), 0 0 40px rgba(56, 189, 248, 0.05)' : 'none',
                          }}
                          initial={{ opacity: 0 }}
                          animate={{ opacity: 1 }}
                          transition={{ duration: 0.3 }}
                        />
                      )}
                      <Icon className="h-4 w-4 flex-shrink-0" strokeWidth={1.5} />
                      <AnimatePresence mode="wait">
                        {!isCollapsed && (
                          <motion.span
                            initial={{ opacity: 0, x: -10 }}
                            animate={{ opacity: 1, x: 0 }}
                            exit={{ opacity: 0, x: -10 }}
                            transition={{ duration: 0.2 }}
                            className="font-light text-sm whitespace-nowrap"
                          >
                            {item.label}
                          </motion.span>
                        )}
                      </AnimatePresence>
                    </Link>
                  );
                })}
              </div>
            </div>
          ))}
        </nav>

        {/* Sign Out - Minimal */}
        <div className="border-t p-3" style={{ borderColor: 'rgba(255, 255, 255, 0.05)' }}>
          <button
            onClick={signOut}
            className={cn(
              'w-full flex items-center justify-center gap-2 p-2 rounded-lg text-white/30 hover:text-red-400/80 hover:bg-red-500/5 transition-all duration-200',
              !isCollapsed && 'px-4'
            )}
            aria-label="Sign out"
          >
            <LogOut className="h-3.5 w-3.5" strokeWidth={1.5} />
            <AnimatePresence mode="wait">
              {!isCollapsed && (
                <motion.span
                  initial={{ opacity: 0, x: -10 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -10 }}
                  transition={{ duration: 0.2 }}
                  className="text-xs font-mono tracking-wider whitespace-nowrap"
                >
                  SIGN OUT
                </motion.span>
              )}
            </AnimatePresence>
          </button>
        </div>
      </aside>

      {/* Mobile Header */}
      <div className="md:hidden fixed top-0 left-0 right-0 z-50 h-14 bg-black/95 backdrop-blur-xl border-b flex items-center justify-between px-4" style={{ borderColor: 'rgba(255, 255, 255, 0.05)' }}>
        <div className="flex items-center gap-2">
          <Shield className="h-5 w-5 text-lmsy-yellow/80" strokeWidth={1.5} />
          <span className="font-serif text-base font-medium bg-gradient-to-r from-lmsy-yellow/90 to-lmsy-blue/90 bg-clip-text text-transparent">
            LMSY.OS
          </span>
        </div>
        <Link
          href="/"
          className="p-2 rounded-lg hover:bg-white/5 transition-colors text-white/40"
          aria-label="Exit admin"
        >
          <X className="h-4 w-4" strokeWidth={1.5} />
        </Link>
      </div>
    </>
  );
}
