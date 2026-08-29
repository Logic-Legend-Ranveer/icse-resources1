const { google } = require('googleapis');
const fs = require('fs');
const path = require('path');
const http = require('http');
const url = require('url');
const open = require('open');

// ── CONFIG ──────────────────────────────────────────────────────
const RESOURCES_FOLDER_NAME = 'icse-resources-files';
const QUIZZES_FOLDER_NAME = 'quizzes';
const PARENT_FOLDER_NAME = 'icse-resources-webpage';  // ← add this
const CREDENTIALS_FILE = 'credentials.json';
const TOKEN_FILE = 'token.json';
const SCOPES = ['https://www.googleapis.com/auth/drive.readonly'];
// ────────────────────────────────────────────────────────────────
async function authenticate() {
  const credentials = JSON.parse(fs.readFileSync(CREDENTIALS_FILE));
  const { client_secret, client_id, redirect_uris } = credentials.installed;
  const oauth2Client = new google.auth.OAuth2(client_id, client_secret, 'http://localhost:3000');

  // If token already exists, use it
  if (fs.existsSync(TOKEN_FILE)) {
    const token = JSON.parse(fs.readFileSync(TOKEN_FILE));
    oauth2Client.setCredentials(token);
    return oauth2Client;
  }

  // Otherwise open browser to get new token
  const authUrl = oauth2Client.generateAuthUrl({ access_type: 'offline', scope: SCOPES });
  console.log('\n🌐 Opening browser for Google login...');
  
  // Start local server to catch the redirect
  const code = await new Promise((resolve) => {
    const server = http.createServer((req, res) => {
      const qs = url.parse(req.url, true).query;
      res.end('<h2>✅ Done! You can close this tab and go back to the terminal.</h2>');
      server.close();
      resolve(qs.code);
    });
    server.listen(3000);
    // Try to open browser automatically
    try { open(authUrl); } catch {
      console.log('Could not open browser automatically. Open this URL manually:\n', authUrl);
    }
  });

  const { tokens } = await oauth2Client.getToken(code);
  oauth2Client.setCredentials(tokens);
  fs.writeFileSync(TOKEN_FILE, JSON.stringify(tokens));
  console.log('✅ Logged in and token saved.\n');
  return oauth2Client;
}

async function getFolderId(drive, name, parentId = null) {
  let query = `name='${name}' and mimeType='application/vnd.google-apps.folder' and trashed=false`;
  if (parentId) query += ` and '${parentId}' in parents`;
  const res = await drive.files.list({ q: query, fields: 'files(id, name)', pageSize: 10 });
  const files = res.data.files;
  if (!files.length) throw new Error(`Folder '${name}' not found in Drive.`);
  return files[0].id;
}

async function scanFolder(drive, folderId, folderPath = '') {
  const items = [];
  let pageToken = null;

  do {
    const res = await drive.files.list({
      q: `'${folderId}' in parents and trashed=false`,
      fields: 'nextPageToken, files(id, name, mimeType)',
      pageSize: 100,
      orderBy: 'name',
      ...(pageToken ? { pageToken } : {})
    });

    for (const f of res.data.files) {
      const itemPath = `${folderPath}/${f.name}`;
      const isDir = f.mimeType === 'application/vnd.google-apps.folder';

      if (isDir) {
        console.log(`  📁 ${itemPath}`);
        items.push({
          name: f.name,
          type: 'folder',
          fileId: '',
          children: await scanFolder(drive, f.id, itemPath)
        });
      } else {
        console.log(`  📄 ${itemPath}`);
        items.push({
          name: f.name,
          type: 'file',
          fileId: f.id  // ← ID only, never the real URL
        });
      }
    }

    pageToken = res.data.nextPageToken;
  } while (pageToken);

  return items;
}

async function scanQuizzes(drive, quizzesFolderId) {
  const quizzes = [];

  const res = await drive.files.list({
    q: `'${quizzesFolderId}' in parents and trashed=false`,
    fields: 'files(id, name, mimeType)',
    orderBy: 'name'
  });

  for (const subjectFolder of res.data.files) {
    if (subjectFolder.mimeType !== 'application/vnd.google-apps.folder') continue;
    console.log(`  📁 Quiz subject: ${subjectFolder.name}`);

    const subRes = await drive.files.list({
      q: `'${subjectFolder.id}' in parents and trashed=false`,
      fields: 'files(id, name, mimeType)',
      orderBy: 'name'
    });

    for (const qfile of subRes.data.files) {
      if (qfile.mimeType === 'application/vnd.google-apps.folder') continue;
      console.log(`    📄 ${subjectFolder.name}/${qfile.name}`);
      const slug = qfile.name.replace('.txt', '').toLowerCase().replace(/\s+/g, '-');
      quizzes.push({
        id: `${subjectFolder.name.toLowerCase()}-${slug}`,
        subject: subjectFolder.name,
        title: qfile.name.replace('.txt', '').replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase()),
        fileId: qfile.id  // ← ID only
      });
    }
  }

  return quizzes;
}

function collectAllIds(nodes) {
  const ids = [];
  for (const node of nodes) {
    if (node.type === 'file') ids.push(node.fileId);
    else if (node.children) ids.push(...collectAllIds(node.children));
  }
  return ids;
}

async function main() {
  console.log('🔐 Authenticating with Google Drive...');
  const auth = await authenticate();
  const drive = google.drive({ version: 'v3', auth });
  console.log('✅ Authenticated.\n');

  console.log(`🔍 Finding '${PARENT_FOLDER_NAME}' folder...`);
  const parentId = await getFolderId(drive, PARENT_FOLDER_NAME);

  console.log(`🔍 Finding '${RESOURCES_FOLDER_NAME}' folder...`);
  const resourcesId = await getFolderId(drive, RESOURCES_FOLDER_NAME, parentId);

  console.log(`🔍 Finding '${QUIZZES_FOLDER_NAME}' folder...`);
  const quizzesId = await getFolderId(drive, QUIZZES_FOLDER_NAME, parentId);

  console.log('\n🚀 Scanning resources...');
  const filesManifest = await scanFolder(drive, resourcesId);

  console.log('\n🚀 Scanning quizzes...');
  const quizzesManifest = await scanQuizzes(drive, quizzesId);

  // Collect all IDs for the Cloudflare Worker allowlist
  const allIds = collectAllIds(filesManifest);
  allIds.push(...quizzesManifest.map(q => q.fileId));

  fs.mkdirSync('public', { recursive: true });
  fs.writeFileSync('public/files.json', JSON.stringify(filesManifest, null, 2));
  fs.writeFileSync('public/quizzes.json', JSON.stringify(quizzesManifest, null, 2));
  fs.writeFileSync('known_ids.json', JSON.stringify(allIds, null, 2));

  console.log('\n✅ Done!');
  console.log('   public/files.json    ← commit this');
  console.log('   public/quizzes.json  ← commit this');
  console.log('   known_ids.json       ← paste into Cloudflare Worker env var');
}

main().catch(console.error);