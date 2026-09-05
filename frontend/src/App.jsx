import React from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import { CartProvider } from './context/CartContext';
import { LanguageProvider } from './context/LanguageContext';

// Layouts
import PublicLayout from './layouts/PublicLayout';
import SellerLayout from './layouts/SellerLayout';
import AdminLayout from './layouts/AdminLayout';

// Public Pages
import HomePage from './pages/public/HomePage';
import ProductsPage from './pages/public/ProductsPage';
import ProductDetailPage from './pages/public/ProductDetailPage';
import CartPage from './pages/public/CartPage';
import CheckoutPage from './pages/public/CheckoutPage';
import MyOrdersPage from './pages/public/MyOrdersPage';
import OrderDetailPage from './pages/public/OrderDetailPage';
import ChatPage from './pages/public/ChatPage';
import LoginPage from './pages/public/LoginPage';
import RegisterPage from './pages/public/RegisterPage';
import ForgotPasswordPage from './pages/public/ForgotPasswordPage';
import ResetPasswordPage from './pages/public/ResetPasswordPage';
import PrivacyPolicyPage from './pages/public/PrivacyPolicyPage';
import TermsConditionsPage from './pages/public/TermsConditionsPage';
import FaqPage from './pages/public/FaqPage';

// Seller Pages
import SellerLoginPage from './pages/seller/SellerLoginPage';
import SellerRegisterPage from './pages/seller/SellerRegisterPage';
import SellerForgotPasswordPage from './pages/seller/SellerForgotPasswordPage';
import SellerResetPasswordPage from './pages/seller/SellerResetPasswordPage';
import SellerDashboardPage from './pages/seller/SellerDashboardPage';
import SellerProductsPage from './pages/seller/SellerProductsPage';
import SellerProductFormPage from './pages/seller/SellerProductFormPage';
import SellerOrdersPage from './pages/seller/SellerOrdersPage';
import SellerOrderDetailPage from './pages/seller/SellerOrderDetailPage';
import SellerMessagesPage from './pages/seller/SellerMessagesPage';
import SellerProfilePage from './pages/seller/SellerProfilePage';

// Admin Pages
import AdminLoginPage from './pages/admin/AdminLoginPage';
import AdminForgotPasswordPage from './pages/admin/AdminForgotPasswordPage';
import AdminResetPasswordPage from './pages/admin/AdminResetPasswordPage';
import AdminDashboardPage from './pages/admin/AdminDashboardPage';
import AdminSellersPage from './pages/admin/AdminSellersPage';
import AdminProductsPage from './pages/admin/AdminProductsPage';
import AdminOrdersPage from './pages/admin/AdminOrdersPage';
import AdminUsersPage from './pages/admin/AdminUsersPage';

// Route Guard for Buyer Protected routes
const RequireBuyerAuth = ({ children }) => {
  const { user, isBuyer, loading } = useAuth();
  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-agro-600"></div>
      </div>
    );
  }
  if (!user) {
    return <Navigate to="/login" state={{ from: window.location.pathname }} replace />;
  }
  return children;
};

