import React, { useState, useEffect } from "react";
import api from "@/lib/api";
import AdminLayout from "@/components/AdminLayout";

export default function PaymentHistory() {
  const [payments, setPayments] = useState([]);
  const [years, setYears] = useState([]);
  const [academicYear, setAcademicYear] = useState("");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadYears();
  }, []);

  const loadYears = async () => {
    try {
      const { data } = await api.get("/dashboard/academic-years");
      setYears(data);
    } catch {}
  };

  useEffect(() => {
    loadPayments();
  }, [academicYear]);

  const loadPayments = async () => {
    setLoading(true);
    try {
      const params = academicYear ? `?academic_year=${academicYear}` : "";
      const { data } = await api.get(`/payments${params}`);
      setPayments(data);
    } catch (err) {
      console.error(err);
    }
    setLoading(false);
  };

  const getStatusBadge = (status) => {
    if (status === "SUCCESS") return "erp-badge--success";
    if (status === "PENDING") return "erp-badge--warning";
    return "erp-badge--danger";
  }

  return (
    <AdminLayout title="Payment History">
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem' }}>
        <h2 style={{ margin: 0, fontSize: '1.5rem', color: 'var(--erp-dark)' }}>Payments</h2>
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
                <th style={{ padding: '12px 16px' }}>Payment ID</th>
                <th style={{ padding: '12px 16px' }}>User ID</th>
                <th style={{ padding: '12px 16px' }}>Program</th>
                <th style={{ padding: '12px 16px' }}>Type</th>
                <th style={{ padding: '12px 16px' }}>Razorpay Order</th>
                <th style={{ padding: '12px 16px', textAlign: 'right' }}>Amount</th>
                <th style={{ padding: '12px 16px', textAlign: 'center' }}>Status</th>
                <th style={{ padding: '12px 16px' }}>Date</th>
              </tr>
            </thead>
            <tbody style={{ fontSize: '0.875rem' }}>
              {loading ? (
                <tr><td colSpan={8} style={{ padding: '3rem', textAlign: 'center', color: 'var(--erp-text-muted)' }}>Loading payments...</td></tr>
              ) : payments.length === 0 ? (
                <tr><td colSpan={8} style={{ padding: '3rem', textAlign: 'center', color: 'var(--erp-text-muted)' }}>No payments found</td></tr>
              ) : (
                payments.map((p) => (
                  <tr key={p.payment_id} style={{ borderBottom: '1px solid var(--erp-border)' }}>
                    <td style={{ padding: '12px 16px', fontFamily: 'monospace', color: 'var(--erp-dark)' }}>{p.payment_id.slice(0, 8)}...</td>
                    <td style={{ padding: '12px 16px', fontFamily: 'monospace', color: 'var(--erp-text-muted)' }}>{p.user_id.slice(0, 8)}...</td>
                    <td style={{ padding: '12px 16px' }}>{p.program_name || "—"}</td>
                    <td style={{ padding: '12px 16px' }}>
                      <span className="erp-badge erp-badge--primary">{p.bill_type}</span>
                    </td>
                    <td style={{ padding: '12px 16px', fontFamily: 'monospace', color: 'var(--erp-text-muted)' }}>{p.razorpay_order_id ? p.razorpay_order_id.slice(0, 16) + "..." : "—"}</td>
                    <td style={{ padding: '12px 16px', textAlign: 'right', fontFamily: 'monospace', fontWeight: 'bold' }}>₹{Number(p.amount).toLocaleString('en-IN')}</td>
                    <td style={{ padding: '12px 16px', textAlign: 'center' }}>
                      <span className={`erp-badge ${getStatusBadge(p.status)}`}>{p.status}</span>
                    </td>
                    <td style={{ padding: '12px 16px', color: 'var(--erp-text-muted)', fontSize: '0.8rem' }}>{new Date(p.created_at).toLocaleDateString()}</td>
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
