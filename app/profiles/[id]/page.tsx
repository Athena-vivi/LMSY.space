'use client';

import { motion } from 'framer-motion';
import Link from 'next/link';
import { ArrowLeft, Instagram, Twitter, Calendar } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import { useParams } from 'next/navigation';

// Sample data - will be replaced with Supabase data fetch
const membersData: Record<string, any> = {
  lookmhee: {
    id: 'lookmhee',
    name: 'Lookmhee',
    nickname: 'Lookmhee',
    birthday: '2003-05-15',
    bio: 'Thai actress known for her captivating role in the Affair series. Her portrayal of a complex character won hearts across Southeast Asia.',
    avatar_url: null,
    ig_handle: '@lookmhee',
    x_handle: '@lookmhee_official',
    works: [
      { title: 'Affair', year: '2024', role: 'Lead' },
      { title: 'The Promise', year: '2023', role: 'Supporting' },
    ],
  },
  sonya: {
    id: 'sonya',
    name: 'Sonya',
    nickname: 'Sonya',
    birthday: '2003-08-22',
    bio: 'Talented actress who brought depth and authenticity to her character in Affair. Her on-screen chemistry with Lookmhee created a memorable duo.',
    avatar_url: null,
    ig_handle: '@sonya',
    x_handle: '@sonya_official',
    works: [
      { title: 'Affair', year: '2024', role: 'Lead' },
      { title: 'Secret Love', year: '2023', role: 'Guest' },
    ],
  },
};

const container = {
  hidden: { opacity: 0 },
  show: {
    opacity: 1,
    transition: {
      staggerChildren: 0.15,
    },
  },
};

const item = {
  hidden: { opacity: 0, y: 20 },
  show: { opacity: 1, y: 0 },
};

export default function ProfileDetailPage() {
  const params = useParams();
  const member = membersData[params.id as string];

  if (!member) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <h1 className="font-serif text-3xl mb-4">Member not found</h1>
          <Link href="/profiles">
            <Button>Back to Profiles</Button>
          </Link>
        </div>
      </div>
    );
  }

  const birthDate = new Date(member.birthday);
  const age = new Date().getFullYear() - birthDate.getFullYear();

  return (
    <div className="min-h-screen">
      {/* Back Button */}
      <div className="container mx-auto px-4 sm:px-6 lg:px-8 pt-24 md:pt-32">
        <Link href="/profiles">
          <Button variant="ghost" className="gap-2 mb-8">
            <ArrowLeft className="h-4 w-4" />
            Back to Profiles
          </Button>
        </Link>
      </div>

      {/* Profile Content - Split Layout */}
      <motion.div
        variants={container}
        initial="hidden"
        animate="show"
        className="container mx-auto px-4 sm:px-6 lg:px-8 pb-24 md:pb-32"
      >
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 lg:gap-16 items-start">
          {/* Left - Fixed Image */}
          <motion.div variants={item} className="lg:sticky lg:top-24">
            <div className="relative aspect-[3/4] overflow-hidden rounded-sm magazine-shadow-lg bg-gradient-to-br from-rose-100 to-rose-200 dark:from-rose-900/30 dark:to-rose-950/30">
              {/* Placeholder for member photo */}
              <div className="absolute inset-0 flex items-center justify-center">
                <div className="text-center">
                  <div className="font-serif text-9xl text-primary/20">
                    {member.name[0]}
                  </div>
                </div>
              </div>
              <div className="absolute bottom-0 left-0 right-0 p-6 bg-gradient-to-t from-black/60 to-transparent">
                <h2 className="font-serif text-4xl md:text-5xl lg:text-6xl text-white">
                  {member.nickname}
                </h2>
              </div>
            </div>

            {/* Social Links */}
            <motion.div variants={item} className="mt-6 flex gap-4">
              {member.ig_handle && (
                <a
                  href={`https://instagram.com/${member.ig_handle.replace('@', '')}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-2 text-sm text-muted-foreground hover:text-primary transition-colors"
                >
                  <Instagram className="h-5 w-5" />
                  Instagram
                </a>
              )}
              {member.x_handle && (
                <a
                  href={`https://x.com/${member.x_handle.replace('@', '')}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-2 text-sm text-muted-foreground hover:text-primary transition-colors"
                >
                  <Twitter className="h-5 w-5" />
                  Twitter
                </a>
              )}
            </motion.div>
          </motion.div>

          {/* Right - Scrollable Content */}
          <div className="space-y-8">
            {/* Name */}
            <motion.div variants={item}>
              <h1 className="font-serif text-5xl md:text-6xl mb-4">{member.name}</h1>
              <Separator className="w-24 h-0.5 bg-primary" />
            </motion.div>

            {/* Bio */}
            <motion.div variants={item}>
              <h3 className="text-sm font-medium tracking-widest text-muted-foreground mb-3">
                BIOGRAPHY
              </h3>
              <p className="text-lg leading-relaxed">{member.bio}</p>
            </motion.div>

            {/* Birthday */}
            <motion.div variants={item}>
              <h3 className="text-sm font-medium tracking-widest text-muted-foreground mb-3">
                BORN
              </h3>
              <div className="flex items-center gap-2">
                <Calendar className="h-5 w-5 text-primary" />
                <span>{birthDate.toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}</span>
                <span className="text-muted-foreground">({age} years old)</span>
              </div>
            </motion.div>

            {/* Filmography */}
            <motion.div variants={item}>
              <h3 className="text-sm font-medium tracking-widest text-muted-foreground mb-4">
                WORKS
              </h3>
              <div className="space-y-4">
                {member.works.map((work: any, index: number) => (
                  <div key={index} className="group">
                    <div className="flex items-baseline justify-between">
                      <h4 className="font-serif text-xl group-hover:text-primary transition-colors">
                        {work.title}
                      </h4>
                      <span className="text-sm text-muted-foreground">{work.year}</span>
                    </div>
                    <p className="text-sm text-muted-foreground">{work.role}</p>
                    {index < member.works.length - 1 && <Separator className="mt-4" />}
                  </div>
                ))}
              </div>
            </motion.div>

            {/* Quote */}
            <motion.div
              variants={item}
              className="pt-8 border-t border-border"
            >
              <blockquote className="font-serif text-2xl md:text-3xl leading-relaxed text-foreground/80">
                &quot;Grateful for every opportunity to share stories that touch hearts.&quot;
              </blockquote>
              <cite className="mt-4 block text-sm text-muted-foreground not-italic">
                — {member.nickname}
              </cite>
            </motion.div>
          </div>
        </div>
      </motion.div>
    </div>
  );
}
