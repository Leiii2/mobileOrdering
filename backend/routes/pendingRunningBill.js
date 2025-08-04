const express = require("express");
const sql = require("mssql");
const { poolPromise } = require("../server");
const jwt = require("jsonwebtoken");

const router = express.Router();

// In-memory storage for pending orders
const pendingOrdersStore = new Map();

// Middleware to verify POS access (kept for endpoints that still need it)
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

// POST /pending-orders - Store a pending order from customer (no authentication required)
router.post("/pending-orders", async (req, res) => {
  console.log("POST /pending-orders: Received request", req.body);
  const { tableNo, items, notes, dineIn, takeOut, POSCode, InvoiceNo, timestamp } = req.body;

  if (!tableNo || !Array.isArray(items) || items.length === 0) {
    console.log("POST /pending-orders: Validation failed - missing tableNo or items");
    return res.status(400).json({ status: "error", message: "Table number and items are required" });
  }

  try {
    // Validate and format items
    const formattedItems = items.map((item) => ({
      ProductCode: item.ProductCode?.toString(),
      productName: item.productName && typeof item.productName === "string" ? item.productName : "Unknown Product",
      quantity: parseFloat(item.quantity) || 0,
      price: parseFloat(item.price) || 100,
    }));

    if (formattedItems.some(item => !item.ProductCode || item.quantity <= 0 || isNaN(item.price))) {
      console.log("POST /pending-orders: Invalid item data detected");
      return res.status(400).json({ status: "error", message: "Invalid item data" });
    }

    // Check for existing order with the same tableNo
    let existingOrder = null;
    for (const order of pendingOrdersStore.values()) {
      if (order.tableNo === tableNo.toString()) {
        existingOrder = order;
        break;
      }
    }

    let order;
    if (existingOrder) {
      // Merge items with existing order
      const mergedItems = [...existingOrder.items];
      formattedItems.forEach((newItem) => {
        const existingItem = mergedItems.find(item => item.ProductCode === newItem.ProductCode);
        if (existingItem) {
          existingItem.quantity += newItem.quantity;
        } else {
          mergedItems.push(newItem);
        }
      });

      // Update existing order
      order = {
        ...existingOrder,
        items: mergedItems,
        notes: notes || existingOrder.notes || "",
        dineIn: dineIn !== undefined ? !!dineIn : existingOrder.dineIn,
        takeOut: takeOut !== undefined ? !!takeOut : existingOrder.takeOut,
        timestamp: timestamp || new Date().toISOString(),
      };

      pendingOrdersStore.set(existingOrder.POSCode, order);
      console.log("POST /pending-orders: Updated existing order", order);
    } else {
      // Create new order
      order = {
        tableNo: tableNo.toString(),
        items: formattedItems,
        notes: notes || "",
        dineIn: dineIn !== undefined ? !!dineIn : true,
        takeOut: takeOut !== undefined ? !!takeOut : false,
        POSCode: POSCode || `local-${Date.now()}-${Math.random().toString(36).slice(2)}`,
        InvoiceNo: InvoiceNo || "N/A",
        timestamp: timestamp || new Date().toISOString(),
      };

      pendingOrdersStore.set(order.POSCode, order);
      console.log("POST /pending-orders: Created new order", order);
    }

    res.json({
      status: "success",
      message: "Order placed successfully",
      order,
    });
  } catch (error) {
    console.error("POST /pending-orders: Error", error);
    res.status(500).json({
      status: "error",
      message: error.message || "Failed to store pending order",
    });
  }
});

// GET /pending-orders - Fetch pending orders (no authentication required)
router.get("/pending-orders", async (req, res) => {
  console.log("GET /pending-orders: Received request", req.query);
  const { tableNo } = req.query;

  try {
    let orders = Array.from(pendingOrdersStore.values());

    if (tableNo) {
      orders = orders.filter(order => order.tableNo === tableNo.toString());
      console.log(`GET /pending-orders: Filtered by tableNo ${tableNo}, found ${orders.length} orders`);
    } else {
      console.log(`GET /pending-orders: Returning all orders, count: ${orders.length}`);
    }

    res.json({
      status: "success",
      orders,
    });
  } catch (error) {
    console.error("GET /pending-orders: Error", error);
    res.status(500).json({
      status: "error",
      message: error.message || "Failed to fetch pending orders",
    });
  }
});

// DELETE /pending-orders/:posCode - Remove a pending order (no authentication required)
router.delete("/pending-orders/:posCode", async (req, res) => {
  console.log("DELETE /pending-orders/:posCode: Received request", req.params);
  const { posCode } = req.params;

  try {
    if (!pendingOrdersStore.has(posCode)) {
      console.log(`DELETE /pending-orders/:posCode: Order with POSCode ${posCode} not found`);
      return res.status(400).json({ status: "error", message: `Order with POSCode ${posCode} not found` });
    }

    const order = pendingOrdersStore.get(posCode);
    pendingOrdersStore.delete(posCode);
    console.log(`DELETE /pending-orders/:posCode: Removed order with POSCode ${posCode}`);

    res.json({
      status: "success",
      message: `Pending order ${posCode} removed successfully`,
      tableNo: order.tableNo,
    });
  } catch (error) {
    console.error("DELETE /pending-orders/:posCode: Error", error);
    res.status(500).json({
      status: "error",
      message: error.message || "Failed to remove pending order",
    });
  }
});

// PATCH /pending-orders/:posCode - Remove a specific item from a pending order (no authentication required)
router.patch("/pending-orders/:posCode", async (req, res) => {
  console.log("PATCH /pending-orders/:posCode: Received request", { params: req.params, body: req.body });
  const { posCode } = req.params;
  const { removeProductCode } = req.body;

  if (!removeProductCode) {
    console.log("PATCH /pending-orders/:posCode: Missing removeProductCode");
    return res.status(400).json({ status: "error", message: "removeProductCode is required" });
  }

  try {
    if (!pendingOrdersStore.has(posCode)) {
      console.log(`PATCH /pending-orders/:posCode: Order with POSCode ${posCode} not found`);
      return res.status(400).json({ status: "error", message: `Order with POSCode ${posCode} not found` });
    }

    const order = pendingOrdersStore.get(posCode);
    const updatedItems = order.items.filter(item => item.ProductCode !== removeProductCode.toString());

    if (updatedItems.length === order.items.length) {
      console.log(`PATCH /pending-orders/:posCode: ProductCode ${removeProductCode} not found in order`);
      return res.status(400).json({ status: "error", message: `ProductCode ${removeProductCode} not found in order` });
    }

    if (updatedItems.length === 0) {
      // If no items remain, delete the order
      pendingOrdersStore.delete(posCode);
      console.log(`PATCH /pending-orders/:posCode: Removed last item, deleted order with POSCode ${posCode}`);
      return res.json({
        status: "success",
        message: `Order ${posCode} removed as it has no remaining items`,
        tableNo: order.tableNo,
      });
    }

    // Update the order with remaining items
    const updatedOrder = { ...order, items: updatedItems };
    pendingOrdersStore.set(posCode, updatedOrder);
    console.log(`PATCH /pending-orders/:posCode: Removed item ${removeProductCode} from order`, updatedOrder);

    res.json({
      status: "success",
      message: `Item ${removeProductCode} removed from order ${posCode}`,
      order: updatedOrder,
    });
  } catch (error) {
    console.error("PATCH /pending-orders/:posCode: Error", error);
    res.status(500).json({
      status: "error",
      message: error.message || "Failed to remove item from pending order",
    });
  }
});

