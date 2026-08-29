import subprocess
import json
import re
import os
import time

def run_cmd(cmd_list, timeout_sec=30):
    """Runs system commands in Linux CI environment."""
    try:
        result = subprocess.run(
            cmd_list,
            capture_output=True,
            text=True,
            timeout=timeout_sec
        )
        if result.returncode != 0:
            print(f"    ⚠️ Command exited {result.returncode}: {result.stderr.strip()}")
        return result.stdout.strip()
    except subprocess.TimeoutExpired:
        print(f"    ⚠️ Timed out after {timeout_sec}s: {' '.join(cmd_list)}")
        return ""
    except Exception as e:
        print(f"    ⚠️ Command failed: {e}")
        return ""

def login_to_mega():
    """Logs in to MEGA and waits for session to be ready."""
    email = os.environ.get("MEGA_EMAIL")
    password = os.environ.get("MEGA_PASSWORD")

    if not email or not password:
        raise RuntimeError("MEGA_EMAIL or MEGA_PASSWORD environment variables not set.")

    print("🔐 Logging in to MEGA...")
    run_cmd(["mega-login", email, password], timeout_sec=40)

    # Wait for MEGAcmd server session to stabilise
    for attempt in range(6):
        time.sleep(5)
        whoami = run_cmd(["mega-whoami"], timeout_sec=15)
        if whoami and "@" in whoami:
            print(f"✅ Logged in as: {whoami}")
            return
        print(f"    ⏳ Waiting for session... attempt {attempt + 1}/6")

    raise RuntimeError("❌ MEGA login failed or session never became ready.")

# Global cache for existing links to avoid calling MEGA API repeatedly
EXISTING_LINKS_CACHE = None

def build_links_cache():
    """Fetches all existing export links once and caches them."""
    global EXISTING_LINKS_CACHE
    EXISTING_LINKS_CACHE = {}

    print("\n📦 Fetching existing export links (bulk)...")
    # mega-export / correctly lists all existing exports in the account
    raw_exports = run_cmd(["mega-export", "/"], timeout_sec=60)

    if not raw_exports:
        print("    ⚠️ Could not fetch existing exports. Will generate links individually.")
        return

    for line in raw_exports.splitlines():
        match = re.search(r'(https://mega\.nz/[^\s]+)', line)
        if not match:
            continue
        url = match.group(1)
        # Strip the URL from the line to get the path portion
        path_part = line.replace(url, "").strip().rstrip(':').strip()
        if path_part:
            EXISTING_LINKS_CACHE[path_part] = url
            # Also index by filename alone for fuzzy fallback matching
            filename = path_part.split('/')[-1]
            if filename:
                EXISTING_LINKS_CACHE[filename] = url

    print(f"    ✅ Cached {len(EXISTING_LINKS_CACHE)} existing export entries.")

def run_cmd_with_stderr(cmd_list, timeout_sec=30):
    """Like run_cmd but returns combined stdout+stderr — needed because MEGAcmd 
    sometimes prints links to stderr (e.g. on already-exported files)."""
    try:
        result = subprocess.run(
            cmd_list,
            capture_output=True,
            text=True,
            timeout=timeout_sec
        )
        combined = (result.stdout + "\n" + result.stderr).strip()
        if result.returncode != 0:
            print(f"    ⚠️ Exit {result.returncode}: {result.stderr.strip()[:120]}")
        return combined
    except subprocess.TimeoutExpired:
        print(f"    ⚠️ Timed out after {timeout_sec}s: {' '.join(cmd_list)}")
        return ""
    except Exception as e:
        print(f"    ⚠️ Command failed: {e}")
        return ""

def get_public_link(mega_path):
    """Returns public link for a MEGA path, using cache to avoid redundant API calls."""
    global EXISTING_LINKS_CACHE

    if EXISTING_LINKS_CACHE is None:
        build_links_cache()

    # Exact path match
    if mega_path in EXISTING_LINKS_CACHE:
        return EXISTING_LINKS_CACHE[mega_path]

    # Filename-only fallback
    file_name_only = mega_path.split('/')[-1]
    if file_name_only in EXISTING_LINKS_CACHE:
        return EXISTING_LINKS_CACHE[file_name_only]

    # Not in cache — try to read existing export first (no -a flag)
    print(f"    🔎 Checking existing export for: {mega_path}")
    read_output = run_cmd_with_stderr(["mega-export", mega_path], timeout_sec=30)
    match = re.search(r'(https://mega\.nz/[^\s]+)', read_output)
    if match:
        url = match.group(1)
        print(f"    ✅ Found existing link.")
        EXISTING_LINKS_CACHE[mega_path] = url
        EXISTING_LINKS_CACHE[file_name_only] = url
        return url

    # Truly no export yet — create one
    print(f"    ⚡ Generating NEW export link for: {mega_path}")
    new_output = run_cmd_with_stderr(["mega-export", "-a", mega_path], timeout_sec=30)
    match = re.search(r'(https://mega\.nz/[^\s]+)', new_output)
    if match:
        url = match.group(1)
        EXISTING_LINKS_CACHE[mega_path] = url
        EXISTING_LINKS_CACHE[file_name_only] = url
        return url

    print(f"    ❌ Failed to get link for: {mega_path}")
    return ""

