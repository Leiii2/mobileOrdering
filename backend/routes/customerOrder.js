const express = require("express");
const sql = require("mssql");
const { poolPromise } = require("../server");

const router = express.Router();

// In-memory store for deviceId -> [{ POSCode, InvoiceNo, TableNo, Posted }]
const deviceOrderMap = new Map();

// Helper to validate deviceId
const validateDeviceId = (deviceId) => {
  return typeof deviceId === "string" && deviceId.trim().length > 0;
};

// Modified Endpoint: Fetch pending orders for a table
router.get("/pending-orders/:tableNo", async (req, res) => {
  const { tableNo } = req.params;
  const { deviceId } = req.query;

  if (!tableNo || !validateDeviceId(deviceId)) {
    console.warn("Pending Orders: Invalid input", { tableNo, deviceId });
    return res.status(400).json({ status: "error", message: "Valid tableNo and deviceId are required" });
  }

  try {
    const pool = await poolPromise;
    if (!pool) {
      console.error("Pending Orders: Database connection failed");
      return res.status(500).json({ status: "error", message: "Database connection failed" });
    }

    const vipTableNo = tableNo === "1" ? "VIP 1" : `VIP ${tableNo}`; // Convert numeric tableNo to VIP format

    // Fetch unposted orders with their details, including Done column
    const query = `
      SELECT 
        t.POSCode,
        t.InvoiceNo,
        t.TableNo,
        t.Posted,
        d.PosDetailsCode,
        d.ProductCode,
        d.Qty,
        d.Price,
        d.Notes,
        d.Done,
        p.Product AS ProductName
      FROM TPos t
      INNER JOIN TPosDetails d ON t.POSCode = d.PosCode
      INNER JOIN aTProduct p ON d.ProductCode = p.ProductCode
      WHERE t.TableNo = @TableNo AND t.Posted = 0 AND p.Active = 1
      ORDER BY d.PosDetailsCode`;
    
    const result = await pool
      .request()
      .input("TableNo", sql.NVarChar, vipTableNo)
      .query(query);

    // Filter orders by deviceId using deviceOrderMap
    const deviceOrders = deviceOrderMap.get(deviceId) || [];
    const filteredOrders = result.recordset.filter((order) =>
      deviceOrders.some(
        (o) => o.POSCode === order.POSCode && o.TableNo === vipTableNo && o.Posted === 0
      )
    );

    // Map orders to desired format, keeping each PosDetailsCode entry separate, and return numeric TableNo
    const orders = filteredOrders.map((order) => ({
      PosDetailsCode: order.PosDetailsCode,
      POSCode: order.POSCode,
      InvoiceNo: order.InvoiceNo,
      TableNo: tableNo, // Return numeric tableNo for display
      ProductCode: order.ProductCode,
      ProductName: order.ProductName,
      Qty: order.Qty,
      Price: order.Price,
      Notes: order.Notes || "",
      Done: order.Done, // Include Done status
    }));

    console.log(`Pending Orders: Retrieved ${orders.length} items for tableNo: ${tableNo}, deviceId: ${deviceId}`);
    res.json({ status: "success", orders });
  } catch (error) {
    console.error("Pending Orders Error:", {
      message: error.message,
      stack: error.stack,
      tableNo,
      deviceId,
    });
    res.status(500).json({ status: "error", message: "Failed to fetch pending orders", error: error.message });
  }
});