// GET /pending - Return pending orders sent by the client from local storage
router.get("/pending", verifyPOS, async (req, res) => {
  console.log("GET /pending: Received request", req.query);
  const { tableNo, orders } = req.query;

  try {
    let pendingOrders = [];
    if (orders) {
      try {
        pendingOrders = JSON.parse(orders);
      } catch (error) {
        console.log("GET /pending: Invalid orders format in request");
        return res.status(400).json({
          status: "error",
          message: "Invalid orders format in request",
        });
      }
    }

    if (!Array.isArray(pendingOrders)) {
      console.log("GET /pending: Orders must be an array");
      return res.status(400).json({
        status: "error",
        message: "Orders must be an array",
      });
    }

    if (tableNo) {
      pendingOrders = pendingOrders.filter(
        (order) => order.TableNo === tableNo || order.TableNo === null
      );
      console.log(`GET /pending: Filtered by tableNo ${tableNo}, found ${pendingOrders.length} orders`);
    }

    const formattedOrders = pendingOrders.map((order) => ({
      POSCode: order.POSCode?.toString() || `local-${Date.now()}-${Math.random().toString(36).slice(2)}`,
      InvoiceNo: order.InvoiceNo || "N/A",
      TableNo: order.TableNo || null,
      TDate: order.TDate || new Date().toISOString(),
      Notes: order.Notes || "",
      DineIn: order.DineIn || 0,
      TakeOut: order.TakeOut || 0,
      cart: Array.isArray(order.cart)
        ? order.cart.map((item) => ({
            productCode: item.productCode?.toString() || "N/A",
            productName: item.productName && typeof item.productName === "string" ? item.productName : "Unknown Product",
            quantity: parseFloat(item.quantity) || 0,
            price: parseFloat(item.price),
          }))
        : [],
    }));

    res.json({
      status: "success",
      orders: formattedOrders,
    });
  } catch (error) {
    console.error("GET /pending: Error", error);
    res.status(500).json({
      status: "error",
      message: error.message || "Failed to fetch pending orders",
    });
  }
});