def parse_mega_ls(output):
    """
    Parses mega-ls -l output correctly, handling filenames with spaces.
    Returns list of (is_dir, full_name) tuples.
    """
    results = []
    for line in output.splitlines():
        line = line.strip()
        if not line or line.startswith('FLAGS') or line.endswith(':'):
            continue
        # mega-ls -l columns: FLAGS  VERSION  SIZE  DATE  TIME  NAME
        # Split on whitespace, but only up to 5 splits so NAME captures everything
        parts = line.split(None, 5)  # maxsplit=5 gives us 6 parts
        if len(parts) < 6:
            continue
        is_dir = parts[0].startswith('d')
        full_name = parts[5].strip()  # parts[5] = everything after the 5th space = full filename
        results.append((is_dir, full_name))
    return results

def scan_folder(folder_path):
    items = []
    print(f"\n🔍 Listing directory: {folder_path}")
    output = run_cmd(["mega-ls", "-l", folder_path], timeout_sec=20)

    if not output:
        print(f"    ⚠️ Empty or failed listing for: {folder_path}")
        return items

    for is_dir, name in parse_mega_ls(output):
        item_path = f"{folder_path}/{name}"
        if is_dir:
            print(f"  📁 Traversing folder: {item_path}")
            items.append({
                "name": name,
                "type": "folder",
                "url": "",
                "children": scan_folder(item_path)
            })
        else:
            print(f"  📄 Processing file: {item_path}")
            link = get_public_link(item_path)
            items.append({"name": name, "type": "file", "url": link})

    return items


RESOURCES_PATH = "/icse-resources-webpage-data/icse-resources-files"
QUIZZES_PATH = "/icse-resources-webpage-data/quizzes"

# --- Step 0: Login ---
login_to_mega()

# --- Step 1: Build the exports cache ONCE before any scanning ---
build_links_cache()

# --- Step 2: Scan Resources ---
print(f"\n🚀 Scanning resource files from: {RESOURCES_PATH}")
files_manifest = scan_folder(RESOURCES_PATH)

# --- Step 3: Scan Quizzes ---
print(f"\n🚀 Scanning quizzes from: {QUIZZES_PATH}")
quizzes_manifest = []
quiz_output = run_cmd(["mega-ls", "-l", QUIZZES_PATH], timeout_sec=20)

if quiz_output:
    for line in quiz_output.splitlines():
        line = line.strip()
        if not line or line.startswith('FLAGS') or line.endswith(':'):
            continue

        parts = line.split(maxsplit=5)
        if len(parts) < 6:
            continue

        is_dir = line.startswith('d')
        name = parts[-1]
        item_path = f"{QUIZZES_PATH}/{name}"

        if is_dir:
            sub_output = run_cmd(["mega-ls", "-l", item_path], timeout_sec=20)
            for sub_line in sub_output.splitlines():
                sub_line = sub_line.strip()
                if not sub_line or sub_line.startswith('FLAGS') or sub_line.endswith(':'):
                    continue
                sub_parts = sub_line.split(maxsplit=5)
                if len(sub_parts) >= 6 and not sub_line.startswith('d'):
                    file_name = sub_parts[-1]
                    file_path = f"{item_path}/{file_name}"
                    print(f"  📄 Processing quiz file: {file_path}")
                    link = get_public_link(file_path)
                    quizzes_manifest.append({
                        "id": f"{name.lower()}-{file_name.replace('.txt', '').lower().replace(' ', '-')}",
                        "subject": name,
                        "title": file_name.replace('.txt', '').replace('_', ' ').title(),
                        "url": link
                    })

        elif name.endswith('.txt'):
            print(f"  📄 Processing quiz file: {item_path}")
            link = get_public_link(item_path)
            quizzes_manifest.append({
                "id": name.replace('.txt', '').lower().replace(' ', '-'),
                "subject": "General",
                "title": name.replace('.txt', '').replace('_', ' ').title(),
                "url": link
            })

# --- Step 4: Save manifests ---
os.makedirs("public", exist_ok=True)

with open("public/files.json", "w", encoding="utf-8") as f:
    json.dump(files_manifest, f, indent=2)

with open("public/quizzes.json", "w", encoding="utf-8") as f:
    json.dump(quizzes_manifest, f, indent=2)

print("\n✅ Successfully updated manifests in public/")
