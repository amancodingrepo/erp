import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { apiGet, apiPost } from './api.js';

const SessionContext = createContext(null);
function installRuntimeConfig(user) {
  if (!user) return;
  const school = user.school || null;
  const existing = window.SCHOOL_DIARY_CONFIG && typeof window.SCHOOL_DIARY_CONFIG === 'object' ? window.SCHOOL_DIARY_CONFIG : {};
  window.SCHOOL_DIARY_CONFIG = {
    ...existing,
    schoolName: school?.name || existing.schoolName || 'Sanford School',
    schoolId: school?.id || null,
    schoolCode: school?.code || null,
    schoolAddress: school?.address || school?.config?.address || '',
    schoolPhone: school?.phone || school?.config?.phone || '',
    schoolEmail: school?.email || school?.config?.email || '',
    schoolTimezone: school?.timezone || school?.config?.timezone || 'Asia/Kolkata',
    schoolLogoDataUrl: school?.config?.logoDataUrl || '',
    classes: existing.classes || [],
    currentUser: {
      id: user.id,
      userId: user.personId || user.id,
      personId: user.personId || null,
      firstName: user.firstName || '', lastName: user.lastName || '',
      name: [user.firstName, user.lastName].filter(Boolean).join(' '),
      email: user.email, role: user.role, userType: user.personType || user.role,
      status: 'Active', schoolId: school?.id || null
    }
  };
  window.SCHOOL_DIARY_CURRENT_USER = window.SCHOOL_DIARY_CONFIG.currentUser;
  window.dispatchEvent(new Event('schooldiary:tenant-updated'));
}

export function DatabaseSessionProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const refresh = useCallback(async () => {
    try {
      const result = await apiGet('/auth/me');
      setUser(result.user); installRuntimeConfig(result.user); setError(''); return result.user;
    } catch (e) {
      if (e.status !== 401) setError(e.message);
      setUser(null); return null;
    } finally { setLoading(false); }
  }, []);

  useEffect(() => { refresh(); }, [refresh]);

  const login = useCallback(async (email, password) => {
    setError('');
    const result = await apiPost('/auth/login', { email, password });
    setUser(result.user); installRuntimeConfig(result.user); setLoading(false); return result.user;
  }, []);

  const changePassword = useCallback(async (currentPassword, newPassword) => {
    const result = await apiPost('/auth/change-password', { currentPassword, newPassword });
    setUser(result.user); installRuntimeConfig(result.user); setError(''); return result.user;
  }, []);

  const logout = useCallback(async () => {
    try { await apiPost('/auth/logout', {}); } finally {
      setUser(null); setError('');
      window.SCHOOL_DIARY_CURRENT_USER = null;
      window.dispatchEvent(new Event('schooldiary:tenant-updated'));
    }
  }, []);

  const value = useMemo(() => ({ user, loading, error, login, logout, refresh, changePassword }), [user,loading,error,login,logout,refresh,changePassword]);
  return <SessionContext.Provider value={value}>{children}</SessionContext.Provider>;
}
export function useDatabaseSession() {
  const value = useContext(SessionContext);
  if (!value) throw new Error('useDatabaseSession must be used inside DatabaseSessionProvider.');
  return value;
}
