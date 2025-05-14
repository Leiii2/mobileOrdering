require("dotenv").config();
const express = require("express");
const sql = require("mssql");
const cors = require("cors");
const jwt = require("jsonwebtoken");
const path = require("path"); // Add path for handling file paths

const app = express();
const PORT = process.env.PORT || 2025;
const SERVER_HOST = process.env.SERVER_HOST || "0.0.0.0";

// Middleware
app.use(express.json());
app.use(cors({
  origin: process.env.NODE_ENV === "production" ? "https://your-app-domain.com" : "*",
  methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
  allowedHeaders: ["Content-Type", "Authorization"],
}));

// Serve the uploads folder statically
app.use("/uploads", express.static(path.join(__dirname, "uploads")));

// Database Configuration
const dbConfig = {
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  server: process.env.DB_SERVER,
  database: process.env.DB_NAME,
  options: {
    encrypt: false,
    trustServerCertificate: true,
  },
  pool: {
    max: 10,
    min: 0,
    idleTimeoutMillis: 30000,
  },
};

// Database Connection with Reconnection Logic
let poolPromise = null;

const connectToDatabase = async () => {
  try {
    if (!poolPromise) {
      poolPromise = new sql.ConnectionPool(dbConfig).connect();
      const pool = await poolPromise;
      console.log("✅ Connected to database successfully"); // Add logging
      pool.on("error", (err) => {
        console.error("❌ Database pool error:", err);
        poolPromise = null;
        reconnectToDatabase();
      });
      return pool;
    }
    return poolPromise;
  } catch (err) {
    console.error("❌ Database connection failed:", err);
    poolPromise = null;
    setTimeout(reconnectToDatabase, 5000);
    throw err;
  }
};

const reconnectToDatabase = async () => {
  try {
    poolPromise = new sql.ConnectionPool(dbConfig).connect();
    await poolPromise;
    console.log("✅ Reconnected to database successfully");
  } catch (err) {
    console.error("❌ Database reconnection failed:", err);
    setTimeout(reconnectToDatabase, 5000);
  }
};

// Initialize Database Connection
connectToDatabase();

// Export Database Pool
module.exports = { poolPromise };

// Routes
app.use("/users", require("./routes/users"));
app.use("/login", require("./routes/login"));
app.use("/stocks", require("./routes/stocks"));
app.use("/categories", require("./routes/categories"));
app.use("/traceup", require("./routes/traceUp"));
app.use("/report", require("./routes/report"));
app.use("/pos", require("./routes/pos"));
app.use("/reports", require("./routes/dailyReport"));

// Default Route
app.get("/", (req, res) => {
  res.send("API is live and running...");
});

// Global Error Handler
app.use((err, req, res, next) => {
  console.error("❌ Server error:", err); // Add logging for errors
  res.status(500).json({
    status: "error",
    message: "Something went wrong on the server",
    error: err.message,
  });
});

// Start Server
app.listen(PORT, SERVER_HOST, () => {
  console.log(`✅ Server is running on http://${SERVER_HOST}:${PORT}`);
});