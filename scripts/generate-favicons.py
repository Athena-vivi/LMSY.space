"""
Favicon Generator for LMSY Website
Generates multiple favicon sizes from lmsy-logo.png
"""

from PIL import Image
import os


def generate_favicons(input_path, output_dir):
    """
    Generate favicon files from logo image

    Args:
        input_path: Path to lmsy-logo.png
        output_dir: Directory to save favicon files (usually 'public')
    """
    # Open the logo
    img = Image.open(input_path).convert('RGBA')

    # Create output directory if it doesn't exist
    os.makedirs(output_dir, exist_ok=True)

    # Generate different sizes
    sizes = {
        'favicon-16x16.png': 16,
        'favicon-32x32.png': 32,
        'apple-touch-icon.png': 180,
    }

    for filename, size in sizes.items():
        # Resize image
        resized = img.resize((size, size), Image.Resampling.LANCZOS)
        # Save
        output_path = os.path.join(output_dir, filename)
        resized.save(output_path, 'PNG')
        print(f"✓ Generated: {filename} ({size}x{size})")

    # Generate favicon.ico (contains 16x16 and 32x32)
    from PIL import ImageFile
    ImageFile.SAVE['ICO'] = ('bitmap_format',)

    ico_path = os.path.join(output_dir, 'favicon.ico')
    img.save(
        ico_path,
        format='ICO',
        sizes=[(16, 16), (32, 32), (48, 48)]
    )
    print(f"✓ Generated: favicon.ico")

    print("\nAll favicons generated successfully!")
    print(f"Output directory: {output_dir}")


def main():
    # Define paths
    script_dir = os.path.dirname(os.path.abspath(__file__))
    project_root = os.path.dirname(script_dir)
    input_image = os.path.join(project_root, 'public', 'lmsy-logo.png')
    output_dir = os.path.join(project_root, 'public')

    # Check if input file exists
    if not os.path.exists(input_image):
        print(f"✗ Error: lmsy-logo.png not found at: {input_image}")
        print("\nPlease place your lmsy-logo.png in the public/ directory first.")
        return

    print("Generating favicons from lmsy-logo.png...")
    print(f"Input: {input_image}")
    print(f"Output: {output_dir}")
    print()

    # Generate favicons
    generate_favicons(input_image, output_dir)

    print("\nFavicon files ready:")
    print("  - favicon.ico (browser tab)")
    print("  - favicon-16x16.png (legacy browsers)")
    print("  - favicon-32x32.png (modern browsers)")
    print("  - apple-touch-icon.png (iOS devices)")


if __name__ == '__main__':
    main()
