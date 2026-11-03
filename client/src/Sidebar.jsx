
import React from "react";
import { NavLink, useNavigate } from "react-router-dom";

export default function Sidebar({ counts = {} }) {
  const navigate = useNavigate();

  function handleLogout() {
    localStorage.removeItem("token");
    localStorage.removeItem("user");
    navigate("/login", { replace: true });
  }

  const sections = [
    {
      title: "MAIN",
      items: [
        { label: "Summary", path: "/dashboard", icon: "▦" },
        {
          label: "Inventory Details",
          path: "/products",
          icon: "▤",
          count: counts.products,
        },
        {
          label: "Inventory Summary",
          path: "/inventory-summary",
          icon: "▥",
        },
      ],
    },
    {
      title: "MANAGEMENT",
      items: [
        { label: "Day-wise Activity", path: "/daywise", icon: "▣" },
        {
          label: "Sales",
          path: "/sales",
          icon: "₹",
          count: counts.sales,
        },
        { label: "Stock History", path: "/history", icon: "↻" },
      ],
    },
    {
      title: "ALERTS",
      items: [
        {
          label: "Expiry Alerts",
          path: "/alerts/expiry",
          icon: "⚠",
          count: counts.expiry,
        },
        {
          label: "Low Stock",
          path: "/alerts/low-stock",
          icon: "!",
          count: counts.lowStock,
        },
        {
          label: "Out of Stock",
          path: "/alerts/out-of-stock",
          icon: "×",
          count: counts.outOfStock,
        },
      ],
    },
  ];

  return (
    <aside className="dashboard-sidebar">
      <div className="sidebar-brand">
        <div className="brand-mark small">S</div>
        <span>StockWise</span>
      </div>

      <nav className="sidebar-navigation">
        {sections.map(section => (
          <div className="sidebar-section" key={section.title}>
            <div className="sidebar-title">{section.title}</div>

            {section.items.map(item => (
              <NavLink
                key={item.path}
                to={item.path}
                end
                className={({ isActive }) =>
                  `sidebar-item ${isActive ? "active" : ""}`
                }
              >
                <span className="sidebar-icon">{item.icon}</span>
                <span className="sidebar-label">{item.label}</span>

                {item.count !== undefined && item.count > 0 && (
                  <span className="sidebar-badge">{item.count}</span>
                )}
              </NavLink>
            ))}
          </div>
        ))}
      </nav>

      <div className="sidebar-bottom">
        <button className="sidebar-logout" onClick={handleLogout}>
          ⇥ &nbsp; Logout
        </button>
      </div>
    </aside>
  );
}
