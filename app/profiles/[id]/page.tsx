import { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import type { Member } from '@/lib/supabase/types';
import ProfileClient from './profile-client';

interface PageProps {
  params: {
    id: string;
  };
}

/** Shape of the profiles table (lmsy_archive schema), verified read-only. */
interface ProfileRow {
  id: string;
  name: string;
  nickname: string;
  birthday: string | null;
  bio: string | null;
  avatar_url: string | null;
  ig_handle: string | null;
  x_handle: string | null;
  created_at: string;
}

/**
 * Adapt a profiles row to the Member shape consumed by ProfileClient.
 * profiles has no height / weibo_handle / xhs_handle columns, so those
 * fields are explicitly null (the client already renders conditionally).
 */
function toMember(row: ProfileRow): Member {
  return {
    ...row,
    height: null,
    weibo_handle: null,
    xhs_handle: null,
  };
}

// Generate metadata for SEO
export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { data: profile } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', params.id)
    .single();

  if (!profile) {
    return {
      title: 'Member Not Found | LMSY',
    };
  }

  return {
    title: `${profile.name} | LMSY Official Fan Site`,
    description: profile?.bio || `Get to know ${profile.name} from LMSY`,
  };
}

export default async function ProfilePage({ params }: PageProps) {
  const { data: profile, error } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', params.id)
    .single();

  if (error || !profile) {
    notFound();
  }

  return <ProfileClient member={toMember(profile as ProfileRow)} />;
}
