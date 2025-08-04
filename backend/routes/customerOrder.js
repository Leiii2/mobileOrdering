const express = require("express");
const sql = require("mssql");
const { poolPromise } = require("../server");
const jwt = require("jsonwebtoken");

const router = express.Router();

// Fetch All Categories for Customer Order Screen (Public - GET)
router.get("/categories", async (req, res) => {
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
    console.error("Customer Categories Fetch Error:", error.message, error.stack);
    res.status(500).json({
      status: "error",
      message: "Database error",
      error: error.message,
    });
  }
});

// Fetch Products by Category for Customer Order Screen (Public - GET)
router.get("/stocks/:categoryCode", async (req, res) => {
  const { categoryCode } = req.params;

  try {
    const pool = await poolPromise;
    if (!pool) {
      return res.status(500).json({ status: "error", message: "Database connection failed" });
    }

    const query = `
      SELECT 
        p.ProductCode, 
        p.Product
      FROM aTProduct p
      WHERE p.CategoryCode = @categoryCode AND p.Active = 1`;

    const result = await pool
      .request()
      .input("categoryCode", sql.Int, parseInt(categoryCode))
      .query(query);

    const products = result.recordset;

    res.json({ status: "success", products });
  } catch (error) {
    console.error("Customer Stocks Fetch Error:", error.message, error.stack);
    res.status(500).json({ status: "error", message: "Database error", error: error.message });
  }
});

// Fetch Price for a Specific Product (Public - GET)
router.get("/stocks/:categoryCode/:productCode/price", async (req, res) => {
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

    res.json({ status: "success", price: result.recordset[0]?.price || 0 });
  } catch (error) {
    console.error("Customer Price Fetch Error:", error.message, error.stack);
    res.status(500).json({ status: "error", message: "Failed to fetch price", error: error.message });
  }
});

// Fetch Pending Orders (Public - GET)
router.get("/pending-running-bill/pending-orders", async (req, res) => {
  try {
    const pool = await poolPromise;
    if (!pool) {
      return res.status(500).json({ status: "error", message: "Database connection failed" });
    }

    const query = `
      SELECT 
        t.POSCode, 
        t.InvoiceNo, 
        t.TableNo, 
        t.Notes, 
        t.DineIn, 
        t.TakeOut,
        td.ProductCode,
        p.Product AS productName,
        td.Qty AS quantity,
        td.Price AS price
      FROM TPos t
      LEFT JOIN TPosDetails td ON t.POSCode = td.PosCode
      LEFT JOIN aTProduct p ON td.ProductCode = p.ProductCode
      WHERE t.Posted = 0 AND t.TableNo IS NOT NULL`;

    const result = await pool.request().query(query);

    const ordersMap = {};
    result.recordset.forEach((row) => {
      if (!ordersMap[row.POSCode]) {
        ordersMap[row.POSCode] = {
          POSCode: row.POSCode,
          InvoiceNo: row.InvoiceNo,
          tableNo: row.TableNo,
          notes: row.Notes,
          dineIn: !!row.DineIn,
          takeOut: !!row.TakeOut,
          items: [],
        };
      }
      if (row.ProductCode) {
        ordersMap[row.POSCode].items.push({
          ProductCode: row.ProductCode,
          productName: row.productName,
          quantity: parseFloat(row.quantity),
          price: parseFloat(row.price),
        });
      }
    });

    const orders = Object.values(ordersMap).filter((order) => order.items.length > 0);

    res.json({ status: "success", orders });
  } catch (error) {
    console.error("Pending Orders Fetch Error:", error.message, error.stack);
    res.status(500).json({ status: "error", message: "Database error", error: error.message });
  }
});

