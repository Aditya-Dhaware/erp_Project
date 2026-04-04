import React, { useState, useEffect, useCallback } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { useNavigate } from "react-router-dom";
import api from "@/lib/api";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell, Legend
} from "recharts";
import {
  Users, Banknote, Receipt, RefreshCw, FileText, CreditCard,
  TrendingUp, TrendingDown, LogOut, LayoutDashboard, FileSpreadsheet,
  Clock, ArrowRight
} from "lucide-react";

const COLORS = ["#002FA7", "#10B981", "#F59E0B", "#EF4444", "#6366F1"];

function MetricCard({ title, value, icon: Icon, subtitle, color = "#002FA7" }) {
  return (
    <Card className="border border-[#E5E7EB] shadow-none rounded-md" data-testid={`metric-${title.toLowerCase().replace(/\s+/g, '-')}`}>
      <CardContent className="p-5 flex items-start justify-between">
        <div className="flex flex-col gap-1">
          <p className="text-xs tracking-[0.15em] uppercase font-bold text-[#6B7280]">{title}</p>
          <p className="text-2xl font-bold tracking-tight text-[#111827]">{value}</p>
          {subtitle && <p className="text-xs text-[#6B7280] mt-1">{subtitle}</p>}
        </div>
        <div className="w-10 h-10 rounded-md flex items-center justify-center" style={{ backgroundColor: `${color}15` }}>
          <Icon className="w-5 h-5" style={{ color }} />
        </div>
      </CardContent>
    </Card>
  );
}

