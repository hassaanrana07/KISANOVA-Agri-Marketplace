import React, { useState, useEffect } from 'react';
import {
  Users,
  CheckCircle,
  XCircle,
  Ban,
  AlertTriangle,
  Search,
  Filter,
  MapPin,
  Eye,
  X,
  Compass,
  Phone,
  Mail,
  Building
} from 'lucide-react';
import api from '../../services/api';
import FarmLocationMap from '../../components/common/FarmLocationMap';

const AdminSellersPage = () => {
  const [sellers, setSellers] = useState([]);
  const [statusFilter, setStatusFilter] = useState('');
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);
  const [notice, setNotice] = useState('');

  // Audit modal state
  const [selectedSeller, setSelectedSeller] = useState(null);
  const [rejectionModalOpen, setRejectionModalOpen] = useState(false);
  const [rejectingSellerId, setRejectingSellerId] = useState(null);
  const [rejectionReason, setRejectionReason] = useState('');

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

  const handleUpdateStatus = async (sellerId, newStatus, reason = null) => {
    try {
      const res = await api.put(`/admin/sellers/${sellerId}/approval`, {
        status: newStatus,
        rejection_reason: reason
      });
      if (res.data.success) {
        setNotice(res.data.message);
        setTimeout(() => setNotice(''), 3500);
        if (rejectionModalOpen) setRejectionModalOpen(false);
        fetchSellers();
      }
    } catch (err) {
      alert(err.response?.data?.message || 'Failed to update seller status.');
    }
  };

  const getStatusBadge = (status) => {
    switch (status) {
      case 'APPROVED':
        return 'bg-emerald-100 text-emerald-800 border-emerald-300';
      case 'REJECTED':
        return 'bg-red-100 text-red-800 border-red-300';
      case 'SUSPENDED':
        return 'bg-slate-200 text-slate-800 border-slate-300';
      case 'REVIEW_REQUIRED':
        return 'bg-purple-100 text-purple-800 border-purple-300';
      default:
        return 'bg-amber-100 text-amber-800 border-amber-300';
    }
  };

  return (
    <div className="space-y-6 max-w-full overflow-x-hidden">
      {/* Top Title & Filters */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-black text-slate-900 tracking-tight">
            Seller Moderation & Land Auditing
          </h1>
          <p className="text-xs sm:text-sm text-slate-500 mt-1">
            Audit farmer profiles, Pakistan administrative locations, contact details, and polygon boundaries.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <form
            onSubmit={(e) => {
              e.preventDefault();
              fetchSellers();
            }}
            className="flex items-center bg-white border border-slate-200 rounded-xl px-3 py-1.5 shadow-sm"
          >
            <Search className="w-3.5 h-3.5 text-slate-400 mr-2" />
            <input
              type="text"
              placeholder="Search farm name or email..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="text-xs text-slate-800 focus:outline-none w-36 sm:w-48 placeholder:text-slate-400"
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
              <option value="">All Producers</option>
              <option value="PENDING">Pending Verification</option>
              <option value="APPROVED">Approved / Verified</option>
              <option value="REVIEW_REQUIRED">Review Required</option>
              <option value="REJECTED">Rejected</option>
              <option value="SUSPENDED">Suspended</option>
            </select>
          </div>
        </div>
      </div>

      {notice && (
        <div className="p-4 rounded-2xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs font-semibold flex items-center gap-2 animate-in fade-in">
          <CheckCircle className="w-4 h-4 flex-shrink-0" />
          <span>{notice}</span>
        </div>
      )}

      {/* Sellers List */}
      {loading ? (
        <div className="py-20 flex items-center justify-center bg-white rounded-3xl border border-slate-200 shadow-sm">
          <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-emerald-600"></div>
        </div>
      ) : sellers.length === 0 ? (
        <div className="p-12 text-center text-xs text-slate-400 bg-white rounded-3xl border border-slate-200 shadow-sm">
          No seller records found matching the current criteria.
        </div>
      ) : (
        <>
          {/* Mobile Cards (Zero Horizontal Scroll) */}
          <div className="block md:hidden space-y-4">
            {sellers.map((s) => (
              <div key={s.id} className="bg-white border border-slate-200 rounded-2xl p-4 space-y-3 shadow-sm">
                <div className="flex items-start justify-between">
                  <div>
                    <h3 className="font-bold text-sm text-slate-900">{s.farm_name}</h3>
                    <p className="text-xs text-slate-500">{s.owner_name} ({s.owner_email})</p>
                  </div>
                  <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold border ${getStatusBadge(s.approval_status)}`}>
                    {s.approval_status}
                  </span>
                </div>

                <div className="text-xs text-slate-600 space-y-1">
                  <p className="flex items-center gap-1.5">
                    <MapPin className="w-3.5 h-3.5 text-slate-400" />
                    <span>{s.district || s.city || 'N/A'}, {s.province || 'Punjab'}</span>
                  </p>
                  <p className="flex items-center gap-1.5">
                    <Phone className="w-3.5 h-3.5 text-slate-400" />
                    <span>{s.phone}</span>
                  </p>
                </div>

                <div className="pt-2 border-t border-slate-100 flex items-center justify-between gap-2">
                  <button
                    onClick={() => setSelectedSeller(s)}
                    className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-800 rounded-xl text-xs font-bold transition-colors flex items-center gap-1"
                  >
                    <Eye className="w-3 h-3" />
                    <span>View Map & Land</span>
                  </button>

                  <div className="flex items-center gap-1.5">
                    {s.approval_status !== 'APPROVED' && (
                      <button
                        onClick={() => handleUpdateStatus(s.id, 'APPROVED')}
                        className="p-1.5 bg-emerald-100 text-emerald-800 hover:bg-emerald-200 rounded-lg text-xs font-bold"
                        title="Approve Seller"
                      >
                        <CheckCircle className="w-4 h-4" />
                      </button>
                    )}
                    {s.approval_status !== 'REJECTED' && (
                      <button
                        onClick={() => {
                          setRejectingSellerId(s.id);
                          setRejectionModalOpen(true);
                        }}
                        className="p-1.5 bg-red-100 text-red-800 hover:bg-red-200 rounded-lg text-xs font-bold"
                        title="Reject Seller"
                      >
                        <XCircle className="w-4 h-4" />
                      </button>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>

          {/* Desktop Table */}
          <div className="hidden md:block bg-white rounded-3xl border border-slate-200 shadow-sm overflow-hidden">
            <div className="w-full max-w-full overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-50 text-slate-500 font-bold uppercase tracking-wider text-[10px] border-b border-slate-200">
                  <tr>
                    <th className="py-3.5 px-6">Farm & Contact</th>
                    <th className="py-3.5 px-6">Location Hierarchy</th>
                    <th className="py-3.5 px-6">Declared / Polygon Land</th>
                    <th className="py-3.5 px-6">Verification Status</th>
                    <th className="py-3.5 px-6 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {sellers.map((s) => (
                    <tr key={s.id} className="hover:bg-slate-50/70 transition-colors">
                      <td className="py-4 px-6">
                        <p className="font-bold text-slate-900">{s.farm_name}</p>
                        <p className="text-[11px] text-slate-500">{s.owner_name} • {s.owner_email}</p>
                        <p className="text-[11px] text-emerald-700 font-medium">{s.phone}</p>
                      </td>
                      <td className="py-4 px-6 text-slate-600">
                        <p className="font-bold text-slate-800">{s.district || s.city || 'Unspecified'}, {s.province || 'Punjab'}</p>
                        <p className="text-[11px] text-slate-400">{s.tehsil || ''} {s.village ? `• ${s.village}` : ''}</p>
                      </td>
                      <td className="py-4 px-6 text-slate-700">
                        <p className="font-bold text-slate-900">
                          {s.seller_declared_area_acres ? `${s.seller_declared_area_acres} Acres` : 'N/A'}
                        </p>
                        <p className="text-[11px] text-emerald-700">
                          {s.calculated_polygon_area_acres ? `GIS: ${s.calculated_polygon_area_acres} Acres` : 'No GIS polygon'}
                        </p>
                      </td>
                      <td className="py-4 px-6">
                        <span className={`px-2.5 py-1 rounded-full text-[11px] font-bold border ${getStatusBadge(s.approval_status)}`}>
                          {s.approval_status}
                        </span>
                      </td>
                      <td className="py-4 px-6 text-right space-x-2">
                        <button
                          onClick={() => setSelectedSeller(s)}
                          className="px-2.5 py-1.5 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs inline-flex items-center gap-1 transition-colors"
                        >
                          <Eye className="w-3.5 h-3.5" />
                          <span>Audit Map</span>
                        </button>

                        {s.approval_status !== 'APPROVED' && (
                          <button
                            onClick={() => handleUpdateStatus(s.id, 'APPROVED')}
                            className="px-2.5 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs inline-flex items-center gap-1 transition-colors shadow-xs"
                          >
                            <CheckCircle className="w-3.5 h-3.5" />
                            <span>Approve</span>
                          </button>
                        )}

                        {s.approval_status !== 'REJECTED' && (
                          <button
                            onClick={() => {
                              setRejectingSellerId(s.id);
                              setRejectionModalOpen(true);
                            }}
                            className="px-2.5 py-1.5 rounded-lg bg-red-50 hover:bg-red-100 text-red-700 font-bold text-xs inline-flex items-center gap-1 transition-colors border border-red-200"
                          >
                            <XCircle className="w-3.5 h-3.5" />
                            <span>Reject</span>
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

      {/* Map & Land Audit Modal */}
      {selectedSeller && (
        <div className="fixed inset-0 bg-slate-950/50 backdrop-blur-xs z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl border border-slate-200 max-w-2xl w-full p-6 space-y-4 shadow-2xl animate-in fade-in">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div>
                <h3 className="font-black text-lg text-slate-900">{selectedSeller.farm_name}</h3>
                <p className="text-xs text-slate-500">
                  {selectedSeller.province} • {selectedSeller.district} • {selectedSeller.tehsil}
                </p>
              </div>
              <button
                onClick={() => setSelectedSeller(null)}
                className="p-1.5 text-slate-400 hover:text-slate-700 rounded-xl"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Farm Location Map Component */}
            <div className="h-64 rounded-2xl overflow-hidden border border-slate-200">
              <FarmLocationMap
                latitude={selectedSeller.latitude}
                longitude={selectedSeller.longitude}
                farmPolygon={selectedSeller.farm_polygon}
                farmName={selectedSeller.farm_name}
                declaredAcreage={selectedSeller.seller_declared_area_acres}
                calculatedAcreage={selectedSeller.calculated_polygon_area_acres}
              />
            </div>

            <div className="grid grid-cols-2 gap-4 text-xs bg-slate-50 p-4 rounded-2xl border border-slate-200">
              <div>
                <span className="text-slate-400 block text-[10px] uppercase font-bold">Contact Phone</span>
                <strong className="text-slate-900 text-sm">{selectedSeller.phone}</strong>
              </div>
              <div>
                <span className="text-slate-400 block text-[10px] uppercase font-bold">Farm Gate Address</span>
                <strong className="text-slate-800 text-xs">{selectedSeller.address}</strong>
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-2">
              <button
                onClick={() => setSelectedSeller(null)}
                className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-bold"
              >
                Close Audit
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Rejection Reason Modal */}
      {rejectionModalOpen && (
        <div className="fixed inset-0 bg-slate-950/50 backdrop-blur-xs z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl border border-slate-200 max-w-md w-full p-6 space-y-4 shadow-2xl animate-in fade-in">
            <h3 className="font-bold text-slate-900 text-base">State Rejection Reason</h3>
            <p className="text-xs text-slate-500">
              Provide specific feedback to the producer regarding land boundaries or documentation.
            </p>
            <textarea
              rows="3"
              value={rejectionReason}
              onChange={(e) => setRejectionReason(e.target.value)}
              placeholder="e.g. Farm polygon boundary overlaps non-agricultural territory; incorrect Tehsil entered..."
              className="w-full bg-slate-50 border border-slate-200 rounded-xl p-3 text-xs focus:outline-none focus:ring-2 focus:ring-red-500 font-medium"
            />
            <div className="flex justify-end gap-2">
              <button
                onClick={() => setRejectionModalOpen(false)}
                className="px-4 py-2 bg-slate-100 text-slate-700 rounded-xl text-xs font-bold"
              >
                Cancel
              </button>
              <button
                onClick={() => handleUpdateStatus(rejectingSellerId, 'REJECTED', rejectionReason)}
                className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-xl text-xs font-bold shadow-sm"
              >
                Confirm Rejection
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default AdminSellersPage;
