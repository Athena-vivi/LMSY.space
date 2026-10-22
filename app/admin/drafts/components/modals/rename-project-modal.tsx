'use client';

import { useEffect, useState } from 'react';
import { Loader2 } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { useAdminLang } from '@/lib/admin-i18n';

interface RenameProjectModalProps {
  project: { id: string; title: string } | null;
  isOpen: boolean;
  onClose: () => void;
  onSaved: (id: string, title: string) => void;
}

/**
 * Quick project rename from the drafts folder rail.
 *
 * Only the title is editable here on purpose - the full form (dates,
 * category, visibility, ...) stays in project management. The save goes
 * through the existing PATCH /api/admin/projects/[id] endpoint.
 */
export function RenameProjectModal({
  project,
  isOpen,
  onClose,
  onSaved,
}: RenameProjectModalProps) {
  const { t } = useAdminLang();
  const [title, setTitle] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (isOpen) {
      setTitle(project?.title ?? '');
      setError(null);
      setSaving(false);
    }
  }, [isOpen, project]);

  const handleSave = async () => {
    if (!project) return;
    const next = title.trim();
    if (!next) {
      setError(t('d.folders.renameEmpty'));
      return;
    }
    if (next === project.title) {
      onClose();
      return;
    }

    setSaving(true);
    setError(null);
    try {
      const response = await fetch(`/api/admin/projects/${project.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ title: next }),
      });
      const result = await response.json().catch(() => null);
      if (!response.ok || !result?.success) {
        throw new Error(result?.error || 'Failed to rename project');
      }
      onSaved(project.id, next);
      onClose();
    } catch (saveError) {
      setError(saveError instanceof Error ? saveError.message : 'Failed to rename project');
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent
        showCloseButton={false}
        className="max-w-md border-white/10 bg-black p-0 text-white shadow-2xl"
      >
        <DialogHeader className="border-b border-white/10 px-6 py-5 text-left">
          <DialogTitle className="font-serif text-xl font-light tracking-wide text-ink">
            {t('d.folders.rename')}
          </DialogTitle>
          <DialogDescription className="font-mono text-[11px] tracking-wider text-ink-2">
            {project?.id}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 px-6 py-5">
          <label className="block space-y-1.5">
            <span className="font-mono text-[10px] uppercase tracking-[0.2em] text-ink-2">
              {t('d.folders.renameLabel')}
            </span>
            <input
              type="text"
              value={title}
              onChange={(event) => setTitle(event.target.value)}
              onKeyDown={(event) => {
                if (event.key === 'Enter' && !saving) void handleSave();
              }}
              autoFocus
              className="w-full border border-white/10 bg-white/5 px-3 py-2 font-mono text-xs tracking-wide text-ink outline-none transition-colors focus:border-lmsy-yellow/40"
            />
          </label>

          {error && (
            <div className="rounded border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-200/80">
              {error}
            </div>
          )}

          <div className="flex justify-end gap-2">
            <button
              type="button"
              onClick={onClose}
              disabled={saving}
              className="border border-white/10 px-4 py-2 font-mono text-[11px] uppercase tracking-wider text-ink-2 transition-colors hover:border-white/25 hover:text-ink disabled:opacity-50"
            >
              {t('common.cancel')}
            </button>
            <button
              type="button"
              onClick={() => void handleSave()}
              disabled={saving || !title.trim()}
              className="flex items-center gap-2 bg-lmsy-yellow px-4 py-2 font-mono text-[11px] uppercase tracking-wider text-black transition-opacity hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {saving && <Loader2 className="h-3 w-3 animate-spin" />}
              {t('common.save')}
            </button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
