import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ShieldAlert, Lock, Mail, ArrowRight, AlertCircle, Sparkles } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';

const AdminLoginPage = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');

  const { login } = useAuth();
  const navigate = useNavigate();

  const handleLogin = async (e) => {
    e.preventDefault();
    setErrorMessage('');
    setLoading(true);

    try {
      const res = await login(email, password, 'ADMIN');
      if (res.success) {
        navigate('/admin');
      } else {
        setErrorMessage(res.message);
      }
    } catch (err) {
      setErrorMessage('Admin authentication failed.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-950 flex items-center justify-center px-4 py-12">
      <div className="max-w-md w-full bg-slate-900 border border-slate-800 rounded-3xl p-8 shadow-2xl space-y-6 text-white">
        <div className="text-center space-y-2">
          <div className="w-12 h-12 rounded-2xl bg-emerald-600 text-white flex items-center justify-center mx-auto shadow-lg shadow-emerald-500/20">
            <ShieldAlert className="w-7 h-7" />
          </div>
          <h2 className="text-2xl font-black tracking-wider text-white">KISANOVA ADMIN</h2>
          <p className="text-xs text-slate-400">
            Marketplace Governance & Quality Moderation Console
          </p>
        </div>

        {errorMessage && (
          <div className="p-3.5 rounded-xl bg-red-500/20 border border-red-500/40 text-red-300 text-xs font-semibold flex items-center gap-2">
            <AlertCircle className="w-4 h-4 flex-shrink-0" />
            <span>{errorMessage}</span>
          </div>
        )}

        <form onSubmit={handleLogin} className="space-y-4">
          <div>
            <label className="text-xs font-bold text-slate-300 block mb-1">Admin Identity Email</label>
            <div className="relative">
              <Mail className="w-4 h-4 text-slate-500 absolute left-3.5 top-3" />
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="admin@kisanova.com"
                className="w-full bg-slate-950 border border-slate-700 rounded-xl pl-10 pr-3 py-2.5 text-xs text-white focus:outline-none focus:ring-2 focus:ring-emerald-500 font-medium"
              />
            </div>
          </div>

          <div>
            <label className="text-xs font-bold text-slate-300 block mb-1">Administrative Secret</label>
            <div className="relative">
              <Lock className="w-4 h-4 text-slate-500 absolute left-3.5 top-3" />
              <input
                type="password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                className="w-full bg-slate-950 border border-slate-700 rounded-xl pl-10 pr-3 py-2.5 text-xs text-white focus:outline-none focus:ring-2 focus:ring-emerald-500 font-medium"
              />
            </div>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full py-3 bg-emerald-600 hover:bg-emerald-500 disabled:bg-slate-800 text-white rounded-xl text-xs font-bold shadow-lg shadow-emerald-600/30 transition-colors flex items-center justify-center gap-2"
          >
            <span>{loading ? 'Validating Token...' : 'Enter Governance Console'}</span>
            <ArrowRight className="w-4 h-4" />
          </button>
        </form>

        {/* Quick Demo Autofill */}
        <div className="pt-4 border-t border-slate-800">
          <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-2 flex items-center gap-1">
            <Sparkles className="w-3 h-3 text-emerald-400" />
            Quick Demo Autofill
          </p>
          <button
            type="button"
            onClick={() => {
              setEmail('admin@kisanova.com');
              setPassword('Admin@123456');
            }}
            className="w-full py-2 px-3 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-semibold text-left transition-colors flex justify-between items-center"
          >
            <span>Admin Demo Account</span>
            <span className="text-[10px] text-emerald-400">Fill Credentials</span>
          </button>
        </div>
      </div>
    </div>
  );
};

export default AdminLoginPage;
