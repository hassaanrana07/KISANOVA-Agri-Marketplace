import React, { useState, useEffect } from 'react';
import { Users, CheckCircle, XCircle, Ban, AlertTriangle, Search, Filter } from 'lucide-react';
import api from '../../services/api';

const AdminSellersPage = () => {
  const [sellers, setSellers] = useState([]);
  const [statusFilter, setStatusFilter] = useState('');
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);
  const [notice, setNotice] = useState('');

  const fetchSellers = async () => {
    setLoading(true);
    try {
      let url = '/admin/sellers';
      const params = new URLSearchParams();
      if (statusFilter) params.set('status', statusFilter);
      if (search) params.set('search', search);
      const res = await api.get(`${url}?${params.toString()}`);
      if (res.data.success) {
        setSellers(res.data.data);
      }
    } catch (err) {
      console.error('Error fetching sellers:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSellers();
  }, [statusFilter]);

  const handleUpdateStatus = async (sellerId, newStatus) => {
    try {
      const res = await api.put(`/admin/sellers/${sellerId}/approval`, { status: newStatus });
      if (res.data.success) {
        setNotice(`Seller status changed to ${newStatus}.`);
        setTimeout(() => setNotice(''), 3000);
        fetchSellers();
      }
    } catch (err) {
      alert(err.response?.data?.message || 'Failed to update seller status.');
    }
  };

  const getStatusBadge = (status) => {
    switch (status) {
      case 'APPROVED':
        return (
          <span className="px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-emerald-500/20 text-emerald-300 flex items-center gap-1 w-fit">
            <CheckCircle className="w-3 h-3" />
            APPROVED
          </span>
        );
      case 'PENDING':
        return (
          <span className="px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-amber-500/20 text-amber-300 flex items-center gap-1 w-fit">
            <AlertTriangle className="w-3 h-3" />
            PENDING AUDIT
          </span>
        );
      case 'SUSPENDED':
        return (
          <span className="px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-purple-500/20 text-purple-300 flex items-center gap-1 w-fit">
            <Ban className="w-3 h-3" />
            SUSPENDED
          </span>
        );
      default:
        return (
          <span className="px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-red-500/20 text-red-300 flex items-center gap-1 w-fit">
            <XCircle className="w-3 h-3" />
            REJECTED
          </span>
        );
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-black text-white">Farmer & Seller Moderation</h1>
          <p className="text-xs sm:text-sm text-slate-400 mt-1">
            Audit farm verification credentials, grant marketplace authorization, or suspend non-compliant producers.
          </p>
        </div>
      </div>

      {notice && (
        <div className="p-3.5 rounded-2xl bg-emerald-500/20 border border-emerald-500/40 text-emerald-300 text-xs font-semibold">
          {notice}
        </div>
      )}

      {/* Filter and Search Bar */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 flex flex-col sm:flex-row items-center justify-between gap-3 shadow-sm">
        <form
          onSubmit={(e) => {
            e.preventDefault();
            fetchSellers();
          }}
          className="relative w-full sm:w-80"
        >
          <Search className="w-4 h-4 text-slate-500 absolute left-3 top-2.5" />
          <input
            type="text"
            placeholder="Search farm name or email..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full bg-slate-950 border border-slate-800 rounded-xl pl-9 pr-3 py-2 text-xs text-white placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-emerald-500"
          />
        </form>

        <div className="flex items-center gap-2 self-end sm:self-auto">
          <span className="text-xs text-slate-400 font-medium">Status:</span>
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="bg-slate-950 border border-slate-800 text-xs rounded-xl px-3 py-2 font-medium text-slate-300 focus:outline-none focus:ring-2 focus:ring-emerald-500"
          >
            <option value="">All Verification States</option>
            <option value="PENDING">Pending Audit</option>
            <option value="APPROVED">Approved</option>
            <option value="SUSPENDED">Suspended</option>
            <option value="REJECTED">Rejected</option>
          </select>
        </div>
      </div>

      {/* Sellers Table */}
      <div className="bg-slate-900 border border-slate-800 rounded-3xl shadow-xl overflow-hidden">
        {loading ? (
          <div className="py-20 flex items-center justify-center">
            <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-emerald-400"></div>
          </div>
        ) : sellers.length === 0 ? (
          <div className="p-12 text-center text-xs text-slate-400">
            No seller applications found.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs text-slate-300">
              <thead className="bg-slate-950/60 text-slate-400 font-bold uppercase tracking-wider text-[10px]">
                <tr>
                  <th className="py-3.5 px-6">Farm / Business</th>
                  <th className="py-3.5 px-6">Contact / Manager</th>
                  <th className="py-3.5 px-6">Address</th>
                  <th className="py-3.5 px-6">Products Listed</th>
                  <th className="py-3.5 px-6">Approval Status</th>
                  <th className="py-3.5 px-6 text-right">Moderation Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800">
                {sellers.map((s) => (
                  <tr key={s.id} className="hover:bg-slate-800/50 transition-colors">
                    <td className="py-4 px-6">
                      <p className="font-bold text-white text-sm">{s.farm_name}</p>
                      {s.bio && <p className="text-[11px] text-slate-400 truncate max-w-xs italic mt-0.5">"{s.bio}"</p>}
                    </td>
                    <td className="py-4 px-6">
                      <p className="font-medium text-white">{s.contact_name}</p>
                      <p className="text-[11px] text-slate-400">{s.contact_email}</p>
                      <p className="text-[11px] text-slate-500">{s.phone}</p>
                    </td>
                    <td className="py-4 px-6 text-slate-400 truncate max-w-xs">
                      {s.address}
                    </td>
                    <td className="py-4 px-6">
                      <span className="font-bold text-white">{s.approved_products}</span>
                      <span className="text-slate-500"> / {s.total_products} total</span>
                    </td>
                    <td className="py-4 px-6">
                      {getStatusBadge(s.approval_status)}
                    </td>
                    <td className="py-4 px-6 text-right">
                      <div className="flex items-center justify-end gap-1.5">
                        {s.approval_status !== 'APPROVED' && (
                          <button
                            onClick={() => handleUpdateStatus(s.id, 'APPROVED')}
                            className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg text-xs font-bold transition-colors"
                          >
                            Approve
                          </button>
                        )}
                        {s.approval_status === 'PENDING' && (
                          <button
                            onClick={() => handleUpdateStatus(s.id, 'REJECTED')}
                            className="px-3 py-1.5 bg-red-600/80 hover:bg-red-600 text-white rounded-lg text-xs font-bold transition-colors"
                          >
                            Reject
                          </button>
                        )}
                        {s.approval_status === 'APPROVED' && (
                          <button
                            onClick={() => handleUpdateStatus(s.id, 'SUSPENDED')}
                            className="px-3 py-1.5 bg-slate-800 hover:bg-red-900/40 text-red-300 border border-slate-700 rounded-lg text-xs font-bold transition-colors"
                          >
                            Suspend
                          </button>
                        )}
                        {s.approval_status === 'SUSPENDED' && (
                          <button
                            onClick={() => handleUpdateStatus(s.id, 'APPROVED')}
                            className="px-3 py-1.5 bg-slate-800 hover:bg-emerald-900/40 text-emerald-300 border border-slate-700 rounded-lg text-xs font-bold transition-colors"
                          >
                            Reactivate
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
};

export default AdminSellersPage;
