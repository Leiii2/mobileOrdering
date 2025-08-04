const express = require("express");
const sql = require("mssql");
const { poolPromise } = require("../server");
const jwt = require("jsonwebtoken");

const router = express.Router();

// Middleware to verify POS access
const verifyPOS = (req, res, next) => {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    return res.status(401).json({ status: "error", message: "No valid token provided" });
  }
  const token = authHeader.split(" ")[1];
  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    if (decoded.pos !== true) {
      return res.status(403).json({ status: "error", message: "POS access required" });
    }
    req.user = decoded;
    next();
  } catch (error) {
    console.error("Token Verification Error:", { message: error.message });
    return res.status(401).json({ status: "error", message: "Invalid token", error: error.message });
  }
};

// Preview discount endpoint
router.post("/preview-discount", verifyPOS, async (req, res) => {
  const { cart, discountCode, numberOfPax, numberOfSeniors } = req.body;

  // Input validation
  if (!Array.isArray(cart) || cart.length === 0) {
    return res.status(400).json({ status: "error", message: "Cart is empty or invalid" });
  }

  const pax = parseInt(numberOfPax) || 0;
  const seniors = parseInt(numberOfSeniors) || 0;

  if (pax <= 0) {
    return res.status(400).json({ status: "error", message: "Number of customers must be greater than 0" });
  }
  if (seniors > pax) {
    return res.status(400).json({ status: "error", message: "Number of seniors cannot exceed total number of customers" });
  }
  if (!discountCode) {
    let total = 0;
    for (const item of cart) {
      const quantity = parseFloat(item.quantity);
      const price = parseFloat(item.price);
      if (isNaN(quantity) || isNaN(price)) {
        return res.status(400).json({ status: "error", message: `Invalid quantity or price for product ${item.productCode}` });
      }
      total += quantity * price;
    }
    const netOfVat = total / 1.12;
    const vat = total - netOfVat;

    return res.json({
      status: "success",
      total: total.toFixed(2),
      netOfVat: netOfVat.toFixed(2),
      vat: vat.toFixed(2),
      vatDiscount: "0.00",
      percentageDiscount: "0.00",
      discountPercentage: 0,
      totalDiscount: "0.00",
      totalDue: total.toFixed(2),
    });
  }

  try {
    const pool = await poolPromise;

    let total = 0;
    for (const item of cart) {
      const quantity = parseFloat(item.quantity);
      const price = parseFloat(item.price);
      if (isNaN(quantity) || isNaN(price)) {
        return res.status(400).json({ status: "error", message: `Invalid quantity or price for product ${item.productCode}` });
      }
      total += quantity * price;
    }

    const netOfVat = total / 1.12;
    const vat = total - netOfVat;

    let vatDiscount = 0;
    let percentageDiscount = 0;
    let discountPercentage = 0;

    if (seniors > 0) {
      const totalPerPerson = total / pax;
      const seniorTotal = totalPerPerson * seniors;
      vatDiscount = (vat / pax) * seniors;

      const discountQuery = `
        SELECT Discount
        FROM dbo.atDiscount
        WHERE DiscountCode = @DiscountCode AND Active = 1;
      `;
      const discountResult = await new sql.Request(pool)
        .input("DiscountCode", sql.Int, parseInt(discountCode))
        .query(discountQuery);

      if (discountResult.recordset.length === 0) {
        return res.status(400).json({ status: "error", message: "Invalid or inactive discount code" });
      }

      discountPercentage = parseFloat(discountResult.recordset[0].Discount);
      if (isNaN(discountPercentage)) {
        return res.status(400).json({ status: "error", message: "Invalid discount percentage in database" });
      }
      percentageDiscount = (seniorTotal / 1.12) * (discountPercentage / 100);
    } else {
      const discountQuery = `
        SELECT Discount
        FROM dbo.atDiscount
        WHERE DiscountCode = @DiscountCode AND Active = 1;
      `;
      const discountResult = await new sql.Request(pool)
        .input("DiscountCode", sql.Int, parseInt(discountCode))
        .query(discountQuery);

      if (discountResult.recordset.length === 0) {
        return res.status(400).json({ status: "error", message: "Invalid or inactive discount code" });
      }

      discountPercentage = parseFloat(discountResult.recordset[0].Discount);
      if (isNaN(discountPercentage)) {
        return res.status(400).json({ status: "error", message: "Invalid discount percentage in database" });
      }
      percentageDiscount = (total / 1.12) * (discountPercentage / 100);
    }

    const totalDiscount = vatDiscount + percentageDiscount;
    const totalDue = total - totalDiscount;
    if (isNaN(totalDue)) {
      return res.status(500).json({ status: "error", message: "Failed to calculate total due due to invalid calculations" });
    }

    res.json({
      status: "success",
      total: total.toFixed(2),
      netOfVat: netOfVat.toFixed(2),
      vat: vat.toFixed(2),
      vatDiscount: vatDiscount.toFixed(2),
      percentageDiscount: percentageDiscount.toFixed(2),
      discountPercentage: discountPercentage,
      totalDiscount: totalDiscount.toFixed(2),
      totalDue: totalDue.toFixed(2),
    });
  } catch (error) {
    console.error("Discount Preview Error:", { message: error.message });
    res.status(500).json({ status: "error", message: error.message || "Failed to preview discount" });
  }
});

