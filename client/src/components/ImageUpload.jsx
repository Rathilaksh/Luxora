import React, { useState } from 'react';
import { useDropzone } from 'react-dropzone';
import { Upload, X, Loader } from 'lucide-react';

export default function ImageUpload({ listingId, token, onImagesUploaded }) {
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(null);

  const onDrop = async (acceptedFiles) => {
    if (!token) {
      setError('You must be logged in');
      return;
    }

    if (acceptedFiles.length === 0) {
      setError('No valid files selected');
      return;
    }

    setUploading(true);
    setError(null);
    setSuccess(null);

    try {
      const formData = new FormData();
      acceptedFiles.forEach((file) => {
        formData.append('images', file);
      });

      const response = await fetch(`/api/listings/${listingId}/images`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
        },
        body: formData,
      });

      const data = await response.json();

      if (response.ok) {
        setSuccess(`${acceptedFiles.length} image(s) uploaded successfully`);
        if (onImagesUploaded) {
          onImagesUploaded(data);
        }
        setTimeout(() => setSuccess(null), 3000);
      } else {
        setError(data.error || 'Upload failed');
      }
    } catch (err) {
      setError('Upload failed. Please try again.');
    } finally {
      setUploading(false);
    }
  };

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: {
      'image/*': ['.jpeg', '.jpg', '.png', '.webp'],
    },
    maxSize: 5242880, // 5MB
    disabled: uploading,
  });

  return (
    <div className="image-upload">
      <div
        {...getRootProps()}
        className={`dropzone ${isDragActive ? 'active' : ''} ${uploading ? 'disabled' : ''}`}
      >
        <input {...getInputProps()} />
        {uploading ? (
          <div className="upload-status">
            <Loader className="spin" size={32} />
            <p>Uploading...</p>
          </div>
        ) : (
          <div className="upload-prompt">
            <Upload size={32} />
            {isDragActive ? (
              <p>Drop images here...</p>
            ) : (
              <>
                <p>Drag & drop images here, or click to select</p>
                <p className="upload-hint">JPEG, PNG, WebP (max 5MB each)</p>
              </>
            )}
          </div>
        )}
      </div>

      {error && <div className="alert">{error}</div>}
      {success && <div className="alert success">{success}</div>}
    </div>
  );
}
