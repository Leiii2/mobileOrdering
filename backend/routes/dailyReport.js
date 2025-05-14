const express = require("express");
const sql = require("mssql");
const { poolPromise } = require("../server");
const jwt = require("jsonwebtoken");

const router = express.Router();

// Middleware to verify token
const verifyToken = (req, res, next) => {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    return res.status(401).json({ status: "error", message: "No valid token provided" });
  }
  const token = authHeader.split(" ")[1];
  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    req.user = decoded;
    next();
  } catch (error) {
    console.error("Token Verification Error:", { message: error.message });
    return res.status(401).json({ status: "error", message: "Invalid token", error: error.message });
  }
};

// Daily report endpoint
router.post("/daily", verifyToken, async (req, res) => {
  const { dateFilterType, singleDate, startDate, endDate } = req.body;

  // Input validation
  if (!dateFilterType || !["single", "range", "all"].includes(dateFilterType)) {
    return res.status(400).json({ status: "error", message: "Invalid date filter type" });
  }
  if (dateFilterType === "single" && !singleDate) {
    return res.status(400).json({ status: "error", message: "Single date is required" });
  }
  if (dateFilterType === "range" && (!startDate || !endDate)) {
    return res.status(400).json({ status: "error", message: "Start date and end date are required for range filter" });
  }

  try {
    const pool = await poolPromise;

    // Parse and validate dates
    let parsedSingleDate, parsedStartDate, parsedEndDate;
    if (dateFilterType === "single") {
      parsedSingleDate = new Date(singleDate);
      if (isNaN(parsedSingleDate)) {
        throw new Error("Invalid singleDate format. Expected YYYY-MM-DD.");
      }
      parsedSingleDate.setUTCHours(0, 0, 0, 0); // Set to start of day
    } else if (dateFilterType === "range") {
      parsedStartDate = new Date(startDate);
      parsedEndDate = new Date(endDate);
      if (isNaN(parsedStartDate) || isNaN(parsedEndDate)) {
        throw new Error("Invalid startDate or endDate format. Expected YYYY-MM-DD.");
      }
      parsedStartDate.setUTCHours(0, 0, 0, 0); // Set to start of day
      parsedEndDate.setUTCHours(23, 59, 59, 999); // Set to end of day
    }

    // Log parsed dates for debugging
    console.log("Parsed Dates:", {
      dateFilterType,
      singleDate: parsedSingleDate?.toISOString(),
      startDate: parsedStartDate?.toISOString(),
      endDate: parsedEndDate?.toISOString(),
    });

    let query = `
      SELECT 
        CONVERT(VARCHAR(8), TTime, 108) AS time,
        CASE WHEN Charge = 1 THEN 1 ELSE 0 END AS card,
        InvoiceNo AS invoiceNo,
        COALESCE(TableNo, '') AS tableNo,
        COALESCE(Discount, 0) AS discount,
        COALESCE(DiscNo, '') AS discNo,
        CASE WHEN Senior = 1 THEN 1 ELSE 0 END AS senior,
        COALESCE(TotalDue, 0) AS totalDue,
        COALESCE(TUsers.Name, 'Unknown') AS cashier,
        TDate AS fullDate
      FROM dbo.TPos
      LEFT JOIN dbo.TUsers ON TUsers.UserCode = TPos.UserCode
    `;

    // Apply date filtering if specified
    if (dateFilterType === "single") {
      query += ` WHERE CAST(TDate AS DATE) = @SingleDate`;
    } else if (dateFilterType === "range") {
      query += ` WHERE CAST(TDate AS DATE) BETWEEN @StartDate AND @EndDate`;
    }

    query += ` ORDER BY TDate, TTime`;

    const request = new sql.Request(pool);
    if (dateFilterType === "single") {
      request.input("SingleDate", sql.Date, parsedSingleDate);
    } else if (dateFilterType === "range") {
      request.input("StartDate", sql.Date, parsedStartDate);
      request.input("EndDate", sql.Date, parsedEndDate);
    }

    const result = await request.query(query);

    // Log the number of records fetched and some sample data
    console.log(`Fetched ${result.recordset.length} records`);
    if (result.recordset.length > 0) {
      console.log("Sample data:", result.recordset.slice(0, 2));
    } else {
      console.log("No records found for the given criteria.");
    }

    res.json({
      status: "success",
      reportData: result.recordset,
    });
  } catch (error) {
    console.error("Daily Report Error:", error);
    res.status(500).json({ status: "error", message: error.message || "Failed to fetch daily report" });
  }
});

// Endpoint to fetch the minimum year from TDate
router.get("/min-year", verifyToken, async (req, res) => {
  try {
    const pool = await poolPromise;
    const query = `
      SELECT MIN(YEAR(TDate)) AS minYear
      FROM dbo.TPos
      WHERE TDate IS NOT NULL
    `;
    const result = await pool.request().query(query);

    const minYear = result.recordset[0].minYear || new Date().getFullYear();
    res.json({
      status: "success",
      minYear,
    });
  } catch (error) {
    console.error("Min Year Fetch Error:", error);
    res.status(500).json({ status: "error", message: error.message || "Failed to fetch minimum year" });
  }
});

module.exports = router;