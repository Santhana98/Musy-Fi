import os
from PIL import Image

def generate_icons():
    source_img_path = r"d:\Musyfy\public\logo.jpg"
    if not os.path.exists(source_img_path):
        print("Source image not found.")
        return

    # Open image
    img = Image.open(source_img_path).convert("RGBA")
    
    # 1. PWA Icons
    pwa_icons = [
        (r"d:\Musyfy\public\logo-192.png", 192),
        (r"d:\Musyfy\public\logo-512.png", 512),
        (r"d:\Musyfy\public\logo-maskable.png", 512),
    ]
    for path, size in pwa_icons:
        resized = img.resize((size, size), Image.Resampling.LANCZOS)
        resized.save(path, format="PNG")
        print(f"Saved {path}")

    # 2. Favicon
    favicon_path = r"d:\Musyfy\public\favicon.ico"
    resized = img.resize((32, 32), Image.Resampling.LANCZOS)
    resized.save(favicon_path, format="ICO")
    print(f"Saved {favicon_path}")

    # 3. Android App Icons
    android_res_dir = r"d:\Musyfy\android\app\src\main\res"
    android_sizes = {
        "mipmap-mdpi": 48,
        "mipmap-hdpi": 72,
        "mipmap-xhdpi": 96,
        "mipmap-xxhdpi": 144,
        "mipmap-xxxhdpi": 192,
    }
    for folder, size in android_sizes.items():
        folder_path = os.path.join(android_res_dir, folder)
        if os.path.exists(folder_path):
            resized = img.resize((size, size), Image.Resampling.LANCZOS)
            
            # create round mask
            mask = Image.new('L', (size, size), 0)
            from PIL import ImageDraw
            draw = ImageDraw.Draw(mask)
            draw.ellipse((0, 0, size, size), fill=255)
            round_img = resized.copy()
            round_img.putalpha(mask)

            launcher_path = os.path.join(folder_path, "ic_launcher.png")
            launcher_round_path = os.path.join(folder_path, "ic_launcher_round.png")
            
            resized.save(launcher_path, format="PNG")
            round_img.save(launcher_round_path, format="PNG")
            print(f"Saved {launcher_path} and {launcher_round_path}")

if __name__ == "__main__":
    generate_icons()
