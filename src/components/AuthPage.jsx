import { useState } from 'react';
import { useAuth } from '../context/AuthContext';

export function AuthPage() {
  const [isLogin, setIsLogin] = useState(true);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [localError, setLocalError] = useState('');
  
  const { login, register, error, clearError } = useAuth();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLocalError('');
    clearError();
    
    if (!email || !password) {
      setLocalError('Please fill in all required fields');
      return;
    }

    if (!isLogin && password.length < 6) {
      setLocalError('Password must be at least 6 characters');
      return;
    }

    setIsSubmitting(true);
    try {
      if (isLogin) {
        await login(email, password);
      } else {
        await register(email, password, name);
      }
    } catch (err) {
      // Error is handled by context
    } finally {
      setIsSubmitting(false);
    }
  };

  const toggleMode = () => {
    setIsLogin(!isLogin);
    setLocalError('');
    clearError();
  };

  const displayError = localError || error;

  return (
    <div className="auth-page">
      <div className="auth-container">
        <div className="auth-header">
          <div className="auth-logo">
            <svg width="48" height="48" viewBox="0 0 48 48" fill="none">
              <circle cx="24" cy="24" r="20" stroke="url(#logo-gradient)" strokeWidth="3" fill="none" />
              <circle cx="24" cy="24" r="6" fill="url(#logo-gradient)" />
              <circle cx="12" cy="16" r="4" fill="#c9577a" />
              <circle cx="36" cy="16" r="4" fill="#3a9ba5" />
              <circle cx="24" cy="38" r="4" fill="#7c6bb8" />
              <line x1="24" y1="24" x2="12" y2="16" stroke="#94a3b8" strokeWidth="2" />
              <line x1="24" y1="24" x2="36" y2="16" stroke="#94a3b8" strokeWidth="2" />
              <line x1="24" y1="24" x2="24" y2="38" stroke="#94a3b8" strokeWidth="2" />
              <defs>
                <linearGradient id="logo-gradient" x1="0%" y1="0%" x2="100%" y2="100%">
                  <stop offset="0%" stopColor="#7c6bb8" />
                  <stop offset="100%" stopColor="#3a9ba5" />
                </linearGradient>
              </defs>
            </svg>
          </div>
          <h1>Social Network</h1>
          <p>Visualize and understand your connections</p>
        </div>

        <div className="auth-card">
          <div className="auth-tabs">
            <button 
              className={`auth-tab ${isLogin ? 'active' : ''}`}
              onClick={() => toggleMode()}
              type="button"
            >
              Sign In
            </button>
            <button 
              className={`auth-tab ${!isLogin ? 'active' : ''}`}
              onClick={() => toggleMode()}
              type="button"
            >
              Create Account
            </button>
          </div>

          <form onSubmit={handleSubmit} className="auth-form">
            {!isLogin && (
              <div className="form-group">
                <label htmlFor="name">Your Name</label>
                <input
                  type="text"
                  id="name"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="How should we call you?"
                  autoComplete="name"
                />
              </div>
            )}

            <div className="form-group">
              <label htmlFor="email">Email Address</label>
              <input
                type="email"
                id="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@example.com"
                required
                autoComplete="email"
              />
            </div>

            <div className="form-group">
              <label htmlFor="password">Password</label>
              <input
                type="password"
                id="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder={isLogin ? 'Enter your password' : 'At least 6 characters'}
                required
                autoComplete={isLogin ? 'current-password' : 'new-password'}
              />
            </div>

            {displayError && (
              <div className="auth-error">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <circle cx="12" cy="12" r="10" />
                  <line x1="12" y1="8" x2="12" y2="12" />
                  <line x1="12" y1="16" x2="12.01" y2="16" />
                </svg>
                {displayError}
              </div>
            )}

            <button 
              type="submit" 
              className="btn btn-primary btn-full"
              disabled={isSubmitting}
            >
              {isSubmitting ? (
                <span className="btn-loading">
                  <span className="spinner-small" />
                  {isLogin ? 'Signing in...' : 'Creating account...'}
                </span>
              ) : (
                isLogin ? 'Sign In' : 'Create Account'
              )}
            </button>
          </form>

          <div className="auth-footer">
            <p>
              {isLogin ? "Don't have an account? " : "Already have an account? "}
              <button type="button" className="link-btn" onClick={toggleMode}>
                {isLogin ? 'Create one' : 'Sign in'}
              </button>
            </p>
          </div>
        </div>

        <div className="auth-features">
          <div className="feature">
            <span className="feature-icon">🕸️</span>
            <span>Visualize your social network</span>
          </div>
          <div className="feature">
            <span className="feature-icon">🔗</span>
            <span>Track relationship strengths</span>
          </div>
          <div className="feature">
            <span className="feature-icon">🌉</span>
            <span>Identify bridge connectors</span>
          </div>
        </div>
      </div>
    </div>
  );
}
