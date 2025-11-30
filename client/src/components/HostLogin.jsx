import { useState } from 'react';
import { Home, Lock, Mail } from 'lucide-react';

export default function HostLogin({ onLogin, onSwitchToRegister, onBackToMain }) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const response = await fetch('/api/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
      });

      const data = await response.json();

      if (response.ok) {
        // Check if user has HOST role
        if (data.user.role !== 'HOST' && data.user.role !== 'BOTH') {
          setError('This account is not registered as a host. Please use the guest login or create a host account.');
          setLoading(false);
          return;
        }
        
        localStorage.setItem('token', data.token);
        localStorage.setItem('user', JSON.stringify(data.user));
        onLogin(data.user);
      } else {
        setError(data.error || 'Login failed');
      }
    } catch (err) {
      setError('Network error. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="auth-container">
      <div className="auth-card">
        <div className="auth-header">
          <div className="auth-logo">
            <Home size={32} />
            <h1>Luxora Host</h1>
          </div>
          <p className="auth-subtitle">Welcome back, Host!</p>
        </div>

        <form onSubmit={handleSubmit} className="auth-form">
          {error && <div className="auth-error">{error}</div>}

          <div className="form-group">
            <label htmlFor="email">
              <Mail size={18} />
              Email
            </label>
            <input
              id="email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="host@example.com"
              required
            />
          </div>

          <div className="form-group">
            <label htmlFor="password">
              <Lock size={18} />
              Password
            </label>
            <input
              id="password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Enter your password"
              required
            />
          </div>

          <button type="submit" className="btn-primary" disabled={loading}>
            {loading ? 'Logging in...' : 'Login as Host'}
          </button>
        </form>

        <div className="auth-footer">
          <p>
            Don't have a host account?{' '}
            <button onClick={onSwitchToRegister} className="link-btn">
              Register as Host
            </button>
          </p>
          <p>
            <button onClick={onBackToMain} className="link-btn">
              ← Back to Guest Portal
            </button>
          </p>
        </div>

        <div className="auth-demo-credentials">
          <p><strong>Demo Host Account:</strong></p>
          <p>Email: host@luxora.dev</p>
          <p>Password: hostpass123</p>
        </div>
      </div>
    </div>
  );
}
