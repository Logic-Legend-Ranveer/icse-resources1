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

def get_public_link(mega_path):
    """Forces generation of a public export link for a file."""
    output = run_cmd(["mega-export", "-a", mega_path], timeout_sec=25)
    match = re.search(r'https://mega\.nz/[^\s]+', output)
    if match:
        return match.group(0)
    
    # Fallback to checking existing exports if -a didn't print URL directly
    export_list = run_cmd(["mega-export"], timeout_sec=10)
    for line in export_list.splitlines():
        if mega_path in line:
            fallback = re.search(r'https://mega\.nz/[^\s]+', line)
            if fallback:
                return fallback.group(0)
    return ""

def scan_folder(folder_path):
    """Recursively scans folders using mega-ls."""
    items = []
    print(f"\n🔍 Listing directory: {folder_path}")
    output = run_cmd(["mega-ls", "-l", folder_path], timeout_sec=15)
    
    if not output:
        return items

    for line in output.splitlines():
        line = line.strip()
        if not line:
            continue
        
        parts = line.split(maxsplit=5)
        if len(parts) >= 6:
            is_dir = line.startswith('d')
            name = parts[-1]
            item_path = f"{folder_path}/{name}"
            
            if is_dir:
                print(f"  📁 Traversing Folder: {item_path}")
                items.append({
                    "name": name,
                    "type": "folder",
                    "url": "",  # Folders don't need export URLs
                    "children": scan_folder(item_path)
                })
            else:
                print(f"  📄 Exporting File: {item_path}")
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
