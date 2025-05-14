const express = require("express");
const sql = require("mssql");
const { poolPromise } = require("../server");

const router = express.Router();

// Fetch Trace-Up History by ProductCode (Sorted from Latest to Oldest, limited to top 100)
router.get("/:ProductCode", async (req, res) => {
  const { ProductCode } = req.params;

  // Validate ProductCode (ensure it's a valid integer)
  const parsedProductCode = parseInt(ProductCode);
  if (isNaN(parsedProductCode)) {
    return res.status(400).json({
      status: "error",
      message: "Invalid product code provided (must be a number)",
    });
  }

  try {
    const pool = await poolPromise;
    if (!pool) {
      return res.status(500).json({
        status: "error",
        message: "Database connection failed",
      });
    }

    const query = `
      SELECT TOP 100 t.StockOnHandTraceUpCode, t.ProductCode, t.TransactionType, t.TDate, t.Qty, t.Remaining, u.name AS UserName
      FROM TStockOnHandTraceUp t
      LEFT JOIN TUsers u ON t.UserCode = u.UserCode
      WHERE t.ProductCode = @ProductCode

      UNION ALL

      SELECT TOP 100 t2.StockOnHandTraceUpCode, t2.ProductCode, t2.TransactionType, t2.TDate, t2.Qty, t2.Remaining, u.name AS UserName
      FROM TStockOnHandTraceUp2 t2
      LEFT JOIN TUsers u ON t2.UserCode = u.UserCode
      WHERE t2.ProductCode = @ProductCode

      ORDER BY StockOnHandTraceUpCode DESC;
    `;

    const result = await pool
      .request()
      .input("ProductCode", sql.Int, parsedProductCode)
      .query(query);

    if (!result.recordset.length) {
      return res.json({ status: "success", history: [] });
    }

    // Process and format the data, using database's Remaining if available, or calculate if needed
    const formattedHistory = result.recordset.map((item) => ({
      StockOnHandTraceUpCode: parseInt(item.StockOnHandTraceUpCode) || 0,
      ProductCode: item.ProductCode || 0,
      TransactionType: item.TransactionType || "UNKNOWN",
      TDate: item.TDate ? new Date(item.TDate).toISOString() : new Date().toISOString(),
      Qty: parseFloat(item.Qty) || 0,
      Remaining: parseFloat(item.Remaining) || 0,
      UserName: item.UserName || "Unknown",
    }));

    // Calculate Remaining (StockOnHand) dynamically to match frontend logic
    let stockOnHand = 0;
    const calculatedHistory = formattedHistory.map((item) => {
      if (item.TransactionType === "STOCK IN") {
        stockOnHand += item.Qty;
      } else if (item.TransactionType === "SALES") {
        stockOnHand -= item.Qty;
      }
      return { ...item, StockOnHand: stockOnHand };
    });

    res.json({ status: "success", history: calculatedHistory });
  } catch (error) {
    let errorMessage = "Database error";
    if (error.message.includes("Invalid")) errorMessage = "Invalid database query or data format";
    if (error.message.includes("Connection")) errorMessage = "Database connection failed";
    res.status(500).json({ status: "error", message: errorMessage, error: error.message });
  }
});

module.exports = router;