import React, { useState, useEffect, useCallback } from "react";
import api from "@/lib/api";
import { CreditCard, CheckCircle, AlertCircle, FileText, ArrowLeft, Shield } from "lucide-react";
import { useSearchParams } from "react-router-dom";

export default function BrochurePayment() {
  const [searchParams] = useSearchParams();
  const billId = searchParams.get("bill_id");
  const userId = searchParams.get("user_id");

  const [bill, setBill] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [paymentStatus, setPaymentStatus] = useState(null);
  const [paying, setPaying] = useState(false);

  const fetchBill = useCallback(async () => {
    if (!billId) {
      setError("No bill ID provided. Please use the link from the Admission portal.");
      setLoading(false);
      return;
    }
    try {
      const { data } = await api.get(`/bills/${billId}`);
      if (data.bill_type !== "BROCHURE") {
        setError("This page is only for brochure fee payments.");
        setLoading(false);
        return;
      }
      setBill(data);
    } catch (err) {
      setError(err.response?.data?.detail || "Could not load bill details. Please check the link.");
    }
    setLoading(false);
  }, [billId]);

  useEffect(() => {
    fetchBill();
  }, [fetchBill]);

  const handlePay = async () => {
    if (!bill) return;
    setPaying(true);
    setPaymentStatus(null);
    try {
      const { data } = await api.post(`/payments/create-order?bill_id=${bill.bill_id}&user_id=${bill.user_id}`);
      const options = {
        key: data.key_id,
        amount: data.order.amount,
        currency: data.order.currency,
        order_id: data.order.id,
        name: "College ERP",
        description: "Brochure Fee Payment",
        handler: async (response) => {
          try {
            const verifyRes = await api.post("/payments/verify", {
              razorpay_order_id: response.razorpay_order_id,
              razorpay_payment_id: response.razorpay_payment_id,
              razorpay_signature: response.razorpay_signature
            });
            setPaymentStatus({
              type: "success",
              message: `Payment successful! Receipt: ${verifyRes.data.receipt.receipt_number}`,
              receipt: verifyRes.data.receipt
            });
            // Refresh bill to show updated status
            fetchBill();
          } catch {
            setPaymentStatus({ type: "error", message: "Payment verification failed. Please contact admin." });
          }
          setPaying(false);
        },
        modal: {
          ondismiss: () => {
            setPaying(false);
            setPaymentStatus({ type: "info", message: "Payment was cancelled. You can try again." });
          }
        },
        theme: { color: "#6366F1" }
      };
      const rzp = new window.Razorpay(options);
      rzp.on("payment.failed", () => {
        setPaying(false);
        setPaymentStatus({ type: "error", message: "Payment failed. Please try again." });
      });
      rzp.open();
    } catch (err) {
      setPaying(false);
      setPaymentStatus({ type: "error", message: err.response?.data?.detail || "Could not initiate payment." });
    }
  };

  const isPaid = bill?.status === "PAID";

  return (
    <>
      <header className="erp-topbar" style={{ paddingLeft: '24px', zIndex: 10 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <div style={{
            width: '32px', height: '32px',
            background: 'linear-gradient(135deg, #6366F1, #8B5CF6)',
            borderRadius: '8px',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            boxShadow: '0 2px 8px rgba(99, 102, 241, 0.3)'
          }}>
            <FileText color="white" size={16} />
          </div>
          <div>
            <span style={{ fontSize: '14px', fontWeight: 'bold', color: 'var(--erp-dark)' }}>Brochure Fee Payment</span>
            <span style={{ fontSize: '11px', color: 'var(--erp-text-muted)', display: 'block', marginTop: '-2px' }}>Fees & Billing Module</span>
          </div>
        </div>
        <div style={{ marginLeft: 'auto', display: 'flex', gap: '16px', alignItems: 'center' }}>
          <a href="/user" style={{ fontSize: '13px', color: 'var(--erp-primary)', fontWeight: '500', textDecoration: 'none', display: 'flex', alignItems: 'center', gap: '4px' }}>
            <ArrowLeft size={14} /> Student Portal
          </a>
        </div>
      </header>

      <main className="erp-main" style={{ maxWidth: '640px', margin: '0 auto', paddingTop: '3rem' }}>

        {/* Loading State */}
        {loading && (
          <div className="erp-card" style={{ padding: '4rem', textAlign: 'center' }}>
            <div style={{
              width: '48px', height: '48px', margin: '0 auto 16px',
              border: '3px solid var(--erp-border)', borderTopColor: '#6366F1',
              borderRadius: '50%',
              animation: 'spin 0.8s linear infinite'
            }} />
            <p style={{ color: 'var(--erp-text-muted)', fontSize: '14px' }}>Loading bill details...</p>
            <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
          </div>
        )}

        {/* Error State */}
        {error && !loading && (
          <div className="erp-card" style={{ padding: '3rem', textAlign: 'center' }}>
            <AlertCircle size={48} color="#EF4444" style={{ margin: '0 auto 16px' }} />
            <h3 style={{ color: 'var(--erp-dark)', marginBottom: '8px', fontSize: '16px' }}>Something went wrong</h3>
            <p style={{ color: 'var(--erp-text-muted)', fontSize: '14px', maxWidth: '400px', margin: '0 auto' }}>{error}</p>
          </div>
        )}

        {/* Payment Status Alert */}
        {paymentStatus && (
          <div
            className={`erp-alert ${paymentStatus.type === "success" ? "erp-alert--success" : paymentStatus.type === "error" ? "erp-alert--danger" : "erp-alert--info"}`}
            style={{
              marginBottom: '1.5rem',
              display: 'flex', alignItems: 'center', gap: '10px',
              borderRadius: '12px',
              animation: 'slideDown 0.3s ease-out'
            }}
          >
            {paymentStatus.type === "success" ? <CheckCircle size={20} /> : <AlertCircle size={20} />}
            <div>
              <div style={{ fontWeight: '600' }}>{paymentStatus.message}</div>
              {paymentStatus.type === "success" && (
                <div style={{ fontSize: '12px', marginTop: '4px', opacity: 0.8 }}>
                  Your brochure fee has been recorded. You may now return to the Admission portal.
                </div>
              )}
            </div>
          </div>
        )}

        <style>{`@keyframes slideDown { from { opacity: 0; transform: translateY(-10px); } to { opacity: 1; transform: translateY(0); } }`}</style>

        {/* Bill Details Card */}
        {bill && !loading && !error && (
          <div className="erp-card" style={{
            overflow: 'hidden',
            borderRadius: '16px',
            border: isPaid ? '1px solid #10B98133' : '1px solid #6366F133',
            boxShadow: '0 4px 24px rgba(0,0,0,0.06)'
          }}>
            {/* Header Banner */}
            <div style={{
              background: isPaid
                ? 'linear-gradient(135deg, #10B981, #059669)'
                : 'linear-gradient(135deg, #6366F1, #8B5CF6)',
              padding: '24px 28px',
              color: 'white'
            }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div>
                  <div style={{ fontSize: '12px', textTransform: 'uppercase', letterSpacing: '0.1em', opacity: 0.85, fontWeight: '600' }}>
                    Brochure Fee
                  </div>
                  <div style={{ fontSize: '2rem', fontWeight: '800', marginTop: '4px', fontFamily: 'monospace' }}>
                    ₹{Number(bill.amount).toLocaleString('en-IN')}
                  </div>
                </div>
                <div style={{
                  padding: '6px 14px',
                  borderRadius: '20px',
                  background: 'rgba(255,255,255,0.2)',
                  backdropFilter: 'blur(10px)',
                  fontSize: '13px',
                  fontWeight: '700',
                  letterSpacing: '0.05em'
                }}>
                  {isPaid ? "✓ PAID" : "UNPAID"}
                </div>
              </div>
            </div>

            {/* Bill Info */}
            <div style={{ padding: '24px 28px' }}>
              <div style={{
                display: 'grid', gridTemplateColumns: '1fr 1fr',
                gap: '20px', marginBottom: '24px'
              }}>
                <div>
                  <div style={{ fontSize: '11px', textTransform: 'uppercase', color: 'var(--erp-text-muted)', fontWeight: '600', letterSpacing: '0.08em', marginBottom: '4px' }}>
                    Academic Year
                  </div>
                  <div style={{ fontSize: '14px', fontWeight: '600', color: 'var(--erp-dark)' }}>
                    {bill.academic_year}
                  </div>
                </div>
                <div>
                  <div style={{ fontSize: '11px', textTransform: 'uppercase', color: 'var(--erp-text-muted)', fontWeight: '600', letterSpacing: '0.08em', marginBottom: '4px' }}>
                    Fee Type
                  </div>
                  <div style={{ fontSize: '14px', fontWeight: '600', color: 'var(--erp-dark)' }}>
                    {bill.bill_type}
                  </div>
                </div>
                <div>
                  <div style={{ fontSize: '11px', textTransform: 'uppercase', color: 'var(--erp-text-muted)', fontWeight: '600', letterSpacing: '0.08em', marginBottom: '4px' }}>
                    Student ID
                  </div>
                  <div style={{ fontSize: '13px', fontFamily: 'monospace', color: 'var(--erp-dark)', wordBreak: 'break-all' }}>
                    {bill.user_id}
                  </div>
                </div>
                <div>
                  <div style={{ fontSize: '11px', textTransform: 'uppercase', color: 'var(--erp-text-muted)', fontWeight: '600', letterSpacing: '0.08em', marginBottom: '4px' }}>
                    Bill ID
                  </div>
                  <div style={{ fontSize: '13px', fontFamily: 'monospace', color: 'var(--erp-dark)', wordBreak: 'break-all' }}>
                    {bill.bill_id}
                  </div>
                </div>
              </div>

              {/* Pay Button or Paid Confirmation */}
              {isPaid ? (
                <div style={{
                  background: '#F0FDF4',
                  borderRadius: '12px',
                  padding: '20px',
                  textAlign: 'center',
                  border: '1px solid #BBF7D0'
                }}>
                  <CheckCircle size={32} color="#10B981" style={{ margin: '0 auto 8px' }} />
                  <div style={{ fontWeight: '700', color: '#065F46', fontSize: '15px' }}>
                    Payment Complete
                  </div>
                  <div style={{ color: '#047857', fontSize: '13px', marginTop: '4px' }}>
                    This brochure fee has already been paid. You can safely return to the Admission portal.
                  </div>
                </div>
              ) : (
                <div>
                  <button
                    onClick={handlePay}
                    disabled={paying}
                    className="erp-btn erp-btn--primary"
                    style={{
                      width: '100%',
                      padding: '14px 24px',
                      fontSize: '15px',
                      fontWeight: '700',
                      background: paying ? '#9CA3AF' : 'linear-gradient(135deg, #6366F1, #8B5CF6)',
                      border: 'none',
                      borderRadius: '12px',
                      color: 'white',
                      cursor: paying ? 'not-allowed' : 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      gap: '10px',
                      transition: 'all 0.2s ease',
                      boxShadow: paying ? 'none' : '0 4px 14px rgba(99, 102, 241, 0.4)'
                    }}
                  >
                    <CreditCard size={18} />
                    {paying ? "Processing Payment..." : `Pay ₹${Number(bill.amount).toLocaleString('en-IN')} Now`}
                  </button>

                  <div style={{
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    gap: '6px', marginTop: '16px',
                    fontSize: '12px', color: 'var(--erp-text-muted)'
                  }}>
                    <Shield size={14} />
                    Secured by Razorpay · 256-bit SSL Encrypted
                  </div>
                </div>
              )}
            </div>
          </div>
        )}
      </main>
    </>
  );
}
