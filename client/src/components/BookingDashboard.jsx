import { useState, useEffect } from 'react';
import { Calendar, MapPin, Users, DollarSign, Clock, X } from 'lucide-react';

export default function BookingDashboard({ token, onClose }) {
  const [activeTab, setActiveTab] = useState('trips'); // 'trips' or 'hosting'
  const [bookings, setBookings] = useState([]);
  const [hostBookings, setHostBookings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    loadBookings();
  }, [token]);

  const loadBookings = async () => {
    if (!token) return;
    
    setLoading(true);
    setError(null);

    try {
      // Load user's bookings (as guest)
      const tripsRes = await fetch('/api/bookings/my-bookings', {
        headers: { Authorization: `Bearer ${token}` }
      });
      
      if (tripsRes.ok) {
        const trips = await tripsRes.json();
        setBookings(trips);
      }

      // Load host's bookings
      const hostRes = await fetch('/api/bookings/hosting', {
        headers: { Authorization: `Bearer ${token}` }
      });
      
      if (hostRes.ok) {
        const hosting = await hostRes.json();
        setHostBookings(hosting);
      }
    } catch (err) {
      setError('Failed to load bookings');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleCancel = async (bookingId) => {
    if (!confirm('Are you sure you want to cancel this booking?')) return;

    try {
      const res = await fetch(`/api/bookings/${bookingId}/cancel`, {
        method: 'PATCH',
        headers: { Authorization: `Bearer ${token}` }
      });

      if (res.ok) {
        // Reload bookings
        await loadBookings();
      } else {
        const data = await res.json();
        alert(data.error || 'Failed to cancel booking');
      }
    } catch (err) {
      console.error(err);
      alert('Failed to cancel booking');
    }
  };

  const displayBookings = activeTab === 'trips' ? bookings : hostBookings;
  const now = new Date();
  
  const upcoming = displayBookings.filter(b => 
    new Date(b.startDate) > now && b.status !== 'CANCELLED'
  );
  const past = displayBookings.filter(b => 
    new Date(b.endDate) <= now || b.status === 'CANCELLED'
  );

  return (
    <div className="booking-dashboard-overlay" onClick={onClose}>
      <div className="booking-dashboard" onClick={e => e.stopPropagation()}>
        <div className="dashboard-header">
          <h1>My Bookings</h1>
          <button className="close-btn" onClick={onClose}>×</button>
        </div>

        <div className="dashboard-tabs">
          <button
            className={`tab ${activeTab === 'trips' ? 'active' : ''}`}
            onClick={() => setActiveTab('trips')}
          >
            My Trips ({bookings.length})
          </button>
          <button
            className={`tab ${activeTab === 'hosting' ? 'active' : ''}`}
            onClick={() => setActiveTab('hosting')}
          >
            Hosting ({hostBookings.length})
          </button>
        </div>

        <div className="dashboard-content">
          {loading ? (
            <div className="loading-state">
              <div className="spinner-large"></div>
              <p>Loading bookings...</p>
            </div>
          ) : error ? (
            <div className="error-state">
              <p>{error}</p>
              <button onClick={loadBookings}>Try Again</button>
            </div>
          ) : (
            <>
              {upcoming.length > 0 && (
                <div className="bookings-section">
                  <h2>Upcoming ({upcoming.length})</h2>
                  <div className="bookings-grid">
                    {upcoming.map(booking => (
                      <BookingCard
                        key={booking.id}
                        booking={booking}
                        isHost={activeTab === 'hosting'}
                        onCancel={handleCancel}
                      />
                    ))}
                  </div>
                </div>
              )}

              {past.length > 0 && (
                <div className="bookings-section">
                  <h2>Past ({past.length})</h2>
                  <div className="bookings-grid">
                    {past.map(booking => (
                      <BookingCard
                        key={booking.id}
                        booking={booking}
                        isHost={activeTab === 'hosting'}
                        isPast
                        onCancel={handleCancel}
                      />
                    ))}
                  </div>
                </div>
              )}

              {displayBookings.length === 0 && (
                <div className="empty-state">
                  <Calendar size={64} strokeWidth={1} />
                  <h3>No bookings yet</h3>
                  <p>
                    {activeTab === 'trips' 
                      ? "You haven't made any bookings yet. Start exploring amazing places!"
                      : "You haven't received any bookings yet. Make sure your listings are live!"}
                  </p>
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
}

function BookingCard({ booking, isHost, isPast, onCancel }) {
  const image = booking.listing.images?.[0]?.url || booking.listing.image;
  const startDate = new Date(booking.startDate);
  const endDate = new Date(booking.endDate);
  const nights = Math.ceil((endDate - startDate) / (1000 * 60 * 60 * 24));
  
  const formatDate = (date) => {
    return date.toLocaleDateString('en-US', { 
      month: 'short', 
      day: 'numeric', 
      year: 'numeric' 
    });
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'CONFIRMED': return '#27ae60';
      case 'PENDING': return '#f39c12';
      case 'CANCELLED': return '#e74c3c';
      case 'COMPLETED': return '#3498db';
      default: return '#95a5a6';
    }
  };

  const canCancel = !isPast && booking.status !== 'CANCELLED' && booking.status !== 'COMPLETED';

  return (
    <div className="booking-card">
      <div className="booking-image">
        {image ? (
          <img src={image} alt={booking.listing.title} />
        ) : (
          <div className="no-image">
            <MapPin size={32} />
          </div>
        )}
        <span 
          className="booking-status" 
          style={{ background: getStatusColor(booking.status) }}
        >
          {booking.status}
        </span>
      </div>

      <div className="booking-details">
        <h3>{booking.listing.title}</h3>
        <p className="booking-location">
          <MapPin size={16} />
          {booking.listing.city}, {booking.listing.country || 'USA'}
        </p>

        {isHost && booking.user && (
          <p className="booking-guest">
            <Users size={16} />
            Guest: {booking.user.name}
          </p>
        )}

        <div className="booking-dates">
          <div className="date-item">
            <Calendar size={16} />
            <div>
              <span className="date-label">Check-in</span>
              <span className="date-value">{formatDate(startDate)}</span>
            </div>
          </div>
          <div className="date-divider">→</div>
          <div className="date-item">
            <Calendar size={16} />
            <div>
              <span className="date-label">Check-out</span>
              <span className="date-value">{formatDate(endDate)}</span>
            </div>
          </div>
        </div>

        <div className="booking-info">
          <div className="info-item">
            <Clock size={16} />
            <span>{nights} night{nights !== 1 ? 's' : ''}</span>
          </div>
          <div className="info-item">
            <Users size={16} />
            <span>{booking.guests} guest{booking.guests !== 1 ? 's' : ''}</span>
          </div>
          <div className="info-item">
            <DollarSign size={16} />
            <span className="price">${booking.totalPrice}</span>
          </div>
        </div>

        <div className="booking-actions">
          <span className="booking-id">Booking #{booking.id}</span>
          {canCancel && (
            <button 
              className="cancel-btn"
              onClick={() => onCancel(booking.id)}
            >
              <X size={16} />
              Cancel
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
