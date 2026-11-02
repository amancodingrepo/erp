import React, { useState } from 'react';
import { BookOpen, ShieldCheck, Eye, EyeOff, AlertCircle, CheckCircle2 } from 'lucide-react';
import { useDatabaseSession } from '../../DatabaseSession.jsx';

export default function ChangePasswordPage() {
  const { user, changePassword } = useDatabaseSession();
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [reveal, setReveal] = useState(false);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  async function submit(event) {
    event.preventDefault(); setError('');
    if (newPassword.length < 12) return setError('Your new password must contain at least 12 characters.');
    if (newPassword !== confirmPassword) return setError('The new password and confirmation do not match.');
    setBusy(true);
    try { await changePassword(currentPassword, newPassword); }
    catch (e) { setError(e.message || 'Password could not be changed.'); }
    finally { setBusy(false); }
  }
  return <div className="db-auth-shell">
    <div className="db-auth-brand-panel"><div className="db-auth-logo"><BookOpen size={26}/><span>School World</span></div><div className="db-auth-copy"><span className="db-auth-eyebrow">ACCOUNT SECURITY</span><h1>Secure your<br/>school workspace.</h1><p>Your administrator issued an initial password. Change it before continuing to the application.</p><div className="db-auth-features"><span>Private account</span><span>Encrypted password storage</span><span>Secure session</span></div></div><div className="db-auth-footer">School World · Account protection</div></div>
    <div className="db-auth-form-panel"><form className="db-auth-form" onSubmit={submit}><div className="db-auth-mobile-brand"><BookOpen size={25}/><strong>School World</strong></div><span className="db-auth-eyebrow">FIRST SIGN-IN</span><h2>Change your password</h2><p>Account: <strong>{user?.email}</strong></p>
      {error && <div className="db-auth-error"><AlertCircle size={16}/><span>{error}</span></div>}
      <label>Current password<span className="db-auth-input"><ShieldCheck size={17}/><input type={reveal?'text':'password'} autoComplete="current-password" required value={currentPassword} onChange={e=>setCurrentPassword(e.target.value)}/></span></label>
      <label>New password<span className="db-auth-input"><ShieldCheck size={17}/><input type={reveal?'text':'password'} autoComplete="new-password" minLength={12} required value={newPassword} onChange={e=>setNewPassword(e.target.value)} /></span></label>
      <label>Confirm new password<span className="db-auth-input"><ShieldCheck size={17}/><input type={reveal?'text':'password'} autoComplete="new-password" minLength={12} required value={confirmPassword} onChange={e=>setConfirmPassword(e.target.value)} /></span></label>
      <button type="button" className="db-auth-show-password" onClick={()=>setReveal(v=>!v)}>{reveal?<EyeOff size={15}/>:<Eye size={15}/>} {reveal?'Hide passwords':'Show passwords'}</button>
      <button type="submit" className="db-auth-submit" disabled={busy}>{busy?'Saving…':'Save new password'}</button>
      <div className="db-auth-security-note"><CheckCircle2 size={14}/> Use at least 12 characters and avoid reusing a password.</div>
    </form></div>
  </div>;
}
