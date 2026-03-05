'use client'
import { useState, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { X, Upload, File, ExternalLink } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'

interface SubmitClipModalProps {
  clip: any
  editorId: string
  onClose: () => void
}

const MAX_FILE_SIZE_MB = 500
const MAX_FILE_SIZE_BYTES = MAX_FILE_SIZE_MB * 1024 * 1024

export default function SubmitClipModal({ clip, editorId, onClose }: SubmitClipModalProps) {
  const router = useRouter()
  const supabase = createClient()
  const fileRef = useRef<HTMLInputElement>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [file, setFile] = useState<File | null>(null)
  const [driveUsedContentLink, setDriveUsedContentLink] = useState('')
  const [dragOver, setDragOver] = useState(false)
  const [uploadProgress, setUploadProgress] = useState('')

  function validateAndSetFile(selectedFile: File | null) {
    if (selectedFile && selectedFile.size > MAX_FILE_SIZE_BYTES) {
      setError(`File is too large (${formatBytes(selectedFile.size)}). Maximum allowed size is ${MAX_FILE_SIZE_MB}MB.`)
      setFile(null)
      return
    }
    setError('')
    setFile(selectedFile)
  }

  function handleFileDrop(e: React.DragEvent) {
    e.preventDefault()
    setDragOver(false)
    const dropped = e.dataTransfer.files[0]
    if (dropped) validateAndSetFile(dropped)
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    setError('')

    if (!driveUsedContentLink.trim()) {
      setError('Drive Link to Used Content cannot be empty')
      setLoading(false)
      return
    }

    try {
      let storagePath: string | null = null
      let fileUrl: string | null = null

      // Upload file directly to Supabase Storage from client (bypasses Vercel 4.5MB limit)
      if (file && file.size > 0) {
        setUploadProgress('Uploading video...')

        const { data: { session } } = await supabase.auth.getSession()
        if (!session) throw new Error('Not authenticated')

        const safeName = editorId.substring(0, 8)
        const safeClipName = (clip.name || 'clip').replace(/[^a-zA-Z0-9]/g, '_')
        const ext = file.name.split('.').pop() || 'mp4'

        // Get submission round
        const { count } = await supabase
          .from('submissions')
          .select('*', { count: 'exact', head: true })
          .eq('clip_id', clip.id)
        const round = (count || 0) + 1

        storagePath = safeName + '/' + safeClipName + '/round_' + round + '.' + ext

        const { error: uploadError } = await supabase.storage
          .from('clip-submissions')
          .upload(storagePath, file, {
            contentType: file.type,
            upsert: true,
          })

        if (uploadError) {
          throw new Error('File upload failed: ' + uploadError.message)
        }

        const { data: urlData } = supabase.storage
          .from('clip-submissions')
          .getPublicUrl(storagePath)
        fileUrl = urlData.publicUrl

        setUploadProgress('Saving submission...')
      }

      // Send only metadata to API (no large file in request body)
      const res = await fetch('/api/submit-clip', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          clipId: clip.id,
          clipName: clip.name,
          editorId,
          driveUsedContentLink,
          storagePath,
          fileUrl,
        }),
      })

      if (!res.ok) {
        const data = await res.json()
        throw new Error(data.error || 'Failed to submit clip')
      }

      router.refresh()
      onClose()
    } catch (err: any) {
      setError(err.message)
    } finally {
      setLoading(false)
      setUploadProgress('')
    }
  }

  const formatBytes = (bytes: number) => {
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB'
    return (bytes / (1024 * 1024)).toFixed(1) + ' MB'
  }

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="card w-full max-w-lg p-6 space-y-5">
        <div className="flex items-center justify-between">
          <div>
            <h2>Submit Clip</h2>
            <p className="text-sm text-gray-500 mt-0.5">{clip.name}</p>
          </div>
          <button onClick={onClose} className="p-1 hover:bg-gray-100 rounded-lg transition-colors">
            <X className="w-5 h-5 text-gray-400" />
          </button>
        </div>

        {/* Example Reel Reference */}
        {clip.example_reel_url && (
          <div className="bg-brand-50 border border-brand-100 rounded-lg p-3">
            <p className="text-xs font-medium text-brand-700 mb-1">Reference Reel</p>
            <a
              href={clip.example_reel_url}
              target="_blank"
              rel="noopener noreferrer"
              className="text-sm text-brand-600 hover:text-brand-700 flex items-center gap-1"
            >
              <ExternalLink className="w-3 h-3" />
              View example reel
            </a>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* File Upload */}
          <div>
            <label className="label">Upload Video File (Optional)</label>
            <div
              onDragOver={(e) => { e.preventDefault(); setDragOver(true) }}
              onDragLeave={() => setDragOver(false)}
              onDrop={handleFileDrop}
              onClick={() => fileRef.current?.click()}
              className={`border-2 border-dashed rounded-lg p-6 text-center cursor-pointer transition-colors ${
                dragOver ? 'border-brand-400 bg-brand-50' :
                file ? 'border-green-300 bg-green-50' :
                'border-gray-200 hover:border-gray-300'
              }`}
            >
              <input
                ref={fileRef}
                type="file"
                accept="video/*"
                className="hidden"
                onChange={(e) => validateAndSetFile(e.target.files?.[0] || null)}
              />
              {file ? (
                <div className="flex items-center justify-center gap-2">
                  <File className="w-5 h-5 text-gray-400" />
                  <div>
                    <p className="text-sm font-medium">{file.name}</p>
                    <p className="text-xs text-gray-500">{formatBytes(file.size)}</p>
                  </div>
                </div>
              ) : (
                <div>
                  <Upload className="w-8 h-8 text-gray-300 mx-auto mb-2" />
                  <p className="text-sm text-gray-500">Drop your video here or click to browse</p>
                  <p className="text-xs text-gray-400 mt-1">Max file size: {MAX_FILE_SIZE_MB}MB</p>
                </div>
              )}
            </div>
          </div>

          {/* Drive Link */}
          <div>
            <label className="label">Drive Link to Used Content <span className="text-red-500">*</span></label>
            <input
              className="input"
              placeholder="https://drive.google.com/..."
              value={driveUsedContentLink}
              onChange={(e) => setDriveUsedContentLink(e.target.value)}
            />
            <p className="text-xs text-gray-400 mt-1">Link to the raw footage/assets you used</p>
          </div>

          {error && (
            <div className="bg-red-50 border border-red-200 text-red-700 text-sm px-3 py-2 rounded-lg">
              {error}
            </div>
          )}

          {uploadProgress && (
            <div className="bg-blue-50 border border-blue-200 text-blue-700 text-sm px-3 py-2 rounded-lg flex items-center gap-2">
              <span className="inline-block w-4 h-4 border-2 border-blue-300 border-t-transparent rounded-full animate-spin" />
              {uploadProgress}
            </div>
          )}

          <div className="flex gap-3 pt-1">
            <button type="button" onClick={onClose} className="btn-secondary flex-1 justify-center">
              Cancel
            </button>
            <button type="submit" className="btn-primary flex-1 justify-center" disabled={loading}>
              {loading ? 'Submitting...' : 'Submit for QA'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
'use client'
import { useState, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { X, Upload, File, ExternalLink } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'

interface SubmitClipModalProps {
  clip: any
  editorId: string
  onClose: () => void
}

const MAX_FILE_SIZE_MB = 500
const MAX_FILE_SIZE_BYTES = MAX_FILE_SIZE_MB * 1024 * 1024

export default function SubmitClipModal({ clip, editorId, onClose }: SubmitClipModalProps) {
  const router = useRouter()
  const supabase = createClient()
  const fileRef = useRef<HTMLInputElement>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [file, setFile] = useState<File | null>(null)
  const [driveUsedContentLink, setDriveUsedContentLink] = useState('')
  const [dragOver, setDragOver] = useState(false)
  const [uploadProgress, setUploadProgress] = useState('')

  function validateAndSetFile(selectedFile: File | null) {
    if (selectedFile && selectedFile.size > MAX_FILE_SIZE_BYTES) {
      setError(`File is too large (${formatBytes(selectedFile.size)}). Maximum allowed size is ${MAX_FILE_SIZE_MB}MB.`)
      setFile(null)
      return
    }
    setError('')
    setFile(selectedFile)
  }

  function handleFileDrop(e: React.DragEvent) {
    e.preventDefault()
    setDragOver(false)
    const dropped = e.dataTransfer.files[0]
    if (dropped) validateAndSetFile(dropped)
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    setError('')

    try {
      let storagePath: string | null = null
      let fileUrl: string | null = null

      // Upload file directly to Supabase Storage from client (bypasses Vercel 4.5MB limit)
      if (file && file.size > 0) {
        setUploadProgress('Uploading video...')

        const { data: { session } } = await supabase.auth.getSession()
        if (!session) throw new Error('Not authenticated')

        const safeName = editorId.substring(0, 8)
        const safeClipName = (clip.name || 'clip').replace(/[^a-zA-Z0-9]/g, '_')
        const ext = file.name.split('.').pop() || 'mp4'

        // Get submission round
        const { count } = await supabase
          .from('submissions')
          .select('*', { count: 'exact', head: true })
          .eq('clip_id', clip.id)
        const round = (count || 0) + 1

        storagePath = safeName + '/' + safeClipName + '/round_' + round + '.' + ext

        const { error: uploadError } = await supabase.storage
          .from('clip-submissions')
          .upload(storagePath, file, {
            contentType: file.type,
            upsert: true,
          })

        if (uploadError) {
          throw new Error('File upload failed: ' + uploadError.message)
        }

        const { data: urlData } = supabase.storage
          .from('clip-submissions')
          .getPublicUrl(storagePath)
        fileUrl = urlData.publicUrl

        setUploadProgress('Saving submission...')
      }

      // Send only metadata to API (no large file in request body)
      const res = await fetch('/api/submit-clip', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          clipId: clip.id,
          clipName: clip.name,
          editorId,
          driveUsedContentLink,
          storagePath,
          fileUrl,
        }),
      })

      if (!res.ok) {
        const data = await res.json()
        throw new Error(data.error || 'Failed to submit clip')
      }

      router.refresh()
      onClose()
    } catch (err: any) {
      setError(err.message)
    } finally {
      setLoading(false)
      setUploadProgress('')
    }
  }

  const formatBytes = (bytes: number) => {
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB'
    return (bytes / (1024 * 1024)).toFixed(1) + ' MB'
  }

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="card w-full max-w-lg p-6 space-y-5">
        <div className="flex items-center justify-between">
          <div>
            <h2>Submit Clip</h2>
            <p className="text-sm text-gray-500 mt-0.5">{clip.name}</p>
          </div>
          <button onClick={onClose} className="p-1 hover:bg-gray-100 rounded-lg transition-colors">
            <X className="w-5 h-5 text-gray-400" />
          </button>
        </div>

        {/* Example Reel Reference */}
        {clip.example_reel_url && (
          <div className="bg-brand-50 border border-brand-100 rounded-lg p-3">
            <p className="text-xs font-medium text-brand-700 mb-1">Reference Reel</p>
            <a
              href={clip.example_reel_url}
              target="_blank"
              rel="noopener noreferrer"
              className="text-sm text-brand-600 hover:text-brand-700 flex items-center gap-1"
            >
              <ExternalLink className="w-3 h-3" />
              View example reel
            </a>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* File Upload */}
          <div>
            <label className="label">Upload Video File (Optional)</label>
            <div
              onDragOver={(e) => { e.preventDefault(); setDragOver(true) }}
              onDragLeave={() => setDragOver(false)}
              onDrop={handleFileDrop}
              onClick={() => fileRef.current?.click()}
              className={`border-2 border-dashed rounded-lg p-6 text-center cursor-pointer transition-colors ${
                dragOver ? 'border-brand-400 bg-brand-50' :
                file ? 'border-green-300 bg-green-50' :
                'border-gray-200 hover:border-gray-300'
              }`}
            >
              <input
                ref={fileRef}
                type="file"
                accept="video/*"
                className="hidden"
                onChange={(e) => validateAndSetFile(e.target.files?.[0] || null)}
              />
              {file ? (
                <div className="flex items-center justify-center gap-2">
                  <File className="w-5 h-5 text-gray-400" />
                  <div>
                    <p className="text-sm font-medium">{file.name}</p>
                    <p className="text-xs text-gray-500">{formatBytes(file.size)}</p>
                  </div>
                </div>
              ) : (
                <div>
                  <Upload className="w-8 h-8 text-gray-300 mx-auto mb-2" />
                  <p className="text-sm text-gray-500">Drop your video here or click to browse</p>
                  <p className="text-xs text-gray-400 mt-1">Max file size: {MAX_FILE_SIZE_MB}MB</p>
                </div>
              )}
            </div>
          </div>

          {/* Drive Link */}
          <div>
            <label className="label">Drive Link to Used Content</label>
            <input
              className="input"
              placeholder="https://drive.google.com/..."
              value={driveUsedContentLink}
              onChange={(e) => setDriveUsedContentLink(e.target.value)}
            />
            <p className="text-xs text-gray-400 mt-1">Link to the raw footage/assets you used</p>
          </div>

          {error && (
            <div className="bg-red-50 border border-red-200 text-red-700 text-sm px-3 py-2 rounded-lg">
              {error}
            </div>
          )}

          {uploadProgress && (
            <div className="bg-blue-50 border border-blue-200 text-blue-700 text-sm px-3 py-2 rounded-lg flex items-center gap-2">
              <span className="inline-block w-4 h-4 border-2 border-blue-300 border-t-transparent rounded-full animate-spin" />
              {uploadProgress}
            </div>
          )}

          <div className="flex gap-3 pt-1">
            <button type="button" onClick={onClose} className="btn-secondary flex-1 justify-center">
              Cancel
            </button>
            <button type="submit" className="btn-primary flex-1 justify-center" disabled={loading}>
              {loading ? 'Submitting...' : 'Submit for QA'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
