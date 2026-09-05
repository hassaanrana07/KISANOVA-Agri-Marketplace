import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { ShieldCheck, Mail, Phone, ArrowRight, AlertCircle, CheckCircle, ArrowLeft, ExternalLink } from 'lucide-react';
import api from '../../services/api';

const AdminForgotPasswordPage = () => {
  const [identifier, setIdentifier] = useState('');
  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [successMessage, setSuccessMessage] = useState('');
  const [devResetToken, setDevResetToken] = useState(null);

  const isPort5174 = typeof window !== 'undefined' && window.location.port === '5174';
  const loginUrl = isPort5174 ? '/login' : '/admin/login';
  const resetUrl = isPort5174 ? '/reset-password' : '/admin/reset-password';

  const handleRequestReset = async (e) => {
    e.preventDefault();
    setErrorMessage('');
    setSuccessMessage('');
    setDevResetToken(null);

    if (!identifier.trim()) {
      setErrorMessage('Please enter your registered administrator email address.');
      return;
    }

    setLoading(true);
    try {
      const res = await api.post('/auth/forgot-password', {
        identifier: identifier.trim(),
        portalRole: 'ADMIN'
      });

      if (res.data.success) {
        setSuccessMessage(res.data.message || 'If an administrator account exists, a secure reset token has been generated.');
        if (res.data.isDevelopment && res.data.devResetToken) {
          setDevResetToken(res.data.devResetToken);
        }
      } else {
        setErrorMessage(res.data.message || 'Failed to request password reset.');
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
    <div className="min-h-screen bg-slate-50 flex items-center justify-center px-4 py-12">
      <div className="max-w-md w-full bg-white border border-slate-200 rounded-3xl p-8 shadow-xl space-y-6">
        {/* Header Branding */}
        <div className="text-center space-y-2">
          <div className="w-12 h-12 rounded-2xl bg-emerald-600 text-white flex items-center justify-center mx-auto shadow-lg shadow-emerald-600/20">
            <ShieldCheck className="w-7 h-7" />
          </div>
          <div>
            <span className="text-[11px] uppercase tracking-widest font-black text-emerald-700 block">
              AGRILINK · GOVERNANCE CONSOLE
            </span>
            <h2 className="text-2xl font-black tracking-tight text-slate-900 mt-1">
              Admin Password Reset
            </h2>
          </div>
          <p className="text-xs text-slate-500 leading-relaxed">
            Enter your authorized administrative email address to generate a secure password reset token.
          </p>
        </div>

        {/* Feedback Alerts */}
        {errorMessage && (
          <div className="p-4 rounded-xl bg-red-50 border border-red-200 text-red-700 text-xs font-semibold flex items-start gap-2.5">
            <AlertCircle className="w-4 h-4 text-red-500 flex-shrink-0 mt-0.5" />
            <span>{errorMessage}</span>
          </div>
        )}

        {successMessage && (
          <div className="p-4 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs font-semibold space-y-2.5">
            <div className="flex items-start gap-2.5">
              <CheckCircle className="w-4 h-4 text-emerald-600 flex-shrink-0 mt-0.5" />
              <span>{successMessage}</span>
            </div>

            {/* Development Quick Navigation */}
            {devResetToken && (
              <div className="mt-3 pt-3 border-t border-emerald-200">
                <span className="text-[10px] font-bold text-amber-800 bg-amber-100 px-2 py-0.5 rounded block mb-1.5 w-fit">
                  DEVELOPMENT MODE ACTIVE
                </span>
                <Link
                  to={`${resetUrl}?token=${devResetToken}`}
                  className="w-full py-2 px-3 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs font-bold transition-colors inline-flex items-center justify-center gap-1.5 shadow-sm"
                >
                  <ExternalLink className="w-3.5 h-3.5" />
                  <span>Open Admin Reset Password Form</span>
                </Link>
              </div>
            )}
          </div>
        )}

        {/* Request Form */}
        <form onSubmit={handleRequestReset} className="space-y-4">
          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1.5" htmlFor="admin-identifier">
              Administrator Email
            </label>
            <div className="relative">
              <input
                id="admin-identifier"
                type="text"
                required
                value={identifier}
                onChange={(e) => setIdentifier(e.target.value)}
                placeholder="e.g. admin@agrilink.com"
                className="w-full bg-slate-50 border border-slate-200 rounded-xl pl-10 pr-3 py-3 text-xs text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:bg-white font-medium transition-all"
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
            className="w-full py-3 bg-emerald-600 hover:bg-emerald-700 disabled:bg-slate-300 text-white rounded-xl text-xs font-bold shadow-md shadow-emerald-600/20 transition-colors flex items-center justify-center gap-2 cursor-pointer disabled:cursor-not-allowed"
          >
            <span>{loading ? 'Processing Request...' : 'Generate Reset Token'}</span>
            <ArrowRight className="w-4 h-4" />
          </button>
        </form>

        {/* Back Link */}
        <div className="text-center pt-2 border-t border-slate-100">
          <Link
            to={loginUrl}
            className="inline-flex items-center gap-1.5 text-xs font-bold text-slate-600 hover:text-emerald-700 transition-colors"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            <span>Return to Admin Sign In</span>
          </Link>
        </div>
      </div>
    </div>
  );
};

export default AdminForgotPasswordPage;
