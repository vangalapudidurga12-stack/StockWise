
import React, { useEffect, useState } from "react";
import { useLocation } from "react-router-dom";
import Sidebar from "./Sidebar.jsx";
import "./SidebarLayout.css";

const API_URL = "http://localhost:5000";

function getProducts(data) {
  return Array.isArray(data) ? data : data?.products || [];
}

function getSales(data) {
  return Array.isArray(data) ? data : data?.sales || [];
}

function quantity(product) {
  return Number(
    product.quantity ??
    product.stock ??
    product.stockQuantity ??
    0
  );
}

function safetyStock(product) {
  return Number(
    product.safetyStock ??
    product.reorderLevel ??
    product.minimumStock ??
    0
  );
}

function expiryDate(product) {
  return (
    product.expiryDate ||
    product.expiry ||
    product.expirationDate ||
    product.expiry_date ||
    null
  );
}

function isExpiring(product) {
  const value = expiryDate(product);
  if (!value) return false;

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return false;

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const limit = new Date(today);
  limit.setDate(limit.getDate() + 30);

  return date <= limit;
}

export default function SidebarLayout({ children }) {
  const location = useLocation();

  const [counts, setCounts] = useState({
    products: 0,
    sales: 0,
    expiry: 0,
    lowStock: 0,
    outOfStock: 0,
  });

  useEffect(() => {
    let cancelled = false;

    async function loadCounts() {
      try {
        const token = localStorage.getItem("token");
        if (!token) return;

        const headers = {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        };

        const [productResponse, salesResponse] =
          await Promise.all([
            fetch(`${API_URL}/api/products`, { headers }),
            fetch(`${API_URL}/api/sales`, { headers }),
          ]);

        const productData = await productResponse.json();

        let salesData = {};
        try {
          salesData = await salesResponse.json();
        } catch {
          salesData = {};
        }

        if (!productResponse.ok) {
          throw new Error(
            productData.message || "Unable to load products"
          );
        }

        const products = getProducts(productData);
        const sales = salesResponse.ok
          ? getSales(salesData)
          : [];

        if (cancelled) return;

        setCounts({
          products: products.length,
          sales: sales.length,
          expiry: products.filter(isExpiring).length,
          lowStock: products.filter(
            p => quantity(p) > 0 &&
              quantity(p) <= safetyStock(p)
          ).length,
          outOfStock: products.filter(
            p => quantity(p) <= 0
          ).length,
        });

      } catch (error) {
        console.error("Sidebar count error:", error);
      }
    }

    loadCounts();

    return () => {
      cancelled = true;
    };
  }, [location.pathname]);

  return (
    <div className="sidebar-layout">
      <Sidebar counts={counts} />

      <main className="sidebar-layout-content">
        {children}
      </main>
    </div>
  );
}
