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
    title: 'Main',
    items: [
      { icon: LayoutDashboard, label: 'Dashboard', href: '/admin' },
      { icon: Upload, label: 'Bulk Upload', href: '/admin/upload' },
    ],
  },
  {
    title: 'Collections',
    items: [
      { icon: Images, label: 'Gallery', href: '/admin/gallery' },
      { icon: FolderKanban, label: 'Projects', href: '/admin/projects' },
      { icon: FileText, label: 'Chronicle', href: '/admin/chronicle' },
    ],
  },
  {
    title: 'Content',
    items: [
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
          'hidden md:flex fixed left-0 top-0 z-50 h-screen border-r bg-card/95 backdrop-blur-xl transition-all duration-300',
          isCollapsed ? 'w-20' : 'w-72'
        )}
      >
        {/* Logo & Toggle */}
        <div className="flex h-16 items-center justify-between border-b px-4">
          {!isCollapsed && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="flex items-center gap-2 overflow-hidden"
            >
              <Shield className="h-6 w-6 text-lmsy-yellow flex-shrink-0" />
              <span className="font-serif text-lg font-bold bg-gradient-to-r from-lmsy-yellow to-lmsy-blue bg-clip-text text-transparent whitespace-nowrap">
                Admin Portal
              </span>
            </motion.div>
          )}
          {isCollapsed && (
            <div className="w-full flex justify-center">
              <Shield className="h-6 w-6 text-lmsy-yellow" />
            </div>
          )}
          <button
            onClick={onToggle}
            className="rounded-lg p-2 hover:bg-muted transition-colors flex-shrink-0"
            aria-label={isCollapsed ? 'Expand sidebar' : 'Collapse sidebar'}
          >
            {isCollapsed ? (
              <ChevronRight className="h-4 w-4" />
            ) : (
              <ChevronLeft className="h-4 w-4" />
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
                  <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                    {section.title}
                  </h3>
                </motion.div>
              )}
              <div className="space-y-1">
                {section.items.map((item) => {
                  const Icon = item.icon;
                  const isActive = pathname?.startsWith(item.href);

                  return (
                    <Link
                      key={item.href}
                      href={item.href}
                      className={cn(
                        'flex items-center gap-3 rounded-lg px-3 py-2.5 transition-all duration-200 relative overflow-hidden group',
                        isActive
                          ? 'bg-gradient-to-r from-lmsy-yellow/20 to-lmsy-blue/20 text-foreground font-medium'
                          : 'text-muted-foreground hover:bg-muted hover:text-foreground'
                      )}
                    >
                      {isActive && (
                        <motion.div
                          layoutId="activeTab"
                          className="absolute left-0 top-0 bottom-0 w-0.5 bg-gradient-to-b from-lmsy-yellow to-lmsy-blue"
                        />
                      )}
                      <Icon className="h-5 w-5 flex-shrink-0" />
                      <AnimatePresence mode="wait">
                        {!isCollapsed && (
                          <motion.span
                            initial={{ opacity: 0, x: -10 }}
                            animate={{ opacity: 1, x: 0 }}
                            exit={{ opacity: 0, x: -10 }}
                            transition={{ duration: 0.2 }}
                            className="font-medium whitespace-nowrap"
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

        {/* User & Sign Out */}
        <div className="border-t p-3 space-y-2">
          {!isCollapsed && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="px-3 py-2 rounded-lg bg-muted/50 mb-2"
            >
              <p className="text-xs text-muted-foreground">Signed in as</p>
              <p className="text-sm font-medium truncate">{user?.email}</p>
            </motion.div>
          )}
          <button
            onClick={signOut}
            className={cn(
              'w-full flex items-center gap-3 rounded-lg px-3 py-2.5 text-muted-foreground transition-colors hover:bg-red-500/10 hover:text-red-500',
              isCollapsed && 'justify-center'
            )}
          >
            <LogOut className="h-5 w-5 flex-shrink-0" />
            <AnimatePresence mode="wait">
              {!isCollapsed && (
                <motion.span
                  initial={{ opacity: 0, x: -10 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -10 }}
                  transition={{ duration: 0.2 }}
                  className="font-medium whitespace-nowrap"
                >
                  Sign Out
                </motion.span>
              )}
            </AnimatePresence>
          </button>
        </div>
      </aside>

      {/* Mobile Header */}
      <div className="md:hidden fixed top-0 left-0 right-0 z-50 h-16 bg-card/95 backdrop-blur-xl border-b flex items-center justify-between px-4">
        <div className="flex items-center gap-2">
          <Shield className="h-6 w-6 text-lmsy-yellow" />
          <span className="font-serif text-lg font-bold bg-gradient-to-r from-lmsy-yellow to-lmsy-blue bg-clip-text text-transparent">
            Admin Portal
          </span>
        </div>
        <Link
          href="/"
          className="p-2 rounded-lg hover:bg-muted transition-colors"
          aria-label="Exit admin"
        >
          <X className="h-5 w-5" />
        </Link>
      </div>
    </>
  );
}
