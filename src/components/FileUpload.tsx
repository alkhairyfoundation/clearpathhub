'use client';

import { useState, useRef } from 'react';
import { Upload, X, FileText, Image as ImageIcon, Loader2, CheckCircle2, AlertCircle } from 'lucide-react';
import { uploadFile, STORAGE_BUCKETS } from '@/lib/supabase';

interface FileUploadProps {
  bucket: string;
  onUpload: (url: string) => void;
  label?: string;
  accept?: string;
  helperText?: string;
  defaultValue?: string;
  className?: string;
}

export default function FileUpload({
  bucket,
  onUpload,
  label = 'Upload File',
  accept = 'image/*',
  helperText = 'PNG, JPG or PDF up to 10MB',
  defaultValue = '',
  className = '',
}: FileUploadProps) {
  const [file, setFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string>(defaultValue);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0];
    if (!selectedFile) return;

    // Reset states
    setFile(selectedFile);
    setError(null);
    setSuccess(false);

    // Create preview for images
    if (selectedFile.type.startsWith('image/')) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setPreviewUrl(reader.result as string);
      };
      reader.readAsDataURL(selectedFile);
    } else {
      setPreviewUrl('');
    }

    // Auto-upload
    await upload(selectedFile);
  };

  const upload = async (fileToUpload: File) => {
    setUploading(true);
    setError(null);

    try {
      const { url, error: uploadError } = await uploadFile(bucket, fileToUpload, 'uploads');
      
      if (uploadError) throw uploadError;
      
      if (url) {
        onUpload(url);
        setPreviewUrl(url);
        setSuccess(true);
      }
    } catch (err: any) {
      console.error('Upload failed:', err);
      setError(err.message || 'Upload failed. Please try again.');
    } finally {
      setUploading(false);
    }
  };

  const clearFile = () => {
    setFile(null);
    setPreviewUrl(defaultValue);
    setError(null);
    setSuccess(false);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  return (
    <div className={`space-y-2 ${className}`}>
      {label && <label className="label">{label}</label>}
      
      <div 
        className={`relative border-2 border-dashed rounded-xl p-4 transition-all ${
          uploading ? 'bg-slate-50 border-slate-300' :
          error ? 'bg-red-50 border-red-200' :
          success ? 'bg-emerald-50 border-emerald-200' :
          'bg-white border-slate-200 hover:border-cp-gold/50'
        }`}
      >
        <input
          type="file"
          ref={fileInputRef}
          onChange={handleFileChange}
          accept={accept}
          className="hidden"
        />

        <div className="flex flex-col items-center justify-center py-2">
          {previewUrl && !error ? (
            <div className="relative mb-3 group">
              {previewUrl.startsWith('data:') || previewUrl.includes('image') || previewUrl.match(/\.(jpg|jpeg|png|gif|webp)$/i) ? (
                <img src={previewUrl} alt="Preview" className="w-20 h-20 object-contain rounded-lg border border-slate-200 shadow-sm" />
              ) : (
                <div className="w-20 h-20 bg-slate-100 rounded-lg flex items-center justify-center">
                  <FileText className="text-slate-400" size={32} />
                </div>
              )}
              <button 
                onClick={(e) => { e.preventDefault(); clearFile(); }}
                className="absolute -top-2 -right-2 bg-red-500 text-white rounded-full p-1 shadow-lg opacity-0 group-hover:opacity-100 transition-opacity"
              >
                <X size={12} />
              </button>
            </div>
          ) : (
            <div 
              onClick={() => fileInputRef.current?.click()}
              className="w-12 h-12 bg-slate-100 rounded-full flex items-center justify-center mb-3 cursor-pointer hover:bg-slate-200 transition-colors"
            >
              <Upload className="text-slate-400" size={20} />
            </div>
          )}

          <div className="text-center">
            {uploading ? (
              <div className="flex items-center gap-2 text-sm font-medium text-slate-600">
                <Loader2 className="animate-spin" size={16} />
                Uploading...
              </div>
            ) : error ? (
              <div className="flex items-center gap-2 text-sm font-medium text-red-600">
                <AlertCircle size={16} />
                {error}
                <button onClick={() => fileInputRef.current?.click()} className="underline ml-1">Retry</button>
              </div>
            ) : success ? (
              <div className="flex items-center gap-2 text-sm font-medium text-emerald-600">
                <CheckCircle2 size={16} />
                Upload successful!
                <button onClick={() => fileInputRef.current?.click()} className="underline ml-1">Change</button>
              </div>
            ) : (
              <>
                <p className="text-sm font-medium text-slate-700">
                  <button type="button" onClick={() => fileInputRef.current?.click()} className="text-cp-gold hover:underline">
                    Click to upload
                  </button>
                  {' '}or drag and drop
                </p>
                <p className="text-xs text-slate-400 mt-1">{helperText}</p>
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
