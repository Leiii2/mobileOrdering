const express = require("express");
const sql = require("mssql");
const { poolPromise } = require("../server");
const jwt = require("jsonwebtoken");

const router = express.Router();

// Middleware to verify JWT token
const verifyToken = (req, res, next) => {
  const token = req.headers.authorization?.split(" ")[1];
  if (!token) {
    return res.status(401).json({ status: "error", message: "No token provided" });
  }

  try {
    const secret = process.env.JWT_SECRET;
    if (!secret) {
      throw new Error("JWT_SECRET not defined");
    }
    const decoded = jwt.verify(token, secret);
    req.user = decoded;
    next();
  } catch (error) {
    return res.status(401).json({ status: "error", message: "Invalid token", error: error.message });
  }
};

// Fetch Products by Category for CustomerOrderScreen (Public - GET)
router.get("/public/customer/stocks/:categoryCode", async (req, res) => {
  const { categoryCode } = req.params;

  try {
    const pool = await poolPromise;
    if (!pool) {
      return res.status(500).json({ status: "error", message: "Database connection failed" });
    }

    const query = `
      WITH CombinedStock AS (
        SELECT ProductCode, Remaining, StockOnHandTraceUpCode, Qty
        FROM TStockOnHandTraceUp
        UNION ALL
        SELECT ProductCode, Remaining, StockOnHandTraceUpCode, Qty
        FROM TStockOnHandTraceUp2
      ),
      LatestStock AS (
        SELECT 
          cs.ProductCode, 
          cs.Remaining AS LatestRemaining,
          cs.Qty AS LatestQty,
          cs.StockOnHandTraceUpCode
        FROM CombinedStock cs
        INNER JOIN (
          SELECT ProductCode, MAX(StockOnHandTraceUpCode) AS LatestCode
          FROM CombinedStock
          GROUP BY ProductCode
        ) latest ON cs.ProductCode = latest.ProductCode AND cs.StockOnHandTraceUpCode = latest.LatestCode
      )
      SELECT 
        p.ProductCode, 
        p.Product, 
        COALESCE(ls.LatestRemaining, 0) AS Stock,
        COALESCE(ls.LatestQty, 0) AS Qty
      FROM aTProduct p
      LEFT JOIN LatestStock ls ON p.ProductCode = ls.ProductCode
      WHERE p.CategoryCode = @categoryCode AND p.Active = 1`;

    const result = await pool
      .request()
      .input("categoryCode", sql.Int, parseInt(categoryCode))
      .query(query);

    const products = result.recordset.map((product) => ({
      ...product,
      Stock: product.Stock != null ? parseInt(product.Stock) : 0,
      Qty: product.Qty != null ? parseInt(product.Qty) : 0,
    }));

    res.json({ status: "success", products });
  } catch (error) {
    console.error("Customer Stocks Fetch Error:", error.message, error.stack);
    res.status(500).json({ status: "error", message: "Database error", error: error.message });
  }
});

// Fetch Products by Category (Public - GET)
router.get("/public/stocks/:categoryCode", async (req, res) => {
  const { categoryCode } = req.params;

  try {
    const pool = await poolPromise;
    if (!pool) {
      return res.status(500).json({ status: "error", message: "Database connection failed" });
    }

    const query = `
      WITH CombinedStock AS (
        SELECT ProductCode, Remaining, StockOnHandTraceUpCode, Qty
        FROM TStockOnHandTraceUp
        UNION ALL
        SELECT ProductCode, Remaining, StockOnHandTraceUpCode, Qty
        FROM TStockOnHandTraceUp2
      ),
      LatestStock AS (
        SELECT 
          cs.ProductCode, 
          cs.Remaining AS LatestRemaining,
          cs.Qty AS LatestQty,
          cs.StockOnHandTraceUpCode
        FROM CombinedStock cs
        INNER JOIN (
          SELECT ProductCode, MAX(StockOnHandTraceUpCode) AS LatestCode
          FROM CombinedStock
          GROUP BY ProductCode
        ) latest ON cs.ProductCode = latest.ProductCode AND cs.StockOnHandTraceUpCode = latest.LatestCode
      )
      SELECT 
        p.ProductCode, 
        p.Product, 
        COALESCE(ls.LatestRemaining, 0) AS Stock,
        COALESCE(ls.LatestQty, 0) AS Qty
      FROM aTProduct p
      LEFT JOIN LatestStock ls ON p.ProductCode = ls.ProductCode
      WHERE p.CategoryCode = @categoryCode AND p.Active = 1`;

    const result = await pool
      .request()
      .input("categoryCode", sql.Int, parseInt(categoryCode))
      .query(query);

    const products = result.recordset.map((product) => ({
      ...product,
      Stock: product.Stock != null ? parseInt(product.Stock) : 0,
      Qty: product.Qty != null ? parseInt(product.Qty) : 0,
    }));

    res.json({ status: "success", products });
  } catch (error) {
    console.error("Public Stocks Fetch Error:", error.message, error.stack);
    res.status(500).json({ status: "error", message: "Database error", error: error.message });
  }
});

