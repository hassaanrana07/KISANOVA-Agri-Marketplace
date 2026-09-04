import React, { useState, useEffect } from 'react';
import { Building, Phone, MapPin, CheckCircle, AlertTriangle, Save } from 'lucide-react';
import api from '../../services/api';
import { useAuth } from '../../context/AuthContext';

const SellerProfilePage = () => {
  const { seller, updateSeller } = useAuth();
  const [farmName, setFarmName] = useState(seller?.farm_name || '');
  const [phone, setPhone] = useState(seller?.phone || '');
  const [address, setAddress] = useState(seller?.address || '');
  const [bio, setBio] = useState(seller?.bio || '');
  const [loading, setLoading] = useState(false);
  const [notice, setNotice] = useState('');

  useEffect(() => {
    if (seller) {
      setFarmName(seller.farm_name);
      setPhone(seller.phone);
      setAddress(seller.address);
      setBio(seller.bio || '');
    }
  }, [seller]);

  const handleUpdate = async (e) => {
    e.preventDefault();
    setLoading(true);
    setNotice('');
    try {
      const res = await api.put('/seller/profile', {
        farm_name: farmName,
        phone,
        address,
        bio
      });
      if (res.data.success) {
        updateSeller({ ...seller, farm_name: farmName, phone, address, bio });
        setNotice('Farm profile updated successfully.');
        setTimeout(() => setNotice(''), 3000);
      }
    } catch (err) {
      alert('Failed to update profile.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <div>
        <h1 className="text-2xl sm:text-3xl font-black text-slate-900">Farm Profile & Credentials</h1>
        <p className="text-xs sm:text-sm text-slate-500 mt-1">
          Maintain your commercial farm address, contact numbers, and public bio.
        </p>
      </div>

      {notice && (
        <div className="p-3.5 rounded-2xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs font-semibold flex items-center gap-2">
          <CheckCircle className="w-4 h-4 flex-shrink-0" />
          <span>{notice}</span>
        </div>
      )}

      {/* Verification Status Card */}
      <div className="bg-white rounded-3xl border border-slate-200 p-6 shadow-sm flex items-center justify-between">
        <div>
          <span className="text-xs text-slate-400 font-bold uppercase tracking-wider">Marketplace Verification</span>
          <p className="text-sm font-black text-slate-900 mt-0.5">
            Status: {seller?.approval_status === 'APPROVED' ? 'Approved & Certified' : 'Pending Verification'}
          </p>
        </div>
        {seller?.approval_status === 'APPROVED' ? (
          <span className="px-3 py-1 rounded-full text-xs font-bold bg-emerald-100 text-emerald-800 flex items-center gap-1">
            <CheckCircle className="w-3.5 h-3.5" />
            Verified
          </span>
        ) : (
          <span className="px-3 py-1 rounded-full text-xs font-bold bg-amber-100 text-amber-800 flex items-center gap-1">
            <AlertTriangle className="w-3.5 h-3.5" />
            Pending Review
          </span>
        )}
      </div>

      {/* Form Card */}
      <form onSubmit={handleUpdate} className="bg-white rounded-3xl border border-slate-200 p-6 sm:p-8 shadow-sm space-y-4">
        <div>
          <label className="text-xs font-bold text-slate-700 block mb-1">Farm / Business Name</label>
          <input
            type="text"
            required
            value={farmName}
            onChange={(e) => setFarmName(e.target.value)}
            className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5 text-xs focus:outline-none focus:ring-2 focus:ring-agro-500 font-medium"
          />
        </div>

        <div>
          <label className="text-xs font-bold text-slate-700 block mb-1">Contact Phone</label>
          <input
            type="tel"
            required
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
            className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5 text-xs focus:outline-none focus:ring-2 focus:ring-agro-500 font-medium"
          />
        </div>

        <div>
          <label className="text-xs font-bold text-slate-700 block mb-1">Farm Facility / Shipping Address</label>
          <textarea
            rows={2}
            required
            value={address}
            onChange={(e) => setAddress(e.target.value)}
            className="w-full bg-slate-50 border border-slate-200 rounded-xl p-3 text-xs focus:outline-none focus:ring-2 focus:ring-agro-500 font-medium"
          />
        </div>

        <div>
          <label className="text-xs font-bold text-slate-700 block mb-1">Farm Bio & Agricultural Practices</label>
          <textarea
            rows={3}
            value={bio}
            onChange={(e) => setBio(e.target.value)}
            placeholder="Tell buyers about your harvesting standards, organic methods..."
            className="w-full bg-slate-50 border border-slate-200 rounded-xl p-3 text-xs focus:outline-none focus:ring-2 focus:ring-agro-500 font-medium"
          />
        </div>

        <div className="pt-4 border-t border-slate-100 flex justify-end">
          <button
            type="submit"
            disabled={loading}
            className="px-6 py-2.5 bg-agro-600 hover:bg-agro-700 disabled:bg-slate-300 text-white rounded-xl text-xs font-bold transition-colors flex items-center gap-1.5 shadow-sm"
          >
            <Save className="w-4 h-4" />
            <span>{loading ? 'Saving...' : 'Save Changes'}</span>
          </button>
        </div>
      </form>
    </div>
  );
};

export default SellerProfilePage;
