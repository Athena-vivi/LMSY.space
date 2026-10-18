import { Suspense } from 'react';
import { ProjectsClient } from './projects-client';

/**
 * Projects index. Server shell only: the list is interactive (filter chips
 * write `?category=` and the rows come from the browser client), so the real
 * component lives in projects-client.tsx behind a Suspense boundary for
 * useSearchParams.
 */
export default function ProjectsPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen flex items-center justify-center">
          <div className="animate-spin rounded-full h-12 w-12 border-2 border-muted border-t-foreground" />
        </div>
      }
    >
      <ProjectsClient />
    </Suspense>
  );
}
