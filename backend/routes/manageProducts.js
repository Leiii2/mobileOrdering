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

// Middleware to verify admin role
const verifyAdmin = (req, res, next) => {
  const token = req.headers.authorization?.split(" ")[1];
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

// GET all products for a category (no admin restriction for reading)
router.get("/:categoryCode", verifyToken, async (req, res) => {
  const { categoryCode } = req.params;

  try {
    const pool = await poolPromise;
    if (!pool) {
      return res.status(500).json({ status: "error", message: "Database connection failed" });
    }

    const query = `
      SELECT ProductCode, Product, CategoryCode, SellingPrice, Active
      FROM aTProduct
      WHERE CategoryCode = @CategoryCode AND Active = 1`;

    const result = await pool
      .request()
      .input("CategoryCode", sql.Int, parseInt(categoryCode))
      .query(query);

    if (!result.recordset || result.recordset.length === 0) {
      return res.status(404).json({ status: "error", message: "No products found for this category" });
    }

    res.json({ status: "success", products: result.recordset });
  } catch (error) {
    console.error("Get Products Error:", error.message, error.stack);
    res.status(500).json({ status: "error", message: "Failed to fetch products", error: error.message });
  }
});

// Add a Product (POST) - Admin only
router.post("/:categoryCode", verifyAdmin, async (req, res) => {
  const { categoryCode } = req.params;
  const { Product, SellingPrice } = req.body;

  if (!Product || typeof Product !== "string" || !Product.trim()) {
    return res.status(400).json({
      status: "error",
      message: "Product name is required and must be a non-empty string",
    });
  }
  if (Product.length > 500) {
    return res.status(400).json({
      status: "error",
      message: "Product name exceeds 500 characters",
    });
  }
  if (!SellingPrice || isNaN(parseFloat(SellingPrice)) || parseFloat(SellingPrice) <= 0) {
    return res.status(400).json({
      status: "error",
      message: "A valid selling price greater than 0 is required",
    });
  }

  try {
    const pool = await poolPromise;
    if (!pool) {
      return res.status(500).json({ status: "error", message: "Database connection failed" });
    }

    const trimmedProduct = Product.trim();
    const normalizedProduct = trimmedProduct.charAt(0).toUpperCase() + trimmedProduct.slice(1).toLowerCase();

    const checkQuery = `
      SELECT COUNT(*) as count 
      FROM aTProduct 
      WHERE UPPER(LTRIM(RTRIM(Product))) = UPPER(@Product) AND CategoryCode = @CategoryCode AND Active = 1`;

    const checkResult = await pool
      .request()
      .input("Product", sql.NVarChar, normalizedProduct)
      .input("CategoryCode", sql.Int, parseInt(categoryCode))
      .query(checkQuery);

    if (checkResult.recordset[0].count > 0) {
      return res.status(400).json({
        status: "error",
        message: `Product '${normalizedProduct}' already exists in this category`,
      });
    }

    const transaction = new sql.Transaction(pool);
    try {
      await transaction.begin();
      console.log("Transaction started for adding product");

      const insertQuery = `
        INSERT INTO aTProduct (CategoryCode, Product, SellingPrice, Active) 
        OUTPUT inserted.ProductCode, inserted.Product, inserted.SellingPrice, inserted.CategoryCode 
        VALUES (@CategoryCode, @Product, @SellingPrice, 1)`;
      const insertRequest = new sql.Request(transaction);
      insertRequest.input("CategoryCode", sql.Int, parseInt(categoryCode));
      insertRequest.input("Product", sql.NVarChar, normalizedProduct);
      insertRequest.input("SellingPrice", sql.Money, parseFloat(SellingPrice));
      const result = await insertRequest.query(insertQuery);

      if (!result.recordset || result.recordset.length === 0) {
        throw new Error("Failed to retrieve inserted product details");
      }

      await transaction.commit();
      console.log("Transaction committed successfully:", result.recordset[0]);
      res.json({ status: "success", product: result.recordset[0] });
    } catch (error) {
      await transaction.rollback();
      console.error("Transaction failed:", error.message, error.stack);
      throw error;
    }
  } catch (error) {
    console.error("Add Product Error:", error.message, error.stack);
    res.status(500).json({ status: "error", message: "Failed to add product", error: error.message });
  }
});

// Update a Product (PUT) - Admin only
router.put("/:categoryCode/:productCode", verifyAdmin, async (req, res) => {
  const { categoryCode, productCode } = req.params;
  const { Product, SellingPrice } = req.body;

  if (!Product || typeof Product !== "string" || !Product.trim()) {
    return res.status(400).json({
      status: "error",
      message: "Product name is required and must be a non-empty string",
    });
  }
  if (Product.length > 500) {
    return res.status(400).json({
      status: "error",
      message: "Product name exceeds 500 characters",
    });
  }
  if (!SellingPrice || isNaN(parseFloat(SellingPrice)) || parseFloat(SellingPrice) <= 0) {
    return res.status(400).json({
      status: "error",
      message: "A valid selling price greater than 0 is required",
    });
  }

  try {
    const pool = await poolPromise;
    if (!pool) {
      return res.status(500).json({ status: "error", message: "Database connection failed" });
    }

    const trimmedProduct = Product.trim();
    const normalizedProduct = trimmedProduct.charAt(0).toUpperCase() + trimmedProduct.slice(1).toLowerCase();

    const checkQuery = `
      SELECT COUNT(*) as count 
      FROM aTProduct 
      WHERE UPPER(LTRIM(RTRIM(Product))) = UPPER(@Product) AND CategoryCode = @CategoryCode AND ProductCode != @ProductCode AND Active = 1`;

    const checkResult = await pool
      .request()
      .input("Product", sql.NVarChar, normalizedProduct)
      .input("CategoryCode", sql.Int, parseInt(categoryCode))
      .input("ProductCode", sql.Int, parseInt(productCode))
      .query(checkQuery);

    if (checkResult.recordset[0].count > 0) {
      return res.status(400).json({
        status: "error",
        message: `Product '${normalizedProduct}' already exists in this category`,
      });
    }

    const updateQuery = `
      UPDATE aTProduct 
      SET Product = @Product, SellingPrice = @SellingPrice 
      WHERE ProductCode = @ProductCode AND CategoryCode = @CategoryCode AND Active = 1`;

    const result = await pool
      .request()
      .input("Product", sql.NVarChar, normalizedProduct)
      .input("SellingPrice", sql.Money, parseFloat(SellingPrice))
      .input("ProductCode", sql.Int, parseInt(productCode))
      .input("CategoryCode", sql.Int, parseInt(categoryCode))
      .query(updateQuery);

    if (result.rowsAffected[0] === 0) {
      return res.status(404).json({ status: "error", message: "Product not found or inactive" });
    }

    res.json({ status: "success", message: "Product updated" });
  } catch (error) {
    console.error("Update Product Error:", error.message, error.stack);
    res.status(500).json({ status: "error", message: "Failed to update product", error: error.message });
  }
});

// Delete a Product (DELETE) - Admin only
router.delete("/:categoryCode/:productCode", verifyAdmin, async (req, res) => {
  const { categoryCode, productCode } = req.params;
  const parsedCategoryCode = parseInt(categoryCode);
  const parsedProductCode = parseInt(productCode);

  if (isNaN(parsedCategoryCode) || isNaN(parsedProductCode)) {
    return res.status(400).json({
      status: "error",
      message: "Invalid category or product code",
    });
  }

  try {
    const pool = await poolPromise;
    if (!pool) {
      return res.status(500).json({ status: "error", message: "Database connection failed" });
    }

    const query = `
      DELETE FROM aTProduct 
      WHERE ProductCode = @ProductCode AND CategoryCode = @CategoryCode AND Active = 1`;

    const result = await pool
      .request()
      .input("ProductCode", sql.Int, parsedProductCode)
      .input("CategoryCode", sql.Int, parsedCategoryCode)
      .query(query);

    if (result.rowsAffected[0] === 0) {
      return res.status(404).json({ status: "error", message: "Product not found or already deleted" });
    }

    res.json({ status: "success", message: "Product deleted" });
  } catch (error) {
    console.error("Delete Product Error:", error.message, error.stack);
    res.status(500).json({ status: "error", message: "Failed to delete product", error: error.message });
  }
});

module.exports = router;