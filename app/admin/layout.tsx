'use client';

import { useState, useEffect } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { Shield } from 'lucide-react';
import { motion } from 'framer-motion';
import { useAuth } from '@/components/auth-provider';
import { AdminSidebar } from '@/components/admin-sidebar';
import { AdminMobileNav } from '@/components/admin-mobile-nav';
import { cn } from '@/lib/utils';

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const [isCollapsed, setIsCollapsed] = useState(false);
  const { isAdmin, loading } = useAuth();

  // Login page should not have admin restrictions or sidebar
  const isLoginPage = pathname === '/admin/login';

  // Redirect if not admin (only for non-login pages)
  useEffect(() => {
    if (!isLoginPage && !loading && !isAdmin) {
      router.replace('/');
    }
  }, [isAdmin, loading, router, isLoginPage]);

  // Show loading while checking admin status (only for non-login pages)
  if (!isLoginPage && loading) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center">
        <div className="text-center">
          <Shield className="h-12 w-12 text-lmsy-yellow mx-auto mb-4 animate-pulse" />
          <p className="text-white/40 font-mono text-sm">Verifying admin access...</p>
        </div>
      </div>
    );
  }

  // Login page renders without sidebar
  if (isLoginPage) {
    return <>{children}</>;
  }

  // Don't render if not admin (redirect will happen via useEffect)
  if (!isAdmin) {
    return null;
  }

  return (
    <div className="relative min-h-screen bg-black overflow-hidden">
      {/* Dynamic Mesh Gradient Background */}
      <div className="fixed inset-0 pointer-events-none">
        <div className="absolute inset-0 opacity-40">
          {/* Yellow nebula */}
          <motion.div
            className="absolute top-[-10%] left-[-10%] w-[60vw] h-[60vw] rounded-full blur-3xl"
            style={{
              background: 'radial-gradient(circle, rgba(251, 191, 36, 0.4) 0%, rgba(251, 191, 36, 0) 70%)',
            }}
            animate={{
              x: [0, 100, 0],
              y: [0, -50, 0],
              scale: [1, 1.2, 1],
            }}
            transition={{
              duration: 20,
              repeat: Infinity,
              ease: 'easeInOut',
            }}
          />
          {/* Blue nebula */}
          <motion.div
            className="absolute bottom-[-10%] right-[-10%] w-[60vw] h-[60vw] rounded-full blur-3xl"
            style={{
              background: 'radial-gradient(circle, rgba(56, 189, 248, 0.4) 0%, rgba(56, 189, 248, 0) 70%)',
            }}
            animate={{
              x: [0, -100, 0],
              y: [0, 50, 0],
              scale: [1, 1.2, 1],
            }}
            transition={{
              duration: 20,
              repeat: Infinity,
              ease: 'easeInOut',
            }}
          />
          {/* Intersection glow */}
          <motion.div
            className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[80vw] h-[80vw] rounded-full blur-3xl"
            style={{
              background: 'radial-gradient(circle, rgba(251, 191, 36, 0.2) 0%, rgba(56, 189, 248, 0.2) 50%, transparent 70%)',
            }}
            animate={{
              opacity: [0.3, 0.6, 0.3],
              scale: [1, 1.1, 1],
            }}
            transition={{
              duration: 8,
              repeat: Infinity,
              ease: 'easeInOut',
            }}
          />
        </div>
      </div>

      {/* Desktop Sidebar */}
      <AdminSidebar isCollapsed={isCollapsed} onToggle={() => setIsCollapsed(!isCollapsed)} />

      {/* Mobile Navigation */}
      <AdminMobileNav />

      {/* Main Content */}
      <main
        className={cn(
          'transition-all duration-300 relative z-10',
          // Desktop: account for sidebar
          'md:ml-48 md:collapsed:ml-20',
          // Mobile: account for top header and bottom nav
          'pt-14 pb-20 md:pb-0'
        )}
      >
        <div className="container mx-auto px-6 py-8 md:px-8">
          {children}
        </div>
      </main>

      {/* Mobile spacer for collapsed sidebar */}
      <style jsx global>{`
        @media (min-width: 768px) {
          main {
            margin-left: ${isCollapsed ? '5rem' : '12rem'};
          }
        }
      `}</style>
    </div>
  );
}
