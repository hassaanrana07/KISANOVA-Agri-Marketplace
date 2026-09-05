import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import {
  ShieldCheck,
  Building,
  CheckCircle,
  Truck,
  ArrowRight,
  AlertCircle,
  MapPin,
  Clock,
  Banknote,
  ShoppingBag,
  Printer
} from 'lucide-react';
import api from '../../services/api';
import { useCart } from '../../context/CartContext';
import { useAuth } from '../../context/AuthContext';
import { formatPKR } from '../../utils/currency';
import PrintableReceiptModal from '../../components/common/PrintableReceiptModal';

const CheckoutPage = () => {
  const { groupedBySeller, grandTotal, totalItemsCount, clearCart } = useCart();
  const { user } = useAuth();
  const navigate = useNavigate();

  // Form State
  const [deliveryName, setDeliveryName] = useState(user?.name || '');
  const [deliveryPhone, setDeliveryPhone] = useState(user?.phone || '');
  const [deliveryAddress, setDeliveryAddress] = useState('');
  const [deliveryNotes, setDeliveryNotes] = useState('');
  const [fulfillmentMethod, setFulfillmentMethod] = useState('DELIVERY'); // 'DELIVERY' or 'PICKUP'

  // Submitting state & Success Modal
  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [orderSuccessData, setOrderSuccessData] = useState(null);
  const [receiptModalOpen, setReceiptModalOpen] = useState(false);

  // Calculate fulfillment capabilities and fees from cart sellers
  const allSupportDelivery = groupedBySeller.every((g) => g.delivery_available !== false);
  const allSupportPickup = groupedBySeller.every((g) => g.pickup_available !== false);

  // Aggregate delivery fees across unique sellers
  const totalDeliveryFee = groupedBySeller.reduce((sum, g) => {
    return sum + (g.delivery_fee !== undefined ? parseFloat(g.delivery_fee) : 300);
  }, 0);

  const effectiveDeliveryFee = fulfillmentMethod === 'DELIVERY' ? totalDeliveryFee : 0;
  const finalPayableTotal = grandTotal + effectiveDeliveryFee;

  const handlePlaceOrder = async (e) => {
    e.preventDefault();
    setErrorMessage('');

    if (!deliveryName || !deliveryPhone) {
      setErrorMessage('Please provide recipient name and contact mobile phone number.');
      return;
    }

    if (fulfillmentMethod === 'DELIVERY' && (!deliveryAddress || !deliveryAddress.trim())) {
      setErrorMessage('Please provide a delivery drop-off address for courier delivery.');
      return;
    }

    if (groupedBySeller.length === 0) {
      setErrorMessage('Your cart is empty. Please add items before checking out.');
      return;
    }

    if (fulfillmentMethod === 'DELIVERY' && !allSupportDelivery) {
      setErrorMessage('One or more farms in your cart do not offer direct delivery. Please select Farm Self-Pickup.');
      return;
    }

    if (fulfillmentMethod === 'PICKUP' && !allSupportPickup) {
      setErrorMessage('One or more farms in your cart do not support farm pickup. Please select Delivery.');
      return;
    }

    setLoading(true);

    try {
      // Place Cash on Delivery order
      const res = await api.post('/orders/checkout', {
        delivery_name: deliveryName,
        delivery_phone: deliveryPhone,
        delivery_address: deliveryAddress,
        delivery_notes: deliveryNotes,
        fulfillment_method: fulfillmentMethod
      });

      if (res.data.success) {
        setOrderSuccessData(res.data.data);
        clearCart();
      } else {
        setErrorMessage(res.data.message || 'Failed to complete order.');
      }
    } catch (err) {
      console.error('Order placement error:', err);
      setErrorMessage(err.response?.data?.message || 'Error processing your checkout request.');
    } finally {
      setLoading(false);
    }
  };

  if (groupedBySeller.length === 0 && !orderSuccessData) {
    return (
      <div className="max-w-2xl mx-auto py-16 px-4 text-center space-y-4">
        <div className="w-16 h-16 bg-slate-100 rounded-full flex items-center justify-center mx-auto text-slate-400">
          <ShoppingBag className="w-8 h-8" />
        </div>
        <h2 className="text-2xl font-black text-slate-900">Your Harvest Basket is Empty</h2>
        <p className="text-xs sm:text-sm text-slate-500">
          Add fresh agricultural lots and produce directly from verified farmers before proceeding to checkout.
        </p>
        <Link
          to="/products"
          className="inline-flex items-center gap-2 px-6 py-3 bg-agro-600 hover:bg-agro-700 text-white rounded-xl font-bold text-xs shadow-md transition-colors"
        >
          <span>Explore Farm Marketplace</span>
          <ArrowRight className="w-4 h-4" />
        </Link>
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
      {/* Page Title */}
      <div>
        <h1 className="text-2xl sm:text-3xl font-black text-slate-900 tracking-tight">
          Checkout & Dispatch Order
        </h1>
        <p className="text-xs sm:text-sm text-slate-500 mt-1">
          Review destination details and confirm Cash on Delivery with Pakistan's direct farm network.
        </p>
      </div>

      {errorMessage && (
        <div className="p-4 rounded-2xl bg-red-50 border border-red-200 text-red-700 text-xs font-semibold flex items-center gap-3">
          <AlertCircle className="w-5 h-5 flex-shrink-0" />
          <span>{errorMessage}</span>
        </div>
      )}

      {/* Success Modal / Banner when order placed */}
      {orderSuccessData && (
        <div className="bg-emerald-50 border-2 border-emerald-500 rounded-3xl p-6 sm:p-8 space-y-6 shadow-xl animate-in fade-in">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-2xl bg-emerald-600 text-white flex items-center justify-center flex-shrink-0 shadow-md">
                <CheckCircle className="w-7 h-7" />
              </div>
              <div>
                <h2 className="text-xl sm:text-2xl font-black text-slate-900">
                  Order Successfully Placed!
                </h2>
                <p className="text-xs font-bold text-emerald-800">
                  Order Reference: <span className="font-mono">{orderSuccessData.orderNumber}</span>
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <button
                onClick={() => setReceiptModalOpen(true)}
                className="px-4 py-2.5 bg-white border border-slate-300 hover:bg-slate-50 text-slate-800 rounded-xl text-xs font-bold transition-colors flex items-center gap-1.5 shadow-sm"
              >
                <Printer className="w-4 h-4 text-agro-600" />
                <span>Print Official Receipt</span>
              </button>
              <Link
                to={`/orders/${orderSuccessData.orderId}`}
                className="px-5 py-2.5 bg-slate-900 hover:bg-agro-600 text-white rounded-xl text-xs font-bold transition-colors inline-flex items-center gap-1.5 shadow-sm"
              >
                <span>View Order Details</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </Link>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 bg-white/80 p-4 rounded-2xl border border-emerald-200 text-xs">
            <div>
              <span className="text-slate-400 block font-bold text-[10px] uppercase">Payment Method</span>
              <strong className="text-slate-900 text-sm flex items-center gap-1 mt-0.5">
                <Banknote className="w-4 h-4 text-emerald-600" />
                Cash on Delivery (COD)
              </strong>
            </div>
            <div>
              <span className="text-slate-400 block font-bold text-[10px] uppercase">Payment Status</span>
              <span className="inline-block mt-0.5 px-2.5 py-0.5 bg-amber-100 text-amber-800 rounded-full font-bold text-[11px]">
                UNPAID (Pay on Delivery)
              </span>
            </div>
            <div>
              <span className="text-slate-400 block font-bold text-[10px] uppercase">Total Payable Amount</span>
              <strong className="text-slate-900 text-base font-black mt-0.5 block">
                {formatPKR(orderSuccessData.totalAmount)}
              </strong>
            </div>
          </div>
        </div>
      )}

      {/* Main Checkout Form */}
      {!orderSuccessData && (
        <form onSubmit={handlePlaceOrder} className="grid grid-cols-1 lg:grid-cols-12 gap-8">
          {/* Left Column: Fulfillment & Recipient Details */}
          <div className="lg:col-span-7 space-y-6">
            {/* 1. Fulfillment Method Selection */}
            <div className="bg-white rounded-3xl border border-slate-200 p-6 shadow-sm space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                  <Truck className="w-4 h-4 text-agro-600" />
                  Select Fulfillment Mode
                </h3>
                <span className="text-[11px] text-slate-400 font-medium">Pakistani Agricultural Transport</span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {/* Delivery Option */}
                <label
                  className={`p-4 rounded-2xl border-2 cursor-pointer transition-all flex items-start gap-3 ${
                    fulfillmentMethod === 'DELIVERY'
                      ? 'border-agro-600 bg-agro-50/50 shadow-sm'
                      : 'border-slate-200 hover:border-slate-300 bg-white'
                  }`}
                >
                  <input
                    type="radio"
                    name="fulfillment"
                    value="DELIVERY"
                    checked={fulfillmentMethod === 'DELIVERY'}
                    onChange={() => setFulfillmentMethod('DELIVERY')}
                    className="mt-1 text-agro-600 focus:ring-agro-500"
                  />
                  <div className="min-w-0">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold text-slate-900">Farm Direct Delivery</span>
                    </div>
                    <p className="text-[11px] text-slate-500 mt-1">
                      Direct courier / agricultural transport to your doorstep.
                    </p>
                    <div className="mt-2 text-xs font-bold text-agro-700">
                      Fee: {formatPKR(totalDeliveryFee)}
                    </div>
                  </div>
                </label>

                {/* Farm Pickup Option */}
                <label
                  className={`p-4 rounded-2xl border-2 cursor-pointer transition-all flex items-start gap-3 ${
                    fulfillmentMethod === 'PICKUP'
                      ? 'border-agro-600 bg-agro-50/50 shadow-sm'
                      : 'border-slate-200 hover:border-slate-300 bg-white'
                  }`}
                >
                  <input
                    type="radio"
                    name="fulfillment"
                    value="PICKUP"
                    checked={fulfillmentMethod === 'PICKUP'}
                    onChange={() => setFulfillmentMethod('PICKUP')}
                    className="mt-1 text-agro-600 focus:ring-agro-500"
                  />
                  <div className="min-w-0">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold text-slate-900">Farm Gate Self-Pickup</span>
                    </div>
                    <p className="text-[11px] text-slate-500 mt-1">
                      Collect directly from farmer's loading dock / harvest gate.
                    </p>
                    <div className="mt-2 text-xs font-bold text-emerald-700">
                      Fee: Free (PKR 0)
                    </div>
                  </div>
                </label>
              </div>
            </div>

            {/* 2. Destination & Contact Information */}
            <div className="bg-white rounded-3xl border border-slate-200 p-6 shadow-sm space-y-4">
              <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2 pb-2 border-b border-slate-100">
                <MapPin className="w-4 h-4 text-agro-600" />
                Recipient & Dispatch Destination
              </h3>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="text-xs font-bold text-slate-700 block mb-1">
                    Recipient Full Name *
                  </label>
                  <input
                    type="text"
                    required
                    value={deliveryName}
                    onChange={(e) => setDeliveryName(e.target.value)}
                    placeholder="e.g. Muhammad Ahmad"
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2.5 text-xs font-medium focus:outline-none focus:ring-2 focus:ring-agro-500"
                  />
                </div>

                <div>
                  <label className="text-xs font-bold text-slate-700 block mb-1">
                    Contact Mobile Phone *
                  </label>
                  <input
                    type="tel"
                    required
                    value={deliveryPhone}
                    onChange={(e) => setDeliveryPhone(e.target.value)}
                    placeholder="e.g. 03001234567"
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2.5 text-xs font-medium focus:outline-none focus:ring-2 focus:ring-agro-500"
                  />
                </div>

                <div className="sm:col-span-2">
                  <label className="text-xs font-bold text-slate-700 block mb-1">
                    Delivery Address / Drop-off Location {fulfillmentMethod === 'DELIVERY' ? '*' : '(Optional for Farm Gate Pickup)'}
                  </label>
                  <textarea
                    required={fulfillmentMethod === 'DELIVERY'}
                    rows="3"
                    value={deliveryAddress}
                    onChange={(e) => setDeliveryAddress(e.target.value)}
                    placeholder={
                      fulfillmentMethod === 'DELIVERY'
                        ? 'House/Plot number, Street, Chak / Union Council, Tehsil, District, Province...'
                        : 'Not required for Farm Gate Pickup. You can specify vehicle number or pickup details here...'
                    }
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2.5 text-xs font-medium focus:outline-none focus:ring-2 focus:ring-agro-500"
                  />
                </div>

                <div className="sm:col-span-2">
                  <label className="text-xs font-bold text-slate-700 block mb-1">
                    Logistics / Handling Notes (Optional)
                  </label>
                  <input
                    type="text"
                    value={deliveryNotes}
                    onChange={(e) => setDeliveryNotes(e.target.value)}
                    placeholder="e.g. Call before arrival, unloading staff available, gate code..."
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2.5 text-xs font-medium focus:outline-none focus:ring-2 focus:ring-agro-500"
                  />
                </div>
              </div>
            </div>

            {/* 3. Payment Method: Pure Cash on Delivery / Farm Pickup */}
            <div className="bg-white rounded-3xl border border-slate-200 p-6 shadow-sm space-y-4">
              <div className="flex items-center justify-between pb-2 border-b border-slate-100">
                <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                  <Banknote className="w-4 h-4 text-emerald-600" />
                  Payment Method
                </h3>
                <span className="text-[11px] font-bold text-emerald-700 bg-emerald-50 px-2.5 py-0.5 rounded-full border border-emerald-200">
                  {fulfillmentMethod === 'PICKUP' ? 'Farm Gate Cash Only' : 'Cash on Delivery Only'}
                </span>
              </div>

              {/* Dynamic COD vs Farm Pickup Card */}
              <div className="p-4 rounded-2xl bg-slate-50 border-2 border-emerald-500/80 space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-emerald-600 text-white flex items-center justify-center shadow-sm">
                      <Banknote className="w-5 h-5" />
                    </div>
                    <div>
                      <h4 className="text-xs font-black text-slate-900">
                        {fulfillmentMethod === 'PICKUP'
                          ? 'Cash at Farm Gate Pickup'
                          : 'Cash on Delivery (COD)'}
                      </h4>
                      <p className="text-[11px] text-slate-500 mt-0.5">
                        {fulfillmentMethod === 'PICKUP'
                          ? 'Inspect your harvest on-site at the farm gate and hand cash directly to the farmer.'
                          : 'Inspect produce quality upon arrival and hand physical cash to the courier representative.'}
                      </p>
                    </div>
                  </div>
                  <span className="w-4 h-4 rounded-full border-2 border-emerald-600 bg-emerald-600 flex items-center justify-center">
                    <span className="w-1.5 h-1.5 rounded-full bg-white"></span>
                  </span>
                </div>

                <div className="pt-3 border-t border-slate-200 text-[11px] text-slate-600 space-y-1">
                  <div className="flex items-center gap-2 text-emerald-800 font-semibold">
                    <CheckCircle className="w-3.5 h-3.5 text-emerald-600 flex-shrink-0" />
                    <span>No online cards, digital wallets, or upfront payment required.</span>
                  </div>
                  <div className="flex items-center gap-2 text-slate-500">
                    <Clock className="w-3.5 h-3.5 text-slate-400 flex-shrink-0" />
                    <span>Payment status starts as UNPAID until cash collection is confirmed.</span>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Right Column: Order Summary & Place Order Action */}
          <div className="lg:col-span-5 space-y-6">
            <div className="bg-white rounded-3xl border border-slate-200 p-6 shadow-sm space-y-6 sticky top-24">
              <h3 className="font-black text-base text-slate-900">Order Harvest Summary</h3>

              {/* Grouped by Seller */}
              <div className="space-y-4 max-h-64 overflow-y-auto divide-y divide-slate-100 pr-1">
                {groupedBySeller.map((group) => (
                  <div key={group.seller_id} className="pt-3 first:pt-0 space-y-2">
                    <div className="flex items-center justify-between text-xs font-bold text-slate-800">
                      <span className="flex items-center gap-1.5 text-agro-800">
                        <Building className="w-3.5 h-3.5 text-agro-600" />
                        {group.farm_name}
                      </span>
                      <span className="text-slate-500 font-medium">
                        {group.items.length} item{group.items.length > 1 ? 's' : ''}
                      </span>
                    </div>

                    {group.estimated_delivery_min_days && fulfillmentMethod === 'DELIVERY' && (
                      <div className="text-[10px] text-slate-500">
                        Est. Delivery: {group.estimated_delivery_min_days}–{group.estimated_delivery_max_days || 4} days
                      </div>
                    )}
                    {group.pickup_instructions && fulfillmentMethod === 'PICKUP' && (
                      <div className="text-[10px] text-emerald-700 font-medium">
                        Pickup: {group.pickup_instructions}
                      </div>
                    )}

                    <div className="space-y-1.5 pl-2">
                      {group.items.map((item) => (
                        <div key={item.product_id} className="flex items-center justify-between text-[11px] text-slate-600">
                          <span className="truncate max-w-[200px]">
                            {item.quantity} {item.unit} × {item.title}
                          </span>
                          <span className="font-semibold text-slate-900">
                            {formatPKR(item.subtotal)}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
              </div>

              {/* Cost Calculations */}
              <div className="pt-4 border-t border-slate-100 space-y-2.5 text-xs">
                <div className="flex items-center justify-between text-slate-600">
                  <span>Harvest Subtotal ({totalItemsCount} items)</span>
                  <span className="font-bold text-slate-900">{formatPKR(grandTotal)}</span>
                </div>

                <div className="flex items-center justify-between text-slate-600">
                  <span>Fulfillment ({fulfillmentMethod === 'DELIVERY' ? 'Direct Delivery' : 'Farm Pickup'})</span>
                  <span className="font-bold text-slate-900">
                    {fulfillmentMethod === 'DELIVERY' ? formatPKR(effectiveDeliveryFee) : 'Free'}
                  </span>
                </div>

                <div className="pt-3 border-t border-slate-200 flex items-center justify-between">
                  <div>
                    <span className="text-xs font-bold text-slate-900 block">
                      {fulfillmentMethod === 'PICKUP' ? 'Total Due at Farm Gate' : 'Total Due on Delivery'}
                    </span>
                    <span className="text-[10px] text-slate-400">All taxes and produce fees included</span>
                  </div>
                  <span className="text-2xl font-black text-agro-700">
                    {formatPKR(finalPayableTotal)}
                  </span>
                </div>
              </div>

              {/* Submit Button */}
              <button
                type="submit"
                disabled={loading}
                className="w-full py-4 bg-agro-600 hover:bg-agro-700 disabled:bg-slate-300 text-white rounded-2xl font-black text-sm shadow-xl shadow-agro-600/20 transition-all flex items-center justify-center gap-2"
              >
                {loading ? (
                  <div className="animate-spin rounded-full h-5 w-5 border-t-2 border-b-2 border-white"></div>
                ) : (
                  <>
                    <span>
                      {fulfillmentMethod === 'PICKUP'
                        ? 'Confirm Farm Gate Pickup Order'
                        : 'Confirm Cash on Delivery Order'}
                    </span>
                    <ArrowRight className="w-4 h-4" />
                  </>
                )}
              </button>

              <div className="flex items-center justify-center gap-1.5 text-[11px] text-slate-400 font-medium text-center">
                <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />
                <span>Protected by Kisanova Guaranteed Produce Quality</span>
              </div>
            </div>
          </div>
        </form>
      )}

      {/* Printable Receipt Modal */}
      {orderSuccessData && (
        <PrintableReceiptModal
          isOpen={receiptModalOpen}
          onClose={() => setReceiptModalOpen(false)}
          receiptData={{
            receiptNumber: `RCP-${orderSuccessData.orderNumber}`,
            orderNumber: orderSuccessData.orderNumber,
            orderDate: new Date().toISOString(),
            buyerName: deliveryName,
            buyerPhone: deliveryPhone,
            deliveryAddress: deliveryAddress,
            paymentMethod: fulfillmentType === 'FARM_PICKUP' ? 'FARM_PICKUP' : 'COD',
            paymentStatus: 'UNPAID',
            orderStatus: 'PENDING',
            fulfillmentMethod: fulfillmentType === 'FARM_PICKUP' ? 'FARM_PICKUP' : 'DELIVERY',
            totalAmount: orderSuccessData.totalAmount,
            items: []
          }}
        />
      )}
    </div>
  );
};

export default CheckoutPage;
