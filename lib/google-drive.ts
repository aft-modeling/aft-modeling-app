import { google } from 'googleapis'
import { Readable } from 'stream'

function getDriveClient() {
  const auth = new google.auth.GoogleAuth({
    credentials: {
      client_email: process.env.GOOGLE_CLIENT_EMAIL,
      private_key: process.env.GOOGLE_PRIVATE_KEY?.replace(/\\n/g, '\n'),
    },
    scopes: ['https://www.googleapis.com/auth/drive'],
  })
  return google.drive({ version: 'v3', auth })
}

// Get or create a folder by name under a parent
export async function getOrCreateFolder(name: string, parentId: string): Promise<string> {
  const drive = getDriveClient()
  const res = await drive.files.list({
    q: `name='${name}' and mimeType='application/vnd.google-apps.folder' and '${parentId}' in parents and trashed=false`,
    fields: 'files(id, name)',
  })
  if (res.data.files && res.data.files.length > 0) {
    return res.data.files[0].id!
  }
  const folder = await drive.files.create({
    requestBody: {
      name,
      mimeType: 'application/vnd.google-apps.folder',
      parents: [parentId],
    },
    fields: 'id',
  })
  return folder.data.id!
}

// Upload a file buffer to Google Drive
// Returns { id, webViewLink }
export async function uploadFileToDrive(
  buffer: Buffer,
  filename: string,
  mimeType: string,
  editorName: string,
  clipName: string
): Promise<{ id: string; webViewLink: string }> {
  const drive = getDriveClient()
  const rootFolderId = process.env.GOOGLE_DRIVE_FOLDER_ID!

  // Create folder structure: AFT Modeling / {editorName} / {clipName}
  const editorFolderId = await getOrCreateFolder(editorName, rootFolderId)
  const clipFolderId = await getOrCreateFolder(clipName, editorFolderId)

  const stream = Readable.from(buffer)

  const file = await drive.files.create({
    requestBody: {
      name: filename,
      parents: [clipFolderId],
    },
    media: {
      mimeType,
      body: stream,
    },
    fields: 'id, webViewLink',
  })

  // Make the file viewable by anyone with the link
  await drive.permissions.create({
    fileId: file.data.id!,
    requestBody: { role: 'reader', type: 'anyone' },
  })

  return {
    id: file.data.id!,
    webViewLink: file.data.webViewLink!,
  }
}

// Move a file to an "Approved" subfolder
export async function moveFileToApproved(fileId: string, editorName: string): Promise<void> {
  const drive = getDriveClient()
  const rootFolderId = process.env.GOOGLE_DRIVE_FOLDER_ID!
  const editorFolderId = await getOrCreateFolder(editorName, rootFolderId)
  const approvedFolderId = await getOrCreateFolder('Approved', editorFolderId)

  const file = await drive.files.get({ fileId, fields: 'parents' })
  const previousParents = file.data.parents?.join(',') || ''

  await drive.files.update({
    fileId,
    addParents: approvedFolderId,
    removeParents: previousParents,
    fields: 'id, parents',
  })
}
