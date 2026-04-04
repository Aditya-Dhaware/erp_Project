import React, { useState, useCallback } from "react";
import api from "@/lib/api";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Search, FileText, CreditCard, Receipt, AlertCircle, CheckCircle } from "lucide-react";

const RAZORPAY_KEY = process.env.REACT_APP_RAZORPAY_KEY_ID;

export default function UserPortal() {
  const [userId, setUserId] = useState("");
  const [bills, setBills] = useState([]);
  const [receipts, setReceipts] = useState([]);
  const [loading, setLoading] = useState(false);
  const [searched, setSearched] = useState(false);
  const [paymentStatus, setPaymentStatus] = useState(null);
  const [payingBillId, setPayingBillId] = useState(null);

  const lookupBills = useCallback(async () => {
    if (!userId.trim()) return;
    setLoading(true);
    setSearched(true);
    try {
      const [billsRes, receiptsRes] = await Promise.all([
        api.get(`/bills/user/${userId}`),
        api.get(`/receipts/user/${userId}`)
      ]);
      setBills(billsRes.data);
      setReceipts(receiptsRes.data);
    } catch (err) {
      setBills([]);
      setReceipts([]);
    }
    setLoading(false);
  }, [userId]);

  const handlePay = async (bill) => {
    setPayingBillId(bill.bill_id);
    setPaymentStatus(null);
    try {
      const { data } = await api.post(`/payments/create-order?bill_id=${bill.bill_id}&user_id=${bill.user_id}`);
      const options = {
        key: data.key_id,
        amount: data.order.amount,
        currency: data.order.currency,
        order_id: data.order.id,
        name: "College ERP",
        description: `${bill.bill_type} Fee - ${bill.program_name || ""}`,
        handler: async (response) => {
          try {
            const verifyRes = await api.post("/payments/verify", {
              razorpay_order_id: response.razorpay_order_id,
              razorpay_payment_id: response.razorpay_payment_id,
              razorpay_signature: response.razorpay_signature
            });
            setPaymentStatus({ type: "success", message: `Payment successful! Receipt: ${verifyRes.data.receipt.receipt_number}` });
            lookupBills();
          } catch {
            setPaymentStatus({ type: "error", message: "Payment verification failed. Please contact admin." });
          }
          setPayingBillId(null);
        },
        modal: {
          ondismiss: () => {
            setPayingBillId(null);
            setPaymentStatus({ type: "info", message: "Payment cancelled." });
          }
        },
        theme: { color: "#002FA7" }
      };
      const rzp = new window.Razorpay(options);
      rzp.on("payment.failed", () => {
        setPayingBillId(null);
        setPaymentStatus({ type: "error", message: "Payment failed. Please try again." });
      });
      rzp.open();
    } catch (err) {
      setPayingBillId(null);
      setPaymentStatus({ type: "error", message: err.response?.data?.detail || "Could not initiate payment." });
    }
  };

  const pendingBills = bills.filter((b) => b.status === "UNPAID");
  const paidBills = bills.filter((b) => b.status === "PAID");
  const totalPending = pendingBills.reduce((sum, b) => sum + b.amount, 0);

  return (
    <div className="min-h-screen bg-[#F9FAFB]" data-testid="user-portal">
      {/* Header */}
      <header className="sticky top-0 z-50 w-full border-b border-[#E5E7EB] bg-white/80 backdrop-blur-xl">
        <div className="max-w-[960px] mx-auto px-6 h-14 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 bg-[#002FA7] rounded flex items-center justify-center">
              <CreditCard className="w-4 h-4 text-white" />
            </div>
            <span className="text-sm font-bold tracking-tight text-[#111827]">Student Fee Portal</span>
          </div>
          <a href="/" className="text-xs text-[#002FA7] font-medium hover:underline" data-testid="admin-link">Admin Login</a>
        </div>
      </header>

      <main className="max-w-[960px] mx-auto px-6 py-8">
        {/* Lookup */}
        <Card className="border border-[#E5E7EB] shadow-none rounded-md mb-8" data-testid="user-lookup-card">
          <CardHeader className="pb-3">
            <CardTitle className="text-lg font-bold text-[#111827]">Look Up Your Fees</CardTitle>
            <p className="text-sm text-[#6B7280]">Enter your User ID to view bills, make payments, and download receipts.</p>
          </CardHeader>
          <CardContent>
            <div className="flex gap-3">
              <Input
                value={userId}
                onChange={(e) => setUserId(e.target.value)}
                placeholder="Enter your User ID (UUID)"
                className="border-[#E5E7EB] font-mono text-sm flex-1"
                data-testid="user-id-input"
                onKeyDown={(e) => e.key === "Enter" && lookupBills()}
              />
              <Button onClick={lookupBills} disabled={loading} className="bg-[#002FA7] hover:bg-[#002FA7]/90 text-white rounded-md" data-testid="lookup-btn">
                <Search className="w-4 h-4 mr-1.5" />
                {loading ? "Loading..." : "Look Up"}
              </Button>
            </div>

            {/* Sample user IDs hint */}
            <div className="mt-3 text-xs text-[#6B7280]">
              <span className="font-medium">Sample IDs:</span>{" "}
              <button onClick={() => setUserId("a1111111-1111-1111-1111-111111111111")} className="text-[#002FA7] hover:underline font-mono" data-testid="sample-id-1">a1111111...</button>,{" "}
              <button onClick={() => setUserId("a2222222-2222-2222-2222-222222222222")} className="text-[#002FA7] hover:underline font-mono" data-testid="sample-id-2">a2222222...</button>,{" "}
              <button onClick={() => setUserId("a3333333-3333-3333-3333-333333333333")} className="text-[#002FA7] hover:underline font-mono" data-testid="sample-id-3">a3333333...</button>
            </div>
          </CardContent>
        </Card>

        {/* Payment Status */}
        {paymentStatus && (
          <div className={`mb-6 p-4 rounded-md flex items-center gap-3 text-sm ${
            paymentStatus.type === "success" ? "bg-green-50 border border-green-200 text-green-700" :
            paymentStatus.type === "error" ? "bg-red-50 border border-red-200 text-red-700" :
            "bg-blue-50 border border-blue-200 text-blue-700"
          }`} data-testid="payment-status">
            {paymentStatus.type === "success" ? <CheckCircle className="w-5 h-5 shrink-0" /> : <AlertCircle className="w-5 h-5 shrink-0" />}
            <span>{paymentStatus.message}</span>
          </div>
        )}

        {searched && !loading && (
          <>
            {/* Summary */}
            {bills.length > 0 && (
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6" data-testid="user-summary">
                <Card className="border border-[#E5E7EB] shadow-none rounded-md">
                  <CardContent className="p-4">
                    <p className="text-xs tracking-[0.15em] uppercase font-bold text-[#6B7280]">Total Bills</p>
                    <p className="text-xl font-bold text-[#111827] mt-1">{bills.length}</p>
                  </CardContent>
                </Card>
                <Card className="border border-[#E5E7EB] shadow-none rounded-md">
                  <CardContent className="p-4">
                    <p className="text-xs tracking-[0.15em] uppercase font-bold text-[#6B7280]">Pending Amount</p>
                    <p className="text-xl font-bold text-[#F59E0B] mt-1">₹{totalPending.toLocaleString('en-IN')}</p>
                  </CardContent>
                </Card>
                <Card className="border border-[#E5E7EB] shadow-none rounded-md">
                  <CardContent className="p-4">
                    <p className="text-xs tracking-[0.15em] uppercase font-bold text-[#6B7280]">Receipts</p>
                    <p className="text-xl font-bold text-[#10B981] mt-1">{receipts.length}</p>
                  </CardContent>
                </Card>
              </div>
            )}

            <Tabs defaultValue="pending" className="space-y-4">
              <TabsList className="border border-[#E5E7EB] bg-white rounded-md p-1">
                <TabsTrigger value="pending" className="text-sm rounded" data-testid="tab-pending">
                  Pending ({pendingBills.length})
                </TabsTrigger>
                <TabsTrigger value="paid" className="text-sm rounded" data-testid="tab-paid">
                  Paid ({paidBills.length})
                </TabsTrigger>
                <TabsTrigger value="receipts" className="text-sm rounded" data-testid="tab-receipts">
                  Receipts ({receipts.length})
                </TabsTrigger>
              </TabsList>

              <TabsContent value="pending">
                {pendingBills.length === 0 ? (
                  <Card className="border border-[#E5E7EB] shadow-none rounded-md">
                    <CardContent className="py-12 text-center text-[#6B7280]">
                      <CheckCircle className="w-10 h-10 mx-auto mb-3 text-[#10B981]" />
                      <p className="font-medium">All bills are paid!</p>
                    </CardContent>
                  </Card>
                ) : (
                  <div className="space-y-3">
                    {pendingBills.map((b) => (
                      <Card key={b.bill_id} className="border border-[#E5E7EB] shadow-none rounded-md" data-testid={`pending-bill-${b.bill_id}`}>
                        <CardContent className="p-4 flex items-center justify-between">
                          <div>
                            <div className="flex items-center gap-2 mb-1">
                              <Badge variant="outline" className="text-xs">{b.bill_type}</Badge>
                              <span className="text-sm font-medium text-[#111827]">{b.program_name || "Brochure"}</span>
                            </div>
                            <p className="text-xs text-[#6B7280]">
                              {b.installment_number ? `Installment ${b.installment_number} of ${b.total_installments}` : "One-time fee"} — {b.academic_year}
                            </p>
                          </div>
                          <div className="flex items-center gap-4">
                            <span className="text-lg font-bold font-mono text-[#111827]">₹{Number(b.amount).toLocaleString('en-IN')}</span>
                            <Button
                              onClick={() => handlePay(b)}
                              disabled={payingBillId === b.bill_id}
                              className="bg-[#002FA7] hover:bg-[#002FA7]/90 text-white rounded-md text-sm"
                              data-testid={`pay-btn-${b.bill_id}`}
                            >
                              <CreditCard className="w-4 h-4 mr-1.5" />
                              {payingBillId === b.bill_id ? "Processing..." : "Pay Now"}
                            </Button>
                          </div>
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                )}
              </TabsContent>

              <TabsContent value="paid">
                {paidBills.length === 0 ? (
                  <Card className="border border-[#E5E7EB] shadow-none rounded-md">
                    <CardContent className="py-12 text-center text-[#6B7280]">No paid bills yet.</CardContent>
                  </Card>
                ) : (
                  <div className="space-y-3">
                    {paidBills.map((b) => (
                      <Card key={b.bill_id} className="border border-[#E5E7EB] shadow-none rounded-md" data-testid={`paid-bill-${b.bill_id}`}>
                        <CardContent className="p-4 flex items-center justify-between">
                          <div>
                            <div className="flex items-center gap-2 mb-1">
                              <Badge variant="outline" className="text-xs">{b.bill_type}</Badge>
                              <span className="text-sm font-medium text-[#111827]">{b.program_name || "Brochure"}</span>
                              <Badge className="bg-[#10B981]/10 text-[#10B981] border-[#10B981]/20 hover:bg-[#10B981]/10 text-xs">PAID</Badge>
                            </div>
                            <p className="text-xs text-[#6B7280]">
                              {b.installment_number ? `Installment ${b.installment_number} of ${b.total_installments}` : "One-time fee"} — {b.academic_year}
                            </p>
                          </div>
                          <span className="text-lg font-bold font-mono text-[#10B981]">₹{Number(b.amount).toLocaleString('en-IN')}</span>
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                )}
              </TabsContent>

              <TabsContent value="receipts">
                {receipts.length === 0 ? (
                  <Card className="border border-[#E5E7EB] shadow-none rounded-md">
                    <CardContent className="py-12 text-center text-[#6B7280]">No receipts yet.</CardContent>
                  </Card>
                ) : (
                  <div className="space-y-3">
                    {receipts.map((r) => (
                      <Card key={r.receipt_id} className="border border-[#E5E7EB] shadow-none rounded-md" data-testid={`receipt-card-${r.receipt_id}`}>
                        <CardContent className="p-4 flex items-center justify-between">
                          <div>
                            <div className="flex items-center gap-2 mb-1">
                              <Receipt className="w-4 h-4 text-[#002FA7]" />
                              <span className="text-sm font-mono font-medium text-[#002FA7]">{r.receipt_number}</span>
                            </div>
                            <p className="text-xs text-[#6B7280]">
                              {r.program_name || "Brochure"} — {r.bill_type} {r.installment_number ? `(Inst. ${r.installment_number})` : ""} — {new Date(r.created_at).toLocaleDateString()}
                            </p>
                          </div>
                          <span className="text-lg font-bold font-mono text-[#111827]">₹{Number(r.amount).toLocaleString('en-IN')}</span>
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                )}
              </TabsContent>
            </Tabs>
          </>
        )}

        {searched && !loading && bills.length === 0 && (
          <Card className="border border-[#E5E7EB] shadow-none rounded-md">
            <CardContent className="py-12 text-center text-[#6B7280]">
              <Search className="w-10 h-10 mx-auto mb-3 text-[#6B7280]/50" />
              <p className="font-medium">No records found</p>
              <p className="text-sm mt-1">Please check the User ID and try again.</p>
            </CardContent>
          </Card>
        )}
      </main>
    </div>
  );
}
