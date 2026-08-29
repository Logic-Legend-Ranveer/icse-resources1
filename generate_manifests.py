import os
import json
from google.oauth2.credentials import Credentials
from google_auth_oauthlib.flow import InstalledAppFlow
from google.auth.transport.requests import Request
from googleapiclient.discovery import build

SCOPES = ['https://www.googleapis.com/auth/drive.readonly']
RESOURCES_FOLDER_NAME = "icse-resources-files"  # your Google Drive folder name
QUIZZES_FOLDER_NAME = "quizzes"                  # your Google Drive folder name

def authenticate():
    creds = None
    if os.path.exists('token.json'):
        creds = Credentials.from_authorized_user_file('token.json', SCOPES)
    if not creds or not creds.valid:
        if creds and creds.expired and creds.refresh_token:
            creds.refresh(Request())
        else:
            flow = InstalledAppFlow.from_client_secrets_file('credentials.json', SCOPES)
            creds = flow.run_local_server(port=0)
        with open('token.json', 'w') as f:
            f.write(creds.to_json())
    return build('drive', 'v3', credentials=creds)

def get_folder_id(service, name, parent_id=None):
    query = f"name='{name}' and mimeType='application/vnd.google-apps.folder' and trashed=false"
    if parent_id:
        query += f" and '{parent_id}' in parents"
    results = service.files().list(q=query, fields="files(id, name)").execute()
    files = results.get('files', [])
    if not files:
        raise RuntimeError(f"Folder '{name}' not found in Drive.")
    return files[0]['id']

def scan_folder(service, folder_id, folder_path=""):
    """Recursively scans folder — stores fileId only, never the URL."""
    items = []
    page_token = None
    while True:
        response = service.files().list(
            q=f"'{folder_id}' in parents and trashed=false",
            fields="nextPageToken, files(id, name, mimeType)",
            pageSize=100,
            orderBy="name",
            pageToken=page_token
        ).execute()

        for f in response.get('files', []):
            name = f['name']
            fid = f['id']
            is_dir = f['mimeType'] == 'application/vnd.google-apps.folder'

            if is_dir:
                print(f"  📁 {folder_path}/{name}")
                items.append({
                    "name": name,
                    "type": "folder",
                    "fileId": "",
                    "children": scan_folder(service, fid, f"{folder_path}/{name}")
                })
            else:
                print(f"  📄 {folder_path}/{name} → {fid}")
                items.append({
                    "name": name,
                    "type": "file",
                    "fileId": fid  # ← ID only, never the real URL
                })

        page_token = response.get('nextPageToken')
        if not page_token:
            break
    return items

def scan_quizzes(service, quizzes_folder_id):
    quizzes = []
    response = service.files().list(
        q=f"'{quizzes_folder_id}' in parents and trashed=false",
        fields="files(id, name, mimeType)",
        orderBy="name"
    ).execute()

    for subject_folder in response.get('files', []):
        if subject_folder['mimeType'] != 'application/vnd.google-apps.folder':
            continue
        subject_name = subject_folder['name']
        subject_id = subject_folder['id']
        print(f"  📁 Quiz subject: {subject_name}")

        sub_response = service.files().list(
            q=f"'{subject_id}' in parents and trashed=false",
            fields="files(id, name, mimeType)",
            orderBy="name"
        ).execute()

        for qfile in sub_response.get('files', []):
            if qfile['mimeType'] == 'application/vnd.google-apps.folder':
                continue
            file_name = qfile['name']
            file_id = qfile['id']
            print(f"    📄 {subject_name}/{file_name} → {file_id}")
            slug = file_name.replace('.txt', '').lower().replace(' ', '-')
            quizzes.append({
                "id": f"{subject_name.lower()}-{slug}",
                "subject": subject_name,
                "title": file_name.replace('.txt', '').replace('_', ' ').title(),
                "fileId": file_id  # ← ID only
            })

    return quizzes

def collect_all_ids(nodes):
    """Collects every fileId in the tree into a flat list for the Worker."""
    ids = []
    for node in nodes:
        if node['type'] == 'file':
            ids.append(node['fileId'])
        elif node['type'] == 'folder':
            ids.extend(collect_all_ids(node['children']))
    return ids

def main():
    print("🔐 Authenticating...")
    service = authenticate()
    print("✅ Authenticated\n")

    resources_id = get_folder_id(service, RESOURCES_FOLDER_NAME)
    quizzes_id = get_folder_id(service, QUIZZES_FOLDER_NAME)

    print("🚀 Scanning resources...")
    files_manifest = scan_folder(service, resources_id)

    print("\n🚀 Scanning quizzes...")
    quizzes_manifest = scan_quizzes(service, quizzes_id)

    # Collect all known IDs for the Worker allowlist
    all_ids = collect_all_ids(files_manifest)
    all_ids += [q['fileId'] for q in quizzes_manifest]

    os.makedirs("public", exist_ok=True)
    with open("public/files.json", "w", encoding="utf-8") as f:
        json.dump(files_manifest, f, indent=2, ensure_ascii=False)
    with open("public/quizzes.json", "w", encoding="utf-8") as f:
        json.dump(quizzes_manifest, f, indent=2, ensure_ascii=False)

    # Save the ID list separately — you'll paste this into the Worker
    with open("known_ids.json", "w", encoding="utf-8") as f:
        json.dump(all_ids, f)

    print(f"\n✅ Done!")
    print(f"   Files:   public/files.json")
    print(f"   Quizzes: public/quizzes.json")
    print(f"   IDs:     known_ids.json  ← paste contents into Worker env var")

if __name__ == "__main__":
    main()
