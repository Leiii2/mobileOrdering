const express = require("express");
const sql = require("mssql");
const { poolPromise } = require("../server");
const jwt = require("jsonwebtoken");
const multer = require("multer");
const path = require("path");
const fs = require("fs").promises;

const router = express.Router();

// Configure Multer for file uploads
const storage = multer.diskStorage({
  destination: (req, res, cb) => {
    cb(null, "uploads/");
  },
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname).toLowerCase();
    cb(null, `product_${req.params.productCode}${ext}`);
  },
});
const upload = multer({
  storage,
  limits: { fileSize: 5 * 1024 * 1024 }, // 5MB limit
  fileFilter: (req, file, cb) => {
    const filetypes = /jpeg|jpg|png/;
    const extname = filetypes.test(path.extname(file.originalname).toLowerCase());
    const mimetype = filetypes.test(file.mimetype);
    if (extname && mimetype) {
      return cb(null, true);
    }
    cb(new Error("Only JPEG and PNG images are allowed"));
  },
});

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

// Serve static files from the uploads directory
router.use("/uploads", express.static(path.join(__dirname, "../uploads")));

// Fetch Products by Category (GET)
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

// Fetch Price for a Specific Product (GET)
router.get("/:categoryCode/:productCode/price", verifyToken, async (req, res) => {
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

    res.json({ status: "success", price: result.recordset[0]?.Price || 100 });
  } catch (error) {
    console.error("Price Fetch Error:", error.message, error.stack);
    res.status(500).json({ status: "error", message: "Failed to fetch price", error: error.message });
  }
});

// Add a Product (POST) - Admin only
router.post("/:categoryCode", verifyAdmin, async (req, res) => {
  const { categoryCode } = req.params;
  const { Product } = req.body;

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
        INSERT INTO aTProduct (CategoryCode, Product, Active) 
        OUTPUT inserted.ProductCode, inserted.Product, inserted.CategoryCode 
        VALUES (@CategoryCode, @Product, 1)`;
      const insertRequest = new sql.Request(transaction);
      insertRequest.input("CategoryCode", sql.Int, parseInt(categoryCode));
      insertRequest.input("Product", sql.NVarChar, normalizedProduct);
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
  const { Product } = req.body;

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
      SET Product = @Product 
      WHERE ProductCode = @ProductCode AND CategoryCode = @CategoryCode AND Active = 1`;

    const result = await pool
      .request()
      .input("Product", sql.NVarChar, normalizedProduct)
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

  try {
    const pool = await poolPromise;
    if (!pool) {
      return res.status(500).json({ status: "error", message: "Database connection failed" });
    }

    const query = `
      UPDATE aTProduct 
      SET Active = 0 
      WHERE ProductCode = @ProductCode AND CategoryCode = @CategoryCode`;

    const result = await pool
      .request()
      .input("ProductCode", sql.Int, parseInt(productCode))
      .input("CategoryCode", sql.Int, parseInt(categoryCode))
      .query(query);

    if (result.rowsAffected[0] === 0) {
      return res.status(404).json({ status: "error", message: "Product not found" });
    }

    res.json({ status: "success", message: "Product deleted" });
  } catch (error) {
    console.error("Delete Product Error:", error.message, error.stack);
    res.status(500).json({ status: "error", message: "Failed to delete product", error: error.message });
  }
});

// Upload Product Image (POST) - Admin only
router.post("/:categoryCode/:productCode/image", verifyAdmin, upload.single("image"), async (req, res) => {
  const { categoryCode, productCode } = req.params;

  try {
    const pool = await poolPromise;
    if (!pool) {
      return res.status(500).json({ status: "error", message: "Database connection failed" });
    }

    // Verify product exists
    const checkQuery = `
      SELECT COUNT(*) as count 
      FROM aTProduct 
      WHERE ProductCode = @ProductCode AND CategoryCode = @CategoryCode AND Active = 1`;
    const checkResult = await pool
      .request()
      .input("ProductCode", sql.Int, parseInt(productCode))
      .input("CategoryCode", sql.Int, parseInt(categoryCode))
      .query(checkQuery);

    if (checkResult.recordset[0].count === 0) {
      return res.status(404).json({ status: "error", message: "Product not found or inactive" });
    }

    if (!req.file) {
      return res.status(400).json({ status: "error", message: "No image file provided" });
    }

    res.json({ status: "success", message: "Image uploaded successfully" });
  } catch (error) {
    console.error("Image Upload Error:", error.message, error.stack);
    res.status(500).json({ status: "error", message: "Failed to upload image", error: error.message });
  }
});

// Delete Product Image (DELETE) - Admin only
router.delete("/:categoryCode/:productCode/image", verifyAdmin, async (req, res) => {
  const { categoryCode, productCode } = req.params;

  try {
    const pool = await poolPromise;
    if (!pool) {
      return res.status(500).json({ status: "error", message: "Database connection failed" });
    }

    // Verify product exists
    const checkQuery = `
      SELECT COUNT(*) as count 
      FROM aTProduct 
      WHERE ProductCode = @ProductCode AND CategoryCode = @CategoryCode AND Active = 1`;
    const checkResult = await pool
      .request()
      .input("ProductCode", sql.Int, parseInt(productCode))
      .input("CategoryCode", sql.Int, parseInt(categoryCode))
      .query(checkQuery);

    if (checkResult.recordset[0].count === 0) {
      return res.status(404).json({ status: "error", message: "Product not found or inactive" });
    }

    // Delete existing images
    const extensions = [".jpg", ".jpeg", ".png"];
    for (const ext of extensions) {
      const filePath = path.join(__dirname, "../uploads", `product_${productCode}${ext}`);
      try {
        await fs.unlink(filePath);
      } catch (error) {
        if (error.code !== "ENOENT") {
          throw error;
        }
      }
    }

    res.json({ status: "success", message: "Image deleted successfully" });
  } catch (error) {
    console.error("Image Delete Error:", error.message, error.stack);
    res.status(500).json({ status: "error", message: "Failed to delete image", error: error.message });
  }
});

module.exports = router;