// Fetch Price for a Specific Product (Public - GET)
router.get("/public/stocks/:categoryCode/:productCode/price", async (req, res) => {
  const { productCode } = req.params;

  try {
    const pool = await poolPromise;
    if (!pool) {
      return res.status(500).json({ status: "error", message: "Database connection failed" });
    }

    const query = `
      SELECT TOP 1 Price
      FROM dbo.TPosDetails
      WHERE ProductCode = @ProductCode AND Done = 1
      ORDER BY PosDetailsCode DESC;
    `;
    const result = await pool
      .request()
      .input("ProductCode", sql.Int, parseInt(productCode))
      .query(query);

    res.json({ status: "success", price: result.recordset[0]?.Price  });
  } catch (error) {
    console.error("Public Price Fetch Error:", error.message, error.stack);
    res.status(500).json({ status: "error", message: "Failed to fetch price", error: error.message });
  }
});

// Fetch Products by Category (Authenticated - GET)
router.get("/:categoryCode", verifyToken, async (req, res) => {
  const { categoryCode } = req.params;

  try {
    const pool = await poolPromise;
    if (!pool) {
      return res.status(500).json({ status: "error", message: "Database connection failed" });
    }

    const query = `
      WITH CombinedStock AS (
        SELECT ProductCode, Remaining, StockOnHandTraceUpCode, Qty
        FROM TStockOnHandTraceUp
        UNION ALL
        SELECT ProductCode, Remaining, StockOnHandTraceUpCode, Qty
        FROM TStockOnHandTraceUp2
      ),
      LatestStock AS (
        SELECT 
          cs.ProductCode, 
          cs.Remaining AS LatestRemaining,
          cs.Qty AS LatestQty,
          cs.StockOnHandTraceUpCode
        FROM CombinedStock cs
        INNER JOIN (
          SELECT ProductCode, MAX(StockOnHandTraceUpCode) AS LatestCode
          FROM CombinedStock
          GROUP BY ProductCode
        ) latest ON cs.ProductCode = latest.ProductCode AND cs.StockOnHandTraceUpCode = latest.LatestCode
      )
      SELECT 
        p.ProductCode, 
        p.Product, 
        COALESCE(ls.LatestRemaining, 0) AS Stock,
        COALESCE(ls.LatestQty, 0) AS Qty
      FROM aTProduct p
      LEFT JOIN LatestStock ls ON p.ProductCode = ls.ProductCode
      WHERE p.CategoryCode = @categoryCode AND p.Active = 1`;

    const result = await pool
      .request()
      .input("categoryCode", sql.Int, parseInt(categoryCode))
      .query(query);

    const products = result.recordset.map((product) => ({
      ...product,
      Stock: product.Stock != null ? parseInt(product.Stock) : 0,
      Qty: product.Qty != null ? parseInt(product.Qty) : 0,
    }));

    res.json({ status: "success", products });
  } catch (error) {
    console.error("Stocks Fetch Error:", error.message, error.stack);
    res.status(500).json({ status: "error", message: "Database error", error: error.message });
  }
});

// Fetch Price for a Specific Product (Authenticated - GET)
// Fetch Price for a Specific Product (Authenticated - GET)
router.get("/:categoryCode/:productCode/price", verifyToken, async (req, res) => {
  const { productCode } = req.params;

  try {
    const pool = await poolPromise;
    if (!pool) {
      return res.status(500).json({ status: "error", message: "Database connection failed" });
    }

    const query = `
      SELECT SellingPrice AS price
      FROM aTProduct
      WHERE ProductCode = @ProductCode AND Active = 1;
    `;
    const result = await pool
      .request()
      .input("ProductCode", sql.Int, parseInt(productCode))
      .query(query);

    if (!result.recordset[0]) {
      return res.status(404).json({ status: "error", message: "Product not found" });
    }

    res.json({ status: "success", price: result.recordset[0].price || 0 });
  } catch (error) {
    console.error("Price Fetch Error:", error.message, error.stack);
    res.status(500).json({ status: "error", message: "Failed to fetch price", error: error.message });
  }
});

module.exports = router;