
require("dotenv").config({
  path: require("path").join(__dirname, ".env"),
});

const express = require("express");
const cors = require("cors");
const mongoose = require("mongoose");

const app = express();

// =====================================
// SERVER CONFIGURATION
// =====================================

const PORT = Number(process.env.PORT) || 5000;
const HOST = "0.0.0.0";

// =====================================
// ENVIRONMENT VALIDATION
// =====================================

if (!process.env.MONGO_URI) {
  console.error("ERROR: MONGO_URI is missing.");
  process.exit(1);
}

if (!process.env.JWT_SECRET || process.env.JWT_SECRET.length < 32) {
  console.error("ERROR: JWT_SECRET must contain at least 32 characters.");
  process.exit(1);
}

// =====================================
// CORS CONFIGURATION
// =====================================

// Add your deployed Vercel URL to FRONTEND_URL
// Multiple URLs can be separated by commas.

const allowedOrigins = [
  "http://localhost:5173",
  "http://127.0.0.1:5173",
  "http://localhost:5174",
  "http://127.0.0.1:5174",
  ...(process.env.FRONTEND_URL || "")
    .split(",")
    .map((url) => url.trim())
    .filter(Boolean),
];

const corsOptions = {
  origin: (origin, callback) => {
    // Allow requests without an Origin header (e.g. server-to-server)
    if (!origin || allowedOrigins.includes(origin)) {
      return callback(null, true);
    }

    console.log("Blocked by CORS:", origin);
    return callback(new Error("Not allowed by CORS"));
  },

  credentials: true,

  methods: [
    "GET",
    "POST",
    "PUT",
    "PATCH",
    "DELETE",
    "OPTIONS",
  ],

  allowedHeaders: [
    "Content-Type",
    "Authorization",
  ],
};

app.use(cors(corsOptions));

// =====================================
// MIDDLEWARE
// =====================================

app.use(express.json({ limit: "10mb" }));
app.use(express.urlencoded({ extended: true }));

// =====================================
// HEALTH CHECK
// =====================================

app.get("/", (req, res) => {
  res.status(200).json({
    success: true,
    message: "StockWise backend is running!",
    database:
      mongoose.connection.readyState === 1
        ? "connected"
        : "disconnected",
    status: "running",
  });
});

// =====================================
// API ROUTES
// =====================================

app.use("/api/auth", require("./routes/auth"));
app.use("/api/products", require("./routes/products"));
app.use("/api/sales", require("./routes/sales"));
app.use("/api/alerts", require("./routes/alerts"));
app.use("/api/stock-history", require("./routes/stockHistory"));

// =====================================
// 404 HANDLER
// =====================================

app.use((req, res) => {
  res.status(404).json({
    success: false,
    message: "API endpoint not found",
    path: req.originalUrl,
  });
});

// =====================================
// GLOBAL ERROR HANDLER
// =====================================

app.use((err, req, res, next) => {
  console.error("Server error:", err.message);

  if (res.headersSent) {
    return next(err);
  }

  res.status(err.status || 500).json({
    success: false,
    message: err.message || "Internal server error",
  });
});

// =====================================
// START SERVER
// =====================================

async function startServer() {
  let server;

  try {
    console.log("Connecting to MongoDB...");

    await mongoose.connect(process.env.MONGO_URI, {
      serverSelectionTimeoutMS: 15000,
    });

    console.log("MongoDB connected successfully!");

    server = app.listen(PORT, HOST, () => {
      console.log("");
      console.log("======================================");
      console.log("          STOCKWISE BACKEND");
      console.log("======================================");
      console.log(`Port: ${PORT}`);
      console.log(`Host: ${HOST}`);
      console.log("Database: Connected");
      console.log("Status: Running");
      console.log("======================================");
      console.log("");
    });

    server.on("error", (err) => {
      console.error("Backend server error:", err.message);

      if (err.code === "EADDRINUSE") {
        console.error(`Port ${PORT} is already in use.`);
      }

      process.exit(1);
    });

    // =====================================
    // SAFE SERVER SHUTDOWN
    // =====================================

    let shuttingDown = false;

    async function shutdown(signal) {
      if (shuttingDown) return;

      shuttingDown = true;

      console.log(`\n${signal} received.`);
      console.log("Closing StockWise backend...");

      try {
        await new Promise((resolve, reject) => {
          server.close((err) => {
            if (err) reject(err);
            else resolve();
          });

          server.closeIdleConnections?.();
        });

        await mongoose.disconnect();

        console.log("MongoDB disconnected.");
        console.log("Backend stopped safely.");

        process.exit(0);
      } catch (err) {
        console.error("Shutdown error:", err.message);
        process.exit(1);
      }
    }

    process.once("SIGINT", () => shutdown("SIGINT"));
    process.once("SIGTERM", () => shutdown("SIGTERM"));

  } catch (error) {
    console.error("Backend startup failed:", error.message);

    await mongoose.disconnect().catch(() => {});

    process.exit(1);
  }
}

startServer();
