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
  AlertCircle,
  Printer,
  Banknote,
  Clock,
  User,
  ShieldCheck
} from 'lucide-react';
import api from '../../services/api';
import PrintableReceiptModal from '../../components/common/PrintableReceiptModal';
import { formatPKR } from '../../utils/currency';
import { useLanguage } from '../../context/LanguageContext';

const dispatchStatuses = ['PENDING', 'CONFIRMED', 'PROCESSING', 'SHIPPED', 'DELIVERED', 'CANCELLED'];
const paymentStatuses = ['UNPAID', 'PARTIALLY_PAID', 'PAID'];

const SellerOrderDetailPage = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { t, isRTL } = useLanguage();

  const [order, setOrder] = useState(null);
  const [selectedDispatchStatus, setSelectedDispatchStatus] = useState('');
  const [selectedPaymentStatus, setSelectedPaymentStatus] = useState('UNPAID');
  const [customAmountPaid, setCustomAmountPaid] = useState('');
  const [loading, setLoading] = useState(true);
  const [updatingDispatch, setUpdatingDispatch] = useState(false);
  const [updatingPayment, setUpdatingPayment] = useState(false);
  const [notice, setNotice] = useState('');
  const [error, setError] = useState('');
  const [receiptModalOpen, setReceiptModalOpen] = useState(false);

  const fetchOrderDetail = async () => {
    setLoading(true);
    try {
      const res = await api.get(`/seller/orders/${id}`);
      if (res.data.success) {
        setOrder(res.data.data);
        setSelectedDispatchStatus(res.data.data.seller_order_status);
        setSelectedPaymentStatus(res.data.data.payment_status || 'UNPAID');
        setCustomAmountPaid(res.data.data.amount_paid !== undefined ? String(res.data.data.amount_paid) : '');
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

  const handleUpdateDispatchStatus = async () => {
    setUpdatingDispatch(true);
    setNotice('');
    try {
      const res = await api.put(`/seller/orders/${id}/status`, { status: selectedDispatchStatus });
      if (res.data.success) {
        setNotice(`Order dispatch stage updated to ${selectedDispatchStatus}!`);
        fetchOrderDetail();
      }
    } catch (err) {
      alert(err.response?.data?.message || 'Failed to update dispatch status.');
    } finally {
      setUpdatingDispatch(false);
    }
  };

  const handleUpdatePaymentStatus = async () => {
    setUpdatingPayment(true);
    setNotice('');
    try {
      const payload = {
        payment_status: selectedPaymentStatus
      };
      const res = await api.put(`/seller/orders/${id}/payment-status`, payload);
      if (res.data.success) {
        setNotice(`Cash on Delivery payment status updated to ${selectedPaymentStatus}!`);
        fetchOrderDetail();
      }
    } catch (err) {
      alert(err.response?.data?.message || 'Failed to update payment status.');
    } finally {
      setUpdatingPayment(false);
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
      alert('Failed to initiate conversation with buyer.');
    }
  };

  const getPaymentBadge = (status) => {
    switch (status) {
      case 'PAID':
        return 'bg-emerald-100 text-emerald-800 border-emerald-300';
      default:
        return 'bg-rose-100 text-rose-800 border-rose-300';
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
        <h2 className="text-xl font-bold text-slate-900">{error || 'Order Not Found'}</h2>
        <Link to="/seller/orders" className="inline-block px-4 py-2 bg-agro-600 text-white rounded-xl text-xs font-bold">
          Return to Customer Orders
        </Link>
      </div>
    );
  }

  const isPickupOrder = order?.fulfillment_method === 'PICKUP' || order?.fulfillment_type === 'FARM_PICKUP' || order?.seller_order_status === 'READY_FOR_PICKUP' || order?.seller_order_status === 'PICKED_UP';
  const availableDispatchStatuses = isPickupOrder
    ? ['PENDING', 'CONFIRMED', 'PROCESSING', 'READY_FOR_PICKUP', 'PICKED_UP', 'CANCELLED']
    : ['PENDING', 'CONFIRMED', 'PROCESSING', 'SHIPPED', 'DELIVERED', 'CANCELLED'];

  return (
    <div className={`max-w-4xl mx-auto space-y-8 max-w-full overflow-x-hidden ${isRTL ? 'font-urdu' : ''}`}>
      {/* Top Header & Navigation */}
      <div className="space-y-1 pb-4 border-b border-slate-200">
        <Link
          to="/seller/orders"
          className="text-xs font-bold text-slate-500 hover:text-agro-600 flex items-center gap-1 mb-2"
        >
          <ArrowLeft className={`w-3.5 h-3.5 ${isRTL ? 'rotate-180' : ''}`} />
          <span>{t('action.back', 'Back to Customer Orders')}</span>
        </Link>

        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-2xl sm:text-3xl font-black text-slate-900">
                {t('order.number', 'Order')} #{order.order_number}
              </h1>
              <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold border ${getPaymentBadge(order.payment_status)}`}>
                {t(`status.${(order.payment_status || 'UNPAID').toLowerCase()}`, order.payment_status || 'UNPAID')}
              </span>
            </div>
            <p className="text-xs text-slate-500 mt-0.5">
              {new Date(order.created_at).toLocaleString()}
            </p>
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={() => setReceiptModalOpen(true)}
              className="px-3.5 py-2 rounded-xl bg-white hover:bg-slate-50 text-slate-800 text-xs font-bold transition-colors flex items-center gap-1.5 shadow-sm border border-slate-200"
            >
              <Printer className="w-3.5 h-3.5 text-agro-700" />
              <span>{t('action.print_receipt', 'Print Receipt')}</span>
            </button>
            <div className={isRTL ? 'text-left' : 'text-right'}>
              <span className="text-[10px] text-slate-400 uppercase font-bold block">{t('dashboard.total_revenue', 'Farm Subtotal')}</span>
              <span className="text-2xl font-black text-slate-900">
                {formatPKR(order.subtotal)}
              </span>
            </div>
          </div>
        </div>
      </div>

      {notice && (
        <div className="p-3.5 rounded-2xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs font-semibold flex items-center gap-2 animate-in fade-in">
          <CheckCircle className="w-4 h-4 flex-shrink-0" />
          <span>{notice}</span>
        </div>
      )}

      {/* Prominent COD Financial Accounting Summary Block */}
      <div className="bg-gradient-to-br from-slate-900 via-slate-850 to-slate-900 rounded-3xl p-6 text-white border border-slate-800 shadow-xl space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-slate-800">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-emerald-500/20 text-emerald-400 flex items-center justify-center">
              <Banknote className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-bold text-sm text-white">{t('order.cod_accounting', 'Cash on Delivery Accounting Ledger')}</h3>
              <p className="text-[11px] text-slate-400">{t('order.cod_accounting_desc', 'Financial settlement status for this farm dispatch order')}</p>
            </div>
          </div>
          <span className={`self-start sm:self-auto px-3 py-1 rounded-full text-xs font-bold border ${getPaymentBadge(order.payment_status)}`}>
            {t(`status.${(order.payment_status || 'UNPAID').toLowerCase()}`, order.payment_status || 'UNPAID')}
          </span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 pt-1">
          <div className="bg-slate-800/60 rounded-2xl p-4 border border-slate-700/50">
            <span className="text-[10px] uppercase font-bold text-slate-400 tracking-wider block">{t('order.total_value', 'Total Order Value')}</span>
            <p className="text-xl sm:text-2xl font-black text-white mt-1">
              {formatPKR(parseFloat(order.amount_due || (parseFloat(order.subtotal) + parseFloat(order.delivery_fee || 0))))}
            </p>
            <span className="text-[10px] text-slate-400 mt-1 block">Subtotal + Delivery Fee</span>
          </div>

          <div className="bg-emerald-950/40 rounded-2xl p-4 border border-emerald-800/40">
            <span className="text-[10px] uppercase font-bold text-emerald-400 tracking-wider block">{t('order.amount_paid', 'Amount Paid / Collected')}</span>
            <p className="text-xl sm:text-2xl font-black text-emerald-400 mt-1">
              {formatPKR(parseFloat(order.amount_paid || 0))}
            </p>
            <span className="text-[10px] text-emerald-400/70 mt-1 block">Recorded Cash Receipts</span>
          </div>

          <div className="bg-amber-950/40 rounded-2xl p-4 border border-amber-800/40">
            <span className="text-[10px] uppercase font-bold text-amber-400 tracking-wider block">{t('order.amount_remaining', 'Amount Remaining / Due')}</span>
            <p className="text-xl sm:text-2xl font-black text-amber-400 mt-1">
              {formatPKR(parseFloat(order.amount_remaining !== undefined ? order.amount_remaining : Math.max(0, (parseFloat(order.amount_due || (parseFloat(order.subtotal) + parseFloat(order.delivery_fee || 0))) - parseFloat(order.amount_paid || 0)))))}
            </p>
            <span className="text-[10px] text-amber-400/70 mt-1 block">Outstanding Balance</span>
          </div>
        </div>
      </div>

      {/* Two Status Management Cards (Dispatch Status & COD Payment Status) */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* 1. Dispatch Status Control Card */}
        <div className="bg-white rounded-3xl border border-slate-200 p-6 shadow-sm space-y-4">
          <div>
            <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
              {t('order.dispatch_stage', 'Logistics & Dispatch')}
            </span>
            <p className="text-base font-black text-slate-900 mt-0.5">
              {t('order.dispatch_stage', 'Current Stage')}: <span className="text-agro-700">{t(`status.${(order.seller_order_status || '').toLowerCase()}`, order.seller_order_status)}</span>
            </p>
          </div>

          <div className="space-y-3">
            <select
              value={selectedDispatchStatus}
              onChange={(e) => setSelectedDispatchStatus(e.target.value)}
              className="w-full bg-slate-50 border border-slate-200 text-xs font-bold rounded-xl px-3 py-2.5 text-slate-800 focus:outline-none focus:ring-2 focus:ring-agro-500 cursor-pointer"
            >
              {availableDispatchStatuses.map((s) => (
                <option key={s} value={s}>
                  {t(`status.${s.toLowerCase()}`, s)}
                </option>
              ))}
            </select>

            <button
              onClick={handleUpdateDispatchStatus}
              disabled={updatingDispatch || selectedDispatchStatus === order.seller_order_status}
              className="w-full py-2.5 bg-slate-900 hover:bg-slate-800 disabled:bg-slate-200 disabled:text-slate-400 text-white rounded-xl text-xs font-bold transition-colors shadow-sm"
            >
              {updatingDispatch ? '...' : t('order.update_dispatch', 'Update Dispatch Stage')}
            </button>
          </div>
        </div>

        {/* 2. Manual Cash on Delivery Payment Status Card */}
        <div className="bg-white rounded-3xl border border-slate-200 p-6 shadow-sm space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                {t('order.cod_cash_collection', 'COD Cash Collection')}
              </span>
              <p className="text-base font-black text-slate-900 mt-0.5">
                <span className={order.payment_status === 'PAID' ? 'text-emerald-700' : 'text-amber-600'}>
                  {t(`status.${(order.payment_status || 'UNPAID').toLowerCase()}`, order.payment_status || 'UNPAID')}
                </span>
              </p>
            </div>
            <span className="text-[10px] font-bold text-slate-400 bg-slate-100 px-2.5 py-1 rounded-full">
              Cash on Delivery
            </span>
          </div>

          <div className="space-y-3">
            <select
              value={selectedPaymentStatus}
              onChange={(e) => setSelectedPaymentStatus(e.target.value)}
              className="w-full bg-slate-50 border border-slate-200 text-xs font-bold rounded-xl px-3 py-2.5 text-slate-800 focus:outline-none focus:ring-2 focus:ring-emerald-500 cursor-pointer"
            >
              <option value="UNPAID">{t('status.unpaid', 'UNPAID')} — Cash Not Yet Collected</option>
              <option value="PAID">{t('status.paid', 'PAID')} — Full Cash Collected</option>
            </select>

            <button
              onClick={handleUpdatePaymentStatus}
              disabled={updatingPayment || selectedPaymentStatus === order.payment_status}
              className="w-full py-2.5 bg-emerald-600 hover:bg-emerald-700 disabled:bg-slate-200 disabled:text-slate-400 text-white rounded-xl text-xs font-bold transition-colors shadow-sm"
            >
              {updatingPayment ? '...' : t('order.update_payment', 'Update Payment Status')}
            </button>
          </div>
        </div>
      </div>

      {/* Buyer & Delivery Information Card */}
      <div className="bg-white rounded-3xl border border-slate-200 p-6 shadow-sm space-y-4">
        <div className="flex items-center justify-between pb-2 border-b border-slate-100">
          <h3 className="font-bold text-slate-900 text-sm flex items-center gap-2">
            <User className="w-4 h-4 text-agro-600" />
            {t('order.customer', 'Customer')} & {t('order.fulfillment', 'Delivery Information')}
          </h3>
          <span className={`px-2.5 py-0.5 rounded-full text-xs font-bold ${
            order.fulfillment_method === 'PICKUP'
              ? 'bg-amber-100 text-amber-800 border border-amber-200'
              : 'bg-emerald-100 text-emerald-800 border border-emerald-200'
          }`}>
            {order.fulfillment_method === 'PICKUP' ? `🚜 ${t('order.pickup', 'Farm Self-Pickup')}` : `🚚 ${t('order.delivery', 'Farm Direct Delivery')}`}
          </span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs text-slate-600">
          <div>
            <span className="text-slate-400 text-[11px] block">{t('order.customer', 'Customer Full Name')}</span>
            <strong className="text-slate-900 font-bold text-sm">{order.delivery_name}</strong>
          </div>

          <div>
            <span className="text-slate-400 text-[11px] block">{t('order.phone', 'Contact Mobile Phone')}</span>
            <a href={`tel:${order.delivery_phone}`} className="text-agro-700 font-bold hover:underline">
              {order.delivery_phone}
            </a>
          </div>

          <div className="sm:col-span-2">
            <span className="text-slate-400 text-[11px] block">
              {order.fulfillment_method === 'PICKUP' ? t('profile.pickup_instructions', 'Designated Pickup Location') : t('order.address', 'Delivery Address')}
            </span>
            <p className="font-medium text-slate-800">{order.delivery_address}</p>
          </div>

          {order.delivery_fee > 0 && (
            <div>
              <span className="text-slate-400 text-[11px] block">{t('profile.delivery_fee', 'Delivery Fee')}</span>
              <strong className="text-emerald-700 font-bold">{formatPKR(order.delivery_fee)}</strong>
            </div>
          )}

          {order.delivery_notes && (
            <div className="sm:col-span-2">
              <span className="text-slate-400 text-[11px] block">{t('order.notes', 'Customer Special Instructions')}</span>
              <p className="italic text-slate-700 bg-slate-50 p-2.5 rounded-xl border border-slate-200">
                "{order.delivery_notes}"
              </p>
            </div>
          )}
        </div>
      </div>

      {/* Ordered Crop Items Card */}
      <div className="bg-white rounded-3xl border border-slate-200 shadow-sm overflow-hidden space-y-4">
        <div className="p-6 border-b border-slate-100 flex items-center justify-between">
          <h3 className="font-bold text-slate-900 text-sm flex items-center gap-2">
            <ShoppingBag className="w-4 h-4 text-agro-600" />
            {t('order.items', 'Harvest Lots in this Order')}
          </h3>
          <span className="text-xs text-slate-400 font-medium">
            {order.items?.length || 0} produce lot{order.items?.length > 1 ? 's' : ''}
          </span>
        </div>

        <div className="divide-y divide-slate-100 px-6 pb-4">
          {order.items?.map((item) => (
            <div key={item.id} className="py-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div className="flex items-center gap-3">
                <img
                  src={item.product_image || 'https://images.unsplash.com/photo-1500937386664-56d1dfef3854?auto=format&fit=crop&w=100&q=80'}
                  alt={item.product_title}
                  className="w-14 h-14 rounded-xl object-cover border border-slate-200 bg-slate-100 flex-shrink-0"
                />
                <div>
                  <h4 className="font-bold text-xs text-slate-900">{item.product_title}</h4>
                  <p className="text-[11px] text-slate-500 mt-0.5">
                    {t('product.stock', 'Quantity')}: <strong className="text-slate-800">{item.quantity} {item.product_unit}</strong> @ {formatPKR(item.unit_price)} / {item.product_unit}
                  </p>
                </div>
              </div>

              <div className="flex items-center justify-between sm:justify-end gap-4 pt-2 sm:pt-0 border-t sm:border-t-0 border-slate-50">
                <span className="font-black text-sm text-slate-900">
                  {formatPKR(item.subtotal)}
                </span>
                <button
                  onClick={() => handleOpenBuyerChat(item.product_id)}
                  className="px-3 py-1.5 rounded-xl bg-slate-100 hover:bg-agro-50 text-slate-700 hover:text-agro-700 font-bold text-xs transition-colors flex items-center gap-1.5"
                  title="Direct chat with buyer"
                >
                  <MessageSquare className="w-3.5 h-3.5" />
                  <span>{t('action.chat', 'Chat')}</span>
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Official Printable Receipt Modal */}
      <PrintableReceiptModal
        isOpen={receiptModalOpen}
        onClose={() => setReceiptModalOpen(false)}
        receiptData={{
          receiptNumber: `RCP-${order.order_number}`,
          orderNumber: order.order_number,
          orderDate: order.created_at,
          buyerName: order.delivery_name,
          buyerPhone: order.delivery_phone,
          deliveryAddress: order.delivery_address,
          paymentMethod: 'COD',
          paymentStatus: order.payment_status || 'UNPAID',
          orderStatus: order.status || 'PENDING',
          fulfillmentMethod: isPickupOrder ? 'PICKUP' : 'DELIVERY',
          pickupInstructions: order.pickup_instructions,
          totalAmount: order.subtotal,
          items: order.items || []
        }}
      />
    </div>
  );
};

export default SellerOrderDetailPage;
