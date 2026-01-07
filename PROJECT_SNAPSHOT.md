# LMSY.Space - Technical Architecture Snapshot

**Generated:** 2025-01-03
**Project:** lookmheesonya-forever.com
**Version:** 0.1.0
**Framework:** Next.js 16.1.1 (App Router)

---

## 1. Project File Tree

```
lookmheesonya-forever.com/
├── app/
│   ├── admin/
│   │   ├── layout.tsx                    # Admin panel layout
│   │   ├── gallery/page.tsx              # Gallery management
│   │   ├── projects/page.tsx            # Project management
│   │   ├── schedule/page.tsx            # Schedule management
│   │   ├── settings/page.tsx            # Settings page
│   │   └── upload/page.tsx              # Curated upload with auto-numbering
│   ├── api/
│   │   └── search/route.ts              # Global search API
│   ├── chronicle/
│   │   └── page.tsx                     # Timeline visualization
│   ├── editorial/
│   │   ├── page.tsx                     # Editorial listing
│   │   └── [slug]/
│   │       └── page.tsx                 # MDX article renderer
│   ├── gallery/
│   │   ├── page.tsx                     # Gallery grid
│   │   └── lightbox.tsx                 # Image lightbox component
│   ├── profiles/
│   │   ├── page.tsx                     # Member profiles grid
│   │   └── [id]/
│   │       ├── page.tsx                 # Profile detail (Server)
│   │       └── profile-client.tsx       # Profile detail (Client)
│   ├── projects/
│   │   ├── page.tsx                     # Projects listing
│   │   └── [id]/
│   │       ├── page.tsx                 # Project detail (Server)
│   │       └── project-client.tsx       # Project detail (Client)
│   ├── schedule/
│   │   └── page.tsx                     # Event calendar
│   ├── globals.css                      # Global styles + Tailwind v4
│   ├── layout.tsx                       # Root layout with providers
│   ├── not-found.tsx                    # Custom 404 page
│   ├── page.tsx                         # Homepage (Landing)
│   ├── sitemap.ts                       # Dynamic sitemap
│   └── template.tsx                     # Root template
│
├── components/
│   ├── ui/                              # Radix UI primitives
│   │   ├── avatar.tsx
│   │   ├── button.tsx
│   │   ├── calendar.tsx
│   │   ├── card.tsx
│   │   ├── dialog.tsx
│   │   ├── dropdown-menu.tsx
│   │   ├── separator.tsx
│   │   └── sheet.tsx
│   ├── archive-loading.tsx              # Museum-themed loading screen
│   ├── catalog-number.tsx               # Catalog number display
│   ├── chronicle-timeline.tsx           # Timeline component
│   ├── editorial-article.tsx            # MDX article wrapper
│   ├── language-provider.tsx            # i18n context (EN/ZH/TH)
│   ├── language-switcher.tsx           # Language toggle UI
│   ├── mdx-components.tsx               # Custom MDX component mapping
│   ├── museum-preface.tsx               # About section with i18n
│   ├── page-transition.tsx              # Route transition animations
│   ├── search-command.tsx               # Cmd+K search modal
│   ├── service-worker-provider.tsx      # PWA service worker
│   ├── site-footer.tsx                  # Footer with curator attribution
│   ├── site-header.tsx                  # Navigation header
│   ├── social-preview.tsx               # Social media copy generator
│   ├── theme-provider.tsx               # Dark/light mode context
│   └── theme-switcher.tsx               # Theme toggle UI
│
├── content/
│   └── editorial/
│       └── the-first-orbit.mdx         # Sample MDX article
│
├── lib/
│   ├── archive-number.ts                # Auto-numbering system (LMSY-YEAR-XXX)
│   ├── catalog.ts                       # Catalog utilities
│   ├── hooks.ts                         # Custom React hooks
│   ├── languages.ts                     # i18n translations
│   ├── mdx.ts                           # MDX file loading utilities
│   ├── supabase.ts                     # Supabase client + type definitions
│   ├── timeline.ts                      # Timeline data utilities
│   └── utils.ts                         # General utilities
│
├── public/                              # Static assets
├── next.config.ts                       # Next.js + MDX config
├── package.json                         # Dependencies
├── tailwind.config.ts                   # Tailwind v4 (inline in globals.css)
└── tsconfig.json                        # TypeScript config
```

