# Cloudflare R2 Integration Guide

This guide explains how to set up Cloudflare R2 as the image storage engine for lmsy.space.

## Why Cloudflare R2?

- **Zero Egress Fees**: Unlike AWS S3, R2 doesn't charge for data transfer
- **S3 Compatible**: Works with existing S3 SDKs and tools
- **Global CDN**: Built-in Cloudflare CDN integration
- **Custom Domain**: Use `cdn.lmsy.space` for branded image URLs
- **SEO Benefits**: Consistent CDN domain improves site authority

## Setup Steps

### 1. Create R2 Bucket

1. Go to [Cloudflare Dashboard](https://dash.cloudflare.com/)
2. Navigate to **R2 > Overview**
3. Click **Create bucket**
4. Enter bucket name: `lmsy-gallery`
5. Select location (recommended: Auto for global distribution)
6. Click **Create bucket**

### 2. Get API Tokens

1. Navigate to **R2 > Overview**
2. Scroll to **R2 API Tokens**
3. Click **Create API token**
4. Choose permissions:
   - **Object Read & Write**
   - Scope to bucket: `lmsy-gallery`
5. Copy the **Access Key ID** and **Secret Access Key**
6. Save these securely - you won't see the Secret again!

### 3. Get Your Account ID

Your Account ID is available in the Cloudflare Dashboard URL:
```
https://dash.cloudflare.com/<YOUR_ACCOUNT_ID>/r2
```

Or find it in **Overview** page right sidebar.

### 4. Configure Custom Domain (Optional but Recommended)

1. Go to your domain's DNS settings in Cloudflare
2. Add CNAME record:
   - **Name**: `cdn`
   - **Target**: Your R2 public bucket URL
   - **Proxy**: Proxied (orange cloud)

3. In R2 dashboard, go to **Settings > Public Access**
4. Click **Configure Custom Domain**
5. Enter: `cdn.lmsy.space`
6. Follow verification steps

### 5. Update Environment Variables

Create/update `.env.local`:

```bash
# Cloudflare R2 Configuration
R2_ENDPOINT=https://<YOUR_ACCOUNT_ID>.r2.cloudflarestorage.com
R2_ACCESS_KEY_ID=your_access_key_here
R2_SECRET_ACCESS_KEY=your_secret_key_here
R2_BUCKET_NAME=lmsy-gallery

# CDN Configuration
NEXT_PUBLIC_CDN_URL=https://cdn.lmsy.space
```

### 6. Database Schema

The `gallery` table stores **relative paths only**:

```sql
-- Example data
INSERT INTO gallery (image_url, title) VALUES
('gallery/LMSY-G-2025-001.jpg', 'Photoshoot 1'),
('gallery/LMSY-G-2025-002.jpg', 'Photoshoot 2');
```

**Why relative paths?**
- Easy to migrate CDN providers
- Smaller database size
- Cleaner data structure
- SEO-friendly CDN URLs

## Usage

### Uploading Images

```typescript
import { uploadToR2 } from '@/lib/r2-client';

// Upload file
const result = await uploadToR2(file, 'gallery/photo.jpg');

// Result:
// {
//   success: true,
//   path: 'gallery/photo.jpg',
//   url: 'https://cdn.lmsy.space/gallery/photo.jpg'
// }

// Store only the path in database
await supabase.from('gallery').insert({
  image_url: result.path, // 'gallery/photo.jpg'
  title: 'My Photo'
});
```

### Displaying Images

```typescript
import { getImageUrl } from '@/lib/image-url';

// Get image URL from database
const image = await supabase
  .from('gallery')
  .select('image_url')
  .single();

// Convert to full URL
const fullUrl = getImageUrl(image.image_url);
// => 'https://cdn.lmsy.space/gallery/photo.jpg'

// Use in Next.js Image component
<Image src={fullUrl} alt="Photo" width={800} height={600} />
```

### Handling Legacy Data

The system supports both old and new URLs:

```typescript
// Legacy Supabase URL (still works)
getImageUrl('https://xyz.supabase.co/storage/v1/object/...')
// => 'https://xyz.supabase.co/storage/v1/object/...'

// New R2 path
getImageUrl('gallery/photo.jpg')
// => 'https://cdn.lmsy.space/gallery/photo.jpg'
```

## Migration from Supabase Storage

To migrate existing images:

1. **Download all images** from Supabase Storage
2. **Upload to R2** using the upload script
3. **Update database** to use relative paths:

```sql
-- Update existing records
UPDATE gallery
SET image_url = REPLACE(
  image_url,
  'https://your-project.supabase.co/storage/v1/object/public/images/',
  ''
)
WHERE image_url LIKE 'https://your-project.supabase.co/%';
```

## Cost Comparison

### Supabase Storage
- Storage: $0.021/GB/month
- Bandwidth: $0.095/GB (egress)

### Cloudflare R2
- Storage: $0.015/GB/month
- Bandwidth: **FREE** (no egress fees)

**Example** (100GB storage, 1TB transfer/month):
- Supabase: $2.10 + $95 = **$97.10/month**
- R2: $1.50 + $0 = **$1.50/month**

**Savings: $95.60/month (98.5%)**

## SEO Benefits

Using a custom CDN domain:

✅ **Brand Authority**: `cdn.lmsy.space` looks professional
✅ **Consistent URLs**: All images from one domain
✅ **CDN Performance**: Cloudflare's global edge network
✅ **Browser Caching**: Better cache control across pages
✅ **Social Sharing**: Clean URLs in OpenGraph images

## Troubleshooting

### Upload Failed

- Check API credentials in `.env.local`
- Verify R2 bucket exists
- Ensure bucket has proper permissions

### Images Not Loading

- Verify `NEXT_PUBLIC_CDN_URL` is set
- Check custom domain DNS configuration
- Ensure R2 public access is enabled

### CORS Errors

If using R2 directly from browser, add CORS policy:

```javascript
// In R2 bucket settings
[
  {
    "AllowedOrigins": ["https://lmsy.space"],
    "AllowedMethods": ["GET", "HEAD"],
    "AllowedHeaders": ["*"]
  }
]
```

## Best Practices

1. **Always use relative paths** in database
2. **Use `getImageUrl()` helper** for display
3. **Enable caching** headers in R2
4. **Monitor usage** in Cloudflare dashboard
5. **Set up alerts** for budget limits
6. **Use WebP format** for better compression
7. **Implement lazy loading** for better performance

## Additional Resources

- [Cloudflare R2 Documentation](https://developers.cloudflare.com/r2/)
- [AWS S3 SDK for JavaScript](https://docs.aws.amazon.com/AWSJavaScriptSDK/v3/latest/)
- [Next.js Image Optimization](https://nextjs.org/docs/api-reference/next/image)
