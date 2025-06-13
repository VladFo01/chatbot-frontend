import React, { useState, useRef, useCallback } from 'react'
import { Upload, X, File, CheckCircle, AlertCircle, Loader2 } from 'lucide-react'
import type { FileUpload } from '../types'
import { fileUploadService } from '../services/api'

interface FileUploadProps {
  onUploadComplete?: (fileId: string, filename: string) => void
  onUploadError?: (error: string) => void
  acceptedTypes?: string[]
  maxFileSize?: number // in MB
  multiple?: boolean
}

export const FileUploadComponent: React.FC<FileUploadProps> = ({
  onUploadComplete,
  onUploadError,
  acceptedTypes = ['.pdf', '.doc', '.docx', '.txt', '.md'],
  maxFileSize = 10,
  multiple = true
}) => {
  const [uploads, setUploads] = useState<FileUpload[]>([])
  const [isDragOver, setIsDragOver] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const generateId = () => Math.random().toString(36).substr(2, 9)

  const handleFiles = useCallback((files: FileList) => {
    const validateFile = (file: File): string | null => {
      if (file.size > maxFileSize * 1024 * 1024) {
        return `File size must be less than ${maxFileSize}MB`
      }
      const fileExtension = '.' + file.name.split('.').pop()?.toLowerCase()
      if (!acceptedTypes.includes(fileExtension)) {
        return `File type not supported. Accepted types: ${acceptedTypes.join(', ')}`
      }
      return null
    }
    const fileArray = Array.from(files)
    
    if (!multiple && fileArray.length > 1) {
      onUploadError?.('Only one file can be uploaded at a time')
      return
    }

    fileArray.forEach(async (file) => {
      const validationError = validateFile(file)
      if (validationError) {
        onUploadError?.(validationError)
        return
      }

      const uploadId = generateId()
      const newUpload: FileUpload = {
        file,
        id: uploadId,
        progress: 0,
        status: 'pending'
      }

      setUploads(prev => [...prev, newUpload])

      try {
        // Update status to uploading
        setUploads(prev => prev.map(upload => 
          upload.id === uploadId 
            ? { ...upload, status: 'uploading' as const }
            : upload
        ))

        // Upload file with progress tracking
        const response = await fileUploadService.uploadFile(file, (progress) => {
          setUploads(prev => prev.map(upload => 
            upload.id === uploadId 
              ? { ...upload, progress }
              : upload
          ))
        })

        // Update with file ID and start processing status
        setUploads(prev => prev.map(upload => 
          upload.id === uploadId 
            ? { ...upload, fileId: response.file_id, status: 'processing' as const, progress: 100 }
            : upload
        ))

        // Poll for processing status
        const finalStatus = await fileUploadService.pollFileStatus(
          response.file_id,
          (statusUpdate) => {
            console.log('Status update:', statusUpdate)
            // Update status in real-time
            setUploads(prev => prev.map(upload => 
              upload.id === uploadId 
                ? { ...upload, status: statusUpdate.status }
                : upload
            ))
          }
        )

        if (finalStatus.status === 'processed') {
          setUploads(prev => prev.map(upload => 
            upload.id === uploadId 
              ? { ...upload, status: 'processed' as const }
              : upload
          ))
          onUploadComplete?.(response.file_id, file.name)
        } else {
          throw new Error(finalStatus.detail || 'Processing failed')
        }

      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : 'Upload failed'
        setUploads(prev => prev.map(upload => 
          upload.id === uploadId 
            ? { ...upload, status: 'error' as const, error: errorMessage }
            : upload
        ))
        onUploadError?.(errorMessage)
      }
    })
  }, [multiple, onUploadComplete, onUploadError, maxFileSize, acceptedTypes])

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    setIsDragOver(true)
  }, [])

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    setIsDragOver(false)
  }, [])

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    setIsDragOver(false)
    
    const files = e.dataTransfer.files
    if (files.length > 0) {
      handleFiles(files)
    }
  }, [handleFiles])

  const handleFileSelect = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files
    if (files && files.length > 0) {
      handleFiles(files)
    }
    // Reset input value to allow selecting the same file again
    e.target.value = ''
  }, [handleFiles])

  const removeUpload = (uploadId: string) => {
    setUploads(prev => prev.filter(upload => upload.id !== uploadId))
  }

  const getStatusIcon = (upload: FileUpload) => {
    switch (upload.status) {
      case 'uploading':
      case 'processing':
        return <Loader2 className="w-4 h-4 animate-spin text-blue-500" />
      case 'processed':
        return <CheckCircle className="w-4 h-4 text-green-500" />
      case 'unknown':
      case 'error':
        return <AlertCircle className="w-4 h-4 text-red-500" />
      default:
        return <File className="w-4 h-4 text-gray-400" />
    }
  }

  const getStatusText = (upload: FileUpload) => {
    switch (upload.status) {
      case 'uploading':
        return `Uploading... ${upload.progress}%`
      case 'processing':
        return 'Processing...'
      case 'processed':
        return 'Ready for chat'
      case 'unknown':
        return 'Processing status unknown'
      case 'error':
        return upload.error || 'Upload failed'
      default:
        return 'Pending'
    }
  }

  return (
    <div className="space-y-4">
      {/* Upload Area */}
      <div
        className={`relative border-2 border-dashed rounded-lg p-6 text-center transition-colors ${
          isDragOver
            ? 'border-primary-500 bg-primary-50'
            : 'border-gray-300 hover:border-gray-400'
        }`}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
      >
        <input
          ref={fileInputRef}
          type="file"
          className="hidden"
          onChange={handleFileSelect}
          accept={acceptedTypes.join(',')}
          multiple={multiple}
        />
        
        <Upload className="w-12 h-12 text-gray-400 mx-auto mb-4" />
        <h3 className="text-lg font-medium text-gray-900 mb-2">
          Upload Files
        </h3>
        <p className="text-sm text-gray-600 mb-4">
          Drag and drop files here, or click to select files
        </p>
        <button
          onClick={() => fileInputRef.current?.click()}
          className="px-4 py-2 bg-primary-500 text-white rounded-lg hover:bg-primary-600 transition-colors"
        >
          Select Files
        </button>
        <p className="text-xs text-gray-500 mt-2">
          Supported formats: {acceptedTypes.join(', ')} • Max size: {maxFileSize}MB
        </p>
      </div>

      {/* Upload Progress */}
      {uploads.length > 0 && (
        <div className="space-y-2">
          <h4 className="text-sm font-medium text-gray-900">Uploads</h4>
          {uploads.map((upload) => (
            <div
              key={upload.id}
              className="flex items-center space-x-3 p-3 bg-gray-50 rounded-lg"
            >
              {getStatusIcon(upload)}
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-gray-900 truncate">
                  {upload.file.name}
                </p>
                <p className="text-xs text-gray-500">
                  {getStatusText(upload)}
                </p>
                {upload.status === 'uploading' && (
                  <div className="w-full bg-gray-200 rounded-full h-1.5 mt-1">
                    <div
                      className="bg-blue-500 h-1.5 rounded-full transition-all"
                      style={{ width: `${upload.progress}%` }}
                    />
                  </div>
                )}
              </div>
              <button
                onClick={() => removeUpload(upload.id)}
                className="p-1 text-gray-400 hover:text-gray-600 transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  )
} 