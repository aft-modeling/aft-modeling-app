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

function formatBytes(bytes: number): string {
  if (bytes < 1024) return bytes + ' B'
  if (bytes < 1048576) return (bytes / 1024).toFixed(1) + ' KB'
  return (bytes / 1048576).toFixed(1) + ' MB'
}

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

  async function handleSubmit() {
    if (!file) return
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

      setUploadProgress('Uploading file to storage...')
      const fileExt = file.name.split('.').pop()
      const fileName = `${clip.id}/round-${(clip.current_round || 0) + 1}.${fileExt}`
      const { error: uploadError } = await supabase.storage
        .from('clip-submissions')
        .upload(fileName, file, { upsert: true })
      if (uploadError) throw uploadError
      storagePath = fileName
      const { data: urlData } = supabase.storage
        .from('clip-submissions')
        .getPublicUrl(fileName)
      fileUrl = urlData.publicUrl

      setUploadProgress('Processing submission...')
      const res = await fetch('/api/submit-clip', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          clipId: clip.id,
          editorId,
          storagePath,
          fileUrl,
          driveUsedContentLink: driveUsedContentLink.trim() || null,
        }),
      })

      const result = await res.json()
      if (!res.ok) throw new Error(result.error || 'Submission failed')
      router.refresh()
      onClose()
    } catch (err: any) {
      setError(err.message)
    } finally {
      setLoading(false)
      setUploadProgress('')
    }
  }

  return (
    <div className="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-lg overflow-hidden">
        <div className="flex items-center justify-between p-5 border-b border-gray-100">
          <div>
            <h2 className="text-lg font-bold text-gray-900">Submit Clip</h2>
            <p className="text-sm text-gray-500">{clip.name} &bull; Round #{(clip.current_round || 0) + 1}</p>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-gray-100 rounded-lg transition-colors">
            <X className="w-5 h-5 text-gray-400" />
          </button>
        </div>

        <div className="p-5 space-y-4">
          {error && (
            <div className="p-3 bg-red-50 border border-red-100 rounded-lg text-sm text-red-600">
              {error}
            </div>
          )}

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Video File <span className="text-gray-400">(max {MAX_FILE_SIZE_MB}MB)</span>
            </label>
            <div
              className={`border-2 border-dashed rounded-xl p-6 text-center transition-colors cursor-pointer ${
                dragOver ? 'border-brand-400 bg-brand-50' : file ? 'border-green-300 bg-green-50' : 'border-gray-200 hover:border-brand-300 hover:bg-gray-50'
              }`}
              onDragOver={(e) => { e.preventDefault(); setDragOver(true) }}
              onDragLeave={() => setDragOver(false)}
              onDrop={handleFileDrop}
              onClick={() => fileRef.current?.click()}
            >
              <input
                ref={fileRef}
                type="file"
                accept="video/*"
                className="hidden"
                onChange={(e) => validateAndSetFile(e.target.files?.[0] || null)}
              />
              {file ? (
                <div className="flex items-center justify-center gap-2 text-green-700">
                  <File className="w-5 h-5" />
                  <span className="text-sm font-medium">{file.name}</span>
                  <span className="text-xs text-green-500">({formatBytes(file.size)})</span>
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

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Drive Link to Used Content <span className="text-red-500">*</span>
            </label>
            <div className="relative">
              <ExternalLink className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
              <input
                type="url"
                placeholder="https://drive.google.com/..."
                value={driveUsedContentLink}
                onChange={(e) => setDriveUsedContentLink(e.target.value)}
                className="w-full pl-10 pr-4 py-2.5 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-brand-500 focus:border-brand-500"
              />
            </div>
            <p className="text-xs text-gray-400 mt-1">Link to the Google Drive folder with source content used</p>
          </div>
        </div>

        <div className="p-5 border-t border-gray-100 flex items-center justify-between">
          <button
            onClick={onClose}
            className="px-4 py-2 text-sm text-gray-600 hover:text-gray-800 font-medium"
            disabled={loading}
          >
            Cancel
          </button>
          <button
            onClick={handleSubmit}
            disabled={!file || loading}
            className="btn-primary px-6 py-2.5 text-sm disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
          >
            {loading ? (
              <>
                <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                {uploadProgress || 'Submitting...'}
              </>
            ) : (
              'Submit for QA'
            )}
          </button>
        </div>
      </div>
    </div>
  )
}
