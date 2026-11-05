import React, { useState } from 'react';
import { ArrowLeft, BookOpen, KeyRound, LockKeyhole, UserRound, AlertCircle, LoaderCircle } from 'lucide-react';
import { useDatabaseSession } from '../../DatabaseSession.jsx';

// Sign-in matches the account username (not email or phone), so the field says "Username".
// "Forgot password" is a second view of the same card. Passwords are reset by the school's
// administrator, who issues a temporary password; the app then makes the user choose a new one
// at sign-in. (The old self-service form asked for a reset token that is never delivered to
// anyone, so it could not succeed.)
export default function LoginPage() {
  const { login, error: sessionError } = useDatabaseSession();
  const [view, setView] = useState('signin');
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  async function submit(event) {
    event.preventDefault();
    setError('');
    setBusy(true);
    try { await login(username.trim(), password); }
    catch (e) { setError(e.message || 'Sign in failed.'); }
    finally { setBusy(false); }
  }

  return <div className="db-auth-shell">
    <div className="db-auth-brand-panel"><div className="db-auth-logo"><BookOpen size={26}/><span>School World</span></div><div className="db-auth-copy"><span className="db-auth-eyebrow">SCHOOL MANAGEMENT PLATFORM</span><h1>One school.<br/>One connected workspace.</h1><p>Manage students, notices, attendance, fees, communication and school operations from one secure place.</p><div className="db-auth-features"><span>Student management</span><span>Notice Board</span><span>Multi-school accounts</span></div></div><div className="db-auth-footer">School World · PostgreSQL-backed edition</div></div>
    <div className="db-auth-form-panel">
      {view === 'signin' ? (
        <form className="db-auth-form" onSubmit={submit}>
          <div className="db-auth-mobile-brand"><BookOpen size={25}/><strong>School World</strong></div>
          <span className="db-auth-eyebrow">WELCOME BACK</span>
          <h2>Sign in to your account</h2>
          <p>Use the username and password your school gave you.</p>
          {(error || sessionError) && <div className="db-auth-error" role="alert"><AlertCircle size={16}/><span>{error || sessionError}</span></div>}
          <label>Username<span className="db-auth-input"><UserRound size={17}/><input type="text" autoComplete="username" autoCapitalize="none" spellCheck={false} required value={username} onChange={e => setUsername(e.target.value)} placeholder="Your school username"/></span></label>
          <div className="db-auth-field">
            <div className="db-auth-label-row">
              <label htmlFor="db-auth-password">Password</label>
              <button type="button" className="db-auth-link" onClick={() => { setError(''); setView('forgot'); }}>Forgot password?</button>
            </div>
            <span className="db-auth-input"><LockKeyhole size={17}/><input id="db-auth-password" type="password" autoComplete="current-password" required value={password} onChange={e => setPassword(e.target.value)} placeholder="Enter your password"/></span>
          </div>
          <button type="submit" className="db-auth-submit" disabled={busy}>{busy ? <><LoaderCircle size={17} className="db-auth-spin"/> Signing in…</> : 'Sign in securely'}</button>
          <div className="db-auth-security-note"><LockKeyhole size={14}/> Your session uses an HttpOnly, same-site cookie.</div>
        </form>
      ) : (
        <section className="db-auth-form" aria-labelledby="db-auth-forgot-title">
          <div className="db-auth-mobile-brand"><BookOpen size={25}/><strong>School World</strong></div>
          <span className="db-auth-eyebrow">ACCOUNT HELP</span>
          <div className="db-auth-help-icon" aria-hidden="true"><KeyRound size={20}/></div>
          <h2 id="db-auth-forgot-title">Forgot your password?</h2>
          <p>For your security, passwords are reset by your school, not online.</p>
          <ol className="db-auth-steps">
            <li><strong>Contact your school office</strong><span>Tell them your username and that you need a password reset.</span></li>
            <li><strong>Get a temporary password</strong><span>Your administrator issues one from the staff, student or parent record.</span></li>
            <li><strong>Sign in and choose a new one</strong><span>You'll be asked to set your own password straight away.</span></li>
          </ol>
          <button type="button" className="db-auth-secondary" onClick={() => setView('signin')} autoFocus><ArrowLeft size={16}/> Back to sign in</button>
        </section>
      )}
    </div>
  </div>;
}
