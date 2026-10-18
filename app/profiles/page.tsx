import { redirect } from 'next/navigation';

/**
 * /profiles was a hand-maintained page that could drift from the database.
 * Phase 7 unified every person surface behind /people.
 */
export default function ProfilesRedirect() {
  redirect('/people');
}
