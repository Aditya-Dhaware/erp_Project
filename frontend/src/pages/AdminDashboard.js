import React, { useState, useEffect, useCallback } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { useNavigate } from "react-router-dom";
import api from "@/lib/api";
import AdminLayout from "@/components/AdminLayout";
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell, Legend
} from "recharts";
import {
  Users, Banknote, Clock, RefreshCw, FileText, CreditCard, Receipt
} from "lucide-react";

export default function AdminDashboard() {
  const navigate = useNavigate();
  const [stats, setStats] = useState(null);
  const [academicYear, setAcademicYear] = useState("");
  const [years, setYears] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => { loadYears(); }, []);

  const loadYears = async () => {
    try {
      const { data } = await api.get("/dashboard/academic-years");
      setYears(data);
      if (data.length > 0) setAcademicYear(data[0]);
    } catch (err) { console.error(err); }
  };

  const loadStats = useCallback(async () => {
    if (!academicYear) return;
    setLoading(true);
    try {
      const { data } = await api.get(`/dashboard/stats?academic_year=${academicYear}`);
      setStats(data);
    } catch (err) { console.error(err); }
    setLoading(false);
  }, [academicYear]);

  useEffect(() => { loadStats(); }, [loadStats]);

  const pieData = stats ? [
    { name: "Paid", value: stats.paid_bills },
    { name: "Unpaid", value: stats.unpaid_bills }
  ] : [];

  return (
    <AdminLayout title="Dashboard">
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem' }}>
        <div>
          <h2 style={{ margin: 0, fontSize: '1.5rem', color: 'var(--erp-dark)' }}>Dashboard Overview</h2>
          <p style={{ margin: 0, color: 'var(--erp-text-muted)', fontSize: '0.875rem' }}>Financial overview for your institution.</p>
        </div>
        <select 
          className="erp-form-control" 
          style={{ width: 'auto' }}
          value={academicYear} 
          onChange={(e) => setAcademicYear(e.target.value)}
        >
          {years.map(y => <option key={y} value={y}>{y}</option>)}
        </select>
      </div>

      {loading ? (
        <div style={{ textAlign: 'center', padding: '3rem', color: 'var(--erp-text-muted)' }}>Loading statistics...</div>
      ) : stats ? (
        <>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '1.5rem', marginBottom: '2rem' }}>
            <div className="erp-stat-card erp-stat-card--primary">
              <div className="erp-stat-card__header">
                <div className="erp-stat-card__icon"><Users size={20} /></div>
                <span className="erp-stat-card__trend erp-stat-card__trend--up">{stats.total_bills} bills</span>
              </div>
              <div className="erp-stat-card__value">{stats.total_students}</div>
              <div className="erp-stat-card__label">Total Students</div>
            </div>

            <div className="erp-stat-card erp-stat-card--success">
              <div className="erp-stat-card__header">
                <div className="erp-stat-card__icon"><Banknote size={20} /></div>
                <span className="erp-stat-card__trend erp-stat-card__trend--up">{stats.paid_bills} paid</span>
              </div>
              <div className="erp-stat-card__value">₹{stats.total_revenue.toLocaleString('en-IN')}</div>
              <div className="erp-stat-card__label">Revenue Collected</div>
            </div>

            <div className="erp-stat-card erp-stat-card--warning">
              <div className="erp-stat-card__header">
                <div className="erp-stat-card__icon"><Clock size={20} /></div>
                <span className="erp-stat-card__trend erp-stat-card__trend--up">{stats.unpaid_bills} unpaid</span>
              </div>
              <div className="erp-stat-card__value">₹{stats.total_pending_amount.toLocaleString('en-IN')}</div>
              <div className="erp-stat-card__label">Pending Amount</div>
            </div>

            <div className="erp-stat-card erp-stat-card--danger">
              <div className="erp-stat-card__header">
                <div className="erp-stat-card__icon"><RefreshCw size={20} /></div>
                <span className="erp-stat-card__trend erp-stat-card__trend--down">{stats.pending_refunds} pending</span>
              </div>
              <div className="erp-stat-card__value">₹{stats.total_refunds.toLocaleString('en-IN')}</div>
              <div className="erp-stat-card__label">Refunds Issued</div>
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 2fr', gap: '1.5rem', marginBottom: '2rem' }}>
            <div className="erp-card">
              <div className="erp-card__header">
                <div className="erp-card__title">Bill Status</div>
              </div>
              <div className="erp-card__body">
                <ResponsiveContainer width="100%" height={260}>
                  <PieChart>
                    <Pie data={pieData} cx="50%" cy="50%" innerRadius={60} outerRadius={90} paddingAngle={3} dataKey="value" stroke="none">
                      {pieData.map((_, idx) => <Cell key={idx} fill={idx === 0 ? "var(--erp-success)" : "var(--erp-warning)"} />)}
                    </Pie>
                    <Tooltip formatter={(val) => [val, "Bills"]} />
                    <Legend verticalAlign="bottom" iconType="square" iconSize={10} />
                  </PieChart>
                </ResponsiveContainer>
              </div>
            </div>

            <div className="erp-card">
              <div className="erp-card__header">
                <div className="erp-card__title">Program-wise Breakdown</div>
              </div>
              <div className="erp-card__body">
                <ResponsiveContainer width="100%" height={260}>
                  <BarChart data={stats.program_stats} barGap={4}>
                    <CartesianGrid strokeDasharray="3 3" stroke="var(--erp-border)" vertical={false} />
                    <XAxis dataKey="program_name" tick={{ fontSize: 11, fill: "var(--erp-text-muted)" }} tickLine={false} axisLine={false} />
                    <YAxis tick={{ fontSize: 11, fill: "var(--erp-text-muted)" }} tickLine={false} axisLine={false} tickFormatter={(v) => `₹${(v / 1000).toFixed(0)}k`} />
                    <Tooltip formatter={(val) => [`₹${Number(val).toLocaleString('en-IN')}`, ""]} />
                    <Bar dataKey="collected" name="Collected" fill="var(--erp-primary)" radius={[4, 4, 0, 0]} />
                    <Bar dataKey="pending" name="Pending" fill="var(--erp-warning)" radius={[4, 4, 0, 0]} />
                    <Legend verticalAlign="top" align="right" iconType="square" iconSize={10} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>
          </div>

          <div className="erp-card" style={{ marginBottom: '2rem' }}>
            <div className="erp-card__header">
              <div className="erp-card__title">Program Summary</div>
            </div>
            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
                <thead style={{ borderBottom: '1px solid var(--erp-border)', fontSize: '0.75rem', textTransform: 'uppercase', color: 'var(--erp-text-muted)' }}>
                  <tr>
                    <th style={{ padding: '12px 16px' }}>Program</th>
                    <th style={{ padding: '12px 16px', textAlign: 'right' }}>Paid Bills</th>
                    <th style={{ padding: '12px 16px', textAlign: 'right' }}>Unpaid Bills</th>
                    <th style={{ padding: '12px 16px', textAlign: 'right' }}>Collected</th>
                    <th style={{ padding: '12px 16px', textAlign: 'right' }}>Pending</th>
                  </tr>
                </thead>
                <tbody style={{ fontSize: '0.875rem' }}>
                  {stats.program_stats.map((p, i) => (
                    <tr key={i} style={{ borderBottom: '1px solid var(--erp-border)' }}>
                      <td style={{ padding: '12px 16px', fontWeight: '500' }}>{p.program_name}</td>
                      <td style={{ padding: '12px 16px', textAlign: 'right', color: 'var(--erp-success)', fontWeight: 'bold' }}>{p.paid}</td>
                      <td style={{ padding: '12px 16px', textAlign: 'right', color: 'var(--erp-warning)', fontWeight: 'bold' }}>{p.unpaid}</td>
                      <td style={{ padding: '12px 16px', textAlign: 'right', fontFamily: 'monospace' }}>₹{Number(p.collected).toLocaleString('en-IN')}</td>
                      <td style={{ padding: '12px 16px', textAlign: 'right', color: 'var(--erp-text-muted)', fontFamily: 'monospace' }}>₹{Number(p.pending).toLocaleString('en-IN')}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: '1rem', marginTop: '1rem' }}>
            {[
              { label: "Manage Bills", icon: FileText, path: "/admin/bills" },
              { label: "View Payments", icon: CreditCard, path: "/admin/payments" },
              { label: "Process Refunds", icon: RefreshCw, path: "/admin/refunds" },
              { label: "View Receipts", icon: Receipt, path: "/admin/receipts" },
            ].map(action => (
              <button
                key={action.label}
                onClick={() => navigate(action.path)}
                className="erp-btn erp-btn--outline"
                style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px', padding: '1rem' }}
              >
                <action.icon size={16} /> {action.label}
              </button>
            ))}
          </div>
        </>
      ) : null}
    </AdminLayout>
  );
}
