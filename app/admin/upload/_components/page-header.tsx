import StorageWidget from './storage-widget';

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
  return (
    <div className="mb-6 flex items-start justify-between gap-6">
      <div>
        <h1 className="font-serif text-3xl font-light text-white/90 mb-1">
          Bulk Upload Studio
        </h1>
        <p className="text-white/20 text-[10px] font-mono tracking-wider">
          Curator's Reminder: Respect the shutter's effort.
        </p>
      </div>
      <div className="flex items-center gap-4">
        <div className="text-right">
          <div className="text-[10px] font-mono text-white/30">
            {itemCount} / 50 IMAGES
          </div>
          {itemCount > 0 && (
            <div className="text-[8px] font-mono text-lmsy-yellow/60 mt-1">
              Event: {eventDate}
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
