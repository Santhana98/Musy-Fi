const fs = require('fs');
const path = require('path');

const filePath = path.join(__dirname, '..', 'src', 'app', 'api', 'songs', 'stream', 'route.ts');
let content = fs.readFileSync(filePath, 'utf8');

// Normalize line endings to LF
content = content.replace(/\r\n/g, '\n');

const targetBlock = `    if (song.type === 'google') {
      const drive = await getGoogleDriveClient(userId);
      if (!drive) {
        return new NextResponse('Google Drive disconnected', { status: 400 });
      }

      // Fetch file info
      const fileMeta = await drive.files.get({
        fileId: song.sourceUrl,
        fields: 'size, mimeType',
      });

      const size = parseInt(fileMeta.data.size || '0', 10);
      const mimeType = fileMeta.data.mimeType || 'audio/mpeg';

      if (range) {
        const parts = range.replace(/bytes=/, '').split('-');
        const start = parseInt(parts[0], 10);
        const end = parts[1] ? parseInt(parts[1], 10) : size - 1;
        const chunksize = end - start + 1;

        const response = await drive.files.get(
          { fileId: song.sourceUrl, alt: 'media' },
          {
            responseType: 'stream',
            headers: { Range: \`bytes=\${start}-\${end}\` },
          }
        );

        const webStream = new ReadableStream({
          start(controller) {
            response.data.on('data', (chunk) => controller.enqueue(chunk));
            response.data.on('end', () => controller.close());
            response.data.on('error', (err) => controller.error(err));
          },
          cancel() {
            response.data.destroy();
          }
        });

        return new Response(webStream, {
          status: 206,
          headers: {
            'Content-Range': \`bytes \${start}-\${end}/\${size}\`,
            'Accept-Ranges': 'bytes',
            'Content-Length': chunksize.toString(),
            'Content-Type': mimeType,
          },
        });
      } else {
        const response = await drive.files.get(
          { fileId: song.sourceUrl, alt: 'media' },
          { responseType: 'stream' }
        );

        const webStream = new ReadableStream({
          start(controller) {
            response.data.on('data', (chunk) => controller.enqueue(chunk));
            response.data.on('end', () => controller.close());
            response.data.on('error', (err) => controller.error(err));
          },
          cancel() {
            response.data.destroy();
          }
        });

        return new Response(webStream, {
          status: 200,
          headers: {
            'Content-Length': size.toString(),
            'Content-Type': mimeType,
            'Accept-Ranges': 'bytes',
          },
        });
      }
    }`;

const replacementBlock = `    if (song.type === 'google') {
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

if (content.includes(targetBlock)) {
  content = content.replace(targetBlock, replacementBlock);
  fs.writeFileSync(filePath, content, 'utf8');
  console.log("✅ stream route.ts updated successfully with 302 Redirect!");
} else {
  console.error("❌ Target block not found in stream route.ts.");
}
