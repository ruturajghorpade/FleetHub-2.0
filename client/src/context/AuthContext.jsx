import React, { createContext, useContext, useState, useEffect } from 'react';
import api from '../services/api';

const AuthContext = createContext(null);

export const getRoleDashboardPath = (role) => {
  switch (role) {
    case 'SUPER_ADMIN':
      return '/super-admin/dashboard';
    case 'ADMIN':
      return '/admin/dashboard';
    case 'DISPATCHER':
      return '/dispatcher/dashboard';
    case 'DRIVER':
      return '/driver/dashboard';
    case 'CLIENT':
    case 'CLIENT_ADMIN':
    case 'CLIENT_USER':
    default:
      return '/client/dashboard';
  }
};

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [token, setToken] = useState(localStorage.getItem('fleethub_token') || null);
  const [loading, setLoading] = useState(true);

  // Initialize auth state and session persistence on browser reload
  useEffect(() => {
    const initAuth = async () => {
      const storedToken = localStorage.getItem('fleethub_token');
      if (storedToken) {
        try {
          const res = await api.get('/auth/me');
          if (res.data && res.data.data) {
            setUser(res.data.data);
          }
        } catch (err) {
          console.error('Session expired or invalid:', err.message);
          localStorage.removeItem('fleethub_token');
          localStorage.removeItem('fleethub_user');
          setUser(null);
          setToken(null);
        }
      }
      setLoading(false);
    };

    initAuth();
  }, []);

  const login = async (email, password) => {
    const res = await api.post('/auth/login', { email, password });
    if (res.data.success) {
      const { token: receivedToken, user: receivedUser } = res.data;
      localStorage.setItem('fleethub_token', receivedToken);
      localStorage.setItem('fleethub_user', JSON.stringify(receivedUser));
      setToken(receivedToken);

      // Fetch full populated user profile
      const meRes = await api.get('/auth/me');
      const fullUser = meRes.data.data || receivedUser;
      setUser(fullUser);
      return fullUser;
    }
  };

  const register = async (userData) => {
    const res = await api.post('/auth/register', userData);
    if (res.data.success) {
      const { token: receivedToken, user: receivedUser } = res.data;
      localStorage.setItem('fleethub_token', receivedToken);
      localStorage.setItem('fleethub_user', JSON.stringify(receivedUser));
      setToken(receivedToken);
      setUser(receivedUser);
      return receivedUser;
    }
  };

  const acceptInvitation = async (invitationData) => {
    const res = await api.post('/auth/accept-invitation', invitationData);
    if (res.data.success) {
      const { token: receivedToken, user: receivedUser } = res.data;
      localStorage.setItem('fleethub_token', receivedToken);
      localStorage.setItem('fleethub_user', JSON.stringify(receivedUser));
      setToken(receivedToken);
      setUser(receivedUser);
      return receivedUser;
    }
  };

  const inviteUser = async (invitePayload) => {
    const res = await api.post('/auth/invite', invitePayload);
    return res.data;
  };

  const logout = () => {
    try {
      api.post('/auth/logout').catch(() => {});
    } finally {
      localStorage.removeItem('fleethub_token');
      localStorage.removeItem('fleethub_user');
      setUser(null);
      setToken(null);
    }
  };

  const updateUser = (newUserData) => {
    setUser((prev) => ({ ...prev, ...newUserData }));
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        token,
        loading,
        isAuthenticated: !!user,
        login,
        register,
        acceptInvitation,
        inviteUser,
        logout,
        updateUser,
        getRoleDashboardPath,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