// DELETE /pending/:posCode - Remove a pending order
router.delete("/pending/:posCode", verifyPOS, async (req, res) => {
  console.log("DELETE /pending/:posCode: Received request", req.params);
  const { posCode } = req.params;
  const userCode = req.user.userCode;
  const userName = req.user.name || "Unknown User";

  let transaction;
  try {
    const pool = await poolPromise;
    transaction = new sql.Transaction(pool);
    await transaction.begin();

    // Validate that the order exists and Posted = 0
    const posQuery = `
      SELECT POSCode, InvoiceNo, Posted
      FROM dbo.TPos
      WHERE POSCode = @POSCode;
    `;
    const posResult = await new sql.Request(transaction)
      .input("POSCode", sql.Int, parseInt(posCode))
      .query(posQuery);

    if (posResult.recordset.length === 0) {
      console.log(`DELETE /pending/:posCode: Order with POSCode ${posCode} not found`);
      throw new Error(`Order with POSCode ${posCode} not found`);
    }

    const { Posted, InvoiceNo } = posResult.recordset[0];
    if (Posted !== 0) {
      console.log(`DELETE /pending/:posCode: Cannot remove order ${posCode}, already checked out`);
      throw new Error("Cannot remove order: It has already been checked out (Posted != 0)");
    }

    // Fetch items to restore stock
    const detailsQuery = `
      SELECT ProductCode, Qty
      FROM dbo.TPosDetails
      WHERE PosCode = @PosCode;
    `;
    const detailsResult = await new sql.Request(transaction)
      .input("PosCode", sql.Int, parseInt(posCode))
      .query(detailsQuery);

    const items = detailsResult.recordset.map((detail) => ({
      ProductCode: detail.ProductCode.toString(),
      quantity: parseFloat(detail.Qty),
    }));

    if (items.length === 0) {
      console.log(`DELETE /pending/:posCode: No items found for POSCode ${posCode}`);
      throw new Error(`No items found for POSCode ${posCode}`);
    }

    // Restore stock and log in trace tables
    for (const item of items) {
      const productCode = parseInt(item.ProductCode);
      const quantity = parseFloat(item.quantity);

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
        stockTable = "TStockOnHand";
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
          stockTable = "TStockOnHand2";
          currentStockOnHand = parseFloat(stockOnHand2Result.recordset[0].StockOnHand) || 0;
        } else {
          console.log(`DELETE /pending/:posCode: No stock record for ProductCode ${productCode}`);
          throw new Error(`No stock record found for ProductCode ${productCode}`);
        }
      }

      const newStockOnHand = currentStockOnHand + quantity;

      const updateStockQuery = `
        UPDATE dbo.${stockTable}
        SET StockOnHand = @NewStockOnHand
        WHERE ProductCode = @ProductCode;
      `;
      await new sql.Request(transaction)
        .input("NewStockOnHand", sql.Money, newStockOnHand)
        .input("ProductCode", sql.Int, productCode)
        .query(updateStockQuery);
      console.log(`DELETE /pending/:posCode: Restored stock for ProductCode ${productCode} to ${newStockOnHand}`);

      // Log stock restoration
      let targetTraceTable = stockTable === "TStockOnHand" ? "TStockOnHandTraceUp" : "TStockOnHandTraceUp2";
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
        SET IDENTITY_INSERT dbo.${targetTraceTable} ON;
        INSERT INTO dbo.${targetTraceTable} (
          StockOnHandTraceUpCode, ProductCode, TransactionType, TDate, Qty,
          Remaining, UserCode, Remarks
        )
        VALUES (
          @StockOnHandTraceUpCode, @ProductCode, @TransactionType, @TDate, @Qty,
          @Remaining, @UserCode, @Remarks
        );
        SET IDENTITY_INSERT dbo.${targetTraceTable} OFF;
      `;
      await new sql.Request(transaction)
        .input("StockOnHandTraceUpCode", sql.Int, newStockOnHandTraceUpCode)
        .input("ProductCode", sql.Int, productCode)
        .input("TransactionType", sql.NVarChar(50), "CANCEL_PENDING")
        .input("TDate", sql.DateTime, new Date())
        .input("Qty", sql.Money, quantity)
        .input("Remaining", sql.Money, newStockOnHand)
        .input("UserCode", sql.Int, userCode)
        .input("Remarks", sql.NText, `Removed pending order Invoice No: ${InvoiceNo}`)
        .query(stockTraceInsertQuery);
      console.log(`DELETE /pending/:posCode: Logged stock restoration for ProductCode ${productCode}`);
    }

    // Delete from TPosDetails
    const deleteDetailsQuery = `
      DELETE FROM dbo.TPosDetails
      WHERE PosCode = @PosCode;
    `;
    await new sql.Request(transaction)
      .input("PosCode", sql.Int, parseInt(posCode))
      .query(deleteDetailsQuery);
    console.log(`DELETE /pending/:posCode: Deleted TPosDetails for POSCode ${posCode}`);

    // Delete from TTempKitchenPrint
    const deleteKitchenQuery = `
      DELETE FROM dbo.TTempKitchenPrint
      WHERE POSCode = @POSCode;
    `;
    await new sql.Request(transaction)
      .input("POSCode", sql.Int, parseInt(posCode))
      .query(deleteKitchenQuery);
    console.log(`DELETE /pending/:posCode: Deleted TTempKitchenPrint for POSCode ${posCode}`);

    // Delete from TPos
    const deletePosQuery = `
      DELETE FROM dbo.TPos
      WHERE POSCode = @POSCode;
    `;
    await new sql.Request(transaction)
      .input("PosCode", sql.Int, parseInt(posCode))
      .query(deletePosQuery);
    console.log(`DELETE /pending/:posCode: Deleted TPos for POSCode ${posCode}`);

    await transaction.commit();
    console.log(`DELETE /pending/:posCode: Transaction committed for POSCode ${posCode}`);

    res.json({
      status: "success",
      message: `Pending order ${posCode} removed successfully`,
      invoiceNo: InvoiceNo,
    });
  } catch (error) {
    if (transaction) await transaction.rollback();
    console.error("DELETE /pending/:posCode: Error", error);
    res.status(error.message.includes("Invalid") || error.message.includes("not found") ? 400 : 500).json({
      status: "error",
      message: error.message || "Failed to remove pending order",
    });
  }
});

// GET /running-bills - Fetch running bills for client-side validation
router.get("/running-bills", verifyPOS, async (req, res) => {
  console.log("GET /running-bills: Received request", req.query);
  const { tableNo, posCode, invoiceNo } = req.query;

  // Require at least one of posCode, invoiceNo, or tableNo to prevent fetching all Posted = 0 bills
  if (!posCode && !invoiceNo && !tableNo) {
    console.log("GET /running-bills: Missing required query parameter");
    return res.status(400).json({ status: "error", message: "At least one of posCode, invoiceNo, or tableNo is required" });
  }

  try {
    const pool = await poolPromise;
    let posQuery = `
      SELECT POSCode, InvoiceNo, TableNo, Notes, TDate, DineIn, TakeOut, Posted
      FROM dbo.TPos
      WHERE Posted = 0
    `;
    const posRequest = new sql.Request(pool);
    if (tableNo) {
      posQuery += ` AND TableNo = @TableNo`;
      posRequest.input("TableNo", sql.NVarChar(50), tableNo);
    }
    if (posCode) {
      posQuery += ` AND POSCode = @POSCode`;
      posRequest.input("POSCode", sql.Int, parseInt(posCode));
    }
    if (invoiceNo) {
      posQuery += ` AND InvoiceNo = @InvoiceNo`;
      posRequest.input("InvoiceNo", sql.NVarChar(50), invoiceNo);
    }
    posQuery += ` ORDER BY TDate DESC;`;

    const posResult = await posRequest.query(posQuery);
    console.log("GET /running-bills: Fetched TPos records", posResult.recordset.length);

    const runningBills = await Promise.all(
      posResult.recordset.map(async (pos) => {
        const detailsQuery = `
          SELECT ProductCode, SUM(Qty) as Qty, MAX(Price) as Price, SUM(Subtotal) as Subtotal, MAX(Notes) as Notes
          FROM dbo.TPosDetails
          WHERE PosCode = @PosCode
          GROUP BY ProductCode;
        `;
        const detailsResult = await new sql.Request(pool)
          .input("PosCode", sql.Int, pos.POSCode)
          .query(detailsQuery);

        const items = await Promise.all(
          detailsResult.recordset.map(async (detail) => {
            const productQuery = `
              SELECT Product
              FROM dbo.aTProduct
              WHERE ProductCode = @ProductCode AND Active = 1;
            `;
            const productResult = await new sql.Request(pool)
              .input("ProductCode", sql.Int, detail.ProductCode)
              .query(productQuery);

            return {
              productCode: detail.ProductCode.toString(),
              productName: productResult.recordset[0]?.Product && typeof productResult.recordset[0].Product === "string"
                ? productResult.recordset[0].Product
                : "Unknown Product",
              quantity: parseFloat(detail.Qty),
              price: parseFloat(detail.Price),
              subtotal: parseFloat(detail.Subtotal),
            };
          })
        );

        const totalAmount = items
          .reduce((sum, item) => sum + item.subtotal, 0)
          .toFixed(2);

        return {
          POSCode: pos.POSCode.toString(),
          invoiceNo: pos.InvoiceNo,
          tableNo: pos.TableNo,
          notes: pos.Notes || "",
          timestamp: pos.TDate.toISOString(),
          dineIn: pos.DineIn,
          takeOut: pos.TakeOut,
          posted: pos.Posted,
          items,
          totalAmount,
        };
      })
    );

    console.log("GET /running-bills: Returning running bills", runningBills.length);
    res.json({
      status: "success",
      runningBills,
    });
  } catch (error) {
    console.error("GET /running-bills: Error", error);
    res.status(500).json({
      status: "error",
      message: error.message || "Failed to fetch running bills",
    });
  }
});

// DELETE /running-bills/remove/:posCode - Cancel a running bill
router.delete("/running-bills/remove/:posCode", verifyPOS, async (req, res) => {
  console.log("DELETE /running-bills/remove/:posCode: Received request", req.params, req.body);
  const { posCode } = req.params;
  const { items } = req.body;
  const userCode = req.user.userCode;
  const userName = req.user.name || "Unknown User";

  if (!Array.isArray(items) || items.length === 0) {
    console.log("DELETE /running-bills/remove/:posCode: Invalid items array");
    return res.status(400).json({ status: "error", message: "Items array is empty or invalid" });
  }

  let transaction;
  try {
    const pool = await poolPromise;
    transaction = new sql.Transaction(pool);
    await transaction.begin();

    // Validate that the order exists and Posted = 0
    const posQuery = `
      SELECT POSCode, InvoiceNo, Posted
      FROM dbo.TPos
      WHERE POSCode = @POSCode;
    `;
    const posResult = await new sql.Request(transaction)
      .input("POSCode", sql.Int, parseInt(posCode))
      .query(posQuery);

    if (posResult.recordset.length === 0) {
      console.log(`DELETE /running-bills/remove/:posCode: Order with POSCode ${posCode} not found`);
      throw new Error(`Order with POSCode ${posCode} not found`);
    }

    const { Posted, InvoiceNo } = posResult.recordset[0];
    if (Posted !== 0) {
      console.log(`DELETE /running-bills/remove/:posCode: Order already checked out`);
      throw new Error("Cannot cancel order: It has already been checked out (Posted != 0)");
    }

    // Validate items against TPosDetails
    const detailsQuery = `
      SELECT ProductCode, SUM(Qty) as Qty
      FROM dbo.TPosDetails
      WHERE PosCode = @PosCode
      GROUP BY ProductCode;
    `;
    const detailsResult = await new sql.Request(transaction)
      .input("PosCode", sql.Int, parseInt(posCode))
      .query(detailsQuery);

    const dbItems = detailsResult.recordset.map((detail) => ({
      ProductCode: detail.ProductCode.toString(),
      quantity: parseFloat(detail.Qty),
    }));

    const requestItems = items.map((item) => ({
      ProductCode: item.ProductCode.toString(),
      quantity: parseFloat(item.quantity),
    }));

    const itemsMatch = requestItems.every((reqItem) =>
      dbItems.some(
        (dbItem) =>
          dbItem.ProductCode === reqItem.ProductCode &&
          Math.abs(dbItem.quantity - reqItem.quantity) < 0.0001
      )
    ) && dbItems.every((dbItem) =>
      requestItems.some(
        (reqItem) =>
          reqItem.ProductCode === dbItem.ProductCode &&
          Math.abs(dbItem.quantity - reqItem.quantity) < 0.0001
      )
    );

    if (!itemsMatch) {
      console.log("DELETE /running-bills/remove/:posCode: Items do not match database records");
      throw new Error("Provided items do not match database records");
    }

    // Delete from TPosDetails
    const deleteDetailsQuery = `
      DELETE FROM dbo.TPosDetails
      WHERE PosCode = @PosCode;
    `;
    await new sql.Request(transaction)
      .input("PosCode", sql.Int, parseInt(posCode))
      .query(deleteDetailsQuery);
    console.log(`DELETE /running-bills/remove/:posCode: Deleted TPosDetails for POSCode ${posCode}`);

    // Delete from TTempKitchenPrint
    const deleteKitchenQuery = `
      DELETE FROM dbo.TTempKitchenPrint
      WHERE POSCode = @POSCode;
    `;
    await new sql.Request(transaction)
      .input("PosCode", sql.Int, parseInt(posCode))
      .query(deleteKitchenQuery);
    console.log(`DELETE /running-bills/remove/:posCode: Deleted TTempKitchenPrint for POSCode ${posCode}`);

    // Delete from TPos
    const deletePosQuery = `
      DELETE FROM dbo.TPos
      WHERE POSCode = @POSCode;
    `;
    await new sql.Request(transaction)
      .input("PosCode", sql.Int, parseInt(posCode))
      .query(deletePosQuery);
    console.log(`DELETE /running-bills/remove/:posCode: Deleted TPos for POSCode ${posCode}`);

    // Restore stock in TStockOnHand or TStockOnHand2 and log in trace tables
    for (const item of requestItems) {
      const productCode = parseInt(item.ProductCode);
      const quantity = parseFloat(item.quantity);

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
        stockTable = "TStockOnHand";
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
          stockTable = "TStockOnHand2";
          currentStockOnHand = parseFloat(stockOnHand2Result.recordset[0].StockOnHand) || 0;
        }
      }

      if (!stockTable) {
        console.log(`DELETE /running-bills/remove/:posCode: No stock record for ProductCode ${productCode}`);
        throw new Error(`ProductCode ${productCode} not found in TStockOnHand or TStockOnHand2`);
      }

      const newStockOnHand = currentStockOnHand + quantity;

      const updateStockQuery = `
        UPDATE dbo.${stockTable}
        SET StockOnHand = @NewStockOnHand
        WHERE ProductCode = @ProductCode;
      `;
      await new sql.Request(transaction)
        .input("NewStockOnHand", sql.Money, newStockOnHand)
        .input("ProductCode", sql.Int, productCode)
        .query(updateStockQuery);
      console.log(`DELETE /running-bills/remove/:posCode: Restored stock for ProductCode ${productCode} to ${newStockOnHand}`);

      // Log stock restoration in trace table
      let targetTraceTable = stockTable === "TStockOnHand" ? "TStockOnHandTraceUp" : "TStockOnHandTraceUp2";
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
        SET IDENTITY_INSERT dbo.${targetTraceTable} ON;
        INSERT INTO dbo.${targetTraceTable} (
          StockOnHandTraceUpCode, ProductCode, TransactionType, TDate, Qty,
          Remaining, UserCode, Remarks
        )
        VALUES (
          @StockOnHandTraceUpCode, @ProductCode, @TransactionType, @TDate, @Qty,
          @Remaining, @UserCode, @Remarks
        );
        SET IDENTITY_INSERT dbo.${targetTraceTable} OFF;
      `;
      await new sql.Request(transaction)
        .input("StockOnHandTraceUpCode", sql.Int, newStockOnHandTraceUpCode)
        .input("ProductCode", sql.Int, productCode)
        .input("TransactionType", sql.NVarChar(50), "CANCEL_SALES")
        .input("TDate", sql.DateTime, new Date())
        .input("Qty", sql.Money, quantity)
        .input("Remaining", sql.Money, newStockOnHand)
        .input("UserCode", sql.Int, userCode)
        .input("Remarks", sql.NText, `Cancelled Invoice No: ${InvoiceNo}`)
        .query(stockTraceInsertQuery);
      console.log(`DELETE /running-bills/remove/:posCode: Logged stock restoration for ProductCode ${productCode}`);
    }

    await transaction.commit();
    console.log(`DELETE /running-bills/remove/:posCode: Transaction committed for POSCode ${posCode}`);

    res.json({
      status: "success",
      message: `Running bill ${posCode} cancelled successfully`,
      invoiceNo: InvoiceNo,
    });
  } catch (error) {
    if (transaction) await transaction.rollback();
    console.error("DELETE /running-bills/remove/:posCode: Error", error);
    res.status(error.message.includes("Invalid") || error.message.includes("not found") || error.message.includes("do not match") ? 400 : 500).json({
      status: "error",
      message: error.message || "Failed to cancel running bill",
    });
  }
});

