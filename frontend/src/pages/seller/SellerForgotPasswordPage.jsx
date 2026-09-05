import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Sprout, Mail, Phone, ArrowRight, AlertCircle, CheckCircle, ArrowLeft } from 'lucide-react';
import api from '../../services/api';

const SellerForgotPasswordPage = () => {
  const [identifier, setIdentifier] = useState('');
  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [successMessage, setSuccessMessage] = useState('');

  const navigate = useNavigate();
  const isPort5140 = typeof window !== 'undefined' && window.location.port === '5140';
  const loginUrl = isPort5140 ? '/login' : '/seller/login';
  const resetUrl = isPort5140 ? '/reset-password' : '/seller/reset-password';

  const handleRequestOtp = async (e) => {
    e.preventDefault();
    setErrorMessage('');
    setSuccessMessage('');

    if (!identifier.trim()) {
      setErrorMessage('Please enter your registered email address or mobile phone number.');
      return;
    }

    setLoading(true);
    try {
      const res = await api.post('/auth/forgot-password', {
        identifier: identifier.trim(),
        portalRole: 'SELLER'
      });

      if (res.data.success) {
        setSuccessMessage(res.data.message || 'Verification code dispatched successfully.');
        setTimeout(() => {
          navigate(`${resetUrl}?identifier=${encodeURIComponent(identifier.trim())}`);
        }, 1500);
      } else {
        setErrorMessage(res.data.message || 'Failed to request verification code.');
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
            Enter your registered farm email or phone number. We will dispatch a secure 6-digit verification code.
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

        {/* Request Form */}
        <form onSubmit={handleRequestOtp} className="space-y-4">
          <div>
            <label className="block text-xs font-bold text-slate-300 mb-1.5" htmlFor="seller-identifier">
              Registered Email or Phone Number
            </label>
            <div className="relative">
              <input
                id="seller-identifier"
                type="text"
                required
                value={identifier}
                onChange={(e) => setIdentifier(e.target.value)}
                placeholder="e.g. farmer@domain.com or 03001234567"
                className="w-full bg-slate-900 border border-slate-700 rounded-xl pl-10 pr-3 py-3 text-xs text-white placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-agro-500 font-medium transition-all"
              />
              <div className="absolute left-3.5 top-3.5 text-slate-400">
                {identifier.includes('@') ? (
                  <Mail className="w-4 h-4" />
                ) : (
                  <Phone className="w-4 h-4" />
                )}
              </div>
            </div>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full py-3 bg-agro-600 hover:bg-agro-500 disabled:bg-slate-700 text-white rounded-xl text-xs font-bold shadow-lg shadow-agro-600/30 transition-colors flex items-center justify-center gap-2 cursor-pointer disabled:cursor-not-allowed"
          >
            <span>{loading ? 'Transmitting Code...' : 'Dispatch Verification Code'}</span>
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
