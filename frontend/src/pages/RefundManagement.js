import React, { useState, useEffect } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { useNavigate } from "react-router-dom";
import api from "@/lib/api";
import { Card, CardContent } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { ArrowLeft, RefreshCw, Plus } from "lucide-react";

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

export default function RefundManagement() {
  const navigate = useNavigate();
  const [refunds, setRefunds] = useState([]);
  const [years, setYears] = useState([]);
  const [academicYear, setAcademicYear] = useState("");
  const [loading, setLoading] = useState(true);
  const [showCreate, setShowCreate] = useState(false);
  const [createForm, setCreateForm] = useState({ payment_id: "", amount: "", reason: "" });
  const [createLoading, setCreateLoading] = useState(false);
  const [createError, setCreateError] = useState("");

  useEffect(() => { loadYears(); }, []);
  useEffect(() => { loadRefunds(); }, [academicYear]);

  const loadYears = async () => {
    try { const { data } = await api.get("/dashboard/academic-years"); setYears(data); } catch {}
  };

  const loadRefunds = async () => {
    setLoading(true);
    try {
      const params = academicYear ? `?academic_year=${academicYear}` : "";
      const { data } = await api.get(`/refunds${params}`);
      setRefunds(data);
    } catch (err) { console.error(err); }
    setLoading(false);
  };

  const handleCreate = async (e) => {
    e.preventDefault();
    setCreateLoading(true);
    setCreateError("");
    try {
      await api.post("/refunds", {
        payment_id: createForm.payment_id,
        amount: parseFloat(createForm.amount),
        reason: createForm.reason
      });
      setShowCreate(false);
      setCreateForm({ payment_id: "", amount: "", reason: "" });
      loadRefunds();
    } catch (err) {
      setCreateError(err.response?.data?.detail || "Failed to create refund");
    }
    setCreateLoading(false);
  };

  const handleUpdateStatus = async (refundId, status) => {
    try {
      await api.put(`/refunds/${refundId}`, { status });
      loadRefunds();
    } catch (err) {
      console.error(err);
    }
  };

  return (
    <div className="min-h-screen bg-[#F9FAFB]" data-testid="refund-management-page">
      <AdminHeader title="Refund Management" onBack={() => navigate("/admin")} />

      <main className="max-w-[1440px] mx-auto px-6 py-8">
        <div className="flex items-center justify-between gap-4 mb-6">
          <h1 className="text-2xl font-bold tracking-tight text-[#111827]">Refunds</h1>
          <div className="flex items-center gap-3">
            <Select value={academicYear} onValueChange={(v) => setAcademicYear(v === "all" ? "" : v)}>
              <SelectTrigger className="w-[150px] border-[#E5E7EB] rounded-md text-sm" data-testid="filter-year">
                <SelectValue placeholder="All Years" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Years</SelectItem>
                {years.map((y) => <SelectItem key={y} value={y}>{y}</SelectItem>)}
              </SelectContent>
            </Select>
            <Dialog open={showCreate} onOpenChange={setShowCreate}>
              <DialogTrigger asChild>
                <Button className="bg-[#002FA7] hover:bg-[#002FA7]/90 text-white rounded-md text-sm" data-testid="create-refund-btn">
                  <Plus className="w-4 h-4 mr-1.5" /> New Refund
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-md">
                <DialogHeader>
                  <DialogTitle className="text-lg font-bold text-[#111827]">Create Refund</DialogTitle>
                </DialogHeader>
                <form onSubmit={handleCreate} className="space-y-4 mt-2">
                  <div className="space-y-2">
                    <Label className="text-xs uppercase tracking-[0.1em] font-bold text-[#6B7280]">Payment ID (UUID)</Label>
                    <Input value={createForm.payment_id} onChange={(e) => setCreateForm({ ...createForm, payment_id: e.target.value })} required className="border-[#E5E7EB] font-mono text-sm" data-testid="refund-payment-id" />
                  </div>
                  <div className="space-y-2">
                    <Label className="text-xs uppercase tracking-[0.1em] font-bold text-[#6B7280]">Amount (₹)</Label>
                    <Input type="number" value={createForm.amount} onChange={(e) => setCreateForm({ ...createForm, amount: e.target.value })} required min="1" className="border-[#E5E7EB]" data-testid="refund-amount" />
                  </div>
                  <div className="space-y-2">
                    <Label className="text-xs uppercase tracking-[0.1em] font-bold text-[#6B7280]">Reason</Label>
                    <Input value={createForm.reason} onChange={(e) => setCreateForm({ ...createForm, reason: e.target.value })} required className="border-[#E5E7EB]" data-testid="refund-reason" />
                  </div>
                  {createError && (
                    <div className="p-3 bg-red-50 border border-red-200 rounded-md text-sm text-red-700" data-testid="refund-error">{createError}</div>
                  )}
                  <Button type="submit" disabled={createLoading} className="w-full bg-[#002FA7] hover:bg-[#002FA7]/90 text-white rounded-md" data-testid="refund-submit-btn">
                    {createLoading ? "Creating..." : "Create Refund"}
                  </Button>
                </form>
              </DialogContent>
            </Dialog>
          </div>
        </div>

        <Card className="border border-[#E5E7EB] shadow-none rounded-md" data-testid="refunds-table">
          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-[#E5E7EB] bg-[#F9FAFB]">
                    <th className="text-left py-3 px-4 text-xs tracking-[0.1em] uppercase font-bold text-[#6B7280]">Refund ID</th>
                    <th className="text-left py-3 px-4 text-xs tracking-[0.1em] uppercase font-bold text-[#6B7280]">User ID</th>
                    <th className="text-left py-3 px-4 text-xs tracking-[0.1em] uppercase font-bold text-[#6B7280]">Program</th>
                    <th className="text-right py-3 px-4 text-xs tracking-[0.1em] uppercase font-bold text-[#6B7280]">Amount</th>
                    <th className="text-left py-3 px-4 text-xs tracking-[0.1em] uppercase font-bold text-[#6B7280]">Reason</th>
                    <th className="text-center py-3 px-4 text-xs tracking-[0.1em] uppercase font-bold text-[#6B7280]">Status</th>
                    <th className="text-center py-3 px-4 text-xs tracking-[0.1em] uppercase font-bold text-[#6B7280]">Actions</th>
                    <th className="text-left py-3 px-4 text-xs tracking-[0.1em] uppercase font-bold text-[#6B7280]">Date</th>
                  </tr>
                </thead>
                <tbody>
                  {loading ? (
                    <tr><td colSpan={8} className="py-12 text-center text-[#6B7280]">Loading...</td></tr>
                  ) : refunds.length === 0 ? (
                    <tr><td colSpan={8} className="py-12 text-center text-[#6B7280]">No refunds found</td></tr>
                  ) : (
                    refunds.map((r) => (
                      <tr key={r.refund_id} className="border-b border-[#E5E7EB] last:border-0 hover:bg-[#F9FAFB] transition-colors" data-testid={`refund-row-${r.refund_id}`}>
                        <td className="py-3 px-4 font-mono text-xs text-[#111827]">{r.refund_id.slice(0, 8)}...</td>
                        <td className="py-3 px-4 font-mono text-xs text-[#6B7280]">{r.user_id.slice(0, 8)}...</td>
                        <td className="py-3 px-4 text-[#111827]">{r.program_name || "—"}</td>
                        <td className="py-3 px-4 text-right font-mono font-medium text-[#111827]">₹{Number(r.amount).toLocaleString('en-IN')}</td>
                        <td className="py-3 px-4 text-[#6B7280] max-w-[200px] truncate">{r.reason}</td>
                        <td className="py-3 px-4 text-center">
                          <Badge className={
                            r.status === "REFUNDED" ? "bg-[#10B981]/10 text-[#10B981] border-[#10B981]/20 hover:bg-[#10B981]/10" :
                            r.status === "PENDING" ? "bg-[#F59E0B]/10 text-[#F59E0B] border-[#F59E0B]/20 hover:bg-[#F59E0B]/10" :
                            "bg-[#EF4444]/10 text-[#EF4444] border-[#EF4444]/20 hover:bg-[#EF4444]/10"
                          }>{r.status}</Badge>
                        </td>
                        <td className="py-3 px-4 text-center">
                          {r.status === "PENDING" && (
                            <div className="flex items-center gap-1 justify-center">
                              <Button size="sm" variant="ghost" className="text-xs text-[#10B981] hover:text-[#10B981] hover:bg-[#10B981]/10 h-7 px-2" onClick={() => handleUpdateStatus(r.refund_id, "REFUNDED")} data-testid={`approve-refund-${r.refund_id}`}>
                                Approve
                              </Button>
                              <Button size="sm" variant="ghost" className="text-xs text-[#EF4444] hover:text-[#EF4444] hover:bg-[#EF4444]/10 h-7 px-2" onClick={() => handleUpdateStatus(r.refund_id, "REJECTED")} data-testid={`reject-refund-${r.refund_id}`}>
                                Reject
                              </Button>
                            </div>
                          )}
                        </td>
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
