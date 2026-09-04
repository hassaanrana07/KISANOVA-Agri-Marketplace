import React, { useState, useEffect } from 'react';
import { Users, CheckCircle, Ban, ShieldCheck, Search, Filter } from 'lucide-react';
import api from '../../services/api';

const AdminUsersPage = () => {
  const [users, setUsers] = useState([]);
  const [roleFilter, setRoleFilter] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);
  const [notice, setNotice] = useState('');

  const fetchUsers = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (roleFilter) params.set('role', roleFilter);
      if (statusFilter) params.set('status', statusFilter);
      if (search) params.set('search', search);

      const res = await api.get(`/admin/users?${params.toString()}`);
      if (res.data.success) {
        setUsers(res.data.data);
      }
    } catch (err) {
      console.error('Error fetching users:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchUsers();
  }, [roleFilter, statusFilter]);

  const handleToggleStatus = async (userId, currentStatus) => {
    const nextStatus = currentStatus === 'ACTIVE' ? 'SUSPENDED' : 'ACTIVE';
    try {
      const res = await api.put(`/admin/users/${userId}/status`, { status: nextStatus });
      if (res.data.success) {
        setNotice(`User status updated to ${nextStatus}.`);
        setTimeout(() => setNotice(''), 3000);
        fetchUsers();
      }
    } catch (err) {
      alert(err.response?.data?.message || 'Failed to update user status.');
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl sm:text-3xl font-black text-white">Marketplace User Directory</h1>
        <p className="text-xs sm:text-sm text-slate-400 mt-1">
          Supervise buyer accounts and registered agricultural farmer profiles.
        </p>
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
            fetchUsers();
          }}
          className="relative w-full sm:w-80"
        >
          <Search className="w-4 h-4 text-slate-500 absolute left-3 top-2.5" />
          <input
            type="text"
            placeholder="Search name or email..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full bg-slate-950 border border-slate-800 rounded-xl pl-9 pr-3 py-2 text-xs text-white placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-emerald-500"
          />
        </form>

        <div className="flex items-center gap-3 self-end sm:self-auto">
          <div className="flex items-center gap-2">
            <span className="text-xs text-slate-400 font-medium">Role:</span>
            <select
              value={roleFilter}
              onChange={(e) => setRoleFilter(e.target.value)}
              className="bg-slate-950 border border-slate-800 text-xs rounded-xl px-3 py-2 font-medium text-slate-300 focus:outline-none focus:ring-2 focus:ring-emerald-500"
            >
              <option value="">All Roles</option>
              <option value="BUYER">Buyer</option>
              <option value="SELLER">Seller</option>
              <option value="ADMIN">Admin</option>
            </select>
          </div>

          <div className="flex items-center gap-2">
            <span className="text-xs text-slate-400 font-medium">Account:</span>
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="bg-slate-950 border border-slate-800 text-xs rounded-xl px-3 py-2 font-medium text-slate-300 focus:outline-none focus:ring-2 focus:ring-emerald-500"
            >
              <option value="">All Accounts</option>
              <option value="ACTIVE">Active</option>
              <option value="SUSPENDED">Suspended</option>
            </select>
          </div>
        </div>
      </div>

      {/* Users Table */}
      <div className="bg-slate-900 border border-slate-800 rounded-3xl shadow-xl overflow-hidden">
        {loading ? (
          <div className="py-20 flex items-center justify-center">
            <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-emerald-400"></div>
          </div>
        ) : users.length === 0 ? (
          <div className="p-12 text-center text-xs text-slate-400">
            No users found matching query.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs text-slate-300">
              <thead className="bg-slate-950/60 text-slate-400 font-bold uppercase tracking-wider text-[10px]">
                <tr>
                  <th className="py-3.5 px-6">Name</th>
                  <th className="py-3.5 px-6">Email</th>
                  <th className="py-3.5 px-6">Role</th>
                  <th className="py-3.5 px-6">Associated Farm</th>
                  <th className="py-3.5 px-6">Joined Date</th>
                  <th className="py-3.5 px-6">Status</th>
                  <th className="py-3.5 px-6 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800">
                {users.map((u) => (
                  <tr key={u.id} className="hover:bg-slate-800/50 transition-colors">
                    <td className="py-4 px-6 font-bold text-white">
                      {u.name}
                    </td>
                    <td className="py-4 px-6 text-slate-400">
                      {u.email}
                    </td>
                    <td className="py-4 px-6">
                      <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                        u.role === 'ADMIN'
                          ? 'bg-purple-500/20 text-purple-300'
                          : u.role === 'SELLER'
                          ? 'bg-blue-500/20 text-blue-300'
                          : 'bg-emerald-500/20 text-emerald-300'
                      }`}>
                        {u.role}
                      </span>
                    </td>
                    <td className="py-4 px-6 text-slate-300 font-medium">
                      {u.farm_name || '—'}
                    </td>
                    <td className="py-4 px-6 text-slate-500">
                      {new Date(u.created_at).toLocaleDateString()}
                    </td>
                    <td className="py-4 px-6">
                      <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold ${
                        u.status === 'ACTIVE'
                          ? 'bg-emerald-500/20 text-emerald-300'
                          : 'bg-red-500/20 text-red-300'
                      }`}>
                        {u.status}
                      </span>
                    </td>
                    <td className="py-4 px-6 text-right">
                      {u.role !== 'ADMIN' && (
                        <button
                          onClick={() => handleToggleStatus(u.id, u.status)}
                          className={`px-3 py-1 rounded-lg text-xs font-bold transition-colors ${
                            u.status === 'ACTIVE'
                              ? 'bg-slate-800 hover:bg-red-900/40 text-red-300 border border-slate-700'
                              : 'bg-slate-800 hover:bg-emerald-900/40 text-emerald-300 border border-slate-700'
                          }`}
                        >
                          {u.status === 'ACTIVE' ? 'Suspend' : 'Activate'}
                        </button>
                      )}
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

export default AdminUsersPage;
