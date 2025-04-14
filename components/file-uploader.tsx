"use client"

import type React from "react"
import { useCallback, useState } from "react"
import { useDropzone } from "react-dropzone"
import { Button } from "@/components/ui/button"
import { Upload, X, Plus } from "lucide-react"

interface FileUploaderProps {
  accept: string
  maxFiles?: number // Make this optional
  onUpload: (files: File[]) => void
  currentFiles: File[]
  onRemove: (index: number) => void
  error?: string
  helperText?: string
  showPreview?: boolean
}

export const FileUploader: React.FC<FileUploaderProps> = ({
  accept,
  maxFiles = Number.POSITIVE_INFINITY, // Default to unlimited
  onUpload,
  currentFiles,
  onRemove,
  error,
  helperText,
  showPreview = false,
}) => {
  const [isDragActive, setIsDragActive] = useState(false)

  const onDrop = useCallback(
    (acceptedFiles: File[]) => {
      onUpload(acceptedFiles)
    },
    [onUpload],
  )

  const { getRootProps, getInputProps, isDragReject, open } = useDropzone({
    onDrop,
    accept: accept
      ? { [accept.split("/")[0]]: [accept.split("/")[1] === "*" ? "/*" : accept.split("/")[1]] }
      : undefined,
    maxFiles: maxFiles === Number.POSITIVE_INFINITY ? undefined : maxFiles - currentFiles.length,
    onDragEnter: () => setIsDragActive(true),
    onDragLeave: () => setIsDragActive(false),
    onDropAccepted: () => setIsDragActive(false),
    onDropRejected: () => setIsDragActive(false),
  })

  const hasFiles = currentFiles.length > 0
  const hasReachedMaxFiles = maxFiles !== Number.POSITIVE_INFINITY && currentFiles.length >= maxFiles

  return (
    <div className="space-y-4">
      <div
        {...getRootProps()}
        className={`border-2 border-dashed rounded-lg p-6 text-center cursor-pointer transition-colors ${
          isDragActive ? "border-primary bg-primary/5" : "border-border"
        } ${isDragReject ? "border-destructive bg-destructive/5" : ""} ${error ? "border-destructive" : ""}`}
      >
        <input {...getInputProps()} />
        <div className="flex flex-col items-center justify-center gap-2">
          <Upload className="h-10 w-10 text-muted-foreground" />
          <p className="text-sm font-medium">
            {hasReachedMaxFiles ? "Maximum files reached" : "Drag & drop files here, or click to select"}
          </p>
          {helperText && <p className="text-xs text-muted-foreground">{helperText}</p>}
          {currentFiles.length > 0 && maxFiles !== Number.POSITIVE_INFINITY && (
            <p className="text-xs text-muted-foreground">
              {currentFiles.length} / {maxFiles} files
            </p>
          )}
          {currentFiles.length > 0 && maxFiles === Number.POSITIVE_INFINITY && (
            <p className="text-xs text-muted-foreground">{currentFiles.length} files uploaded</p>
          )}
        </div>
      </div>

      {error && <p className="text-destructive text-sm">{error}</p>}

      {hasFiles && !showPreview && (
        <div className="space-y-2">
          {currentFiles.map((file, index) => (
            <div key={index} className="flex items-center justify-between p-2 rounded-md bg-muted">
              <div className="flex items-center gap-2 truncate">
                <div className="w-8 h-8 rounded-md bg-background flex items-center justify-center">
                  <span className="text-xs font-medium">{file.name.split(".").pop()}</span>
                </div>
                <span className="text-sm truncate">{file.name}</span>
              </div>
              <Button variant="ghost" size="icon" onClick={() => onRemove(index)} className="h-8 w-8">
                <X className="h-4 w-4" />
              </Button>
            </div>
          ))}
        </div>
      )}

      {/* Add a button to add more files even after initial upload */}
      {hasFiles && !hasReachedMaxFiles && (
        <Button
          type="button"
          variant="outline"
          onClick={open}
          className="w-full flex items-center justify-center gap-2"
        >
          <Plus className="h-4 w-4" />
          Add More Files
        </Button>
      )}
    </div>
  )
}
