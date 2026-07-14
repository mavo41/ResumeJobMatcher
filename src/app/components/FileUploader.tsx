// src/app/components/FileUploader.tsx
"use client";

import { useState, useCallback } from "react";
import { useDropzone } from "react-dropzone";
import Image from "next/image";
import { X } from "lucide-react";

interface FileUploaderProps {
  onFileSelect?: (file: File | null) => void;
  accept?: string[];
  maxSize?: number;
}

const FileUploader = ({ 
  onFileSelect, 
  accept = ["application/pdf"], 
  maxSize = 20 * 1024 * 1024 // 20 MB default
}: FileUploaderProps) => {
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [error, setError] = useState<string | null>(null);

  const onDrop = useCallback(
    (acceptedFiles: File[], rejectedFiles: any[]) => {
      setError(null);
      
      // Handle rejected files
      if (rejectedFiles.length > 0) {
        const rejection = rejectedFiles[0];
        if (rejection.errors[0]?.code === 'file-too-large') {
          setError(`File too large. Max size: ${maxSize / 1024 / 1024}MB`);
        } else if (rejection.errors[0]?.code === 'file-invalid-type') {
          setError('Please upload a PDF file');
        } else {
          setError('Invalid file. Please try again.');
        }
        onFileSelect?.(null);
        return;
      }

      const file = acceptedFiles[0] || null;
      setSelectedFile(file);
      onFileSelect?.(file);
    },
    [onFileSelect, maxSize]
  );

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    multiple: false,
    accept: accept.reduce((acc, type) => ({ ...acc, [type]: [] }), {}),
    maxSize,
  });

  const removeFile = (e: React.MouseEvent) => {
    e.stopPropagation();
    setSelectedFile(null);
    setError(null);
    onFileSelect?.(null);
  };

  return (
    <div className="flex flex-col items-center w-full">
      {error && (
        <div className="w-full mb-2 p-2 bg-rose-50 border border-rose-200 rounded-lg text-sm text-rose-600">
          {error}
        </div>
      )}
      
      {selectedFile ? (
        <div className="flex items-center gap-4 p-3 bg-gray-50 rounded-lg border border-gray-200 w-full">
          <Image
            src="/images/pdf.png"
            alt="PDF"
            width={32}
            height={32}
            className="flex-shrink-0"
          />
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium truncate">{selectedFile.name}</p>
            <p className="text-xs text-gray-500">
              {(selectedFile.size / 1024 / 1024).toFixed(2)} MB
            </p>
          </div>
          <button
            type="button"
            onClick={removeFile}
            className="p-1 hover:bg-gray-200 rounded-full transition"
          >
            <X className="w-4 h-4 text-gray-500" />
          </button>
        </div>
      ) : (
        <div
          {...getRootProps()}
          className={`w-full p-8 border-2 border-dashed rounded-lg text-center transition cursor-pointer ${
            isDragActive 
              ? "border-indigo-500 bg-indigo-50" 
              : "border-gray-300 hover:border-indigo-400"
          }`}
        >
          <input {...getInputProps()} />
          <div className="flex flex-col items-center gap-2">
            <div className="text-4xl">📄</div>
            {isDragActive ? (
              <p className="text-indigo-600 font-medium">Drop your PDF here...</p>
            ) : (
              <>
                <p className="text-gray-600">Drag & drop a PDF here, or click to select</p>
                <p className="text-xs text-gray-400">
                  Max size: {maxSize / 1024 / 1024}MB
                </p>
              </>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default FileUploader;