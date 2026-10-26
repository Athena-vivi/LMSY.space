'use client';

import { Plus, Calendar as CalendarIcon } from 'lucide-react';
import { Button } from '@/components/ui/button';

/**
 * Schedule management (admin).
 *
 * The schedule module is NOT enabled: the `schedule` table does not exist in
 * the database, and the public page no longer displays sample data
 * (audit P1-2, product decision D2). This page used to query the missing
 * table, silently swallow the error, and render Add/Edit/Delete controls
 * that could never work. It now states the status plainly. If the module is
 * approved, rebuild it against a real schedule table (new migration first).
 */
export default function AdminSchedulePage() {
  return (
    <div className="min-h-screen bg-background p-8">
      <div className="mb-8 flex items-center justify-between">
        <div>
          <h1 className="font-serif text-4xl font-bold text-foreground mb-2">
            Schedule Management
          </h1>
          <p className="text-ink-2">
            Manage upcoming events, fan meetings, and appearances
          </p>
        </div>
        <Button
          disabled
          title="Schedule module not enabled yet"
          className="bg-gradient-to-r from-lmsy-yellow to-lmsy-blue text-foreground opacity-50 cursor-not-allowed"
        >
          <Plus className="mr-2 h-4 w-4" />
          Add Event
        </Button>
      </div>

      <div className="mb-8 border-2 border-dashed border-border rounded-lg p-6 text-center">
        <CalendarIcon className="h-8 w-8 mx-auto mb-3 text-ink-2" />
        <p className="text-ink-2">
          The schedule module is not enabled yet. Events will appear here once the
          schedule table is set up and the module is switched on.
        </p>
      </div>

      {/* Upcoming Events */}
      <div className="mb-12">
        <h2 className="font-serif text-2xl font-bold text-foreground mb-6 flex items-center gap-2">
          <CalendarIcon className="h-6 w-6 text-lmsy-yellow" />
          Upcoming Events (0)
        </h2>

        <div className="text-center py-12 border-2 border-dashed border-border rounded-lg">
          <p className="text-ink-2">No upcoming events scheduled</p>
        </div>
      </div>
    </div>
  );
}
