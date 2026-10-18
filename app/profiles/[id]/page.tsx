import { redirect } from 'next/navigation';

/**
 * Old profile detail URLs forwarded to the unified people route, which
 * accepts both the slug and the raw uuid.
 */
export default async function ProfileDetailRedirect({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  redirect(`/people/${id}`);
}
