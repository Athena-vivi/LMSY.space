import { redirect } from 'next/navigation';

/**
 * The workbench dashboard that used to live here was removed on 2026-10-28:
 * it duplicated the project list page while adding a set of entry tiles that
 * were never used. The admin root now forwards to the project list, which is
 * where login, the footer's triple-click entry and the curate back arrow go.
 */
export default function AdminRootPage() {
  redirect('/admin/projects');
}
