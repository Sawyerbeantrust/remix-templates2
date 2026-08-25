import React, { useState, useRef } from 'react';
import { Upload, AlertCircle, CheckCircle2, Loader2, X } from 'lucide-react';
import { ImagePreloader } from './ImagePreloader';
import { uploadImageToWordPress } from '../utils/imageUpload';

export interface ImageUploaderProps {
  currentImageUrl?: string;
  categoryName?: string;
  onUploadSuccess?: (url: string) => void;
  onUploadError?: (error: string) => void;
  className?: string;
}

export function ImageUploader({
  currentImageUrl,
  categoryName = 'Category',
  onUploadSuccess,
  onUploadError,
  className = '',
}: ImageUploaderProps) {
  const [isUploading, setIsUploading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(currentImageUrl || null);
  const [isDragging, setIsDragging] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFile = async (file: File) => {
    if (!file.type.startsWith('image/')) {
      const err = 'Please select a valid image file (JPEG, PNG, WebP, GIF).';
      setErrorMessage(err);
      onUploadError?.(err);
      return;
    }

    setErrorMessage(null);
    setSuccessMessage(null);
    setIsUploading(true);

    try {
      const wpUrl = await uploadImageToWordPress(file);
      setPreviewUrl(wpUrl);
      setSuccessMessage('Image uploaded directly to WordPress Media Library!');
      onUploadSuccess?.(wpUrl);
    } catch (err: any) {
      const msg = err?.message || 'Upload failed: WordPress Media Library did not accept the image. Check WP_AUTH_TOKEN/Application Password and Cloudflare WAF.';
      setErrorMessage(msg);
      onUploadError?.(msg);
    } finally {
      setIsUploading(false);
    }
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      handleFile(file);
    }
    e.target.value = '';
  };

  const handleDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragging(false);
    const file = e.dataTransfer.files?.[0];
    if (file) {
      handleFile(file);
    }
  };

  const handleDragOver = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = () => {
    setIsDragging(false);
  };

  return (
    <div className={`space-y-4 ${className}`}>
      {/* Upload Zone */}
      <div
        onDrop={handleDrop}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onClick={() => !isUploading && fileInputRef.current?.click()}
        className={`relative border-2 border-dashed rounded-xl p-6 transition-all duration-200 cursor-pointer flex flex-col items-center justify-center min-h-[160px] ${
          isDragging
            ? 'border-yellow-400 bg-yellow-400/5 ring-4 ring-yellow-400/10'
            : 'border-neutral-700 hover:border-neutral-500 bg-neutral-900/50 hover:bg-neutral-900/80'
        }`}
      >
        <input
          ref={fileInputRef}
          type="file"
          accept="image/jpeg,image/png,image/webp,image/gif"
          onChange={handleInputChange}
          className="hidden"
          disabled={isUploading}
        />

        {isUploading ? (
          <div className="flex flex-col items-center justify-center space-y-3">
            <Loader2 className="w-8 h-8 text-yellow-400 animate-spin" />
            <p className="text-sm font-medium text-neutral-300">Uploading category asset to server...</p>
          </div>
        ) : previewUrl ? (
          <div className="flex flex-col items-center space-y-3 w-full">
            <div className="relative w-32 h-24 rounded-lg overflow-hidden border border-neutral-700 bg-neutral-800 shadow-md">
              <ImagePreloader
                src={previewUrl}
                alt={`${categoryName} preview`}
                className="w-full h-full object-cover"
              />
            </div>
            <div className="text-center">
              <p className="text-xs font-semibold text-yellow-400 hover:underline">Click or drop to replace image</p>
              <p className="text-[11px] text-neutral-400 mt-0.5">JPG, PNG, WebP up to 10MB</p>
            </div>
          </div>
        ) : (
          <div className="flex flex-col items-center space-y-2 text-center">
            <div className="p-3 bg-neutral-800 rounded-full text-neutral-400 border border-neutral-700">
              <Upload className="w-5 h-5 text-yellow-400" />
            </div>
            <div>
              <p className="text-sm font-medium text-neutral-200">
                Click to upload <span className="text-neutral-400 font-normal">or drag & drop</span>
              </p>
              <p className="text-xs text-neutral-500 mt-0.5">Recommended: 800×600px (JPG, PNG, WebP)</p>
            </div>
          </div>
        )}
      </div>

      {/* UI Error Message Display */}
      {errorMessage && (
        <div className="flex items-start gap-2.5 p-3 rounded-lg bg-red-950/40 border border-red-800/60 text-red-300 text-xs animate-in fade-in">
          <AlertCircle className="w-4 h-4 text-red-400 shrink-0 mt-0.5" />
          <div className="flex-1">
            <span className="font-semibold block text-red-200">Upload Error:</span>
            {errorMessage}
          </div>
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              setErrorMessage(null);
            }}
            className="text-red-400 hover:text-red-200 p-0.5"
            aria-label="Dismiss error"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      )}

      {/* UI Success Message Display */}
      {successMessage && (
        <div className="flex items-center gap-2 p-3 rounded-lg bg-emerald-950/40 border border-emerald-800/60 text-emerald-300 text-xs animate-in fade-in">
          <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
          <span className="flex-1">{successMessage}</span>
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              setSuccessMessage(null);
            }}
            className="text-emerald-400 hover:text-emerald-200 p-0.5"
            aria-label="Dismiss success"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      )}
    </div>
  );
}

export default ImageUploader;
