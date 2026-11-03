import React, { useEffect, useMemo, useState } from "react";
import { Link, useNavigate } from "react-router-dom";

const API_URL = "http://localhost:5000";

/* =========================================================
   HELPERS
   ========================================================= */

function getUser() {
  try {
    return JSON.parse(localStorage.getItem("user") || "{}");
  } catch {
    return {};
  }
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

function getExpiryDate(product) {
  return (
    product.expiryDate ||
    product.expiry ||
    product.expirationDate ||
    product.expiry_date ||
    null
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

function getProductName(product) {
  return (
    product.name ||
    product.productName ||
    product.title ||
    "Unnamed product"
  );
}
function normalizeSearchValue(value) {
  if (value === null || value === undefined) {
    return "";
  }

  if (typeof value === "object") {
    return Object.values(value)
      .map(normalizeSearchValue)
      .join(" ");
  }

  return String(value).toLowerCase().trim();
}

function getProductPrice(product) {
  return Number(
    product.price ??
      product.unitPrice ??
      product.sellingPrice ??
      0
  );
}


/* =========================================================
   DASHBOARD
   ========================================================= */

export default function Dashboard() {
  const navigate = useNavigate();

  const user = getUser();

  const [products, setProducts] = useState([]);
  useEffect(() => {
  console.log("PRODUCT DATA:", products);
}, [products]);
  const [sales, setSales] = useState([]);
  const [alerts, setAlerts] = useState([]);

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const [search, setSearch] = useState("");

  const [saleProduct, setSaleProduct] = useState("");
  const [saleQuantity, setSaleQuantity] = useState(1);

  const [saleMessage, setSaleMessage] = useState("");
  const [saleError, setSaleError] = useState("");
  const [saleLoading, setSaleLoading] = useState(false);

  const [inventoryFilter, setInventoryFilter] =
    useState("all");


  /* =========================================================
     LOAD DATA
     ========================================================= */

  async function loadDashboard() {
    setLoading(true);
    setError("");

    try {
      const token = localStorage.getItem("token");

      const headers = {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      };

      const [
        productsResponse,
        salesResponse,
        alertsResponse,
      ] = await Promise.all([
        fetch(`${API_URL}/api/products`, {
          headers,
        }),

        fetch(`${API_URL}/api/sales`, {
          headers,
        }),

        fetch(`${API_URL}/api/alerts`, {
          headers,
        }),
      ]);

      const productsData =
        await productsResponse.json().catch(() => ({}));

      const salesData =
        await salesResponse.json().catch(() => ({}));

      const alertsData =
        await alertsResponse.json().catch(() => ({}));


      if (!productsResponse.ok) {
        throw new Error(
          productsData.message ||
            "Unable to load products."
        );
      }


      setProducts(
        Array.isArray(productsData)
          ? productsData
          : productsData.products || []
      );


      setSales(
        Array.isArray(salesData)
          ? salesData
          : salesData.sales || []
      );


      setAlerts(
        Array.isArray(alertsData)
          ? alertsData
          : alertsData.alerts || []
      );

    } catch (err) {
      console.error(err);

      setError(
        err.message ||
          "Unable to load dashboard data."
      );

    } finally {
      setLoading(false);
    }
  }


  useEffect(() => {
    loadDashboard();
  }, []);


  /* =========================================================
     LOGOUT
     ========================================================= */

  function handleLogout() {
    localStorage.removeItem("token");
    localStorage.removeItem("user");

    navigate("/login", {
      replace: true,
    });
  }


  /* =========================================================
     INVENTORY SUMMARY
     ========================================================= */

  const totalProducts = products.length;


  const totalStockUnits =
    products.reduce(
      (total, product) =>
        total + getQuantity(product),
      0
    );


  const lowStockProducts =
    products.filter((product) => {
      const quantity =
        getQuantity(product);

      const safety =
        getSafetyStock(product);

      return (
        quantity > 0 &&
        quantity <= safety
      );
    });


  const outOfStockProducts =
    products.filter(
      (product) =>
        getQuantity(product) <= 0
    );


  const totalStockValue =
    products.reduce(
      (total, product) => {
        const quantity =
          getQuantity(product);

        const price =
          getProductPrice(product);

        return (
          total +
          quantity * price
        );
      },
      0
    );


  /* =========================================================
     EXPIRY ALERTS
     ========================================================= */

  const expiryAlerts = useMemo(() => {
    const warningDate = new Date();

    warningDate.setDate(
      warningDate.getDate() + 30
    );

    return products
      .filter((product) => {
        const expiry =
          getExpiryDate(product);

        if (!expiry) {
          return false;
        }

        const date =
          new Date(expiry);

        return (
          !Number.isNaN(
            date.getTime()
          ) &&
          date <= warningDate
        );
      })
      .sort(
        (a, b) =>
          new Date(
            getExpiryDate(a)
          ) -
          new Date(
            getExpiryDate(b)
          )
      );
  }, [products]);


  /* =========================================================
     SEARCH
     ========================================================= */

 /* =========================================================
   SEARCH AND FILTER
   ========================================================= */

const filteredProducts = useMemo(() => {
  const searchText = normalizeSearchValue(search);

  return products.filter((product) => {
    // Search across product fields
    const searchableText = [
      getProductName(product),
      product.sku,
      product.category,
      product.productCode,
      product.barcode,
      product.description,
    ]
      .map(normalizeSearchValue)
      .join(" ");

    // Search matching
    const matchesSearch =
      !searchText ||
      searchableText.includes(searchText);

    // Stock filtering
    const currentQuantity = getQuantity(product);
    const minimumStock = getSafetyStock(product);

    let matchesFilter = true;

    if (inventoryFilter === "low") {
      matchesFilter =
        currentQuantity > 0 &&
        currentQuantity <= minimumStock;
    }

    if (inventoryFilter === "out") {
      matchesFilter = currentQuantity <= 0;
    }

    return matchesSearch && matchesFilter;
  });
}, [products, search, inventoryFilter]);

  /* =========================================================
     DAY-WISE SALES
     ========================================================= */

  const dayWiseSales =
    useMemo(() => {
      const grouped = {};

      sales.forEach((sale) => {
        const date =
          sale.createdAt ||
          sale.date ||
          sale.saleDate;

        if (!date) return;

        const key =
          new Date(date)
            .toLocaleDateString(
              "en-IN",
              {
                day: "2-digit",
                month: "short",
                year: "numeric",
              }
            );


        if (!grouped[key]) {
          grouped[key] = {
            date: key,
            sales: 0,
            units: 0,
            amount: 0,
          };
        }


        grouped[key].sales += 1;


        grouped[key].units +=
          Number(
            sale.quantity || 0
          );


        grouped[key].amount +=
          Number(
            sale.totalAmount ||
              sale.total ||
              sale.amount ||
              0
          );
      });


      return Object.values(grouped)
        .slice(-7)
        .reverse();

    }, [sales]);


  /* =========================================================
     RECORD SALE
     ========================================================= */

  async function handleSale(event) {
    event.preventDefault();

    setSaleMessage("");
    setSaleError("");


    if (!saleProduct) {
      setSaleError(
        "Please select a product."
      );
      return;
    }


    if (
      !saleQuantity ||
      Number(saleQuantity) <= 0
    ) {
      setSaleError(
        "Please enter a valid quantity."
      );
      return;
    }


    const selectedProduct =
      products.find(
        (product) =>
          String(
            product._id ||
              product.id
          ) ===
          String(saleProduct)
      );


    if (!selectedProduct) {
      setSaleError(
        "Selected product was not found."
      );
      return;
    }


    if (
      Number(saleQuantity) >
      getQuantity(selectedProduct)
    ) {
      setSaleError(
        "Sale quantity cannot be greater than available stock."
      );
      return;
    }


    setSaleLoading(true);


    try {
      const token =
        localStorage.getItem("token");


      const response =
        await fetch(
          `${API_URL}/api/sales`,
          {
            method: "POST",

            headers: {
              Authorization:
                `Bearer ${token}`,

              "Content-Type":
                "application/json",
            },

            body: JSON.stringify({
              productId:
                selectedProduct._id ||
                selectedProduct.id,

              quantity:
                Number(
                  saleQuantity
                ),
            }),
          }
        );


      const data =
        await response
          .json()
          .catch(() => ({}));


      if (!response.ok) {
        throw new Error(
          data.message ||
            "Unable to record sale."
        );
      }


      setSaleMessage(
        "Sale recorded successfully."
      );

      setSaleProduct("");
      setSaleQuantity(1);

      await loadDashboard();

    } catch (err) {
      setSaleError(
        err.message ||
          "Unable to record sale."
      );

    } finally {
      setSaleLoading(false);
    }
  }


  /* =========================================================
     LOADING
     ========================================================= */

  if (loading) {
    return (
      <div className="app-shell">

        <header className="topbar">

          <div className="brand">

            <div className="brand-mark small">
              S
            </div>

            <span>
              StockWise
            </span>

          </div>


          <div className="top-user">

            <span>
              {user.name ||
                user.email ||
                "User"}
            </span>

            <button
              className="secondary"
              onClick={handleLogout}
            >
              Logout
            </button>

          </div>

        </header>


        <main className="dashboard-main">
          <div className="dashboard-loading">
            Loading your dashboard...
          </div>
        </main>

      </div>
    );
  }


  /* =========================================================
     MAIN UI
     ========================================================= */

  return (
    <div className="app-shell">


      {/* =====================================================
          TOP BAR
          ===================================================== */}

      <header className="topbar">

        <div className="brand">

          <div className="brand-mark small">
            S
          </div>

          <span>
            StockWise
          </span>

        </div>


        <div className="top-user">

          <span>
            {user.name ||
              user.email ||
              "User"}
          </span>


          <button
            className="secondary"
            onClick={handleLogout}
          >
            Logout
          </button>

        </div>

      </header>


      {/* =====================================================
          MAIN CONTENT
          SIDEBAR REMOVED
          ===================================================== */}

      <main className="dashboard-main dashboard-full">


        {/* ===================================================
            WELCOME
            =================================================== */}

        <div className="welcome">

          <div>

            <div className="eyebrow">
              OWNER DASHBOARD
            </div>


            <h1>
              Hello,{" "}
              {user.name ||
                "there"}{" "}
              👋
            </h1>


            <p>
              Here is what is happening
              with your inventory today.
            </p>

          </div>


          <div className="alert-pill">

            {expiryAlerts.length +
              lowStockProducts.length +
              outOfStockProducts.length}{" "}
            active alerts

          </div>

        </div>


        {error && (
          <div className="error dashboard-error">
            {error}
          </div>
        )}


        {/* ===================================================
            INVENTORY OVERVIEW
            =================================================== */}

        <section className="phase-one">


          <div className="phase-top">

            <div>

              <div className="eyebrow">
                PHASE 1 · INVENTORY OVERVIEW
              </div>


              <h2>
                Inventory at a glance
              </h2>


              <p className="muted">
                Search products, monitor
                stock, and record sales.
              </p>

            </div>


            <div className="quick-actions">

              <Link
                to="/products"
                className="primary button-link"
              >
                + Add Product
              </Link>


              <a
                href="#record-sale"
                className="secondary button-link"
              >
                Record sale
              </a>

            </div>

          </div>


          {/* =================================================
              SEARCH
              ================================================= */}

          <div className="search-row">
  <input
    type="search"
    placeholder="Search by product name, SKU, category, or barcode..."
    value={search}
    onChange={(event) => setSearch(event.target.value)}
    autoComplete="off"
  />

  {search.trim() && (
    <button
      type="button"
      className="secondary"
      onClick={() => setSearch("")}
    >
      Clear
    </button>
  )}
</div>


          {/* =================================================
              STAT CARDS
              ================================================= */}

          <div className="stats-grid">


            <div
              className={`stat-card ${
                inventoryFilter === "all"
                  ? "selected"
                  : ""
              }`}
              onClick={() =>
                setInventoryFilter("all")
              }
            >

              <span>
                Total products
              </span>

              <strong>
                {totalProducts}
              </strong>

              <small>
                View all inventory
              </small>

            </div>


            <div className="stat-card">

              <span>
                Total stock units
              </span>

              <strong>
                {totalStockUnits}
              </strong>

              <small>
                Units currently available
              </small>

            </div>


            <div
              className={`stat-card ${
                inventoryFilter === "low"
                  ? "selected"
                  : ""
              }`}
              onClick={() =>
                setInventoryFilter("low")
              }
            >

              <span>
                Low stock
              </span>

              <strong>
                {lowStockProducts.length}
              </strong>

              <small>
                At or below safety stock
              </small>

            </div>


            <div
              className={`stat-card ${
                inventoryFilter === "out"
                  ? "selected"
                  : ""
              }`}
              onClick={() =>
                setInventoryFilter("out")
              }
            >

              <span>
                Out of stock
              </span>

              <strong>
                {outOfStockProducts.length}
              </strong>

              <small>
                Unavailable products
              </small>

            </div>


            <div className="stat-card value-card">

              <span>
                Total stock value
              </span>

              <strong>
                ₹
                {totalStockValue.toLocaleString(
                  "en-IN"
                )}
              </strong>

              <small>
                Quantity × unit price
              </small>

            </div>

          </div>


          {/* =================================================
              RECORD SALE
              ================================================= */}

          <section
            id="record-sale"
            className="sale-panel"
          >

            <div>

              <h3>
                Record a sale
              </h3>

              <p className="muted">
                Choose a product and
                quantity to reduce
                inventory.
              </p>

            </div>


            <form
              onSubmit={handleSale}
              className="sale-form"
            >

              <select
                value={saleProduct}
                onChange={(event) =>
                  setSaleProduct(
                    event.target.value
                  )
                }
              >

                <option value="">
                  Select product
                </option>


                {products
                  .filter(
                    (product) =>
                      getQuantity(
                        product
                      ) > 0
                  )
                  .map((product) => (

                    <option
                      key={
                        product._id ||
                        product.id
                      }
                      value={
                        product._id ||
                        product.id
                      }
                    >
                      {getProductName(
                        product
                      )}{" "}
                      (
                      {getQuantity(
                        product
                      )}
                      )
                    </option>

                  ))}

              </select>


              <input
                type="number"
                min="1"
                value={saleQuantity}
                onChange={(event) =>
                  setSaleQuantity(
                    event.target.value
                  )
                }
              />


              <button
                type="submit"
                className="primary"
                disabled={saleLoading}
              >
                {saleLoading
                  ? "Saving..."
                  : "Save sale"}
              </button>

            </form>


            {saleMessage && (
              <div className="success">
                {saleMessage}
              </div>
            )}


            {saleError && (
              <div className="error">
                {saleError}
              </div>
            )}

          </section>


          {/* =================================================
              INVENTORY
              ================================================= */}

          <section className="inventory-panel">

            <div className="panel-heading">

              <div>

                <h3>
                  Inventory
                </h3>

                <p className="muted">
                  Current inventory details
                  and stock status.
                </p>

              </div>


              <span>
                {filteredProducts.length}{" "}
                products
              </span>

            </div>


            <div className="filter-row">

              <button
                className={
                  inventoryFilter === "all"
                    ? "filter-active"
                    : ""
                }
                onClick={() =>
                  setInventoryFilter("all")
                }
              >
                All
              </button>


              <button
                className={
                  inventoryFilter === "low"
                    ? "filter-active"
                    : ""
                }
                onClick={() =>
                  setInventoryFilter("low")
                }
              >
                Low stock
              </button>


              <button
                className={
                  inventoryFilter === "out"
                    ? "filter-active"
                    : ""
                }
                onClick={() =>
                  setInventoryFilter("out")
                }
              >
                Out of stock
              </button>

            </div>


            <div className="table-scroll">

              <table>

                <thead>

                  <tr>

                    <th>
                      Product
                    </th>

                    <th>
                      SKU
                    </th>

                    <th>
                      Category
                    </th>

                    <th>
                      Stock
                    </th>

                    <th>
                      Expiry
                    </th>

                    <th>
                      Status
                    </th>

                  </tr>

                </thead>


                <tbody>

                  {filteredProducts.map(
                    (product) => {

                      const quantity =
                        getQuantity(
                          product
                        );

                      const safety =
                        getSafetyStock(
                          product
                        );


                      let status =
                        "Good";


                      if (
                        quantity <= 0
                      ) {
                        status =
                          "Out";
                      } else if (
                        quantity <=
                        safety
                      ) {
                        status =
                          "Low";
                      }


                      return (

                        <tr
                          key={
                            product._id ||
                            product.id
                          }
                        >

                          <td>
                            <strong>
                              {getProductName(
                                product
                              )}
                            </strong>
                          </td>


                          <td>
                            {product.sku ||
                              "-"}
                          </td>


                          <td>
                            {product.category ||
                              "-"}
                          </td>


                          <td>
                            {quantity}
                          </td>


                          <td>
                            {formatDate(
                              getExpiryDate(
                                product
                              )
                            )}
                          </td>


                          <td>

                            <span
                              className={`status ${
                                status ===
                                "Out"
                                  ? "status-out"
                                  : status ===
                                    "Low"
                                  ? "status-low"
                                  : "status-good"
                              }`}
                            >
                              {status}
                            </span>

                          </td>

                        </tr>

                      );

                    }
                  )}


                  {!filteredProducts.length && (

                    <tr>

                      <td
                        colSpan="6"
                        className="empty"
                      >
                        No products found.
                      </td>

                    </tr>

                  )}

                </tbody>

              </table>

            </div>

          </section>


          {/* =================================================
              DAY-WISE ACTIVITY
              ================================================= */}

          <section className="dashboard-section-card">

            <div className="panel-heading">

              <div>

                <h3>
                  Day-wise Activity
                </h3>

                <p className="muted">
                  Recent sales activity
                  by day.
                </p>

              </div>


              <Link
                to="/history"
                className="panel-link"
              >
                View history →
              </Link>

            </div>


            {dayWiseSales.length ? (

              <div className="daywise-grid">

                {dayWiseSales.map(
                  (day) => (

                    <div
                      className="daywise-card"
                      key={day.date}
                    >

                      <span>
                        {day.date}
                      </span>


                      <strong>
                        {day.units}
                      </strong>


                      <small>
                        units sold
                      </small>


                      <small>
                        {day.sales} sale
                        {day.sales !== 1
                          ? "s"
                          : ""}
                      </small>

                    </div>

                  )
                )}

              </div>

            ) : (

              <div className="empty">
                No sales activity yet.
              </div>

            )}

          </section>


          {/* =================================================
              EXPIRY ALERTS
              ================================================= */}

          <section className="dashboard-section-card expiry-section">

            <div className="panel-heading">

              <div>

                <h3>
                  Expiry Alerts
                </h3>

                <p className="muted">
                  Products expiring
                  within the next
                  30 days.
                </p>

              </div>


              <span>
                {expiryAlerts.length}{" "}
                alerts
              </span>

            </div>


            {expiryAlerts.length ? (

              <div className="expiry-list">

                {expiryAlerts
                  .slice(0, 8)
                  .map(
                    (product) => {

                      const expiry =
                        new Date(
                          getExpiryDate(
                            product
                          )
                        );


                      const daysLeft =
                        Math.ceil(
                          (
                            expiry -
                            new Date()
                          ) /
                            (1000 *
                              60 *
                              60 *
                              24)
                        );


                      return (

                        <div
                          className="expiry-row"
                          key={
                            product._id ||
                            product.id
                          }
                        >

                          <div className="expiry-icon">
                            ⚠
                          </div>


                          <div>

                            <strong>
                              {getProductName(
                                product
                              )}
                            </strong>


                            <p>
                              Expires on{" "}
                              {formatDate(
                                expiry
                              )}
                            </p>

                          </div>


                          <span
                            className={
                              daysLeft <= 0
                                ? "expiry-danger"
                                : "expiry-warning"
                            }
                          >
                            {daysLeft <= 0
                              ? "Expired"
                              : `${daysLeft} days`}
                          </span>

                        </div>

                      );

                    }
                  )}

              </div>

            ) : (

              <div className="empty">
                No expiry alerts.
              </div>

            )}

          </section>


          {/* =================================================
              INVENTORY ALERTS
              ================================================= */}

          <section className="alerts-panel">

            <div className="panel-heading">

              <div>

                <h3>
                  Inventory Alerts
                </h3>

                <p className="muted">
                  Important stock-related
                  notifications.
                </p>

              </div>


              <span>
                {alerts.length} alerts
              </span>

            </div>


            {alerts.length ? (

              alerts
                .slice(0, 10)
                .map(
                  (alert, index) => (

                    <div
                      className="alert-row"
                      key={
                        alert._id ||
                        alert.id ||
                        index
                      }
                    >

                      <div
                        className={`alert-dot ${
                          alert.type ===
                          "danger"
                            ? "danger"
                            : ""
                        }`}
                      />


                      <div>

                        <strong>
                          {alert.title ||
                            alert.message ||
                            "Inventory alert"}
                        </strong>


                        <p>
                          {alert.description ||
                            alert.message ||
                            ""}
                        </p>

                      </div>


                      <small>
                        {alert.createdAt
                          ? formatDate(
                              alert.createdAt
                            )
                          : ""}
                      </small>

                    </div>

                  )
                )

            ) : (

              <div className="empty">
                No active alerts.
              </div>

            )}

          </section>


        </section>

      </main>

    </div>
  );
}