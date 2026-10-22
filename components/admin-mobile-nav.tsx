'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { LayoutDashboard, Upload, Images, FolderKanban, PenTool, MessageSquare, GalleryVerticalEnd } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useAdminLang } from '@/lib/admin-i18n';

const mobileNavItems = [
  { icon: LayoutDashboard, label: 'nav.workbench', href: '/admin' },
  { icon: Upload, label: 'u.title', href: '/admin/upload' },
  { icon: Images, label: 'nav.vault', href: '/admin/gallery' },
  { icon: FolderKanban, label: 'nav.projects', href: '/admin/projects' },
  { icon: GalleryVerticalEnd, label: 'nav.curation', href: '/admin/curation' },
  { icon: PenTool, label: 'nav.editorial', href: '/admin/editorial' },
  { icon: MessageSquare, label: 'nav.community', href: '/admin/messages' },
];

export function AdminMobileNav() {
  const pathname = usePathname();
  const { t } = useAdminLang();

  return (
    <nav className="md:hidden fixed bottom-0 left-0 right-0 z-50 border-t"
      style={{
        background: 'rgba(0, 0, 0, 0.8)',
        backdropFilter: 'blur(20px)',
        borderColor: 'rgba(255, 255, 255, 0.05)',
      }}
    >
      <div className="flex items-center justify-around py-2">
        {mobileNavItems.map((item) => {
          const Icon = item.icon;
          const isActive = pathname?.startsWith(item.href);

          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                'flex flex-col items-center gap-1 px-3 py-2 rounded-lg transition-colors',
                isActive
                  ? 'text-lmsy-yellow'
                  : 'text-ink-2 hover:text-foreground'
              )}
            >
              <Icon className="h-5 w-5" />
              <span className="text-[10px] font-medium">{t(item.label)}</span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
