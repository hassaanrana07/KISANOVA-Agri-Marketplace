import React, { useState, useEffect } from 'react';
import { Package, CheckCircle, XCircle, EyeOff, AlertTriangle, Search, Filter } from 'lucide-react';
import api from '../../services/api';
import { formatPKR } from '../../utils/currency';

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
      case 'ACTIVE':
      case 'APPROVED':
        return (
          <span className="px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-emerald-100 text-emerald-800 border border-emerald-300 flex items-center gap-1 w-fit">
            <CheckCircle className="w-3 h-3" />
            ACTIVE
          </span>
        );
      case 'INACTIVE':
      default:
        return (
          <span className="px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-slate-100 text-slate-700 border border-slate-300 flex items-center gap-1 w-fit">
            <EyeOff className="w-3 h-3" />
            INACTIVE
          </span>
        );
    }
  };

  return (
    <div className="space-y-6 max-w-full overflow-x-hidden">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-black text-slate-900 tracking-tight">Product Approvals & Inventory</h1>
          <p className="text-xs sm:text-sm text-slate-500 mt-1">
            Moderate produce listings, verify crop categories, and inspect farm origin.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <form
            onSubmit={(e) => {
              e.preventDefault();
              fetchProducts();
            }}
            className="flex items-center bg-white border border-slate-200 rounded-xl px-3 py-1.5 shadow-sm"
          >
            <Search className="w-3.5 h-3.5 text-slate-400 mr-2" />
            <input
              type="text"
              placeholder="Search produce..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="text-xs text-slate-800 focus:outline-none w-32 sm:w-44 placeholder:text-slate-400"
            />
          </form>

          <div className="flex items-center gap-2 bg-white border border-slate-200 rounded-xl px-3 py-1.5 shadow-sm">
            <Filter className="w-3.5 h-3.5 text-slate-400" />
            <span className="text-xs text-slate-500 font-medium">Status:</span>
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="bg-transparent text-xs font-bold text-slate-700 focus:outline-none cursor-pointer"
            >
              <option value="">All Produce</option>
              <option value="ACTIVE">Active Only</option>
              <option value="INACTIVE">Inactive Only</option>
            </select>
          </div>
        </div>
      </div>

      {notice && (
        <div className="p-3.5 rounded-2xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs font-semibold flex items-center gap-2 animate-in fade-in">
          <CheckCircle className="w-4 h-4 flex-shrink-0" />
          <span>{notice}</span>
        </div>
      )}

      {/* Content */}
      {loading ? (
        <div className="py-20 flex items-center justify-center bg-white rounded-3xl border border-slate-200 shadow-sm">
          <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-emerald-600"></div>
        </div>
      ) : products.length === 0 ? (
        <div className="p-12 text-center text-xs text-slate-400 bg-white rounded-3xl border border-slate-200 shadow-sm">
          No agricultural products found matching filter.
        </div>
      ) : (
        <>
          {/* Mobile Cards View */}
          <div className="block md:hidden space-y-4">
            {products.map((p) => (
              <div key={p.id} className="bg-white border border-slate-200 rounded-2xl p-4 space-y-3 shadow-sm">
                <div className="flex items-center gap-3">
                  <img
                    src={p.primary_image || 'https://images.unsplash.com/photo-1500937386664-56d1dfef3854?auto=format&fit=crop&w=100&q=80'}
                    alt={p.title}
                    className="w-14 h-14 rounded-xl object-cover bg-slate-100 flex-shrink-0 border border-slate-200"
                  />
                  <div className="min-w-0">
                    <h3 className="font-bold text-xs text-slate-900 truncate">{p.title}</h3>
                    <p className="text-[11px] text-slate-500">{p.farm_name}</p>
                    <p className="text-[11px] font-bold text-slate-900 mt-0.5">
                      {formatPKR(p.price)} / {p.unit}
                    </p>
                  </div>
                </div>

                <div className="flex items-center justify-between pt-2 border-t border-slate-100 text-xs">
                  <div>{getStatusBadge(p.status)}</div>
                  <div>
                    {p.status === 'ACTIVE' ? (
                      <button
                        onClick={() => handleUpdateProductStatus(p.id, 'INACTIVE')}
                        className="px-3 py-1 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs rounded-xl"
                      >
                        Deactivate
                      </button>
                    ) : (
                      <button
                        onClick={() => handleUpdateProductStatus(p.id, 'ACTIVE')}
                        className="px-3 py-1 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs rounded-xl shadow-xs"
                      >
                        Activate
                      </button>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>

          {/* Desktop Table View */}
          <div className="hidden md:block bg-white rounded-3xl border border-slate-200 shadow-sm overflow-hidden">
            <div className="w-full max-w-full overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-50 text-slate-500 font-bold uppercase tracking-wider text-[10px] border-b border-slate-200">
                  <tr>
                    <th className="py-3.5 px-6">Product Details</th>
                    <th className="py-3.5 px-6">Seller & Origin Farm</th>
                    <th className="py-3.5 px-6">Price / Unit</th>
                    <th className="py-3.5 px-6">Available Stock</th>
                    <th className="py-3.5 px-6">Moderation Status</th>
                    <th className="py-3.5 px-6 text-right">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {products.map((p) => (
                    <tr key={p.id} className="hover:bg-slate-50/70 transition-colors">
                      <td className="py-4 px-6 flex items-center gap-3">
                        <img
                          src={p.primary_image || 'https://images.unsplash.com/photo-1500937386664-56d1dfef3854?auto=format&fit=crop&w=100&q=80'}
                          alt={p.title}
                          className="w-10 h-10 rounded-xl object-cover bg-slate-100 flex-shrink-0 border border-slate-200"
                        />
                        <div>
                          <p className="font-bold text-slate-900">{p.title}</p>
                          <span className="text-[10px] text-slate-500">{p.category}</span>
                        </div>
                      </td>
                      <td className="py-4 px-6 text-slate-700 font-medium">
                        {p.farm_name}
                      </td>
                      <td className="py-4 px-6 font-bold text-slate-900">
                        {formatPKR(p.price)} / {p.unit}
                      </td>
                      <td className="py-4 px-6 font-bold text-slate-700">
                        {p.available_quantity} {p.unit}s
                      </td>
                      <td className="py-4 px-6">
                        {getStatusBadge(p.status)}
                      </td>
                      <td className="py-4 px-6 text-right">
                        {p.status === 'ACTIVE' ? (
                          <button
                            onClick={() => handleUpdateProductStatus(p.id, 'INACTIVE')}
                            className="px-3 py-1.5 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs transition-colors"
                          >
                            Deactivate
                          </button>
                        ) : (
                          <button
                            onClick={() => handleUpdateProductStatus(p.id, 'ACTIVE')}
                            className="px-3 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs transition-colors shadow-xs"
                          >
                            Activate
                          </button>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </>
      )}
    </div>
  );
};

export default AdminProductsPage;
