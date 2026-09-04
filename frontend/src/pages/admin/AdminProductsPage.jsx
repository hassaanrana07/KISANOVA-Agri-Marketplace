import React, { useState, useEffect } from 'react';
import { Package, CheckCircle, XCircle, EyeOff, AlertTriangle, Search, Filter } from 'lucide-react';
import api from '../../services/api';

const AdminProductsPage = () => {
  const [products, setProducts] = useState([]);
  const [statusFilter, setStatusFilter] = useState('');
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);
  const [notice, setNotice] = useState('');

  const fetchProducts = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (statusFilter) params.set('status', statusFilter);
      if (search) params.set('search', search);

      const res = await api.get(`/admin/products?${params.toString()}`);
      if (res.data.success) {
        setProducts(res.data.data);
      }
    } catch (err) {
      console.error('Error fetching admin products:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchProducts();
  }, [statusFilter]);

  const handleUpdateProductStatus = async (productId, status) => {
    try {
      const res = await api.put(`/admin/products/${productId}/status`, { status });
      if (res.data.success) {
        setNotice(`Product status updated to ${status}.`);
        setTimeout(() => setNotice(''), 3000);
        fetchProducts();
      }
    } catch (err) {
      alert('Failed to update product status.');
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
      case 'INACTIVE':
        return (
          <span className="px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-slate-700 text-slate-300 flex items-center gap-1 w-fit">
            <EyeOff className="w-3 h-3" />
            INACTIVE
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
          <h1 className="text-2xl sm:text-3xl font-black text-white">Crop & Harvest Moderation</h1>
          <p className="text-xs sm:text-sm text-slate-400 mt-1">
            Review submitted agricultural lots for quality guidelines before releasing to public marketplace.
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
            fetchProducts();
          }}
          className="relative w-full sm:w-80"
        >
          <Search className="w-4 h-4 text-slate-500 absolute left-3 top-2.5" />
          <input
            type="text"
            placeholder="Search crop or farm..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full bg-slate-950 border border-slate-800 rounded-xl pl-9 pr-3 py-2 text-xs text-white placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-emerald-500"
          />
        </form>

        <div className="flex items-center gap-2 self-end sm:self-auto">
          <span className="text-xs text-slate-400 font-medium">Moderation Queue:</span>
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="bg-slate-950 border border-slate-800 text-xs rounded-xl px-3 py-2 font-medium text-slate-300 focus:outline-none focus:ring-2 focus:ring-emerald-500"
          >
            <option value="">All Crop Statuses</option>
            <option value="PENDING">Pending Audit</option>
            <option value="APPROVED">Approved & Public</option>
            <option value="INACTIVE">Inactive</option>
            <option value="REJECTED">Rejected</option>
          </select>
        </div>
      </div>

      {/* Products Table */}
      <div className="bg-slate-900 border border-slate-800 rounded-3xl shadow-xl overflow-hidden">
        {loading ? (
          <div className="py-20 flex items-center justify-center">
            <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-emerald-400"></div>
          </div>
        ) : products.length === 0 ? (
          <div className="p-12 text-center text-xs text-slate-400">
            No crops found matching this moderation filter.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs text-slate-300">
              <thead className="bg-slate-950/60 text-slate-400 font-bold uppercase tracking-wider text-[10px]">
                <tr>
                  <th className="py-3.5 px-6">Crop / Item</th>
                  <th className="py-3.5 px-6">Producer Farm</th>
                  <th className="py-3.5 px-6">Category</th>
                  <th className="py-3.5 px-6">Price</th>
                  <th className="py-3.5 px-6">Available Units</th>
                  <th className="py-3.5 px-6">Status</th>
                  <th className="py-3.5 px-6 text-right">Moderation Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800">
                {products.map((p) => (
                  <tr key={p.id} className="hover:bg-slate-800/50 transition-colors">
                    <td className="py-4 px-6">
                      <div className="flex items-center gap-3">
                        <img
                          src={p.primary_image || 'https://images.unsplash.com/photo-1500937386664-56d1dfef3854?auto=format&fit=crop&w=100&q=80'}
                          alt={p.title}
                          className="w-12 h-12 rounded-xl object-cover border border-slate-800 bg-slate-950 flex-shrink-0"
                        />
                        <div>
                          <p className="font-bold text-white text-xs line-clamp-1">{p.title}</p>
                          <p className="text-[11px] text-slate-400 line-clamp-1">{p.description}</p>
                        </div>
                      </div>
                    </td>
                    <td className="py-4 px-6">
                      <p className="font-bold text-white">{p.farm_name}</p>
                      <p className="text-[11px] text-slate-400">{p.seller_name}</p>
                    </td>
                    <td className="py-4 px-6 text-slate-400">{p.category}</td>
                    <td className="py-4 px-6 font-bold text-white">
                      ${parseFloat(p.price).toFixed(2)} <span className="text-[10px] text-slate-500 font-normal">/ {p.unit}</span>
                    </td>
                    <td className="py-4 px-6 font-semibold text-slate-300">
                      {p.available_quantity} {p.unit}
                    </td>
                    <td className="py-4 px-6">
                      {getStatusBadge(p.status)}
                    </td>
                    <td className="py-4 px-6 text-right">
                      <div className="flex items-center justify-end gap-1.5">
                        {p.status !== 'APPROVED' && (
                          <button
                            onClick={() => handleUpdateProductStatus(p.id, 'APPROVED')}
                            className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg text-xs font-bold transition-colors"
                          >
                            Approve
                          </button>
                        )}
                        {p.status === 'PENDING' && (
                          <button
                            onClick={() => handleUpdateProductStatus(p.id, 'REJECTED')}
                            className="px-3 py-1.5 bg-red-600/80 hover:bg-red-600 text-white rounded-lg text-xs font-bold transition-colors"
                          >
                            Reject
                          </button>
                        )}
                        {p.status === 'APPROVED' && (
                          <button
                            onClick={() => handleUpdateProductStatus(p.id, 'INACTIVE')}
                            className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700 rounded-lg text-xs font-bold transition-colors"
                          >
                            Deactivate
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

export default AdminProductsPage;
