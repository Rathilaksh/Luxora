import { useState, useEffect } from 'react';
import { Home, LogOut, Calendar, DollarSign, Building2, Settings } from 'lucide-react';
import HostDashboard from './HostDashboard';
import HostCalendar from './HostCalendar';

export default function HostPortal({ user, onLogout }) {
  const [activeView, setActiveView] = useState('dashboard');
  const [token, setToken] = useState('');

  useEffect(() => {
    const storedToken = localStorage.getItem('token');
    if (storedToken) {
      setToken(storedToken);
    }
  }, []);

  const handleLogout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    onLogout();
  };

  return (
    <div className="host-portal">
      {/* Header */}
      <header className="host-portal-header">
        <div className="host-header-content">
          <div className="host-logo">
            <Home size={32} />
            <h1>Luxora Host</h1>
          </div>

          <div className="host-user-info">
            <div className="host-user-details">
              <span className="host-name">{user.name}</span>
              <span className="host-role">Host Account</span>
            </div>
            <button onClick={handleLogout} className="btn-logout">
              <LogOut size={18} />
              Logout
            </button>
          </div>
        </div>

        <nav className="host-nav">
          <button
            className={`host-nav-btn ${activeView === 'dashboard' ? 'active' : ''}`}
            onClick={() => setActiveView('dashboard')}
          >
            <DollarSign size={20} />
            Dashboard
          </button>
          <button
            className={`host-nav-btn ${activeView === 'calendar' ? 'active' : ''}`}
            onClick={() => setActiveView('calendar')}
          >
            <Calendar size={20} />
            Calendar
          </button>
          <button
            className={`host-nav-btn ${activeView === 'listings' ? 'active' : ''}`}
            onClick={() => setActiveView('listings')}
          >
            <Building2 size={20} />
            Listings
          </button>
        </nav>
      </header>

      {/* Main Content */}
      <main className="host-portal-main">
        {activeView === 'dashboard' && (
          <div className="host-view">
            <HostDashboard token={token} onClose={() => {}} isPortal={true} />
          </div>
        )}

        {activeView === 'calendar' && (
          <div className="host-view">
            <div className="host-view-header">
              <h2>Booking Calendar</h2>
              <p>View and manage all your bookings across properties</p>
            </div>
            <div className="host-calendar-wrapper">
              <HostCalendar token={token} onClose={() => {}} isPortal={true} />
            </div>
          </div>
        )}

        {activeView === 'listings' && (
          <div className="host-view">
            <div className="host-view-header">
              <h2>Your Listings</h2>
              <p>Manage your properties and create new listings</p>
            </div>
            <div className="coming-soon">
              <Building2 size={64} style={{ opacity: 0.3 }} />
              <h3>Listings Management</h3>
              <p>Create, edit, and manage your property listings</p>
              <p style={{ color: 'var(--muted)', marginTop: '0.5rem' }}>
                Coming soon...
              </p>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
