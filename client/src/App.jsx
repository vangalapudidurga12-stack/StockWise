
import React, { useEffect, useState } from "react";
import { Navigate, Route, Routes } from "react-router-dom";

import Login from "./Login.jsx";
import Register from "./Register.jsx";
import Dashboard from "./Dashboard.jsx";
import ProductsPage from "./ProductsPage.jsx";
import HistoryPage from "./HistoryPage.jsx";
import ImportPage from "./ImportPage.jsx";
import ManagementPage from "./ManagementPage.jsx";
import SidebarLayout from "./SidebarLayout.jsx";

// Protect pages without automatically adding the sidebar
function Protected({ children }) {
  const token = localStorage.getItem("token");

  if (!token) {
    return <Navigate to="/login" replace />;
  }

  return children;
}

export default function App() {
  const [appReady, setAppReady] = useState(false);

  // Always require login when the application starts or refreshes
  useEffect(() => {
    localStorage.removeItem("token");
    localStorage.removeItem("user");
    setAppReady(true);
  }, []);

  if (!appReady) {
    return null;
  }

  return (
    <Routes>

      {/* Default page */}
      <Route
        path="/"
        element={<Navigate to="/login" replace />}
      />

      {/* Authentication */}
      <Route path="/login" element={<Login />} />
      <Route path="/register" element={<Register />} />

      {/* Import - NO SIDEBAR */}
      <Route
        path="/import"
        element={
          <Protected>
            <ImportPage />
          </Protected>
        }
      />

      {/* Dashboard - SIDEBAR ONLY HERE */}
      <Route
        path="/dashboard"
        element={
          <Protected>
            <SidebarLayout>
              <Dashboard />
            </SidebarLayout>
          </Protected>
        }
      />

      {/* Products */}
      <Route
        path="/products"
        element={
          <Protected>
            <ProductsPage />
          </Protected>
        }
      />

      {/* Management */}
      <Route
        path="/inventory-summary"
        element={
          <Protected>
            <ManagementPage type="inventory-summary" />
          </Protected>
        }
      />

      <Route
        path="/daywise"
        element={
          <Protected>
            <ManagementPage type="daywise" />
          </Protected>
        }
      />

      <Route
        path="/sales"
        element={
          <Protected>
            <ManagementPage type="sales" />
          </Protected>
        }
      />

      {/* History */}
      <Route
        path="/history"
        element={
          <Protected>
            <HistoryPage />
          </Protected>
        }
      />

      {/* Alerts */}
      <Route
        path="/alerts/expiry"
        element={
          <Protected>
            <ManagementPage type="expiry" />
          </Protected>
        }
      />

      <Route
        path="/alerts/low-stock"
        element={
          <Protected>
            <ManagementPage type="low-stock" />
          </Protected>
        }
      />

      <Route
        path="/alerts/out-of-stock"
        element={
          <Protected>
            <ManagementPage type="out-of-stock" />
          </Protected>
        }
      />

      {/* Unknown routes */}
      <Route
        path="*"
        element={<Navigate to="/login" replace />}
      />

    </Routes>
  );
}