function App() {
  const currentPort = typeof window !== 'undefined' ? window.location.port : '';
  const isSellerPort = currentPort === '5140';
  const isAdminPort = currentPort === '5174';

  return (
    <AuthProvider>
      <LanguageProvider>
        <CartProvider>
          <Routes>
            {/* ==================================================== */}
            {/* DEDICATED PORT-SPECIFIC SHORTCUT ROOT ROUTES         */}
            {/* ==================================================== */}
            {isSellerPort && (
              <>
                <Route path="/" element={<Navigate to="/seller" replace />} />
                <Route path="/login" element={<SellerLoginPage />} />
                <Route path="/register" element={<SellerRegisterPage />} />
                <Route path="/forgot-password" element={<SellerForgotPasswordPage />} />
                <Route path="/reset-password" element={<SellerResetPasswordPage />} />
              </>
            )}

            {isAdminPort && (
              <>
                <Route path="/" element={<Navigate to="/admin" replace />} />
                <Route path="/login" element={<AdminLoginPage />} />
                <Route path="/forgot-password" element={<AdminForgotPasswordPage />} />
                <Route path="/reset-password" element={<AdminResetPasswordPage />} />
              </>
            )}

            {/* ==================================================== */}
            {/* 1. PUBLIC BUYER FRONTEND                             */}
            {/* ==================================================== */}
            <Route element={<PublicLayout />}>
              <Route path="/" element={<HomePage />} />
              <Route path="/products" element={<ProductsPage />} />
              <Route path="/products/:id" element={<ProductDetailPage />} />
              <Route path="/cart" element={<CartPage />} />
              <Route
                path="/checkout"
                element={
                  <RequireBuyerAuth>
                    <CheckoutPage />
                  </RequireBuyerAuth>
                }
              />
              <Route
                path="/orders"
                element={
                  <RequireBuyerAuth>
                    <MyOrdersPage />
                  </RequireBuyerAuth>
                }
              />
              <Route
                path="/orders/:id"
                element={
                  <RequireBuyerAuth>
                    <OrderDetailPage />
                  </RequireBuyerAuth>
                }
              />
              <Route
                path="/chat"
                element={
                  <RequireBuyerAuth>
                    <ChatPage />
                  </RequireBuyerAuth>
                }
              />
              <Route path="/login" element={<LoginPage />} />
              <Route path="/register" element={<RegisterPage />} />
              <Route path="/forgot-password" element={<ForgotPasswordPage />} />
              <Route path="/reset-password" element={<ResetPasswordPage />} />
              <Route path="/privacy" element={<PrivacyPolicyPage />} />
              <Route path="/terms" element={<TermsConditionsPage />} />
              <Route path="/faqs" element={<FaqPage />} />
            </Route>

            {/* ==================================================== */}
            {/* 2. SELLER PANEL                                      */}
            {/* ==================================================== */}
            <Route path="/seller/login" element={<SellerLoginPage />} />
            <Route path="/seller/register" element={<SellerRegisterPage />} />
            <Route path="/seller/forgot-password" element={<SellerForgotPasswordPage />} />
            <Route path="/seller/reset-password" element={<SellerResetPasswordPage />} />
            <Route path="/seller" element={<SellerLayout />}>
              <Route index element={<SellerDashboardPage />} />
              <Route path="products" element={<SellerProductsPage />} />
              <Route path="products/new" element={<SellerProductFormPage />} />
              <Route path="products/:id/edit" element={<SellerProductFormPage />} />
              <Route path="orders" element={<SellerOrdersPage />} />
              <Route path="orders/:id" element={<SellerOrderDetailPage />} />
              <Route path="messages" element={<SellerMessagesPage />} />
              <Route path="profile" element={<SellerProfilePage />} />
            </Route>

            {/* ==================================================== */}
            {/* 3. ADMIN PANEL                                       */}
            {/* ==================================================== */}
            <Route path="/admin/login" element={<AdminLoginPage />} />
            <Route path="/admin/forgot-password" element={<AdminForgotPasswordPage />} />
            <Route path="/admin/reset-password" element={<AdminResetPasswordPage />} />
            <Route path="/admin" element={<AdminLayout />}>
              <Route index element={<AdminDashboardPage />} />
              <Route path="sellers" element={<AdminSellersPage />} />
              <Route path="products" element={<AdminProductsPage />} />
              <Route path="orders" element={<AdminOrdersPage />} />
              <Route path="users" element={<AdminUsersPage />} />
            </Route>

            {/* Fallback */}
            <Route
              path="*"
              element={
                <Navigate
                  to={isSellerPort ? '/seller' : isAdminPort ? '/admin' : '/'}
                  replace
                />
              }
            />
          </Routes>
        </CartProvider>
      </LanguageProvider>
    </AuthProvider>
  );
}

export default App;
