import React, { useState, useEffect } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { useNavigate } from "react-router-dom";
import api from "@/lib/api";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import {
  ArrowLeft, FileText, Plus, Search, Filter
} from "lucide-react";

function AdminHeader({ title, onBack }) {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
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

export default function BillManagement() {
  const navigate = useNavigate();
  const [bills, setBills] = useState([]);
  const [years, setYears] = useState([]);
  const [filters, setFilters] = useState({ academic_year: "", status: "", user_id: "" });
  const [loading, setLoading] = useState(true);
  const [showGenerate, setShowGenerate] = useState(false);
  const [genForm, setGenForm] = useState({ user_id: "", academic_year: "2024-25", program_name: "", total_course_fees: "", installments: "3" });
  const [genLoading, setGenLoading] = useState(false);
  const [genResult, setGenResult] = useState(null);

  useEffect(() => {
    loadYears();
    loadBills();
  }, []);

  const loadYears = async () => {
    try {
      const { data } = await api.get("/dashboard/academic-years");
      setYears(data);
    } catch {}
  };

  const loadBills = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (filters.academic_year) params.append("academic_year", filters.academic_year);
      if (filters.status) params.append("status", filters.status);
      if (filters.user_id) params.append("user_id", filters.user_id);
      const { data } = await api.get(`/bills?${params.toString()}`);
      setBills(data);
    } catch (err) {
      console.error(err);
    }
    setLoading(false);
  };

  useEffect(() => { loadBills(); }, [filters]);

  const handleGenerate = async (e) => {
    e.preventDefault();
    setGenLoading(true);
    setGenResult(null);
    try {
      const payload = {
        user_id: genForm.user_id || crypto.randomUUID(),
        academic_year: genForm.academic_year,
        program_name: genForm.program_name,
        total_course_fees: parseFloat(genForm.total_course_fees),
        installments: parseInt(genForm.installments)
      };
      const { data } = await api.post("/admission/generate-bills", payload);
      setGenResult(data);
      loadBills();
      setTimeout(() => {
        setShowGenerate(false);
        setGenResult(null);
        setGenForm({ user_id: "", academic_year: "2024-25", program_name: "", total_course_fees: "", installments: "3" });
      }, 1500);
    } catch (err) {
      setGenResult({ error: err.response?.data?.detail || "Failed to generate bills" });
    }
    setGenLoading(false);
  };

  return (
    <div className="min-h-screen bg-[#F9FAFB]" data-testid="bill-management-page">
      <AdminHeader title="Bill Management" onBack={() => navigate("/admin")} />

      <main className="max-w-[1440px] mx-auto px-6 py-8">
        {/* Controls */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-6">
          <h1 className="text-2xl font-bold tracking-tight text-[#111827]">Bills</h1>
          <div className="flex items-center gap-3 flex-wrap">
            <Select value={filters.academic_year} onValueChange={(v) => setFilters({ ...filters, academic_year: v === "all" ? "" : v })}>
              <SelectTrigger className="w-[150px] border-[#E5E7EB] rounded-md text-sm" data-testid="filter-year">
                <SelectValue placeholder="All Years" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Years</SelectItem>
                {years.map((y) => <SelectItem key={y} value={y}>{y}</SelectItem>)}
              </SelectContent>
            </Select>
            <Select value={filters.status} onValueChange={(v) => setFilters({ ...filters, status: v === "all" ? "" : v })}>
              <SelectTrigger className="w-[130px] border-[#E5E7EB] rounded-md text-sm" data-testid="filter-status">
                <SelectValue placeholder="All Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Status</SelectItem>
                <SelectItem value="PAID">Paid</SelectItem>
                <SelectItem value="UNPAID">Unpaid</SelectItem>
              </SelectContent>
            </Select>
            <Dialog open={showGenerate} onOpenChange={setShowGenerate}>
              <DialogTrigger asChild>
                <Button className="bg-[#002FA7] hover:bg-[#002FA7]/90 text-white rounded-md text-sm" data-testid="generate-bills-btn">
                  <Plus className="w-4 h-4 mr-1.5" /> Generate Bills
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-md">
                <DialogHeader>
                  <DialogTitle className="text-lg font-bold text-[#111827]">Generate Tuition Bills</DialogTitle>
                </DialogHeader>
                <form onSubmit={handleGenerate} className="space-y-4 mt-2">
                  <div className="space-y-2">
                    <Label className="text-xs uppercase tracking-[0.1em] font-bold text-[#6B7280]">User ID (UUID)</Label>
                    <Input value={genForm.user_id} onChange={(e) => setGenForm({ ...genForm, user_id: e.target.value })} placeholder="Leave empty for auto-generate" className="border-[#E5E7EB]" data-testid="gen-user-id" />
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-2">
                      <Label className="text-xs uppercase tracking-[0.1em] font-bold text-[#6B7280]">Academic Year</Label>
                      <Input value={genForm.academic_year} onChange={(e) => setGenForm({ ...genForm, academic_year: e.target.value })} required className="border-[#E5E7EB]" data-testid="gen-academic-year" />
                    </div>
                    <div className="space-y-2">
                      <Label className="text-xs uppercase tracking-[0.1em] font-bold text-[#6B7280]">Program</Label>
                      <Input value={genForm.program_name} onChange={(e) => setGenForm({ ...genForm, program_name: e.target.value })} placeholder="B.Sc CS" required className="border-[#E5E7EB]" data-testid="gen-program" />
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-2">
                      <Label className="text-xs uppercase tracking-[0.1em] font-bold text-[#6B7280]">Total Fees (₹)</Label>
                      <Input type="number" value={genForm.total_course_fees} onChange={(e) => setGenForm({ ...genForm, total_course_fees: e.target.value })} required min="1" className="border-[#E5E7EB]" data-testid="gen-total-fees" />
                    </div>
                    <div className="space-y-2">
                      <Label className="text-xs uppercase tracking-[0.1em] font-bold text-[#6B7280]">Installments</Label>
                      <Input type="number" value={genForm.installments} onChange={(e) => setGenForm({ ...genForm, installments: e.target.value })} required min="1" max="12" className="border-[#E5E7EB]" data-testid="gen-installments" />
                    </div>
                  </div>
                  {genResult && (
                    <div className={`p-3 rounded-md text-sm ${genResult.error ? "bg-red-50 text-red-700 border border-red-200" : "bg-green-50 text-green-700 border border-green-200"}`} data-testid="gen-result">
                      {genResult.error ? genResult.error : `${genResult.bills?.length} bills generated (₹${genResult.per_installment} each)`}
                    </div>
                  )}
                  <Button type="submit" disabled={genLoading} className="w-full bg-[#002FA7] hover:bg-[#002FA7]/90 text-white rounded-md" data-testid="gen-submit-btn">
                    {genLoading ? "Generating..." : "Generate Bills"}
                  </Button>
                </form>
              </DialogContent>
            </Dialog>
          </div>
        </div>

        {/* Bills Table */}
        <Card className="border border-[#E5E7EB] shadow-none rounded-md" data-testid="bills-table">
          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-[#E5E7EB] bg-[#F9FAFB]">
                    <th className="text-left py-3 px-4 text-xs tracking-[0.1em] uppercase font-bold text-[#6B7280]">Bill ID</th>
                    <th className="text-left py-3 px-4 text-xs tracking-[0.1em] uppercase font-bold text-[#6B7280]">User ID</th>
                    <th className="text-left py-3 px-4 text-xs tracking-[0.1em] uppercase font-bold text-[#6B7280]">Program</th>
                    <th className="text-left py-3 px-4 text-xs tracking-[0.1em] uppercase font-bold text-[#6B7280]">Type</th>
                    <th className="text-left py-3 px-4 text-xs tracking-[0.1em] uppercase font-bold text-[#6B7280]">Installment</th>
                    <th className="text-right py-3 px-4 text-xs tracking-[0.1em] uppercase font-bold text-[#6B7280]">Amount</th>
                    <th className="text-center py-3 px-4 text-xs tracking-[0.1em] uppercase font-bold text-[#6B7280]">Status</th>
                    <th className="text-left py-3 px-4 text-xs tracking-[0.1em] uppercase font-bold text-[#6B7280]">Year</th>
                  </tr>
                </thead>
                <tbody>
                  {loading ? (
                    <tr><td colSpan={8} className="py-12 text-center text-[#6B7280]">Loading...</td></tr>
                  ) : bills.length === 0 ? (
                    <tr><td colSpan={8} className="py-12 text-center text-[#6B7280]">No bills found</td></tr>
                  ) : (
                    bills.map((b) => (
                      <tr key={b.bill_id} className="border-b border-[#E5E7EB] last:border-0 hover:bg-[#F9FAFB] transition-colors" data-testid={`bill-row-${b.bill_id}`}>
                        <td className="py-3 px-4 font-mono text-xs text-[#111827]">{b.bill_id.slice(0, 8)}...</td>
                        <td className="py-3 px-4 font-mono text-xs text-[#6B7280]">{b.user_id.slice(0, 8)}...</td>
                        <td className="py-3 px-4 text-[#111827]">{b.program_name || "—"}</td>
                        <td className="py-3 px-4">
                          <Badge variant={b.bill_type === "BROCHURE" ? "secondary" : "outline"} className="text-xs">{b.bill_type}</Badge>
                        </td>
                        <td className="py-3 px-4 text-[#6B7280]">{b.installment_number ? `${b.installment_number}/${b.total_installments}` : "—"}</td>
                        <td className="py-3 px-4 text-right font-mono font-medium text-[#111827]">₹{Number(b.amount).toLocaleString('en-IN')}</td>
                        <td className="py-3 px-4 text-center">
                          <Badge className={b.status === "PAID" ? "bg-[#10B981]/10 text-[#10B981] border-[#10B981]/20 hover:bg-[#10B981]/10" : "bg-[#F59E0B]/10 text-[#F59E0B] border-[#F59E0B]/20 hover:bg-[#F59E0B]/10"}>
                            {b.status}
                          </Badge>
                        </td>
                        <td className="py-3 px-4 text-[#6B7280]">{b.academic_year}</td>
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
