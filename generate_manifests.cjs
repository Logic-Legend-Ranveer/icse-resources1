const { google } = require('googleapis');
const fs = require('fs');

// ── CONFIG ──────────────────────────────────────────────────────
const RESOURCES_FOLDER_NAME = 'Study Assets'; 
const QUIZZES_FOLDER_NAME = 'quizzes';
const PARENT_FOLDER_NAME = 'icse-resources-webpage';  
const SCOPES = ['https://www.googleapis.com/auth/drive.readonly'];
// ────────────────────────────────────────────────────────────────

async function createAuthClient(credFile, tokenFile) {
  if (!fs.existsSync(credFile) || !fs.existsSync(tokenFile)) {
    return null; 
  }
  const credentials = JSON.parse(fs.readFileSync(credFile));
  const clientConfig = credentials.installed || credentials.web;
  const { client_secret, client_id } = clientConfig;
  
  const oauth2Client = new google.auth.OAuth2(client_id, client_secret, 'http://localhost:3000');
  const token = JSON.parse(fs.readFileSync(tokenFile));
  oauth2Client.setCredentials(token);
  return oauth2Client;
}

async function getFolderId(drive, name, parentId = null) {
  let query = `name='${name}' and mimeType='application/vnd.google-apps.folder' and trashed=false`;
  if (parentId) query += ` and '${parentId}' in parents`;
  const res = await drive.files.list({ q: query, fields: 'files(id, name)', pageSize: 10 });
  const files = res.data.files;
  if (!files.length) return null;
  return files[0].id;
}

async function scanFolder(drive, folderId, folderPath = '') {
  const items = [];
  let pageToken = null;

  do {
    const res = await drive.files.list({
      q: `'${folderId}' in parents and trashed=false`,
      fields: 'nextPageToken, files(id, name, mimeType, size, createdTime)',
      pageSize: 100,
      orderBy: 'name',
      ...(pageToken ? { pageToken } : {})
    });

    for (const f of res.data.files) {
      const itemPath = `${folderPath}/${f.name}`;
      const isDir = f.mimeType === 'application/vnd.google-apps.folder';

      if (isDir) {
        console.log(`  📁 ${itemPath}`);
        const children = await scanFolder(drive, f.id, itemPath);
        const folderSize = children.reduce((acc, child) => acc + (child.size || 0), 0);
        
        items.push({
          name: f.name,
          type: 'folder',
          fileId: '',
          size: folderSize,
          children: children
        });
      } else {
        console.log(`  📄 ${itemPath}`);
        items.push({
          name: f.name,
          type: 'file',
          fileId: f.id,
          size: parseInt(f.size || '0', 10),
          addedAt: f.createdTime ? f.createdTime.split('T')[0] : ''
        });
      }
    }
    pageToken = res.data.nextPageToken;
  } while (pageToken);

  return items;
}

