import React, { useState, useEffect } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { useNavigate } from "react-router-dom";
import api from "@/lib/api";
import { Card, CardContent } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { ArrowLeft, Receipt } from "lucide-react";

function AdminHeader({ title, onBack }) {
  const { user } = useAuth();
  return (
    <header className="sticky top-0 z-50 w-full border-b border-[#E5E7EB] bg-white/80 backdrop-blur-xl">
      <div className="max-w-[1440px] mx-auto px-6 h-14 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <button onClick={onBack} className="p-1.5 rounded-md hover:bg-[#F3F4F6] transition-colors" data-testid="back-btn">
            <ArrowLeft className="w-5 h-5 text-[#6B7280]" />
          </button>
          <span className="text-sm font-bold tracking-tight text-[#111827]">{title}</span>
        </div>
        <span className="text-xs text-[#6B7280]">{user?.email}</span>
      </div>
    </header>
  );
}

export default function ReceiptList() {
  const navigate = useNavigate();
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
    <div className="min-h-screen bg-[#F9FAFB]" data-testid="receipt-list-page">
      <AdminHeader title="Receipts" onBack={() => navigate("/admin")} />

      <main className="max-w-[1440px] mx-auto px-6 py-8">
        <div className="flex items-center justify-between gap-4 mb-6">
          <h1 className="text-2xl font-bold tracking-tight text-[#111827]">Receipts</h1>
          <Select value={academicYear} onValueChange={(v) => setAcademicYear(v === "all" ? "" : v)}>
            <SelectTrigger className="w-[150px] border-[#E5E7EB] rounded-md text-sm" data-testid="filter-year">
              <SelectValue placeholder="All Years" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Years</SelectItem>
              {years.map((y) => <SelectItem key={y} value={y}>{y}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>

        <Card className="border border-[#E5E7EB] shadow-none rounded-md" data-testid="receipts-table">
          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-[#E5E7EB] bg-[#F9FAFB]">
                    <th className="text-left py-3 px-4 text-xs tracking-[0.1em] uppercase font-bold text-[#6B7280]">Receipt #</th>
                    <th className="text-left py-3 px-4 text-xs tracking-[0.1em] uppercase font-bold text-[#6B7280]">User ID</th>
                    <th className="text-left py-3 px-4 text-xs tracking-[0.1em] uppercase font-bold text-[#6B7280]">Program</th>
                    <th className="text-left py-3 px-4 text-xs tracking-[0.1em] uppercase font-bold text-[#6B7280]">Type</th>
                    <th className="text-left py-3 px-4 text-xs tracking-[0.1em] uppercase font-bold text-[#6B7280]">Installment</th>
                    <th className="text-right py-3 px-4 text-xs tracking-[0.1em] uppercase font-bold text-[#6B7280]">Amount</th>
                    <th className="text-left py-3 px-4 text-xs tracking-[0.1em] uppercase font-bold text-[#6B7280]">Date</th>
                  </tr>
                </thead>
                <tbody>
                  {loading ? (
                    <tr><td colSpan={7} className="py-12 text-center text-[#6B7280]">Loading...</td></tr>
                  ) : receipts.length === 0 ? (
                    <tr><td colSpan={7} className="py-12 text-center text-[#6B7280]">No receipts found</td></tr>
                  ) : (
                    receipts.map((r) => (
                      <tr key={r.receipt_id} className="border-b border-[#E5E7EB] last:border-0 hover:bg-[#F9FAFB] transition-colors" data-testid={`receipt-row-${r.receipt_id}`}>
                        <td className="py-3 px-4 font-mono text-xs font-medium text-[#002FA7]">{r.receipt_number}</td>
                        <td className="py-3 px-4 font-mono text-xs text-[#6B7280]">{r.user_id.slice(0, 8)}...</td>
                        <td className="py-3 px-4 text-[#111827]">{r.program_name || "—"}</td>
                        <td className="py-3 px-4"><Badge variant="outline" className="text-xs">{r.bill_type}</Badge></td>
                        <td className="py-3 px-4 text-[#6B7280]">{r.installment_number ? `${r.installment_number}` : "—"}</td>
                        <td className="py-3 px-4 text-right font-mono font-medium text-[#111827]">₹{Number(r.amount).toLocaleString('en-IN')}</td>
                        <td className="py-3 px-4 text-[#6B7280] text-xs">{new Date(r.created_at).toLocaleDateString()}</td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      </main>
    </div>
  );
}
