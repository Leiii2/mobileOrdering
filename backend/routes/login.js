const express = require("express");
const sql = require("mssql");
const { poolPromise } = require("../server");
const jwt = require("jsonwebtoken");

const router = express.Router();

// User Login Route
router.post("/", async (req, res) => {
  try {
    const { userCode, accessCode } = req.body;

    // Input validation
    if (!userCode || !accessCode) {
      console.warn("Validation failed: Missing userCode or accessCode", { userCode, accessCode });
      return res.status(400).json({
        status: "error",
        message: "UserCode and AccessCode are required",
      });
    }

    // Validate userCode is a number
    const parsedUserCode = parseInt(userCode);
    if (isNaN(parsedUserCode)) {
      console.warn("Validation failed: Invalid userCode format", { userCode });
      return res.status(400).json({
        status: "error",
        message: "UserCode must be a valid number",
      });
    }

    const pool = await poolPromise;
    if (!pool) {
      console.error("Database connection failed: Pool is undefined");
      return res.status(500).json({
        status: "error",
        message: "Database connection failed",
      });
    }

    const result = await pool
      .request()
      .input("userCode", sql.Int, parsedUserCode)
      .input("accessCode", sql.NVarChar(50), accessCode)
      .query(
        "SELECT UserCode, Name, AccessCode, Admin, Active, POS, Supervisor, Kitchen, Releasing, Waiter FROM TUsers WHERE UserCode = @userCode AND AccessCode = @accessCode AND Active = 1"
      );

    if (result.recordset.length === 0) {
      console.warn("Authentication failed: Invalid credentials or inactive user", { userCode: parsedUserCode });
      return res.status(401).json({
        status: "error",
        message: "Invalid UserCode or AccessCode",
      });
    }

    const user = result.recordset[0];
    const token = jwt.sign(
      {
        userCode: user.UserCode,
        name: user.Name,
        admin: user.Admin || false,
        pos: user.POS || false,
      },
      process.env.JWT_SECRET,
      { expiresIn: "10h" }
    );

    console.log("Login successful", { userCode: user.UserCode, name: user.Name });
    res.json({
      status: "success",
      message: "Login successful",
      token,
      user: {
        userCode: user.UserCode,
        name: user.Name,
        accessCode: user.AccessCode,
        admin: user.Admin || false,
        active: user.Active || false,
        pos: user.POS || false,
        supervisor: user.Supervisor || false,
        kitchen: user.Kitchen || false,
        releasing: user.Releasing || false,
        waiter: user.Waiter || false,
      },
    });
  } catch (err) {
    console.error("Database error:", err.message, { stack: err.stack });
    res.status(500).json({
      status: "error",
      message: "Internal server error",
      error: err.message,
    });
  }
});

module.exports = router;