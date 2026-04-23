import React, { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import api from "@/lib/api";

export default function PrintReceipt() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [receipt, setReceipt] = useState(null);
  const [error, setError] = useState(null);

  useEffect(() => {
    async function fetchReceipt() {
      try {
        const { data } = await api.get(`/receipts/${id}`);
        setReceipt(data);
        
        // Wait a small delay to ensure DOM is fully rendered before printing
        setTimeout(() => {
          window.print();
        }, 800);
      } catch (err) {
        console.error("Failed to load receipt:", err);
        setError("Could not load receipt details.");
      }
    }
    if (id) fetchReceipt();
  }, [id]);

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 text-red-500 p-8">
        <div className="text-center">
          <h2 className="text-xl font-bold mb-2">Error</h2>
          <p>{error}</p>
          <button onClick={() => navigate(-1)} className="mt-4 text-blue-600 hover:underline">Go Back</button>
        </div>
      </div>
    );
  }

  if (!receipt) {
    return <div className="p-8 text-center text-gray-500">Loading receipt...</div>;
  }

  return (
    <div className="bg-white min-h-screen">
      {/* Hide print button when printing using CSS media query trick */}
      <style>{`
        @media print {
          .no-print { display: none !important; }
        }
        @page { size: auto;  margin: 0mm; }
      `}</style>
      
      {/* Utility Bar (Hidden when printing) */}
      <div className="no-print bg-gray-100 border-b border-gray-200 p-4 flex justify-between items-center mb-8 shadow-sm">
        <button onClick={() => { if(window.history.length > 1) { navigate(-1); } else { window.close(); } }} className="text-gray-600 hover:text-gray-900 border border-gray-300 rounded px-4 py-1.5 text-sm bg-white hover:bg-gray-50 transition-colors">
          &larr;  Back
        </button>
        <button onClick={() => window.print()} className="bg-blue-600 hover:bg-blue-700 text-white rounded px-4 py-1.5 text-sm font-medium shadow-sm transition-colors">
          Print Receipt
        </button>
      </div>

      {/* Printable Area - Formatted as an 8.5x11 inch page structure */}
      <div className="max-w-3xl mx-auto p-12 bg-white print:p-8" id="printable-invoice">
        {/* Header */}
        <div className="flex justify-between items-start border-b-2 border-gray-800 pb-6 mb-8">
          <div>
            <h1 className="text-3xl font-extrabold text-gray-900 tracking-tight">PVG College</h1>
            <p className="text-gray-500 text-sm mt-1">Pune Vidhyarthi Griha's COET & M</p>
            <p className="text-gray-500 text-sm">City, State 123456</p>
            <p className="text-gray-500 text-sm mt-2 font-mono">finance@college.erp</p>
          </div>
          <div className="text-right">
            <h2 className="text-4xl font-light text-gray-400 tracking-widest uppercase mb-2">Receipt</h2>
            <p className="text-sm text-gray-600 font-medium">Receipt No: <span className="text-gray-900 font-mono ml-1">{receipt.receipt_number}</span></p>
            <p className="text-sm text-gray-600 font-medium">Date: <span className="text-gray-900 ml-1">{new Date(receipt.created_at).toLocaleDateString()}</span></p>
          </div>
        </div>

        {/* Student Details */}
        <div className="bg-gray-50 rounded-lg p-6 mb-8 border border-gray-100 flex justify-between print:bg-white print:border-gray-200">
          <div>
            <h3 className="text-xs uppercase tracking-widest text-gray-500 font-semibold mb-3">Billed To</h3>
            <p className="font-mono text-sm text-gray-900 mb-1">User ID: <span className="font-semibold">{receipt.user_id}</span></p>
            <p className="text-sm text-gray-900 font-medium">Program: <span className="font-semibold">{receipt.program_name || 'N/A'}</span></p>
            <p className="text-sm text-gray-900 font-medium">Academic Year: <span className="font-semibold">{receipt.academic_year || 'N/A'}</span></p>
          </div>
          <div className="text-right">
             <h3 className="text-xs uppercase tracking-widest text-gray-500 font-semibold mb-3">Payment Info</h3>
             <p className="text-sm text-gray-900 font-medium">Payment ID: <span className="font-mono text-xs text-gray-500 ml-1">{receipt.payment_id}</span></p>
             <p className="text-sm text-green-600 font-bold border border-green-200 bg-green-50 px-2 py-0.5 rounded shadow-sm inline-block mt-2 uppercase tracking-wide text-xs">Payment Successful</p>
          </div>
        </div>

        {/* Line Items Table */}
        <div className="mb-12 border rounded-lg overflow-hidden border-gray-200">
          <table className="w-full text-left text-sm text-gray-600">
            <thead className="bg-gray-800 text-white uppercase tracking-wider text-xs font-semibold">
              <tr>
                <th className="px-6 py-4">Description</th>
                <th className="px-6 py-4 text-center">Type</th>
                <th className="px-6 py-4 text-right">Amount</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200 bg-white">
              <tr className="hover:bg-gray-50">
                <td className="px-6 py-5 font-medium text-gray-900">
                  {receipt.bill_type === 'BROCHURE' ? 'Admission Brochure Fee' : `${receipt.program_name || 'Course'} Academic Fee`}
                  {receipt.installment_number && <span className="block text-xs text-gray-500 mt-1 font-normal -tracking-wide">Installment {receipt.installment_number}</span>}
                </td>
                <td className="px-6 py-5 text-center">
                  <span className="bg-gray-100 text-gray-700 text-xs px-2 py-1 rounded-full whitespace-nowrap">{receipt.bill_type}</span>
                </td>
                <td className="px-6 py-5 text-right font-mono font-bold text-gray-900 text-base">
                  ₹{Number(receipt.amount).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                </td>
              </tr>
            </tbody>
          </table>
        </div>

        {/* Totals Section */}
        <div className="flex justify-end mb-16">
          <div className="w-1/2">
            <div className="flex justify-between py-2 border-b border-gray-200">
              <span className="text-gray-600 text-sm font-medium">Subtotal</span>
              <span className="text-gray-900 font-mono text-sm">₹{Number(receipt.amount).toLocaleString('en-IN', { minimumFractionDigits: 2 })}</span>
            </div>
            <div className="flex justify-between py-3">
              <span className="text-gray-900 text-lg font-bold">Total Paid</span>
              <span className="text-gray-900 font-mono text-xl font-bold border-b-4 border-gray-800 pb-1">₹{Number(receipt.amount).toLocaleString('en-IN', { minimumFractionDigits: 2 })}</span>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="pt-8 border-t border-gray-200 text-center">
          <p className="text-xs text-gray-500 font-medium bg-gray-50 inline-block px-4 py-2 rounded-full border border-gray-100">This is a computer-generated receipt and requires no physical signature.</p>
        </div>
      </div>
    </div>
  );
}
