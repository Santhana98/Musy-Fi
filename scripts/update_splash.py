import os
from PIL import Image

def generate_splash():
    source_img_path = r"d:\Musyfy\public\logo.jpg"
    if not os.path.exists(source_img_path):
        print("Source image not found.")
        return

    img = Image.open(source_img_path).convert("RGBA")
    logo = img.resize((512, 512), Image.Resampling.LANCZOS)
    
    # create round mask for logo
    mask = Image.new('L', (512, 512), 0)
    from PIL import ImageDraw
    draw = ImageDraw.Draw(mask)
    draw.ellipse((0, 0, 512, 512), fill=255)
    round_logo = logo.copy()
    round_logo.putalpha(mask)

    android_res_dir = r"d:\Musyfy\android\app\src\main\res"
    splash_sizes = {
        "drawable": (2732, 2732),
        "drawable-port-mdpi": (768, 1280),
        "drawable-port-hdpi": (1200, 1920),
        "drawable-port-xhdpi": (1536, 2560),
        "drawable-port-xxhdpi": (2160, 3840),
        "drawable-port-xxxhdpi": (2880, 5120),
        "drawable-land-mdpi": (1280, 768),
        "drawable-land-hdpi": (1920, 1200),
        "drawable-land-xhdpi": (2560, 1536),
        "drawable-land-xxhdpi": (3840, 2160),
        "drawable-land-xxxhdpi": (5120, 2880),
    }

    for folder, (width, height) in splash_sizes.items():
        folder_path = os.path.join(android_res_dir, folder)
        if not os.path.exists(folder_path):
            os.makedirs(folder_path)
            
        splash = Image.new('RGBA', (width, height), (20, 8, 8, 255)) # Dark red-ish background like login page (14,8,8)
        
        # Center the logo
        offset = ((width - 512) // 2, (height - 512) // 2)
        splash.paste(round_logo, offset, round_logo)
        
        splash_path = os.path.join(folder_path, "splash.png")
        splash.save(splash_path, format="PNG")
        print(f"Saved {splash_path}")

if __name__ == "__main__":
    generate_splash()
