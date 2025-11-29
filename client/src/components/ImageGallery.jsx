import React, { useState } from 'react';
import { ChevronLeft, ChevronRight, X } from 'lucide-react';

export default function ImageGallery({ images, fallbackImage }) {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [lightboxOpen, setLightboxOpen] = useState(false);

  const displayImages = images && images.length > 0 ? images : [{ url: fallbackImage || 'https://placehold.co/1200x700?text=Luxora' }];

  const nextImage = () => {
    setCurrentIndex((prev) => (prev + 1) % displayImages.length);
  };

  const prevImage = () => {
    setCurrentIndex((prev) => (prev - 1 + displayImages.length) % displayImages.length);
  };

  return (
    <div className="image-gallery">
      <div className="image-gallery-main" onClick={() => setLightboxOpen(true)}>
        <img
          src={displayImages[currentIndex].url}
          alt={displayImages[currentIndex].caption || 'Property image'}
          referrerPolicy="no-referrer"
          onError={(e) => {
            e.currentTarget.onerror = null;
            e.currentTarget.src = 'https://placehold.co/1200x700?text=Luxora';
          }}
        />
        {displayImages.length > 1 && (
          <>
            <button
              className="gallery-nav prev"
              onClick={(e) => {
                e.stopPropagation();
                prevImage();
              }}
              aria-label="Previous image"
            >
              <ChevronLeft />
            </button>
            <button
              className="gallery-nav next"
              onClick={(e) => {
                e.stopPropagation();
                nextImage();
              }}
              aria-label="Next image"
            >
              <ChevronRight />
            </button>
            <div className="gallery-counter">
              {currentIndex + 1} / {displayImages.length}
            </div>
          </>
        )}
      </div>

      {displayImages.length > 1 && (
        <div className="image-gallery-thumbnails">
          {displayImages.map((img, idx) => (
            <div
              key={idx}
              className={`thumbnail ${idx === currentIndex ? 'active' : ''}`}
              onClick={() => setCurrentIndex(idx)}
            >
              <img
                src={img.url}
                alt={img.caption || `Thumbnail ${idx + 1}`}
                referrerPolicy="no-referrer"
                onError={(e) => {
                  e.currentTarget.onerror = null;
                  e.currentTarget.src = 'https://placehold.co/200x150?text=Luxora';
                }}
              />
            </div>
          ))}
        </div>
      )}

      {lightboxOpen && (
        <div className="lightbox" onClick={() => setLightboxOpen(false)}>
          <button className="lightbox-close" onClick={() => setLightboxOpen(false)}>
            <X />
          </button>
          <img
            src={displayImages[currentIndex].url}
            alt={displayImages[currentIndex].caption || 'Property image'}
            onClick={(e) => e.stopPropagation()}
          />
          {displayImages.length > 1 && (
            <>
              <button
                className="lightbox-nav prev"
                onClick={(e) => {
                  e.stopPropagation();
                  prevImage();
                }}
              >
                <ChevronLeft size={40} />
              </button>
              <button
                className="lightbox-nav next"
                onClick={(e) => {
                  e.stopPropagation();
                  nextImage();
                }}
              >
                <ChevronRight size={40} />
              </button>
            </>
          )}
        </div>
      )}
    </div>
  );
}
