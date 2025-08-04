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
    return res.status(401).json({ status: "error", message: "Invalid token", error: error.message });
  }
};

// POST /preview-discount - Preview discount calculation
router.post("/preview-discount", verifyPOS, async (req, res) => {
  const { cart, discountCode, numberOfPax, numberOfSeniors } = req.body;

  if (!Array.isArray(cart) || cart.length === 0) {
    return res.status(400).json({ status: "error", message: "Cart must be a non-empty array" });
  }
  if (!numberOfPax || isNaN(parseInt(numberOfPax)) || parseInt(numberOfPax) <= 0) {
    return res.status(400).json({ status: "error", message: "Number of pax must be a positive integer" });
  }
  if (numberOfSeniors && (isNaN(parseInt(numberOfSeniors)) || parseInt(numberOfSeniors) < 0 || parseInt(numberOfSeniors) > parseInt(numberOfPax))) {
    return res.status(400).json({ status: "error", message: "Number of seniors must be a non-negative integer and not exceed number of pax" });
  }

  try {
    const pool = await poolPromise;
    const request = new sql.Request(pool);

    const total = cart.reduce((sum, item) => sum + (parseFloat(item.quantity) * parseFloat(item.price)), 0);
    const netOfVat = total / 1.12;
    const vat = total - netOfVat;

    let vatDiscount = 0;
    let percentageDiscount = 0;
    let discountPercentage = 0;

    if (discountCode) {
      // Fetch the discount percentage from aTDiscount based on discountCode
      request.input("DiscountCode", sql.Int, parseInt(discountCode));
      const query = `
        SELECT Discount
        FROM dbo.aTDiscount
        WHERE DiscountCode = @DiscountCode AND Active = 1;
      `;
      const result = await request.query(query);

      if (result.recordset.length === 0) {
        return res.status(400).json({ status: "error", message: "Invalid or inactive discount code" });
      }

      // Use the Discount value as the percentage
      discountPercentage = parseFloat(result.recordset[0].Discount) || 0;
      if (discountPercentage < 0 || discountPercentage > 100) {
        return res.status(400).json({ status: "error", message: "Discount percentage must be between 0 and 100" });
      }

      if (numberOfSeniors > 0) {
        const totalPerPerson = total / parseInt(numberOfPax);
        const seniorTotal = totalPerPerson * parseInt(numberOfSeniors);
        vatDiscount = (vat / parseInt(numberOfPax)) * parseInt(numberOfSeniors);
        percentageDiscount = (seniorTotal / 1.12) * (discountPercentage / 100);
      } else {
        percentageDiscount = netOfVat * (discountPercentage / 100);
      }
    }

    const totalDiscount = vatDiscount + percentageDiscount;
    const totalDue = total - totalDiscount;

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
    console.error("Preview Discount Error:", error);
    res.status(500).json({ status: "error", message: `Failed to preview discount: ${error.message}` });
  }
});

// GET /discount/validate - Validate discount code and return percentage
router.get("/discount/validate", verifyPOS, async (req, res) => {
  const { discountCode } = req.query;

  if (!discountCode) {
    return res.json({ status: "success", discountPercentage: 0 });
  }

  try {
    const pool = await poolPromise;
    const request = new sql.Request(pool);
    request.input("DiscountCode", sql.Int, parseInt(discountCode));

    const query = `
      SELECT Discount
      FROM dbo.aTDiscount
      WHERE DiscountCode = @DiscountCode AND Active = 1;
    `;
    const result = await request.query(query);

    if (result.recordset.length === 0) {
      return res.status(400).json({ status: "error", message: "Invalid or inactive discount code" });
    }

    const discountPercentage = parseFloat(result.recordset[0].Discount) || 0;
    res.json({ status: "success", discountPercentage });
  } catch (error) {
    console.error("Discount Validation Error:", error);
    res.status(500).json({ status: "error", message: "Failed to validate discount code" });
  }
});

