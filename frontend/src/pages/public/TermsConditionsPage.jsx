import React from 'react';
import { Scale, FileText, CheckCircle2, AlertCircle } from 'lucide-react';

const TermsConditionsPage = () => {
  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-12 space-y-10">
      {/* Header */}
      <div className="text-center space-y-3">
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-agro-50 border border-agro-200 text-agro-700 text-xs font-bold uppercase tracking-wider">
          <Scale className="w-4 h-4" />
          Agricultural Trading Agreement
        </div>
        <h1 className="text-3xl sm:text-4xl font-black text-slate-900">Terms & Conditions</h1>
        <p className="text-sm text-slate-500 max-w-2xl mx-auto">
          Please read these terms carefully before transacting on Kisanova Agricultural Marketplace.
        </p>
      </div>

      <div className="bg-white rounded-2xl border border-slate-200 p-6 sm:p-10 space-y-8 text-slate-700 text-sm leading-relaxed shadow-sm">
        <section className="space-y-3">
          <h2 className="text-lg font-bold text-slate-900 flex items-center gap-2">
            <FileText className="w-5 h-5 text-agro-600" />
            1. Farmer & Seller Responsibilities
          </h2>
          <p>
            All cultivators and agricultural cooperatives registering as sellers on Kisanova agree that:
          </p>
          <ul className="list-disc pl-5 space-y-1 text-slate-600">
            <li>They are legally authorized agricultural producers with genuine harvest yield rights.</li>
            <li>All crop specifications, grade descriptions, harvest dates, and photos reflect actual lot conditions.</li>
            <li>Direct publishing of products is permitted for approved farmers; however, listings violating quality or safety regulations will be deactivated immediately by administrators.</li>
            <li>Sellers must honor orders confirmed through Kisanova and coordinate timely courier or freight dispatch.</li>
          </ul>
        </section>

        <section className="space-y-3">
          <h2 className="text-lg font-bold text-slate-900 flex items-center gap-2">
            <CheckCircle2 className="w-5 h-5 text-agro-600" />
            2. Buyer Obligations & Multi-Seller Orders
          </h2>
          <p>
            Buyers acknowledge that Kisanova facilitates multi-seller checkout wherein distinct line items may originate from different independent farm locations. Delivery schedules and dispatch times are coordinated per individual farm order.
          </p>
        </section>

        <section className="space-y-3">
          <h2 className="text-lg font-bold text-slate-900 flex items-center gap-2">
            <AlertCircle className="w-5 h-5 text-agro-600" />
            3. Payment Methods & Settlement
          </h2>
          <p>
            Orders can be completed via <strong>Cash on Delivery (COD)</strong> or verified <strong>Online Payment</strong> (Easypaisa, JazzCash, SadaPay).
          </p>
          <p className="text-slate-600 text-xs bg-slate-50 p-4 rounded-xl border border-slate-200">
            For Cash on Delivery orders, payment must be presented to the delivery courier in exact cash upon delivery of the agricultural lot. For online payments, transaction authorization tokens are verified against backend cryptographic signatures before harvest dispatch.
          </p>
        </section>

        <section className="space-y-3">
          <h2 className="text-lg font-bold text-slate-900 flex items-center gap-2">
            <Scale className="w-5 h-5 text-agro-600" />
            4. Dispute Resolution & Platform Integrity
          </h2>
          <p>
            In the event of crop spoilage, weight discrepancies, or transit damage, buyers can submit an inspection dispute within 48 hours of delivery receipt. Kisanova administrators will review field chat proofs and weigh scales to arbitrate fair settlement or replacement.
          </p>
        </section>
      </div>
    </div>
  );
};

export default TermsConditionsPage;
