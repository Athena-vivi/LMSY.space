'use client';

import Link from 'next/link';
import { Heart, Instagram, Twitter } from 'lucide-react';
import { Separator } from '@/components/ui/separator';

export function SiteFooter() {
  return (
    <footer className="border-t bg-muted/30">
      <div className="container mx-auto px-4 sm:px-6 lg:px-8">
        <div className="py-12 md:py-16">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {/* Logo & Description */}
            <div>
              <h3 className="font-serif text-2xl font-bold text-primary mb-4">LMSY</h3>
              <p className="text-sm text-muted-foreground">
                Official fan website dedicated to Lookmhee and Sonya. Made with love by fans, for fans.
              </p>
            </div>

            {/* Quick Links */}
            <div>
              <h4 className="font-medium mb-4">Quick Links</h4>
              <ul className="space-y-2 text-sm">
                <li>
                  <Link href="/profiles" className="text-muted-foreground hover:text-primary transition-colors">
                    Profiles
                  </Link>
                </li>
                <li>
                  <Link href="/gallery" className="text-muted-foreground hover:text-primary transition-colors">
                    Gallery
                  </Link>
                </li>
                <li>
                  <Link href="/projects" className="text-muted-foreground hover:text-primary transition-colors">
                    Projects
                  </Link>
                </li>
                <li>
                  <Link href="/schedule" className="text-muted-foreground hover:text-primary transition-colors">
                    Schedule
                  </Link>
                </li>
              </ul>
            </div>

            {/* Social Links */}
            <div>
              <h4 className="font-medium mb-4">Follow Us</h4>
              <div className="flex gap-4">
                <a
                  href="https://instagram.com"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-muted-foreground hover:text-primary transition-colors"
                >
                  <Instagram className="h-5 w-5" />
                  <span className="sr-only">Instagram</span>
                </a>
                <a
                  href="https://twitter.com"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-muted-foreground hover:text-primary transition-colors"
                >
                  <Twitter className="h-5 w-5" />
                  <span className="sr-only">Twitter</span>
                </a>
              </div>
            </div>
          </div>

          <Separator className="my-8" />

          <div className="flex flex-col md:flex-row justify-between items-center gap-4">
            <p className="text-sm text-muted-foreground">
              &copy; {new Date().getFullYear()} LMSY Fan Site. All rights reserved.
            </p>
            <p className="text-sm text-muted-foreground flex items-center gap-1">
              Made with <Heart className="h-4 w-4 fill-primary text-primary" /> by fans
            </p>
          </div>
        </div>
      </div>
    </footer>
  );
}
