import React, { useState, useEffect } from "react";
import api from "@/lib/api";
import AdminLayout from "@/components/AdminLayout";
import { Printer } from "lucide-react";

export default function ReceiptList() {
  const [receipts, setReceipts] = useState([]);
  const [years, setYears] = useState([]);
  const [academicYear, setAcademicYear] = useState("");
  const [loading, setLoading] = useState(true);

  useEffect(() => { loadYears(); }, []);
  useEffect(() => { loadReceipts(); }, [academicYear]);

  const loadYears = async () => {
    try { const { data } = await api.get("/dashboard/academic-years"); setYears(data); } catch {}
  };

  const loadReceipts = async () => {
    setLoading(true);
    try {
      const params = academicYear ? `?academic_year=${academicYear}` : "";
      const { data } = await api.get(`/receipts${params}`);
      setReceipts(data);
    } catch (err) { console.error(err); }
    setLoading(false);
  };

  return (
    <AdminLayout title="Receipts">
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem' }}>
        <h2 style={{ margin: 0, fontSize: '1.5rem', color: 'var(--erp-dark)' }}>Receipts</h2>
        <select 
          className="erp-form-control" 
          style={{ width: '150px' }}
          value={academicYear} 
          onChange={(e) => setAcademicYear(e.target.value)}
        >
          <option value="">All Years</option>
          {years.map(y => <option key={y} value={y}>{y}</option>)}
        </select>
      </div>

      <div className="erp-card">
        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
            <thead style={{ borderBottom: '1px solid var(--erp-border)', fontSize: '0.75rem', textTransform: 'uppercase', color: 'var(--erp-text-muted)' }}>
              <tr>
                <th style={{ padding: '12px 16px' }}>Receipt #</th>
                <th style={{ padding: '12px 16px' }}>User ID</th>
                <th style={{ padding: '12px 16px' }}>Program</th>
                <th style={{ padding: '12px 16px' }}>Type</th>
                <th style={{ padding: '12px 16px' }}>Installment</th>
                <th style={{ padding: '12px 16px', textAlign: 'right' }}>Amount</th>
                <th style={{ padding: '12px 16px' }}>Date</th>
                <th style={{ padding: '12px 16px', textAlign: 'center' }}>Print</th>
              </tr>
            </thead>
            <tbody style={{ fontSize: '0.875rem' }}>
              {loading ? (
                <tr><td colSpan={8} style={{ padding: '3rem', textAlign: 'center', color: 'var(--erp-text-muted)' }}>Loading receipts...</td></tr>
              ) : receipts.length === 0 ? (
                <tr><td colSpan={8} style={{ padding: '3rem', textAlign: 'center', color: 'var(--erp-text-muted)' }}>No receipts found</td></tr>
              ) : (
                receipts.map((r) => (
                  <tr key={r.receipt_id} style={{ borderBottom: '1px solid var(--erp-border)' }}>
                    <td style={{ padding: '12px 16px', fontFamily: 'monospace', color: 'var(--erp-primary)', fontWeight: 'bold' }}>{r.receipt_number}</td>
                    <td style={{ padding: '12px 16px', fontFamily: 'monospace', color: 'var(--erp-text-muted)' }}>{r.user_id.slice(0, 8)}...</td>
                    <td style={{ padding: '12px 16px' }}>{r.program_name || "—"}</td>
                    <td style={{ padding: '12px 16px' }}>
                      <span className="erp-badge erp-badge--primary">{r.bill_type}</span>
                    </td>
                    <td style={{ padding: '12px 16px', color: 'var(--erp-text-muted)' }}>{r.installment_number ? `${r.installment_number}` : "—"}</td>
                    <td style={{ padding: '12px 16px', textAlign: 'right', fontFamily: 'monospace', fontWeight: 'bold' }}>₹{Number(r.amount).toLocaleString('en-IN')}</td>
                    <td style={{ padding: '12px 16px', color: 'var(--erp-text-muted)', fontSize: '0.8rem' }}>{new Date(r.created_at).toLocaleDateString()}</td>
                    <td style={{ padding: '12px 16px', textAlign: 'center' }}>
                      <button
                        onClick={() => window.open(`/receipt/${r.receipt_id}/print`, '_blank')}
                        className="erp-btn erp-btn--ghost"
                        style={{ padding: '8px' }}
                        title="Print PDF"
                      >
                        <Printer size={16} color="var(--erp-primary)" />
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </AdminLayout>
  );
}
