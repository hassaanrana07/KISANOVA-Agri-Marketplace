import React, { createContext, useContext, useState, useEffect, useMemo } from 'react';
import { useLocation } from 'react-router-dom';
import api from '../services/api';

const AuthContext = createContext();

export const AuthProvider = ({ children }) => {
  const location = useLocation();

  // Portal-scoped synchronous initial states to ensure instant refresh persistence
  const [buyerUser, setBuyerUser] = useState(() => {
    try {
      const stored = localStorage.getItem('kisanova_buyer_user');
      return stored ? JSON.parse(stored) : null;
    } catch {
      return null;
    }
  });

  const [sellerUser, setSellerUser] = useState(() => {
    try {
      const stored = localStorage.getItem('kisanova_seller_user');
      return stored ? JSON.parse(stored) : null;
    } catch {
      return null;
    }
  });

  const [sellerProfile, setSellerProfile] = useState(() => {
    try {
      const stored = localStorage.getItem('kisanova_seller_profile');
      return stored ? JSON.parse(stored) : null;
    } catch {
      return null;
    }
  });

  const [adminUser, setAdminUser] = useState(() => {
    try {
      const stored = localStorage.getItem('kisanova_admin_user');
      return stored ? JSON.parse(stored) : null;
    } catch {
      return null;
    }
  });

  const [loading, setLoading] = useState(true);

  // Determine current portal context from URL pathname or port (Port 5140 = Seller, Port 5174 = Admin)
  const pathname = location.pathname;
  const currentPort = typeof window !== 'undefined' ? window.location.port : '';
  const isCurrentAdminPath = pathname.startsWith('/admin') || currentPort === '5174';
  const isCurrentSellerPath = pathname.startsWith('/seller') || currentPort === '5140';

  // Verify and sync active portal session on load or route changes
  useEffect(() => {
    const syncActiveSession = async () => {
      try {
        if (isCurrentAdminPath) {
          const token = localStorage.getItem('kisanova_admin_token');
          if (token) {
            const res = await api.get('/auth/me');
            if (res.data.success && res.data.data.user.role === 'ADMIN') {
              setAdminUser(res.data.data.user);
              localStorage.setItem('kisanova_admin_user', JSON.stringify(res.data.data.user));
            }
          }
        } else if (isCurrentSellerPath) {
          const token = localStorage.getItem('kisanova_seller_token');
          if (token) {
            const res = await api.get('/auth/me');
            if (res.data.success && res.data.data.user.role === 'SELLER') {
              setSellerUser(res.data.data.user);
              setSellerProfile(res.data.data.seller);
              localStorage.setItem('kisanova_seller_user', JSON.stringify(res.data.data.user));
              if (res.data.data.seller) {
                localStorage.setItem('kisanova_seller_profile', JSON.stringify(res.data.data.seller));
              }
            }
          }
        } else {
          // Buyer / Public marketplace context
          const token = localStorage.getItem('kisanova_buyer_token');
          if (token) {
            const res = await api.get('/auth/me');
            if (res.data.success && res.data.data.user.role === 'BUYER') {
              setBuyerUser(res.data.data.user);
              localStorage.setItem('kisanova_buyer_user', JSON.stringify(res.data.data.user));
            }
          }
        }
      } catch (err) {
        // Only clear if 401 Unauthorized
        if (err.response && err.response.status === 401) {
          if (isCurrentAdminPath) {
            localStorage.removeItem('kisanova_admin_token');
            localStorage.removeItem('kisanova_admin_user');
            setAdminUser(null);
          } else if (isCurrentSellerPath) {
            localStorage.removeItem('kisanova_seller_token');
            localStorage.removeItem('kisanova_seller_user');
            localStorage.removeItem('kisanova_seller_profile');
            setSellerUser(null);
            setSellerProfile(null);
          } else {
            localStorage.removeItem('kisanova_buyer_token');
            localStorage.removeItem('kisanova_buyer_user');
            setBuyerUser(null);
          }
        }
      } finally {
        setLoading(false);
      }
    };

    syncActiveSession();
  }, [pathname, isCurrentAdminPath, isCurrentSellerPath]);

  // Context-aware user and seller resolution
  const user = useMemo(() => {
    if (isCurrentAdminPath) return adminUser;
    if (isCurrentSellerPath) return sellerUser;
    return buyerUser;
  }, [isCurrentAdminPath, isCurrentSellerPath, adminUser, sellerUser, buyerUser]);

  const seller = useMemo(() => {
    return sellerProfile;
  }, [sellerProfile]);

  const token = useMemo(() => {
    if (isCurrentAdminPath) return localStorage.getItem('kisanova_admin_token');
    if (isCurrentSellerPath) return localStorage.getItem('kisanova_seller_token');
    return localStorage.getItem('kisanova_buyer_token');
  }, [isCurrentAdminPath, isCurrentSellerPath]);

  /**
   * Portal-isolated Login
   */
  const login = async (email, password, requestedRole = null) => {
    try {
      const res = await api.post('/auth/login', { email, password, requestedRole });
      if (res.data.success) {
        const { token, user: loggedUser, seller: loggedSeller } = res.data.data;

        if (loggedUser.role === 'ADMIN') {
          localStorage.setItem('kisanova_admin_token', token);
          localStorage.setItem('kisanova_admin_user', JSON.stringify(loggedUser));
          setAdminUser(loggedUser);
        } else if (loggedUser.role === 'SELLER') {
          localStorage.setItem('kisanova_seller_token', token);
          localStorage.setItem('kisanova_seller_user', JSON.stringify(loggedUser));
          if (loggedSeller) {
            localStorage.setItem('kisanova_seller_profile', JSON.stringify(loggedSeller));
            setSellerProfile(loggedSeller);
          }
          setSellerUser(loggedUser);
        } else {
          // BUYER
          localStorage.setItem('kisanova_buyer_token', token);
          localStorage.setItem('kisanova_buyer_user', JSON.stringify(loggedUser));
          setBuyerUser(loggedUser);
        }

        return { success: true, user: loggedUser, seller: loggedSeller };
      }
      return { success: false, message: res.data.message };
    } catch (err) {
      return {
        success: false,
        message: err.response?.data?.message || 'Login failed. Please verify credentials.',
        isPending: err.response?.data?.message?.toLowerCase().includes('under verification')
      };
    }
  };

  /**
   * Registration
   */
  const register = async (registrationData) => {
    try {
      const res = await api.post('/auth/register', registrationData);
      if (res.data.success) {
        const { token, user: regUser, seller: regSeller, reviewNotice } = res.data.data;

        // If seller registration, backend returns reviewNotice and NO token (pending approval)
        if (registrationData.role === 'SELLER' || regUser.role === 'SELLER') {
          return {
            success: true,
            isPending: true,
            reviewNotice: reviewNotice || 'Your seller account has been submitted and is under review.',
            user: regUser,
            seller: regSeller
          };
        }

        // Standard buyer registration
        if (token) {
          localStorage.setItem('kisanova_buyer_token', token);
          localStorage.setItem('kisanova_buyer_user', JSON.stringify(regUser));
          setBuyerUser(regUser);
        }

        return { success: true, user: regUser, message: res.data.message };
      }
      return { success: false, message: res.data.message };
    } catch (err) {
      return {
        success: false,
        message: err.response?.data?.message || 'Registration failed.'
      };
    }
  };

  /**
   * Portal-isolated Logout
   */
  const logout = (portalToLogout = null) => {
    const target = portalToLogout || (isCurrentAdminPath ? 'ADMIN' : isCurrentSellerPath ? 'SELLER' : 'BUYER');

    if (target === 'ADMIN') {
      localStorage.removeItem('kisanova_admin_token');
      localStorage.removeItem('kisanova_admin_user');
      setAdminUser(null);
    } else if (target === 'SELLER') {
      localStorage.removeItem('kisanova_seller_token');
      localStorage.removeItem('kisanova_seller_user');
      localStorage.removeItem('kisanova_seller_profile');
      setSellerUser(null);
      setSellerProfile(null);
    } else {
      localStorage.removeItem('kisanova_buyer_token');
      localStorage.removeItem('kisanova_buyer_user');
      setBuyerUser(null);
    }
  };

  const updateUser = (updatedUser) => {
    if (updatedUser.role === 'ADMIN') {
      setAdminUser(updatedUser);
      localStorage.setItem('kisanova_admin_user', JSON.stringify(updatedUser));
    } else if (updatedUser.role === 'SELLER') {
      setSellerUser(updatedUser);
      localStorage.setItem('kisanova_seller_user', JSON.stringify(updatedUser));
    } else {
      setBuyerUser(updatedUser);
      localStorage.setItem('kisanova_buyer_user', JSON.stringify(updatedUser));
    }
  };

  const updateSeller = (updatedSeller) => {
    setSellerProfile(updatedSeller);
    localStorage.setItem('kisanova_seller_profile', JSON.stringify(updatedSeller));
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
