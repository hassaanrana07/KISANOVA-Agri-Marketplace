import axios from 'axios';

const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL || 'http://localhost:5000/api',
  headers: {
    'Content-Type': 'application/json'
  }
});

// Request interceptor: Attach JWT token if available
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('kisanova_token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

// Response interceptor: Handle 401 Unauthorized
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response && error.response.status === 401) {
      // If token expired or invalid, clear local auth
      const currentPath = window.location.pathname;
      if (!currentPath.includes('/login') && !currentPath.includes('/register')) {
        // Only clear if on protected pages
        if (currentPath.startsWith('/seller') || currentPath.startsWith('/admin') || currentPath.startsWith('/orders') || currentPath.startsWith('/checkout')) {
          localStorage.removeItem('kisanova_token');
          localStorage.removeItem('kisanova_user');
          localStorage.removeItem('kisanova_seller');
        }
      }
    }
    return Promise.reject(error);
  }
);

export default api;