// DELETE /cancel-order - Cancel an accepted order using invoiceNo
// DELETE /cancel-order - Cancel an accepted order using invoiceNo
router.delete("/cancel-order", verifyPOS, async (req, res) => {
  console.log("DELETE /cancel-order: Received request", req.body);
  const { invoiceNo } = req.body;
  const userCode = req.user.userCode;
  const userName = req.user.name || "Unknown User";

  if (!invoiceNo) {
    console.log("DELETE /cancel-order: Missing invoiceNo");
    return res.status(400).json({ status: "error", message: "Invoice number is required." });
  }

  let transaction;
  try {
    const pool = await poolPromise;
    transaction = new sql.Transaction(pool);
    await transaction.begin();

    // Step 1: Find POSCode from TPos using the provided invoiceNo
    const posResult = await new sql.Request(transaction)
      .input("InvoiceNo", sql.NVarChar, invoiceNo)
      .query("SELECT POSCode FROM dbo.TPos WHERE InvoiceNo = @InvoiceNo AND Posted = 0");
    if (posResult.recordset.length === 0) {
      console.log(`DELETE /cancel-order: No matching order found for InvoiceNo ${invoiceNo}`);
      throw new Error("No matching order found or order already checked out.");
    }
    const posCode = posResult.recordset[0].POSCode;

    // Step 2: Fetch details before deletion
    const detailsResult = await new sql.Request(transaction)
      .input("POSCode", sql.Int, posCode)
      .query("SELECT ProductCode, SUM(Qty) as Qty FROM dbo.TPosDetails WHERE PosCode = @POSCode GROUP BY ProductCode");

    // Step 3: Delete from TPos
    await new sql.Request(transaction)
      .input("POSCode", sql.Int, posCode)
      .query("DELETE FROM dbo.TPos WHERE POSCode = @POSCode");
    console.log(`DELETE /cancel-order: Deleted TPos for POSCode ${posCode}`);

    // Step 4: Delete from TPosDetails
    await new sql.Request(transaction)
      .input("POSCode", sql.Int, posCode)
      .query("DELETE FROM dbo.TPosDetails WHERE PosCode = @POSCode");
    console.log(`DELETE /cancel-order: Deleted TPosDetails for POSCode ${posCode}`);

    // Step 5: Delete from TTempKitchenPrint
    await new sql.Request(transaction)
      .input("POSCode", sql.Int, posCode)
      .query("DELETE FROM dbo.TTempKitchenPrint WHERE PosCode = @POSCode");
    console.log(`DELETE /cancel-order: Deleted TTempKitchenPrint for POSCode ${posCode}`);

    // Step 6: Restore stock and log new trace entries
    for (const detail of detailsResult.recordset) {
      const { ProductCode, Qty } = detail;
      const quantity = parseFloat(Qty);

      // Determine which stock table to use
      const stockTableResult = await new sql.Request(transaction)
        .input("ProductCode", sql.Int, parseInt(ProductCode))
        .query(`
          SELECT 'TStockOnHand' AS StockTable, StockOnHand
          FROM dbo.TStockOnHand
          WHERE ProductCode = @ProductCode
          UNION ALL
          SELECT 'TStockOnHand2' AS StockTable, StockOnHand
          FROM dbo.TStockOnHand2
          WHERE ProductCode = @ProductCode
        `);
      if (stockTableResult.recordset.length === 0) {
        console.log(`DELETE /cancel-order: No stock record for ProductCode ${ProductCode}`);
        throw new Error(`No stock record found for ProductCode ${ProductCode}`);
      }
      const { StockTable, StockOnHand } = stockTableResult.recordset[0];
      const currentStockOnHand = parseFloat(StockOnHand) || 0;

      // Fetch the latest Remaining from TStockOnHandTraceUp2
      const latestTraceQuery = `
        SELECT TOP 1 Remaining
        FROM dbo.TStockOnHandTraceUp2
        WHERE ProductCode = @ProductCode
        ORDER BY StockOnHandTraceUpCode DESC
      `;
      const traceResult = await new sql.Request(transaction)
        .input("ProductCode", sql.Int, parseInt(ProductCode))
        .query(latestTraceQuery);
      const latestRemaining = traceResult.recordset.length > 0 ? parseFloat(traceResult.recordset[0].Remaining) || 0 : currentStockOnHand;
      const targetTraceTable = StockTable === 'TStockOnHand' ? 'TStockOnHandTraceUp' : 'TStockOnHandTraceUp2';

      // Calculate new stock and trace values
      const newStockOnHand = currentStockOnHand + quantity;
      const newRemaining = latestRemaining + quantity;

      // Update stock table
      await new sql.Request(transaction)
        .input("ProductCode", sql.Int, parseInt(ProductCode))
        .input("NewStockOnHand", sql.Float, newStockOnHand)
        .query(`
          UPDATE dbo.${StockTable}
          SET StockOnHand = @NewStockOnHand
          WHERE ProductCode = @ProductCode
        `);
      console.log(`DELETE /cancel-order: Restored stock for ProductCode ${ProductCode} to ${newStockOnHand}`);

      // Log stock restoration in trace table
      const maxCodeQuery = `
        SELECT ISNULL(MAX(StockOnHandTraceUpCode), 0) as maxCode
        FROM (
          SELECT StockOnHandTraceUpCode FROM dbo.TStockOnHandTraceUp
          UNION
          SELECT StockOnHandTraceUpCode FROM dbo.TStockOnHandTraceUp2
        ) AS CombinedCodes
      `;
      const maxCodeResult = await new sql.Request(transaction).query(maxCodeQuery);
      const newStockOnHandTraceUpCode = maxCodeResult.recordset[0].maxCode + 1;

      const stockTraceInsertQuery = `
        SET IDENTITY_INSERT dbo.${targetTraceTable} ON;
        INSERT INTO dbo.${targetTraceTable} (
          StockOnHandTraceUpCode, ProductCode, TransactionType, TDate, Qty,
          Remaining, UserCode, Remarks
        )
        VALUES (
          @StockOnHandTraceUpCode, @ProductCode, @TransactionType, @TDate, @Qty,
          @Remaining, @UserCode, @Remarks
        );
        SET IDENTITY_INSERT dbo.${targetTraceTable} OFF;
      `;
      await new sql.Request(transaction)
        .input("StockOnHandTraceUpCode", sql.Int, newStockOnHandTraceUpCode)
        .input("ProductCode", sql.Int, parseInt(ProductCode))
        .input("TransactionType", sql.NVarChar(50), "CANCEL_SALES")
        .input("TDate", sql.DateTime, new Date())
        .input("Qty", sql.Money, quantity)
        .input("Remaining", sql.Money, newRemaining)
        .input("UserCode", sql.Int, userCode)
        .input("Remarks", sql.NText, `Cancelled Invoice No: ${invoiceNo}`)
        .query(stockTraceInsertQuery);
      console.log(`DELETE /cancel-order: Logged stock restoration for ProductCode ${ProductCode} with Remaining ${newRemaining}`);
    }

    await transaction.commit();
    console.log(`DELETE /cancel-order: Transaction committed for InvoiceNo ${invoiceNo}`);

    res.json({ status: "success", message: `Order ${invoiceNo} canceled successfully.` });
  } catch (error) {
    if (transaction) await transaction.rollback();
    console.error("DELETE /cancel-order: Error", error);
    res.status(error.message.includes("not found") ? 400 : 500).json({
      status: "error",
      message: error.message || "Failed to cancel order.",
    });
  }
});

