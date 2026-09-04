import React, { createContext, useContext, useState, useEffect } from 'react';
import api from '../services/api';

const AuthContext = createContext();

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [seller, setSeller] = useState(null);
  const [token, setToken] = useState(localStorage.getItem('kisanova_token') || null);
  const [loading, setLoading] = useState(true);

  // Initialize and verify user from stored token
  useEffect(() => {
    const initAuth = async () => {
      const storedToken = localStorage.getItem('kisanova_token');
      if (storedToken) {
        try {
          const res = await api.get('/auth/me');
          if (res.data.success) {
            setUser(res.data.data.user);
            setSeller(res.data.data.seller);
          }
        } catch (err) {
          console.error('Failed to restore session:', err);
          logout();
        }
      }
      setLoading(false);
    };

    initAuth();
  }, []);

  const login = async (email, password, requestedRole = null) => {
    try {
      const res = await api.post('/auth/login', { email, password, requestedRole });
      if (res.data.success) {
        const { token, user, seller } = res.data.data;
        localStorage.setItem('kisanova_token', token);
        localStorage.setItem('kisanova_user', JSON.stringify(user));
        if (seller) {
          localStorage.setItem('kisanova_seller', JSON.stringify(seller));
        }

        setToken(token);
        setUser(user);
        setSeller(seller);
        return { success: true, user, seller };
      }
      return { success: false, message: res.data.message };
    } catch (err) {
      return {
        success: false,
        message: err.response?.data?.message || 'Login failed. Please verify credentials.'
      };
    }
  };

  const register = async (registrationData) => {
    try {
      const res = await api.post('/auth/register', registrationData);
      if (res.data.success) {
        const { token, user, seller } = res.data.data;
        localStorage.setItem('kisanova_token', token);
        localStorage.setItem('kisanova_user', JSON.stringify(user));
        if (seller) {
          localStorage.setItem('kisanova_seller', JSON.stringify(seller));
        }

        setToken(token);
        setUser(user);
        setSeller(seller);
        return { success: true, user, seller, message: res.data.message };
      }
      return { success: false, message: res.data.message };
    } catch (err) {
      return {
        success: false,
        message: err.response?.data?.message || 'Registration failed.'
      };
    }
  };

  const logout = () => {
    localStorage.removeItem('kisanova_token');
    localStorage.removeItem('kisanova_user');
    localStorage.removeItem('kisanova_seller');
    setToken(null);
    setUser(null);
    setSeller(null);
  };

  const updateUser = (updatedUser) => {
    setUser(updatedUser);
    localStorage.setItem('kisanova_user', JSON.stringify(updatedUser));
  };

  const updateSeller = (updatedSeller) => {
    setSeller(updatedSeller);
    localStorage.setItem('kisanova_seller', JSON.stringify(updatedSeller));
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        seller,
        token,
        role: user?.role || null,
        isAuthenticated: !!user,
        isAdmin: user?.role === 'ADMIN',
        isSeller: user?.role === 'SELLER',
        isBuyer: user?.role === 'BUYER',
        loading,
        login,
        register,
        logout,
        updateUser,
        updateSeller
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
