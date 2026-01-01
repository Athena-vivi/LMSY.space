import { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import ProfileClient from './profile-client';

interface PageProps {
  params: {
    id: string;
  };
}

// Generate metadata for SEO
export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { data: member } = await supabase
    .from('members')
    .select('*')
    .eq('id', params.id)
    .single();

  if (!member) {
    return {
      title: 'Member Not Found | LMSY',
    };
  }

  return {
    title: `${member.name} | LMSY Official Fan Site`,
    description: member?.bio || `Get to know ${member.name} from LMSY`,
  };
}

export default async function ProfilePage({ params }: PageProps) {
  const { data: member, error } = await supabase
    .from('members')
    .select('*')
    .eq('id', params.id)
    .single();

  if (error || !member) {
    notFound();
  }

  return <ProfileClient member={member} />;
}
