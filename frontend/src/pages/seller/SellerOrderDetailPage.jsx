import React, { useState, useEffect } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import {
  ArrowLeft,
  ShoppingBag,
  Truck,
  Phone,
  MapPin,
  CheckCircle,
  MessageSquare,
  AlertCircle
} from 'lucide-react';
import api from '../../services/api';

const statuses = ['PENDING', 'CONFIRMED', 'PROCESSING', 'SHIPPED', 'DELIVERED', 'CANCELLED'];

const SellerOrderDetailPage = () => {
  const { id } = useParams();
  const navigate = useNavigate();

  const [order, setOrder] = useState(null);
  const [selectedStatus, setSelectedStatus] = useState('');
  const [loading, setLoading] = useState(true);
  const [updating, setUpdating] = useState(false);
  const [notice, setNotice] = useState('');
  const [error, setError] = useState('');

  const fetchOrderDetail = async () => {
    setLoading(true);
    try {
      const res = await api.get(`/seller/orders/${id}`);
      if (res.data.success) {
        setOrder(res.data.data);
        setSelectedStatus(res.data.data.seller_order_status);
      } else {
        setError(res.data.message);
      }
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to load order details.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchOrderDetail();
  }, [id]);

  const handleUpdateStatus = async () => {
    setUpdating(true);
    setNotice('');
    try {
      const res = await api.put(`/seller/orders/${id}/status`, { status: selectedStatus });
      if (res.data.success) {
        setNotice(`Order status updated to ${selectedStatus}!`);
        fetchOrderDetail();
      }
    } catch (err) {
      alert(err.response?.data?.message || 'Failed to update status.');
    } finally {
      setUpdating(false);
    }
  };

  const handleOpenBuyerChat = async (productId) => {
    try {
      const res = await api.post('/chat/conversations', {
        seller_id: order.seller_id,
        product_id: productId,
        order_id: order.order_id
      });
      if (res.data.success) {
        navigate(`/seller/messages?conversationId=${res.data.data.conversation_id}`);
      }
    } catch (e) {
      alert('Failed to start chat with buyer.');
    }
  };

  if (loading) {
    return (
      <div className="py-20 flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-agro-600"></div>
      </div>
    );
  }

  if (error || !order) {
    return (
      <div className="max-w-md mx-auto py-16 text-center space-y-4">
        <AlertCircle className="w-12 h-12 text-red-500 mx-auto" />
        <h2 className="text-xl font-bold text-slate-900">{error || 'Sub-Order Not Found'}</h2>
        <Link to="/seller/orders" className="inline-block px-4 py-2 bg-agro-600 text-white rounded-xl text-xs font-bold">
          Return to Orders
        </Link>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto space-y-8">
      {/* Top Breadcrumb & Header */}
      <div className="space-y-1 pb-4 border-b border-slate-200">
        <Link
          to="/seller/orders"
          className="text-xs font-bold text-slate-500 hover:text-agro-600 flex items-center gap-1 mb-2"
        >
          <ArrowLeft className="w-3.5 h-3.5" />
          <span>Back to Customer Orders</span>
        </Link>

        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl sm:text-3xl font-black text-slate-900">
              Sub-Order #{order.order_number}
            </h1>
            <p className="text-xs text-slate-500">
              Placed on {new Date(order.created_at).toLocaleString()}
            </p>
          </div>

          <div className="sm:text-right">
            <span className="text-xs text-slate-400 block">Your Farm Subtotal</span>
            <span className="text-2xl font-black text-slate-900">
              ${parseFloat(order.subtotal).toFixed(2)}
            </span>
          </div>
        </div>
      </div>

      {notice && (
        <div className="p-3.5 rounded-2xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs font-semibold flex items-center gap-2">
          <CheckCircle className="w-4 h-4 flex-shrink-0" />
          <span>{notice}</span>
        </div>
      )}

      {/* Status Transition Control Card */}
      <div className="bg-white rounded-3xl border border-slate-200 p-6 shadow-sm flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Current Dispatch Stage</span>
          <p className="text-base font-black text-slate-900 mt-0.5">
            Status: <span className="text-agro-700">{order.seller_order_status}</span>
          </p>
        </div>

        <div className="flex items-center gap-3">
          <select
            value={selectedStatus}
            onChange={(e) => setSelectedStatus(e.target.value)}
            className="bg-slate-50 border border-slate-200 text-xs font-bold rounded-xl px-3 py-2.5 text-slate-800 focus:outline-none focus:ring-2 focus:ring-agro-500"
          >
            {statuses.map((s) => (
              <option key={s} value={s}>{s}</option>
            ))}
          </select>

          <button
            onClick={handleUpdateStatus}
            disabled={updating || selectedStatus === order.seller_order_status}
            className="px-4 py-2.5 bg-agro-600 hover:bg-agro-700 disabled:bg-slate-300 text-white rounded-xl text-xs font-bold transition-colors shadow-sm"
          >
            {updating ? 'Updating...' : 'Update Status'}
          </button>
        </div>
      </div>

      {/* Delivery & Buyer Information Card */}
      <div className="bg-white rounded-3xl border border-slate-200 p-6 shadow-sm space-y-4">
        <h3 className="font-bold text-slate-900 text-sm flex items-center gap-2 pb-2 border-b border-slate-100">
          <Truck className="w-4 h-4 text-agro-600" />
          Buyer Delivery & Contact Details
        </h3>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs text-slate-600">
          <div>
            <span className="text-slate-400 text-[11px] block">Buyer Name</span>
            <strong className="text-slate-900 font-bold text-sm">{order.delivery_name}</strong>
          </div>

          <div>
            <span className="text-slate-400 text-[11px] block">Contact Phone</span>
            <strong className="text-slate-900 font-bold">{order.delivery_phone}</strong>
          </div>

          <div className="sm:col-span-2">
            <span className="text-slate-400 text-[11px] block">Dispatch Destination</span>
            <p className="font-medium text-slate-800">{order.delivery_address}</p>
          </div>

          {order.delivery_notes && (
            <div className="sm:col-span-2">
              <span className="text-slate-400 text-[11px] block">Logistics Notes</span>
              <p className="italic text-slate-600">"{order.delivery_notes}"</p>
            </div>
          )}
        </div>
      </div>

      {/* Ordered Crop Items Card */}
      <div className="bg-white rounded-3xl border border-slate-200 shadow-sm overflow-hidden space-y-4">
        <div className="p-6 border-b border-slate-100">
          <h3 className="font-bold text-slate-900 text-sm">Harvest Items in this Sub-Order</h3>
        </div>

        <div className="divide-y divide-slate-100 px-6 pb-4">
          {order.items?.map((item) => (
            <div key={item.id} className="py-4 flex items-center justify-between gap-4">
              <div className="flex items-center gap-3">
                <img
                  src={item.product_image || 'https://images.unsplash.com/photo-1500937386664-56d1dfef3854?auto=format&fit=crop&w=100&q=80'}
                  alt={item.product_title}
                  className="w-14 h-14 rounded-xl object-cover border border-slate-200 bg-slate-100 flex-shrink-0"
                />
                <div>
                  <h4 className="font-bold text-xs text-slate-900">{item.product_title}</h4>
                  <p className="text-[11px] text-slate-500 mt-0.5">
                    Quantity: <strong className="text-slate-800">{item.quantity} {item.product_unit}</strong> @ ${parseFloat(item.unit_price).toFixed(2)} / {item.product_unit}
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-4">
                <span className="font-black text-sm text-slate-900">
                  ${parseFloat(item.subtotal).toFixed(2)}
                </span>
                <button
                  onClick={() => handleOpenBuyerChat(item.product_id)}
                  className="p-2 rounded-xl bg-slate-100 hover:bg-agro-50 text-slate-700 hover:text-agro-700 transition-colors"
                  title="Chat with buyer about this harvest item"
                >
                  <MessageSquare className="w-4 h-4" />
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default SellerOrderDetailPage;
