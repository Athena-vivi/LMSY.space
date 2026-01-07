'use client';

import { useState, useEffect } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { Shield } from 'lucide-react';
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
    <div className="min-h-screen bg-black">
      {/* Desktop Sidebar */}
      <AdminSidebar isCollapsed={isCollapsed} onToggle={() => setIsCollapsed(!isCollapsed)} />

      {/* Mobile Navigation */}
      <AdminMobileNav />

      {/* Main Content */}
      <main
        className={cn(
          'transition-all duration-300',
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
