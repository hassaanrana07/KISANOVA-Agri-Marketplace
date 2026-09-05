import React from 'react';
import { ShieldCheck, Lock, Eye, FileText, CheckCircle2 } from 'lucide-react';

const PrivacyPolicyPage = () => {
  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-12 space-y-10">
      {/* Header */}
      <div className="text-center space-y-3">
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-agro-50 border border-agro-200 text-agro-700 text-xs font-bold uppercase tracking-wider">
          <ShieldCheck className="w-4 h-4" />
          Kisanova Data & Security Standard
        </div>
        <h1 className="text-3xl sm:text-4xl font-black text-slate-900">Privacy Policy</h1>
        <p className="text-sm text-slate-500 max-w-2xl mx-auto">
          Last updated: September 2026. Learn how Kisanova protects buyer transactions, farmer farm data, and agricultural marketplace privacy.
        </p>
      </div>

      <div className="bg-white rounded-2xl border border-slate-200 p-6 sm:p-10 space-y-8 text-slate-700 text-sm leading-relaxed shadow-sm">
        <section className="space-y-3">
          <h2 className="text-lg font-bold text-slate-900 flex items-center gap-2">
            <Lock className="w-5 h-5 text-agro-600" />
            1. Information We Collect
          </h2>
          <p>
            Kisanova collects only the data necessary to provide a dependable, verified agricultural trading platform:
          </p>
          <ul className="list-disc pl-5 space-y-1 text-slate-600">
            <li><strong>Account Details:</strong> Name, verified email address, phone number, and account role (Buyer or Seller).</li>
            <li><strong>Farmer Information:</strong> Farm name, regional district, address, farm GPS harvest coordinates, and CNIC/National Tax verification documents.</li>
            <li><strong>Order & Delivery:</strong> Delivery recipient name, delivery address, dispatch contact numbers, and delivery notes.</li>
            <li><strong>Communications:</strong> Direct chat messages and media files sent between buyers and farmers regarding harvest lots.</li>
          </ul>
        </section>

        <section className="space-y-3">
          <h2 className="text-lg font-bold text-slate-900 flex items-center gap-2">
            <Eye className="w-5 h-5 text-agro-600" />
            2. How We Use and Protect Your Data
          </h2>
          <p>
            Your information is used strictly for fulfilling agricultural purchases, coordinating logistics dispatch, verifying seller legitimacy, and securing payment settlements.
          </p>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2">
            <div className="p-4 rounded-xl bg-slate-50 border border-slate-200">
              <h4 className="font-bold text-slate-900 text-xs uppercase text-agro-700">Zero Commercial Data Reselling</h4>
              <p className="text-xs text-slate-600 mt-1">We never sell personal contact information or crop inventory records to third-party marketing companies.</p>
            </div>
            <div className="p-4 rounded-xl bg-slate-50 border border-slate-200">
              <h4 className="font-bold text-slate-900 text-xs uppercase text-agro-700">Strict Role Scoping</h4>
              <p className="text-xs text-slate-600 mt-1">Private farmer credentials, CNIC IDs, and administrative logs are inaccessible to regular public marketplace visitors.</p>
            </div>
          </div>
        </section>

        <section className="space-y-3">
          <h2 className="text-lg font-bold text-slate-900 flex items-center gap-2">
            <CheckCircle2 className="w-5 h-5 text-agro-600" />
            3. Payment Handling & Privacy
          </h2>
          <p>
            Kisanova does not collect or store credit card numbers, debit cards, bank account pins, or mobile wallet login credentials. Orders are transacted via direct Cash on Delivery (COD) or in-person Farm Gate Self-Pickup, eliminating online financial intercept vulnerabilities.
          </p>
        </section>

        <section className="space-y-3">
          <h2 className="text-lg font-bold text-slate-900 flex items-center gap-2">
            <FileText className="w-5 h-5 text-agro-600" />
            4. Contact Our Compliance Office
          </h2>
          <p>
            If you have questions regarding our privacy protocol, data removal requests, or seller verification standards, contact our privacy desk at: <span className="font-semibold text-slate-900">privacy@kisanova.com</span>.
          </p>
        </section>
      </div>
    </div>
  );
};

export default PrivacyPolicyPage;
