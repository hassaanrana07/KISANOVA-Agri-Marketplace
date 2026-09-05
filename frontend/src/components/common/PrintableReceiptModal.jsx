import React, { useRef } from 'react';
import { X, Printer, Sprout, CheckCircle, ShieldCheck, Truck, MapPin } from 'lucide-react';
import { formatPKR } from '../../utils/currency';

const PrintableReceiptModal = ({ isOpen, onClose, receiptData }) => {
  const printContentRef = useRef(null);

  if (!isOpen || !receiptData) return null;

  const handlePrint = () => {
    window.print();
  };

  const isPaid = receiptData.paymentStatus === 'PAID';
  const isPickup = receiptData.fulfillmentMethod === 'PICKUP';

  return (
    <div className="fixed inset-0 z-50 bg-slate-950/75 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto">
      <div className="bg-white rounded-3xl max-w-2xl w-full p-6 sm:p-8 shadow-2xl border border-slate-200 my-8 space-y-6 text-slate-900 animate-fadeIn">
        {/* Modal Controls (Hidden in Print) */}
        <div className="flex items-center justify-between pb-4 border-b border-slate-200 print:hidden">
          <div className="flex items-center gap-2">
            <Printer className="w-5 h-5 text-agro-700" />
            <span className="font-bold text-sm text-slate-800">Official Agricultural Harvest Receipt</span>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={handlePrint}
              className="px-3.5 py-1.5 bg-agro-600 hover:bg-agro-700 text-white rounded-xl text-xs font-bold transition-colors flex items-center gap-1.5 shadow-sm"
            >
              <Printer className="w-3.5 h-3.5" />
              <span>Print / Save as PDF</span>
            </button>
            <button
              onClick={onClose}
              className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* ==================================================== */}
        {/* PRINTABLE RECEIPT CONTENT CONTAINER                  */}
        {/* ==================================================== */}
        <div ref={printContentRef} className="space-y-6 p-2 bg-white">
          {/* Receipt Header */}
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 pb-6 border-b-2 border-slate-900">
            <div className="flex items-center gap-2.5">
              <div className="w-11 h-11 rounded-xl bg-agro-700 text-white flex items-center justify-center font-bold shadow">
                <Sprout className="w-7 h-7" />
              </div>
              <div>
                <h1 className="text-xl font-black tracking-tight text-slate-900">
                  KISAN<span className="text-agro-700">OVA</span>
                </h1>
                <p className="text-[10px] uppercase font-bold tracking-wider text-slate-500">
                  Official Agricultural Transaction Voucher
                </p>
              </div>
            </div>

            <div className="sm:text-right space-y-0.5">
              <span className="text-xs font-mono font-bold text-agro-800 block">
                {receiptData.receiptNumber || `RCP-${receiptData.orderNumber}`}
              </span>
              <p className="text-[11px] text-slate-500">
                Date: {new Date(receiptData.orderDate || Date.now()).toLocaleDateString()}
              </p>
            </div>
          </div>

          {/* Party Details: Consignee & Fulfillment */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 p-4 rounded-2xl bg-slate-50 border border-slate-200 text-xs">
            <div>
              <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block mb-1">
                Consignee / Buyer Details
              </span>
              <p className="font-bold text-slate-900 text-sm">{receiptData.buyerName}</p>
              <p className="text-slate-600 mt-0.5">{receiptData.buyerPhone}</p>
              <p className="text-slate-600 mt-0.5 leading-relaxed">{receiptData.deliveryAddress}</p>

              <div className="mt-2 pt-2 border-t border-slate-200 flex items-center gap-1.5 text-slate-700">
                <Truck className="w-3.5 h-3.5 text-agro-600" />
                <span>
                  Fulfillment:{' '}
                  <strong className="text-agro-800 uppercase">
                    {isPickup ? 'Farm Gate Pickup' : 'Direct Delivery'}
                  </strong>
                </span>
              </div>
              {isPickup && receiptData.pickupInstructions && (
                <p className="text-[11px] text-slate-500 mt-1 italic">
                  Pickup: {receiptData.pickupInstructions}
                </p>
              )}
            </div>

            <div>
              <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block mb-1">
                Payment & Settlement
              </span>
              <p className="font-bold text-slate-900">
                Method: <span className="text-agro-800 uppercase">{receiptData.paymentMethod}</span>
              </p>
              {receiptData.onlineProvider && (
                <p className="text-slate-600 mt-0.5">
                  Gateway Provider: <strong className="uppercase">{receiptData.onlineProvider}</strong>
                </p>
              )}
              <p className="text-slate-600 mt-0.5 font-mono text-[11px] truncate">
                Ref: {receiptData.transactionReference}
              </p>
              <div className="mt-2">
                <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-bold ${
                  isPaid ? 'bg-emerald-100 text-emerald-800' : 'bg-amber-100 text-amber-800'
                }`}>
                  <CheckCircle className="w-3.5 h-3.5" />
                  Status: {receiptData.paymentStatus}
                </span>
              </div>
            </div>
          </div>

          {/* Itemized Harvest Products Table */}
          <div className="border border-slate-200 rounded-2xl overflow-hidden">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-100 text-slate-600 font-bold uppercase text-[10px] tracking-wider">
                <tr>
                  <th className="py-2.5 px-4">Agricultural Crop</th>
                  <th className="py-2.5 px-4">Cultivator / Farm</th>
                  <th className="py-2.5 px-4 text-center">Qty</th>
                  <th className="py-2.5 px-4 text-right">Unit Price</th>
                  <th className="py-2.5 px-4 text-right">Total (PKR)</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {receiptData.items?.map((item, i) => (
                  <tr key={i}>
                    <td className="py-3 px-4 font-semibold text-slate-900">
                      {item.product_title || item.title}
                    </td>
                    <td className="py-3 px-4 text-slate-600">
                      {item.farm_name || 'Verified Farm'}
                    </td>
                    <td className="py-3 px-4 text-center font-bold text-slate-800">
                      {item.quantity} {item.product_unit || item.unit || 'kg'}
                    </td>
                    <td className="py-3 px-4 text-right text-slate-600">
                      {formatPKR(item.unit_price || item.price)}
                    </td>
                    <td className="py-3 px-4 text-right font-black text-slate-900">
                      {formatPKR(item.subtotal || item.quantity * item.price)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Totals Section in PKR */}
          <div className="flex justify-end pt-2">
            <div className="w-72 space-y-2 text-xs text-right">
              <div className="flex justify-between text-slate-600">
                <span>Fulfillment Fee:</span>
                <span className="font-semibold text-slate-900">
                  {receiptData.deliveryFee > 0 ? formatPKR(receiptData.deliveryFee) : 'Free (Pickup)'}
                </span>
              </div>

              {receiptData.amountPaid > 0 && receiptData.amountRemaining > 0 && (
                <>
                  <div className="flex justify-between text-emerald-700 font-semibold">
                    <span>Paid Amount:</span>
                    <span>{formatPKR(receiptData.amountPaid)}</span>
                  </div>
                  <div className="flex justify-between text-amber-700 font-semibold">
                    <span>Amount Remaining:</span>
                    <span>{formatPKR(receiptData.amountRemaining)}</span>
                  </div>
                </>
              )}

              <div className="flex justify-between text-base font-black text-slate-900 pt-2 border-t border-slate-900">
                <span>Total Amount:</span>
                <span className="text-xl text-agro-800">{formatPKR(receiptData.totalAmount)}</span>
              </div>
            </div>
          </div>

          {/* Authenticity Footer */}
          <div className="pt-4 border-t border-dashed border-slate-300 text-[10px] text-slate-400 text-center space-y-1">
            <p>
              Generated by Kisanova Agricultural Marketplace Engine • Order #{receiptData.orderNumber}
            </p>
            <p className="italic">
              Official harvest dispatch document for freight handling, logistics verification, and tax audit records.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default PrintableReceiptModal;
