import React, { useState } from 'react';
import { BookOpen, LockKeyhole, Mail, AlertCircle, LoaderCircle } from 'lucide-react';
import { useDatabaseSession } from '../../DatabaseSession.jsx';
import { apiPost } from '../../api.js';

export default function LoginPage() {
  const { login, error: sessionError } = useDatabaseSession();
  const [email,setEmail]=useState('');
  const [password,setPassword]=useState('');
  const [error,setError]=useState('');
  const [busy,setBusy]=useState(false);
  const [resetOpen,setResetOpen]=useState(false);
  const [username,setUsername]=useState('');
  const [portal,setPortal]=useState('staff');
  const [token,setToken]=useState('');
  const [nextPassword,setNextPassword]=useState('');
  const [resetMessage,setResetMessage]=useState('');
  async function requestReset(event){event.preventDefault();setResetMessage('');try{await apiPost('/v1/auth/forgot-password',{username,portal});setResetMessage('If that username exists, a reset token was issued. Ask your campus administrator for the token, then set a new password below.');}catch(e){setResetMessage(e.message||'Reset could not be requested.');}}
  async function applyReset(event){event.preventDefault();setResetMessage('');try{await apiPost('/v1/auth/set-password',{token,password:nextPassword});setResetMessage('Password updated. Sign in with the new password.');}catch(e){setResetMessage(e.message||'The new password could not be saved.');}}
  async function submit(event){event.preventDefault();setError('');setBusy(true);try{await login(email,password);}catch(e){setError(e.message||'Sign in failed.');}finally{setBusy(false);}}
  return <div className="db-auth-shell">
    <div className="db-auth-brand-panel"><div className="db-auth-logo"><BookOpen size={26}/><span>School World</span></div><div className="db-auth-copy"><span className="db-auth-eyebrow">SCHOOL MANAGEMENT PLATFORM</span><h1>One school.<br/>One connected workspace.</h1><p>Manage students, notices, attendance, fees, communication and school operations from one secure place.</p><div className="db-auth-features"><span>Student management</span><span>Notice Board</span><span>Multi-school accounts</span></div></div><div className="db-auth-footer">School World · PostgreSQL-backed edition</div></div>
    <div className="db-auth-form-panel"><form className="db-auth-form" onSubmit={submit}><div className="db-auth-mobile-brand"><BookOpen size={25}/><strong>School World</strong></div><span className="db-auth-eyebrow">WELCOME BACK</span><h2>Sign in to your account</h2><p>Use the school account provided by your administrator.</p>
      {(error||sessionError)&&<div className="db-auth-error"><AlertCircle size={16}/><span>{error||sessionError}</span></div>}
      <label>Email or phone number<span className="db-auth-input"><Mail size={17}/><input type="text" autoComplete="username" required value={email} onChange={e=>setEmail(e.target.value)} placeholder="you@school.edu or phone number"/></span></label>
      <label>Password<span className="db-auth-input"><LockKeyhole size={17}/><input type="password" autoComplete="current-password" required value={password} onChange={e=>setPassword(e.target.value)} placeholder="Enter your password"/></span></label>
      <button type="submit" className="db-auth-submit" disabled={busy}>{busy?<><LoaderCircle size={17} className="db-auth-spin"/> Signing in…</>:'Sign in securely'}</button>
      <div className="db-auth-security-note"><LockKeyhole size={14}/> Your session uses an HttpOnly, same-site cookie.</div>
      <p className="db-auth-security-note">Use the username from your campus account.</p>
    </form>
      <button type="button" className="db-auth-security-note" onClick={()=>setResetOpen(open=>!open)}>Forgot password</button>
      {resetOpen&&<div className="db-auth-security-note">
        <form onSubmit={requestReset}><label>Username<input value={username} onChange={e=>setUsername(e.target.value)} required/></label>
          <label>Portal<select value={portal} onChange={e=>setPortal(e.target.value)}><option value="staff">Staff</option><option value="student">Student</option><option value="parent">Parent</option></select></label>
          <button type="submit">Request reset</button></form>
        <form onSubmit={applyReset}><label>Reset token<input value={token} onChange={e=>setToken(e.target.value)} required/></label>
          <label>New password<input type="password" minLength={8} value={nextPassword} onChange={e=>setNextPassword(e.target.value)} required/></label>
          <button type="submit">Set new password</button></form>
        {resetMessage&&<p>{resetMessage}</p>}
      </div>}
    </div>
  </div>;
}
