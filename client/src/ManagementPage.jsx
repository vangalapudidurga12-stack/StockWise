
import React, {
  useCallback,
  useEffect,
  useMemo,
  useState,
} from "react";

import { Link } from "react-router-dom";
import { API } from "./api";

const API_URL = API;

/* =========================================================
   HELPER FUNCTIONS
========================================================= */

function getProductName(product) {
  return (
    product.name ||
    product.productName ||
    product.title ||
    "Unnamed product"
  );
}

function getQuantity(product) {
  return Number(
    product.quantity ??
    product.stock ??
    product.stockQuantity ??
    0
  );
}

function getSafetyStock(product) {
  return Number(
    product.safetyStock ??
    product.reorderLevel ??
    product.minimumStock ??
    0
  );
}

function getProductPrice(product) {
  return Number(
    product.price ??
    product.unitPrice ??
    product.sellingPrice ??
    0
  );
}

function getExpiryDate(product) {
  return (
    product.expiryDate ||
    product.expiry ||
    product.expirationDate ||
    product.expiry_date ||
    null
  );
}

function formatDate(value) {
  if (!value) return "-";

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return "-";
  }

  return date.toLocaleDateString("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

function getSalesArray(data) {
  if (Array.isArray(data)) return data;
  return data?.sales || [];
}

function getProductsArray(data) {
  if (Array.isArray(data)) return data;
  return data?.products || [];
}

function getSaleAmount(sale) {
  return Number(
    sale.totalAmount ??
    sale.total ??
    sale.amount ??
    0
  );
}

function getSaleDate(sale) {
  return (
    sale.createdAt ||
    sale.date ||
    sale.saleDate ||
    null
  );
}

function getSaleProductName(sale) {
  return (
    sale.productName ||
    sale.product?.productName ||
    sale.product?.name ||
    sale.name ||
    "Product"
  );
}

function getDaysLeft(value) {
  const expiry = new Date(value);

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  expiry.setHours(0, 0, 0, 0);

  return Math.ceil(
    (expiry - today) / (1000 * 60 * 60 * 24)
  );
}

/* =========================================================
   MANAGEMENT PAGE
========================================================= */

export default function ManagementPage({
  type = "sales",
}) {
  const [products, setProducts] = useState([]);
  const [sales, setSales] = useState([]);

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [search, setSearch] = useState("");

  /* =======================================================
     LOAD BACKEND DATA
  ======================================================= */

  const loadData = useCallback(async () => {
    setLoading(true);
    setError("");

    try {
      const token = localStorage.getItem("token");

      if (!token) {
        throw new Error("Please log in again.");
      }

      const headers = {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      };

      const [productsResponse, salesResponse] =
        await Promise.all([
          fetch(`${API_URL}/api/products`, { headers }),
          fetch(`${API_URL}/api/sales`, { headers }),
        ]);

      const productsData =
        await productsResponse.json().catch(() => ({}));

      const salesData =
        await salesResponse.json().catch(() => ({}));

      if (!productsResponse.ok) {
        throw new Error(
          productsData.message ||
          "Unable to load inventory."
        );
      }

      if (!salesResponse.ok) {
        throw new Error(
          salesData.message ||
          "Unable to load sales records."
        );
      }

      setProducts(getProductsArray(productsData));
      setSales(getSalesArray(salesData));

    } catch (err) {
      console.error("Management page error:", err);

      setError(
        err.message || "Unable to load management data."
      );

    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData, type]);

  /* =======================================================
     INVENTORY CALCULATIONS
  ======================================================= */

  const totalProducts = products.length;

  const totalStockUnits = useMemo(() => {
    return products.reduce(
      (total, product) =>
        total + getQuantity(product),
      0
    );
  }, [products]);

  const totalStockValue = useMemo(() => {
    return products.reduce(
      (total, product) =>
        total +
        getQuantity(product) * getProductPrice(product),
      0
    );
  }, [products]);

  const lowStockProducts = useMemo(() => {
    return products.filter((product) => {
      const quantity = getQuantity(product);
      const safety = getSafetyStock(product);

      return quantity > 0 && quantity <= safety;
    });
  }, [products]);

  const outOfStockProducts = useMemo(() => {
    return products.filter(
      product => getQuantity(product) <= 0
    );
  }, [products]);

  /* =======================================================
     EXPIRY PRODUCTS
     Includes expired products and products expiring
     within the next 30 days.
  ======================================================= */

  const expiryProducts = useMemo(() => {
    return products
      .filter((product) => {
        const expiry = getExpiryDate(product);

        if (!expiry) return false;

        const date = new Date(expiry);

        if (Number.isNaN(date.getTime())) {
          return false;
        }

        return getDaysLeft(expiry) <= 30;
      })
      .sort((a, b) => {
        return (
          new Date(getExpiryDate(a)) -
          new Date(getExpiryDate(b))
        );
      });
  }, [products]);

  /* =======================================================
     DAY-WISE SALES
  ======================================================= */

  const dayWiseData = useMemo(() => {
    const grouped = {};

    sales.forEach((sale) => {
      const dateValue = getSaleDate(sale);

      if (!dateValue) return;

      const date = new Date(dateValue);

      if (Number.isNaN(date.getTime())) return;

      const key = date.toLocaleDateString("en-IN", {
        day: "2-digit",
        month: "short",
        year: "numeric",
      });

      if (!grouped[key]) {
        grouped[key] = {
          date: key,
          timestamp: new Date(
            date.getFullYear(),
            date.getMonth(),
            date.getDate()
          ).getTime(),
          sales: 0,
          units: 0,
          amount: 0,
        };
      }

      grouped[key].sales += 1;
      grouped[key].units += Number(sale.quantity || 0);
      grouped[key].amount += getSaleAmount(sale);
    });

    return Object.values(grouped)
      .sort((a, b) => b.timestamp - a.timestamp);
  }, [sales]);

  /* =======================================================
     SALES SUMMARY
  ======================================================= */

  const totalSalesAmount = useMemo(() => {
    return sales.reduce(
      (total, sale) => total + getSaleAmount(sale),
      0
    );
  }, [sales]);

  const totalUnitsSold = useMemo(() => {
    return sales.reduce(
      (total, sale) =>
        total + Number(sale.quantity || 0),
      0
    );
  }, [sales]);

  /* =======================================================
     SEARCH FILTER
  ======================================================= */

  const searchedProducts = useMemo(() => {
    const value = search.toLowerCase().trim();

    if (!value) return products;

    return products.filter((product) => {
      const searchableText = `
        ${getProductName(product)}
        ${product.sku || ""}
        ${product.category || ""}
      `.toLowerCase();

      return searchableText.includes(value);
    });
  }, [products, search]);

  /* =======================================================
     PAGE CONFIGURATION
  ======================================================= */

  const pageConfig = {
    "inventory-summary": {
      title: "Inventory Summary",
      subtitle: "Complete overview of your inventory performance.",
    },

    sales: {
      title: "Sales",
      subtitle: "View all recorded sales and sales activity.",
    },

    daywise: {
      title: "Day-wise Activity",
      subtitle: "View sales activity grouped by date.",
    },

    expiry: {
      title: "Expiry Alerts",
      subtitle: "Products that have expired or will expire within 30 days.",
    },

    "low-stock": {
      title: "Low Stock",
      subtitle: "Products that have reached or fallen below their safety stock.",
    },

    "out-of-stock": {
      title: "Out of Stock",
      subtitle: "Products that currently have no available stock.",
    },
  };

  const currentPage = pageConfig[type] || pageConfig.sales;

  /* =======================================================
     LOADING
  ======================================================= */

  if (loading) {
    return (
      <main className="management-page">
        <div className="management-loading">
          Loading {currentPage.title}...
        </div>
      </main>
    );
  }

  /* =======================================================
     MAIN UI
  ======================================================= */

  return (
    <main className="management-page">

      {/* PAGE HEADER */}

      <div className="management-header">
        <div>
          <div className="eyebrow">STOCKWISE MANAGEMENT</div>

          <h1>{currentPage.title}</h1>

          <p>{currentPage.subtitle}</p>
        </div>

        <button
          type="button"
          className="secondary"
          onClick={loadData}
        >
          ↻ Refresh Data
        </button>
      </div>

      {error && (
        <div className="error">
          {error}
          <button
            type="button"
            className="secondary"
            onClick={loadData}
          >
            Try again
          </button>
        </div>
      )}

      {/* ===================================================
          INVENTORY SUMMARY
      =================================================== */}

      {type === "inventory-summary" && (
        <>
          <section className="stats-grid">

            <div className="stat-card">
              <span>Total Products</span>
              <strong>{totalProducts}</strong>
              <small>Products in inventory</small>
            </div>

            <div className="stat-card">
              <span>Total Stock Units</span>
              <strong>{totalStockUnits.toLocaleString("en-IN")}</strong>
              <small>Available inventory units</small>
            </div>

            <div className="stat-card">
              <span>Low Stock</span>
              <strong>{lowStockProducts.length}</strong>
              <small>Products needing restocking</small>
            </div>

            <div className="stat-card">
              <span>Out of Stock</span>
              <strong>{outOfStockProducts.length}</strong>
              <small>Products unavailable</small>
            </div>

            <div className="stat-card">
              <span>Expiry Alerts</span>
              <strong>{expiryProducts.length}</strong>
              <small>Expired or expiring products</small>
            </div>

            <div className="stat-card">
              <span>Total Stock Value</span>
              <strong>
                ₹{totalStockValue.toLocaleString("en-IN", {
                  maximumFractionDigits: 2,
                })}
              </strong>
              <small>Quantity × unit price</small>
            </div>

          </section>

          <section className="management-card">
            <div className="management-card-heading">
              <div>
                <h2>Inventory Details</h2>
                <p>{searchedProducts.length} products</p>
              </div>

              <input
                type="search"
                placeholder="Search products..."
                value={search}
                onChange={e => setSearch(e.target.value)}
              />
            </div>

            <ProductAlertTable
              products={searchedProducts}
              showStatus
            />
          </section>
        </>
      )}

      {/* ===================================================
          SALES
      =================================================== */}

      {type === "sales" && (
        <>
          <section className="stats-grid">
            <div className="stat-card">
              <span>Total Sales</span>
              <strong>{sales.length}</strong>
              <small>Recorded transactions</small>
            </div>

            <div className="stat-card">
              <span>Units Sold</span>
              <strong>{totalUnitsSold}</strong>
              <small>Total quantity sold</small>
            </div>

            <div className="stat-card">
              <span>Total Sales Amount</span>
              <strong>
                ₹{totalSalesAmount.toLocaleString("en-IN", {
                  maximumFractionDigits: 2,
                })}
              </strong>
              <small>Recorded sales value</small>
            </div>
          </section>

          <section className="management-card">
            <div className="management-card-heading">
              <div>
                <h2>Sales Records</h2>
                <p>{sales.length} recorded sales</p>
              </div>
            </div>

            {sales.length === 0 ? (
              <div className="management-empty">
                No sales have been recorded yet.
                <p>
                  <Link to="/dashboard">
                    Go to Dashboard to record a sale.
                  </Link>
                </p>
              </div>
            ) : (
              <div className="management-table-wrapper">
                <table className="management-table">
                  <thead>
                    <tr>
                      <th>Date</th>
                      <th>Product</th>
                      <th>Quantity</th>
                      <th>Amount</th>
                    </tr>
                  </thead>

                  <tbody>
                    {[...sales]
                      .sort((a, b) => {
                        return (
                          new Date(getSaleDate(b) || 0) -
                          new Date(getSaleDate(a) || 0)
                        );
                      })
                      .map((sale, index) => (
                        <tr key={sale._id || sale.id || index}>
                          <td>{formatDate(getSaleDate(sale))}</td>

                          <td>
                            <strong>
                              {getSaleProductName(sale)}
                            </strong>
                          </td>

                          <td>{Number(sale.quantity || 0)}</td>

                          <td>
                            ₹{getSaleAmount(sale).toLocaleString("en-IN")}
                          </td>
                        </tr>
                      ))}
                  </tbody>
                </table>
              </div>
            )}
          </section>
        </>
      )}

      {/* ===================================================
          DAY-WISE ACTIVITY
      =================================================== */}

      {type === "daywise" && (
        <section className="management-card">
          <div className="management-card-heading">
            <div>
              <h2>Daily Activity</h2>
              <p>Sales grouped by date</p>
            </div>
          </div>

          {dayWiseData.length === 0 ? (
            <div className="management-empty">
              No day-wise activity available yet.
            </div>
          ) : (
            <div className="daywise-large-grid">
              {dayWiseData.map(day => (
                <div className="daywise-large-card" key={day.date}>
                  <span>{day.date}</span>
                  <strong>{day.units}</strong>
                  <small>Units sold</small>
                  <div>
                    {day.sales} sale{day.sales !== 1 ? "s" : ""}
                  </div>
                  <div>
                    ₹{day.amount.toLocaleString("en-IN")}
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>
      )}

      {/* ===================================================
          EXPIRY ALERTS
      =================================================== */}

      {type === "expiry" && (
        <section className="management-card">
          <div className="management-card-heading">
            <div>
              <h2>Expiry Alerts</h2>
              <p>
                {expiryProducts.length} products require attention
              </p>
            </div>
          </div>

          {expiryProducts.length === 0 ? (
            <div className="management-empty success-empty">
              ✓ No products are expired or expiring within the next 30 days.
            </div>
          ) : (
            <div className="alert-management-list">
              {expiryProducts.map((product, index) => {
                const expiry = getExpiryDate(product);
                const daysLeft = getDaysLeft(expiry);

                return (
                  <div
                    className="management-alert-row"
                    key={product._id || product.id || index}
                  >
                    <div className="management-alert-icon">
                      ⚠
                    </div>

                    <div className="management-alert-content">
                      <strong>{getProductName(product)}</strong>

                      <span>SKU: {product.sku || "-"}</span>

                      <span>
                        Current stock: {getQuantity(product)}
                      </span>
                    </div>

                    <div className="management-alert-date">
                      <strong>
                        {daysLeft < 0
                          ? "Expired"
                          : daysLeft === 0
                          ? "Expires today"
                          : `${daysLeft} days left`}
                      </strong>

                      <span>{formatDate(expiry)}</span>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </section>
      )}

      {/* ===================================================
          LOW STOCK
      =================================================== */}

      {type === "low-stock" && (
        <section className="management-card">
          <div className="management-card-heading">
            <div>
              <h2>Low Stock Products</h2>
              <p>
                {lowStockProducts.length} products need restocking
              </p>
            </div>
          </div>

          {lowStockProducts.length === 0 ? (
            <div className="management-empty success-empty">
              ✓ No low-stock products.
            </div>
          ) : (
            <ProductAlertTable
              products={lowStockProducts}
              type="low"
            />
          )}
        </section>
      )}

      {/* ===================================================
          OUT OF STOCK
      =================================================== */}

      {type === "out-of-stock" && (
        <section className="management-card">
          <div className="management-card-heading">
            <div>
              <h2>Out of Stock Products</h2>
              <p>
                {outOfStockProducts.length} products are unavailable
              </p>
            </div>
          </div>

          {outOfStockProducts.length === 0 ? (
            <div className="management-empty success-empty">
              ✓ All products currently have stock.
            </div>
          ) : (
            <ProductAlertTable
              products={outOfStockProducts}
              type="out"
            />
          )}
        </section>
      )}

    </main>
  );
}

/* =========================================================
   REUSABLE PRODUCT TABLE
========================================================= */

function ProductAlertTable({
  products = [],
  type,
  showStatus = false,
}) {
  if (!products.length) {
    return (
      <div className="management-empty">
        No products found.
      </div>
    );
  }

  return (
    <div className="management-table-wrapper">
      <table className="management-table">
        <thead>
          <tr>
            <th>Product</th>
            <th>SKU</th>
            <th>Category</th>
            <th>Current Stock</th>
            <th>Safety Stock</th>
            {(type || showStatus) && <th>Status</th>}
          </tr>
        </thead>

        <tbody>
          {products.map((product, index) => {
            const quantity = getQuantity(product);
            const safety = getSafetyStock(product);

            const status =
              quantity <= 0
                ? "Out of stock"
                : quantity <= safety
                ? "Low stock"
                : "Good";

            return (
              <tr key={product._id || product.id || index}>
                <td>
                  <strong>{getProductName(product)}</strong>
                </td>

                <td>{product.sku || "-"}</td>

                <td>{product.category || "-"}</td>

                <td>{quantity}</td>

                <td>{safety}</td>

                {(type || showStatus) && (
                  <td>
                    <span
                      className={`status ${
                        status === "Out of stock"
                          ? "status-out"
                          : status === "Low stock"
                          ? "status-low"
                          : "status-good"
                      }`}
                    >
                      {status}
                    </span>
                  </td>
                )}
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
