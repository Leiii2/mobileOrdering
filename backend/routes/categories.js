const express = require("express");
const sql = require("mssql");
const { poolPromise } = require("../server");
const jwt = require("jsonwebtoken");

const router = express.Router();

// Middleware to verify admin role
const verifyAdmin = (req, res, next) => {
  const token = req.headers.authorization?.split(" ")[1]; // Bearer token
  if (!token) {
    return res.status(401).json({ status: "error", message: "No token provided" });
  }

  try {
    const secret = process.env.JWT_SECRET;
    if (!secret) {
      throw new Error("JWT_SECRET not defined in environment variables");
    }
    const decoded = jwt.verify(token, secret);
    if (!decoded.admin) {
      return res.status(403).json({ status: "error", message: "Admin access required" });
    }
    req.user = decoded;
    next();
  } catch (error) {
    return res.status(401).json({ status: "error", message: "Invalid token", error: error.message });
  }
};

// Fetch All Categories (GET)
router.get("/", async (req, res) => {
  try {
    const pool = await poolPromise;
    if (!pool) {
      return res.status(500).json({
        status: "error",
        message: "Database connection failed",
      });
    }

    const query = `
      SELECT CategoryCode, Category 
      FROM aTCategory 
      WHERE Active = 1`;

    const result = await pool.request().query(query);

    res.json({
      status: "success",
      categories: result.recordset,
    });
  } catch (error) {
    res.status(500).json({
      status: "error",
      message: "Database error",
      error: error.message,
    });
  }
});

// Add a Category (POST) - Admin only
router.post("/", verifyAdmin, async (req, res) => {
  const { Category } = req.body;
  if (!Category || typeof Category !== "string" || !Category.trim()) {
    return res.status(400).json({
      status: "error",
      message: "Category name is required and must be a non-empty string",
    });
  }
  if (Category.length > 500) {
    return res.status(400).json({
      status: "error",
      message: "Category name exceeds 500 characters",
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

    const trimmedCategory = Category.trim();
    const normalizedCategory = trimmedCategory.charAt(0).toUpperCase() + trimmedCategory.slice(1).toLowerCase();

    const checkQuery = `
      SELECT COUNT(*) as count 
      FROM aTCategory 
      WHERE UPPER(LTRIM(RTRIM(Category))) = UPPER(@Category) AND Active = 1`;

    const checkResult = await pool
      .request()
      .input("Category", sql.NVarChar, normalizedCategory)
      .query(checkQuery);

    if (checkResult.recordset[0].count > 0) {
      return res.status(400).json({
        status: "error",
        message: `Category '${normalizedCategory}' already exists`,
      });
    }

    const transaction = new sql.Transaction(pool);
    try {
      await transaction.begin();
      const maxCodeQuery = `
        SELECT ISNULL(MAX(CategoryCode), 0) as maxCode 
        FROM aTCategory`;
      const maxCodeResult = await new sql.Request(transaction).query(maxCodeQuery);
      const newCategoryCode = maxCodeResult.recordset[0].maxCode + 1;

      const insertQuery = `
        INSERT INTO aTCategory (CategoryCode, Category, Active) 
        OUTPUT inserted.CategoryCode, inserted.Category 
        VALUES (@CategoryCode, @Category, 1)`;
      const result = await new sql.Request(transaction)
        .input("CategoryCode", sql.Int, newCategoryCode)
        .input("Category", sql.NVarChar, normalizedCategory)
        .query(insertQuery);

      await transaction.commit();
      res.json({
        status: "success",
        category: result.recordset[0],
      });
    } catch (error) {
      await transaction.rollback();
      throw error;
    }
  } catch (error) {
    res.status(500).json({
      status: "error",
      message: "Failed to add category",
      error: error.message,
    });
  }
});

// Update a Category (PUT) - Admin only
router.put("/:categoryCode", verifyAdmin, async (req, res) => {
  const { categoryCode } = req.params;
  const { Category } = req.body;
  if (!Category || typeof Category !== "string" || !Category.trim()) {
    return res.status(400).json({
      status: "error",
      message: "Category name is required and must be a non-empty string",
    });
  }
  if (Category.length > 500) {
    return res.status(400).json({
      status: "error",
      message: "Category name exceeds 500 characters",
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

    const trimmedCategory = Category.trim();
    const normalizedCategory = trimmedCategory.charAt(0).toUpperCase() + trimmedCategory.slice(1).toLowerCase();

    const checkQuery = `
      SELECT COUNT(*) as count 
      FROM aTCategory 
      WHERE UPPER(LTRIM(RTRIM(Category))) = UPPER(@Category) AND Active = 1 AND CategoryCode != @CategoryCode`;

    const checkResult = await pool
      .request()
      .input("Category", sql.NVarChar, normalizedCategory)
      .input("CategoryCode", sql.Int, parseInt(categoryCode))
      .query(checkQuery);

    if (checkResult.recordset[0].count > 0) {
      return res.status(400).json({
        status: "error",
        message: `Category '${normalizedCategory}' already exists`,
      });
    }

    const updateQuery = `
      UPDATE aTCategory 
      SET Category = @Category 
      WHERE CategoryCode = @CategoryCode AND Active = 1`;

    const result = await pool
      .request()
      .input("Category", sql.NVarChar, normalizedCategory)
      .input("CategoryCode", sql.Int, parseInt(categoryCode))
      .query(updateQuery);

    if (result.rowsAffected[0] === 0) {
      return res.status(404).json({
        status: "error",
        message: "Category not found or inactive",
      });
    }

    res.json({
      status: "success",
      message: "Category updated",
    });
  } catch (error) {
    res.status(500).json({
      status: "error",
      message: "Failed to update category",
      error: error.message,
    });
  }
});

// Delete a Category (DELETE) - Admin only
router.delete("/:categoryCode", verifyAdmin, async (req, res) => {
  const { categoryCode } = req.params;

  try {
    const pool = await poolPromise;
    if (!pool) {
      return res.status(500).json({
        status: "error",
        message: "Database connection failed",
      });
    }

    const checkQuery = `
      SELECT COUNT(*) as count 
      FROM aTProduct 
      WHERE CategoryCode = @CategoryCode AND Active = 1`;
    const checkResult = await pool
      .request()
      .input("CategoryCode", sql.Int, parseInt(categoryCode))
      .query(checkQuery);

    if (checkResult.recordset[0].count > 0) {
      return res.status(400).json({
        status: "error",
        message: "Cannot delete category with active products",
      });
    }

    const query = `
      UPDATE aTCategory 
      SET Active = 0 
      WHERE CategoryCode = @CategoryCode`;

    const result = await pool
      .request()
      .input("CategoryCode", sql.Int, parseInt(categoryCode))
      .query(query);

    if (result.rowsAffected[0] === 0) {
      return res.status(404).json({
        status: "error",
        message: "Category not found",
      });
    }

    res.json({
      status: "success",
      message: "Category deleted",
    });
  } catch (error) {
    res.status(500).json({
      status: "error",
      message: "Failed to delete category",
      error: error.message,
    });
  }
});

module.exports = router;