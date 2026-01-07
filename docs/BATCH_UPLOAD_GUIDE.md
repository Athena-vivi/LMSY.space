# Batch Metadata Editor Guide

## Overview

The Batch Metadata Editor allows you to curate professional photo collections in minutes by applying metadata to multiple images at once.

## Features

### 1. Blur Placeholders
- **Automatic generation**: Plaiceholder creates a 32x32 blur thumbnail during upload
- **Base64 storage**: Blur data stored in `blur_data` field
- **Progressive loading**: Images show smooth color blur before loading
- **Better UX**: No more blank loading spaces

### 2. Batch Metadata Fields

| Field | Description | Example |
|-------|-------------|---------|
| **Credits (Source)** | Image source attribution | "Vogue Thailand Jan 2025 \| Photo: Pongthorn Nitinun" |
| **Event Date** | Override default event date | "2025-01-15" |
| **Catalog ID** | Unique archive identifier | "LMSY-G-2025-001" |
| **Magazine Issue** | Magazine publication info | "Vogue Thailand January 2025" |

## Workflow Example

### Scenario: Uploading a Magazine Editorial

1. **Select 10 photos** from Vogue Thailand January 2025 photoshoot
2. **Open Batch Metadata Editor** (Sparkle icon)
3. **Fill in the fields**:
   ```
   Credits:        Vogue Thailand Jan 2025 | Photo: Pongthorn Nitinun
   Event Date:      2025-01-15
   Catalog ID:      LMSY-G-2025-015
   Magazine Issue:  Vogue Thailand January 2025
   ```
4. **Click Upload**
5. **Result**: All 10 images uploaded with:
   - ✅ Blur placeholders generated
   - ✅ Proper credits tagged
   - ✅ Event date set
   - ✅ Catalog ID assigned
   - ✅ Magazine issue recorded

**Time saved**: ~30 minutes → ~3 minutes

## Database Schema

```sql
CREATE TABLE gallery (
  -- Existing fields
  id UUID PRIMARY KEY,
  image_url TEXT NOT NULL,
  title VARCHAR(255),
  description TEXT,
  tag VARCHAR(100),
  caption TEXT,
  is_featured BOOLEAN DEFAULT FALSE,
  archive_number VARCHAR(50),
  event_date DATE,
  project_id UUID,
  member_id UUID,
  created_at TIMESTAMP DEFAULT NOW(),

  -- NEW: Blur placeholder
  blur_data TEXT,  -- Base64 blur data for progressive loading

  -- NEW: Batch metadata fields
  credits TEXT,           -- Source attribution
  catalog_id VARCHAR(255),  -- Unique catalog identifier
  magazine_issue VARCHAR(255),  -- Magazine publication info
);
```

## Frontend Usage

### Displaying Images with Blur

```tsx
import Image from 'next/image';
import { getImageUrl } from '@/lib/image-url';

// Image with blur placeholder
<Image
  src={getImageUrl(image.image_url)}
  alt={image.title}
  width={800}
  height={600}
  placeholder="blur"
  blurDataURL={image.blur_data || undefined}
  className="rounded-lg"
/>
```

### Querying by Metadata

```typescript
// Get all images from a magazine issue
const { data } = await supabase
  .from('gallery')
  .select('*')
  .eq('magazine_issue', 'Vogue Thailand January 2025')
  .order('created_at', { ascending: true });

// Get all images by catalog ID
const { data } = await supabase
  .from('gallery')
  .select('*')
  .eq('catalog_id', 'LMSY-G-2025-015');
```

## Best Practices

### Credits Format

Follow consistent credit format:
```
[Magazine Name] [Month/Year] | Photo: [Photographer Name]
```

Examples:
- "Vogue Thailand Jan 2025 | Photo: Pongthorn Nitinun"
- "L'Officiel Thailand Dec 2024 | Photo: Surutchai Sunkhamani"
- "Harper's Bazaar Thailand Feb 2025 | Photo: Winai Wannalerd"

### Catalog ID Pattern

Use consistent catalog ID format:
```
LMSY-[Type]-[Year]-[Sequence]
```

Types:
- `G` = Gallery photos
- `E` = Editorial/Magazine
- `P` = Projects
- `S` = Schedule/Events

Examples:
- `LMSY-G-2025-001` (Gallery photo #1, 2025)
- `LMSY-E-2025-015` (Editorial #15, 2025)
- `LMSY-P-2024-042` (Project #42, 2024)

### Magazine Issue Format

Use full magazine name:
- "Vogue Thailand January 2025"
- "L'Officiel Thailand December 2024"
- "Harper's Bazaar Thailand February 2025"

## Performance Benefits

### Blur Placeholders

**Without blur**:
- ❌ Blank space while loading
- ❌ Layout shift
- ❌ Poor user experience

**With blur**:
- ✅ Smooth color preview
- ✅ No layout shift
- ✅ Professional feel
- ✅ Better perceived performance

### Batch Editing

**Manual editing** (10 images):
- Open each image: 10 × 30s = 5 minutes
- Edit credits: 10 × 20s = 3.3 minutes
- Set date: 10 × 10s = 1.7 minutes
- **Total**: ~10 minutes

**Batch editor** (10 images):
- Fill form once: 30 seconds
- Click upload: 1 click
- **Total**: ~31 seconds

**Time saved**: 95%

## Tips

1. **Prepare metadata beforehand**
   - Copy credits from magazine website
   - Note the publication date
   - Have catalog ID ready

2. **Use consistent formatting**
   - Follow credit format guidelines
   - Use standard catalog ID pattern
   - Keep magazine issue naming consistent

3. **Test with small batches first**
   - Upload 2-3 images to test
   - Verify blur generation works
   - Check metadata is applied correctly
   - Then upload the full batch

4. **Keep batch sizes manageable**
   - 10-20 images per batch is ideal
   - Larger batches may timeout
   - You can always do multiple batches

## Troubleshooting

### Blur data not generated?

- Check console for Plaiceholder errors
- Ensure image is a supported format (JPEG, PNG, WebP)
- Verify image file isn't corrupted

### Batch metadata not applied?

- Ensure fields are filled before upload
- Check browser console for errors
- Verify database schema has new columns

### Upload slow?

- Blur generation adds ~1-2 seconds per image
- This is normal and worth it for UX
- Consider smaller batches if timeout issues

## Future Enhancements

Planned features:
- [ ] Preset templates (Vogue, L'Officiel, etc.)
- [ ] Auto-fill from previous uploads
- [ ] CSV import for metadata
- [ ] Bulk edit existing images
- [ ] Metadata validation rules
- [ ] AI-powered credit extraction
