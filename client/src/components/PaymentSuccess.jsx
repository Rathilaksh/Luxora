import { useEffect, useState } from 'react';
import { CheckCircle, Loader, AlertCircle } from 'lucide-react';

export default function PaymentSuccess({ sessionId, onClose }) {
  const [booking, setBooking] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    verifyPayment();
  }, [sessionId]);

  const verifyPayment = async () => {
    try {
      console.log('Verifying payment for session:', sessionId);
      const token = localStorage.getItem('token');
      const response = await fetch(`/api/payments/verify/${sessionId}`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      console.log('Verify response status:', response.status);
      const data = await response.json();
      console.log('Verify response data:', data);

      if (!response.ok) {
        throw new Error(data.error || 'Failed to verify payment');
      }

      setBooking(data.booking);
      
      // Show mock message if applicable
      if (data.mock && data.message) {
        // Don't set as error, just show in the success view
        setBooking({ ...data.booking, mockMessage: data.message });
      }
    } catch (err) {
      console.error('Verification error:', err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="payment-status-overlay">
        <div className="payment-status-modal">
          <Loader className="spinner" size={48} />
          <h2>Verifying Payment...</h2>
          <p>Please wait while we confirm your booking</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="payment-status-overlay" onClick={onClose}>
        <div className="payment-status-modal error" onClick={(e) => e.stopPropagation()}>
          <AlertCircle size={64} color="#e74c3c" />
          <h2>Payment Verification Failed</h2>
          <p>{error}</p>
          <button className="status-btn" onClick={onClose}>Close</button>
        </div>
      </div>
    );
  }

  return (
    <div className="payment-status-overlay" onClick={onClose}>
      <div className="payment-status-modal success" onClick={(e) => e.stopPropagation()}>
        <CheckCircle size={64} color="#27ae60" />
        <h2>Booking Confirmed!</h2>
        
        {booking?.mockMessage && (
          <div className="booking-details" style={{ background: '#fff3cd', border: '1px solid #ffc107', borderRadius: '8px', padding: '12px', marginBottom: '16px' }}>
            <p style={{ margin: 0, color: '#856404', fontSize: '0.9rem' }}>
              ℹ️ {booking.mockMessage}
            </p>
          </div>
        )}
        
        {booking && (
          <div className="booking-details">
            <h3>{booking.listing.title}</h3>
            <div className="detail-row">
              <span>Check-in:</span>
              <strong>{new Date(booking.checkIn).toLocaleDateString()}</strong>
            </div>
            <div className="detail-row">
              <span>Check-out:</span>
              <strong>{new Date(booking.checkOut).toLocaleDateString()}</strong>
            </div>
            <div className="detail-row">
              <span>Guests:</span>
              <strong>{booking.guests}</strong>
            </div>
            <div className="detail-row">
              <span>Total Paid:</span>
              <strong>${booking.totalPrice}</strong>
            </div>
            {booking.id > 0 && (
              <div className="detail-row">
                <span>Booking ID:</span>
                <strong>#{booking.id}</strong>
              </div>
            )}
          </div>
        )}

        <p className="success-message">
          {booking?.mockMessage 
            ? 'This is a test booking confirmation.'
            : 'A confirmation email has been sent to your email address.'}
        </p>

        <button className="status-btn" onClick={onClose}>
          Continue Browsing
        </button>
      </div>
    </div>
  );
}