// POST /preview-discount - Preview discount calculations
router.post("/preview-discount", verifyPOS, async (req, res) => {
  console.log("POST /preview-discount: Received request", req.body);
  const { cart, discountCode, numberOfPax, numberOfSeniors } = req.body;

  if (!Array.isArray(cart) || cart.length === 0) {
    console.log("POST /preview-discount: Invalid cart");
    return res.status(400).json({ status: "error", message: "Cart is empty or invalid" });
  }

  const pax = parseInt(numberOfPax) || 0;
  const seniors = parseInt(numberOfSeniors) || 0;

  if (pax <= 0) {
    console.log("POST /preview-discount: Invalid number of customers");
    return res.status(400).json({ status: "error", message: "Number of customers must be greater than 0" });
  }
  if (seniors > pax) {
    console.log("POST /preview-discount: Number of seniors exceeds total customers");
    return res.status(400).json({ status: "error", message: "Number of seniors cannot exceed total number of customers" });
  }

  try {
    const pool = await poolPromise;

    let total = 0;
    for (const item of cart) {
      const quantity = parseFloat(item.quantity);
      const price = parseFloat(item.price);
      if (isNaN(quantity) || isNaN(price) || !item.productCode || isNaN(parseInt(item.productCode))) {
        console.log(`POST /preview-discount: Invalid item data for product ${item.productCode || 'N/A'}`);
        return res.status(400).json({ status: "error", message: `Invalid quantity, price, or productCode for product ${item.productCode || 'N/A'}` });
      }
      total += quantity * price;
    }

    const netOfVat = total / 1.12;
    const vat = total - netOfVat;

    let vatDiscount = 0;
    let percentageDiscount = 0;
    let discountPercentage = 0;

    if (!discountCode) {
      console.log("POST /preview-discount: No discount code provided, returning base calculations");
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
        console.log(`POST /preview-discount: Invalid or inactive discount code ${discountCode}`);
        return res.status(400).json({ status: "error", message: "Invalid or inactive discount code" });
      }

      discountPercentage = parseFloat(discountResult.recordset[0].Discount);
      if (isNaN(discountPercentage)) {
        console.log("POST /preview-discount: Invalid discount percentage in database");
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
        console.log(`POST /preview-discount: Invalid or inactive discount code ${discountCode}`);
        return res.status(400).json({ status: "error", message: "Invalid or inactive discount code" });
      }

      discountPercentage = parseFloat(discountResult.recordset[0].Discount);
      if (isNaN(discountPercentage)) {
        console.log("POST /preview-discount: Invalid discount percentage in database");
        return res.status(400).json({ status: "error", message: "Invalid discount percentage in database" });
      }
      percentageDiscount = (total / 1.12) * (discountPercentage / 100);
    }

    const totalDiscount = vatDiscount + percentageDiscount;
    const totalDue = total - totalDiscount;
    if (isNaN(totalDue)) {
      console.log("POST /preview-discount: Invalid total due calculation");
      return res.status(500).json({ status: "error", message: "Failed to calculate total due due to invalid calculations" });
    }

    console.log("POST /preview-discount: Returning discount calculations");
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
    console.error("POST /preview-discount: Error", error);
    res.status(500).json({ status: "error", message: error.message || "Failed to preview discount" });
  }
});

