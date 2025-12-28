# LMSY (Lookmhee & Sonya) Official Fan Site

A visually stunning, digital magazine-style fan website for Thai GL duo LMSY (Lookmhee & Sonya), stars of the Affair series.

## Tech Stack

- **Framework**: Next.js 14+ (App Router)
- **Styling**: Tailwind CSS v4
- **UI Components**: shadcn/ui
- **Animations**: Framer Motion
- **Database**: Supabase (PostgreSQL + Storage)
- **Icons**: Lucide React
- **Fonts**: Playfair Display (Serif) + Inter (Sans-serif)

## Design Features

- **Asymmetric Magazine Layout**: Non-traditional, editorial-style design
- **Dark Mode**: Full dark mode support with #0F0F0F background
- **Page Transitions**: Smooth animations using Framer Motion
- **Masonry Gallery**: Waterfall layout with lightbox functionality
- **Responsive Design**: Mobile-first with Sheet navigation
- **SEO Optimized**: Proper meta tags and semantic HTML

## Color Palette

| Color | Hex | Usage |
|-------|-----|-------|
| Burgundy (Primary) | #630d16 | Brand accent, Affair theme |
| Champagne (Secondary) | #D4AF37 | Highlights, gold accents |
| Cream (Background) | #FAF9F6 | Paper texture feel |
| Charcoal (Foreground) | #1A1A1A | Text, soft black |
| Dark Background | #0F0F0F | Dark mode background |

## Getting Started

### Prerequisites

- Node.js 18+
- npm or yarn
- Supabase account (for database/storage)

### Installation

1. Clone the repository:
```bash
git clone <repository-url>
cd lookmheesonya-forever.com
```

2. Install dependencies:
```bash
npm install
```

3. Set up environment variables:
```bash
cp .env.local.example .env.local
```

Edit `.env.local` and add your Supabase credentials:
```
NEXT_PUBLIC_SUPABASE_URL=your_supabase_project_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
```

### Supabase Setup

1. Create a new project in [Supabase](https://supabase.com)

2. Run the SQL schema from `supabase/schema.sql` in your Supabase SQL Editor:
   - Creates tables: members, projects, gallery, schedule
   - Sets up Row Level Security (RLS) policies
   - Creates indexes for performance

3. Create storage buckets in Supabase Storage:
   - `avatars` (public) - Member profile photos
   - `project-covers` (public) - Project cover images
   - `gallery` (public) - Gallery photos
   - `assets` (public) - General assets

4. Update `.env.local` with your Supabase URL and anon key from project settings

### Running the App

Development mode:
```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser.

Production build:
```bash
npm run build
npm start
```

## Project Structure

```
lookmheesonya-forever.com/
├── app/
│   ├── page.tsx              # Homepage with Hero section
│   ├── layout.tsx            # Root layout with fonts
│   ├── template.tsx          # Page transitions
│   ├── globals.css           # Tailwind + custom styles
│   ├── profiles/
│   │   ├── page.tsx          # Profiles listing
│   │   └── [id]/page.tsx     # Individual profile (dynamic)
│   ├── gallery/page.tsx      # Masonry gallery
│   ├── projects/page.tsx     # Projects timeline
│   └── schedule/page.tsx     # Events calendar
├── components/
│   ├── ui/                   # shadcn/ui components
│   ├── theme-provider.tsx    # Dark mode context
│   ├── site-header.tsx       # Navigation
│   ├── site-footer.tsx       # Footer
│   └── page-transition.tsx   # Transition wrapper
├── lib/
│   ├── utils.ts              # Utility functions (cn)
│   └── supabase.ts           # Supabase client + types
└── supabase/
    └── schema.sql            # Database schema
```

## Pages

- **/** - Hero section with asymmetric image layout, quote section, latest updates
- **/profiles** - Member profiles listing
- **/profiles/[id]** - Individual profile with fixed image + scrollable content
- **/gallery** - Masonry gallery with tag filtering and lightbox
- **/projects** - Timeline-style project showcase
- **/schedule** - Events calendar with past/upcoming events

## Customization

### Adding Real Images

Replace the placeholder gradient divs with actual images using Next.js Image:

```tsx
import Image from 'next/image';

<Image
  src={member.avatar_url || '/placeholder.jpg'}
  alt={member.name}
  width={400}
  height={500}
  className="object-cover"
/>
```

### Connecting to Supabase

Update the data fetching in pages to use Supabase:

```tsx
import { supabase } from '@/lib/supabase';

const { data: members } = await supabase
  .from('members')
  .select('*');
```

### Modifying Colors

Edit `app/globals.css` to customize the theme:

```css
:root {
  --primary: #630d16;  /* Change burgundy */
  --secondary: #D4AF37; /* Change champagne gold */
}
```

## License

This is a fan-made project. All rights to LMSY (Lookmhee & Sonya) and the Affair series belong to their respective owners.

## Credits

- Designed with inspiration from digital magazine aesthetics
- Built with [Next.js](https://nextjs.org)
- UI components from [shadcn/ui](https://ui.shadcn.com)
