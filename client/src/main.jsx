import React from 'react';
import { createRoot } from 'react-dom/client';
import App from './App.jsx';
import HostApp from './HostApp.jsx';
import { AuthProvider } from './context/AuthContext.jsx';

// Simple routing: if path starts with /host, render HostApp, otherwise App
const isHostPortal = window.location.pathname.startsWith('/host');

createRoot(document.getElementById('root')).render(
  <AuthProvider>
    {isHostPortal ? <HostApp /> : <App />}
  </AuthProvider>
);
