import { redirect } from 'next/navigation';

/**
 * Editorial detail folded into the single project detail route in phase 7.
 * The old URL forwards so bookmarks and search-result links still resolve.
 */
export default async function EditorialDetailRedirect({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  redirect(`/projects/${id}`);
}
