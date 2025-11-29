import { useAuth } from '../context/AuthContext';

export default function ProtectedRoute({ children, onUnauthenticated }) {
  const { isAuthenticated, loading } = useAuth();

  if (loading) {
    return (
      <div className="loading-container">
        <div className="spinner"></div>
        <p>Loading...</p>
      </div>
    );
  }

  if (!isAuthenticated) {
    if (onUnauthenticated) {
      onUnauthenticated();
    }
    return (
      <div className="auth-required">
        <h2>Authentication Required</h2>
        <p>Please log in to access this page.</p>
      </div>
    );
  }

  return children;
}
