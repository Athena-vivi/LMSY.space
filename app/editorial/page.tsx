import { Suspense } from 'react';
import { ProjectsClient } from '@/app/projects/projects-client';

export const metadata = {
  title: 'Editorial | LMSY Archive',
  description: 'Magazine covers, spreads and photobooks kept in the archive.',
};

/**
 * /editorial keeps its URL but no longer keeps its own copy of the project
 * data: it renders the Projects index with the editorial filter locked. One
 * list, one query, one set of covers.
 */
export default function EditorialPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen flex items-center justify-center">
          <div className="animate-spin rounded-full h-12 w-12 border-2 border-muted border-t-foreground" />
        </div>
      }
    >
      <ProjectsClient lockedCategory="editorial" />
    </Suspense>
  );
}
