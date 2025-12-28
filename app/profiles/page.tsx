'use client';

import { motion } from 'framer-motion';
import Link from 'next/link';
import { ArrowRight, Instagram } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';

// Sample data - will be replaced with Supabase data
const members = [
  {
    id: 'lookmhee',
    name: 'Lookmhee',
    nickname: 'Lookmhee',
    bio: 'Thai actress known for her captivating role in the Affair series.',
    avatar_url: null,
    ig_handle: 'lookmhee',
  },
  {
    id: 'sonya',
    name: 'Sonya',
    nickname: 'Sonya',
    bio: 'Talented actress who brought the character to life in Affair.',
    avatar_url: null,
    ig_handle: 'sonya',
  },
];

export default function ProfilesPage() {
  return (
    <div className="min-h-screen">
      {/* Header */}
      <section className="pt-24 pb-16 md:pt-32 md:pb-24">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
          >
            <h1 className="font-serif text-5xl md:text-6xl lg:text-7xl mb-6">
              Profiles
            </h1>
            <p className="text-lg text-muted-foreground max-w-2xl">
              Get to know Lookmhee and Sonya - the talented duo behind the Affair series.
            </p>
          </motion.div>
        </div>
      </section>

      {/* Members Grid */}
      <section className="pb-24 md:pb-32">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8 lg:gap-12">
            {members.map((member, index) => (
              <motion.div
                key={member.id}
                initial={{ opacity: 0, y: 30 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.2, duration: 0.6 }}
              >
                <Link href={`/profiles/${member.id}`}>
                  <Card className="group overflow-hidden border-0 magazine-shadow hover:shadow-xl transition-all duration-300">
                    <CardContent className="p-0">
                      <div className="relative aspect-[3/4] overflow-hidden bg-gradient-to-br from-rose-100 to-rose-200 dark:from-rose-900/30 dark:to-rose-950/30">
                        {/* Placeholder gradient for member image */}
                        <div className="absolute inset-0 bg-gradient-to-t from-black/40 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
                        <div className="absolute inset-0 flex items-center justify-center">
                          <Avatar className="h-32 w-32 md:h-48 md:w-48">
                            <AvatarImage src={member.avatar_url || undefined} alt={member.name} />
                            <AvatarFallback className="text-3xl md:text-4xl bg-primary/10 text-primary">
                              {member.name[0]}
                            </AvatarFallback>
                          </Avatar>
                        </div>
                      </div>
                      <div className="p-6 md:p-8">
                        <h3 className="font-serif text-2xl md:text-3xl mb-2 group-hover:text-primary transition-colors">
                          {member.name}
                        </h3>
                        <p className="text-muted-foreground mb-4 line-clamp-2">
                          {member.bio}
                        </p>
                        <div className="flex items-center text-primary font-medium">
                          View Profile
                          <ArrowRight className="ml-2 h-4 w-4 group-hover:translate-x-1 transition-transform" />
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                </Link>
              </motion.div>
            ))}
          </div>
        </div>
      </section>
    </div>
  );
}
