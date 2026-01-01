# Favicon Setup Guide

## Method 1: Using Python Script (Recommended)

### Prerequisites
```bash
pip install Pillow
```

### Generate Favicons
```bash
python scripts/generate-favicons.py
```

This will create:
- `favicon.ico` - Standard favicon for browsers
- `favicon-16x16.png` - 16x16 PNG for legacy browsers
- `favicon-32x32.png` - 32x32 PNG for modern browsers
- `apple-touch-icon.png` - 180x180 PNG for iOS devices

---

## Method 2: Online Favicon Generators

If you don't have Python, use these free online tools:

### 1. Favicon.io (Easiest)
- Website: https://favicon.io/
- Upload: `public/lmsy-logo.png`
- Download the favicon package
- Extract and place files in `public/` directory

### 2. RealFaviconGenerator (Best for iOS)
- Website: https://realfavicongenerator.net/
- Upload your logo
- Customize iOS, Android, and Windows settings
- Download the package
- Extract files to `public/` directory

### 3.favicon.cc (Advanced)
- Website: https://www.favicon.cc/
- Upload your logo
- Adjust settings
- Download favicon.ico

---

## Method 3: Manual Creation (Design Software)

### Using Photoshop/Illustrator/GIMP
1. Open `lmsy-logo.png`
2. Create these sizes:
   - **16x16 px**: Save as `favicon-16x16.png`
   - **32x32 px**: Save as `favicon-32x32.png`
   - **180x180 px**: Save as `apple-touch-icon.png`
   - **ICO**: Use online converter or Photoshop plugin
3. Place all files in `public/` directory

---

## Files Needed in `public/` Directory

After generation, ensure you have these files:

```
public/
├── lmsy-logo.png              (your source logo)
├── favicon.ico                (browser tab icon)
├── favicon-16x16.png          (16x16 PNG)
├── favicon-32x32.png          (32x32 PNG)
└── apple-touch-icon.png       (180x180 iOS icon)
```

---

## Verification

### Check in Browser
1. Clear browser cache (Ctrl+Shift+Delete)
2. Open your website: http://localhost:3000
3. Check the browser tab - you should see your logo
4. Bookmark the page - favicon should appear

### Test on iOS
1. Open website on iPhone/iPad
2. Tap Share button
3. Scroll down and tap "Add to Home Screen"
4. You should see your custom icon

---

## Troubleshooting

### Favicon not showing
- **Clear browser cache**: Ctrl+Shift+Delete
- **Hard refresh**: Ctrl+F5
- **Check file paths**: Ensure files are in `public/` directory
- **Wait**: Browser may take a few minutes to update

### Favicon looks blurry
- Use higher resolution source image
- Regenerate with better quality settings

### iOS icon not working
- Ensure `apple-touch-icon.png` is exactly 180x180
- Clear Safari history and website data
- Remove and re-add to home screen

---

## After Setup

Once favicons are generated and in place:

1. **Build your site**: `npm run build`
2. **Test locally**: `npm run dev`
3. **Clear cache** and refresh browser
4. **Deploy** to see favicons in production

The metadata is already configured in `app/layout.tsx`, so no code changes needed!
