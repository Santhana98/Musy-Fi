import os
from PIL import Image

def generate_icons():
    logo_path = os.path.join('public', 'logo.jpg')
    if not os.path.exists(logo_path):
        print(f"Error: {logo_path} does not exist.")
        return
    
    print("Loading original logo.jpg...")
    img = Image.open(logo_path)
    
    # 1. Generate 192x192 icon
    print("Generating logo-192.png...")
    img_192 = img.resize((192, 192), Image.Resampling.LANCZOS)
    img_192.save(os.path.join('public', 'logo-192.png'), 'PNG')
    
    # 2. Generate 512x512 icon
    print("Generating logo-512.png...")
    img_512 = img.resize((512, 512), Image.Resampling.LANCZOS)
    img_512.save(os.path.join('public', 'logo-512.png'), 'PNG')
    
    # 3. Generate 512x512 maskable icon (padding the logo so it doesn't get clipped by Android launcher masks)
    print("Generating logo-maskable.png...")
    maskable_canvas = Image.new('RGB', (512, 512), color=(7, 7, 8)) # Match app's dark bg theme color
    # Resize original logo to 360x360 (approx 70% of canvas)
    logo_resized = img.resize((360, 360), Image.Resampling.LANCZOS)
    # Paste centered
    offset = ((512 - 360) // 2, (512 - 360) // 2)
    maskable_canvas.paste(logo_resized, offset)
    maskable_canvas.save(os.path.join('public', 'logo-maskable.png'), 'PNG')
    
    print("All icons successfully generated in public/ directory!")

if __name__ == '__main__':
    generate_icons()