// POST /accept - Accept a pending order
router.post("/accept", verifyPOS, async (req, res) => {
  console.log("POST /accept: Received request", req.body);
  const { cart, tableNo, notes, dineIn, takeOut } = req.body;
  const userCode = req.user.userCode;
  const userName = req.user.name || "Unknown User";

  if (!Array.isArray(cart) || cart.length === 0) {
    console.log("POST /accept: Invalid cart");
    return res.status(400).json({ status: "error", message: "Cart is empty or invalid" });
  }

  if (dineIn === undefined || takeOut === undefined) {
    console.log("POST /accept: Missing DineIn or TakeOut");
    return res.status(400).json({ status: "error", message: "DineIn and TakeOut must be specified" });
  }

  if (dineIn && takeOut) {
    console.log("POST /accept: Order cannot be both DineIn and TakeOut");
    return res.status(400).json({ status: "error", message: "Order cannot be both DineIn and TakeOut" });
  }

  const tableNumber = tableNo !== undefined && tableNo !== null ? parseInt(tableNo) : null;
  const notesText = notes || "";
  const isDineIn = dineIn ? 1 : 0;
  const isTakeOut = takeOut ? 1 : 0;

  let transaction;
  let newPOSCode, newInvoiceNo;
  const allItems = [];

  try {
    const pool = await poolPromise;
    transaction = new sql.Transaction(pool);

    for (const [index, item] of cart.entries()) {
      await transaction.begin();
      console.log(`POST /accept: Processing item ${index + 1} of ${cart.length}:`, item);

      const productCode = parseInt(item.productCode);
      const quantity = parseFloat(item.quantity);
      const price = parseFloat(item.price);

      if (isNaN(productCode) || isNaN(quantity) || isNaN(price) || quantity <= 0) {
        console.log(`POST /accept: Validation error for item ${index + 1}`, { productCode, quantity, price });
        await transaction.rollback();
        continue; // Skip to next item
      }

      const productQuery = `
        SELECT Product
        FROM dbo.aTProduct
        WHERE ProductCode = @ProductCode AND Active = 1;
      `;
      const productResult = await new sql.Request(transaction)
        .input("ProductCode", sql.Int, productCode)
        .query(productQuery);
      console.log(`POST /accept: Product query result for ProductCode ${productCode}`, productResult.recordset);

      if (productResult.recordset.length === 0) {
        console.log(`POST /accept: Product with ProductCode ${productCode} not found or inactive`);
        await transaction.rollback();
        continue; // Skip to next item
      }

      const productName = productResult.recordset[0].Product && typeof productResult.recordset[0].Product === "string"
        ? productResult.recordset[0].Product
        : "Unknown Product";

      if (tableNumber) {
        console.log(`POST /accept: Checking existing order for tableNumber ${tableNumber}`);
        const existingOrderQuery = `
          SELECT TOP 1 POSCode, InvoiceNo
          FROM dbo.TPos
          WHERE TableNo = @TableNo AND Posted = 0;
        `;
        const existingOrderResult = await new sql.Request(transaction)
          .input("TableNo", sql.NVarChar(50), tableNumber.toString())
          .query(existingOrderQuery);
        console.log("POST /accept: Existing order check result", existingOrderResult.recordset);

        if (existingOrderResult.recordset.length > 0) {
          newPOSCode = existingOrderResult.recordset[0].POSCode;
          newInvoiceNo = existingOrderResult.recordset[0].InvoiceNo;
          console.log("POST /accept: Reusing existing POSCode and InvoiceNo", { newPOSCode, newInvoiceNo });
        } else {
          console.log("POST /accept: Creating new TPos entry");
          const invoiceQuery = `
            SELECT ISNULL(MAX(CAST(InvoiceNo AS INT)), 0) as maxInvoiceNo
            FROM dbo.TPos;
          `;
          const invoiceResult = await new sql.Request(transaction).query(invoiceQuery);
          newInvoiceNo = invoiceResult.recordset[0].maxInvoiceNo + 1;
          console.log("POST /accept: Generated new InvoiceNo", newInvoiceNo);

          const invoiceCheckQuery = `
            SELECT COUNT(*) as count
            FROM dbo.TPos
            WHERE InvoiceNo = @InvoiceNo;
          `;
          const invoiceCheckResult = await new sql.Request(transaction)
            .input("InvoiceNo", sql.NVarChar(50), newInvoiceNo.toString())
            .query(invoiceCheckQuery);
          console.log("POST /accept: InvoiceNo uniqueness check", invoiceCheckResult.recordset);

          if (invoiceCheckResult.recordset[0].count > 0) {
            console.log(`POST /accept: InvoiceNo ${newInvoiceNo} already exists`);
            await transaction.rollback();
            continue; // Skip to next item
          }

          const posInsertQuery = `
            INSERT INTO dbo.TPos (
              InvoiceNo, TDate, TTime, UserCode, TableNo, Notes, Posted, DineIn, TakeOut
            )
            OUTPUT inserted.POSCode
            VALUES (
              @InvoiceNo, @TDate, @TTime, @UserCode, @TableNo, @Notes, @Posted, @DineIn, @TakeOut
            );
          `;
          const posResult = await new sql.Request(transaction)
            .input("InvoiceNo", sql.NVarChar(50), newInvoiceNo.toString())
            .input("TDate", sql.DateTime, new Date())
            .input("TTime", sql.DateTime, new Date())
            .input("UserCode", sql.Int, userCode)
            .input("TableNo", sql.NVarChar(50), tableNumber.toString())
            .input("Notes", sql.NVarChar(100), notesText)
            .input("Posted", sql.Bit, 0)
            .input("DineIn", sql.Bit, isDineIn)
            .input("TakeOut", sql.Bit, isTakeOut)
            .query(posInsertQuery);
          newPOSCode = posResult.recordset[0].POSCode;
          console.log("POST /accept: New POSCode created", newPOSCode);
        }
      } else {
        console.log("POST /accept: Processing order without tableNumber");
        const invoiceQuery = `
          SELECT ISNULL(MAX(CAST(InvoiceNo AS INT)), 0) as maxInvoiceNo
          FROM dbo.TPos;
        `;
        const invoiceResult = await new sql.Request(transaction).query(invoiceQuery);
        newInvoiceNo = invoiceResult.recordset[0].maxInvoiceNo + 1;
        console.log("POST /accept: Generated new InvoiceNo", newInvoiceNo);

        const invoiceCheckQuery = `
          SELECT COUNT(*) as count
          FROM dbo.TPos
          WHERE InvoiceNo = @InvoiceNo;
        `;
        const invoiceCheckResult = await new sql.Request(transaction)
          .input("InvoiceNo", sql.NVarChar(50), newInvoiceNo.toString())
          .query(invoiceCheckQuery);
        console.log("POST /accept: InvoiceNo uniqueness check", invoiceCheckResult.recordset);

        if (invoiceCheckResult.recordset[0].count > 0) {
          console.log(`POST /accept: InvoiceNo ${newInvoiceNo} already exists`);
          await transaction.rollback();
          continue; // Skip to next item
        }

        const posInsertQuery = `
          INSERT INTO dbo.TPos (
            InvoiceNo, TDate, TTime, UserCode, TableNo, Notes, Posted, DineIn, TakeOut
          )
          OUTPUT inserted.POSCode
          VALUES (
            @InvoiceNo, @TDate, @TTime, @UserCode, @TableNo, @Notes, @Posted, @DineIn, @TakeOut
          );
        `;
        const posResult = await new sql.Request(transaction)
          .input("InvoiceNo", sql.NVarChar(50), newInvoiceNo.toString())
          .input("TDate", sql.DateTime, new Date())
          .input("TTime", sql.DateTime, new Date())
          .input("UserCode", sql.Int, userCode)
          .input("TableNo", sql.NVarChar(50), null)
          .input("Notes", sql.NVarChar(100), notesText)
          .input("Posted", sql.Bit, 0)
          .input("DineIn", sql.Bit, isDineIn)
          .input("TakeOut", sql.Bit, isTakeOut)
          .query(posInsertQuery);
        newPOSCode = posResult.recordset[0].POSCode;
        console.log("POST /accept: New POSCode created", newPOSCode);
      }

      // Insert into TPosDetails
      const subtotal = quantity * price;
      const detailsInsertQuery = `
        INSERT INTO dbo.TPosDetails (PosCode, ProductCode, Qty, Price, Notes, Grams, Subtotal)
        VALUES (@PosCode, @ProductCode, @Qty, @Price, @Notes, @Grams, @Subtotal);
      `;
      await new sql.Request(transaction)
        .input("PosCode", sql.Int, newPOSCode)
        .input("ProductCode", sql.Int, productCode)
        .input("Qty", sql.Money, quantity)
        .input("Price", sql.Money, price)
        .input("Notes", sql.NVarChar(100), notesText)
        .input("Grams", sql.Int, 0)
        .input("Subtotal", sql.Money, subtotal)
        .query(detailsInsertQuery);
      console.log(`POST /accept: Inserted item ${index + 1} into TPosDetails with POSCode ${newPOSCode}`);

      // Stock update
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
        stockTable = "TStockOnHand";
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
          stockTable = "TStockOnHand2";
          currentStockOnHand = parseFloat(stockOnHand2Result.recordset[0].StockOnHand) || 0;
        }
      }
      console.log(`POST /accept: Stock check for ProductCode ${productCode}`, { stockTable, currentStockOnHand });
      let newStockOnHand = currentStockOnHand - quantity;
      if (stockTable) {
        const updateStockQuery = `
          UPDATE dbo.${stockTable}
          SET StockOnHand = @NewStockOnHand
          WHERE ProductCode = @ProductCode;
        `;
        await new sql.Request(transaction)
          .input("NewStockOnHand", sql.Money, newStockOnHand)
          .input("ProductCode", sql.Int, productCode)
          .query(updateStockQuery);
        console.log(`POST /accept: Updated stock for ProductCode ${productCode} to ${newStockOnHand}`);
      } else {
        newStockOnHand = 0 - quantity;
        console.log(`POST /accept: No stock table found for ProductCode ${productCode}, setting newStockOnHand to ${newStockOnHand}`);
      }

      // Log stock trace
      let targetTraceTable = stockTable === "TStockOnHand" ? "TStockOnHandTraceUp" : "TStockOnHandTraceUp2";
      if (!targetTraceTable) targetTraceTable = "TStockOnHandTraceUp2";
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
        SET IDENTITY_INSERT dbo.${targetTraceTable} ON;
        INSERT INTO dbo.${targetTraceTable} (
          StockOnHandTraceUpCode, ProductCode, TransactionType, TDate, Qty,
          Remaining, UserCode, Remarks
        )
        VALUES (
          @StockOnHandTraceUpCode, @ProductCode, @TransactionType, @TDate, @Qty,
          @Remaining, @UserCode, @Remarks
        );
        SET IDENTITY_INSERT dbo.${targetTraceTable} OFF;
      `;
      await new sql.Request(transaction)
        .input("StockOnHandTraceUpCode", sql.Int, newStockOnHandTraceUpCode)
        .input("ProductCode", sql.Int, productCode)
        .input("TransactionType", sql.NVarChar(50), "SALES")
        .input("TDate", sql.DateTime, new Date())
        .input("Qty", sql.Money, quantity)
        .input("Remaining", sql.Money, newStockOnHand)
        .input("UserCode", sql.Int, userCode)
        .input("Remarks", sql.NText, `Invoice No: ${newInvoiceNo}`)
        .query(stockTraceInsertQuery);
      console.log(`POST /accept: Logged stock trace for ProductCode ${productCode}`);

      // Kitchen print
      const kitchenProductQuery = `
        SELECT p.Product, c.Category
        FROM dbo.aTProduct p
        LEFT JOIN dbo.aTCategory c ON p.CategoryCode = c.CategoryCode
        WHERE p.ProductCode = @ProductCode AND p.Active = 1;
      `;
      const kitchenProductResult = await new sql.Request(transaction)
        .input("ProductCode", sql.Int, productCode)
        .query(kitchenProductQuery);
      if (kitchenProductResult.recordset.length === 0) {
        console.log(`POST /accept: Product with ProductCode ${productCode} not found or inactive for kitchen print`);
        await transaction.rollback();
        continue; // Skip to next item
      }
      const kitchenProductName = kitchenProductResult.recordset[0].Product && typeof kitchenProductResult.recordset[0].Product === "string"
        ? kitchenProductResult.recordset[0].Product
        : "Unknown Product";
      const categoryName = kitchenProductResult.recordset[0].Category || "Uncategorized";
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
      await new sql.Request(transaction)
        .input("TableNo", sql.NVarChar(50), tableNumber ? tableNumber.toString() : null)
        .input("POSCode", sql.Int, newPOSCode)
        .input("DineIn", sql.Bit, isDineIn)
        .input("TakeOut", sql.Bit, isTakeOut)
        .input("Notes", sql.NVarChar(200), notesText)
        .input("ProductCode", sql.Int, productCode)
        .input("Qty", sql.Int, quantity)
        .input("Done", sql.Bit, 0)
        .input("Product", sql.NVarChar(80), kitchenProductName)
        .input("Kitchen", sql.Bit, 0)
        .input("Category", sql.NVarChar(50), categoryName)
        .input("Name", sql.NVarChar(50), userName)
        .input("Grams", sql.Int, 0)
        .query(kitchenInsertQuery);
      console.log(`POST /accept: Inserted kitchen print for ProductCode ${productCode}`);

      await transaction.commit();
      console.log(`POST /accept: Transaction committed for item ${index + 1} with POSCode ${newPOSCode}`);

      // Add to response items
      allItems.push({
        productCode: productCode.toString(),
        productName,
        quantity,
        price,
        subtotal,
      });
    }

    // Fetch all items for the response to ensure consistency
    if (newPOSCode) {
      const allItemsQuery = `
        SELECT ProductCode, SUM(Qty) as Qty, MAX(Price) as Price, SUM(Subtotal) as Subtotal
        FROM dbo.TPosDetails
        WHERE PosCode = @PosCode
        GROUP BY ProductCode;
      `;
      const allItemsResult = await new sql.Request(pool)
        .input("PosCode", sql.Int, newPOSCode)
        .query(allItemsQuery);
      const finalItems = await Promise.all(
        allItemsResult.recordset.map(async (detail) => {
          const productQuery = `
            SELECT Product
            FROM dbo.aTProduct
            WHERE ProductCode = @ProductCode AND Active = 1;
          `;
          const productResult = await new sql.Request(pool)
            .input("ProductCode", sql.Int, detail.ProductCode)
            .query(productQuery);
          return {
            productCode: detail.ProductCode.toString(),
            productName: productResult.recordset[0]?.Product && typeof productResult.recordset[0].Product === "string"
              ? productResult.recordset[0].Product
              : "Unknown Product",
            quantity: parseFloat(detail.Qty),
            price: parseFloat(detail.Price),
            subtotal: parseFloat(detail.Subtotal),
          };
        })
      );
      allItems.push(...finalItems);
    }

    console.log("POST /accept: Returning response", { posCode: newPOSCode, invoiceNo: newInvoiceNo });
    res.json({
      status: "success",
      message: "Order accepted.",
      invoiceNo: newInvoiceNo?.toString() || null,
      posCode: newPOSCode?.toString() || null,
      items: allItems,
      tableNo: tableNumber?.toString() || null,
      notes: notesText,
      dineIn: isDineIn,
      takeOut: isTakeOut,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    if (transaction) {
      try {
        await transaction.rollback();
        console.log("POST /accept: Transaction rolled back due to error", error.message);
      } catch (rollbackError) {
        console.log("POST /accept: Error during rollback", rollbackError.message);
      }
    }
    console.error("POST /accept: Error", error);
    res.status(error.message.includes("Invalid") || error.message.includes("not found") || error.message.includes("exists") ? 400 : 500).json({
      status: "error",
      message: error.message || "Failed to accept order.",
    });
  }
});

module.exports = router;