// Scans the root of Account 2 and wraps everything into "PYQ Prelims"
async function scanAccount2RootAsPrelims(drive) {
  console.log(`🚀 Scanning root folders/files of Account 2 for PYQ Prelims...`);
  
  const items = [];
  let pageToken = null;

  do {
    const res = await drive.files.list({
      q: `'root' in parents and trashed=false`,
      fields: 'nextPageToken, files(id, name, mimeType, size, createdTime)',
      pageSize: 100,
      orderBy: 'name',
      ...(pageToken ? { pageToken } : {})
    });

    for (const f of res.data.files) {
      const isDir = f.mimeType === 'application/vnd.google-apps.folder';

      if (isDir) {
        console.log(`  📁 Root Subject Folder (Acc 2): ${f.name}`);
        const children = await scanFolder(drive, f.id, `/${f.name}`);
        const folderSize = children.reduce((acc, child) => acc + (child.size || 0), 0);
        
        items.push({
          name: f.name,
          type: 'folder',
          fileId: '',
          size: folderSize,
          children: children
        });
      } else {
        console.log(`  📄 Root File (Acc 2): ${f.name}`);
        items.push({
          name: f.name,
          type: 'file',
          fileId: f.id,
          size: parseInt(f.size || '0', 10),
          addedAt: f.createdTime ? f.createdTime.split('T')[0] : ''
        });
      }
    }
    pageToken = res.data.nextPageToken;
  } while (pageToken);

  const totalPrelimsSize = items.reduce((acc, child) => acc + (child.size || 0), 0);

  return {
    name: "PYQ Prelims",
    type: "folder",
    fileId: "",
    size: totalPrelimsSize,
    children: items
  };
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
    const subRes = await drive.files.list({
      q: `'${subjectFolder.id}' in parents and trashed=false`,
      fields: 'files(id, name, mimeType)',
      orderBy: 'name'
    });

    for (const qfile of subRes.data.files) {
      if (qfile.mimeType === 'application/vnd.google-apps.folder') continue;
      const slug = qfile.name.replace('.txt', '').toLowerCase().replace(/\s+/g, '-');
      quizzes.push({
        id: `${subjectFolder.name.toLowerCase()}-${slug}`,
        subject: subjectFolder.name,
        title: qfile.name.replace('.txt', '').replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase()),
        fileId: qfile.id
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
  // ── 1. Process Account 1 ────────────────────────────────────────
  const auth1 = await createAuthClient('credentials.json', 'token.json');
  if (!auth1) throw new Error('Account 1 credentials/token missing!');
  
  console.log('🔐 Authenticated with Account 1...');
  const drive1 = google.drive({ version: 'v3', auth: auth1 });

  console.log(`🔍 Finding '${PARENT_FOLDER_NAME}' folder on Account 1...`);
  const parentId1 = await getFolderId(drive1, PARENT_FOLDER_NAME);
  
  console.log(`🔍 Finding '${RESOURCES_FOLDER_NAME}' folder on Account 1...`);
  const resourcesId1 = await getFolderId(drive1, RESOURCES_FOLDER_NAME, parentId1);
  if (!resourcesId1) throw new Error(`Could not find folder '${RESOURCES_FOLDER_NAME}' inside '${PARENT_FOLDER_NAME}'`);

  console.log(`🔍 Finding 'quizzes' folder on Account 1...`);
  const quizzesId1 = await getFolderId(drive1, QUIZZES_FOLDER_NAME, parentId1);

  // CRITICAL FIX: Scan "Study Assets" directly so files.json starts with Study Assets at root level
  console.log(`\n🚀 Scanning primary resources inside '${RESOURCES_FOLDER_NAME}' (Account 1)...`);
  const studyAssetsChildren = await scanFolder(drive1, resourcesId1, `/${RESOURCES_FOLDER_NAME}`);
  
  const studyAssetsSize = studyAssetsChildren.reduce((acc, child) => acc + (child.size || 0), 0);

  let filesManifest = [{
    name: RESOURCES_FOLDER_NAME,
    type: 'folder',
    fileId: '',
    size: studyAssetsSize,
    children: studyAssetsChildren
  }];

  console.log('\n🚀 Scanning quizzes (Account 1)...');
  const quizzesManifest = await scanQuizzes(drive1, quizzesId1);

  // ── 2. Process Account 2 and Inject into "Study Assets" ─────────
  const auth2 = await createAuthClient('credentials2.json', 'token2.json');
  if (auth2) {
    console.log('\n🔐 Authenticated with Account 2...');
    const drive2 = google.drive({ version: 'v3', auth: auth2 });
    
    const pyqPrelimsFolder = await scanAccount2RootAsPrelims(drive2);
    
    // Push PYQ Prelims directly into Study Assets' children array
    filesManifest[0].children.push(pyqPrelimsFolder);
    
    // Recalculate total size of Study Assets
    filesManifest[0].size = filesManifest[0].children.reduce((acc, child) => acc + (child.size || 0), 0);
    console.log(`✅ Successfully nested 'PYQ Prelims' inside '${RESOURCES_FOLDER_NAME}'.`);
  } else {
    console.log('\nℹ️ Account 2 not configured yet. Skipping prelim papers append.');
  }

  const allIds = collectAllIds(filesManifest);
  allIds.push(...quizzesManifest.map(q => q.fileId));

  fs.mkdirSync('public', { recursive: true });
  fs.writeFileSync('public/files.json', JSON.stringify(filesManifest, null, 2));
  fs.writeFileSync('public/quizzes.json', JSON.stringify(quizzesManifest, null, 2));
  fs.writeFileSync('known_ids.json', JSON.stringify(allIds, null, 2));

  console.log('\n✅ Manifest generation complete!');
  console.log('   public/files.json    ← Tree structure is now fully compatible with tabs.ts!');
}

main().catch((err) => {
  console.error('❌ Script failed:', err);
  process.exit(1);
});
