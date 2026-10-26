import StorageWidget from './storage-widget';

import { useAdminLang } from '@/lib/admin-i18n';

interface PageHeaderProps {
  itemCount: number;
  eventDate: string;
}

/**
 * 🔒 PAGE HEADER
 *
 * Top section with title, subtitle, and storage widget.
 */
export function PageHeader({ itemCount, eventDate }: PageHeaderProps) {
  const { t } = useAdminLang();
  return (
    <div className="mb-6 flex items-start justify-between gap-6">
      <div>
        <h1 className="font-serif text-3xl font-light text-ink mb-1">
          {t('u.title')}
        </h1>
        <p className="text-ink-2 text-[10px] font-mono tracking-wider">
          {t('u.reminder')}
        </p>
      </div>
      <div className="flex items-center gap-4">
        <div className="text-right">
          <div className="text-[10px] font-mono text-ink-2">
            {itemCount} / 50 {t('d.type.image')}
          </div>
          {itemCount > 0 && (
            <div className="text-[10px] font-mono text-lmsy-yellow/60 mt-1">
              {t('common.date')}: {eventDate}
            </div>
          )}
        </div>
        <div className="w-48">
          <StorageWidget />
        </div>
      </div>
    </div>
  );
}
