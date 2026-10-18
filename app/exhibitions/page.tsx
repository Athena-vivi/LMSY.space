import { redirect } from 'next/navigation';

/**
 * The exhibition index listed the same projects the index lists. Phase 7
 * folds it into /projects, whose category chips cover every hall.
 */
export default function ExhibitionsRedirect() {
  redirect('/projects');
}
