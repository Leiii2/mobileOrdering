import React, { useState, useEffect, useRef } from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  FlatList,
  Alert,
  Platform,
  Modal,
  ScrollView,
} from "react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";
import axios from "axios";
import { useNavigation } from "@react-navigation/native";
import { Ionicons } from "@expo/vector-icons";
import { getAPIUrl } from "./config";
import styles from "./css/pendingOrdersScreen.styles";

const PendingOrdersScreen = ({ route }) => {
  const { acceptOrder } = route.params || {};
  const [tableNo, setTableNo] = useState("");
  const [pendingOrders, setPendingOrders] = useState([]);
  const [categories, setCategories] = useState([]);
  const [products, setProducts] = useState([]);
  const [filteredProducts, setFilteredProducts] = useState([]);
  const [selectedCategory, setSelectedCategory] = useState(null);
  const [manualOrderItems, setManualOrderItems] = useState([]);
  const [quantities, setQuantities] = useState({});
  const [orderNotes, setOrderNotes] = useState("");
  const [manualOrderTableNo, setManualOrderTableNo] = useState("");
  const [isDineIn, setIsDineIn] = useState(true);
  const [isTakeOut, setIsTakeOut] = useState(false);
  const [manualOrderModalVisible, setManualOrderModalVisible] = useState(false);
  const [editOrderModalVisible, setEditOrderModalVisible] = useState(false);
  const [kitchenOrderModalVisible, setKitchenOrderModalVisible] = useState(false);
  const [kitchenOrderContent, setKitchenOrderContent] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [serverName, setServerName] = useState("");
  const navigation = useNavigation();
  const searchInputRef = useRef(null);
  const categoryListRef = useRef(null);

  useEffect(() => {
    fetchCategories();
    fetchAllPendingOrders();
    loadServerName();
  }, []);

  useEffect(() => {
    if (!searchQuery || searchQuery.trim() === "") {
      setFilteredProducts(products);
    } else {
      const filtered = products.filter((product) =>
        product?.Product?.toLowerCase().includes(searchQuery.toLowerCase())
      );
      setFilteredProducts(filtered);
    }
  }, [searchQuery, products]);

  const loadServerName = async () => {
    try {
      const userData = await AsyncStorage.getItem("userData");
      if (userData) {
        const parsedData = JSON.parse(userData);
        setServerName(parsedData.name || "Unknown Server");
      }
    } catch (error) {
      console.log("loadServerName Error:", { message: error.message });
      setServerName("Unknown Server");
    }
  };

  const fetchCategories = async () => {
    setLoading(true);
    setError(null);
    try {
      const token = await AsyncStorage.getItem("token");
      if (!token) throw new Error("No authentication token found. Please log in.");
      const apiUrl = await getAPIUrl();
      const response = await axios.get(`${apiUrl}/customer-order/categories`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (response.data.status !== "success") {
        throw new Error(response.data.message || "Failed to fetch categories.");
      }
      if (!Array.isArray(response.data.categories)) {
        throw new Error("Invalid categories data received.");
      }
      const categoriesWithCounts = await Promise.all(
        response.data.categories.map(async (category) => {
          try {
            const productResponse = await axios.get(`${apiUrl}/customer-order/stocks/${category.CategoryCode}`, {
              headers: { Authorization: `Bearer ${token}` },
            });
            return {
              ...category,
              itemCount: productResponse.data.products?.length || 0,
            };
          } catch (err) {
            console.warn(`Failed to fetch product count for category ${category.CategoryCode}:`, err.message);
            return { ...category, itemCount: 0 };
          }
        })
      );
      setCategories(categoriesWithCounts);
      if (categoriesWithCounts.length > 0) {
        setSelectedCategory(categoriesWithCounts[0].CategoryCode);
        fetchProducts(categoriesWithCounts[0].CategoryCode);
      } else {
        setError("No categories available.");
      }
    } catch (error) {
      setError(error.message || "Failed to fetch categories.");
      if (Platform.OS === "web") {
        window.alert(error.message || "Failed to fetch categories.");
      } else {
        Alert.alert("Error", error.message || "Failed to fetch categories.");
      }
    } finally {
      setLoading(false);
    }
  };

  const fetchProducts = async (categoryCode) => {
    setLoading(true);
    setError(null);
    setSelectedCategory(categoryCode);
    try {
      const token = await AsyncStorage.getItem("token");
      if (!token) throw new Error("No authentication token found. Please log in.");
      const apiUrl = await getAPIUrl();
      const response = await axios.get(`${apiUrl}/customer-order/stocks/${categoryCode}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (response.data.status !== "success") {
        throw new Error(response.data.message || "Failed to fetch products.");
      }
      if (!Array.isArray(response.data.products)) {
        throw new Error("Invalid products data received.");
      }
      const productsWithPrices = await Promise.all(
        response.data.products.map(async (product) => {
          let price = 100;
          try {
            const priceResponse = await axios.get(
              `${apiUrl}/stocks/${categoryCode}/${product.ProductCode}/price`,
              { headers: { Authorization: `Bearer ${token}` } }
            );
            price = priceResponse.data.price || 100;
          } catch (err) {
            console.warn(`Failed to fetch price for ${product.ProductCode}:`, err.message);
          }
          return { ...product, price };
        })
      );
      setProducts(productsWithPrices);
      setFilteredProducts(productsWithPrices);
      setQuantities(
        productsWithPrices.reduce((acc, product) => {
          acc[product.ProductCode] = 0;
          return acc;
        }, {})
      );
    } catch (error) {
      setError(error.message || "Failed to fetch products.");
      if (Platform.OS === "web") {
        window.alert(error.message || "Failed to fetch products.");
      } else {
        Alert.alert("Error", error.message || "Failed to fetch products.");
      }
    } finally {
      setLoading(false);
    }
  };

  const fetchAllPendingOrders = async () => {
    setLoading(true);
    setError(null);
    try {
      const token = await AsyncStorage.getItem("token");
      if (!token) throw new Error("No authentication token found. Please log in.");
      const apiUrl = await getAPIUrl();
      const response = await axios.get(`${apiUrl}/pending-running-bill/pending-orders`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (response.data.status !== "success") {
        throw new Error(response.data.message || "Failed to fetch pending orders.");
      }
      if (!Array.isArray(response.data.orders)) {
        throw new Error("Invalid pending orders data received.");
      }
      const standardizedOrders = response.data.orders.map(order => ({
        ...order,
        tableNo: order.tableNo?.toString() || null,
        POSCode: order.POSCode?.toString(),
        InvoiceNo: order.InvoiceNo || "N/A",
        items: Array.isArray(order.items) ? order.items.map(item => ({
          ProductCode: item.ProductCode?.toString(),
          productName: typeof item.productName === "string" && item.productName
            ? item.productName
            : products.find(p => p.ProductCode === item.ProductCode)?.Product || "Unknown Product",
          quantity: parseFloat(item.quantity) || 0,
          price: parseFloat(item.price) || 100,
        })) : [],
        notes: order.notes || "",
        dineIn: order.dineIn ?? true,
        takeOut: order.takeOut ?? false,
        timestamp: order.timestamp || new Date().toISOString(),
      }));
      setPendingOrders(standardizedOrders);
      if (standardizedOrders.length === 0) {
        if (Platform.OS === "web") {
          window.alert("No pending orders found.");
        } else {
          Alert.alert("Info", "No pending orders found.");
        }
      }
    } catch (error) {
      console.error("Fetch All Pending Orders Error:", {
        message: error.message,
        status: error.response?.status,
        data: error.response?.data,
      });
      const userMessage = error.message.includes("Network Error")
        ? "Failed to connect to the server. Please check your network."
        : error.message || "Error fetching pending orders.";
      setError(userMessage);
      if (Platform.OS === "web") {
        window.alert(userMessage);
      } else {
        Alert.alert("Error", userMessage);
      }
      setPendingOrders([]);
    } finally {
      setLoading(false);
    }
  };

  const fetchPendingOrders = async () => {
    if (!tableNo) {
      fetchAllPendingOrders();
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const token = await AsyncStorage.getItem("token");
      if (!token) throw new Error("No authentication token found. Please log in.");
      const apiUrl = await getAPIUrl();
      const response = await axios.get(`${apiUrl}/pending-running-bill/pending-orders?tableNo=${tableNo}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (response.data.status !== "success") {
        throw new Error(response.data.message || "Failed to fetch pending orders.");
      }
      if (!Array.isArray(response.data.orders)) {
        throw new Error("Invalid pending orders data received.");
      }
      const standardizedOrders = response.data.orders.map(order => ({
        ...order,
        tableNo: order.tableNo?.toString() || null,
        POSCode: order.POSCode?.toString(),
        InvoiceNo: order.InvoiceNo || "N/A",
        items: Array.isArray(order.items) ? order.items.map(item => ({
          ProductCode: item.ProductCode?.toString(),
          productName: typeof item.productName === "string" && item.productName
            ? item.productName
            : products.find(p => p.ProductCode === item.ProductCode)?.Product || "Unknown Product",
          quantity: parseFloat(item.quantity) || 0,
          price: parseFloat(item.price) || 100,
        })) : [],
        notes: order.notes || "",
        dineIn: order.dineIn ?? true,
        takeOut: order.takeOut ?? false,
        timestamp: order.timestamp || new Date().toISOString(),
      }));
      setPendingOrders(standardizedOrders);
      if (standardizedOrders.length === 0) {
        if (Platform.OS === "web") {
          window.alert(`No pending orders found for table ${tableNo}`);
        } else {
          Alert.alert("Info", `No pending orders found for table ${tableNo}`);
        }
      }
    } catch (error) {
      console.error("Fetch Pending Orders Error:", {
        message: error.message,
        status: error.response?.status,
        data: error.response?.data,
      });
      const userMessage = error.message.includes("Network Error")
        ? "Failed to connect to the server. Please check your network."
        : error.message || "Error fetching pending orders.";
      setError(userMessage);
      if (Platform.OS === "web") {
        window.alert(userMessage);
      } else {
        Alert.alert("Error", userMessage);
      }
      setPendingOrders([]);
    } finally {
      setLoading(false);
    }
  };

  const removeOrder = async (order) => {
    if (!order || !order.POSCode) {
      setError("Invalid order data.");
      if (Platform.OS === "web") {
        window.alert("Invalid order data.");
      } else {
        Alert.alert("Error", "Invalid order data.");
      }
      return;
    }

    const message = `Remove pending order for Table ${order.tableNo || order.POSCode}?`;
    let confirmed;
    if (Platform.OS === "web") {
      confirmed = window.confirm(message);
      if (!confirmed) return;
    } else {
      confirmed = await new Promise((resolve) => {
        Alert.alert(
          "Remove Order",
          message,
          [
            { text: "Cancel", style: "cancel", onPress: () => resolve(false) },
            { text: "Remove", style: "destructive", onPress: () => resolve(true) },
          ],
          { cancelable: true }
        );
      });
      if (!confirmed) return;
    }

    try {
      const token = await AsyncStorage.getItem("token");
      if (!token) throw new Error("No authentication token found. Please log in.");
      const apiUrl = await getAPIUrl();
      const response = await axios.delete(`${apiUrl}/pending-running-bill/pending-orders/${order.POSCode}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (response.data.status !== "success") {
        throw new Error(response.data.message || "Failed to remove order.");
      }
      setPendingOrders((prev) => prev.filter((o) => o.POSCode !== order.POSCode));
      if (Platform.OS === "web") {
        window.alert(`Order for table ${order.tableNo || order.POSCode} removed successfully.`);
      } else {
        Alert.alert("Success", `Order for table ${order.tableNo || order.POSCode} removed successfully.`);
      }
    } catch (error) {
      console.error("Remove Order Error:", {
        message: error.message,
        status: error.response?.status,
        data: error.response?.data,
      });
      const userMessage = error.message.includes("Network Error")
        ? "Failed to connect to the server. Please check your network."
        : error.message || "Error removing order.";
      setError(userMessage);
      if (Platform.OS === "web") {
        window.alert(userMessage);
      } else {
        Alert.alert("Error", userMessage);
      }
    }
  };

  const generateKitchenOrder = (items, orderNotes, dineIn, takeOut, tableNo) => {
    const orderTableNo = tableNo !== null && tableNo !== undefined ? tableNo : "N/A";
    let kitchenOrder = `
Alicias Special Batchoy
Kitchen Order
Served by: ${serverName}
Time: ${new Date().toLocaleString()}
Type: ${dineIn ? "Dine-In" : "Take-Out"}
--------------------
Table: ${orderTableNo}\n`;
    items.forEach((item) => {
      const productName = typeof item.productName === 'string' && item.productName
        ? item.productName
        : products.find(p => p.ProductCode === item.ProductCode)?.Product || "Unknown Product";
      kitchenOrder += `Product: ${productName}
Qty: ${item.quantity || 0}
--------------------
`;
    });
    const totalItems = items.reduce((sum, item) => sum + (parseInt(item.quantity) || 0), 0);
    kitchenOrder += `Notes: ${orderNotes || "None"}
Total Items: ${totalItems}
Thank You!

[Manual tear]
`;
    setKitchenOrderContent(kitchenOrder);
  };

  const handleAcceptOrder = async (order) => {
    if (!order || !Array.isArray(order.items) || order.items.length === 0) {
      console.error("Invalid order data:", { order });
      setError("Invalid order data.");
      if (Platform.OS === "web") {
        window.alert("Invalid order data.");
      } else {
        Alert.alert("Error", "Invalid order data.");
      }
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const token = await AsyncStorage.getItem("token");
      if (!token) {
        throw new Error("No authentication token found. Please log in.");
      }

      const apiUrl = await getAPIUrl();
      const fullUrl = `${apiUrl}/pending-running-bill/accept`;

      const formattedItemsMap = new Map();
      order.items.forEach(item => {
        const product = products.find(p => p.ProductCode === item.ProductCode) || {};
        const productName = typeof item.productName === 'string' && item.productName
          ? item.productName
          : product.Product || "Unknown Product";
        if (!item.ProductCode || isNaN(parseFloat(item.quantity)) || isNaN(parseFloat(item.price))) {
          throw new Error(`Invalid item data: ProductCode=${item.ProductCode}, quantity=${item.quantity}, price=${item.price}`);
        }
        const key = item.ProductCode.toString();
        if (formattedItemsMap.has(key)) {
          const existing = formattedItemsMap.get(key);
          existing.quantity += parseFloat(item.quantity);
        } else {
          formattedItemsMap.set(key, {
            productCode: key,
            productName,
            quantity: parseFloat(item.quantity),
            price: parseFloat(item.price),
            itemId: `accept-${Date.now()}-${Math.random().toString(36).slice(2)}`,
          });
        }
      });
      const formattedItems = Array.from(formattedItemsMap.values());

      const response = await axios.post(
        fullUrl,
        {
          cart: formattedItems.map(({ itemId, ...item }) => item),
          tableNo: order.tableNo,
          notes: order.notes || "",
          dineIn: order.dineIn !== undefined ? order.dineIn : true,
          takeOut: order.takeOut !== undefined ? order.takeOut : false,
        },
        { headers: { Authorization: `Bearer ${token}` } }
      );

      if (response.data.status !== "success") {
        throw new Error(response.data.message || "Failed to accept order.");
      }

      const { invoiceNo, posCode, items, tableNo, notes, dineIn, takeOut, timestamp } = response.data;

      if (!invoiceNo || !posCode || !Array.isArray(items)) {
        throw new Error("Invalid response data from server: missing invoiceNo, posCode, or items.");
      }

      const standardizedItems = formattedItems.map((item, index) => ({
        itemId: `response-${invoiceNo}-${index}-${Date.now()}`,
        ProductCode: item.productCode,
        productName: item.productName,
        quantity: item.quantity,
        price: item.price,
        subtotal: item.quantity * item.price,
      }));

      const existingBillKey = `runningBill:${invoiceNo}`;
      let existingBill = null;
      if (Platform.OS === "web") {
        const billData = localStorage.getItem(existingBillKey);
        if (billData) existingBill = JSON.parse(billData);
      } else {
        const billData = await AsyncStorage.getItem(existingBillKey);
        if (billData) existingBill = JSON.parse(billData);
      }

      let runningBillData;
      if (existingBill && existingBill.tableNo === tableNo) {
        const mergedItems = [...existingBill.items];
        const existingProductCodes = new Map(mergedItems.map(item => [item.ProductCode, item]));
        standardizedItems.forEach(newItem => {
          const existingItem = existingProductCodes.get(newItem.ProductCode);
          if (existingItem) {
            existingItem.quantity += newItem.quantity;
            existingItem.subtotal = existingItem.quantity * existingItem.price;
          } else {
            mergedItems.push(newItem);
            existingProductCodes.set(newItem.ProductCode, newItem);
          }
        });
        runningBillData = {
          ...existingBill,
          items: mergedItems,
          notes: notes || existingBill.notes || "",
          totalAmount: mergedItems.reduce((sum, item) => sum + item.subtotal, 0).toFixed(2),
        };
      } else {
        runningBillData = {
          tableNo: tableNo || null,
          items: standardizedItems,
          notes: notes || "",
          invoiceNo: invoiceNo.toString(),
          posCode: posCode.toString(),
          dineIn: dineIn ?? false,
          takeOut: takeOut ?? false,
          timestamp: timestamp || new Date().toISOString(),
          totalAmount: standardizedItems.reduce((sum, item) => sum + item.subtotal, 0).toFixed(2),
        };
      }

      if (Platform.OS === "web") {
        localStorage.setItem(existingBillKey, JSON.stringify(runningBillData));
      } else {
        await AsyncStorage.setItem(existingBillKey, JSON.stringify(runningBillData));
      }

      // Remove the order from the backend
      await axios.delete(`${apiUrl}/pending-running-bill/pending-orders/${order.POSCode}`, {
        headers: { Authorization: `Bearer ${token}` },
      });

      generateKitchenOrder(formattedItems, notes, dineIn, takeOut, tableNo);
      setKitchenOrderModalVisible(true);

      setPendingOrders((prev) => prev.filter((o) => o.POSCode !== order.POSCode));

      navigation.navigate("RunningBills", { tableNo, invoiceNo });
    } catch (error) {
      console.error("Accept Order Error:", {
        message: error.message,
        status: error.response?.status,
        data: error.response?.data,
        requestUrl: error.config?.url,
        requestMethod: error.config?.method,
        requestData: error.config?.data,
      });

      const runningBillKey = `runningBill:${order.InvoiceNo || 'temp'}`;
      if (Platform.OS === "web") {
        localStorage.removeItem(runningBillKey);
      } else {
        await AsyncStorage.removeItem(runningBillKey);
      }

      const userMessage = error.message.includes("Network Error")
        ? "Failed to connect to the server. Please check your network."
        : error.message || "Failed to accept order.";
      setError(userMessage);
      if (Platform.OS === "web") {
        window.alert(userMessage);
      } else {
        Alert.alert("Error", userMessage);
      }
    } finally {
      setLoading(false);
    }
  };

  const openEditOrder = (order) => {
    if (!order || !Array.isArray(order.items)) {
      setError("Invalid order data.");
      if (Platform.OS === "web") {
        window.alert("Invalid order data.");
      } else {
        Alert.alert("Error", "Invalid order data.");
      }
      return;
    }
    setManualOrderItems(
      order.items.map((item) => {
        const product = products.find(p => p.ProductCode === item.ProductCode) || {};
        const productName = typeof item.productName === 'string' && item.productName
          ? item.productName
          : product.Product || "Unknown Product";
        return {
          productCode: item.ProductCode,
          productName,
          quantity: parseFloat(item.quantity),
          price: parseFloat(item.price),
          tableNo: order.tableNo,
        };
      })
    );
    setManualOrderTableNo(order.tableNo || "");
    setOrderNotes(order.notes || "");
    setIsDineIn(order.dineIn || true);
    setIsTakeOut(order.takeOut || false);
    setEditOrderModalVisible(true);
    setManualOrderModalVisible(false);
    if (categories.length > 0) {
      setSelectedCategory(categories[0].CategoryCode);
      fetchProducts(categories[0].CategoryCode);
    }
  };

  const addToManualOrder = (product) => {
    const qty = parseFloat(quantities[product.ProductCode]);
    if (isNaN(qty) || qty <= 0) {
      if (Platform.OS === "web") {
        window.alert("Please select a valid quantity greater than 0.");
      } else {
        Alert.alert("Error", "Please select a valid quantity greater than 0.");
      }
      return;
    }
    if (!manualOrderTableNo.trim()) {
      if (Platform.OS === "web") {
        window.alert("Table number is required for manual orders.");
      } else {
        Alert.alert("Error", "Table number is required for manual orders.");
      }
      return;
    }
    const price = parseFloat(product.price);
    const newItem = {
      productCode: product.ProductCode.toString(),
      productName: product.Product && typeof product.Product === 'string' ? product.Product : "Unknown Product",
      quantity: qty,
      price,
      tableNo: manualOrderTableNo,
    };
    setManualOrderItems((prev) => {
      const updatedItems = [...prev];
      const existingItemIndex = updatedItems.findIndex(
        (item) => item.productCode === newItem.productCode && item.tableNo === newItem.tableNo
      );
      if (existingItemIndex !== -1) {
        updatedItems[existingItemIndex].quantity += newItem.quantity;
      } else {
        updatedItems.push(newItem);
      }
      return updatedItems;
    });
    setQuantities((prev) => ({ ...prev, [product.ProductCode]: 0 }));
  };

  const updateQuantity = (productCode, delta) => {
    setQuantities((prev) => {
      const newQuantity = Math.max(0, (parseFloat(prev[productCode]) || 0) + delta);
      return { ...prev, [productCode]: newQuantity };
    });
  };

  const updateManualOrderItemQuantity = (index, delta) => {
    setManualOrderItems((prev) => {
      const updatedItems = [...prev];
      const newQuantity = Math.max(0, updatedItems[index].quantity + delta);
      if (newQuantity === 0) {
        return updatedItems.filter((_, i) => i !== index);
      }
      updatedItems[index].quantity = newQuantity;
      return updatedItems;
    });
  };

  const removeFromManualOrder = (index) => {
    const item = manualOrderItems[index];
    if (Platform.OS === "web") {
      const confirmed = window.confirm(`Remove ${item.productName} from order?`);
      if (!confirmed) return;
    } else {
      Alert.alert(
        "Remove Item",
        `Remove ${item.productName} from order?`,
        [
          { text: "Cancel", style: "cancel" },
          {
            text: "Remove",
            style: "destructive",
            onPress: () => {
              setManualOrderItems((prev) => prev.filter((_, i) => i !== index));
            },
          },
        ],
        { cancelable: true }
      );
      return;
    }
    setManualOrderItems((prev) => prev.filter((_, i) => i !== index));
  };

  const submitManualOrder = async () => {
    if (manualOrderItems.length === 0) {
      if (Platform.OS === "web") {
        window.alert("No items in order.");
      } else {
        Alert.alert("Error", "No items in order.");
      }
      return;
    }
    if (!manualOrderTableNo.trim()) {
      if (Platform.OS === "web") {
        window.alert("Table number is required for manual orders.");
      } else {
        Alert.alert("Error", "Table number is required for manual orders.");
      }
      return;
    }
    try {
      const token = await AsyncStorage.getItem("token");
      if (!token && editOrderModalVisible) {
        throw new Error("No authentication token found. Please log in.");
      }
      const apiUrl = await getAPIUrl();
      const newItems = manualOrderItems.map(item => {
        const product = products.find(p => p.ProductCode === item.productCode) || {};
        const productName = typeof item.productName === 'string' && item.productName
          ? item.productName
          : product.Product || "Unknown Product";
        return {
          ProductCode: item.productCode,
          productName,
          quantity: parseFloat(item.quantity),
          price: parseFloat(item.price),
        };
      });

      if (newItems.some(item => !item.ProductCode || item.quantity <= 0 || isNaN(item.price))) {
        throw new Error("Invalid item data in order.");
      }

      const orderData = {
        tableNo: manualOrderTableNo.toString(),
        items: newItems,
        notes: orderNotes || "",
        dineIn: isDineIn,
        takeOut: isTakeOut,
        POSCode: editOrderModalVisible
          ? pendingOrders.find(o => o.tableNo === manualOrderTableNo)?.POSCode
          : `local-${Date.now()}-${Math.random().toString(36).slice(2)}`,
        InvoiceNo: "N/A",
        timestamp: new Date().toISOString(),
      };

      if (editOrderModalVisible) {
        // Delete the existing order if editing
        const existingOrder = pendingOrders.find(o => o.tableNo === manualOrderTableNo);
        if (existingOrder && existingOrder.POSCode) {
          await axios.delete(`${apiUrl}/pending-running-bill/pending-orders/${existingOrder.POSCode}`, {
            headers: { Authorization: `Bearer ${token}` },
          });
        }
      }

      const response = await axios.post(`${apiUrl}/pending-running-bill/pending-orders`, orderData);
      if (response.data.status !== "success") {
        throw new Error(response.data.message || "Failed to save order.");
      }

      setManualOrderItems([]);
      setManualOrderTableNo("");
      setOrderNotes("");
      setIsDineIn(true);
      setIsTakeOut(false);
      setManualOrderModalVisible(false);
      setEditOrderModalVisible(false);
      setSearchQuery("");
      await fetchAllPendingOrders();
      if (Platform.OS === "web") {
        window.alert("Order saved successfully.");
      } else {
        Alert.alert("Success", "Order saved successfully.");
      }
    } catch (error) {
      console.error("Submit Manual Order Error:", {
        message: error.message,
        status: error.response?.status,
        data: error.response?.data,
      });
      const userMessage = error.message.includes("Network Error")
        ? "Failed to connect to the server. Please check your network."
        : error.message || "Error saving order.";
      setError(userMessage);
      if (Platform.OS === "web") {
        window.alert(userMessage);
      } else {
        Alert.alert("Error", userMessage);
      }
    }
  };

  const clearSearch = () => {
    setSearchQuery("");
    if (searchInputRef.current) {
      searchInputRef.current.clear();
      searchInputRef.current.blur();
    }
  };

  const renderCategory = ({ item }) => (
    <TouchableOpacity
      style={[
        styles.categoryItem,
        selectedCategory === item.CategoryCode && styles.categoryItemSelected,
      ]}
      onPress={() => fetchProducts(item.CategoryCode)}
      disabled={loading}
    >
      <Text
        style={[
          styles.categoryText,
          selectedCategory === item.CategoryCode && styles.categoryTextSelected,
        ]}
      >
        {item.Category || "Unnamed Category"} ({item.itemCount})
      </Text>
    </TouchableOpacity>
  );

  const renderProductItem = ({ item }) => (
    <View style={styles.productCard}>
      <Text style={styles.productName}>{item.Product && typeof item.Product === 'string' ? item.Product : "Unknown Product"}</Text>
      <Text style={styles.productPrice}>₱{item.price.toFixed(2)}</Text>
      <View style={styles.quantityContainer}>
        <TouchableOpacity
          style={styles.quantityButton}
          onPress={() => updateQuantity(item.ProductCode, -1)}
          disabled={quantities[item.ProductCode] <= 0}
        >
          <Text style={styles.quantityButtonText}>−</Text>
        </TouchableOpacity>
        <Text style={styles.quantityText}>{quantities[item.ProductCode]}</Text>
        <TouchableOpacity
          style={styles.quantityButton}
          onPress={() => updateQuantity(item.ProductCode, 1)}
        >
          <Text style={styles.quantityButtonText}>+</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={styles.addButton}
          onPress={() => addToManualOrder(item)}
          disabled={quantities[item.ProductCode] <= 0}
        >
          <Text style={styles.addButtonText}>Add</Text>
        </TouchableOpacity>
      </View>
    </View>
  );

  const renderManualOrderItem = ({ item, index }) => (
    <View style={styles.orderItem}>
      <Text style={styles.orderItemText}>{item.productName} - Table {item.tableNo}</Text>
      <View style={styles.quantityContainer}>
        <TouchableOpacity
          style={styles.quantityButton}
          onPress={() => updateManualOrderItemQuantity(index, -1)}
          disabled={item.quantity <= 0}
        >
          <Text style={styles.quantityButtonText}>−</Text>
        </TouchableOpacity>
        <Text style={styles.quantityText}>{item.quantity}</Text>
        <TouchableOpacity
          style={styles.quantityButton}
          onPress={() => updateManualOrderItemQuantity(index, 1)}
        >
          <Text style={styles.quantityButtonText}>+</Text>
        </TouchableOpacity>
        <TouchableOpacity onPress={() => removeFromManualOrder(index)}>
          <Ionicons name="trash" size={20} color="#000" />
        </TouchableOpacity>
      </View>
    </View>
  );

  const renderOrderItem = ({ item }) => {
    if (!item || !Array.isArray(item.items)) {
      console.warn("Invalid order in renderOrderItem:", item);
      return (
        <View style={styles.orderContainer}>
          <Text style={styles.orderTitle}>Table {item?.tableNo || item?.POSCode || "Unknown"} - Invalid Order</Text>
          <Text style={styles.noDataText}>No valid items in this order.</Text>
        </View>
      );
    }
    return (
      <View style={styles.orderContainer}>
        <Text style={styles.orderTitle}>
          Table {item.tableNo || item.POSCode} - {new Date(item.timestamp).toLocaleString()}
        </Text>
        {item.items.length > 0 ? (
          item.items.map((product, index) => (
            <View key={index} style={styles.orderItem}>
              <Text>{product.productName || "Unknown Product"} (x{product.quantity})</Text>
            </View>
          ))
        ) : (
          <Text style={styles.noDataText}>No items in this order.</Text>
        )}
        <Text style={styles.orderNotes}>Notes: {item.notes || "None"}</Text>
        <Text style={styles.orderNotes}>Type: {item.dineIn ? "Dine-In" : "Take-Out"}</Text>
        <View style={styles.orderButtonContainer}>
          <TouchableOpacity
            style={styles.acceptButton}
            onPress={() => handleAcceptOrder(item)}
            disabled={item.items.length === 0}
          >
            <Text style={styles.acceptButtonText}>Accept</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.editButton}
            onPress={() => openEditOrder(item)}
            disabled={item.items.length === 0}
          >
            <Text style={styles.editButtonText}>Edit</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.removeButton}
            onPress={() => removeOrder(item)}
          >
            <Text style={styles.removeButtonText}>Remove</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Pending Orders</Text>
        <View style={styles.navContainer}>
          <TouchableOpacity style={styles.navItem} onPress={() => navigation.navigate("POS")}>
            <Ionicons name="arrow-back" size={24} color="#FFF" />
            <Text style={styles.navText}>Back to POS</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.navItem}
            onPress={() => {
              setManualOrderModalVisible(true);
              setEditOrderModalVisible(false);
              setManualOrderItems([]);
              setManualOrderTableNo("");
              setOrderNotes("");
              setIsDineIn(true);
              setIsTakeOut(false);
              setSearchQuery("");
              if (categories.length > 0) {
                setSelectedCategory(categories[0].CategoryCode);
                fetchProducts(categories[0].CategoryCode);
              }
            }}
          >
            <Ionicons name="add-circle-outline" size={24} color="#FFF" />
            <Text style={styles.navText}>Add Manual Order</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.navItem}
            onPress={() => navigation.navigate("RunningBills")}
          >
            <Ionicons name="list-outline" size={24} color="#FFF" />
            <Text style={styles.navText}>Running Bills</Text>
          </TouchableOpacity>
        </View>
      </View>
      <View style={styles.filterSection}>
        <TextInput
          style={styles.input}
          placeholder="Enter Table Number to Filter"
          value={tableNo}
          onChangeText={setTableNo}
          keyboardType="numeric"
        />
        <TouchableOpacity style={styles.filterButton} onPress={fetchPendingOrders}>
          <Text style={styles.filterButtonText}>Filter</Text>
        </TouchableOpacity>
      </View>
      <View style={styles.pendingOrdersSection}>
        <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
          <Text style={styles.sectionTitle}>Pending Orders</Text>
          <TouchableOpacity
            style={styles.refreshButton}
            onPress={fetchPendingOrders}
            accessibilityLabel="Refresh pending orders"
          >
            <Ionicons name="refresh-outline" size={20} color="#000" />
            <Text style={styles.refreshButtonText}>Refresh</Text>
          </TouchableOpacity>
        </View>
        {loading ? (
          <Text style={styles.loadingText}>Loading...</Text>
        ) : error ? (
          <View style={styles.errorContainer}>
            <Text style={styles.errorText}>{error}</Text>
            <TouchableOpacity style={styles.retryButton} onPress={fetchAllPendingOrders}>
              <Text style={styles.retryButtonText}>Retry</Text>
            </TouchableOpacity>
          </View>
        ) : (
          <FlatList
            data={pendingOrders}
            renderItem={renderOrderItem}
            keyExtractor={(item) => item.POSCode || `${item.tableNo}-${item.timestamp}`}
            ListEmptyComponent={<Text style={styles.noDataText}>No pending orders found.</Text>}
            contentContainerStyle={styles.orderList}
          />
        )}
      </View>
      <Modal
        animationType="slide"
        transparent={true}
        visible={manualOrderModalVisible || editOrderModalVisible}
        onRequestClose={() => {
          setManualOrderModalVisible(false);
          setEditOrderModalVisible(false);
        }}
      >
        <View style={styles.modalOverlay}>
          <ScrollView contentContainerStyle={styles.modalContent}>
            <Text style={styles.modalTitle}>
              {editOrderModalVisible ? "Edit Order" : "Create Manual Order"}
            </Text>
            <TextInput
              style={styles.input}
              placeholder="Table Number"
              value={manualOrderTableNo}
              onChangeText={setManualOrderTableNo}
              keyboardType="numeric"
            />
            <View style={styles.orderTypeContainer}>
              <TouchableOpacity
                style={[styles.orderTypeButton, isDineIn && styles.orderTypeButtonSelected]}
                onPress={() => {
                  setIsDineIn(true);
                  setIsTakeOut(false);
                }}
              >
                <Text style={styles.orderTypeText}>Dine-In</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.orderTypeButton, isTakeOut && styles.orderTypeButtonSelected]}
                onPress={() => {
                  setIsDineIn(false);
                  setIsTakeOut(true);
                }}
              >
                <Text style={styles.orderTypeText}>Take-Out</Text>
              </TouchableOpacity>
            </View>
            <TextInput
              style={styles.input}
              placeholder="Notes (optional)"
              value={orderNotes}
              onChangeText={setOrderNotes}
            />
            <View style={styles.searchContainer}>
              <TextInput
                ref={searchInputRef}
                style={styles.searchInput}
                placeholder="Search products..."
                value={searchQuery}
                onChangeText={setSearchQuery}
                autoCapitalize="none"
              />
              {searchQuery.length > 0 && (
                <TouchableOpacity style={styles.clearSearchButton} onPress={clearSearch}>
                  <Ionicons name="close-circle" size={24} color="#333" />
                </TouchableOpacity>
              )}
            </View>
            <View style={styles.categoryContainer}>
              <FlatList
                ref={categoryListRef}
                data={categories}
                renderItem={renderCategory}
                keyExtractor={(item) => item.CategoryCode?.toString()}
                horizontal
                contentContainerStyle={styles.categoryList}
                showsHorizontalScrollIndicator={true}
                ListEmptyComponent={<Text style={styles.noDataText}>No categories available.</Text>}
              />
            </View>
            {selectedCategory && (
              <FlatList
                data={filteredProducts}
                renderItem={renderProductItem}
                keyExtractor={(item) => item.ProductCode}
                contentContainerStyle={styles.productList}
                ListEmptyComponent={<Text style={styles.noDataText}>No products found.</Text>}
              />
            )}
            <Text style={styles.modalSubtitle}>Selected Items</Text>
            <FlatList
              data={manualOrderItems}
              renderItem={renderManualOrderItem}
              keyExtractor={(item, index) => `${item.productCode}-${index}`}
              ListEmptyComponent={<Text style={styles.noDataText}>No items selected.</Text>}
              contentContainerStyle={styles.orderList}
            />
            <View style={styles.modalButtonContainer}>
              <TouchableOpacity
                style={styles.cancelButton}
                onPress={() => {
                  setManualOrderItems([]);
                  setManualOrderTableNo("");
                  setOrderNotes("");
                  setIsDineIn(true);
                  setIsTakeOut(false);
                  setManualOrderModalVisible(false);
                  setEditOrderModalVisible(false);
                  setSearchQuery("");
                }}
              >
                <Text style={styles.cancelButtonText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.confirmButton}
                onPress={submitManualOrder}
                disabled={manualOrderItems.length === 0}
              >
                <Text style={styles.confirmButtonText}>
                  {editOrderModalVisible ? "Save" : "Save Order"}
                </Text>
              </TouchableOpacity>
            </View>
          </ScrollView>
        </View>
      </Modal>
      <Modal
        animationType="slide"
        transparent={true}
        visible={kitchenOrderModalVisible}
        onRequestClose={() => setKitchenOrderModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <ScrollView contentContainerStyle={styles.receiptModalContent}>
            <Text style={styles.modalTitle}>Kitchen Order</Text>
            <Text style={styles.receiptText}>{kitchenOrderContent}</Text>
            <TouchableOpacity
              style={styles.confirmButton}
              onPress={() => setKitchenOrderModalVisible(false)}
            >
              <Text style={styles.confirmButtonText}>Close</Text>
            </TouchableOpacity>
          </ScrollView>
        </View>
      </Modal>
    </View>
  );
};

export default PendingOrdersScreen;