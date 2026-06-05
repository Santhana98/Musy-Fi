const fs = require('fs');
const path = require('path');

// 1. Patch src/lib/storage.ts
const storagePath = path.join(__dirname, '..', 'src', 'lib', 'storage.ts');
let storageContent = fs.readFileSync(storagePath, 'utf8');

// Normalize line endings to LF
storageContent = storageContent.replace(/\r\n/g, '\n');

const storageTarget = `      const response = await drive.files.create({
        requestBody: {
          name: fileName,
          parents: [folderId],
        },
        media: {
          mimeType,
          body: bufferStream,
        },
        fields: 'id',
      });

      if (response.data.id) {
        return {
          sourceUrl: response.data.id,
          storageType: 'google',
          metadata,
        };
      }`;

const storageReplacement = `      const response = await drive.files.create({
        requestBody: {
          name: fileName,
          parents: [folderId],
        },
        media: {
          mimeType,
          body: bufferStream,
        },
        fields: 'id',
      });

      if (response.data.id) {
        // Make the file readable by anyone with the link to support direct streaming
        try {
          await drive.permissions.create({
            fileId: response.data.id,
            requestBody: {
              role: 'reader',
              type: 'anyone',
            },
          });
          console.log(\`[Storage] Set public read permission on Google Drive file: \${response.data.id}\`);
        } catch (permError) {
          console.warn('[Storage] Failed to set public read permission on Google Drive file:', permError);
        }

        return {
          sourceUrl: response.data.id,
          storageType: 'google',
          metadata,
        };
      }`;

if (storageContent.includes(storageTarget)) {
  storageContent = storageContent.replace(storageTarget, storageReplacement);
  fs.writeFileSync(storagePath, storageContent, 'utf8');
  console.log("✅ src/lib/storage.ts successfully updated with permissions creation!");
} else {
  console.error("❌ Target block not found in src/lib/storage.ts.");
}


// 2. Patch src/app/api/songs/stream/route.ts
const streamRoutePath = path.join(__dirname, '..', 'src', 'app', 'api', 'songs', 'stream', 'route.ts');
let streamRouteContent = fs.readFileSync(streamRoutePath, 'utf8');

// Normalize line endings to LF
streamRouteContent = streamRouteContent.replace(/\r\n/g, '\n');

const streamRouteTarget = `    if (song.type === 'google') {
      const drive = await getGoogleDriveClient(userId);
      if (!drive) {
        return new NextResponse('Google Drive disconnected', { status: 400 });
      }

      // Fetch file info (this automatically triggers token refresh if expired)
      await drive.files.get({
        fileId: song.sourceUrl,
        fields: 'id',
      });

      // Get the fresh access token from the database
      const account = await prisma.account.findFirst({
        where: {
          userId,
          provider: 'google',
        },
      });

      const token = account?.access_token;
      if (!token) {
        return new NextResponse('Google Access Token not found', { status: 500 });
      }

      // Construct direct Google Drive streaming URL
      const directUrl = \`https://www.googleapis.com/drive/v3/files/\${song.sourceUrl}?alt=media&access_token=\${token}\`;

      // Redirect the client browser directly to Google Drive CDN
      return NextResponse.redirect(directUrl, { status: 302 });
    }`;

const streamRouteReplacement = `    if (song.type === 'google') {
      // Construct direct Google Drive public streaming URL
      const directUrl = \`https://drive.google.com/uc?id=\${song.sourceUrl}&export=download\`;

      // Redirect the client browser directly to Google Drive CDN (bypassing Vercel timeout)
      return NextResponse.redirect(directUrl, { status: 302 });
    }`;

if (streamRouteContent.includes(streamRouteTarget)) {
  streamRouteContent = streamRouteContent.replace(streamRouteTarget, streamRouteReplacement);
  fs.writeFileSync(streamRoutePath, streamRouteContent, 'utf8');
  console.log("✅ src/app/api/songs/stream/route.ts successfully updated with public webContentLink redirect!");
} else {
  console.error("❌ Target block not found in src/app/api/songs/stream/route.ts.");
}
