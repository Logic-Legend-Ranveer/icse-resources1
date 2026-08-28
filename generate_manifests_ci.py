import subprocess
import json
import re
import os

def run_cmd(cmd_list, timeout_sec=15):
    """Runs system commands in Linux CI environment."""
    try:
        result = subprocess.run(
            cmd_list,
            capture_output=True,
            text=True,
            timeout=timeout_sec
        )
        return result.stdout.strip()
    except Exception as e:
        print(f"    ⚠️ Command failed/timed out: {e}")
        return ""

# Global cache for existing links to avoid calling MEGA API repeatedly
EXISTING_LINKS_CACHE = None

def get_public_link(mega_path):
    global EXISTING_LINKS_CACHE
    
    # 1. Fetch all existing exports ONCE into a reliable dictionary
    if EXISTING_LINKS_CACHE is None:
        EXISTING_LINKS_CACHE = {}
        raw_exports = run_cmd(["mega-export", "-q"], timeout_sec=15) # -q for quiet/clean list if supported, or standard mega-export
        for line in raw_exports.splitlines():
            match = re.search(r'https://mega\.nz/[^\s]+', line)
            if match:
                url = match.group(0)
                # Extract path portion from the line
                path_part = line.replace(url, "").strip()
                if path_part:
                    EXISTING_LINKS_CACHE[path_part] = url
                    # Also store by just the filename/endswith for robust matching
                    EXISTING_LINKS_CACHE[path_part.split('/')[-1]] = url

    # 2. Check cache by exact path or filename match
    if mega_path in EXISTING_LINKS_CACHE:
        return EXISTING_LINKS_CACHE[mega_path]
    
    file_name_only = mega_path.split('/')[-1]
    if file_name_only in EXISTING_LINKS_CACHE:
        return EXISTING_LINKS_CACHE[file_name_only]

    # 3. Only if it truly has no export link anywhere, create one
    print(f"    ⚡ Generating NEW link for: {mega_path}")
    try:
        output = run_cmd(["mega-export", "-a", mega_path], timeout_sec=20)
        match = re.search(r'https://mega\.nz/[^\s]+', output)
        if match:
            url = match.group(0)
            EXISTING_LINKS_CACHE[mega_path] = url
            return url
    except Exception:
        pass
    
    return ""

def scan_folder(folder_path):
    """Recursively scans folders using mega-ls safely."""
    items = []
    print(f"\n🔍 Listing directory: {folder_path}")
    output = run_cmd(["mega-ls", "-l", folder_path], timeout_sec=15)
    
    if not output:
        return items

    for line in output.splitlines():
        line = line.strip()
        
        # Skip empty lines, summary lines, or directory headers ending in ':'
        if not line or line.endswith(':') or line.startswith('FLAGS'):
            continue
        
        parts = line.split(maxsplit=5)
        if len(parts) >= 6:
            is_dir = line.startswith('d')
            name = parts[-1].rstrip(':')  # Clean any accidental colons
            item_path = f"{folder_path}/{name}"
            
            if is_dir:
                print(f"  📁 Traversing Folder: {item_path}")
                items.append({
                    "name": name,
                    "type": "folder",
                    "url": "",
                    "children": scan_folder(item_path)
                })
            else:
                print(f"  📄 Processing File: {item_path}")
                link = get_public_link(item_path)
                items.append({
                    "name": name,
                    "type": "file",
                    "url": link
                })
    return items
    
RESOURCES_PATH = "/icse-resources-webpage-data/icse-resources-files"
QUIZZES_PATH = "/icse-resources-webpage-data/quizzes"

# --- Step 1: Scan Resources ---
print(f"🚀 Scanning resource files from: {RESOURCES_PATH}")
files_manifest = scan_folder(RESOURCES_PATH)

# --- Step 2: Scan Quizzes ---
print(f"\n🚀 Scanning quizzes from: {QUIZZES_PATH}")
quizzes_manifest = []
quiz_output = run_cmd(["mega-ls", "-l", QUIZZES_PATH], timeout_sec=15)

if quiz_output:
    for line in quiz_output.splitlines():
        line = line.strip()
        if not line:
            continue
        parts = line.split(maxsplit=5)
        if len(parts) >= 6:
            is_dir = line.startswith('d')
            name = parts[-1]
            item_path = f"{QUIZZES_PATH}/{name}"
            
            if is_dir:
                sub_output = run_cmd(["mega-ls", "-l", item_path], timeout_sec=15)
                for sub_line in sub_output.splitlines():
                    sub_line = sub_line.strip()
                    if not sub_line:
                        continue
                    sub_parts = sub_line.split(maxsplit=5)
                    if len(sub_parts) >= 6 and not sub_line.startswith('d'):
                        file_name = sub_parts[-1]
                        file_path = f"{item_path}/{file_name}"
                        print(f"  📄 Processing Quiz File: {file_path}")
                        link = get_public_link(file_path)
                        
                        quizzes_manifest.append({
                            "id": f"{name.lower()}-{file_name.replace('.txt', '').lower().replace(' ', '-')}",
                            "subject": name,
                            "title": file_name.replace('.txt', '').replace('_', ' ').title(),
                            "url": link
                        })
            elif name.endswith('.txt'):
                print(f"  📄 Processing Quiz File: {item_path}")
                link = get_public_link(item_path)
                quizzes_manifest.append({
                    "id": name.replace('.txt', '').lower().replace(' ', '-'),
                    "subject": "General",
                    "title": name.replace('.txt', '').replace('_', ' ').title(),
                    "url": link
                })

# --- Step 3: Ensure Output Directory Exists & Save Files ---
os.makedirs("public", exist_ok=True)

with open("public/files.json", "w", encoding="utf-8") as f:
    json.dump(files_manifest, f, indent=2)

with open("public/quizzes.json", "w", encoding="utf-8") as f:
    json.dump(quizzes_manifest, f, indent=2)

print("\n✅ Successfully updated manifests in public/")
