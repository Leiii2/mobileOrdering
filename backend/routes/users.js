const express = require("express");
const sql = require("mssql");
const { poolPromise } = require("../server");

const router = express.Router();

// Fetch All Users
router.get("/all", async (req, res) => {
  try {
    const pool = await poolPromise;
    if (!pool) {
      return res.status(500).json({ status: "error", message: "Database connection failed" });
    }

    const result = await pool.request().query("SELECT Name FROM TUsers");

    if (result.recordset.length > 0) {
      res.json({ status: "success", users: result.recordset });
    } else {
      res.json({ status: "success", users: [] });
    }
  } catch (err) {
    res.status(500).json({ status: "error", message: "Database error", error: err.message });
  }
});

module.exports = router;