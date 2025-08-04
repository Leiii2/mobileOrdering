import React, { useState, useEffect, useRef } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  FlatList,
  ActivityIndicator,
  SafeAreaView,
  Modal,
  TextInput,
  Platform,
  Alert,
} from "react-native";
import { useNavigation, useRoute } from "@react-navigation/native";
import { Ionicons } from "@expo/vector-icons";
import axios from "axios";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { getAPIUrl } from "./config";
import AsyncStorage from "@react-native-async-storage/async-storage";
import styles from "./css/customerOrderScreen.styles";

const CustomerOrderScreen = () => {
  const [categories, setCategories] = useState([]);
  const [products, setProducts] = useState([]);
  const [filteredProducts, setFilteredProducts] = useState([]);
  const [selectedCategory, setSelectedCategory] = useState(null);
  const [loading, setLoading] = useState(false);
  const [cart, setCart] = useState({});
  const [showCartModal, setShowCartModal] = useState(false);
  const [showPendingModal, setShowPendingModal] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [pendingOrders, setPendingOrders] = useState([]);
  const navigation = useNavigation();
  const route = useRoute();
  const insets = useSafeAreaInsets();
  const searchInputRef = useRef(null);
  const categoryListRef = useRef(null);
  const isDragging = useRef(false);
  const startX = useRef(0);
  const scrollOffset = useRef(0);

  const tableNo = route.params?.tableNo?.toString() || "";

  const saveCartToStorage = async (newCart) => {
    try {
      await AsyncStorage.setItem(`cart_${tableNo}`, JSON.stringify(newCart));
      console.log("CustomerOrderScreen: Cart saved to AsyncStorage for table:", tableNo);
    } catch (error) {
      console.warn("CustomerOrderScreen: Failed to save cart to AsyncStorage:", error.message);
    }
  };

  const loadCartFromStorage = async () => {
    try {
      const storedCart = await AsyncStorage.getItem(`cart_${tableNo}`);
      if (storedCart) {
        setCart(JSON.parse(storedCart));
        console.log("CustomerOrderScreen: Cart loaded from AsyncStorage for table:", tableNo);
      }
    } catch (error) {
      console.warn("CustomerOrderScreen: Failed to load cart from AsyncStorage:", error.message);
    }
  };

  const savePendingOrdersToStorage = async (orders) => {
    try {
      await AsyncStorage.setItem(`pendingOrders_${tableNo}`, JSON.stringify(orders));
      console.log("CustomerOrderScreen: Pending orders saved to AsyncStorage for table:", tableNo);
    } catch (error) {
      console.warn("CustomerOrderScreen: Failed to save pending orders to AsyncStorage:", error.message);
    }
  };

  useEffect(() => {
    console.log("CustomerOrderScreen: useEffect triggered with route.params:", route.params);
    console.log("CustomerOrderScreen: tableNo:", tableNo);
    if (!tableNo) {
      const message = "Table number is required. Please access via a valid deeplink.";
      if (Platform.OS === "web") {
        window.alert(message);
      } else {
        Alert.alert("Error", message);
      }
      return;
    }
    loadCartFromStorage();
    const loadPendingOrders = async () => {
      try {
        const storedOrders = await AsyncStorage.getItem(`pendingOrders_${tableNo}`);
        if (storedOrders) {
          const parsedOrders = JSON.parse(storedOrders).filter((o) => o.tableNo === tableNo);
          setPendingOrders(parsedOrders.map((order) => ({ ...order, status: "pending" })));
          console.log("CustomerOrderScreen: Loaded pending orders from AsyncStorage:", parsedOrders.length);
        }
      } catch (error) {
        console.warn("CustomerOrderScreen: Failed to load pending orders from AsyncStorage:", error.message);
      }
    };
    loadPendingOrders();
    fetchCategories();
    fetchPendingOrders();
  }, [route.params, tableNo]);

  useEffect(() => {
    console.log("CustomerOrderScreen: Search query changed:", searchQuery);
    if (searchQuery.trim() === "") {
      setFilteredProducts(products);
    } else {
      const filtered = products.filter((product) =>
        product?.Product?.toLowerCase()?.includes(searchQuery.toLowerCase())
      );
      setFilteredProducts(filtered);
      console.log("CustomerOrderScreen: Filtered products:", filtered.length);
    }
  }, [searchQuery, products]);

  const fetchPendingOrders = async () => {
    console.log("CustomerOrderScreen: Starting fetchPendingOrders for table:", tableNo);
    try {
      setLoading(true);
      const apiUrl = await getAPIUrl();
      let token = await AsyncStorage.getItem("token").catch((err) =>
        console.warn("CustomerOrderScreen: Failed to retrieve token:", err.message)
      );
      const headers = token ? { Authorization: `Bearer ${token}` } : {};
      const response = await axios.get(`${apiUrl}/pending-running-bill/pending-orders`, {
        headers,
        timeout: 10000,
      });
      if (response.data.status === "success" && Array.isArray(response.data.orders)) {
        const filteredOrders = response.data.orders
          .filter((o) => o.tableNo === tableNo)
          .map((order) => ({ ...order, status: order.status || "pending" }));
        setPendingOrders(filteredOrders);
        await savePendingOrdersToStorage(filteredOrders);
        console.log("CustomerOrderScreen: Pending orders set and saved for table", tableNo, "count:", filteredOrders.length);
      } else {
        setPendingOrders([]);
        await savePendingOrdersToStorage([]);
        console.log("CustomerOrderScreen: No valid orders found in response");
        throw new Error("Invalid response data from server");
      }
    } catch (error) {
      console.error("CustomerOrderScreen: Fetch Pending Orders Error:", {
        message: error.message,
        status: error.response?.status,
        data: error.response?.data,
      });
      const userMessage = "Failed to fetch pending orders.";
      if (Platform.OS === "web") {
        window.alert(userMessage);
      } else {
        Alert.alert("Error", userMessage);
      }
    } finally {
      setLoading(false);
      console.log("CustomerOrderScreen: fetchPendingOrders completed, loading:", false);
    }
  };

  const handleMouseDown = (event) => {
    if (Platform.OS === "web" && categoryListRef.current) {
      isDragging.current = true;
      startX.current = event.clientX;
      scrollOffset.current = categoryListRef.current.contentOffset?.x || 0;
      document.addEventListener("mousemove", handleMouseMove);
      document.addEventListener("mouseup", handleMouseUp);
      event.preventDefault();
    }
  };

  const handleMouseMove = (event) => {
    if (isDragging.current && Platform.OS === "web" && categoryListRef.current) {
      const deltaX = event.clientX - startX.current;
      const newOffset = scrollOffset.current - deltaX * 1.5;
      categoryListRef.current.scrollToOffset({ offset: newOffset, animated: false });
      scrollOffset.current = newOffset;
      startX.current = event.clientX;
    }
  };

  const handleMouseUp = () => {
    if (Platform.OS === "web") {
      isDragging.current = false;
      document.removeEventListener("mousemove", handleMouseMove);
      document.removeEventListener("mouseup", handleMouseUp);
    }
  };

  useEffect(() => {
    return () => {
      if (Platform.OS === "web") {
        document.removeEventListener("mousemove", handleMouseMove);
        document.removeEventListener("mouseup", handleMouseUp);
      }
    };
  }, []);

  const fetchCategories = async () => {
    console.log("CustomerOrderScreen: Starting fetchCategories");
    setLoading(true);
    try {
      const apiUrl = await getAPIUrl();
      const response = await axios.get(`${apiUrl}/customer-order/categories`, {
        timeout: 10000,
      });
      if (Array.isArray(response.data.categories)) {
        const categoriesWithCounts = await Promise.all(
          response.data.categories.map(async (category) => {
            try {
              const productResponse = await axios.get(`${apiUrl}/customer-order/stocks/${category.CategoryCode}`, {
                timeout: 10000,
              });
              return {
                ...category,
                itemCount: productResponse.data.products?.length || 0,
              };
            } catch (error) {
              console.warn(`CustomerOrderScreen: Failed to fetch products for category ${category.CategoryCode}:`, error.message);
              return { ...category, itemCount: 0 };
            }
          })
        );
        setCategories(categoriesWithCounts);
        if (categoriesWithCounts.length > 0) {
          setSelectedCategory(categoriesWithCounts[0].CategoryCode);
          fetchProducts(categoriesWithCounts[0].CategoryCode);
        }
      } else {
        throw new Error("Invalid categories response");
      }
    } catch (error) {
      console.error("CustomerOrderScreen: Fetch Categories Error:", {
        message: error.message,
        status: error.response?.status,
        data: error.response?.data,
      });
      setCategories([]);
      const userMessage = "Failed to fetch categories.";
      if (Platform.OS === "web") {
        window.alert(userMessage);
      } else {
        Alert.alert("Error", userMessage);
      }
    } finally {
      setLoading(false);
      console.log("CustomerOrderScreen: fetchCategories completed, loading:", false);
    }
  };

  const fetchProducts = async (categoryCode) => {
    console.log("CustomerOrderScreen: Starting fetchProducts for category:", categoryCode);
    setLoading(true);
    setSelectedCategory(categoryCode);
    try {
      const apiUrl = await getAPIUrl();
      console.log("CustomerOrderScreen: Fetching products from:", `${apiUrl}/customer-order/stocks/${categoryCode}`);
      const response = await axios.get(`${apiUrl}/customer-order/stocks/${categoryCode}`, {
        timeout: 10000,
      });
      console.log("CustomerOrderScreen: Raw API response:", response.data);
      if (response.data.status === "success" && Array.isArray(response.data.products)) {
        const productsWithPrices = await Promise.all(
          response.data.products.map(async (product) => {
            let price = 100;
            try {
              const priceResponse = await axios.get(
                `${apiUrl}/customer-order/stocks/${categoryCode}/${product.ProductCode}/price`,
                { timeout: 10000 }
              );
              price = priceResponse.data.price || 100;
            } catch (error) {
              console.warn(`CustomerOrderScreen: Failed to fetch price for product ${product.ProductCode}:`, error.message);
            }
            return {
              ...product,
              price,
            };
          })
        );
        setProducts(productsWithPrices);
        setFilteredProducts(productsWithPrices);
        console.log("CustomerOrderScreen: Successfully fetched products:", productsWithPrices.length);
      } else {
        console.log("CustomerOrderScreen: Invalid products response structure:", response.data);
        throw new Error("Invalid products response: Expected 'products' array with status 'success'");
      }
    } catch (error) {
      console.error("CustomerOrderScreen: Fetch Products Error:", {
        message: error.message,
        status: error.response?.status,
        data: error.response?.data,
      });
      setProducts([]);
      setFilteredProducts([]);
      const userMessage = error.message.includes("Network Error") || error.code === "ECONNABORTED"
        ? "Failed to connect to the server. Please check your network or API URL."
        : "Failed to fetch products. Please try again later.";
      if (Platform.OS === "web") {
        window.alert(userMessage);
      } else {
        Alert.alert("Error", userMessage);
      }
    } finally {
      setLoading(false);
      console.log("CustomerOrderScreen: fetchProducts completed, loading:", false);
    }
  };

  const addToCart = (product, productCode) => {
    console.log("CustomerOrderScreen: Adding to cart:", product.Product, productCode);
    setCart((prevCart) => {
      const existingQty = prevCart[product.ProductCode]?.quantity || 0;
      const newCart = {
        ...prevCart,
        [product.ProductCode]: {
          ...product,
          quantity: existingQty + 1,
        },
      };
      saveCartToStorage(newCart);
      return newCart;
    });

    const message = `${product.Product} added to cart!`;
    if (Platform.OS === "web") {
      if (window.confirm(message + " View cart?")) setShowCartModal(true);
    } else {
      Alert.alert("Success", message, [
        { text: "Close", style: "cancel" },
        { text: "View Cart", onPress: () => setShowCartModal(true) },
      ]);
    }
  };

  const removeFromCart = (productCode) => {
    console.log("CustomerOrderScreen: Removing from cart:", productCode);
    setCart((prevCart) => {
      const newCart = { ...prevCart };
      delete newCart[productCode];
      saveCartToStorage(newCart);
      return newCart;
    });
    const message = "Item removed from cart!";
    if (Platform.OS === "web") {
      window.alert(message);
    } else {
      Alert.alert("Success", message);
    }
  };

  const clearCart = () => {
    console.log("CustomerOrderScreen: Clearing cart");
    if (Platform.OS === "web") {
      if (window.confirm("Clear all items from cart?")) {
        setCart({});
        saveCartToStorage({});
        window.alert("Cart cleared!");
      }
    } else {
      Alert.alert(
        "Clear Cart",
        "Remove all items from cart?",
        [
          { text: "Cancel", style: "cancel" },
          {
            text: "Clear",
            style: "destructive",
            onPress: () => {
              setCart({});
              saveCartToStorage({});
              Alert.alert("Success", "Cart cleared!");
            },
          },
        ]
      );
    }
  };

  const updateQuantity = (productCode, newQuantity) => {
    console.log("CustomerOrderScreen: Updating quantity for", productCode, "to", newQuantity);
    if (newQuantity < 1) {
      removeFromCart(productCode);
      return;
    }
    setCart((prevCart) => {
      const newCart = {
        ...prevCart,
        [productCode]: {
          ...prevCart[productCode],
          quantity: newQuantity,
        },
      };
      saveCartToStorage(newCart);
      return newCart;
    });
  };

  const submitCart = async () => {
    console.log("CustomerOrderScreen: Submitting cart:", cart);
    if (Object.keys(cart).length === 0) {
      const message = "Cart is empty.";
      if (Platform.OS === "web") {
        window.alert(message);
      } else {
        Alert.alert("Error", message);
      }
      return;
    }
    if (!tableNo) {
      const message = "Table number is required. Please access via a valid deeplink.";
      if (Platform.OS === "web") {
        window.alert(message);
      } else {
        Alert.alert("Error", message);
      }
      return;
    }

    try {
      setLoading(true);
      const orderData = {
        tableNo,
        cart: Object.values(cart).map((item) => ({
          productCode: item.ProductCode?.toString() || "",
          quantity: parseFloat(item.quantity) || 1,
          price: parseFloat(item.price) || 100,
        })),
        notes: "",
        dineIn: true,
        takeOut: false,
      };

      if (orderData.cart.some((item) => !item.productCode || item.quantity <= 0 || isNaN(item.price))) {
        throw new Error("Invalid item data in cart.");
      }

      const apiUrl = await getAPIUrl();
      let token = await AsyncStorage.getItem("token").catch((err) =>
        console.warn("CustomerOrderScreen: Failed to retrieve token for submitCart:", err.message)
      );
      const headers = token ? { Authorization: `Bearer ${token}` } : {};
      const response = await axios.post(`${apiUrl}/customer-order/accept`, orderData, {
        headers,
        timeout: 10000,
      });
      if (response.data.status !== "success" || !response.data.order) {
        throw new Error(response.data.message || "Failed to place order.");
      }

      const newOrder = {
        POSCode: response.data.order.POSCode,
        InvoiceNo: response.data.order.InvoiceNo,
        tableNo,
        items: Object.values(cart).map((item) => ({
          ProductCode: item.ProductCode,
          productName: item.Product,
          quantity: parseFloat(item.quantity),
          price: parseFloat(item.price),
        })),
        status: response.data.order.status || "pending",
        timestamp: new Date().toISOString(),
      };
      const storedOrders = await AsyncStorage.getItem(`pendingOrders_${tableNo}`).catch((err) =>
        console.warn("CustomerOrderScreen: Failed to load stored orders:", err.message)
      );
      const orders = storedOrders ? JSON.parse(storedOrders) : [];
      orders.push(newOrder);
      await savePendingOrdersToStorage(orders);

      setCart({});
      await AsyncStorage.removeItem(`cart_${tableNo}`);
      await fetchPendingOrders();
      setShowCartModal(false);
      const message = "Order placed successfully! You can view it in Pending Orders.";
      if (Platform.OS === "web") {
        window.alert(message);
      } else {
        Alert.alert("Success", message);
      }
    } catch (error) {
      console.error("CustomerOrderScreen: Submit Cart Error:", {
        message: error.message,
        status: error.response?.status,
        data: error.response?.data,
      });
      const userMessage =
        error.message.includes("Network Error") || error.code === "ECONNABORTED"
          ? "Failed to connect to the server. Please check your network or API URL."
          : error.response?.status === 401
          ? "Authentication error. Please try again or contact support."
          : error.response?.data?.message || "Error placing order.";
      if (Platform.OS === "web") {
        window.alert(userMessage);
      } else {
        Alert.alert("Error", userMessage);
      }
    } finally {
      setLoading(false);
      console.log("CustomerOrderScreen: submitCart completed, loading:", false);
    }
  };

  const cancelPendingOrder = async (posCode, invoiceNo) => {
    console.log("CustomerOrderScreen: Canceling pending order:", { posCode, invoiceNo });
    if (!posCode || !invoiceNo || !tableNo) {
      console.error("CustomerOrderScreen: Invalid posCode, invoiceNo, or tableNo", { posCode, invoiceNo, tableNo });
      const userMessage = "Invalid order information.";
      if (Platform.OS === "web") {
        window.alert(userMessage);
      } else {
        Alert.alert("Error", userMessage);
      }
      return;
    }

    const order = pendingOrders.find((o) => o.POSCode === posCode && o.InvoiceNo === invoiceNo);
    if (!order || order.tableNo !== tableNo) {
      console.error("CustomerOrderScreen: Order not found or table mismatch", { posCode, invoiceNo, tableNo });
      const userMessage = "Cannot cancel order: Order not found or belongs to a different table.";
      if (Platform.OS === "web") {
        window.alert(userMessage);
      } else {
        Alert.alert("Error", userMessage);
      }
      return;
    }

    let confirmed;
    if (Platform.OS === "web") {
      confirmed = window.confirm(`Cancel Order ID ${posCode} (Invoice No: ${invoiceNo})?`);
    } else {
      confirmed = await new Promise((resolve) =>
        Alert.alert(
          "Cancel Order",
          `Cancel Order ID ${posCode} (Invoice No: ${invoiceNo})?`,
          [
            { text: "Cancel", style: "cancel", onPress: () => resolve(false) },
            { text: "Confirm", style: "destructive", onPress: () => resolve(true) },
          ]
        )
      );
    }
    if (!confirmed) return;

    try {
      setLoading(true);
      const apiUrl = await getAPIUrl();
      let token = await AsyncStorage.getItem("token").catch((err) =>
        console.warn("CustomerOrderScreen: Failed to retrieve token for delete:", err.message)
      );
      const headers = token ? { Authorization: `Bearer ${token}` } : {};
      const response = await axios.delete(`${apiUrl}/pending-running-bill/pending-orders/${posCode}/${invoiceNo}`, {
        headers,
        timeout: 10000,
      });
      if (response.data.status !== "success") {
        throw new Error(response.data.message || "Failed to cancel order.");
      }

      const storedOrders = await AsyncStorage.getItem(`pendingOrders_${tableNo}`).catch((err) =>
        console.warn("CustomerOrderScreen: Failed to load stored orders:", err.message)
      );
      if (storedOrders) {
        let orders = JSON.parse(storedOrders);
        orders = orders.filter((o) => o.POSCode !== posCode || o.InvoiceNo !== invoiceNo);
        await savePendingOrdersToStorage(orders);
      }
      await fetchPendingOrders();
      const message = `Order ID ${posCode} canceled successfully!`;
      if (Platform.OS === "web") {
        window.alert(message);
      } else {
        Alert.alert("Success", message);
      }
    } catch (error) {
      console.error("CustomerOrderScreen: Cancel Pending Order Error:", {
        message: error.message,
        status: error.response?.status,
        data: error.response?.data,
      });
      const userMessage =
        error.message.includes("Network Error") || error.code === "ECONNABORTED"
          ? "Failed to connect to the server. Please check your network or API URL."
          : error.response?.status === 404
          ? "Order not found or already canceled."
          : error.response?.data?.message || "Failed to cancel order.";
      if (Platform.OS === "web") {
        window.alert(userMessage);
      } else {
        Alert.alert("Error", userMessage);
      }
    } finally {
      setLoading(false);
      console.log("CustomerOrderScreen: cancelPendingOrder completed, loading:", false);
    }
  };

  const cancelPendingItem = async (posCode, productCode) => {
    console.log("CustomerOrderScreen: Canceling pending item:", { posCode, productCode });
    if (!posCode || !productCode || !tableNo) {
      console.error("CustomerOrderScreen: Invalid posCode, productCode, or tableNo", { posCode, productCode, tableNo });
      const userMessage = "Invalid order or product information.";
      if (Platform.OS === "web") {
        window.alert(userMessage);
      } else {
        Alert.alert("Error", userMessage);
      }
      return;
    }

    const order = pendingOrders.find((o) => o.POSCode === posCode);
    if (!order || order.tableNo !== tableNo) {
      console.error("CustomerOrderScreen: Order not found or table mismatch", { posCode, tableNo });
      const userMessage = "Cannot cancel item: Order not found or belongs to a different table.";
      if (Platform.OS === "web") {
        window.alert(userMessage);
      } else {
        Alert.alert("Error", userMessage);
      }
      return;
    }

    const product = order.items.find((item) => item.ProductCode === productCode);
    const productName = product?.productName || "Unknown Product";

    let confirmed;
    if (Platform.OS === "web") {
      confirmed = window.confirm(`Cancel ${productName} from the pending order?`);
    } else {
      confirmed = await new Promise((resolve) =>
        Alert.alert(
          "Cancel Item",
          `Cancel ${productName} from the pending order?`,
          [
            { text: "Cancel", style: "cancel", onPress: () => resolve(false) },
            { text: "Confirm", style: "destructive", onPress: () => resolve(true) },
          ]
        )
      );
    }
    if (!confirmed) return;

    try {
      setLoading(true);
      const apiUrl = await getAPIUrl();
      let token = await AsyncStorage.getItem("token").catch((err) =>
        console.warn("CustomerOrderScreen: Failed to retrieve token for delete:", err.message)
      );
      const headers = token ? { Authorization: `Bearer ${token}` } : {};
      const response = await axios.delete(`${apiUrl}/pending-running-bill/pending-orders/${posCode}/${productCode}`, {
        headers,
        timeout: 10000,
      });
      if (response.data.status !== "success") {
        throw new Error(response.data.message || "Failed to cancel item.");
      }

      const storedOrders = await AsyncStorage.getItem(`pendingOrders_${tableNo}`).catch((err) =>
        console.warn("CustomerOrderScreen: Failed to load stored orders:", err.message)
      );
      if (storedOrders) {
        let orders = JSON.parse(storedOrders);
        orders = orders.map((o) =>
          o.POSCode === posCode
            ? { ...o, items: o.items.filter((item) => item.ProductCode !== productCode) }
            : o
        ).filter((o) => o.items.length > 0);
        await savePendingOrdersToStorage(orders);
      }
      await fetchPendingOrders();
      const message = `${productName} canceled successfully!`;
      if (Platform.OS === "web") {
        window.alert(message);
      } else {
        Alert.alert("Success", message);
      }
    } catch (error) {
      console.error("CustomerOrderScreen: Cancel Pending Item Error:", {
        message: error.message,
        status: error.response?.status,
        data: error.response?.data,
      });
      const userMessage =
        error.message.includes("Network Error") || error.code === "ECONNABORTED"
          ? "Failed to connect to the server. Please check your network or API URL."
          : error.response?.status === 404
          ? "Order or item not found or already deleted."
          : error.response?.data?.message || "Failed to cancel item.";
      if (Platform.OS === "web") {
        window.alert(userMessage);
      } else {
        Alert.alert("Error", userMessage);
      }
    } finally {
      setLoading(false);
      console.log("CustomerOrderScreen: cancelPendingItem completed, loading:", false);
    }
  };

  const cancelAllPendingOrders = async (tableNoToCancel) => {
    console.log("CustomerOrderScreen: Canceling all pending orders for table:", tableNoToCancel);
    if (tableNoToCancel !== tableNo) {
      console.log("CustomerOrderScreen: Table number mismatch, cancellation aborted");
      const message = "Cannot cancel orders for a different table.";
      if (Platform.OS === "web") {
        window.alert(message);
      } else {
        Alert.alert("Error", message);
      }
      return;
    }

    const tableOrders = pendingOrders.filter((order) => order.tableNo === tableNoToCancel);
    if (tableOrders.length === 0) {
      const message = `No pending orders to cancel for Table ${tableNoToCancel}.`;
      if (Platform.OS === "web") {
        window.alert(message);
      } else {
        Alert.alert("Info", message);
      }
      return;
    }

    let confirmed;
    if (Platform.OS === "web") {
      confirmed = window.confirm(`Cancel all pending orders for Table ${tableNoToCancel}?`);
    } else {
      confirmed = await new Promise((resolve) =>
        Alert.alert(
          "Cancel All Pending Orders",
          `Cancel all pending orders for Table ${tableNoToCancel}?`,
          [
            { text: "Cancel", style: "cancel", onPress: () => resolve(false) },
            { text: "Confirm", style: "destructive", onPress: () => resolve(true) },
          ]
        )
      );
    }
    if (!confirmed) return;

    try {
      setLoading(true);
      const apiUrl = await getAPIUrl();
      let token = await AsyncStorage.getItem("token").catch((err) =>
        console.warn("CustomerOrderScreen: Failed to retrieve token for delete:", err.message)
      );
      await Promise.all(
        tableOrders.map((order) =>
          axios.delete(`${apiUrl}/pending-running-bill/pending-orders/${order.POSCode}/${order.InvoiceNo}`, {
            headers: token ? { Authorization: `Bearer ${token}` } : {},
            timeout: 10000,
          })
        )
      );
      await savePendingOrdersToStorage([]);
      await fetchPendingOrders();
      const message = `All pending orders for Table ${tableNoToCancel} canceled successfully!`;
      if (Platform.OS === "web") {
        window.alert(message);
      } else {
        Alert.alert("Success", message);
      }
    } catch (error) {
      console.error("CustomerOrderScreen: Cancel All Pending Orders Error:", {
        message: error.message,
        status: error.response?.status,
        data: error.response?.data,
      });
      const userMessage =
        error.message.includes("Network Error") || error.code === "ECONNABORTED"
          ? "Failed to connect to the server. Please check your network or API URL."
          : error.response?.data?.message || "Failed to cancel pending orders.";
      if (Platform.OS === "web") {
        window.alert(userMessage);
      } else {
        Alert.alert("Error", userMessage);
      }
    } finally {
      setLoading(false);
      console.log("CustomerOrderScreen: cancelAllPendingOrders completed, loading:", false);
    }
  };

  const clearSearch = () => {
    console.log("CustomerOrderScreen: Clearing search query");
    setSearchQuery("");
    if (searchInputRef.current) {
      searchInputRef.current.clear();
      searchInputRef.current.blur();
    }
  };

  const getTotalPendingItems = (tableNo) => {
    const tableOrders = pendingOrders.filter((order) => order.tableNo === tableNo);
    const total = tableOrders.reduce((total, order) => {
      return total + (order.items || []).reduce((sum, item) => sum + (item.quantity || 0), 0);
    }, 0);
    console.log("CustomerOrderScreen: Calculated total items for table", tableNo, ":", total);
    return total;
  };

  const getTableTotal = (tableNo) => {
    const tableOrders = pendingOrders.filter((order) => order.tableNo === tableNo);
    const total = tableOrders.reduce((total, order) => {
      return total + (order.items || []).reduce((sum, item) => sum + (item.price || 0) * (item.quantity || 0), 0);
    }, 0).toFixed(2);
    console.log("CustomerOrderScreen: Calculated total cost for table", tableNo, ":", total);
    return total;
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
      <Ionicons
        name={item.Category === "All Menu" ? "menu" : "restaurant-outline"}
        size={20}
        color={selectedCategory === item.CategoryCode ? "#FFFFFF" : "#3D2C29"}
      />
      <Text
        style={[
          styles.categoryText,
          selectedCategory === item.CategoryCode && styles.categoryTextSelected,
        ]}
      >
        {item.Category || "Unnamed Category"}
      </Text>
      <Text
        style={[
          styles.categoryCount,
          selectedCategory === item.CategoryCode && styles.categoryCountSelected,
        ]}
      >
        {item.itemCount} {item.itemCount === 1 ? "item" : "items"}
      </Text>
    </TouchableOpacity>
  );

  const renderProduct = ({ item }) => (
    <View style={styles.productCard}>
      <View style={styles.productImagePlaceholder}>
        <Text style={styles.placeholderText}>No Image</Text>
      </View>
      <Text style={styles.productName}>{item.Product || "Unnamed Product"}</Text>
      <Text style={styles.productPrice}>₱{(item.price || 0).toFixed(2)}</Text>
      <View style={styles.quantityContainer}>
        <TouchableOpacity
          style={styles.quantityButton}
          onPress={() => addToCart(item, item.ProductCode)}
          disabled={loading}
        >
          <Text style={styles.quantityButtonText}>Add to Cart</Text>
        </TouchableOpacity>
      </View>
    </View>
  );

  const renderCartItem = ({ item }) => (
    <View style={styles.cartItem}>
      <Text style={styles.cartItemName}>{item.Product} (x{item.quantity})</Text>
      <View style={styles.quantityControl}>
        <Text style={styles.cartItemPrice}>₱{(item.price * item.quantity).toFixed(2)}</Text>
        <TouchableOpacity
          style={styles.quantityButton}
          onPress={() => updateQuantity(item.ProductCode, item.quantity - 1)}
          disabled={loading}
        >
          <Text style={styles.quantityButtonText}>-</Text>
        </TouchableOpacity>
        <Text style={styles.quantityText}>{item.quantity}</Text>
        <TouchableOpacity
          style={styles.quantityButton}
          onPress={() => updateQuantity(item.ProductCode, item.quantity + 1)}
          disabled={loading}
        >
          <Text style={styles.quantityButtonText}>+</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.quantityButton, styles.removeButton]}
          onPress={() => removeFromCart(item.ProductCode)}
          disabled={loading}
        >
          <Text style={styles.quantityButtonText}>Remove</Text>
        </TouchableOpacity>
      </View>
    </View>
  );

  const renderPendingItem = ({ item }, posCode) => (
    <View style={styles.cartItem}>
      <Text style={styles.cartItemName}>{item.productName} (x{item.quantity})</Text>
      <View style={styles.quantityControl}>
        <Text style={styles.cartItemPrice}>₱{(item.price * item.quantity).toFixed(2)}</Text>
        <TouchableOpacity
          style={[styles.quantityButton, styles.removeButton]}
          onPress={() => cancelPendingItem(posCode, item.ProductCode)}
          disabled={loading}
        >
          <Text style={styles.quantityButtonText}>Cancel</Text>
        </TouchableOpacity>
      </View>
    </View>
  );

  const renderPendingOrder = ({ item }) => (
    <View style={styles.pendingOrderContainer}>
      <View style={styles.pendingOrderHeader}>
        <Text style={styles.pendingOrderText}>
          Order ID: {item.POSCode} (Invoice No: {item.InvoiceNo}, {item.items.length} item{item.items.length !== 1 ? "s" : ""}, Status: {item.status})
        </Text>
        <TouchableOpacity
          style={[styles.quantityButton, styles.cancelOrderButton]}
          onPress={() => cancelPendingOrder(item.POSCode, item.InvoiceNo)}
          disabled={loading}
        >
          <Text style={styles.quantityButtonText}>Cancel Order</Text>
        </TouchableOpacity>
      </View>
      <FlatList
        data={item.items}
        renderItem={(props) => renderPendingItem(props, item.POSCode)}
        keyExtractor={(item) => item.ProductCode?.toString() || Math.random().toString()}
        contentContainerStyle={styles.cartList}
      />
    </View>
  );

  const renderTableSection = ({ item: tableNo }) => (
    <View style={styles.tableSection}>
      <View style={styles.tableHeader}>
        <Text style={styles.tableNoText}>Table {tableNo}</Text>
        <Text style={styles.tableTotalText}>Total: ₱{getTableTotal(tableNo)}</Text>
        <TouchableOpacity
          style={[styles.quantityButton, styles.cancelAllButton]}
          onPress={() => cancelAllPendingOrders(tableNo)}
          disabled={loading}
        >
          <Text style={styles.quantityButtonText}>Cancel All</Text>
        </TouchableOpacity>
      </View>
      <FlatList
        data={pendingOrders.filter((order) => order.tableNo === tableNo)}
        renderItem={renderPendingOrder}
        keyExtractor={(item) => item.POSCode?.toString() || Math.random().toString()}
        contentContainerStyle={styles.cartList}
      />
    </View>
  );

  const getTotal = () => {
    const total = Object.values(cart).reduce(
      (total, item) => total + (item.price || 0) * (item.quantity || 0),
      0
    ).toFixed(2);
    console.log("CustomerOrderScreen: Calculated cart total:", total);
    return total;
  };

  const uniqueTableNos = tableNo && pendingOrders.some((order) => order.tableNo === tableNo) ? [tableNo] : [];

  return (
    <SafeAreaView
      style={[
        styles.container,
        {
          paddingTop: insets.top,
          paddingBottom: insets.bottom,
          paddingLeft: insets.left,
          paddingRight: insets.right,
        },
      ]}
    >
      <View style={styles.topNav}>
        <TouchableOpacity style={styles.navItem} onPress={() => setShowCartModal(true)} disabled={loading}>
          <Ionicons name="cart-outline" size={20} color="#3D2C29" />
          <Text style={styles.navText}>Cart ({Object.keys(cart).length})</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.navItem} onPress={() => setShowPendingModal(true)} disabled={loading}>
          <Ionicons name="list-outline" size={20} color="#3D2C29" />
          <Text style={styles.navText}>Pending ({getTotalPendingItems(tableNo)})</Text>
        </TouchableOpacity>
      </View>
      {tableNo && (
        <View style={styles.tableNoContainer}>
          <Text style={styles.tableNoText}>Table Number: {tableNo}</Text>
        </View>
      )}
      <View style={styles.searchContainer}>
        <TextInput
          ref={searchInputRef}
          style={styles.searchInput}
          placeholder="Search products..."
          placeholderTextColor="#6B5E4A"
          value={searchQuery}
          onChangeText={setSearchQuery}
          autoCapitalize="none"
          returnKeyType="search"
          editable={!loading}
        />
        {searchQuery.length > 0 && (
          <TouchableOpacity style={styles.clearSearchButton} onPress={clearSearch} disabled={loading}>
            <Ionicons name="close-circle" size={20} color="#6B5E4A" />
          </TouchableOpacity>
        )}
      </View>
      <View style={styles.categoryContainer}>
        <FlatList
          ref={categoryListRef}
          data={categories}
          renderItem={renderCategory}
          keyExtractor={(item) => item.CategoryCode?.toString() || Math.random().toString()}
          horizontal
          contentContainerStyle={styles.categoryList}
          showsHorizontalScrollIndicator={false}
          ListEmptyComponent={<Text style={styles.noDataText}>No categories available.</Text>}
          onScroll={(event) => {
            scrollOffset.current = event.nativeEvent.contentOffset.x;
          }}
          onMouseDown={handleMouseDown}
        />
      </View>
      {selectedCategory && (
        <FlatList
          data={filteredProducts}
          renderItem={renderProduct}
          keyExtractor={(item) => item.ProductCode?.toString() || Math.random().toString()}
          contentContainerStyle={styles.productContainer}
          numColumns={2}
          ListEmptyComponent={<Text style={styles.noDataText}>No products found.</Text>}
        />
      )}
      {loading && <ActivityIndicator size="large" color="#F28C38" style={styles.loading} />}
      <Modal
        visible={showCartModal}
        transparent={true}
        animationType="fade"
        onRequestClose={() => setShowCartModal(false)}
      >
        <View style={styles.modalContainer}>
          <View style={styles.cartModalContainer}>
            <Text style={styles.cartTitle}>Your Cart</Text>
            {tableNo && <Text style={styles.tableNoText}>Table Number: {tableNo}</Text>}
            <FlatList
              data={Object.values(cart)}
              renderItem={renderCartItem}
              keyExtractor={(item) => item.ProductCode?.toString() || Math.random().toString()}
              ListEmptyComponent={<Text style={styles.noDataText}>Cart is empty.</Text>}
              contentContainerStyle={styles.cartList}
            />
            {Object.keys(cart).length > 0 && (
              <View style={styles.cartTotal}>
                <Text style={styles.cartTotalText}>Total: ₱{getTotal()}</Text>
              </View>
            )}
            {Object.keys(cart).length > 0 && (
              <TouchableOpacity style={[styles.modalButton, styles.clearCartButton]} onPress={clearCart} disabled={loading}>
                <Text style={styles.modalButtonText}>Clear Cart</Text>
              </TouchableOpacity>
            )}
            {Object.keys(cart).length > 0 && (
              <TouchableOpacity
                style={[styles.modalButton, { backgroundColor: "#F28C38", padding: 10, borderRadius: 5, marginVertical: 5, alignItems: "center" }]}
                onPress={submitCart}
                disabled={loading}
              >
                <Text style={styles.modalButtonText}>Place Order</Text>
              </TouchableOpacity>
            )}
            <TouchableOpacity style={[styles.modalButton, styles.closeCartButton]} onPress={() => setShowCartModal(false)} disabled={loading}>
              <Text style={styles.modalButtonText}>Close</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
      <Modal
        visible={showPendingModal}
        transparent={true}
        animationType="fade"
        onRequestClose={() => {
          console.log("CustomerOrderScreen: Closing pending orders modal");
          setShowPendingModal(false);
        }}
      >
        <View style={styles.modalContainer}>
          <View style={styles.cartModalContainer}>
            <Text style={styles.cartTitle}>Pending Orders</Text>
            <Text style={styles.totalItemsText}>Total Items: {getTotalPendingItems(tableNo)}</Text>
            <TouchableOpacity
              style={[styles.modalButton, { backgroundColor: "#4CAF50", padding: 10, borderRadius: 5, marginVertical: 5, alignItems: "center" }]}
              onPress={() => {
                console.log("CustomerOrderScreen: Refresh orders in modal");
                fetchPendingOrders();
              }}
              disabled={loading}
            >
              <Ionicons name="refresh-outline" size={20} color="#FFFFFF" />
              <Text style={styles.modalButtonText}>Refresh Orders</Text>
            </TouchableOpacity>
            <FlatList
              data={uniqueTableNos}
              renderItem={renderTableSection}
              keyExtractor={(item) => item.toString()}
              ListEmptyComponent={<Text style={styles.noDataText}>No pending orders available for Table {tableNo}.</Text>}
              contentContainerStyle={styles.cartList}
            />
            <TouchableOpacity
              style={[styles.modalButton, styles.closeCartButton]}
              onPress={() => {
                console.log("CustomerOrderScreen: Closing modal via button");
                setShowPendingModal(false);
              }}
              disabled={loading}
            >
              <Text style={styles.modalButtonText}>Close</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
};

export default CustomerOrderScreen;