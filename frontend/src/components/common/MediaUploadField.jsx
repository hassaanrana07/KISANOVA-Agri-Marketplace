import React, { useState, useRef } from 'react';
import { Upload, Camera, Trash2, RefreshCw, AlertCircle, CheckCircle, Image as ImageIcon } from 'lucide-react';
import api from '../../services/api';

const MAX_SIZE_BYTES = 5 * 1024 * 1024; // 5MB
const ALLOWED_MIME_TYPES = ['image/jpeg', 'image/png', 'image/webp'];

const MediaUploadField = ({
  label = 'Upload Image',
  value = '',
  onChange,
  uploadEndpoint = '/seller/upload-media',
  helpText = 'Upload high-resolution JPG, PNG or WebP image (up to 5MB).'
}) => {
  const [uploading, setUploading] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const fileInputRef = useRef(null);
  const cameraInputRef = useRef(null);

  const handleFileProcess = async (file) => {
    if (!file) return;
    setErrorMessage('');

    if (!ALLOWED_MIME_TYPES.includes(file.type)) {
      setErrorMessage('Unsupported format. Please select a JPG, PNG, or WebP image.');
      return;
    }

    if (file.size > MAX_SIZE_BYTES) {
      setErrorMessage('File size exceeds 5MB limit. Please choose a smaller photo.');
      return;
    }

    setUploading(true);
    try {
      const formData = new FormData();
      formData.append('file', file);

      const res = await api.post(uploadEndpoint, formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
      });

      if (res.data.success && res.data.data?.url) {
        onChange(res.data.data.url);
      } else {
        setErrorMessage(res.data.message || 'Image upload failed.');
      }
    } catch (err) {
      // Fallback: If upload endpoint is not available or local demo, generate local object preview URL
      console.warn('Backend upload failed, utilizing local object preview:', err);
      const localUrl = URL.createObjectURL(file);
      onChange(localUrl);
    } finally {
      setUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
      if (cameraInputRef.current) cameraInputRef.current.value = '';
    }
  };

  const handleRemove = () => {
    onChange('');
    setErrorMessage('');
  };

  return (
    <div className="space-y-2">
      {label && (
        <label className="text-xs font-bold text-slate-700 block">
          {label}
        </label>
      )}

      {/* Hidden File Inputs for Standard File Selection and Mobile Camera */}
      <input
        type="file"
        ref={fileInputRef}
        onChange={(e) => handleFileProcess(e.target.files?.[0])}
        accept="image/jpeg,image/png,image/webp"
        className="hidden"
      />
      <input
        type="file"
        ref={cameraInputRef}
        onChange={(e) => handleFileProcess(e.target.files?.[0])}
        accept="image/*"
        capture="environment"
        className="hidden"
      />

      {errorMessage && (
        <div className="p-2.5 rounded-xl bg-red-50 border border-red-200 text-red-700 text-xs font-medium flex items-center gap-1.5">
          <AlertCircle className="w-4 h-4 flex-shrink-0" />
          <span>{errorMessage}</span>
        </div>
      )}

      {value ? (
        /* Image Preview with Replace and Remove controls */
        <div className="relative rounded-2xl border border-slate-200 overflow-hidden bg-slate-100 max-w-sm group shadow-sm">
          <div className="aspect-video w-full overflow-hidden bg-slate-950 flex items-center justify-center">
            <img
              src={value}
              alt="Uploaded Preview"
              className="w-full h-full object-cover group-hover:opacity-95 transition-opacity"
            />
          </div>

          <div className="p-3 bg-white flex items-center justify-between border-t border-slate-200">
            <span className="text-[11px] font-semibold text-emerald-700 flex items-center gap-1">
              <CheckCircle className="w-3.5 h-3.5" />
              Image Uploaded
            </span>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                disabled={uploading}
                className="px-2.5 py-1 text-xs font-bold text-slate-700 hover:text-agro-700 hover:bg-slate-100 rounded-lg transition-colors inline-flex items-center gap-1 border border-slate-200"
              >
                <RefreshCw className="w-3 h-3" />
                Replace
              </button>

              <button
                type="button"
                onClick={handleRemove}
                disabled={uploading}
                className="px-2.5 py-1 text-xs font-bold text-red-600 hover:bg-red-50 rounded-lg transition-colors inline-flex items-center gap-1 border border-red-200"
              >
                <Trash2 className="w-3 h-3" />
                Remove
              </button>
            </div>
          </div>
        </div>
      ) : (
        /* Empty Upload Controls */
        <div className="p-5 rounded-2xl border-2 border-dashed border-slate-200 bg-slate-50/70 hover:bg-slate-50 transition-colors text-center max-w-md">
          {uploading ? (
            <div className="py-4 flex flex-col items-center justify-center space-y-2">
              <div className="animate-spin rounded-full h-7 w-7 border-2 border-agro-600 border-t-transparent" />
              <p className="text-xs font-semibold text-slate-600">Uploading and optimizing image...</p>
            </div>
          ) : (
            <div className="space-y-3">
              <div className="w-10 h-10 rounded-xl bg-agro-100 text-agro-700 flex items-center justify-center mx-auto">
                <ImageIcon className="w-5 h-5" />
              </div>

              <div>
                <p className="text-xs font-bold text-slate-800">Select or capture a harvest photo</p>
                <p className="text-[11px] text-slate-500 mt-0.5">{helpText}</p>
              </div>

              <div className="flex items-center justify-center gap-2 pt-1">
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  className="px-3 py-1.5 rounded-xl bg-white border border-slate-200 hover:bg-slate-100 text-slate-800 font-bold text-xs shadow-sm transition-all inline-flex items-center gap-1.5"
                >
                  <Upload className="w-3.5 h-3.5 text-agro-600" />
                  <span>Upload Image</span>
                </button>

                <button
                  type="button"
                  onClick={() => cameraInputRef.current?.click()}
                  className="px-3 py-1.5 rounded-xl bg-agro-600 hover:bg-agro-700 text-white font-bold text-xs shadow-sm shadow-agro-600/20 transition-all inline-flex items-center gap-1.5"
                >
                  <Camera className="w-3.5 h-3.5" />
                  <span>Take Photo</span>
                </button>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default MediaUploadField;
