import { useState, useEffect } from 'react';
import { DollarSign, Calendar, Home, TrendingUp, Users, Star, X } from 'lucide-react';
import HostCalendar from './HostCalendar';

export default function HostDashboard({ token, onClose }) {
  const [stats, setStats] = useState(null);
  const [bookings, setBookings] = useState([]);
  const [listings, setListings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('overview'); // overview, bookings, listings
  const [showCalendar, setShowCalendar] = useState(false);

  useEffect(() => {
    loadDashboardData();
  }, []);

  const loadDashboardData = async () => {
    try {
      setLoading(true);
      
      // Fetch host analytics
      const statsRes = await fetch('/api/host/analytics', {
        headers: { Authorization: `Bearer ${token}` }
      });
      const statsData = await statsRes.json();
      setStats(statsData);

      // Fetch host bookings
      const bookingsRes = await fetch('/api/bookings/hosting', {
        headers: { Authorization: `Bearer ${token}` }
      });
      const bookingsData = await bookingsRes.json();
      setBookings(bookingsData);

      // Fetch host listings
      const listingsRes = await fetch('/api/listings');
      const allListings = await listingsRes.json();
      
      // Filter to only show user's listings (we'll get userId from stats)
      if (statsData.userId) {
        const myListings = allListings.filter(l => l.hostId === statsData.userId);
        setListings(myListings);
      }

      setLoading(false);
    } catch (err) {
      console.error('Failed to load dashboard:', err);
      setLoading(false);
    }
  };

  const formatCurrency = (amount) => {
    return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(amount);
  };

  const formatDate = (date) => {
    return new Date(date).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
  };

  const handleBookingAction = async (bookingId, status) => {
    try {
      const response = await fetch(`/api/bookings/${bookingId}/status`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({ status })
      });

      if (response.ok) {
        // Reload bookings to show updated status
        const bookingsRes = await fetch('/api/bookings/hosting', {
          headers: { Authorization: `Bearer ${token}` }
        });
        const bookingsData = await bookingsRes.json();
        setBookings(bookingsData);
      } else {
        const error = await response.json();
        alert(error.error || 'Failed to update booking');
      }
    } catch (err) {
      console.error('Failed to update booking:', err);
      alert('Failed to update booking');
    }
  };

  if (loading) {
    return (
      <div className="modal" onClick={onClose}>
        <div className="modal-content" onClick={e => e.stopPropagation()} style={{ maxWidth: '1200px' }}>
          <button className="close" onClick={onClose}>✕</button>
          <div style={{ padding: '3rem', textAlign: 'center' }}>
            <div className="spinner" style={{ margin: '0 auto' }}></div>
            <p style={{ marginTop: '1rem', color: 'var(--muted)' }}>Loading dashboard...</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="modal" onClick={onClose}>
      <div className="modal-content host-dashboard" onClick={e => e.stopPropagation()}>
        <button className="close" onClick={onClose}>✕</button>
        
        <div className="dashboard-header">
          <h1>Host Dashboard</h1>
          <div className="dashboard-tabs">
            <button 
              className={`tab-btn ${activeTab === 'overview' ? 'active' : ''}`}
              onClick={() => setActiveTab('overview')}
            >
              Overview
            </button>
            <button 
              className={`tab-btn ${activeTab === 'bookings' ? 'active' : ''}`}
              onClick={() => setActiveTab('bookings')}
            >
              Bookings ({bookings.length})
            </button>
            <button 
              className={`tab-btn ${activeTab === 'listings' ? 'active' : ''}`}
              onClick={() => setActiveTab('listings')}
            >
              Listings ({listings.length})
            </button>
          </div>
        </div>

        <div className="dashboard-body">
          {activeTab === 'overview' && stats && (
            <div className="overview-tab">
              <div className="stats-grid">
                <div className="stat-card">
                  <div className="stat-icon revenue">
                    <DollarSign size={24} />
                  </div>
                  <div className="stat-content">
                    <p className="stat-label">Total Revenue</p>
                    <h2 className="stat-value">{formatCurrency(stats.totalRevenue || 0)}</h2>
                    <p className="stat-change positive">+{stats.revenueGrowth || 0}% this month</p>
                  </div>
                </div>

                <div className="stat-card">
                  <div className="stat-icon bookings">
                    <Calendar size={24} />
                  </div>
                  <div className="stat-content">
                    <p className="stat-label">Total Bookings</p>
                    <h2 className="stat-value">{stats.totalBookings || 0}</h2>
                    <p className="stat-change">{stats.upcomingBookings || 0} upcoming</p>
                  </div>
                </div>

                <div className="stat-card">
                  <div className="stat-icon properties">
                    <Home size={24} />
                  </div>
                  <div className="stat-content">
                    <p className="stat-label">Active Listings</p>
                    <h2 className="stat-value">{listings.length}</h2>
                    <p className="stat-change">{stats.occupancyRate || 0}% occupancy</p>
                  </div>
                </div>

                <div className="stat-card">
                  <div className="stat-icon rating">
                    <Star size={24} />
                  </div>
                  <div className="stat-content">
                    <p className="stat-label">Average Rating</p>
                    <h2 className="stat-value">{stats.averageRating ? stats.averageRating.toFixed(1) : 'N/A'}</h2>
                    <p className="stat-change">{stats.totalReviews || 0} reviews</p>
                  </div>
                </div>
              </div>

              <div className="dashboard-section">
                <h3>Recent Bookings</h3>
                <div className="booking-list">
                  {bookings.slice(0, 5).map(booking => (
                    <div key={booking.id} className="booking-item">
                      <div className="booking-info">
                        <h4>{booking.listing?.title || 'Listing'}</h4>
                        <p className="booking-guest">
                          <Users size={16} />
                          {booking.user?.name || 'Guest'} • {booking.guests} guest{booking.guests !== 1 ? 's' : ''}
                        </p>
                        <p className="booking-dates">
                          {formatDate(booking.checkIn)} - {formatDate(booking.checkOut)}
                        </p>
                      </div>
                      <div className="booking-meta">
                        <span className={`booking-status ${booking.status.toLowerCase()}`}>
                          {booking.status}
                        </span>
                        <p className="booking-price">{formatCurrency(booking.totalPrice)}</p>
                      </div>
                    </div>
                  ))}
                  {bookings.length === 0 && (
                    <p style={{ textAlign: 'center', color: 'var(--muted)', padding: '2rem' }}>
                      No bookings yet
                    </p>
                  )}
                </div>
              </div>

              <div className="dashboard-section">
                <div className="section-header">
                  <h3>Revenue Overview</h3>
                  <button className="btn-secondary" onClick={() => setShowCalendar(true)}>
                    <Calendar size={16} />
                    View Calendar
                  </button>
                </div>
                <div className="revenue-chart">
                  {stats?.monthlyRevenue && stats.monthlyRevenue.length > 0 ? (
                    <div className="revenue-bars">
                      {stats.monthlyRevenue.map((month, idx) => {
                        const maxRevenue = Math.max(...stats.monthlyRevenue.map(m => m.revenue));
                        const heightPercent = maxRevenue > 0 ? (month.revenue / maxRevenue) * 100 : 0;
                        
                        return (
                          <div key={idx} className="revenue-bar-container">
                            <div className="revenue-bar-wrapper">
                              <div 
                                className="revenue-bar" 
                                style={{ height: `${heightPercent}%` }}
                                title={formatCurrency(month.revenue)}
                              >
                                <span className="revenue-value">
                                  {month.revenue > 0 ? formatCurrency(month.revenue) : ''}
                                </span>
                              </div>
                            </div>
                            <div className="revenue-month">{month.month}</div>
                          </div>
                        );
                      })}
                    </div>
                  ) : (
                    <div className="chart-placeholder">
                      <TrendingUp size={48} />
                      <p>No revenue data yet</p>
                      <small>Revenue will appear as you receive bookings</small>
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}

          {activeTab === 'bookings' && (
            <div className="bookings-tab">
              <div className="booking-list-full">
                {bookings.map(booking => (
                  <div key={booking.id} className="booking-card">
                    <div className="booking-card-header">
                      <div>
                        <h3>{booking.listing?.title || 'Listing'}</h3>
                        <p className="booking-guest">
                          <Users size={16} />
                          {booking.user?.name || 'Guest'} ({booking.user?.email})
                        </p>
                      </div>
                      <span className={`booking-status ${booking.status.toLowerCase()}`}>
                        {booking.status}
                      </span>
                    </div>
                    <div className="booking-card-body">
                      <div className="booking-detail">
                        <span className="detail-label">Check-in</span>
                        <span className="detail-value">{formatDate(booking.checkIn)}</span>
                      </div>
                      <div className="booking-detail">
                        <span className="detail-label">Check-out</span>
                        <span className="detail-value">{formatDate(booking.checkOut)}</span>
                      </div>
                      <div className="booking-detail">
                        <span className="detail-label">Guests</span>
                        <span className="detail-value">{booking.guests}</span>
                      </div>
                      <div className="booking-detail">
                        <span className="detail-label">Total</span>
                        <span className="detail-value">{formatCurrency(booking.totalPrice)}</span>
                      </div>
                    </div>
                    {booking.status === 'PENDING' && (
                      <div className="booking-actions">
                        <button 
                          className="btn-action btn-confirm"
                          onClick={() => handleBookingAction(booking.id, 'CONFIRMED')}
                        >
                          Accept
                        </button>
                        <button 
                          className="btn-action btn-reject"
                          onClick={() => handleBookingAction(booking.id, 'CANCELLED')}
                        >
                          Reject
                        </button>
                      </div>
                    )}
                  </div>
                ))}
                {bookings.length === 0 && (
                  <div style={{ textAlign: 'center', padding: '3rem' }}>
                    <Calendar size={64} style={{ color: 'var(--muted)', margin: '0 auto' }} />
                    <h3 style={{ marginTop: '1rem' }}>No bookings yet</h3>
                    <p style={{ color: 'var(--muted)' }}>Your bookings will appear here</p>
                  </div>
                )}
              </div>
            </div>
          )}

          {activeTab === 'listings' && (
            <div className="listings-tab">
              <div className="listings-grid">
                {listings.map(listing => (
                  <div key={listing.id} className="listing-card-dashboard">
                    <img 
                      src={listing.images?.[0]?.url || listing.image || 'https://placehold.co/400x300?text=No+Image'} 
                      alt={listing.title}
                      className="listing-thumbnail"
                    />
                    <div className="listing-card-content">
                      <h3>{listing.title}</h3>
                      <p className="listing-location">{listing.city}, {listing.country}</p>
                      <div className="listing-stats">
                        <span>{formatCurrency(listing.price)}/night</span>
                        <span>★ {listing.averageRating?.toFixed(1) || 'New'}</span>
                      </div>
                      <div className="listing-actions">
                        <button className="btn-secondary">Edit</button>
                        <button className="btn-secondary">Calendar</button>
                      </div>
                    </div>
                  </div>
                ))}
                {listings.length === 0 && (
                  <div style={{ textAlign: 'center', padding: '3rem', gridColumn: '1/-1' }}>
                    <Home size={64} style={{ color: 'var(--muted)', margin: '0 auto' }} />
                    <h3 style={{ marginTop: '1rem' }}>No listings yet</h3>
                    <p style={{ color: 'var(--muted)' }}>Create your first listing to get started</p>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      </div>
      
      {showCalendar && (
        <HostCalendar token={token} onClose={() => setShowCalendar(false)} />
      )}
    </div>
  );
}
