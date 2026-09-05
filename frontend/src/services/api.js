import axios from 'axios';

const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL || 'http://localhost:8000/api',
  headers: {
    'Content-Type': 'application/json'
  }
});

/**
 * Determine portal-specific JWT token based on target API route, port, or browser location
 * Enforces strict role separation between Admin, Seller, and Buyer portals
 */
export const getActiveToken = (url = '') => {
  const currentPath = typeof window !== 'undefined' ? window.location.pathname : '';
  const currentPort = typeof window !== 'undefined' ? window.location.port : '';

  const isAdmin = currentPort === '5174' || url.startsWith('/admin') || currentPath.startsWith('/admin');
  if (isAdmin) {
    return localStorage.getItem('kisanova_admin_token') || localStorage.getItem('kisanova_token');
  }

  const isSeller = currentPort === '5140' || url.startsWith('/seller') || currentPath.startsWith('/seller');
  if (isSeller) {
    return localStorage.getItem('kisanova_seller_token') || localStorage.getItem('kisanova_token');
  }

  // Buyer / Public marketplace routes (Port 5000 or default)
  return (
    localStorage.getItem('kisanova_buyer_token') ||
    localStorage.getItem('kisanova_token')
  );
};

// Request interceptor: Attach portal-appropriate JWT token
api.interceptors.request.use(
  (config) => {
    const token = getActiveToken(config.url);
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

// Response interceptor: Handle 401 Unauthorized per isolated portal
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response && error.response.status === 401) {
      const url = error.config?.url || '';
      const currentPath = typeof window !== 'undefined' ? window.location.pathname : '';
      const currentPort = typeof window !== 'undefined' ? window.location.port : '';

      const isAdmin = currentPort === '5174' || url.startsWith('/admin') || currentPath.startsWith('/admin');
      const isSeller = currentPort === '5140' || url.startsWith('/seller') || currentPath.startsWith('/seller');

      if (isAdmin) {
        localStorage.removeItem('kisanova_admin_token');
        localStorage.removeItem('kisanova_admin_user');
      } else if (isSeller) {
        localStorage.removeItem('kisanova_seller_token');
        localStorage.removeItem('kisanova_seller_user');
        localStorage.removeItem('kisanova_seller_profile');
      } else {
        localStorage.removeItem('kisanova_buyer_token');
        localStorage.removeItem('kisanova_buyer_user');
      }
    }
    return Promise.reject(error);
  }
);

export default api;
