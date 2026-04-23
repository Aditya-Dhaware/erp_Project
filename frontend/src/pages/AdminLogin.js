import React, { useState } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { useNavigate } from "react-router-dom";
import { AlertCircle, LogIn } from "lucide-react";

export default function AdminLogin() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const { login } = useAuth();
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      await login(email, password);
      navigate("/admin");
    } catch (err) {
      const detail = err.response?.data?.detail;
      setError(
        typeof detail === "string"
          ? detail
          : "Login failed. Please check your credentials.",
      );
    }
    setLoading(false);
  };

  return (
    <div
      style={{
        minHeight: "100vh",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        backgroundColor: "#0f2942",
        fontFamily: "sans-serif",
      }}
      data-testid="admin-login-page"
    >
      <div
        style={{
          flex: 1,
          width: "100%",
          maxWidth: "600px",
          display: "flex",
          flexDirection: "column",
          justifyContent: "center",
          alignItems: "center",
          padding: "1rem",
        }}
      >
        {/* PVG Branding Container */}
        <div
          style={{ textAlign: "center", marginBottom: "2rem", width: "100%" }}
        >
          <img
            src="/images/pvgcoet-logo.jpg"
            alt="PVG Logo Banner"
            style={{ width: "100%", objectFit: "contain" }}
          />
          <h1
            style={{
              color: "white",
              marginTop: "2rem",
              marginBottom: "0.25rem",
              fontSize: "1.75rem",
              fontWeight: "bold",
              letterSpacing: "-0.5px",
            }}
          >
            PVG's College of Engineering
          </h1>
          <p style={{ color: "#d1d5db", fontSize: "1.05rem" }}>
            Fees & Billing
          </p>
        </div>

        {/* Sign In Card */}
        <div
          style={{
            backgroundColor: "#f3f4f6",
            borderRadius: "12px",
            padding: "2rem 2.5rem",
            width: "100%",
            boxShadow: "0 20px 25px -5px rgba(0, 0, 0, 0.4)",
          }}
        >
          <h2
            style={{
              display: "flex",
              alignItems: "center",
              color: "#1e3a8a",
              fontSize: "1.25rem",
              fontWeight: "600",
              marginBottom: "2rem",
            }}
          >
            <LogIn
              size={22}
              style={{ marginRight: "8px", transform: "scaleX(-1)" }}
            />
            Sign In to Your Portal
          </h2>

          <form onSubmit={handleSubmit}>
            {error && (
              <div
                className="erp-alert erp-alert--danger"
                style={{ marginBottom: "1.5rem", padding: "0.75rem" }}
                data-testid="login-error"
              >
                <AlertCircle size={16} style={{ marginRight: "6px" }} /> {error}
              </div>
            )}

            <div style={{ marginBottom: "1.5rem" }}>
              <label
                htmlFor="email"
                style={{
                  display: "block",
                  color: "#1e3a8a",
                  fontSize: "0.85rem",
                  fontWeight: "600",
                  marginBottom: "0.5rem",
                }}
              >
                Email Address <span style={{ color: "#dc2626" }}>*</span>
              </label>
              <input
                id="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="Enter your email address"
                required
                data-testid="login-email-input"
                style={{
                  width: "100%",
                  padding: "10px 14px",
                  borderRadius: "6px",
                  border: "1px solid #d1d5db",
                  backgroundColor: "#ffffff",
                  fontSize: "0.95rem",
                  outline: "none",
                }}
                onFocus={(e) => (e.target.style.borderColor = "#1e3a8a")}
                onBlur={(e) => (e.target.style.borderColor = "#d1d5db")}
              />
            </div>

            <div style={{ marginBottom: "2rem" }}>
              <label
                htmlFor="password"
                style={{
                  display: "block",
                  color: "#1e3a8a",
                  fontSize: "0.85rem",
                  fontWeight: "600",
                  marginBottom: "0.5rem",
                }}
              >
                Password <span style={{ color: "#dc2626" }}>*</span>
              </label>
              <input
                id="password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Enter your password"
                required
                data-testid="login-password-input"
                style={{
                  width: "100%",
                  padding: "10px 14px",
                  borderRadius: "6px",
                  border: "1px solid #d1d5db",
                  backgroundColor: "#ffffff",
                  fontSize: "0.95rem",
                  outline: "none",
                }}
                onFocus={(e) => (e.target.style.borderColor = "#1e3a8a")}
                onBlur={(e) => (e.target.style.borderColor = "#d1d5db")}
              />
            </div>

            <button
              type="submit"
              disabled={loading}
              data-testid="login-submit-btn"
              style={{
                width: "100%",
                display: "flex",
                justifyContent: "center",
                alignItems: "center",
                backgroundColor: "#1e3a8a",
                color: "white",
                padding: "12px",
                borderRadius: "6px",
                fontSize: "1rem",
                fontWeight: "600",
                border: "none",
                cursor: loading ? "not-allowed" : "pointer",
                opacity: loading ? 0.7 : 1,
                transition: "background-color 0.2s",
              }}
              onMouseOver={(e) =>
                !loading && (e.currentTarget.style.backgroundColor = "#172554")
              }
              onMouseOut={(e) =>
                !loading && (e.currentTarget.style.backgroundColor = "#1e3a8a")
              }
            >
              <LogIn
                size={20}
                style={{ marginRight: "8px", transform: "scaleX(-1)" }}
              />
              {loading ? "Signing in..." : "Sign In"}
            </button>
          </form>
        </div>

        {/* Footer Text */}
        <div
          style={{
            marginTop: "3rem",
            textAlign: "center",
            color: "#9ca3af",
            fontSize: "0.8rem",
          }}
        >
          PVG COET&M ERP v1.0 • Academic Year 2024-2026
        </div>
      </div>
    </div>
  );
}
