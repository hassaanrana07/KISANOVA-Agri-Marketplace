import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { Sprout, Mail, ArrowRight, AlertCircle, CheckCircle, ArrowLeft, ExternalLink } from 'lucide-react';
import api from '../../services/api';

const SellerForgotPasswordPage = () => {
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [successMessage, setSuccessMessage] = useState('');
  const [devResetToken, setDevResetToken] = useState(null);

  const isPort5140 = typeof window !== 'undefined' && window.location.port === '5140';
  const loginUrl = isPort5140 ? '/login' : '/seller/login';
  const resetUrl = isPort5140 ? '/reset-password' : '/seller/reset-password';

  const handleRequestReset = async (e) => {
    e.preventDefault();
    setErrorMessage('');
    setSuccessMessage('');
    setDevResetToken(null);

    if (!email.trim()) {
      setErrorMessage('Please enter your registered farm seller email address.');
      return;
    }

    setLoading(true);
    try {
      const res = await api.post('/auth/forgot-password', {
        email: email.trim(),
        portalRole: 'SELLER'
      });

      if (res.data.success) {
        setSuccessMessage(res.data.message || 'If an account exists, a password reset link has been generated.');
        if (res.data.isDevelopment && res.data.devResetToken) {
          setDevResetToken(res.data.devResetToken);
        }
      } else {
        setErrorMessage(res.data.message || 'Failed to request reset link.');
      }
    } catch (err) {
      setErrorMessage(
        err.response?.data?.message || 'Unable to connect to the server. Please try again.'
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-900 flex items-center justify-center px-4 py-12">
      <div className="max-w-md w-full bg-slate-800 border border-slate-700 rounded-3xl p-8 shadow-2xl space-y-6 text-white">
        {/* Portal Branding */}
        <div className="text-center space-y-2">
          <div className="w-12 h-12 rounded-2xl bg-agro-600 text-white flex items-center justify-center mx-auto shadow-lg shadow-agro-600/30">
            <Sprout className="w-7 h-7" />
          </div>
          <div>
            <span className="text-[11px] uppercase tracking-widest font-black text-agro-400 block">
              AGRILINK · SELLER PORTAL
            </span>
            <h2 className="text-2xl font-black tracking-tight text-white mt-1">
              Reset Seller Password
            </h2>
          </div>
          <p className="text-xs text-slate-400 leading-relaxed">
            Enter your registered farm email address to generate a secure password reset authorization token.
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
          <div className="p-4 rounded-xl bg-emerald-500/20 border border-emerald-500/40 text-emerald-300 text-xs font-semibold space-y-2.5">
            <div className="flex items-start gap-2.5">
              <CheckCircle className="w-4 h-4 flex-shrink-0 mt-0.5 text-emerald-400" />
              <span>{successMessage}</span>
            </div>

            {/* Development Mode Direct Access Link */}
            {devResetToken && (
              <div className="mt-3 pt-3 border-t border-emerald-500/30">
                <span className="text-[10px] font-bold text-amber-300 bg-amber-900/50 px-2 py-0.5 rounded block mb-1.5 w-fit">
                  DEVELOPMENT MODE DETECTED
                </span>
                <Link
                  to={`${resetUrl}?token=${devResetToken}`}
                  className="w-full py-2 px-3 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg text-xs font-bold transition-colors inline-flex items-center justify-center gap-1.5 shadow-sm"
                >
                  <ExternalLink className="w-3.5 h-3.5" />
                  <span>Open Seller Reset Password Form</span>
                </Link>
              </div>
            )}
          </div>
        )}

        {/* Request Form */}
        <form onSubmit={handleRequestReset} className="space-y-4">
          <div>
            <label className="block text-xs font-bold text-slate-300 mb-1.5" htmlFor="seller-email">
              Registered Farm Email Address
            </label>
            <div className="relative">
              <input
                id="seller-email"
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="e.g. farmer@domain.com"
                className="w-full bg-slate-900 border border-slate-700 rounded-xl pl-10 pr-3 py-3 text-xs text-white placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-agro-500 font-medium transition-all"
              />
              <div className="absolute left-3.5 top-3.5 text-slate-400">
                <Mail className="w-4 h-4" />
              </div>
            </div>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full py-3 bg-agro-600 hover:bg-agro-500 disabled:bg-slate-700 text-white rounded-xl text-xs font-bold shadow-lg shadow-agro-600/30 transition-colors flex items-center justify-center gap-2 cursor-pointer disabled:cursor-not-allowed"
          >
            <span>{loading ? 'Processing...' : 'Generate Reset Link'}</span>
            <ArrowRight className="w-4 h-4" />
          </button>
        </form>

        {/* Navigation back to Seller Login */}
        <div className="text-center pt-2 border-t border-slate-700">
          <Link
            to={loginUrl}
            className="inline-flex items-center gap-1.5 text-xs font-bold text-agro-400 hover:text-agro-300 transition-colors"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            <span>Back to Seller Sign In</span>
          </Link>
        </div>
      </div>
    </div>
  );
};

export default SellerForgotPasswordPage;