// Accept Order and Insert into TPos, TPosDetails, and TTempKitchenPrint
router.post("/accept", async (req, res) => {
  const { tableNo, cart, notes = "", dineIn = true, takeOut = false } = req.body;

  if (!tableNo || !cart || !Array.isArray(cart) || cart.length === 0) {
    return res.status(400).json({ status: "error", message: "Missing or invalid tableNo or cart" });
  }

  if (dineIn && takeOut) {
    return res.status(400).json({ status: "error", message: "Order cannot be both DineIn and TakeOut" });
  }

  try {
    const pool = await poolPromise;
    if (!pool) {
      return res.status(500).json({ status: "error", message: "Database connection failed" });
    }

    const transaction = new sql.Transaction(pool);
    await transaction.begin();

    try {
      let userCode = null;
      let userName = "Guest";
      try {
        const token = req.headers.authorization?.split(" ")[1];
        if (token) {
          const decoded = jwt.verify(token, process.env.JWT_SECRET);
          userCode = decoded.userCode ? parseInt(decoded.userCode) : null; // Convert to INT, allow null
          userName = decoded.name || "Guest";
        }
      } catch (jwtError) {
        console.warn("JWT verification failed:", jwtError.message);
      }

      // Check for existing order for the table with Posted = 0
      let posCode, invoiceNo;
      if (tableNo) {
        const existingOrderQuery = `
          SELECT POSCode, InvoiceNo
          FROM TPos
          WHERE TableNo = @TableNo AND Posted = 0`;
        const existingOrderResult = await transaction
          .request()
          .input("TableNo", sql.NVarChar, tableNo)
          .query(existingOrderQuery);

        if (existingOrderResult.recordset.length > 0) {
          posCode = existingOrderResult.recordset[0].POSCode;
          invoiceNo = existingOrderResult.recordset[0].InvoiceNo;
        }
      }

      // If no existing order, create a new one
      if (!posCode) {
        const maxInvoiceQuery = `SELECT ISNULL(MAX(InvoiceNo), 0) + 1 AS NewInvoiceNo FROM TPos`;
        const maxInvoiceResult = await transaction.request().query(maxInvoiceQuery);
        invoiceNo = maxInvoiceResult.recordset[0].NewInvoiceNo;

        const insertPosQuery = `
          INSERT INTO TPos (
            InvoiceNo, TDate, TTime, UserCode, TableNo, Notes, Posted, DineIn, TakeOut,
            Total, Vat, NetOfVat, Discount, TotalDue, AmountPaid, Done, Senior, Cancelled,
            VIP, Dinning, Cash, Charge, TotCustomer, SC, NoSC, NoPWD, eCard, ePaid,
            CreditCardAmount, CashAmount, GCAmount, GCOver, ServiceCharge, VatExempt
          ) OUTPUT INSERTED.POSCode
          VALUES (
            @InvoiceNo, GETDATE(), CONVERT(TIME, GETDATE()), @UserCode, @TableNo, @Notes, 0, @DineIn, @TakeOut,
            0, 0, 0, 0, 0, 0, 0, 0, 0,
            0, 0, 0, 0, 0, 0, 0, 0, 0, 0,
            0, 0, 0, 0, 0, 0
          )`;
        const posResult = await transaction
          .request()
          .input("InvoiceNo", sql.Int, invoiceNo)
          .input("UserCode", sql.Int, userCode) // Use INT, allow null
          .input("TableNo", sql.NVarChar, tableNo || null)
          .input("Notes", sql.NVarChar, notes || "")
          .input("DineIn", sql.Bit, dineIn ? 1 : 0)
          .input("TakeOut", sql.Bit, takeOut ? 1 : 0)
          .query(insertPosQuery);

        posCode = posResult.recordset[0].POSCode;
      }

      // Insert items into TPosDetails and TTempKitchenPrint
      const errors = [];
      for (const item of cart) {
        const { productCode, quantity, price } = item;
        if (!productCode || isNaN(quantity) || quantity <= 0 || isNaN(price)) {
          errors.push(`Invalid item data for productCode: ${productCode}`);
          continue;
        }

        // Validate product exists and is active
        const productQuery = `
          SELECT Product, CategoryCode
          FROM aTProduct
          WHERE ProductCode = @ProductCode AND Active = 1`;
        const productResult = await transaction
          .request()
          .input("ProductCode", sql.Int, parseInt(productCode))
          .query(productQuery);

        if (productResult.recordset.length === 0) {
          errors.push(`Product not found or inactive: ${productCode}`);
          continue;
        }

        const product = productResult.recordset[0];

        // Insert into TPosDetails with Done set to False (0)
        const insertDetailsQuery = `
          INSERT INTO TPosDetails (
            PosCode, ProductCode, Qty, Price, Notes, Grams, Subtotal, Done
          ) VALUES (@PosCode, @ProductCode, @Qty, @Price, @Notes, 0, @Subtotal, 0)`;
        await transaction
          .request()
          .input("PosCode", sql.Int, posCode)
          .input("ProductCode", sql.Int, parseInt(productCode))
          .input("Qty", sql.Float, parseFloat(quantity))
          .input("Price", sql.Float, parseFloat(price))
          .input("Notes", sql.NVarChar, notes || "")
          .input("Subtotal", sql.Float, parseFloat(quantity) * parseFloat(price))
          .query(insertDetailsQuery);

        // Fetch category name for TTempKitchenPrint
        const categoryQuery = `
          SELECT Category
          FROM aTCategory
          WHERE CategoryCode = @CategoryCode`;
        const categoryResult = await transaction
          .request()
          .input("CategoryCode", sql.Int, product.CategoryCode)
          .query(categoryQuery);

        const categoryName = categoryResult.recordset[0]?.Category || "Unknown";

        // Insert into TTempKitchenPrint
        const insertKitchenQuery = `
          INSERT INTO TTempKitchenPrint (
            TableNo, POSCode, DineIn, TakeOut, Notes, ProductCode, Qty, Done, Product, Kitchen, Category, Name, Grams
          ) VALUES (@TableNo, @POSCode, @DineIn, @TakeOut, @Notes, @ProductCode, @Qty, 0, @Product, 0, @Category, @Name, 0)`;
        await transaction
          .request()
          .input("TableNo", sql.NVarChar, tableNo || null)
          .input("POSCode", sql.Int, posCode)
          .input("DineIn", sql.Bit, dineIn ? 1 : 0)
          .input("TakeOut", sql.Bit, takeOut ? 1 : 0)
          .input("Notes", sql.NVarChar, notes || "")
          .input("ProductCode", sql.Int, parseInt(productCode))
          .input("Qty", sql.Int, parseInt(quantity))
          .input("Product", sql.NVarChar, product.Product)
          .input("Category", sql.NVarChar, categoryName)
          .input("Name", sql.NVarChar, userName)
          .query(insertKitchenQuery);
      }

      if (errors.length > 0) {
        await transaction.rollback();
        return res.status(400).json({ status: "error", message: "Some items could not be processed", errors });
      }

      await transaction.commit();
      res.json({
        status: "success",
        order: { POSCode: posCode, InvoiceNo: invoiceNo, items: cart },
      });
    } catch (error) {
      await transaction.rollback();
      console.error("Order Accept Transaction Error:", error.message, error.stack);
      res.status(500).json({ status: "error", message: "Transaction error", error: error.message });
    }
  } catch (error) {
    console.error("Order Accept Error:", error.message, error.stack);
    res.status(500).json({ status: "error", message: "Database error", error: error.message });
  }
});

module.exports = router;