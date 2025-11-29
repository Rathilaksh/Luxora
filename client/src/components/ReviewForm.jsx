import { useState } from 'react';
import { Star, Upload, X, AlertCircle } from 'lucide-react';

export default function ReviewForm({ booking, onClose, onSuccess }) {
  const [ratings, setRatings] = useState({
    overall: 0,
    cleanliness: 0,
    accuracy: 0,
    checkIn: 0,
    communication: 0,
    location: 0,
    value: 0
  });
  const [comment, setComment] = useState('');
  const [photos, setPhotos] = useState([]);
  const [photoPreviews, setPhotoPreviews] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleRating = (category, value) => {
    setRatings(prev => ({ ...prev, [category]: value }));
  };

  const handlePhotoUpload = (e) => {
    const files = Array.from(e.target.files);
    if (files.length + photos.length > 5) {
      setError('Maximum 5 photos allowed');
      return;
    }

    setPhotos(prev => [...prev, ...files]);
    
    // Create previews
    files.forEach(file => {
      const reader = new FileReader();
      reader.onloadend = () => {
        setPhotoPreviews(prev => [...prev, reader.result]);
      };
      reader.readAsDataURL(file);
    });
  };

  const removePhoto = (index) => {
    setPhotos(prev => prev.filter((_, i) => i !== index));
    setPhotoPreviews(prev => prev.filter((_, i) => i !== index));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    if (ratings.overall === 0) {
      setError('Please provide an overall rating');
      return;
    }

    setLoading(true);

    try {
      const token = localStorage.getItem('token');
      const formData = new FormData();
      
      formData.append('bookingId', booking.id);
      formData.append('overallRating', ratings.overall);
      if (ratings.cleanliness) formData.append('cleanlinessRating', ratings.cleanliness);
      if (ratings.accuracy) formData.append('accuracyRating', ratings.accuracy);
      if (ratings.checkIn) formData.append('checkInRating', ratings.checkIn);
      if (ratings.communication) formData.append('communicationRating', ratings.communication);
      if (ratings.location) formData.append('locationRating', ratings.location);
      if (ratings.value) formData.append('valueRating', ratings.value);
      if (comment.trim()) formData.append('comment', comment.trim());
      
      photos.forEach(photo => {
        formData.append('photos', photo);
      });

      const response = await fetch('/api/reviews', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`
        },
        body: formData
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to submit review');
      }

      onSuccess && onSuccess(data);
      onClose();
    } catch (err) {
      console.error('Review submission error:', err);
      setError(err.message || 'Failed to submit review');
      setLoading(false);
    }
  };

  const RatingInput = ({ label, category, value }) => (
    <div className="rating-input">
      <label>{label}</label>
      <div className="stars">
        {[1, 2, 3, 4, 5].map(star => (
          <button
            key={star}
            type="button"
            className={`star-btn ${value >= star ? 'filled' : ''}`}
            onClick={() => handleRating(category, star)}
          >
            <Star size={24} fill={value >= star ? '#ff385c' : 'none'} />
          </button>
        ))}
      </div>
    </div>
  );

  return (
    <div className="review-form-overlay" onClick={onClose}>
      <div className="review-form-modal" onClick={(e) => e.stopPropagation()}>
        <div className="review-form-header">
          <h2>Review Your Stay</h2>
          <button className="close-btn" onClick={onClose}>×</button>
        </div>

        <div className="review-listing-info">
          <img src={booking.listing.image || booking.listing.images?.[0]?.url} alt={booking.listing.title} />
          <div>
            <h3>{booking.listing.title}</h3>
            <p>{booking.listing.city}, {booking.listing.country}</p>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="review-form">
          {error && (
            <div className="review-error">
              <AlertCircle size={20} />
              <span>{error}</span>
            </div>
          )}

          <div className="rating-section">
            <h3>Overall Rating *</h3>
            <RatingInput label="" category="overall" value={ratings.overall} />
          </div>

          <div className="rating-section">
            <h3>Rate Your Experience</h3>
            <RatingInput label="Cleanliness" category="cleanliness" value={ratings.cleanliness} />
            <RatingInput label="Accuracy" category="accuracy" value={ratings.accuracy} />
            <RatingInput label="Check-in" category="checkIn" value={ratings.checkIn} />
            <RatingInput label="Communication" category="communication" value={ratings.communication} />
            <RatingInput label="Location" category="location" value={ratings.location} />
            <RatingInput label="Value" category="value" value={ratings.value} />
          </div>

          <div className="comment-section">
            <label>Your Review</label>
            <textarea
              value={comment}
              onChange={(e) => setComment(e.target.value)}
              placeholder="Share details of your experience (optional)"
              rows="5"
            />
          </div>

          <div className="photo-section">
            <label>Add Photos (Optional, max 5)</label>
            <div className="photo-upload">
              <input
                type="file"
                id="photo-upload"
                accept="image/*"
                multiple
                onChange={handlePhotoUpload}
                disabled={photos.length >= 5}
                style={{ display: 'none' }}
              />
              <label htmlFor="photo-upload" className="upload-btn">
                <Upload size={20} />
                Upload Photos
              </label>
            </div>
            
            {photoPreviews.length > 0 && (
              <div className="photo-previews">
                {photoPreviews.map((preview, index) => (
                  <div key={index} className="photo-preview">
                    <img src={preview} alt={`Preview ${index + 1}`} />
                    <button
                      type="button"
                      className="remove-photo"
                      onClick={() => removePhoto(index)}
                    >
                      <X size={16} />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>

          <button
            type="submit"
            className="review-submit-btn"
            disabled={loading || ratings.overall === 0}
          >
            {loading ? 'Submitting...' : 'Submit Review'}
          </button>
        </form>
      </div>
    </div>
  );
}
