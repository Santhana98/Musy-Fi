// Musy-Fi Google Drive integration
import { google } from 'googleapis';
import prisma from './prisma';

const clientID = process.env.GOOGLE_CLIENT_ID;
const clientSecret = process.env.GOOGLE_CLIENT_SECRET;
const redirectUri = process.env.NEXTAUTH_URL 
  ? `${process.env.NEXTAUTH_URL}/api/auth/callback/google` 
  : 'http://localhost:3000/api/auth/callback/google';

export function getGoogleOAuth2Client() {
  if (!clientID || !clientSecret || clientID === 'MOCK_CLIENT_ID') {
    return null;
  }
  return new google.auth.OAuth2(clientID, clientSecret, redirectUri);
}

export async function getGoogleDriveClient(userId: string, accessToken?: string) {
  const oauth2Client = getGoogleOAuth2Client();
  if (!oauth2Client) {
    return null;
  }

  let token = accessToken;
  let refresh_token = undefined;
  let account: any = null;

  // Always try to load the account from DB to fetch the refresh token
  // because NextAuth session access token might be expired and doesn't contain refresh token
  account = await prisma.account.findFirst({
    where: {
      userId,
      provider: 'google',
    },
  });

  if (account) {
    refresh_token = account.refresh_token || undefined;
    if (!token && account.access_token) {
      token = account.access_token;
    }
  }

  if (!token) {
    return null;
  }

  oauth2Client.setCredentials({
    access_token: token,
    refresh_token: refresh_token,
  });

  // Setup token refresh callback if credentials refresh
  oauth2Client.on('tokens', async (tokens) => {
    if (tokens.access_token) {
      if (!account) {
        account = await prisma.account.findFirst({
          where: {
            userId,
            provider: 'google',
          },
        });
      }
      if (account) {
        await prisma.account.update({
          where: {
            id: account.id
          },
          data: {
            access_token: tokens.access_token,
            refresh_token: tokens.refresh_token || account.refresh_token,
            expires_at: tokens.expiry_date ? Math.floor(tokens.expiry_date / 1000) : account.expires_at,
          }
        });
      }
    }
  });

  return google.drive({ version: 'v3', auth: oauth2Client });
}

/**
 * Finds or creates the "Musi-Fi" folder in the user's Google Drive.
 */
export async function getOrCreateMusiFiFolder(drive: any): Promise<string> {
  const response = await drive.files.list({
    q: "mimeType='application/vnd.google-apps.folder' and name='Musi-Fi' and trashed=false",
    fields: 'files(id, name)',
    spaces: 'drive',
  });

  const files = response.data.files;
  if (files && files.length > 0) {
    return files[0].id;
  }

  // Folder does not exist, create it
  const fileMetadata = {
    name: 'Musi-Fi',
    mimeType: 'application/vnd.google-apps.folder',
  };

  const folder = await drive.files.create({
    requestBody: fileMetadata,
    fields: 'id',
  });

  return folder.data.id;
}
