import React, { useState, useCallback } from "react";
import api from "@/lib/api";
import { Search, CreditCard, AlertCircle, CheckCircle, Printer } from "lucide-react";
import { useSearchParams } from "react-router-dom";

export default function UserPortal() {
  const [searchParams] = useSearchParams();
  const defaultUserId = searchParams.get("student_id") || searchParams.get("user_id") || "";

  const [userId, setUserId] = useState(defaultUserId);
  const [bills, setBills] = useState([]);
  const [receipts, setReceipts] = useState([]);
  const [loading, setLoading] = useState(false);
  const [searched, setSearched] = useState(false);
  const [paymentStatus, setPaymentStatus] = useState(null);
  const [payingBillId, setPayingBillId] = useState(null);
  const [activeTab, setActiveTab] = useState("pending");

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

  // Auto-trigger search if the id is in the URL parameter
  React.useEffect(() => {
    if (defaultUserId) {
      lookupBills();
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

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
        theme: { color: "var(--erp-primary)" }
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
    <>
      <header className="erp-topbar" style={{ paddingLeft: '24px', zIndex: 10 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <div style={{ width: '32px', height: '32px', backgroundColor: 'var(--erp-primary)', borderRadius: '4px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <CreditCard color="white" size={16} />
          </div>
          <span style={{ fontSize: '14px', fontWeight: 'bold', color: 'var(--erp-dark)' }}>Student Fee Portal</span>
        </div>
        <div style={{ marginLeft: 'auto' }}>
          <a href="/admin" style={{ fontSize: '13px', color: 'var(--erp-primary)', fontWeight: '500', textDecoration: 'none' }} data-testid="admin-link">Admin Login</a>
        </div>
      </header>

      <main className="erp-main" data-erp-page="User Portal" style={{ maxWidth: '960px', margin: '0 auto', marginLeft: 'auto', paddingTop: '2rem' }}>
        
        <div className="erp-card" style={{ marginBottom: '2rem' }}>
          <div className="erp-card__header">
            <div>
              <div className="erp-card__title">Look Up Your Fees</div>
              <div className="erp-card__subtitle">Enter your User ID to view bills, make payments, and download receipts.</div>
            </div>
          </div>
          <div className="erp-card__body">
            <div style={{ display: 'flex', gap: '12px' }}>
              <input
                type="text"
                className="erp-form-control"
                style={{ flex: 1, fontFamily: 'monospace' }}
                value={userId}
                onChange={(e) => setUserId(e.target.value)}
                placeholder="Enter your User ID (UUID)"
                onKeyDown={(e) => e.key === "Enter" && lookupBills()}
              />
              <button onClick={lookupBills} disabled={loading} className="erp-btn erp-btn--primary" style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <Search size={16} /> {loading ? "Loading..." : "Look Up"}
              </button>
            </div>
            <div style={{ marginTop: '12px', fontSize: '13px', color: 'var(--erp-text-muted)' }}>
              <span style={{ fontWeight: '500' }}>Sample IDs:</span>{" "}
              <button className="erp-btn erp-btn--ghost" style={{ padding: '0 4px', fontSize: '13px', fontFamily: 'monospace' }} onClick={() => setUserId("a1111111-1111-1111-1111-111111111111")}>a1111111...</button>,{" "}
              <button className="erp-btn erp-btn--ghost" style={{ padding: '0 4px', fontSize: '13px', fontFamily: 'monospace' }} onClick={() => setUserId("a2222222-2222-2222-2222-222222222222")}>a2222222...</button>
            </div>
          </div>
        </div>

        {paymentStatus && (
          <div className={`erp-alert ${paymentStatus.type === "success" ? "erp-alert--success" : paymentStatus.type === "error" ? "erp-alert--danger" : "erp-alert--info"}`} style={{ marginBottom: '1.5rem' }}>
            {paymentStatus.type === "success" ? <CheckCircle size={16} style={{marginRight: 8}}/> : <AlertCircle size={16} style={{marginRight: 8}}/>}
            {paymentStatus.message}
          </div>
        )}

        {searched && !loading && (
          <>
            {bills.length > 0 && (
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1rem', marginBottom: '1.5rem' }}>
                <div className="erp-card" style={{ textAlign: 'center', padding: '1rem' }}>
                  <div style={{ fontSize: '11px', textTransform: 'uppercase', fontWeight: 'bold', color: 'var(--erp-text-muted)', letterSpacing: '0.1em' }}>Total Bills</div>
                  <div style={{ fontSize: '1.5rem', fontWeight: 'bold', color: 'var(--erp-dark)', marginTop: '4px' }}>{bills.length}</div>
                </div>
                <div className="erp-card" style={{ textAlign: 'center', padding: '1rem' }}>
                  <div style={{ fontSize: '11px', textTransform: 'uppercase', fontWeight: 'bold', color: 'var(--erp-text-muted)', letterSpacing: '0.1em' }}>Pending Amount</div>
                  <div style={{ fontSize: '1.5rem', fontWeight: 'bold', color: 'var(--erp-warning)', marginTop: '4px' }}>₹{totalPending.toLocaleString('en-IN')}</div>
                </div>
                <div className="erp-card" style={{ textAlign: 'center', padding: '1rem' }}>
                  <div style={{ fontSize: '11px', textTransform: 'uppercase', fontWeight: 'bold', color: 'var(--erp-text-muted)', letterSpacing: '0.1em' }}>Receipts</div>
                  <div style={{ fontSize: '1.5rem', fontWeight: 'bold', color: 'var(--erp-success)', marginTop: '4px' }}>{receipts.length}</div>
                </div>
              </div>
            )}

            <div style={{ display: 'flex', gap: '8px', marginBottom: '1rem', borderBottom: '1px solid var(--erp-border)' }}>
              <button 
                onClick={() => setActiveTab('pending')}
                style={{ padding: '8px 16px', background: 'transparent', border: 'none', borderBottom: activeTab === 'pending' ? '2px solid var(--erp-primary)' : '2px solid transparent', color: activeTab === 'pending' ? 'var(--erp-primary)' : 'var(--erp-text-muted)', fontWeight: activeTab === 'pending' ? 'bold' : 'normal', cursor: 'pointer' }}
              >
                Pending ({pendingBills.length})
              </button>
              <button 
                onClick={() => setActiveTab('paid')}
                style={{ padding: '8px 16px', background: 'transparent', border: 'none', borderBottom: activeTab === 'paid' ? '2px solid var(--erp-primary)' : '2px solid transparent', color: activeTab === 'paid' ? 'var(--erp-primary)' : 'var(--erp-text-muted)', fontWeight: activeTab === 'paid' ? 'bold' : 'normal', cursor: 'pointer' }}
              >
                Paid ({paidBills.length})
              </button>
              <button 
                onClick={() => setActiveTab('receipts')}
                style={{ padding: '8px 16px', background: 'transparent', border: 'none', borderBottom: activeTab === 'receipts' ? '2px solid var(--erp-primary)' : '2px solid transparent', color: activeTab === 'receipts' ? 'var(--erp-primary)' : 'var(--erp-text-muted)', fontWeight: activeTab === 'receipts' ? 'bold' : 'normal', cursor: 'pointer' }}
              >
                Receipts ({receipts.length})
              </button>
            </div>

            {activeTab === 'pending' && (
              <div>
                {pendingBills.length === 0 ? (
                  <div className="erp-card" style={{ padding: '3rem', textAlign: 'center' }}>
                    <CheckCircle size={40} color="var(--erp-success)" style={{ margin: '0 auto 12px auto' }} />
                    <p style={{ color: 'var(--erp-dark)', fontWeight: '500' }}>All bills are paid!</p>
                  </div>
                ) : (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                    {pendingBills.map(b => (
                      <div key={b.bill_id} className="erp-card">
                        <div className="erp-card__body" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                          <div>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px' }}>
                              <span className="erp-badge erp-badge--primary">{b.bill_type}</span>
                              <span style={{ fontWeight: '500', color: 'var(--erp-dark)' }}>{b.program_name || "Brochure"}</span>
                            </div>
                            <div style={{ fontSize: '12px', color: 'var(--erp-text-muted)' }}>
                              {b.installment_number ? `Installment ${b.installment_number} of ${b.total_installments}` : "One-time fee"} — {b.academic_year}
                            </div>
                          </div>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                            <span style={{ fontSize: '1.25rem', fontWeight: 'bold', fontFamily: 'monospace' }}>₹{Number(b.amount).toLocaleString('en-IN')}</span>
                            <button 
                              onClick={() => handlePay(b)} 
                              disabled={payingBillId === b.bill_id}
                              className="erp-btn erp-btn--primary"
                            >
                              {payingBillId === b.bill_id ? "Processing..." : "Pay Now"}
                            </button>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            {activeTab === 'paid' && (
              <div>
                {paidBills.length === 0 ? (
                  <div className="erp-card" style={{ padding: '3rem', textAlign: 'center', color: 'var(--erp-text-muted)' }}>
                    No paid bills yet.
                  </div>
                ) : (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                    {paidBills.map(b => (
                      <div key={b.bill_id} className="erp-card">
                        <div className="erp-card__body" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                          <div>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px' }}>
                              <span className="erp-badge erp-badge--primary">{b.bill_type}</span>
                              <span style={{ fontWeight: '500', color: 'var(--erp-dark)' }}>{b.program_name || "Brochure"}</span>
                              <span className="erp-badge erp-badge--success">PAID</span>
                            </div>
                            <div style={{ fontSize: '12px', color: 'var(--erp-text-muted)' }}>
                              {b.installment_number ? `Installment ${b.installment_number} of ${b.total_installments}` : "One-time fee"} — {b.academic_year}
                            </div>
                          </div>
                          <span style={{ fontSize: '1.25rem', fontWeight: 'bold', fontFamily: 'monospace', color: 'var(--erp-success)' }}>₹{Number(b.amount).toLocaleString('en-IN')}</span>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            {activeTab === 'receipts' && (
              <div>
                {receipts.length === 0 ? (
                  <div className="erp-card" style={{ padding: '3rem', textAlign: 'center', color: 'var(--erp-text-muted)' }}>
                    No receipts generated yet.
                  </div>
                ) : (
                  <div className="erp-card">
                    <div style={{ overflowX: 'auto' }}>
                      <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
                        <thead style={{ borderBottom: '1px solid var(--erp-border)', fontSize: '0.75rem', textTransform: 'uppercase', color: 'var(--erp-text-muted)' }}>
                          <tr>
                            <th style={{ padding: '12px 16px' }}>Receipt #</th>
                            <th style={{ padding: '12px 16px' }}>Fee Type</th>
                            <th style={{ padding: '12px 16px' }}>Academic Year</th>
                            <th style={{ padding: '12px 16px', textAlign: 'right' }}>Amount</th>
                            <th style={{ padding: '12px 16px' }}>Date</th>
                            <th style={{ padding: '12px 16px', textAlign: 'center' }}>Print</th>
                          </tr>
                        </thead>
                        <tbody style={{ fontSize: '0.875rem' }}>
                          {receipts.map(r => (
                            <tr key={r.receipt_id} style={{ borderBottom: '1px solid var(--erp-border)' }}>
                              <td style={{ padding: '12px 16px', fontFamily: 'monospace', color: 'var(--erp-primary)', fontWeight: 'bold' }}>{r.receipt_number}</td>
                              <td style={{ padding: '12px 16px' }}>{r.bill_type}</td>
                              <td style={{ padding: '12px 16px', color: 'var(--erp-text-muted)' }}>{r.academic_year}</td>
                              <td style={{ padding: '12px 16px', textAlign: 'right', fontFamily: 'monospace', fontWeight: 'bold' }}>₹{Number(r.amount).toLocaleString('en-IN')}</td>
                              <td style={{ padding: '12px 16px', color: 'var(--erp-text-muted)', fontSize: '0.8rem' }}>{new Date(r.created_at).toLocaleDateString()}</td>
                              <td style={{ padding: '12px 16px', textAlign: 'center' }}>
                                <button
                                  onClick={() => window.open(`/receipt/${r.receipt_id}/print`, '_blank')}
                                  className="erp-btn erp-btn--ghost"
                                  style={{ padding: '8px' }}
                                  title="Print / Download PDF"
                                >
                                  <Printer size={16} color="var(--erp-primary)" />
                                </button>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                )}
              </div>
            )}
          </>
        )}
      </main>
    </>
  );
}