---

## 2. Key Configuration Files

### package.json (Dependencies)

```json
{
  "name": "lookmheesonya-forever.com",
  "version": "0.1.0",
  "dependencies": {
    // Core Framework
    "next": "16.1.1",
    "react": "19.2.3",
    "react-dom": "19.2.3",

    // Database & Backend
    "@supabase/supabase-js": "^2.89.0",

    // MDX & Content
    "@next/mdx": "^16.1.1",
    "@mdx-js/react": "^3.1.1",
    "next-mdx-remote": "^5.0.0",
    "gray-matter": "^4.0.3",
    "react-markdown": "^10.1.0",

    // MDX Plugins
    "rehype-highlight": "^7.0.2",
    "rehype-slug": "^6.0.0",
    "rehype-autolink-headings": "^7.1.0",
    "remark-gfm": "^4.0.1",

    // UI & Animation
    "framer-motion": "^12.23.26",
    "lucide-react": "^0.562.0",

    // Radix UI Components
    "@radix-ui/react-avatar": "^1.1.11",
    "@radix-ui/react-dialog": "^1.1.15",
    "@radix-ui/react-dropdown-menu": "^2.1.16",
    "@radix-ui/react-separator": "^1.1.8",
    "@radix-ui/react-slot": "^1.2.4",

    // Styling
    "tailwindcss": "^4",
    "clsx": "^2.1.1",
    "tailwind-merge": "^3.4.0",
    "class-variance-authority": "^0.7.1",

    // Utilities
    "date-fns": "^4.1.0"
  }
}
```

### Tailwind Configuration (app/globals.css - Tailwind v4)

```css
@import "tailwindcss";
@import "tw-animate-css";

@custom-variant dark (&:is(.dark *));

@theme inline {
  /* LMSY Duo Colors */
  --color-lmsy-yellow: #FBBF24;
  --color-lmsy-yellow-dark: #F59E0B;
  --color-lmsy-blue: #38BDF8;
  --color-lmsy-blue-dark: #0EA5E9;
  --color-lmsy-gradient: linear-gradient(135deg, #FBBF24 0%, #38BDF8 100%);
}

:root {
  /* Light Mode: "Day Museum" */
  --background: #FAF9F6;  /* Cream paper */
  --foreground: #1A1A1A;  /* Charcoal text */
  --primary: #FBBF24;     /* LMSY Yellow */
  --secondary: #38BDF8;   /* LMSY Blue */
}

.dark {
  /* Dark Mode: "Midnight Star Gallery" */
  --background: #0A0A0A;  /* Deep space black */
  --foreground: #FAF9F6;  /* Warm cream - starlight */
  --primary: #FBBF24;
  --secondary: #38BDF8;
}
```

---

## 3. Core Logic Code

### API Route: Global Search (app/api/search/route.ts)

