import { redirect } from 'next/navigation';

/**
 * /chronicle is the old name of /timeline. The route stays alive so every
 * existing link keeps working; the year filter is forwarded so deep links
 * land on the same view.
 */
export default async function ChronicleRedirect({
  searchParams,
}: {
  searchParams: Promise<{ year?: string }>;
}) {
  const { year } = await searchParams;
  redirect(year ? `/timeline?year=${encodeURIComponent(year)}` : '/timeline');
}
