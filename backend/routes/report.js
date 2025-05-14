// routes/report.js
const express = require("express");
const sql = require("mssql");
const { poolPromise } = require("../server");

const router = express.Router();

// ✅ Fetch BIR Report Data
router.get("/birreport", async (req, res) => {
  try {
    const pool = await poolPromise;
    if (!pool) {
      return res.status(500).json({
        status: "error",
        message: "Database connection failed",
      });
    }

    const result = await pool
      .request()
      .query(
        "SELECT BirCode, TDate, RegisteredSales, NetSales FROM TBIRReport ORDER BY BirCode DESC"
      );

    if (result.recordset.length === 0) {
      return res.json({
        status: "success",
        message: "No BIR Report records found",
        records: [],
      });
    }

    // Map the records to ensure proper formatting and fallback for NULL values
    const records = result.recordset.map((record) => ({
      BirCode: record.BirCode || 0,
      TDate: record.TDate || null,
      RegisteredSales: record.RegisteredSales || 0.0,
      NetSales: record.NetSales || 0.0,
    }));

    res.json({
      status: "success",
      message: "BIR Report fetched successfully",
      records: records,
    });
  } catch (err) {
    res.status(500).json({
      status: "error",
      message: "Database error",
      error: err.message,
    });
  }
});

module.exports = router;
