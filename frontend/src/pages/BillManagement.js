import React, { useState, useEffect } from "react";
import api from "@/lib/api";
import AdminLayout from "@/components/AdminLayout";
import { Plus, X } from "lucide-react";

export default function BillManagement() {
  const [bills, setBills] = useState([]);
  const [years, setYears] = useState([]);
  const [filters, setFilters] = useState({
    academic_year: "",
    status: "",
    user_id: "",
  });
  const [loading, setLoading] = useState(true);
  const [showGenerate, setShowGenerate] = useState(false);
  const [genForm, setGenForm] = useState({
    user_id: "",
    academic_year: "2024-25",
    program_name: "",
    total_course_fees: "",
    installments: "3",
  });
  const [genLoading, setGenLoading] = useState(false);
  const [genResult, setGenResult] = useState(null);

  useEffect(() => {
    loadYears();
    loadBills();
    // eslint-disable-next-line react-hooks/exhaustive-deps
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
      if (filters.academic_year)
        params.append("academic_year", filters.academic_year);
      if (filters.status) params.append("status", filters.status);
      if (filters.user_id) params.append("user_id", filters.user_id);
      const { data } = await api.get(`/bills?${params.toString()}`);
      setBills(data);
    } catch (err) {
      console.error(err);
    }
    setLoading(false);
  };

  useEffect(() => {
    loadBills();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filters]);

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
        installments: parseInt(genForm.installments),
      };
      const { data } = await api.post("/admission/generate-bills", payload);
      setGenResult(data);
      loadBills();
      setTimeout(() => {
        setShowGenerate(false);
        setGenResult(null);
        setGenForm({
          user_id: "",
          academic_year: "2024-25",
          program_name: "",
          total_course_fees: "",
          installments: "3",
        });
      }, 1500);
    } catch (err) {
      setGenResult({
        error: err.response?.data?.detail || "Failed to generate bills",
      });
    }
    setGenLoading(false);
  };

  return (
    <AdminLayout title="Bill Management">
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "flex-start",
          flexWrap: "wrap",
          gap: "1rem",
          mb: "2rem",
        }}
      >
        <h2 style={{ margin: 0, fontSize: "1.5rem", color: "var(--erp-dark)" }}>
          Bills
        </h2>
        <div style={{ display: "flex", gap: "1rem", flexWrap: "wrap" }}>
          <select
            className="erp-form-control"
            style={{ width: "150px" }}
            value={filters.academic_year}
            onChange={(e) =>
              setFilters({ ...filters, academic_year: e.target.value })
            }
          >
            <option value="">All Years</option>
            {years.map((y) => (
              <option key={y} value={y}>
                {y}
              </option>
            ))}
          </select>

          <select
            className="erp-form-control"
            style={{ width: "150px" }}
            value={filters.status}
            onChange={(e) => setFilters({ ...filters, status: e.target.value })}
          >
            <option value="">All Status</option>
            <option value="PAID">Paid</option>
            <option value="UNPAID">Unpaid</option>
          </select>

          <button
            className="erp-btn erp-btn--primary"
            onClick={() => setShowGenerate(true)}
          >
            <Plus size={16} style={{ marginRight: "6px" }} /> Generate Bills
          </button>

          {showGenerate && (
            <div
              style={{
                position: "fixed",
                top: 0,
                left: 0,
                width: "100vw",
                height: "100vh",
                backgroundColor: "rgba(0,0,0,0.5)",
                zIndex: 1000,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              <div
                style={{
                  backgroundColor: "white",
                  borderRadius: "12px",
                  padding: "1.5rem",
                  width: "100%",
                  maxWidth: "450px",
                  boxShadow: "0 20px 25px -5px rgba(0,0,0,0.2)",
                  position: "relative",
                }}
              >
                <button
                  onClick={() => setShowGenerate(false)}
                  style={{
                    position: "absolute",
                    top: "16px",
                    right: "16px",
                    background: "none",
                    border: "none",
                    cursor: "pointer",
                    color: "var(--erp-text-muted)",
                  }}
                >
                  <X size={20} />
                </button>
                <div
                  style={{
                    fontSize: "1.25rem",
                    fontWeight: "bold",
                    marginBottom: "1.5rem",
                    color: "var(--erp-dark)",
                  }}
                >
                  Generate Academic Bills
                </div>
                <form onSubmit={handleGenerate}>
                  <div className="erp-form-group">
                    <label>User ID (UUID)</label>
                    <input
                      className="erp-form-control"
                      value={genForm.user_id}
                      onChange={(e) =>
                        setGenForm({ ...genForm, user_id: e.target.value })
                      }
                      placeholder="Leave empty for auto-generate"
                    />
                  </div>
                  <div
                    style={{
                      display: "grid",
                      gridTemplateColumns: "1fr 1fr",
                      gap: "1rem",
                    }}
                  >
                    <div className="erp-form-group">
                      <label>
                        Academic Year <span style={{ color: "red" }}>*</span>
                      </label>
                      <input
                        className="erp-form-control"
                        value={genForm.academic_year}
                        onChange={(e) =>
                          setGenForm({
                            ...genForm,
                            academic_year: e.target.value,
                          })
                        }
                        required
                      />
                    </div>
                    <div className="erp-form-group">
                      <label>
                        Program <span style={{ color: "red" }}>*</span>
                      </label>
                      <input
                        className="erp-form-control"
                        value={genForm.program_name}
                        onChange={(e) =>
                          setGenForm({
                            ...genForm,
                            program_name: e.target.value,
                          })
                        }
                        placeholder="B.Sc CS"
                        required
                      />
                    </div>
                  </div>
                  <div
                    style={{
                      display: "grid",
                      gridTemplateColumns: "1fr 1fr",
                      gap: "1rem",
                    }}
                  >
                    <div className="erp-form-group">
                      <label>
                        Total Fees (₹) <span style={{ color: "red" }}>*</span>
                      </label>
                      <input
                        type="number"
                        className="erp-form-control"
                        value={genForm.total_course_fees}
                        onChange={(e) =>
                          setGenForm({
                            ...genForm,
                            total_course_fees: e.target.value,
                          })
                        }
                        required
                        min="1"
                      />
                    </div>
                    <div className="erp-form-group">
                      <label>
                        Installments <span style={{ color: "red" }}>*</span>
                      </label>
                      <input
                        type="number"
                        className="erp-form-control"
                        value={genForm.installments}
                        onChange={(e) =>
                          setGenForm({
                            ...genForm,
                            installments: e.target.value,
                          })
                        }
                        required
                        min="1"
                        max="12"
                      />
                    </div>
                  </div>

                  {genResult && (
                    <div
                      className={
                        genResult.error
                          ? "erp-alert erp-alert--danger"
                          : "erp-alert erp-alert--success"
                      }
                      style={{ marginBottom: "1rem" }}
                    >
                      {genResult.error
                        ? genResult.error
                        : `${genResult.bills?.length} bills generated (₹${genResult.per_installment} each)`}
                    </div>
                  )}

                  <button
                    type="submit"
                    disabled={genLoading}
                    className="erp-btn erp-btn--primary"
                    style={{ width: "100%" }}
                  >
                    {genLoading ? "Generating..." : "Generate Bills"}
                  </button>
                </form>
              </div>
            </div>
          )}
        </div>
      </div>

      <div className="erp-card" style={{ marginTop: "2rem" }}>
        <div style={{ overflowX: "auto" }}>
          <table
            style={{
              width: "100%",
              borderCollapse: "collapse",
              textAlign: "left",
            }}
          >
            <thead
              style={{
                borderBottom: "1px solid var(--erp-border)",
                fontSize: "0.75rem",
                textTransform: "uppercase",
                color: "var(--erp-text-muted)",
              }}
            >
              <tr>
                <th style={{ padding: "12px 16px" }}>Bill ID</th>
                <th style={{ padding: "12px 16px" }}>User Name</th>
                <th style={{ padding: "12px 16px" }}>Program</th>
                <th style={{ padding: "12px 16px" }}>Type</th>
                <th style={{ padding: "12px 16px" }}>Installment</th>
                <th style={{ padding: "12px 16px", textAlign: "right" }}>
                  Amount
                </th>
                <th style={{ padding: "12px 16px", textAlign: "center" }}>
                  Status
                </th>
                <th style={{ padding: "12px 16px" }}>Year</th>
              </tr>
            </thead>
            <tbody style={{ fontSize: "0.875rem" }}>
              {loading ? (
                <tr>
                  <td
                    colSpan={8}
                    style={{
                      padding: "3rem",
                      textAlign: "center",
                      color: "var(--erp-text-muted)",
                    }}
                  >
                    Loading bills...
                  </td>
                </tr>
              ) : bills.length === 0 ? (
                <tr>
                  <td
                    colSpan={8}
                    style={{
                      padding: "3rem",
                      textAlign: "center",
                      color: "var(--erp-text-muted)",
                    }}
                  >
                    No bills found
                  </td>
                </tr>
              ) : (
                bills.map((b) => (
                  <tr
                    key={b.bill_id}
                    style={{ borderBottom: "1px solid var(--erp-border)" }}
                  >
                    <td
                      style={{
                        padding: "12px 16px",
                        fontFamily: "monospace",
                        color: "var(--erp-dark)",
                      }}
                    >
                      {b.bill_id.slice(0, 8)}...
                    </td>
                    <td
                      style={{
                        padding: "12px 16px",
                        fontFamily: "monospace",
                        color: "var(--erp-text-muted)",
                      }}
                    >
                      {b.user_name}
                    </td>
                    <td style={{ padding: "12px 16px" }}>
                      {b.program_name || "—"}
                    </td>
                    <td style={{ padding: "12px 16px" }}>
                      <span
                        className={`erp-badge ${b.bill_type === "BROCHURE" ? "erp-badge--primary" : "erp-badge--warning"}`}
                      >
                        {b.bill_type}
                      </span>
                    </td>
                    <td
                      style={{
                        padding: "12px 16px",
                        color: "var(--erp-text-muted)",
                      }}
                    >
                      {b.installment_number
                        ? `${b.installment_number}/${b.total_installments}`
                        : "—"}
                    </td>
                    <td
                      style={{
                        padding: "12px 16px",
                        textAlign: "right",
                        fontFamily: "monospace",
                        fontWeight: "bold",
                      }}
                    >
                      ₹{Number(b.amount).toLocaleString("en-IN")}
                    </td>
                    <td style={{ padding: "12px 16px", textAlign: "center" }}>
                      <span
                        className={`erp-badge ${b.status === "PAID" ? "erp-badge--success" : "erp-badge--danger"}`}
                      >
                        {b.status}
                      </span>
                    </td>
                    <td
                      style={{
                        padding: "12px 16px",
                        color: "var(--erp-text-muted)",
                      }}
                    >
                      {b.academic_year}
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
