'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
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
  const [isCollapsed, setIsCollapsed] = useState(false);
  const { isAdmin, loading } = useAuth();

  // Redirect if not admin
  useEffect(() => {
    if (!loading && !isAdmin) {
      router.replace('/');
    }
  }, [isAdmin, loading, router]);

  // Show loading while checking admin status
  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <Shield className="h-12 w-12 text-lmsy-yellow mx-auto mb-4 animate-pulse" />
          <p className="text-muted-foreground">Verifying admin access...</p>
        </div>
      </div>
    );
  }

  // Don't render if not admin (redirect will happen via useEffect)
  if (!isAdmin) {
    return null;
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Desktop Sidebar */}
      <AdminSidebar isCollapsed={isCollapsed} onToggle={() => setIsCollapsed(!isCollapsed)} />

      {/* Mobile Navigation */}
      <AdminMobileNav />

      {/* Main Content */}
      <main
        className={cn(
          'transition-all duration-300',
          // Desktop: account for sidebar
          'md:ml-72 md:collapsed:ml-20',
          // Mobile: account for top header and bottom nav
          'pt-16 pb-20 md:pb-0'
        )}
      >
        <div className="container mx-auto px-4 py-8 md:px-8">
          {children}
        </div>
      </main>

      {/* Mobile spacer for collapsed sidebar */}
      <style jsx global>{`
        @media (min-width: 768px) {
          main {
            margin-left: ${isCollapsed ? '5rem' : '18rem'};
          }
        }
      `}</style>
    </div>
  );
}
