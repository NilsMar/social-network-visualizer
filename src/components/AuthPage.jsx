import { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';

export function AuthPage() {
  // View modes: 'login', 'register', 'forgot', 'reset'
  const [view, setView] = useState('login');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [name, setName] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [localError, setLocalError] = useState('');
  const [successMessage, setSuccessMessage] = useState('');
  const [resetToken, setResetToken] = useState('');
  
  const { login, register, forgotPassword, resetPassword, error, clearError } = useAuth();

  // Check for reset token in URL on mount
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const token = params.get('reset');
    if (token) {
      setResetToken(token);
      setView('reset');
      // Clean up URL
      window.history.replaceState({}, document.title, window.location.pathname);
    }
  }, []);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLocalError('');
    setSuccessMessage('');
    clearError();

    if (view === 'forgot') {
      if (!email) {
        setLocalError('Please enter your email address');
        return;
      }
      setIsSubmitting(true);
      try {
        await forgotPassword(email);
        setSuccessMessage('If an account with that email exists, a password reset link has been sent. Check your email or console (in development).');
        setEmail('');
      } catch (err) {
        // Error is handled by context
      } finally {
        setIsSubmitting(false);
      }
      return;
    }

    if (view === 'reset') {
      if (!password) {
        setLocalError('Please enter a new password');
        return;
      }
      if (password.length < 6) {
        setLocalError('Password must be at least 6 characters');
        return;
      }
      if (password !== confirmPassword) {
        setLocalError('Passwords do not match');
        return;
      }
      setIsSubmitting(true);
      try {
        await resetPassword(resetToken, password);
        setSuccessMessage('Password has been reset successfully! You can now sign in.');
        setPassword('');
        setConfirmPassword('');
        setTimeout(() => {
          setView('login');
          setSuccessMessage('');
        }, 2000);
      } catch (err) {
        // Error is handled by context
      } finally {
        setIsSubmitting(false);
      }
      return;
    }
    
    if (!email || !password) {
      setLocalError('Please fill in all required fields');
      return;
    }

    if (view === 'register' && password.length < 6) {
      setLocalError('Password must be at least 6 characters');
      return;
    }

    setIsSubmitting(true);
    try {
      if (view === 'login') {
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

  const switchView = (newView) => {
    setView(newView);
    setLocalError('');
    setSuccessMessage('');
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
          {(view === 'login' || view === 'register') && (
            <div className="auth-tabs">
              <button 
                className={`auth-tab ${view === 'login' ? 'active' : ''}`}
                onClick={() => switchView('login')}
                type="button"
              >
                Sign In
              </button>
              <button 
                className={`auth-tab ${view === 'register' ? 'active' : ''}`}
                onClick={() => switchView('register')}
                type="button"
              >
                Create Account
              </button>
            </div>
          )}

          {view === 'forgot' && (
            <div className="auth-header-inline">
              <h2>Reset Password</h2>
              <p>Enter your email and we'll send you a reset link</p>
            </div>
          )}

          {view === 'reset' && (
            <div className="auth-header-inline">
              <h2>Set New Password</h2>
              <p>Enter your new password below</p>
            </div>
          )}

          <form onSubmit={handleSubmit} className="auth-form">
            {view === 'register' && (
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

            {(view === 'login' || view === 'register' || view === 'forgot') && (
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
            )}

            {(view === 'login' || view === 'register' || view === 'reset') && (
              <div className="form-group">
                <label htmlFor="password">{view === 'reset' ? 'New Password' : 'Password'}</label>
                <input
                  type="password"
                  id="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder={view === 'login' ? 'Enter your password' : 'At least 6 characters'}
                  required
                  autoComplete={view === 'login' ? 'current-password' : 'new-password'}
                />
              </div>
            )}

            {view === 'reset' && (
              <div className="form-group">
                <label htmlFor="confirmPassword">Confirm Password</label>
                <input
                  type="password"
                  id="confirmPassword"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  placeholder="Re-enter your new password"
                  required
                  autoComplete="new-password"
                />
              </div>
            )}

            {view === 'login' && (
              <div className="form-group-inline">
                <button 
                  type="button" 
                  className="link-btn forgot-link"
                  onClick={() => switchView('forgot')}
                >
                  Forgot password?
                </button>
              </div>
            )}

            {successMessage && (
              <div className="auth-success">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" />
                  <polyline points="22 4 12 14.01 9 11.01" />
                </svg>
                {successMessage}
              </div>
            )}

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
                  {view === 'login' && 'Signing in...'}
                  {view === 'register' && 'Creating account...'}
                  {view === 'forgot' && 'Sending...'}
                  {view === 'reset' && 'Resetting...'}
                </span>
              ) : (
                <>
                  {view === 'login' && 'Sign In'}
                  {view === 'register' && 'Create Account'}
                  {view === 'forgot' && 'Send Reset Link'}
                  {view === 'reset' && 'Reset Password'}
                </>
              )}
            </button>
          </form>

          <div className="auth-footer">
            {(view === 'login' || view === 'register') && (
              <p>
                {view === 'login' ? "Don't have an account? " : "Already have an account? "}
                <button type="button" className="link-btn" onClick={() => switchView(view === 'login' ? 'register' : 'login')}>
                  {view === 'login' ? 'Create one' : 'Sign in'}
                </button>
              </p>
            )}
            {(view === 'forgot' || view === 'reset') && (
              <p>
                <button type="button" className="link-btn" onClick={() => switchView('login')}>
                  ← Back to Sign In
                </button>
              </p>
            )}
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
