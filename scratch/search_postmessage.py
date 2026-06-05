import re
import os

keywords = ["postMessage", "parent", "window.top", "top.postMessage", "parent.postMessage"]
dir_path = "scratch/nuxt_chunks"

for filename in os.listdir(dir_path):
    if filename.endswith(".js"):
        filepath = os.path.join(dir_path, filename)
        with open(filepath, "r", encoding="utf-8") as f:
            content = f.read()
            for kw in keywords:
                if kw in content:
                    print(f"Found '{kw}' in {filename}!")
                    # Find context
                    for m in re.finditer(re.escape(kw), content):
                        pos = m.start()
                        print(f"  Context: {content[max(0, pos-100):min(len(content), pos+200)]}")