// POST /checkout - Checkout a running bill
router.post("/checkout", verifyPOS, async (req, res) => {
  console.log("POST /checkout: Received request", req.body);
  const { posCode, tableNo, numberOfCustomers, numberOfSeniors, notes, discountCode, discountPercentage, amountPaid, totalAmount } = req.body;
  const userCode = req.user.userCode;
  const userName = req.user.name || "Unknown User";

  // Validate required inputs
  if (!posCode) {
    console.log("POST /checkout: Missing posCode");
    return res.status(400).json({ status: "error", message: "POSCode is required" });
  }
  if (!tableNo) {
    console.log("POST /checkout: Missing tableNo");
    return res.status(400).json({ status: "error", message: "Table number is required" });
  }
  if (!Number.isInteger(numberOfCustomers) || numberOfCustomers <= 0) {
    console.log("POST /checkout: Invalid numberOfCustomers");
    return res.status(400).json({ status: "error", message: "Number of customers must be a positive integer" });
  }
  if (!Number.isInteger(numberOfSeniors) || numberOfSeniors < 0 || numberOfSeniors > numberOfCustomers) {
    console.log("POST /checkout: Invalid numberOfSeniors");
    return res.status(400).json({ status: "error", message: "Number of seniors must be a non-negative integer and not exceed number of customers" });
  }
  if (amountPaid === undefined || amountPaid < 0 || isNaN(parseFloat(amountPaid))) {
    console.log("POST /checkout: Invalid amountPaid");
    return res.status(400).json({ status: "error", message: "Amount paid must be a non-negative number" });
  }
  if (!totalAmount || isNaN(parseFloat(totalAmount))) {
    console.log("POST /checkout: Invalid totalAmount");
    return res.status(400).json({ status: "error", message: "Total amount is required and must be a valid number" });
  }

  let transaction;
  try {
    const pool = await poolPromise;
    transaction = new sql.Transaction(pool);
    await transaction.begin();

    // Fetch order details from TPos
    const posQuery = `
      SELECT POSCode, InvoiceNo, TableNo, Notes, DineIn, TakeOut, Posted, Total, NetOfVat, Vat
      FROM dbo.TPos
      WHERE POSCode = @POSCode AND Posted = 0;
    `;
    const posResult = await new sql.Request(transaction)
      .input("POSCode", sql.Int, parseInt(posCode))
      .query(posQuery);

    if (posResult.recordset.length === 0) {
      console.log(`POST /checkout: Order with POSCode ${posCode} not found or already checked out`);
      throw new Error("Order not found or already checked out");
    }

    const order = posResult.recordset[0];
    if (order.TableNo !== tableNo.toString()) {
      console.log(`POST /checkout: TableNo mismatch for POSCode ${posCode}`);
      throw new Error("Provided table number does not match order");
    }

    // Fetch items from TPosDetails
    const detailsQuery = `
      SELECT ProductCode, SUM(Qty) as Qty, MAX(Price) as Price, SUM(Subtotal) as Subtotal
      FROM dbo.TPosDetails
      WHERE PosCode = @PosCode
      GROUP BY ProductCode;
    `;
    const detailsResult = await new sql.Request(transaction)
      .input("PosCode", sql.Int, parseInt(posCode))
      .query(detailsQuery);

    if (detailsResult.recordset.length === 0) {
      console.log(`POST /checkout: No items found for POSCode ${posCode}`);
      throw new Error("No items found for this order");
    }

    // Calculate total and VAT from items
    let calculatedTotal = 0;
    const items = await Promise.all(
      detailsResult.recordset.map(async (detail) => {
        const productQuery = `
          SELECT Product
          FROM dbo.aTProduct
          WHERE ProductCode = @ProductCode AND Active = 1;
        `;
        const productResult = await new sql.Request(transaction)
          .input("ProductCode", sql.Int, detail.ProductCode)
          .query(productQuery);
        const productName = productResult.recordset[0]?.Product && typeof productResult.recordset[0].Product === "string"
          ? productResult.recordset[0].Product
          : "Unknown Product";
        const subtotal = parseFloat(detail.Subtotal);
        calculatedTotal += subtotal;
        return {
          productCode: detail.ProductCode.toString(),
          productName,
          quantity: parseFloat(detail.Qty),
          price: parseFloat(detail.Price),
          subtotal,
        };
      })
    );

    const netOfVat = calculatedTotal / 1.12;
    const vat = calculatedTotal - netOfVat;

    // Use frontend-provided discountPercentage if available, otherwise validate discountCode
    let vatDiscount = 0;
    let percentageDiscount = 0;
    let discNo = null;

    if (discountCode && discountPercentage >= 0) {
      if (numberOfSeniors > 0) {
        const totalPerPerson = calculatedTotal / numberOfCustomers;
        const seniorTotal = totalPerPerson * numberOfSeniors;
        vatDiscount = (vat / numberOfCustomers) * numberOfSeniors;
        percentageDiscount = (seniorTotal / 1.12) * (discountPercentage / 100);
      } else {
        percentageDiscount = (netOfVat) * (discountPercentage / 100);
      }
      discNo = parseInt(discountCode);
    } else if (discountCode) {
      const discountQuery = `
        SELECT Discount
        FROM dbo.aTDiscount
        WHERE DiscountCode = @DiscountCode AND Active = 1;
      `;
      const discountResult = await new sql.Request(transaction)
        .input("DiscountCode", sql.Int, parseInt(discountCode))
        .query(discountQuery);

      if (discountResult.recordset.length === 0) {
        console.log(`POST /checkout: Invalid or inactive discount code ${discountCode}`);
        throw new Error("Invalid or inactive discount code");
      }

      const validatedDiscountPercentage = parseFloat(discountResult.recordset[0].Discount) || 0;
      discNo = parseInt(discountCode);
      if (numberOfSeniors > 0) {
        const totalPerPerson = calculatedTotal / numberOfCustomers;
        const seniorTotal = totalPerPerson * numberOfSeniors;
        vatDiscount = (vat / numberOfCustomers) * numberOfSeniors;
        percentageDiscount = (seniorTotal / 1.12) * (validatedDiscountPercentage / 100);
      } else {
        percentageDiscount = (netOfVat) * (validatedDiscountPercentage / 100);
      }
    }

    const totalDiscount = vatDiscount + percentageDiscount;
    const calculatedTotalDue = calculatedTotal - totalDiscount;

    if (Math.abs(parseFloat(totalAmount) - calculatedTotalDue) > 0.01) {
      console.log(`POST /checkout: Total amount mismatch. Provided: ${totalAmount}, Calculated: ${calculatedTotalDue}`);
      throw new Error("Provided total amount does not match calculated total due with discount");
    }

    const parsedAmountPaid = parseFloat(amountPaid);
    if (parsedAmountPaid < parseFloat(totalAmount)) {
      console.log("POST /checkout: Amount paid is less than total due");
      throw new Error("Amount paid is less than total due");
    }

    const change = parsedAmountPaid - parseFloat(totalAmount);

    // Update TPos with checkout details
    const updatePosQuery = `
      UPDATE dbo.TPos
      SET Total = @Total,
          Vat = @Vat,
          NetOfVat = @NetOfVat,
          Discount = @Discount,
          DiscNo = @DiscNo,
          TotalDue = @TotalDue,
          AmountPaid = @AmountPaid,
          Posted = @Posted,
          TotCustomer = @TotCustomer,
          SC = @SC,
          CashAmount = @CashAmount,
          Notes = @Notes,
          TTime = GETDATE()
      WHERE POSCode = @POSCode;
    `;
    await new sql.Request(transaction)
      .input("Total", sql.Money, calculatedTotal)
      .input("Vat", sql.Money, vat)
      .input("NetOfVat", sql.Money, netOfVat)
      .input("Discount", sql.Money, totalDiscount)
      .input("DiscNo", sql.Int, discNo)
      .input("TotalDue", sql.Money, parseFloat(totalAmount))
      .input("AmountPaid", sql.Money, parsedAmountPaid)
      .input("Posted", sql.Bit, 1)
      .input("TotCustomer", sql.Int, numberOfCustomers)
      .input("SC", sql.Int, numberOfSeniors || 0)
      .input("CashAmount", sql.Money, parsedAmountPaid)
      .input("Notes", sql.NVarChar(100), notes || order.Notes || "")
      .input("POSCode", sql.Int, parseInt(posCode))
      .query(updatePosQuery);
    console.log(`POST /checkout: Updated TPos for POSCode ${posCode}`);

    // Update TTempKitchenPrint to mark as done
    const updateKitchenQuery = `
      UPDATE dbo.TTempKitchenPrint
      SET Done = @Done
      WHERE POSCode = @POSCode;
    `;
    await new sql.Request(transaction)
      .input("Done", sql.Bit, 1)
      .input("POSCode", sql.Int, parseInt(posCode))
      .query(updateKitchenQuery);
    console.log(`POST /checkout: Marked TTempKitchenPrint as Done for POSCode ${posCode}`);

    // Update stock in TStockOnHandTraceUp or TStockOnHandTraceUp2, and TStockOnHand or TStockOnHand2
    for (const item of items) {
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
        .input("Remarks", sql.NText, `Invoice No: ${order.InvoiceNo}`)
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
    console.log(`POST /checkout: Transaction committed for POSCode ${posCode}`);

    // Return response
    res.json({
      status: "success",
      message: `Order ${order.InvoiceNo} checked out successfully`,
      posCode: posCode.toString(),
      invoiceNo: order.InvoiceNo,
      tableNo: order.TableNo,
      dineIn: order.DineIn,
      takeOut: order.TakeOut,
      notes: notes || order.Notes || "",
      total: calculatedTotal.toFixed(2),
      netOfVat: netOfVat.toFixed(2),
      vat: vat.toFixed(2),
      vatDiscount: vatDiscount.toFixed(2),
      percentageDiscount: percentageDiscount.toFixed(2),
      discountPercentage: discountPercentage || 0,
      totalDiscount: totalDiscount.toFixed(2),
      totalDue: parseFloat(totalAmount).toFixed(2),
      amountPaid: parsedAmountPaid.toFixed(2),
      change: change.toFixed(2),
      numberOfCustomers,
      numberOfSeniors: numberOfSeniors || 0,
      items,
      timestamp: new Date().toISOString(),
      receipt: `Receipt for Invoice ${order.InvoiceNo}\nTotal: ₱${calculatedTotal.toFixed(2)}\nDiscount: ₱${totalDiscount.toFixed(2)}\nTotal Due: ₱${totalAmount.toFixed(2)}\nAmount Paid: ₱${parsedAmountPaid.toFixed(2)}\nChange: ₱${change.toFixed(2)}`
    });
  } catch (error) {
    if (transaction) {
      try {
        await transaction.rollback();
        console.log("POST /checkout: Transaction rolled back due to error", error.message);
      } catch (rollbackError) {
        console.log("POST /checkout: Error during rollback", rollbackError.message);
      }
    }
    console.error("POST /checkout: Error", error);
    res.status(error.message.includes("Invalid") || error.message.includes("not found") || error.message.includes("already checked out") || error.message.includes("less than total due") ? 400 : 500).json({
      status: "error",
      message: error.message || "Failed to checkout order",
    });
  }
});

module.exports = router;