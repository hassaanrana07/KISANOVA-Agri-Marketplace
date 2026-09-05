import React, { useState, useEffect } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import {
  Package,
  Building,
  CheckCircle,
  Clock,
  Truck,
  MapPin,
  Phone,
  ArrowLeft,
  MessageSquare,
  ShieldCheck,
  AlertCircle,
  Printer
} from 'lucide-react';
import api from '../../services/api';
import PrintableReceiptModal from '../../components/common/PrintableReceiptModal';
import { formatPKR } from '../../utils/currency';

const OrderDetailPage = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const [orderData, setOrderData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [receiptModalOpen, setReceiptModalOpen] = useState(false);
  const [receiptData, setReceiptData] = useState(null);

  useEffect(() => {
    const fetchOrder = async () => {
      setLoading(true);
      try {
        const res = await api.get(`/orders/${id}`);
        if (res.data.success) {
          setOrderData(res.data.data);
        } else {
          setError(res.data.message);
        }
      } catch (err) {
        setError(err.response?.data?.message || 'Failed to load order details.');
      } finally {
        setLoading(false);
      }
    };

    fetchOrder();
  }, [id]);

  const handleChatWithSeller = async (sellerId, productId) => {
    try {
      const res = await api.post('/chat/conversations', {
        seller_id: sellerId,
        product_id: productId,
        order_id: parseInt(id)
      });
      if (res.data.success) {
        navigate(`/chat?conversationId=${res.data.data.conversation_id}`);
      }
    } catch (err) {
      alert(err.response?.data?.message || 'Failed to start chat with seller.');
    }
  };

  const handleOpenReceipt = async () => {
    try {
      const res = await api.get(`/payments/receipt/${id}`);
      if (res.data.success) {
        setReceiptData(res.data.data);
        setReceiptModalOpen(true);
        return;
      }
    } catch (e) {
      // Fallback format from orderData
    }

    const allItems = [];
    sellerOrders.forEach(so => {
      so.items.forEach(itm => {
        allItems.push({ ...itm, farm_name: so.farm_name });
      });
    });

    setReceiptData({
      receiptNumber: `RCP-${order.order_number}`,
      orderNumber: order.order_number,
      orderDate: order.created_at,
      buyerName: order.delivery_name,
      buyerPhone: order.delivery_phone,
      deliveryAddress: order.delivery_address,
      paymentMethod: order.payment_method || 'COD',
      onlineProvider: order.online_provider,
      paymentStatus: order.payment_status,
      transactionReference: order.transaction_reference || 'N/A',
      totalAmount: order.total_amount,
      items: allItems
    });
    setReceiptModalOpen(true);
  };

  if (loading) {
    return (
      <div className="max-w-5xl mx-auto px-4 py-20 flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-agro-600"></div>
      </div>
    );
  }

  if (error || !orderData) {
    return (
      <div className="max-w-md mx-auto px-4 py-16 text-center space-y-4">
        <AlertCircle className="w-12 h-12 text-red-500 mx-auto" />
        <h2 className="text-xl font-bold text-slate-900">{error || 'Order Not Found'}</h2>
        <Link to="/orders" className="inline-block px-4 py-2 bg-agro-600 text-white rounded-xl text-xs font-bold">
          Back to My Orders
        </Link>
      </div>
    );
  }

  const { order, sellerOrders, payment } = orderData;

  return (
    <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-10 space-y-8">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-6 border-b border-slate-200">
        <div className="space-y-1">
          <Link to="/orders" className="text-xs font-bold text-slate-500 hover:text-agro-600 flex items-center gap-1 mb-2">
            <ArrowLeft className="w-3.5 h-3.5" />
            <span>Back to My Orders</span>
          </Link>
          <div className="flex items-center gap-3">
            <h1 className="text-2xl sm:text-3xl font-black text-slate-900">
              Order #{order.order_number}
            </h1>
            {order.payment_status === 'PAID' ? (
              <span className="px-3 py-1 bg-emerald-100 text-emerald-800 rounded-full text-xs font-bold flex items-center gap-1">
                <CheckCircle className="w-3.5 h-3.5" />
                PAID
              </span>
            ) : (
              <span className="px-3 py-1 bg-amber-100 text-amber-800 rounded-full text-xs font-bold flex items-center gap-1">
                <Clock className="w-3.5 h-3.5" />
                PENDING
              </span>
            )}
          </div>
          <p className="text-xs text-slate-500">
            Placed on {new Date(order.created_at).toLocaleString()}
          </p>
        </div>

        <div className="flex items-center gap-3 sm:text-right">
          <button
            onClick={handleOpenReceipt}
            className="px-3.5 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-800 text-xs font-bold transition-colors flex items-center gap-1.5 shadow-sm border border-slate-200"
          >
            <Printer className="w-3.5 h-3.5 text-agro-700" />
            <span>Official Receipt</span>
          </button>
          <div>
            <span className="text-xs text-slate-400 block">Combined Total</span>
            <span className="text-3xl font-black text-slate-900">
              {formatPKR(order.total_amount)}
            </span>
          </div>
        </div>
      </div>

      {/* Delivery & Payment Info Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Delivery Destination */}
        <div className="bg-white rounded-3xl border border-slate-200 p-6 shadow-sm space-y-3">
          <h3 className="font-bold text-slate-900 text-sm flex items-center gap-2">
            <Truck className="w-4 h-4 text-agro-600" />
            Delivery Destination
          </h3>
          <div className="text-xs text-slate-600 space-y-1.5 pt-1">
            <p className="font-bold text-slate-900 text-sm">{order.delivery_name}</p>
            <div className="flex items-center gap-2">
              <Phone className="w-3.5 h-3.5 text-slate-400" />
              <span>{order.delivery_phone}</span>
            </div>
            <div className="flex items-start gap-2">
              <MapPin className="w-3.5 h-3.5 text-slate-400 flex-shrink-0 mt-0.5" />
              <span>{order.delivery_address}</span>
            </div>
            {order.delivery_notes && (
              <p className="italic text-slate-500 pt-1">Notes: "{order.delivery_notes}"</p>
            )}
          </div>
        </div>

        {/* Payment Details */}
        <div className="bg-white rounded-3xl border border-slate-200 p-6 shadow-sm space-y-3">
          <h3 className="font-bold text-slate-900 text-sm flex items-center gap-2">
            <ShieldCheck className="w-4 h-4 text-agro-600" />
            Payment Status & Method
          </h3>
          <div className="text-xs text-slate-600 space-y-2 pt-1">
            <div className="flex justify-between">
              <span className="text-slate-500">Gateway Provider:</span>
              <strong className="text-slate-900 uppercase font-mono">{payment?.payment_provider || 'Direct'}</strong>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-500">Transaction Ref:</span>
              <span className="font-mono text-slate-700 truncate max-w-[200px]">{payment?.transaction_reference}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-500">Payment Status:</span>
              <strong className={order.payment_status === 'PAID' ? 'text-emerald-700' : 'text-amber-700'}>
                {order.payment_status}
              </strong>
            </div>
            {payment?.admin_notes && (
              <p className="p-2.5 rounded-xl bg-slate-50 text-[11px] text-slate-600 border border-slate-200">
                <strong>Verification Notes:</strong> {payment.admin_notes}
              </p>
            )}
          </div>
        </div>
      </div>

      {/* Seller Sub-Orders Breakdown */}
      <div className="space-y-6">
        <h2 className="text-xl font-black text-slate-900">
          Independent Farm Dispatches ({sellerOrders.length})
        </h2>

        {sellerOrders.map((so) => (
          <div
            key={so.seller_order_id}
            className="bg-white rounded-3xl border border-slate-200 shadow-sm overflow-hidden"
          >
            {/* Seller Header */}
            <div className="bg-slate-50 border-b border-slate-200 px-6 py-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-xl bg-agro-600 text-white flex items-center justify-center font-bold">
                  <Building className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-sm font-black text-slate-900 flex items-center gap-2">
                    {so.farm_name}
                    <span className="text-[10px] px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 font-bold">
                      Verified Farmer
                    </span>
                  </h3>
                  <div className="flex items-center gap-3 text-xs text-slate-500 mt-0.5">
                    <span>{so.seller_phone}</span>
                    <span>•</span>
                    <span className="truncate max-w-xs">{so.seller_address}</span>
                  </div>
                </div>
              </div>

              {/* Status Badge & Subtotal */}
              <div className="flex items-center gap-4 self-end sm:self-auto">
                <div className="text-right">
                  <span className="text-[10px] text-slate-400 uppercase font-semibold block">Dispatch Status</span>
                  <span className="text-xs font-bold px-2.5 py-1 rounded-full bg-slate-200 text-slate-800 inline-block">
                    {so.seller_order_status}
                  </span>
                </div>
                <div className="text-right border-l border-slate-200 pl-4">
                  <span className="text-[10px] text-slate-400 uppercase font-semibold block">Farm Subtotal</span>
                  <span className="text-sm font-black text-slate-900">
                    {formatPKR(so.subtotal)}
                  </span>
                </div>
              </div>
            </div>

            {/* Items under this sub-order */}
            <div className="divide-y divide-slate-100 px-6">
              {so.items.map((item) => (
                <div key={item.id} className="py-4 flex items-center justify-between gap-4">
                  <div className="flex items-center gap-4">
                    <img
                      src={item.product_image}
                      alt={item.product_title}
                      className="w-14 h-14 rounded-xl object-cover border border-slate-200 bg-slate-100 flex-shrink-0"
                    />
                    <div>
                      <Link
                        to={`/products/${item.product_id}`}
                        className="font-bold text-sm text-slate-900 hover:text-agro-600 transition-colors"
                      >
                        {item.product_title}
                      </Link>
                      <p className="text-xs text-slate-500 mt-0.5">
                        Quantity: <strong className="text-slate-700">{item.quantity} {item.product_unit}</strong> @ {formatPKR(item.unit_price)} / {item.product_unit}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-4">
                    <span className="text-sm font-black text-slate-900">
                      {formatPKR(item.subtotal)}
                    </span>

                    {/* Chat with Seller for this Product */}
                    <button
                      onClick={() => handleChatWithSeller(so.seller_id, item.product_id)}
                      className="p-2 rounded-xl bg-slate-100 hover:bg-agro-50 text-slate-600 hover:text-agro-700 transition-colors"
                      title="Chat with farmer regarding this harvest item"
                    >
                      <MessageSquare className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>

      {/* Official Printable Receipt Modal */}
      <PrintableReceiptModal
        isOpen={receiptModalOpen}
        onClose={() => setReceiptModalOpen(false)}
        receiptData={receiptData}
      />
    </div>
  );
};

export default OrderDetailPage;