// Existing Endpoint: Check if table is available
router.get("/check-table/:tableNo", async (req, res) => {
  const { tableNo } = req.params;
  const { deviceId } = req.query;

  if (!tableNo || !validateDeviceId(deviceId)) {
    console.warn("Check Table: Invalid input", { tableNo, deviceId });
    return res.status(400).json({ status: "error", message: "Valid tableNo and deviceId are required" });
  }

  try {
    const pool = await poolPromise;
    if (!pool) {
      console.error("Check Table: Database connection failed");
      return res.status(500).json({ status: "error", message: "Database connection failed" });
    }

    const vipTableNo = tableNo === "1" ? "VIP 1" : `VIP ${tableNo}`; // Convert numeric tableNo to VIP format

    // Check for unposted order in TPos
    const query = `
      SELECT POSCode, InvoiceNo
      FROM TPos
      WHERE TableNo = @TableNo AND Posted = 0`;
    const result = await pool
      .request()
      .input("TableNo", sql.NVarChar, vipTableNo)
      .query(query);

    if (result.recordset.length > 0) {
      // Check if the current deviceId matches the one in deviceOrderMap
      const existingOrders = deviceOrderMap.get(deviceId) || [];
      const order = existingOrders.find(
        (o) => o.TableNo === vipTableNo && o.POSCode === result.recordset[0].POSCode && o.Posted === 0
      );

      if (!order) {
        // Table is taken by another device
        console.log(`Check Table: Table ${tableNo} is taken by another device, deviceId: ${deviceId}`);
        return res.status(403).json({ status: "error", message: "Table number already taken by another device" });
      }
    }

    console.log(`Check Table: Table ${tableNo} is available or owned by deviceId: ${deviceId}`);
    res.json({ status: "success", message: "Table is available" });
  } catch (error) {
    console.error("Check Table Error:", { message: error.message, stack: error.stack, tableNo, deviceId });
    res.status(500).json({ status: "error", message: "Failed to check table availability", error: error.message });
  }
});

