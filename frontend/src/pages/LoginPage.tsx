import { useState } from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { Spinner } from '../components/Spinner';
import { PageLoader } from '../components/PageLoader';

export function LoginPage() {
  const { user, loading, login, register } = useAuth();
  const [mode, setMode] = useState<'login' | 'register'>('login');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  if (loading) return <PageLoader label="Loading" />;

  if (user) {
    return <Navigate to="/" replace />;
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setSubmitting(true);

    try {
      if (mode === 'login') {
        await login(email, password);
      } else {
        await register(email, password);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Authentication failed');
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="auth-page">
      <div className="auth-card">
        <h1>Earn</h1>
        <p className="muted">Deposit stablecoins. Earn yield on Aave.</p>

        <form onSubmit={handleSubmit} className="form">
          <label className="label">
            Email
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="input"
              required
              autoComplete="email"
            />
          </label>

          <label className="label">
            Password
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="input"
              required
              minLength={8}
              autoComplete={mode === 'login' ? 'current-password' : 'new-password'}
            />
          </label>

          {error && <p className="error">{error}</p>}

          <button type="submit" className="btn btn-primary" disabled={submitting}>
            {submitting && <Spinner />}
            {submitting
              ? 'Please wait…'
              : mode === 'login'
                ? 'Sign in'
                : 'Create account'}
          </button>
        </form>

        <button
          type="button"
          className="btn btn-ghost auth-toggle"
          onClick={() => setMode(mode === 'login' ? 'register' : 'login')}
        >
          {mode === 'login'
            ? 'Need an account? Register'
            : 'Already have an account? Sign in'}
        </button>
      </div>
    </div>
  );
}
