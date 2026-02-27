'use client'
import { useState, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { X, Upload, File, ExternalLink } from 'lucide-react'

interface SubmitClipModalProps {
  clip: any
  editorId: string
  onClose: () => void
}

export default function SubmitClipModal({ clip, editorId, onClose }: SubmitClipModalProps) {
  const router = useRouter()
  const fileRef = useRef<HTMLInputElement>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [file, setFile] = useState<File | null>(null)
  const [driveUsedContentLink, setDriveUsedContentLink] = useState('')
  const [dragOver, setDragOver] = useState(false)

  function handleFileDrop(e: React.DragEvent) {
    e.preventDefault()
    setDragOver(false)
    const f = e.dataTransfer.files[0]
    if (f) setFile(f)
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!file) { setError('Please select a file to upload'); return }
    setLoading(true)
    setError('')

    try {
      const formData = new FormData()
      formData.append('file', file)
      formData.append('clipId', clip.id)
      formData.append('clipName', clip.name)
      formData.append('editorId', editorId)
      formData.append('driveUsedContentLink', driveUsedContentLink)

      const res = await fetch('/api/submit-clip', {
        method: 'POST',
        body: formData,
      })

      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Submission failed')

      router.refresh()
      onClose()
    } catch (err: any) {
      setError(err.message)
      setLoading(false)
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
            <a href={clip.example_reel_url} target="_blank" rel="noopener noreferrer"
              className="text-xs text-brand-600 hover:text-brand-700 flex items-center gap-1">
              <ExternalLink className="w-3 h-3" />
              {clip.example_reel_url}
            </a>
          </div>
        )}

        {clip.additional_notes && (
          <div className="bg-amber-50 border border-amber-100 rounded-lg p-3">
            <p className="text-xs font-medium text-amber-700 mb-1">Director Notes</p>
            <p className="text-xs text-amber-600">{clip.additional_notes}</p>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* File Upload */}
          <div>
            <label className="label">Finished Clip File <span className="text-red-500">*</span></label>
            <div
              onDragOver={e => { e.preventDefault(); setDragOver(true) }}
              onDragLeave={() => setDragOver(false)}
              onDrop={handleFileDrop}
              onClick={() => fileRef.current?.click()}
              className={`border-2 border-dashed rounded-xl p-6 text-center cursor-pointer transition-colors ${
                dragOver ? 'border-brand-400 bg-brand-50' : 'border-gray-200 hover:border-brand-300 hover:bg-gray-50'
              }`}
            >
              {file ? (
                <div className="flex items-center justify-center gap-3">
                  <File className="w-6 h-6 text-brand-600" />
                  <div className="text-left">
                    <p className="text-sm font-medium text-gray-900">{file.name}</p>
                    <p className="text-xs text-gray-500">{formatBytes(file.size)}</p>
                  </div>
                </div>
              ) : (
                <div>
                  <Upload className="w-8 h-8 text-gray-300 mx-auto mb-2" />
                  <p className="text-sm font-medium text-gray-600">Drop your video file here</p>
                  <p className="text-xs text-gray-400 mt-1">or click to browse</p>
                  <p className="text-xs text-gray-400 mt-1">MP4, MOV, AVI supported</p>
                </div>
              )}
            </div>
            <input
              ref={fileRef}
              type="file"
              accept="video/*"
              className="hidden"
              onChange={e => e.target.files?.[0] && setFile(e.target.files[0])}
            />
          </div>

          {/* Drive Link for Used Content */}
          <div>
            <label className="label">Drive Link to Used Content</label>
            <input
              className="input"
              placeholder="https://drive.google.com/..."
              value={driveUsedContentLink}
              onChange={e => setDriveUsedContentLink(e.target.value)}
            />
            <p className="text-xs text-gray-400 mt-1">Link to the raw footage/assets you used</p>
          </div>

          {error && (
            <div className="bg-red-50 border border-red-200 text-red-700 text-sm px-3 py-2 rounded-lg">
              {error}
            </div>
          )}

          <div className="flex gap-3 pt-1">
            <button type="button" onClick={onClose} className="btn-secondary flex-1 justify-center">
              Cancel
            </button>
            <button type="submit" className="btn-primary flex-1 justify-center" disabled={loading || !file}>
              {loading ? 'Uploading to Drive...' : 'Submit for QA'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