// Modified /accept Endpoint
router.post("/accept", async (req, res) => {
  const { tableNo, cart, notes = "", dineIn = true, takeOut = false, deviceId, invoiceNo } = req.body;

  if (!tableNo || !cart || !Array.isArray(cart) || cart.length === 0 || !validateDeviceId(deviceId)) {
    console.warn("Order Accept: Invalid input", { tableNo, cartLength: cart?.length, deviceId, invoiceNo });
    return res.status(400).json({ status: "error", message: "Valid tableNo, cart, and deviceId are required" });
  }

  if (dineIn && takeOut) {
    console.warn("Order Accept: Cannot be both DineIn and TakeOut");
    return res.status(400).json({ status: "error", message: "Order cannot be both DineIn and TakeOut" });
  }

  try {
    const pool = await poolPromise;
    if (!pool) {
      console.error("Order Accept: Database connection failed");
      return res.status(500).json({ status: "error", message: "Database connection failed" });
    }

    const transaction = new sql.Transaction(pool);
    await transaction.begin();
    console.log("Order Accept: Transaction started for tableNo:", tableNo, "deviceId:", deviceId, "invoiceNo:", invoiceNo || "none");

    let userCode = 1;
    let userName = "Guest";
    let posCode, newInvoiceNo;

    // Check if tableNo matches a VIPCode in aTVIP
    const vipCheckQuery = `
      SELECT VIPCode, VIP
      FROM aTVIP
      WHERE VIPCode = @VIPCode AND Active = 1`;
    const vipCheckResult = await transaction
      .request()
      .input("VIPCode", sql.Int, parseInt(tableNo))
      .query(vipCheckQuery);

    if (vipCheckResult.recordset.length === 0) {
      await transaction.rollback();
      console.warn("Order Accept: No matching VIPCode found for tableNo:", tableNo);
      return res.status(400).json({ status: "error", message: "Invalid table number, no matching VIP code" });
    }

    const { VIPCode, VIP } = vipCheckResult.recordset[0];
    const vipTableNo = VIP; // Use VIP column value as TableNo in TPos

    // Check for existing unposted order and validate deviceId
    const existingOrders = deviceOrderMap.get(deviceId) || [];
    let existingOrder = existingOrders.find(
      (order) => order.TableNo === vipTableNo && order.Posted === 0 && (!invoiceNo || order.InvoiceNo === parseInt(invoiceNo))
    );

    // Validate with database
    if (existingOrder) {
      const existingOrderQuery = `
        SELECT POSCode, InvoiceNo, Posted 
        FROM TPos 
        WHERE POSCode = @POSCode AND InvoiceNo = @InvoiceNo AND TableNo = @TableNo AND Posted = 0`;
      const existingOrderResult = await transaction
        .request()
        .input("POSCode", sql.Int, existingOrder.POSCode)
        .input("InvoiceNo", sql.Int, existingOrder.InvoiceNo)
        .input("TableNo", sql.NVarChar, vipTableNo)
        .query(existingOrderQuery);

      if (existingOrderResult.recordset.length === 0) {
        console.warn("Order Accept: Order in deviceOrderMap not found or posted, clearing from map", {
          posCode: existingOrder.POSCode,
          invoiceNo: existingOrder.InvoiceNo,
        });
        deviceOrderMap.set(
          deviceId,
          existingOrders.filter(
            (order) => order.POSCode !== existingOrder.POSCode || order.InvoiceNo !== existingOrder.InvoiceNo
          )
        );
        existingOrder = null;
      } else {
        posCode = existingOrder.POSCode;
        newInvoiceNo = existingOrder.InvoiceNo;
        console.log("Order Accept: Reusing existing order from deviceOrderMap, POSCode:", posCode, "InvoiceNo:", newInvoiceNo);
      }
    }

    // If no valid order in deviceOrderMap, check database for unposted order
    if (!existingOrder) {
      const checkExistingOrder = `
        SELECT POSCode, InvoiceNo, Posted
        FROM TPos
        WHERE TableNo = @TableNo AND Posted = 0`;
      const existingOrderResult = await transaction
        .request()
        .input("TableNo", sql.NVarChar, vipTableNo)
        .query(checkExistingOrder);

      if (existingOrderResult.recordset.length > 0) {
        // Table has a pending order by another device
        const otherDeviceOrders = deviceOrderMap.entries();
        let isTakenByOtherDevice = false;
        for (const [otherDeviceId, orders] of otherDeviceOrders) {
          if (otherDeviceId !== deviceId && orders.some((o) => o.TableNo === vipTableNo && o.Posted === 0)) {
            isTakenByOtherDevice = true;
            break;
          }
        }
        if (isTakenByOtherDevice) {
          await transaction.rollback();
          console.log(`Order Accept: Table ${vipTableNo} is taken by another device, deviceId: ${deviceId}`);
          return res.status(403).json({ status: "error", message: "Table number already taken by another device" });
        }

        existingOrder = existingOrderResult.recordset[0];
        posCode = existingOrder.POSCode;
        newInvoiceNo = existingOrder.InvoiceNo;
        console.log("Order Accept: Reusing existing unposted order from database, POSCode:", posCode, "InvoiceNo:", newInvoiceNo);

        // Update deviceOrderMap
        deviceOrderMap.set(deviceId, [
          ...existingOrders.filter((order) => order.TableNo !== vipTableNo || order.InvoiceNo !== newInvoiceNo),
          { POSCode: posCode, InvoiceNo: newInvoiceNo, TableNo: vipTableNo, Posted: 0, createdAt: new Date() },
        ]);
      }
    }

    // If no unposted order exists, create a new TPos entry
    if (!existingOrder) {
      console.log("Order Accept: Creating new order for tableNo:", vipTableNo);
      const maxInvoiceQuery = `SELECT ISNULL(MAX(InvoiceNo), 0) + 1 AS NewInvoiceNo FROM TPos`;
      const maxInvoiceResult = await transaction.request().query(maxInvoiceQuery);
      newInvoiceNo = maxInvoiceResult.recordset[0].NewInvoiceNo;

      const insertPosQuery = `
        INSERT INTO TPos (
          InvoiceNo, TDate, TTime, UserCode, TableNo, Notes, Posted, DineIn, TakeOut,
          Total, Vat, NetOfVat, Discount, TotalDue, AmountPaid, Done, Senior, Cancelled,
          VIP, Dinning, Cash, Charge, TotCustomer, SC, NoSC, NoPWD, eCard, ePaid,
          CreditCardAmount, CashAmount, GCAmount, GCOver, ServiceCharge, VatExempt, VIPCode
        ) OUTPUT INSERTED.POSCode, INSERTED.Posted
        VALUES (
          @InvoiceNo, GETDATE(), CONVERT(TIME, GETDATE()), @UserCode, @TableNo, @Notes, 0, @DineIn, @TakeOut,
          0, 0, 0, 0, 0, 0, 0, 0, 0,
          1, 0, 0, 0, 0, 0, 0, 0, 0, 0,
          0, 0, 0, 0, 0, 0, @VIPCode
        )`;
      const posResult = await transaction
        .request()
        .input("InvoiceNo", sql.Int, newInvoiceNo)
        .input("UserCode", sql.Int, userCode)
        .input("TableNo", sql.NVarChar, vipTableNo)
        .input("Notes", sql.NVarChar, notes || "")
        .input("DineIn", sql.Bit, dineIn ? 1 : 0)
        .input("TakeOut", sql.Bit, takeOut ? 1 : 0)
        .input("VIPCode", sql.Int, VIPCode)
        .query(insertPosQuery);

      posCode = posResult.recordset[0].POSCode;
      console.log("Order Accept: New order created, POSCode:", posCode, "InvoiceNo:", newInvoiceNo);

      // Update deviceOrderMap
      deviceOrderMap.set(deviceId, [
        ...existingOrders.filter((order) => order.TableNo !== vipTableNo || order.InvoiceNo !== newInvoiceNo),
        { POSCode: posCode, InvoiceNo: newInvoiceNo, TableNo: vipTableNo, Posted: 0, createdAt: new Date() },
      ]);
    }

    // Fetch existing TPosDetails for the POSCode
    const existingDetailsQuery = `
      SELECT ProductCode, Qty, Price, Notes, Done, PosDetailsCode
      FROM TPosDetails
      WHERE PosCode = @PosCode`;
    const existingDetailsResult = await transaction
      .request()
      .input("PosCode", sql.Int, posCode)
      .query(existingDetailsQuery);

    const items = existingDetailsResult.recordset.map((detail) => ({
      PosDetailsCode: detail.PosDetailsCode,
      ProductCode: detail.ProductCode.toString(),
      Qty: parseFloat(detail.Qty),
      Price: parseFloat(detail.Price),
      Notes: detail.Notes || "",
      Done: detail.Done,
    }));

    const errors = [];
    for (const item of cart) {
      const { productCode, quantity, price } = item;
      if (!productCode || isNaN(quantity) || quantity <= 0 || isNaN(price)) {
        errors.push(`Invalid item data for productCode: ${productCode}`);
        console.warn("Order Accept: Invalid item skipped", { productCode, quantity, price });
        continue;
      }

      const productQuery = `SELECT Product, CategoryCode FROM aTProduct WHERE ProductCode = @ProductCode AND Active = 1`;
      const productResult = await transaction
        .request()
        .input("ProductCode", sql.Int, parseInt(productCode))
        .query(productQuery);

      if (productResult.recordset.length === 0) {
        errors.push(`Product not found or inactive: ${productCode}`);
        console.warn("Order Accept: Product not found", { productCode });
        continue;
      }

      const product = productResult.recordset[0];
      console.log("Order Accept: Processing item", { productCode, quantity, price, productName: product.Product });

      // Insert new TPosDetails entry with total quantity
      const insertDetailsQuery = `
        INSERT INTO TPosDetails (PosCode, ProductCode, Qty, Price, Notes, Grams, Subtotal, Done)
        OUTPUT INSERTED.PosDetailsCode
        VALUES (@PosCode, @ProductCode, @Qty, @Price, @Notes, 0, @Subtotal, 0)`;
      const detailResult = await transaction
        .request()
        .input("PosCode", sql.Int, posCode)
        .input("ProductCode", sql.Int, parseInt(productCode))
        .input("Qty", sql.Float, parseFloat(quantity))
        .input("Price", sql.Float, parseFloat(price))
        .input("Notes", sql.NVarChar, notes || "")
        .input("Subtotal", sql.Float, parseFloat(quantity) * parseFloat(price))
        .query(insertDetailsQuery);

      console.log("Order Accept: Inserted new item", { productCode, quantity, posDetailsCode: detailResult.recordset[0].PosDetailsCode });

      // Add item to response
      items.push({
        PosDetailsCode: detailResult.recordset[0].PosDetailsCode,
        ProductCode: productCode,
        Qty: parseFloat(quantity),
        Price: parseFloat(price),
        Notes: notes || "",
        Done: 0,
      });
    }

    if (errors.length > 0) {
      await transaction.rollback();
      console.error("Order Accept: Transaction rolled back due to errors", { errors });
      return res.status(400).json({ status: "error", message: "Some items could not be processed", errors });
    }

    await transaction.commit();
    console.log("Order Accept: Transaction committed, order accepted for POSCode:", posCode, "tableNo:", vipTableNo, "deviceId:", deviceId, "invoiceNo:", newInvoiceNo);
    res.json({ status: "success", order: { POSCode: posCode, InvoiceNo: newInvoiceNo, TableNo: tableNo, items } });
  } catch (error) {
    console.error("Order Accept Error:", {
      message: error.message,
      stack: error.stack,
      query: error.originalError?.info?.message || "No query info",
      tableNo,
      deviceId,
      invoiceNo,
    });
    try {
      await transaction.rollback();
      console.log("Order Accept: Transaction rolled back due to error");
    } catch (rollbackError) {
      console.error("Order Accept: Rollback failed", { message: rollbackError.message });
    }
    res.status(500).json({ status: "error", message: "Failed to process order", error: error.message });
  }
});

