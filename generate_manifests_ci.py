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
    """Exports public link using mega-export."""
    output = run_cmd(["mega-export", "-a", mega_path], timeout_sec=10)
    match = re.search(r'https://mega\.nz/[^\s]+', output)
    if match:
        return match.group(0)
    
    # Fallback to checking existing exports
    export_list = run_cmd(["mega-export"], timeout_sec=5)
    for line in export_list.splitlines():
        if mega_path in line:
            fallback = re.search(r'https://mega\.nz/[^\s]+', line)
            if fallback:
                return fallback.group(0)
    return None

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
            
            print(f"  📄 Processing {'Folder' if is_dir else 'File'}: {item_path}")
            link = get_public_link(item_path)
            
            if is_dir:
                items.append({
                    "name": name,
                    "type": "folder",
                    "url": link,
                    "children": scan_folder(item_path)
                })
            else:
                items.append({
                    "name": name,
                    "type": "file",
                    "url": link
                })
    return items

RESOURCES_PATH = "/icse-resources-webpage-data/icse-resources-files"
QUIZZES_PATH = "/icse-resources-webpage-data/quizzes"

print(f"🚀 Scanning resource files from: {RESOURCES_PATH}")
files_manifest = scan_folder(RESOURCES_PATH)

# Save JSON manifest
with open("files.json", "w", encoding="utf-8") as f:
    json.dump(files_manifest, f, indent=2)

print("\n✅ Successfully updated manifests!")