'use client';

import { useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Upload, Images, FolderKanban, Calendar, Settings, LogOut, Shield } from 'lucide-react';
import { motion } from 'framer-motion';
import { cn } from '@/lib/utils';

const navItems = [
  { icon: Upload, label: 'Bulk Upload', href: '/admin/upload' },
  { icon: Images, label: 'Gallery', href: '/admin/gallery' },
  { icon: FolderKanban, label: 'Projects', href: '/admin/projects' },
  { icon: Calendar, label: 'Schedule', href: '/admin/schedule' },
  { icon: Settings, label: 'Settings', href: '/admin/settings' },
];

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const [isCollapsed, setIsCollapsed] = useState(false);

  return (
    <div className="min-h-screen bg-background">
      {/* Sidebar */}
      <aside
        className={cn(
          'fixed left-0 top-0 z-50 h-screen border-r bg-card transition-all duration-300',
          isCollapsed ? 'w-20' : 'w-64'
        )}
      >
        {/* Logo */}
        <div className="flex h-16 items-center justify-between border-b px-6">
          {!isCollapsed && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="flex items-center gap-2"
            >
              <Shield className="h-6 w-6 text-lmsy-yellow" />
              <span className="font-serif text-lg font-bold bg-gradient-to-r from-lmsy-yellow to-lmsy-blue bg-clip-text text-transparent">
                Admin Master
              </span>
            </motion.div>
          )}
          <button
            onClick={() => setIsCollapsed(!isCollapsed)}
            className="rounded-lg p-2 hover:bg-muted transition-colors"
          >
            <motion.div
              animate={{ rotate: isCollapsed ? 180 : 0 }}
              transition={{ duration: 0.3 }}
            >
              <Upload className="h-4 w-4" />
            </motion.div>
          </button>
        </div>

        {/* Navigation */}
        <nav className="space-y-2 p-4">
          {navItems.map((item) => {
            const isActive = pathname?.startsWith(item.href);
            const Icon = item.icon;

            return (
              <Link
                key={item.href}
                href={item.href}
                className={cn(
                  'flex items-center gap-3 rounded-lg px-4 py-3 transition-all duration-200',
                  isActive
                    ? 'bg-gradient-to-r from-lmsy-yellow/20 to-lmsy-blue/20 text-lmsy-yellow font-medium border border-lmsy-yellow/30'
                    : 'text-muted-foreground hover:bg-muted hover:text-foreground'
                )}
              >
                <Icon className="h-5 w-5 flex-shrink-0" />
                {!isCollapsed && (
                  <motion.span
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    className="font-medium"
                  >
                    {item.label}
                  </motion.span>
                )}
              </Link>
            );
          })}
        </nav>

        {/* Bottom Actions */}
        <div className="absolute bottom-0 left-0 right-0 border-t p-4">
          <Link
            href="/"
            className={cn(
              'flex items-center gap-3 rounded-lg px-4 py-3 text-muted-foreground transition-colors hover:bg-muted hover:text-foreground'
            )}
          >
            <LogOut className="h-5 w-5 flex-shrink-0" />
            {!isCollapsed && (
              <motion.span
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="font-medium"
              >
                Exit Admin
              </motion.span>
            )}
          </Link>
        </div>
      </aside>

      {/* Main Content */}
      <main
        className={cn(
          'transition-all duration-300',
          isCollapsed ? 'ml-20' : 'ml-64'
        )}
      >
        {/* Welcome Header */}
        <div className="border-b bg-card/50 backdrop-blur-sm sticky top-0 z-40">
          <div className="container mx-auto px-6 py-4">
            <motion.div
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5 }}
            >
              <p className="text-sm md:text-base">
                Welcome back, <span className="bg-gradient-to-r from-lmsy-yellow to-lmsy-blue bg-clip-text text-transparent font-semibold">Curator Aster</span>. The archive is ready for your selection.
              </p>
            </motion.div>
          </div>
        </div>

        {/* Page Content */}
        <div className="container mx-auto">
          {children}
        </div>
      </main>
    </div>
  );
}
