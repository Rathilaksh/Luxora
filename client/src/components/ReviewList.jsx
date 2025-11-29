import { useState } from 'react';
import { Star, MessageCircle, CheckCircle, Calendar } from 'lucide-react';
import { format } from 'date-fns';

export default function ReviewList({ listingId, isHost = false }) {
  const [reviews, setReviews] = useState([]);
  const [loading, setLoading] = useState(true);
  const [responding, setResponding] = useState(null);
  const [response, setResponse] = useState('');
  const [error, setError] = useState('');

  useState(() => {
    loadReviews();
  }, [listingId]);

  const loadReviews = async () => {
    try {
      const res = await fetch(`/api/listings/${listingId}/reviews`);
      const data = await res.json();
      setReviews(data);
      setLoading(false);
    } catch (err) {
      console.error('Failed to load reviews:', err);
      setLoading(false);
    }
  };

  const handleRespond = async (reviewId) => {
    if (!response.trim()) {
      setError('Response cannot be empty');
      return;
    }

    try {
      const token = localStorage.getItem('token');
      const res = await fetch(`/api/reviews/${reviewId}/respond`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ hostResponse: response })
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || 'Failed to submit response');
      }

      // Update review in list
      setReviews(prev => prev.map(r => r.id === reviewId ? data : r));
      setResponding(null);
      setResponse('');
      setError('');
    } catch (err) {
      setError(err.message);
    }
  };

  const StarRating = ({ rating }) => (
    <div className="star-rating">
      {[1, 2, 3, 4, 5].map(star => (
        <Star
          key={star}
          size={16}
          fill={star <= rating ? '#ff385c' : 'none'}
          stroke={star <= rating ? '#ff385c' : '#ddd'}
        />
      ))}
    </div>
  );

  const RatingBreakdown = ({ review }) => {
    const categories = [
      { label: 'Cleanliness', value: review.cleanlinessRating },
      { label: 'Accuracy', value: review.accuracyRating },
      { label: 'Check-in', value: review.checkInRating },
      { label: 'Communication', value: review.communicationRating },
      { label: 'Location', value: review.locationRating },
      { label: 'Value', value: review.valueRating }
    ].filter(cat => cat.value);

    if (categories.length === 0) return null;

    return (
      <div className="rating-breakdown">
        {categories.map(cat => (
          <div key={cat.label} className="rating-category">
            <span>{cat.label}</span>
            <div className="rating-bar">
              <div className="rating-fill" style={{ width: `${(cat.value / 5) * 100}%` }} />
            </div>
            <span className="rating-value">{cat.value.toFixed(1)}</span>
          </div>
        ))}
      </div>
    );
  };

  if (loading) {
    return (
      <div className="reviews-loading">
        <div className="spinner"></div>
        <p>Loading reviews...</p>
      </div>
    );
  }

  if (reviews.length === 0) {
    return (
      <div className="no-reviews">
        <MessageCircle size={48} />
        <h3>No reviews yet</h3>
        <p>Be the first to leave a review for this property!</p>
      </div>
    );
  }

  return (
    <div className="reviews-list">
      <h2>
        {reviews.length} {reviews.length === 1 ? 'Review' : 'Reviews'}
      </h2>

      {reviews.map(review => (
        <div key={review.id} className="review-card">
          <div className="review-header">
            <div className="reviewer-info">
              <img
                src={review.user.avatar || '/default-avatar.png'}
                alt={review.user.name}
                className="reviewer-avatar"
              />
              <div>
                <h4>{review.user.name}</h4>
                <p className="review-date">
                  {format(new Date(review.createdAt), 'MMMM yyyy')}
                </p>
              </div>
            </div>
            <div className="review-overall">
              <StarRating rating={review.overallRating} />
              <span className="rating-number">{review.overallRating.toFixed(1)}</span>
              {review.isVerifiedStay && (
                <span className="verified-badge">
                  <CheckCircle size={16} />
                  Verified Stay
                </span>
              )}
            </div>
          </div>

          {review.booking && (
            <p className="stay-dates">
              <Calendar size={14} />
              Stayed {format(new Date(review.booking.checkIn), 'MMM yyyy')}
            </p>
          )}

          <RatingBreakdown review={review} />

          {review.comment && (
            <p className="review-comment">{review.comment}</p>
          )}

          {review.photos && review.photos.length > 0 && (
            <div className="review-photos">
              {review.photos.map(photo => (
                <img key={photo.id} src={photo.url} alt="Review photo" />
              ))}
            </div>
          )}

          {review.hostResponse && (
            <div className="host-response">
              <h5>Response from host</h5>
              <p>{review.hostResponse}</p>
              <span className="response-date">
                {format(new Date(review.hostRespondedAt), 'MMMM d, yyyy')}
              </span>
            </div>
          )}

          {isHost && !review.hostResponse && (
            <div className="respond-section">
              {responding === review.id ? (
                <div className="response-form">
                  <textarea
                    value={response}
                    onChange={(e) => setResponse(e.target.value)}
                    placeholder="Write your response..."
                    rows="3"
                  />
                  {error && <p className="error-text">{error}</p>}
                  <div className="response-actions">
                    <button
                      className="btn-secondary"
                      onClick={() => {
                        setResponding(null);
                        setResponse('');
                        setError('');
                      }}
                    >
                      Cancel
                    </button>
                    <button
                      className="btn-primary"
                      onClick={() => handleRespond(review.id)}
                    >
                      Submit Response
                    </button>
                  </div>
                </div>
              ) : (
                <button
                  className="respond-btn"
                  onClick={() => setResponding(review.id)}
                >
                  <MessageCircle size={16} />
                  Respond to review
                </button>
              )}
            </div>
          )}
        </div>
      ))}
    </div>
  );
}
