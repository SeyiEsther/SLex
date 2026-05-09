'use client'

import { useCallback, useRef, useState } from 'react'
import { cn } from '@/lib/utils'

interface FileUploadProps {
  label: string
  description: string
  accept?: string
  onFile: (file: File) => void
  fileName?: string
  rowCount?: number
  hasError?: boolean
}

export default function FileUpload({
  label,
  description,
  accept = '.csv',
  onFile,
  fileName,
  rowCount,
  hasError,
}: FileUploadProps) {
  const inputRef = useRef<HTMLInputElement>(null)
  const [isDragging, setIsDragging] = useState(false)

  const handleFile = useCallback(
    (file: File) => {
      if (!file.name.endsWith('.csv')) {
        alert('Please upload a CSV file.')
        return
      }
      onFile(file)
    },
    [onFile]
  )

  function onDrop(e: React.DragEvent) {
    e.preventDefault()
    setIsDragging(false)
    const file = e.dataTransfer.files[0]
    if (file) handleFile(file)
  }

  function onInputChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (file) handleFile(file)
    e.target.value = ''
  }

  const uploaded = !!fileName

  return (
    <div
      className={cn(
        'relative rounded-xl border-2 border-dashed transition-colors cursor-pointer',
        uploaded && !hasError && 'border-green-400 bg-green-50',
        uploaded && hasError && 'border-amber-400 bg-amber-50',
        !uploaded && !isDragging && 'bg-white'
      )}
      style={
        isDragging
          ? { borderColor: '#162660', backgroundColor: '#D0E6FD40' }
          : !uploaded
          ? { borderColor: '#D0E6FD' }
          : undefined
      }
      onDragOver={(e) => { e.preventDefault(); setIsDragging(true) }}
      onDragLeave={() => setIsDragging(false)}
      onDrop={onDrop}
      onClick={() => inputRef.current?.click()}
      onMouseEnter={(e) => {
        if (!uploaded && !isDragging)
          e.currentTarget.style.borderColor = '#162660'
      }}
      onMouseLeave={(e) => {
        if (!uploaded && !isDragging)
          e.currentTarget.style.borderColor = '#D0E6FD'
      }}
    >
      <input
        ref={inputRef}
        type="file"
        accept={accept}
        className="sr-only"
        onChange={onInputChange}
      />

      <div className="px-6 py-8 text-center">
        {uploaded ? (
          <>
            <div className={cn(
              'w-10 h-10 rounded-full flex items-center justify-center mx-auto mb-3',
              hasError ? 'bg-amber-100' : 'bg-green-100'
            )}>
              {hasError ? (
                <svg className="w-5 h-5 text-amber-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01M12 3a9 9 0 110 18A9 9 0 0112 3z" />
                </svg>
              ) : (
                <svg className="w-5 h-5 text-green-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
              )}
            </div>
            <p className="text-sm font-semibold text-gray-900 mb-1">{fileName}</p>
            <p className="text-xs text-gray-500">
              {rowCount !== undefined ? `${rowCount} rows parsed` : 'Parsed'}
              {' · '}
              <span style={{ color: '#162660' }}>Click to replace</span>
            </p>
          </>
        ) : (
          <>
            <div
              className="w-10 h-10 rounded-full flex items-center justify-center mx-auto mb-3"
              style={{ backgroundColor: '#D0E6FD' }}
            >
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" style={{ color: '#162660' }}>
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
              </svg>
            </div>
            <p className="text-sm font-semibold text-gray-700 mb-1">{label}</p>
            <p className="text-xs text-gray-400 mb-2">{description}</p>
            <p className="text-xs text-gray-400">
              Drag &amp; drop or{' '}
              <span style={{ color: '#162660' }} className="font-medium">browse</span>
            </p>
          </>
        )}
      </div>
    </div>
  )
}