```typescript
import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const query = searchParams.get('q');

  if (!query || query.trim().length < 2) {
    return NextResponse.json({ results: [] });
  }

  const searchTerm = query.trim().toLowerCase();

  try {
    // Parallel search across multiple tables
    const [galleryResults, projectResults, scheduleResults] = await Promise.all([
      supabase.from('gallery').select('*')
        .or(`caption.ilike.%${searchTerm}%,tag.ilike.%${searchTerm}%`)
        .limit(10),

      supabase.from('projects').select('*')
        .or(`title.ilike.%${searchTerm}%,description.ilike.%${searchTerm}%,category.ilike.%${searchTerm}%`)
        .limit(5),

      supabase.from('schedule').select('*')
        .or(`title.ilike.%${searchTerm}%,location.ilike.%${searchTerm}%`)
        .limit(5),
    ]);

    // Unified result format
    const results = [
      ...(galleryResults.data || []).map(item => ({
        id: `gallery-${item.id}`,
        type: 'gallery' as const,
        title: item.caption || 'Untitled',
        url: `/gallery#${item.id}`,
      })),
      // ... project and schedule mappings
    ];

    return NextResponse.json({ results });
  } catch (error) {
    return NextResponse.json({ results: [] }, { status: 500 });
  }
}
```

### Database Layer (lib/supabase.ts)

```typescript
import { createClient, SupabaseClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

// Lazy initialization pattern for build-time safety
const _supabase = supabaseUrl && supabaseAnonKey
  ? createClient(supabaseUrl, supabaseAnonKey)
  : null;

export const supabase: SupabaseClient = _supabase ?? (() => {
  throw new Error('Supabase client is not initialized.');
})();

// Type Definitions
export interface Member {
  id: string;
  name: string;
  nickname: string;
  birthday: string | null;
  height: string | null;
  bio: string | null;
  avatar_url: string | null;
  ig_handle: string | null;
  x_handle: string | null;
  weibo_handle: string | null;
  xhs_handle: string | null;
  created_at: string;
}

export interface Project {
  id: string;
  title: string;
  category: 'series' | 'music' | 'magazine';
  release_date: string | null;
  description: string | null;
  cover_url: string | null;
  watch_url: string | null;
  created_at: string;
}

export interface GalleryItem {
  id: string;
  image_url: string;
  caption: string | null;
  tag: string | null;
  is_featured: boolean;
  catalog_id: string | null;  // LMSY-2025-XXX
  is_editorial: boolean;
  curator_note: string | null;  // Markdown
  created_at: string;
}

export interface Schedule {
  id: string;
  title: string;
  event_date: string;
  location: string | null;
  link: string | null;
  created_at: string;
}
```

### Supabase Schema (SQL Description)

```sql
-- Members Table (profiles)
CREATE TABLE profiles (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name VARCHAR(255) NOT NULL,
  nickname VARCHAR(100),
  birthday DATE,
  height VARCHAR(20),
  bio TEXT,
  avatar_url TEXT,
  ig_handle VARCHAR(100),
  x_handle VARCHAR(100),
  weibo_handle VARCHAR(100),
  xhs_handle VARCHAR(100),
  created_at TIMESTAMPTz DEFAULT NOW()
);

-- Projects Table
CREATE TABLE projects (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  title VARCHAR(500) NOT NULL,
  category VARCHAR(50) CHECK (category IN ('series', 'music', 'magazine')),
  release_date DATE,
  description TEXT,
  cover_url TEXT,
  watch_url TEXT,
  created_at TIMESTAMPTz DEFAULT NOW()
);

-- Gallery Table
CREATE TABLE gallery (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  image_url TEXT NOT NULL,
  caption TEXT,
  tag VARCHAR(100),
  is_featured BOOLEAN DEFAULT false,
  catalog_id VARCHAR(50),  -- LMSY-G-2025-XXX format
  is_editorial BOOLEAN DEFAULT false,
  curator_note TEXT,  -- Markdown formatted
  event_date DATE,
  project_id UUID REFERENCES projects(id),
  member_id UUID REFERENCES profiles(id),
  created_at TIMESTAMPTz DEFAULT NOW()
);

-- Schedule Table
CREATE TABLE schedule (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  title VARCHAR(500) NOT NULL,
  event_date DATE NOT NULL,
  location VARCHAR(500),
  link TEXT,
  created_at TIMESTAMPTz DEFAULT NOW()
);

-- Indexes for search performance
CREATE INDEX gallery_caption_idx ON gallery USING gin(to_tsvector('english', caption));
CREATE INDEX gallery_tag_idx ON gallery(tag);
CREATE INDEX projects_title_idx ON projects USING gin(to_tsvector('english', title));
CREATE INDEX schedule_title_idx ON schedule USING gin(to_tsvector('english', title));
```

---

## 4. Core Pages

### Homepage (app/page.tsx)

```typescript
'use client';

import { motion } from 'framer-motion';
import { MuseumPreface } from '@/components/museum-preface';
import { useLanguage } from '@/components/language-provider';
import { t } from '@/lib/languages';

export default function HomePage() {
  const { language } = useLanguage();

  return (
    <div className="relative">
      {/* Hero Section */}
      <section className="relative min-h-screen bg-background">
        {/* Ambient lighting effects */}
        <div className="absolute left-0 top-1/2 -translate-y-1/2 w-[50vw] h-[80vw]
                    bg-gradient-radial from-lmsy-yellow/5 to-transparent rounded-full blur-3xl" />
        <div className="absolute right-0 top-1/2 -translate-y-1/2 w-[50vw] h-[80vw]
                    bg-gradient-radial from-lmsy-blue/5 to-transparent rounded-full blur-3xl" />

        <div className="container mx-auto px-4 py-20">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
            {/* Title */}
            <motion.h1
              initial={{ opacity: 0, y: 50 }}
              animate={{ opacity: 1, y: 0 }}
              className="font-serif text-7xl font-bold tracking-tight"
            >
              {t(language, 'hero.lmsy')}
            </motion.h1>

            {/* Image with float animation */}
            <motion.div
              animate={{ y: [20, 10, 20] }}
              transition={{ duration: 6, repeat: Infinity, ease: 'easeInOut' }}
            >
              <Image src="/lmsy-001.jpg" alt="LMSY" fill className="object-cover" />
            </motion.div>
          </div>
        </div>
      </section>

      {/* Museum Preface */}
      <MuseumPreface />

      {/* Updates Section */}
      {/* ... */}
    </div>
  );
}
```

### Root Layout (app/layout.tsx)

```typescript
import type { Metadata } from "next";
import { Inter, Geist_Mono, Playfair_Display } from "next/font/google";
import { ThemeProvider } from "@/components/theme-provider";
import { LanguageProvider } from "@/components/language-provider";

const sans = Inter({ variable: "--font-geist-sans" });
const serif = Playfair_Display({ variable: "--font-playfair-display" });
const mono = Geist_Mono({ variable: "--font-geist-mono" });

export const metadata: Metadata = {
  title: "LMSY | Lookmhee & Sonya Official Fan Site",
  authors: [{ name: "Astra", url: "https://lmsy.space" }],
  openGraph: {
    type: 'website',
    url: 'https://lookmheesonya-forever.com',
    title: 'LMSY | Lookmhee & Sonya',
    images: [{ url: '/lmsy-main-visual.png', width: 1200, height: 630 }],
  },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className={`${sans.variable} ${serif.variable} ${mono.variable}`}>
        <ThemeProvider defaultTheme="light" storageKey="lmsy-theme">
          <LanguageProvider defaultLanguage="en">
            <div className="flex min-h-screen flex-col">
              <SiteHeader />
              <main className="flex-1">{children}</main>
              <SiteFooter />
            </div>
          </LanguageProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
```

---

## 5. Technology Stack Summary

| Category | Technology | Purpose |
|----------|-----------|---------|
| **Framework** | Next.js 16.1.1 | React framework with App Router |
| **Styling** | Tailwind CSS v4 | Utility-first CSS |
| **Database** | Supabase | PostgreSQL + Auth + Storage |
| **Animations** | Framer Motion | Declarative animations |
| **Components** | Radix UI | Accessible primitives |
| **Content** | MDX | Markdown + JSX |
| **i18n** | Custom Context | EN/ZH/TH languages |
| **Theme** | Custom Provider | Light/Dark mode |
| **PWA** | Service Worker | Offline support |

---

## 6. Environment Variables

```bash
# .env.local (Required - [REDACTED] for security)
NEXT_PUBLIC_SUPABASE_URL=[REDACTED]
NEXT_PUBLIC_SUPABASE_ANON_KEY=[REDACTED]
```

---

## 7. Build & Deploy

```bash
# Development
npm run dev

# Production Build
npm run build

# Start Production Server
npm start

# Deployment: Vercel (automatic from Git)
```

**Build Output:**
- ✅ Static pages: `/`, `/admin/*`, `/gallery`, `/profiles`, `/projects`, `/schedule`, `/chronicle`
- ✅ Dynamic pages: `/profiles/[id]`, `/projects/[id]`, `/editorial/[slug]`
- ✅ API routes: `/api/search`

---

## 8. Key Features Implemented

1. **Multi-language Support** (EN/ZH/TH)
2. **Dark/Light Mode** with system preference detection
3. **MDX Editorial System** with magazine-style typography
4. **Chronicle Timeline** with archive numbering
5. **Admin Upload** with auto-numbering and social media preview
6. **Global Search** across gallery, projects, and schedule
7. **Responsive Design** with mobile-first approach
8. **PWA Support** with service worker

---

**End of Snapshot**

*For code review purposes, all sensitive credentials have been redacted.*
