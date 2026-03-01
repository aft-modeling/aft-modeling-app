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
    supportsAllDrives: true,
    includeItemsFromAllDrives: true,
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
    supportsAllDrives: true,
  })
  return folder.data.id!
}

// Get month/year and month/day folder names
function getDateFolderNames(date: Date) {
  const months = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December']
  const month = months[date.getMonth()]
  const year = date.getFullYear()
  const day = date.getDate()
  return {
    monthYear: `${month} ${year}`,
    monthDay: `${month} ${day}`,
  }
}

// Upload a file buffer to Google Drive
// Folder structure: Root / {editorName} / {Month Year} / {Month Day} / file
export async function uploadFileToDrive(
  buffer: Buffer,
  filename: string,
  mimeType: string,
  editorName: string
): Promise<{ id: string; webViewLink: string }> {
  const drive = getDriveClient()
  const rootFolderId = process.env.GOOGLE_DRIVE_FOLDER_ID!
  const { monthYear, monthDay } = getDateFolderNames(new Date())

  // Create folder structure: Root / Editor / Month Year / Month Day
  const editorFolderId = await getOrCreateFolder(editorName, rootFolderId)
  const monthFolderId = await getOrCreateFolder(monthYear, editorFolderId)
  const dayFolderId = await getOrCreateFolder(monthDay, monthFolderId)

  const stream = Readable.from(buffer)

  const file = await drive.files.create({
    requestBody: {
      name: filename,
      parents: [dayFolderId],
    },
    media: {
      mimeType,
      body: stream,
    },
    fields: 'id, webViewLink',
    supportsAllDrives: true,
  })

  return {
    id: file.data.id!,
    webViewLink: file.data.webViewLink!,
  }
}

// Move an existing Drive file to the date-based folder structure
// Used when a clip is approved/finished - moves from submission folder to:
// Root / {editorName} / {Month Year} / {Month Day}
export async function moveFileToDateFolder(fileId: string, editorName: string): Promise<string> {
  const drive = getDriveClient()
  const rootFolderId = process.env.GOOGLE_DRIVE_FOLDER_ID!
  const { monthYear, monthDay } = getDateFolderNames(new Date())

  // Create date-based folder structure
  const editorFolderId = await getOrCreateFolder(editorName, rootFolderId)
  const monthFolderId = await getOrCreateFolder(monthYear, editorFolderId)
  const dayFolderId = await getOrCreateFolder(monthDay, monthFolderId)

  // Get current parents so we can remove them
  const file = await drive.files.get({ fileId, fields: 'parents', supportsAllDrives: true })
  const previousParents = file.data.parents?.join(',') || ''

  // Move file to the new date-based folder
  const updated = await drive.files.update({
    fileId,
    addParents: dayFolderId,
    removeParents: previousParents,
    fields: 'id, parents, webViewLink',
    supportsAllDrives: true,
  })

  return updated.data.webViewLink || ''
}