export default function AdminDashboard() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [stats, setStats] = useState(null);
  const [academicYear, setAcademicYear] = useState("");
  const [years, setYears] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeNav, setActiveNav] = useState("dashboard");

  useEffect(() => {
    loadYears();
  }, []);

  const loadYears = async () => {
    try {
      const { data } = await api.get("/dashboard/academic-years");
      setYears(data);
      if (data.length > 0) setAcademicYear(data[0]);
    } catch (err) {
      console.error(err);
    }
  };

  const loadStats = useCallback(async () => {
    if (!academicYear) return;
    setLoading(true);
    try {
      const { data } = await api.get(`/dashboard/stats?academic_year=${academicYear}`);
      setStats(data);
    } catch (err) {
      console.error(err);
    }
    setLoading(false);
  }, [academicYear]);

  useEffect(() => {
    loadStats();
  }, [loadStats]);

  const handleLogout = async () => {
    await logout();
    navigate("/");
  };

  const navTo = (page) => {
    setActiveNav(page);
    if (page !== "dashboard") navigate(`/admin/${page}`);
  };

  const pieData = stats ? [
    { name: "Paid", value: stats.paid_bills },
    { name: "Unpaid", value: stats.unpaid_bills }
  ] : [];

  const navItems = [
    { key: "dashboard", label: "Dashboard", icon: LayoutDashboard },
    { key: "bills", label: "Bills", icon: FileText },
    { key: "payments", label: "Payments", icon: CreditCard },
    { key: "refunds", label: "Refunds", icon: RefreshCw },
    { key: "receipts", label: "Receipts", icon: Receipt },
  ];

  return (
    <div className="min-h-screen bg-[#F9FAFB]" data-testid="admin-dashboard">
      {/* Header */}
      <header className="sticky top-0 z-50 w-full border-b border-[#E5E7EB] bg-white/80 backdrop-blur-xl" data-testid="dashboard-header">
        <div className="max-w-[1440px] mx-auto px-6 h-14 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 bg-[#002FA7] rounded flex items-center justify-center">
              <Banknote className="w-4 h-4 text-white" />
            </div>
            <span className="text-sm font-bold tracking-tight text-[#111827]">Fees & Billing</span>
          </div>
          <nav className="hidden md:flex items-center gap-1">
            {navItems.map((item) => (
              <button
                key={item.key}
                onClick={() => navTo(item.key)}
                className={`px-3 py-1.5 rounded-md text-sm font-medium transition-colors flex items-center gap-1.5 ${
                  activeNav === item.key
                    ? "bg-[#002FA7] text-white"
                    : "text-[#6B7280] hover:bg-[#F3F4F6] hover:text-[#111827]"
                }`}
                data-testid={`nav-${item.key}`}
              >
                <item.icon className="w-3.5 h-3.5" />
                {item.label}
              </button>
            ))}
          </nav>
          <div className="flex items-center gap-3">
            <span className="text-xs text-[#6B7280] hidden sm:inline">{user?.email}</span>
            <Button variant="ghost" size="sm" onClick={handleLogout} className="text-[#6B7280] hover:text-[#EF4444]" data-testid="logout-btn">
              <LogOut className="w-4 h-4" />
            </Button>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-[1440px] mx-auto px-6 py-8">
        {/* Title & Year Filter */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-8">
          <div>
            <h1 className="text-3xl font-bold tracking-tight text-[#111827]" data-testid="dashboard-title">Dashboard</h1>
            <p className="text-sm text-[#6B7280] mt-1">Financial overview for your institution</p>
          </div>
          <Select value={academicYear} onValueChange={setAcademicYear} data-testid="academic-year-select">
            <SelectTrigger className="w-[180px] border-[#E5E7EB] rounded-md" data-testid="academic-year-trigger">
              <SelectValue placeholder="Select Year" />
            </SelectTrigger>
            <SelectContent>
              {years.map((y) => (
                <SelectItem key={y} value={y} data-testid={`year-option-${y}`}>{y}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {loading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {[...Array(4)].map((_, i) => (
              <Card key={i} className="border border-[#E5E7EB] shadow-none rounded-md animate-pulse">
                <CardContent className="p-5 h-24" />
              </Card>
            ))}
          </div>
        ) : stats ? (
          <>
            {/* Metric Cards */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8" data-testid="metrics-grid">
              <MetricCard
                title="Total Students"
                value={stats.total_students}
                icon={Users}
                subtitle={`${stats.total_bills} total bills`}
                color="#002FA7"
              />
              <MetricCard
                title="Revenue Collected"
                value={`₹${stats.total_revenue.toLocaleString('en-IN')}`}
                icon={TrendingUp}
                subtitle={`${stats.paid_bills} paid bills`}
                color="#10B981"
              />
              <MetricCard
                title="Pending Amount"
                value={`₹${stats.total_pending_amount.toLocaleString('en-IN')}`}
                icon={Clock}
                subtitle={`${stats.unpaid_bills} unpaid bills`}
                color="#F59E0B"
              />
              <MetricCard
                title="Refunds"
                value={`₹${stats.total_refunds.toLocaleString('en-IN')}`}
                icon={RefreshCw}
                subtitle={`${stats.pending_refunds} pending`}
                color="#EF4444"
              />
            </div>

            {/* Charts Row */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 mb-8">
              {/* Bill Status Pie Chart */}
              <Card className="border border-[#E5E7EB] shadow-none rounded-md" data-testid="bill-status-chart">
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-bold tracking-[0.1em] uppercase text-[#6B7280]">Bill Status</CardTitle>
                </CardHeader>
                <CardContent className="pt-0">
                  <ResponsiveContainer width="100%" height={260}>
                    <PieChart>
                      <Pie
                        data={pieData}
                        cx="50%"
                        cy="50%"
                        innerRadius={60}
                        outerRadius={90}
                        paddingAngle={3}
                        dataKey="value"
                        stroke="none"
                      >
                        {pieData.map((_, idx) => (
                          <Cell key={idx} fill={idx === 0 ? "#002FA7" : "#F59E0B"} />
                        ))}
                      </Pie>
                      <Tooltip formatter={(val) => [val, "Bills"]} />
                      <Legend
                        verticalAlign="bottom"
                        iconType="square"
                        iconSize={10}
                        wrapperStyle={{ fontSize: "12px", fontFamily: "IBM Plex Sans" }}
                      />
                    </PieChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>

              {/* Program-wise Revenue Bar Chart */}
              <Card className="border border-[#E5E7EB] shadow-none rounded-md lg:col-span-2" data-testid="program-revenue-chart">
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-bold tracking-[0.1em] uppercase text-[#6B7280]">Program-wise Breakdown</CardTitle>
                </CardHeader>
                <CardContent className="pt-0">
                  <ResponsiveContainer width="100%" height={260}>
                    <BarChart data={stats.program_stats} barGap={4}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#E5E7EB" vertical={false} />
                      <XAxis dataKey="program_name" tick={{ fontSize: 11, fill: "#6B7280" }} tickLine={false} axisLine={false} />
                      <YAxis tick={{ fontSize: 11, fill: "#6B7280" }} tickLine={false} axisLine={false} tickFormatter={(v) => `₹${(v / 1000).toFixed(0)}k`} />
                      <Tooltip formatter={(val) => [`₹${Number(val).toLocaleString('en-IN')}`, ""]} />
                      <Bar dataKey="collected" name="Collected" fill="#002FA7" radius={[4, 4, 0, 0]} />
                      <Bar dataKey="pending" name="Pending" fill="#F59E0B" radius={[4, 4, 0, 0]} />
                      <Legend
                        verticalAlign="top"
                        align="right"
                        iconType="square"
                        iconSize={10}
                        wrapperStyle={{ fontSize: "12px", fontFamily: "IBM Plex Sans", paddingBottom: "8px" }}
                      />
                    </BarChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>
            </div>

            {/* Monthly Collection Chart */}
            {stats.monthly_collection.length > 0 && (
              <Card className="border border-[#E5E7EB] shadow-none rounded-md mb-8" data-testid="monthly-collection-chart">
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-bold tracking-[0.1em] uppercase text-[#6B7280]">Monthly Collection</CardTitle>
                </CardHeader>
                <CardContent className="pt-0">
                  <ResponsiveContainer width="100%" height={220}>
                    <BarChart data={stats.monthly_collection}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#E5E7EB" vertical={false} />
                      <XAxis dataKey="month" tick={{ fontSize: 11, fill: "#6B7280" }} tickLine={false} axisLine={false} />
                      <YAxis tick={{ fontSize: 11, fill: "#6B7280" }} tickLine={false} axisLine={false} tickFormatter={(v) => `₹${(v / 1000).toFixed(0)}k`} />
                      <Tooltip formatter={(val) => [`₹${Number(val).toLocaleString('en-IN')}`, "Collection"]} />
                      <Bar dataKey="total" fill="#10B981" radius={[4, 4, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>
            )}

            {/* Program Stats Table */}
            <Card className="border border-[#E5E7EB] shadow-none rounded-md" data-testid="program-stats-table">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-bold tracking-[0.1em] uppercase text-[#6B7280]">Program Summary</CardTitle>
              </CardHeader>
              <CardContent className="pt-0">
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b border-[#E5E7EB]">
                        <th className="text-left py-3 px-4 text-xs tracking-[0.1em] uppercase font-bold text-[#6B7280]">Program</th>
                        <th className="text-right py-3 px-4 text-xs tracking-[0.1em] uppercase font-bold text-[#6B7280]">Paid Bills</th>
                        <th className="text-right py-3 px-4 text-xs tracking-[0.1em] uppercase font-bold text-[#6B7280]">Unpaid Bills</th>
                        <th className="text-right py-3 px-4 text-xs tracking-[0.1em] uppercase font-bold text-[#6B7280]">Collected</th>
                        <th className="text-right py-3 px-4 text-xs tracking-[0.1em] uppercase font-bold text-[#6B7280]">Pending</th>
                      </tr>
                    </thead>
                    <tbody>
                      {stats.program_stats.map((p, i) => (
                        <tr key={i} className="border-b border-[#E5E7EB] last:border-0 hover:bg-[#F9FAFB] transition-colors">
                          <td className="py-3 px-4 font-medium text-[#111827]">{p.program_name}</td>
                          <td className="py-3 px-4 text-right text-[#10B981] font-medium">{p.paid}</td>
                          <td className="py-3 px-4 text-right text-[#F59E0B] font-medium">{p.unpaid}</td>
                          <td className="py-3 px-4 text-right font-mono text-[#111827]">₹{Number(p.collected).toLocaleString('en-IN')}</td>
                          <td className="py-3 px-4 text-right font-mono text-[#6B7280]">₹{Number(p.pending).toLocaleString('en-IN')}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </CardContent>
            </Card>

            {/* Quick Actions */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mt-8" data-testid="quick-actions">
              {[
                { label: "Manage Bills", icon: FileText, path: "/admin/bills", color: "#002FA7" },
                { label: "View Payments", icon: CreditCard, path: "/admin/payments", color: "#10B981" },
                { label: "Process Refunds", icon: RefreshCw, path: "/admin/refunds", color: "#EF4444" },
                { label: "View Receipts", icon: Receipt, path: "/admin/receipts", color: "#6366F1" },
              ].map((action) => (
                <button
                  key={action.label}
                  onClick={() => navigate(action.path)}
                  className="p-4 border border-[#E5E7EB] rounded-md bg-white hover:bg-[#F9FAFB] transition-colors text-left flex items-center gap-3 group"
                  data-testid={`action-${action.label.toLowerCase().replace(/\s+/g, '-')}`}
                >
                  <div className="w-9 h-9 rounded-md flex items-center justify-center" style={{ backgroundColor: `${action.color}15` }}>
                    <action.icon className="w-4.5 h-4.5" style={{ color: action.color }} />
                  </div>
                  <div className="flex-1">
                    <p className="text-sm font-semibold text-[#111827]">{action.label}</p>
                  </div>
                  <ArrowRight className="w-4 h-4 text-[#6B7280] group-hover:text-[#111827] transition-colors" />
                </button>
              ))}
            </div>
          </>
        ) : null}
      </main>
    </div>
  );
}
