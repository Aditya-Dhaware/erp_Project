import React, { useEffect } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { Link, useLocation } from "react-router-dom";
import { LayoutDashboard, FileText, CreditCard, RefreshCw, Receipt, LogOut, Menu, ShieldCheck } from "lucide-react";

export default function AdminLayout({ children, title }) {
  const { user, logout } = useAuth();
  const location = useLocation();

  const handleLogout = async () => {
    await logout();
    window.location.href = "/";
  };

  const navItems = [
    { key: "dashboard", label: "Dashboard", path: "/admin", icon: LayoutDashboard },
    { key: "bills", label: "Bills", path: "/admin/bills", icon: FileText },
    { key: "payments", label: "Payments", path: "/admin/payments", icon: CreditCard },
    { key: "refunds", label: "Refunds", path: "/admin/refunds", icon: RefreshCw },
    { key: "receipts", label: "Receipts", path: "/admin/receipts", icon: Receipt },
  ];

  // Re-run ERP theme scripts whenever route changes to bind sidebar toggles, etc.
  useEffect(() => {
    if (window.ERP && window.ERP.Sidebar) {
      // Rebind if necessary, though erp-theme.js should do it globally
    }
  }, [location.pathname]);

  return (
    <>
      <aside className="erp-sidebar">
        <div className="erp-sidebar__brand">
          <div style={{ backgroundColor: 'white', borderRadius: '50%', padding: '4px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <ShieldCheck color="var(--erp-primary)" size={24} />
          </div>
          <div className="erp-sidebar__brand-text" style={{ marginLeft: 12 }}>
            <h2>PVG COET&M</h2>
            <span>Fees & Billing</span>
          </div>
        </div>

        <nav className="erp-sidebar__nav">
          <div className="erp-nav-label">Main Menu</div>
          {navItems.map((item) => {
            const isActive = location.pathname === item.path || (item.path !== "/admin" && location.pathname.startsWith(item.path));
            return (
              <Link 
                to={item.path} 
                key={item.key} 
                className={`erp-nav-item ${isActive ? "erp-nav-item--active" : ""}`}
              >
                <item.icon size={16} style={{ marginRight: '12px' }} />
                <span className="erp-nav-item__text">{item.label}</span>
              </Link>
            );
          })}
        </nav>

        <div className="erp-sidebar__footer">
          <div className="erp-avatar erp-avatar--md bg-blue-100 text-blue-800 font-bold">
            {user?.email?.charAt(0).toUpperCase() || "A"}
          </div>
          <div className="erp-sidebar__user-info">
            <p style={{ textOverflow: 'ellipsis', overflow: 'hidden', whiteSpace: 'nowrap' }}>{user?.email || "Admin User"}</p>
            <span>Administrator</span>
          </div>
          <button onClick={handleLogout} className="erp-sidebar__logout border-0 bg-transparent cursor-pointer" title="Logout">
            <LogOut size={16} color="var(--erp-text-muted)" />
          </button>
        </div>
      </aside>

      <header className="erp-topbar">
        <button className="erp-topbar__btn" data-erp-sidebar-toggle>
          <Menu size={20} />
        </button>
        <nav className="erp-topbar__breadcrumb" data-erp-breadcrumb></nav>
      </header>

      <main className="erp-main" data-erp-page={`Admin / ${title}`}>
        {children}
      </main>
    </>
  );
}
