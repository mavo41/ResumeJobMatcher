"use client";
//src\app\components\FileUploader.tsx
import { useState, useCallback } from "react";
import { useDropzone } from "react-dropzone";
import Image from "next/image";

interface FileUploaderProps {
  onFileSelect?: (file: File | null) => void;
}

const FileUploader = ({ onFileSelect }: FileUploaderProps) => {
  const [selectedFile, setSelectedFile] = useState<File | null>(null);

  const onDrop = useCallback(
    (acceptedFiles: File[]) => {
      const file = acceptedFiles[0] || null;
      setSelectedFile(file); // ✅ Our single source of truth
      onFileSelect?.(file);
    },
    [onFileSelect]
  );

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    multiple: false,
    accept: { "application/pdf": [".pdf"] },
    maxSize: 20 * 1024 * 1024, // 20 MB
  });

  const removeFile = (e: React.MouseEvent) => {
    e.stopPropagation();
    setSelectedFile(null);
    onFileSelect?.(null);
  };

  return (
    <div className="flex flex-col items-center">
      {/* If file is selected, show PDF icon */}
      {selectedFile ? (
        <div className="flex flex-col items-center">
          <Image
            src="/images/pdf.png"
            alt="PDF"
            width={40}
            height={40}
            className="mb-2"
          />
          <p className="text-sm">{selectedFile.name}</p>
          <button
            type="button"
            onClick={removeFile}
            className="p-2 cursor-pointer"
          >
           <img src="/icons/cross.svg" alt="remove" className="w-4 h-4" />

           
          </button>
          
        </div>
      ) : (
        // Dropzone upload area
        <div
          {...getRootProps()}
          className="p-6 border-2 border-dashed border-gray-300 rounded-md cursor-pointer hover:border-blue-400 text-black"
        >
          <input {...getInputProps()} />
          {isDragActive ? (
            <p className="text-blue-500">Drop the file here ...</p>
          ) : (
            <p>Drag & drop a PDF here, or click to select one</p>
          )}
        </div>
      )}
    </div>
  );
};

export default FileUploader;
