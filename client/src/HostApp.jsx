import React, { useState, useEffect } from 'react';
import HostLogin from './components/HostLogin';
import HostRegister from './components/HostRegister';
import HostPortal from './components/HostPortal';

export default function HostApp() {
  const [hostUser, setHostUser] = useState(null);
  const [showRegister, setShowRegister] = useState(false);

  useEffect(() => {
    const storedUser = localStorage.getItem('user');
    const storedToken = localStorage.getItem('token');
    
    if (storedUser && storedToken) {
      const user = JSON.parse(storedUser);
      // Only allow HOST or BOTH roles
      if (user.role === 'HOST' || user.role === 'BOTH') {
        setHostUser(user);
      }
    }
  }, []);

  const handleLogin = (user) => {
    setHostUser(user);
  };

  const handleRegister = (user) => {
    setHostUser(user);
  };

  const handleLogout = () => {
    setHostUser(null);
  };

  const handleBackToMain = () => {
    window.location.href = '/';
  };

  if (hostUser) {
    return <HostPortal user={hostUser} onLogout={handleLogout} />;
  }

  if (showRegister) {
    return (
      <HostRegister
        onRegister={handleRegister}
        onSwitchToLogin={() => setShowRegister(false)}
        onBackToMain={handleBackToMain}
      />
    );
  }

  return (
    <HostLogin
      onLogin={handleLogin}
      onSwitchToRegister={() => setShowRegister(true)}
      onBackToMain={handleBackToMain}
    />
  );
}