// Checkout route
router.post("/checkout", verifyPOS, async (req, res) => {
  const { cart, dineIn, amountPaid, discountCode, numberOfPax, numberOfSeniors, tableNo, notes } = req.body;
  const userCode = req.user.userCode;
  const userName = req.user.name || "Unknown User"; // Assuming JWT includes user name; adjust if needed

  // Input validation
  if (!Array.isArray(cart) || cart.length === 0) {
    return res.status(400).json({ status: "error", message: "Cart is empty or invalid" });
  }
  if (amountPaid === undefined || amountPaid === null || amountPaid === "" || isNaN(parseFloat(amountPaid))) {
    return res.status(400).json({ status: "error", message: "Amount paid is required and must be a valid number" });
  }

  const pax = parseInt(numberOfPax) || 0;
  const seniors = parseInt(numberOfSeniors) || 0;
  const tableNumber = tableNo !== undefined && tableNo !== null ? parseInt(tableNo) : null; // Convert to integer or null
  const notesText = notes || ""; // Use empty string if no notes provided

  if (pax <= 0) {
    return res.status(400).json({ status: "error", message: "Number of customers must be greater than 0" });
  }
  if (seniors > pax) {
    return res.status(400).json({ status: "error", message: "Number of seniors cannot exceed total number of customers" });
  }

  let transaction;
  try {
    const pool = await poolPromise;
    transaction = new sql.Transaction(pool);
    await transaction.begin();

    // Calculate the next InvoiceNo
    const invoiceQuery = `
      SELECT ISNULL(MAX(CAST(InvoiceNo AS INT)), 0) as maxInvoiceNo
      FROM dbo.TPos;
    `;
    const invoiceResult = await new sql.Request(transaction).query(invoiceQuery);
    const newInvoiceNo = invoiceResult.recordset[0].maxInvoiceNo + 1;

    // Calculate Total
    let total = 0;
    for (const item of cart) {
      const quantity = parseFloat(item.quantity);
      const price = parseFloat(item.price);
      if (isNaN(quantity) || isNaN(price)) {
        throw new Error(`Invalid quantity or price for product ${item.productCode}`);
      }
      total += quantity * price;
    }

    // Calculate NetOfVat and Vat
    const netOfVat = total / 1.12;
    const vat = total - netOfVat;

    // Initialize discount variables
    let vatDiscount = 0;
    let percentageDiscount = 0;
    let discountPercentage = 0;

    // Apply discounts only if discountCode is provided
    if (discountCode) {
      if (seniors > 0) {
        const totalPerPerson = total / pax;
        const seniorTotal = totalPerPerson * seniors;
        vatDiscount = (vat / pax) * seniors;

        const discountQuery = `
          SELECT Discount
          FROM dbo.atDiscount
          WHERE DiscountCode = @DiscountCode AND Active = 1;
        `;
        const discountResult = await new sql.Request(transaction)
          .input("DiscountCode", sql.Int, parseInt(discountCode))
          .query(discountQuery);

        if (discountResult.recordset.length === 0) {
          throw new Error("Invalid or inactive discount code");
        }

        discountPercentage = parseFloat(discountResult.recordset[0].Discount);
        if (isNaN(discountPercentage)) {
          throw new Error("Invalid discount percentage in database");
        }
        percentageDiscount = (seniorTotal / 1.12) * (discountPercentage / 100);
      } else {
        const discountQuery = `
          SELECT Discount
          FROM dbo.atDiscount
          WHERE DiscountCode = @DiscountCode AND Active = 1;
        `;
        const discountResult = await new sql.Request(transaction)
          .input("DiscountCode", sql.Int, parseInt(discountCode))
          .query(discountQuery);

        if (discountResult.recordset.length === 0) {
          throw new Error("Invalid or inactive discount code");
        }

        discountPercentage = parseFloat(discountResult.recordset[0].Discount);
        if (isNaN(discountPercentage)) {
          throw new Error("Invalid discount percentage in database");
        }
        percentageDiscount = (total / 1.12) * (discountPercentage / 100);
      }
    }

    // Total discount
    const totalDiscount = vatDiscount + percentageDiscount;

    // Total due after discount
    const totalDue = total - totalDiscount;
    if (isNaN(totalDue)) {
      throw new Error("Failed to calculate total due due to invalid calculations");
    }

    const parsedAmountPaid = parseFloat(amountPaid);
    if (parsedAmountPaid < totalDue) {
      throw new Error("Amount paid must be equal to or greater than total due");
    }

    const change = parsedAmountPaid - totalDue;

    // Insert into TPos
    const posInsertQuery = `
      INSERT INTO dbo.TPos (
        InvoiceNo, TDate, TTime, UserCode, DineIn, TakeOut, TableNo,
        Total, NetOfVat, Vat, Discount, DiscNo, TotalDue, AmountPaid,
        Done, TimeDone, Senior, Cancelled, Notes, VIP, Dinning,
        VIPCode, CustomerCode, Cash, Charge, TotCustomer, SC,
        NoSC, NoPWD, DiscountCode, eCard, ePaid, ApprovalNo,
        TerminalNo, CreditCardCode, CreditCardAmount, CashAmount,
        GCNo, GCAmount, GCover, ServiceCharge, GiftCertCode,
        VatExempt, CustomerName, CustomerAddress, CustomerTIN,
        BusName
      )
      OUTPUT inserted.POSCode
      VALUES (
        @InvoiceNo, GETDATE(), GETDATE(), @UserCode, @DineIn, @TakeOut, @TableNo,
        @Total, @NetOfVat, @Vat, @Discount, @DiscNo, @TotalDue, @AmountPaid,
        1, NULL, @Senior, 0, @Notes, 0, 0,
        NULL, NULL, 0, 0, @TotCustomer, @SC,
        0, 0, @DiscountCode, 0, 0, NULL,
        NULL, NULL, 0, @CashAmount,
        NULL, 0, 0, 0, NULL,
        0, NULL, NULL, NULL,
        NULL
      );
    `;
    const posResult = await new sql.Request(transaction)
      .input("InvoiceNo", sql.NVarChar(50), newInvoiceNo.toString())
      .input("UserCode", sql.Int, userCode)
      .input("DineIn", sql.Bit, dineIn)
      .input("TakeOut", sql.Bit, !dineIn)
      .input("TableNo", sql.NVarChar(50), tableNumber ? tableNumber.toString() : null) // Use table number
      .input("Total", sql.Money, total)
      .input("NetOfVat", sql.Money, netOfVat)
      .input("Vat", sql.Money, vat)
      .input("Discount", sql.Money, totalDiscount)
      .input("DiscNo", sql.NVarChar(50), discountCode ? discountCode.toString() : null)
      .input("TotalDue", sql.Money, totalDue)
      .input("AmountPaid", sql.Money, parsedAmountPaid)
      .input("Senior", sql.Bit, seniors > 0 ? 1 : 0)
      .input("TotCustomer", sql.Int, pax)
      .input("SC", sql.Int, seniors)
      .input("DiscountCode", sql.Int, discountCode ? parseInt(discountCode) : null)
      .input("CashAmount", sql.Money, parsedAmountPaid)
      .input("Notes", sql.NVarChar(100), notesText) // Use notes for TPos
      .query(posInsertQuery);

    const newPOSCode = posResult.recordset[0].POSCode;

    // Insert into TPosDetails
    const detailsInsertQuery = `
      INSERT INTO dbo.TPosDetails (PosCode, ProductCode, Qty, Price, Subtotal, Notes, Grams)
      VALUES (@PosCode, @ProductCode, @Qty, @Price, @Subtotal, @Notes, @Grams);
    `;
    for (const item of cart) {
      const quantity = parseFloat(item.quantity);
      const price = parseFloat(item.price);
      const subtotal = quantity * price;

      await new sql.Request(transaction)
        .input("PosCode", sql.Int, newPOSCode)
        .input("ProductCode", sql.Int, parseInt(item.productCode))
        .input("Qty", sql.Money, quantity)
        .input("Price", sql.Money, price)
        .input("Subtotal", sql.Money, subtotal)
        .input("Notes", sql.NVarChar(100), notesText) // Use notes for TPosDetails
        .input("Grams", sql.Int, 0)
        .query(detailsInsertQuery);
    }

    // Insert into TTempKitchenPrint
    const kitchenInsertQuery = `
      INSERT INTO dbo.TTempKitchenPrint (
        TableNo, POSCode, DineIn, TakeOut, Notes, ProductCode, Qty, Done,
        Product, Kitchen, Category, Name, Grams
      )
      VALUES (
        @TableNo, @POSCode, @DineIn, @TakeOut, @Notes, @ProductCode, @Qty, @Done,
        @Product, @Kitchen, @Category, @Name, @Grams
      );
    `;
    for (const item of cart) {
      const productCode = parseInt(item.productCode);
      const quantity = parseFloat(item.quantity);

      // Fetch Product and Category names
      const productQuery = `
        SELECT p.Product, c.Category
        FROM dbo.aTProduct p
        LEFT JOIN dbo.aTCategory c ON p.CategoryCode = c.CategoryCode
        WHERE p.ProductCode = @ProductCode AND p.Active = 1;
      `;
      const productResult = await new sql.Request(transaction)
        .input("ProductCode", sql.Int, productCode)
        .query(productQuery);

      if (productResult.recordset.length === 0) {
        throw new Error(`Product with ProductCode ${productCode} not found or inactive`);
      }

      const productName = productResult.recordset[0].Product || "Unknown Product";
      const categoryName = productResult.recordset[0].Category || "Uncategorized";

      await new sql.Request(transaction)
        .input("TableNo", sql.NVarChar(50), tableNumber ? tableNumber.toString() : null) // Use table number
        .input("POSCode", sql.Int, newPOSCode)
        .input("DineIn", sql.Bit, dineIn)
        .input("TakeOut", sql.Bit, !dineIn)
        .input("Notes", sql.NVarChar(200), notesText) // Use notes
        .input("ProductCode", sql.Int, productCode)
        .input("Qty", sql.Int, quantity)
        .input("Done", sql.Bit, 0) // Default to not done
        .input("Product", sql.NVarChar(80), productName)
        .input("Kitchen", sql.Bit, 0) // Default to 0 as not specified
        .input("Category", sql.NVarChar(50), categoryName)
        .input("Name", sql.NVarChar(50), userName)
        .input("Grams", sql.Int, 0) // Default to 0 as in TPosDetails
        .query(kitchenInsertQuery);
    }

    // Update stock in TStockOnHandTraceUp or TStockOnHandTraceUp2, and also in TStockOnHand or TStockOnHand2
    for (const item of cart) {
      const productCode = parseInt(item.productCode);
      const quantity = parseFloat(item.quantity);

      let lastTraceResult = await new sql.Request(transaction)
        .input("ProductCode", sql.Int, productCode)
        .query(`
          SELECT TOP 1 StockOnHandTraceUpCode, Remaining
          FROM dbo.TStockOnHandTraceUp
          WHERE ProductCode = @ProductCode
          ORDER BY StockOnHandTraceUpCode DESC;
        `);

      let lastRemaining;
      let targetTable = 'TStockOnHandTraceUp';

      if (lastTraceResult.recordset.length === 0) {
        lastTraceResult = await new sql.Request(transaction)
          .input("ProductCode", sql.Int, productCode)
          .query(`
            SELECT TOP 1 StockOnHandTraceUpCode, Remaining
            FROM dbo.TStockOnHandTraceUp2
            WHERE ProductCode = @ProductCode
            ORDER BY StockOnHandTraceUpCode DESC;
          `);
        targetTable = 'TStockOnHandTraceUp2';
      }

      if (lastTraceResult.recordset.length > 0) {
        lastRemaining = parseFloat(lastTraceResult.recordset[0].Remaining) || 0;
      } else {
        lastRemaining = 0;
      }

      if (lastRemaining < quantity) {
        throw new Error(`Insufficient stock for ProductCode ${productCode}. Available: ${lastRemaining}, Requested: ${quantity}`);
      }

      const newRemaining = lastRemaining - quantity;

      const maxCodeQuery = `
        SELECT ISNULL(MAX(StockOnHandTraceUpCode), 0) as maxCode
        FROM (
          SELECT StockOnHandTraceUpCode FROM dbo.TStockOnHandTraceUp
          UNION
          SELECT StockOnHandTraceUpCode FROM dbo.TStockOnHandTraceUp2
        ) AS CombinedCodes;
      `;
      const maxCodeResult = await new sql.Request(transaction).query(maxCodeQuery);
      const newStockOnHandTraceUpCode = maxCodeResult.recordset[0].maxCode + 1;

      const stockTraceInsertQuery = `
        SET IDENTITY_INSERT dbo.${targetTable} ON;
        INSERT INTO dbo.${targetTable} (StockOnHandTraceUpCode, ProductCode, TransactionType, TDate, Qty, Remaining, UserCode, Remarks)
        VALUES (@StockOnHandTraceUpCode, @ProductCode, @TransactionType, @TDate, @Qty, @Remaining, @UserCode, @Remarks);
        SET IDENTITY_INSERT dbo.${targetTable} OFF;
      `;
      await new sql.Request(transaction)
        .input("StockOnHandTraceUpCode", sql.Int, newStockOnHandTraceUpCode)
        .input("ProductCode", sql.Int, productCode)
        .input("TransactionType", sql.NVarChar(50), "SALES")
        .input("TDate", sql.DateTime, new Date())
        .input("Qty", sql.Money, quantity)
        .input("Remaining", sql.Money, newRemaining)
        .input("UserCode", sql.Int, userCode)
        .input("Remarks", sql.NText, `Invoice No: ${newInvoiceNo}`)
        .query(stockTraceInsertQuery);

      let stockTable = null;
      let currentStockOnHand = 0;

      const stockOnHandResult = await new sql.Request(transaction)
        .input("ProductCode", sql.Int, productCode)
        .query(`
          SELECT StockOnHand
          FROM dbo.TStockOnHand
          WHERE ProductCode = @ProductCode;
        `);

      if (stockOnHandResult.recordset.length > 0) {
        stockTable = 'TStockOnHand';
        currentStockOnHand = parseFloat(stockOnHandResult.recordset[0].StockOnHand) || 0;
      } else {
        const stockOnHand2Result = await new sql.Request(transaction)
          .input("ProductCode", sql.Int, productCode)
          .query(`
            SELECT StockOnHand
            FROM dbo.TStockOnHand2
            WHERE ProductCode = @ProductCode;
          `);
        if (stockOnHand2Result.recordset.length > 0) {
          stockTable = 'TStockOnHand2';
          currentStockOnHand = parseFloat(stockOnHand2Result.recordset[0].StockOnHand) || 0;
        }
      }

      if (stockTable) {
        const newStockOnHand = currentStockOnHand - quantity;

        if (newStockOnHand < 0) {
          throw new Error(`StockOnHand for ProductCode ${productCode} in ${stockTable} would become negative. Available: ${currentStockOnHand}, Requested: ${quantity}`);
        }

        const updateStockQuery = `
          UPDATE dbo.${stockTable}
          SET StockOnHand = @NewStockOnHand
          WHERE ProductCode = @ProductCode;
        `;
        await new sql.Request(transaction)
          .input("NewStockOnHand", sql.Money, newStockOnHand)
          .input("ProductCode", sql.Int, productCode)
          .query(updateStockQuery);
      } else {
        throw new Error(`ProductCode ${productCode} not found in TStockOnHand or TStockOnHand2.`);
      }
    }

    await transaction.commit();
    res.json({
      status: "success",
      message: "Transaction completed",
      posCode: newPOSCode,
      invoiceNo: newInvoiceNo,
      total: total.toFixed(2),
      netOfVat: netOfVat.toFixed(2),
      vat: vat.toFixed(2),
      vatDiscount: vatDiscount.toFixed(2),
      percentageDiscount: percentageDiscount.toFixed(2),
      discountPercentage: discountPercentage,
      totalDiscount: totalDiscount.toFixed(2),
      totalDue: totalDue.toFixed(2),
      change: change.toFixed(2),
    });
  } catch (error) {
    if (transaction) await transaction.rollback();
    console.error("POS Checkout Error:", { message: error.message });
    res.status(error.message.includes("Invalid") ? 400 : 500).json({
      status: "error",
      message: error.message || "Failed to process transaction",
    });
  }
});

module.exports = router;