// Existing endpoints for categories, stocks, and price remain unchanged
router.get("/categories", async (req, res) => {
  try {
    const pool = await poolPromise;
    if (!pool) {
      console.error("Categories Fetch: Database connection failed");
      return res.status(500).json({ status: "error", message: "Database connection failed" });
    }

    const query = `SELECT CategoryCode, Category FROM aTCategory WHERE Active = 1`;
    const result = await pool.request().query(query);

    if (!result.recordset) {
      console.warn("Categories Fetch: No records returned, but no error");
      return res.json({ status: "success", categories: [] });
    }

    console.log(`Categories Fetch: Successfully retrieved ${result.recordset.length} categories`);
    res.json({ status: "success", categories: result.recordset });
  } catch (error) {
    console.error("Categories Fetch Error:", { message: error.message, stack: error.stack });
    res.status(500).json({ status: "error", message: "Failed to fetch categories", error: error.message });
  }
});

router.get("/stocks/:categoryCode", async (req, res) => {
  const { categoryCode } = req.params;

  try {
    const pool = await poolPromise;
    if (!pool) {
      console.error("Stocks Fetch: Database connection failed");
      return res.status(500).json({ status: "error", message: "Database connection failed" });
    }

    const query = `SELECT p.ProductCode, p.Product FROM aTProduct p WHERE p.CategoryCode = @categoryCode AND p.Active = 1`;
    const result = await pool
      .request()
      .input("categoryCode", sql.Int, parseInt(categoryCode))
      .query(query);

    if (!result.recordset) {
      console.warn(`Stocks Fetch: No products found for categoryCode ${categoryCode}`);
      return res.json({ status: "success", products: [] });
    }

    console.log(`Stocks Fetch: Retrieved ${result.recordset.length} products for categoryCode ${categoryCode}`);
    res.json({ status: "success", products: result.recordset });
  } catch (error) {
    console.error("Stocks Fetch Error:", { message: error.message, stack: error.stack, categoryCode });
    res.status(500).json({ status: "error", message: "Failed to fetch products", error: error.message });
  }
});

router.get("/stocks/:categoryCode/:productCode/price", async (req, res) => {
  const { productCode } = req.params;

  try {
    const pool = await poolPromise;
    if (!pool) {
      console.error("Price Fetch: Database connection failed");
      return res.status(500).json({ status: "error", message: "Database connection failed" });
    }

    const query = `SELECT SellingPrice AS price FROM aTProduct WHERE ProductCode = @ProductCode AND Active = 1`;
    const result = await pool
      .request()
      .input("ProductCode", sql.Int, parseInt(productCode))
      .query(query);

    if (!result.recordset || result.recordset.length === 0) {
      console.warn(`Price Fetch: No price found for productCode ${productCode}`);
      return res.json({ status: "success", price: 0 });
    }

    console.log(`Price Fetch: Retrieved price ${result.recordset[0].price} for productCode ${productCode}`);
    res.json({ status: "success", price: result.recordset[0].price });
  } catch (error) {
    console.error("Price Fetch Error:", { message: error.message, stack: error.stack, productCode });
    res.status(500).json({ status: "error", message: "Failed to fetch price", error: error.message });
  }
});

module.exports = router;