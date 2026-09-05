import React, { useState } from 'react';
import { useSearchParams, useNavigate, Link } from 'react-router-dom';
import { Sprout, Lock, CheckCircle, AlertCircle, ArrowRight, ArrowLeft, KeyRound, Eye, EyeOff } from 'lucide-react';
import api from '../../services/api';

const SellerResetPasswordPage = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();

  const isPort5140 = typeof window !== 'undefined' && window.location.port === '5140';
  const loginUrl = isPort5140 ? '/login' : '/seller/login';
  const forgotUrl = isPort5140 ? '/forgot-password' : '/seller/forgot-password';

  const [identifier, setIdentifier] = useState(searchParams.get('identifier') || '');
  const [otp, setOtp] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [successMessage, setSuccessMessage] = useState('');

  const handleResetPassword = async (e) => {
    e.preventDefault();
    setErrorMessage('');
    setSuccessMessage('');

    if (!identifier.trim() || !otp.trim()) {
      setErrorMessage('Please provide your registered identifier and 6-digit verification code.');
      return;
    }

    if (newPassword.length < 6) {
      setErrorMessage('New password must be at least 6 characters long.');
      return;
    }

    if (newPassword !== confirmPassword) {
      setErrorMessage('Passwords do not match. Please re-enter.');
      return;
    }

    setLoading(true);
    try {
      const res = await api.post('/auth/reset-password', {
        identifier: identifier.trim(),
        otp: otp.trim(),
        newPassword
      });

      if (res.data.success) {
        setSuccessMessage(res.data.message || 'Password successfully updated.');
        setTimeout(() => {
          navigate(loginUrl, {
            state: { message: 'Password reset successful! Please sign in with your new password.' }
          });
        }, 1800);
      } else {
        setErrorMessage(res.data.message || 'Verification failed. Please check the code.');
      }
    } catch (err) {
      setErrorMessage(
        err.response?.data?.message || 'Failed to reset password. Please check your verification code.'
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-900 flex items-center justify-center px-4 py-12">
      <div className="max-w-md w-full bg-slate-800 border border-slate-700 rounded-3xl p-8 shadow-2xl space-y-6 text-white">
        {/* Header */}
        <div className="text-center space-y-2">
          <div className="w-12 h-12 rounded-2xl bg-agro-600 text-white flex items-center justify-center mx-auto shadow-lg shadow-agro-600/30">
            <KeyRound className="w-7 h-7" />
          </div>
          <div>
            <span className="text-[11px] uppercase tracking-widest font-black text-agro-400 block">
              AGRILINK · SELLER PORTAL
            </span>
            <h2 className="text-2xl font-black tracking-tight text-white mt-1">
              Set New Password
            </h2>
          </div>
          <p className="text-xs text-slate-400">
            Enter the 6-digit code dispatched to your phone or email, along with your new password.
          </p>
        </div>

        {/* Feedback alerts */}
        {errorMessage && (
          <div className="p-4 rounded-xl bg-red-500/20 border border-red-500/40 text-red-300 text-xs font-semibold flex items-start gap-2.5">
            <AlertCircle className="w-4 h-4 flex-shrink-0 mt-0.5" />
            <span>{errorMessage}</span>
          </div>
        )}

        {successMessage && (
          <div className="p-4 rounded-xl bg-emerald-500/20 border border-emerald-500/40 text-emerald-300 text-xs font-semibold flex items-start gap-2.5">
            <CheckCircle className="w-4 h-4 flex-shrink-0 mt-0.5" />
            <span>{successMessage}</span>
          </div>
        )}

        {/* Reset Form */}
        <form onSubmit={handleResetPassword} className="space-y-4">
          <div>
            <label className="block text-xs font-bold text-slate-300 mb-1.5" htmlFor="seller-reset-identifier">
              Registered Email or Phone
            </label>
            <input
              id="seller-reset-identifier"
              type="text"
              required
              value={identifier}
              onChange={(e) => setIdentifier(e.target.value)}
              placeholder="e.g. farmer@domain.com or 03001234567"
              className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3.5 py-3 text-xs text-white placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-agro-500 font-medium"
            />
          </div>

          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label className="text-xs font-bold text-slate-300" htmlFor="seller-otp">
                6-Digit Verification Code
              </label>
              <Link to={forgotUrl} className="text-[11px] font-semibold text-agro-400 hover:underline">
                Resend Code
              </Link>
            </div>
            <input
              id="seller-otp"
              type="text"
              maxLength={6}
              required
              value={otp}
              onChange={(e) => setOtp(e.target.value.replace(/\D/g, ''))}
              placeholder="123456"
              className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3.5 py-3 text-center text-lg tracking-widest font-mono text-white placeholder:text-slate-600 focus:outline-none focus:ring-2 focus:ring-agro-500 font-bold"
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-300 mb-1.5" htmlFor="seller-new-password">
              New Password
            </label>
            <div className="relative">
              <input
                id="seller-new-password"
                type={showPassword ? 'text' : 'password'}
                required
                minLength={6}
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                placeholder="At least 6 characters"
                className="w-full bg-slate-900 border border-slate-700 rounded-xl pl-3.5 pr-10 py-3 text-xs text-white placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-agro-500 font-medium"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3 top-3 text-slate-400 hover:text-slate-200"
                tabIndex={-1}
              >
                {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-300 mb-1.5" htmlFor="seller-confirm-password">
              Confirm New Password
            </label>
            <div className="relative">
              <input
                id="seller-confirm-password"
                type={showConfirmPassword ? 'text' : 'password'}
                required
                minLength={6}
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                placeholder="Re-enter new password"
                className="w-full bg-slate-900 border border-slate-700 rounded-xl pl-3.5 pr-10 py-3 text-xs text-white placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-agro-500 font-medium"
              />
              <button
                type="button"
                onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                className="absolute right-3 top-3 text-slate-400 hover:text-slate-200"
                tabIndex={-1}
              >
                {showConfirmPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full py-3 bg-agro-600 hover:bg-agro-500 disabled:bg-slate-700 text-white rounded-xl text-xs font-bold shadow-lg shadow-agro-600/30 transition-colors flex items-center justify-center gap-2 cursor-pointer disabled:cursor-not-allowed"
          >
            <span>{loading ? 'Updating Password...' : 'Save New Password & Sign In'}</span>
            <ArrowRight className="w-4 h-4" />
          </button>
        </form>

        <div className="text-center pt-2 border-t border-slate-700">
          <Link
            to={loginUrl}
            className="inline-flex items-center gap-1.5 text-xs font-bold text-slate-400 hover:text-white transition-colors"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            <span>Return to Seller Sign In</span>
          </Link>
        </div>
      </div>
    </div>
  );
};

export default SellerResetPasswordPage;
