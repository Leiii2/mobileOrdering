import React, { useState, useEffect, useRef } from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  FlatList,
  ActivityIndicator,
  Alert,
  Modal,
  ScrollView,
  Image,
  Platform,
} from "react-native";
import { useNavigation } from "@react-navigation/native";
import { Ionicons } from "@expo/vector-icons";
import axios from "axios";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { getAPIUrl } from "./config";
import styles from "./css/posScreen.styles";

const POSScreen = () => {
  const [view, setView] = useState("products");
  const [categories, setCategories] = useState([]);
  const [products, setProducts] = useState([]);
  const [filteredProducts, setFilteredProducts] = useState([]);
  const [selectedCategory, setSelectedCategory] = useState(null);
  const [cart, setCart] = useState([]);
  const [quantities, setQuantities] = useState({});
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [dineIn, setDineIn] = useState(true);
  const [amountPaid, setAmountPaid] = useState("");
  const [discountCode, setDiscountCode] = useState("");
  const [modalVisible, setModalVisible] = useState(false);
  const [receiptModalVisible, setReceiptModalVisible] = useState(false);
  const [kitchenOrderModalVisible, setKitchenOrderModalVisible] = useState(false);
  const [receiptContent, setReceiptContent] = useState("");
  const [kitchenOrderContent, setKitchenOrderContent] = useState("");
  const [total, setTotal] = useState(0);
  const [totalDue, setTotalDue] = useState(0);
  const [discountAmount, setDiscountAmount] = useState(0);
  const [vatDiscount, setVatDiscount] = useState(0);
  const [percentageDiscount, setPercentageDiscount] = useState(0);
  const [numberOfPax, setNumberOfPax] = useState("");
  const [numberOfSeniors, setNumberOfSeniors] = useState("");
  const [tableNo, setTableNo] = useState("");
  const [notes, setNotes] = useState("");
  const [currentInvoiceNo, setCurrentInvoiceNo] = useState("");
  const [checkoutTime, setCheckoutTime] = useState("");
  const [serverName, setServerName] = useState("");
  const [searchQuery, setSearchQuery] = useState("");
  const [imageErrors, setImageErrors] = useState({});
  const navigation = useNavigation();
  const insets = useSafeAreaInsets();
  const categoryListRef = useRef(null);
  const imageRefs = useRef({});
  const searchInputRef = useRef(null);
  const isDragging = useRef(false);
  const startX = useRef(0);
  const scrollOffset = useRef(0);

  useEffect(() => {
    fetchCategories();
    checkPOSRole();
    loadCart();
    loadServerName();
  }, []);

  useEffect(() => {
    calculateTotal();
  }, [cart]);

  useEffect(() => {
    if (searchQuery.trim() === "") {
      setFilteredProducts(products);
    } else {
      const filtered = products.filter((product) =>
        product?.Product?.toLowerCase().includes(searchQuery.toLowerCase())
      );
      setFilteredProducts(filtered);
    }
  }, [searchQuery, products]);

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

  const checkPOSRole = async () => {
    try {
      const userData = await AsyncStorage.getItem("userData");
      if (!userData) {
        throw new Error("No user data found. Please log in.");
      }
      const parsedData = JSON.parse(userData);
      if (parsedData.pos !== true) {
        throw new Error("You do not have POS permissions.");
      }
    } catch (error) {
      console.log("checkPOSRole Error:", { message: error.message });
      if (Platform.OS === "web") {
        window.alert("Access Error: " + error.message);
        navigation.navigate(error.message.includes("log in") ? "Login" : "Home");
      } else {
        Alert.alert("Access Error", error.message, [
          { text: "OK", onPress: () => navigation.navigate(error.message.includes("log in") ? "Login" : "Home") },
        ]);
      }
    }
  };

  const fetchCategories = async () => {
    setLoading(true);
    setError(null);
    try {
      const token = await AsyncStorage.getItem("token");
      if (!token) throw new Error("No authentication token found. Please log in.");
      const apiUrl = await getAPIUrl();
      const response = await axios.get(`${apiUrl}/categories`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (response.data.status !== "success") {
        throw new Error(response.data.message || "Failed to fetch categories.");
      }
      if (!Array.isArray(response.data.categories)) {
        throw new Error("Invalid categories data received from server.");
      }
      const categoriesWithCounts = await Promise.all(
        response.data.categories.map(async (category) => {
          try {
            const productResponse = await axios.get(`${apiUrl}/stocks/${category.CategoryCode}`, {
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
      }
    } catch (error) {
      handleError(error);
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
    const response = await axios.get(`${apiUrl}/stocks/${categoryCode}`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    if (response.data.status !== "success") {
      throw new Error(response.data.message || "Failed to fetch products.");
    }
    if (!Array.isArray(response.data.products)) {
      throw new Error("Invalid products data received from server.");
    }
    const productsWithPricesAndImages = await Promise.all(
      response.data.products.map(async (product) => {
        let price = 0; // Default to 0 if price fetch fails
        let imageUrl = null;
        try {
          const priceResponse = await axios.get(
            `${apiUrl}/stocks/${categoryCode}/${product.ProductCode}/price`,
            { headers: { Authorization: `Bearer ${token}` } }
          );
          price = priceResponse.data.price || 0;
        } catch (err) {
          console.warn(`Failed to fetch price for ${product.ProductCode}:`, err.message);
        }
        try {
          const extensions = ["jpg", "png", "jpeg"];
          const cacheBuster = Date.now();
          for (const ext of extensions) {
            const potentialImageUrl = `${apiUrl}/Uploads/product_${product.ProductCode}.${ext}?cb=${cacheBuster}`;
            try {
              const imageResponse = await axios.head(potentialImageUrl, {
                headers: { Authorization: `Bearer ${token}` },
              });
              if (imageResponse.status === 200) {
                imageUrl = potentialImageUrl;
                break;
              }
            } catch (err) {
              if (err.response?.status !== 404) {
                console.warn(`Image fetch error for ${product.ProductCode}.${ext}:`, err.message);
              }
            }
          }
        } catch (err) {
          console.warn(`Failed to fetch image for ${product.ProductCode}:`, err.message);
        }
        return {
          ...product,
          price,
          imageUrl,
        };
      })
    );
    setProducts(productsWithPricesAndImages);
    setFilteredProducts(productsWithPricesAndImages);
    const initialQuantities = productsWithPricesAndImages.reduce((acc, product) => {
      acc[product.ProductCode] = 0;
      return acc;
    }, {});
    setQuantities(initialQuantities);
  } catch (error) {
    handleError(error);
  } finally {
    setLoading(false);
  }
};

  const loadCart = async () => {
    try {
      const savedCart = await AsyncStorage.getItem("cart");
      if (savedCart) {
        const parsedCart = JSON.parse(savedCart);
        const validCart = parsedCart.filter(
          (item) =>
            item.productCode &&
            !isNaN(parseFloat(item.quantity)) &&
            !isNaN(parseFloat(item.price))
        );
        setCart(validCart);
      }
    } catch (error) {
      console.log("loadCart Error:", { message: error.message });
      setError("Failed to load cart. Please try again.");
    }
  };

  const saveCart = async (cartData) => {
    try {
      await AsyncStorage.setItem("cart", JSON.stringify(cartData));
    } catch (error) {
      console.log("saveCart Error:", { message: error.message });
      setError("Failed to save cart. Please try again.");
    }
  };

  const updateQuantity = (productCode, delta) => {
    setQuantities((prevQuantities) => {
      const newQuantity = Math.max(0, (prevQuantities[productCode] || 0) + delta);
      return { ...prevQuantities, [productCode]: newQuantity };
    });
  };

  const updateCartQuantity = (index, delta) => {
    const newCart = [...cart];
    const item = newCart[index];
    const newQuantity = item.quantity + delta;

    if (newQuantity <= 0) {
      if (Platform.OS === "web") {
        const confirmed = window.confirm(`Do you want to remove ${item.productName} from the cart?`);
        if (confirmed) {
          newCart.splice(index, 1);
          setCart(newCart);
          saveCart(newCart);
          window.alert("Item removed from cart!");
        }
      } else {
        Alert.alert(
          "Remove Item",
          `Do you want to remove ${item.productName} from the cart?`,
          [
            { text: "Cancel", style: "cancel" },
            {
              text: "Remove",
              style: "destructive",
              onPress: () => {
                newCart.splice(index, 1);
                setCart(newCart);
                saveCart(newCart);
                Alert.alert("Success", "Item removed from cart!");
              },
            },
          ],
          { cancelable: true }
        );
      }
      return;
    }

    item.quantity = newQuantity;
    item.subtotal = newQuantity * item.price;
    setCart(newCart);
    saveCart(newCart);
  };

  const addToCart = (product) => {
    const qty = quantities[product.ProductCode];
    if (qty <= 0 || isNaN(parseFloat(qty))) {
      if (Platform.OS === "web") {
        window.alert("Please select a valid quantity greater than 0.");
      } else {
        Alert.alert("Error", "Please select a valid quantity greater than 0.");
      }
      return;
    }
    const price = parseFloat(product.price);
    if (isNaN(price)) {
      if (Platform.OS === "web") {
        window.alert("Invalid price for product.");
      } else {
        Alert.alert("Error", "Invalid price for product.");
      }
      return;
    }
    const subtotal = qty * price;
    const cartItem = {
      productCode: product.ProductCode || "Unknown",
      productName: product.Product || "Unknown Product",
      quantity: qty,
      price,
      subtotal,
    };
    const newCart = [...cart];
    const existingItem = newCart.find((item) => item.productCode === cartItem.productCode);
    if (existingItem) {
      existingItem.quantity += cartItem.quantity;
      existingItem.subtotal = existingItem.quantity * existingItem.price;
    } else {
      newCart.push(cartItem);
    }
    setCart(newCart);
    saveCart(newCart);
    setQuantities((prev) => ({ ...prev, [product.ProductCode]: 0 }));
    setError(null);
    if (Platform.OS === "web") {
      const confirmed = window.confirm(`${product.Product} added to cart! Would you like to view the cart?`);
      if (confirmed) {
        setView("cart");
      }
    } else {
      Alert.alert(
        "Success",
        `${product.Product} added to cart!`,
        [
          { text: "Close", onPress: () => {} },
          { text: "View Cart", onPress: () => setView("cart") },
        ],
        { cancelable: true }
      );
    }
  };

  const removeFromCart = (index) => {
    const newCart = [...cart];
    const item = newCart[index];
    if (Platform.OS === "web") {
      const confirmed = window.confirm(`Do you want to remove ${item.productName} from the cart?`);
      if (!confirmed) {
        return;
      }
    } else {
      Alert.alert(
        "Remove Item",
        `Do you want to remove ${item.productName} from the cart?`,
        [
          { text: "Cancel", style: "cancel" },
          {
            text: "Remove",
            style: "destructive",
            onPress: () => {
              newCart.splice(index, 1);
              setCart(newCart);
              saveCart(newCart);
              Alert.alert("Success", "Item removed from cart!");
            },
          },
        ],
        { cancelable: true }
      );
      return;
    }
    newCart.splice(index, 1);
    setCart(newCart);
    saveCart(newCart);
    if (Platform.OS === "web") {
      window.alert("Item removed from cart!");
    }
  };

  const clearCart = () => {
    if (Platform.OS === "web") {
      const confirmed = window.confirm("Are you sure you want to remove all items from your cart?");
      if (!confirmed) {
        return;
      }
      setCart([]);
      saveCart([]);
      window.alert("Cart cleared!");
    } else {
      Alert.alert(
        "Clear Cart",
        "Are you sure you want to remove all items from your cart?",
        [
          { text: "Cancel", style: "cancel" },
          {
            text: "Clear",
            style: "destructive",
            onPress: () => {
              setCart([]);
              saveCart([]);
              Alert.alert("Success", "Cart cleared!");
            },
          },
        ],
        { cancelable: true }
      );
    }
  };

  const clearSearch = () => {
    setSearchQuery("");
    if (searchInputRef.current) {
      searchInputRef.current.clear();
      searchInputRef.current.blur();
    }
  };

  const calculateTotalQuantity = () => {
    return cart.reduce((sum, item) => sum + parseFloat(item.quantity), 0);
  };

  const calculateTotal = () => {
    const newTotal = cart.reduce((sum, item) => {
      const quantity = parseFloat(item.quantity);
      const price = parseFloat(item.price);
      if (isNaN(quantity) || isNaN(price)) {
        console.log("Invalid item in cart:", { item });
        return sum;
      }
      return sum + quantity * price;
    }, 0);
    setTotal(newTotal);
    setTotalDue(newTotal);
    setDiscountAmount(0);
    setVatDiscount(0);
    setPercentageDiscount(0);
    return newTotal;
  };

  const applyDiscount = async () => {
    const pax = parseInt(numberOfPax) || 0;
    const seniors = parseInt(numberOfSeniors) || 0;

    if (pax <= 0) {
      if (Platform.OS === "web") {
        window.alert("Number of customers must be greater than 0.");
      } else {
        Alert.alert("Validation Error", "Number of customers must be greater than 0.");
      }
      return;
    }
    if (seniors > pax) {
      if (Platform.OS === "web") {
        window.alert("Number of seniors cannot exceed total number of customers.");
      } else {
        Alert.alert("Validation Error", "Number of seniors cannot exceed total number of customers.");
      }
      return;
    }
    if (!discountCode.trim()) {
      if (Platform.OS === "web") {
        window.alert("Please enter a discount code to apply a discount.");
      } else {
        Alert.alert("Validation Error", "Please enter a discount code to apply a discount.");
      }
      setDiscountAmount(0);
      setVatDiscount(0);
      setPercentageDiscount(0);
      setTotalDue(total);
      return;
    }

    setLoading(true);
    try {
      const token = await AsyncStorage.getItem("token");
      if (!token) throw new Error("No authentication token found. Please log in.");
      const apiUrl = await getAPIUrl();
      const response = await axios.post(
        `${apiUrl}/pos/preview-discount`,
        {
          cart: cart.map(({ productCode, quantity, price }) => ({
            productCode,
            quantity: parseFloat(quantity),
            price: parseFloat(price),
          })),
          discountCode,
          numberOfPax: pax,
          numberOfSeniors: seniors,
        },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      if (response.data.status !== "success") {
        throw new Error(response.data.message || "Failed to apply discount.");
      }
      setDiscountAmount(parseFloat(response.data.totalDiscount) || 0);
      setVatDiscount(parseFloat(response.data.vatDiscount) || 0);
      setPercentageDiscount(parseFloat(response.data.percentageDiscount) || 0);
      setTotalDue(parseFloat(response.data.totalDue) || total);
    } catch (error) {
      console.log("Apply Discount Error:", {
        message: error.message,
        status: error.response?.status,
        data: error.response?.data,
      });
      if (Platform.OS === "web") {
        window.alert(error.message || "Failed to apply discount.");
      } else {
        Alert.alert("Discount Error", error.message);
      }
      setDiscountAmount(0);
      setVatDiscount(0);
      setPercentageDiscount(0);
      setTotalDue(total);
    } finally {
      setLoading(false);
    }
  };

  const initiateCheckout = () => {
    setView("checkout");
    setModalVisible(true);
    calculateTotal();
  };

  const handleError = (error) => {
    console.log("Handle Error:", {
      message: error.message,
      status: error.response?.status,
      data: error.response?.data,
    });
    if (error.response?.status === 401) {
      if (Platform.OS === "web") {
        window.alert("Session Expired. Please log in again.");
        AsyncStorage.removeItem("token");
        AsyncStorage.removeItem("userData");
        navigation.navigate("Login");
      } else {
        Alert.alert("Session Expired", "Please log in again.", [
          { text: "OK", onPress: () => navigation.navigate("Login") },
        ]);
        AsyncStorage.removeItem("token");
        AsyncStorage.removeItem("userData");
      }
    } else {
      setError(error.message || "An unexpected error occurred.");
    }
  };

  const confirmCheckout = () => {
    const parsedAmountPaid = parseFloat(amountPaid) || 0;
    const pax = parseInt(numberOfPax) || 0;
    const seniors = parseInt(numberOfSeniors) || 0;
    const tableNumber = parseInt(tableNo) || null;
    const notesText = notes.trim() || "";
    const currentTime = new Date().toLocaleString();

    if (!amountPaid.trim()) {
      if (Platform.OS === "web") {
        window.alert("Amount Paid is required.");
      } else {
        Alert.alert("Validation Error", "Amount Paid is required.");
      }
      return;
    }
    if (parsedAmountPaid < totalDue) {
      if (Platform.OS === "web") {
        window.alert(`Amount Paid (₱${parsedAmountPaid.toFixed(2)}) must be at least Total Due (₱${totalDue.toFixed(2)}).`);
      } else {
        Alert.alert("Validation Error", `Amount Paid (₱${parsedAmountPaid.toFixed(2)}) must be at least Total Due (₱${totalDue.toFixed(2)}).`);
      }
      return;
    }
    if (pax <= 0) {
      if (Platform.OS === "web") {
        window.alert("Number of customers must be greater than 0.");
      } else {
        Alert.alert("Validation Error", "Number of customers must be greater than 0.");
      }
      return;
    }
    if (seniors > pax) {
      if (Platform.OS === "web") {
        window.alert("Number of seniors cannot exceed total number of customers.");
      } else {
        Alert.alert("Validation Error", "Number of seniors cannot exceed total number of customers.");
      }
      return;
    }
    if (cart.length === 0) {
      if (Platform.OS === "web") {
        window.alert("Cart is empty. Add items before checking out.");
      } else {
        Alert.alert("Validation Error", "Cart is empty. Add items before checking out.");
      }
      return;
    }

    if (Platform.OS === "web") {
      const confirmed = window.confirm(
        `Total Due: ₱${totalDue.toFixed(2)}\nAmount Paid: ₱${parsedAmountPaid.toFixed(2)}\nProceed with checkout?`
      );
      if (!confirmed) {
        return;
      }
      proceedWithCheckout(parsedAmountPaid, pax, seniors, tableNumber, notesText, currentTime);
    } else {
      Alert.alert(
        "Confirm Checkout",
        `Total Due: ₱${totalDue.toFixed(2)}\nAmount Paid: ₱${parsedAmountPaid.toFixed(2)}\nProceed with checkout?`,
        [
          { text: "Cancel", style: "cancel" },
          {
            text: "Yes",
            onPress: () => proceedWithCheckout(parsedAmountPaid, pax, seniors, tableNumber, notesText, currentTime),
          },
        ],
        { cancelable: false }
      );
    }
  };

  const proceedWithCheckout = async (parsedAmountPaid, pax, seniors, tableNumber, notesText, currentTime) => {
    setLoading(true);
    setError(null);
    try {
      const token = await AsyncStorage.getItem("token");
      if (!token) throw new Error("No authentication token found. Please log in.");
      const apiUrl = await getAPIUrl();

      const formattedCart = cart.map(({ productCode, quantity, price }) => {
        const parsedQuantity = parseFloat(quantity);
        const parsedPrice = parseFloat(price);
        if (isNaN(parsedQuantity) || isNaN(parsedPrice)) {
          throw new Error(`Invalid cart item: ${productCode}`);
        }
        return { productCode, quantity: parsedQuantity, price: parsedPrice };
      });

      console.log("Sending checkout request:", {
        cart: formattedCart,
        dineIn,
        amountPaid: parsedAmountPaid,
        discountCode: discountCode || null,
        numberOfPax: pax,
        numberOfSeniors: seniors,
        tableNo: tableNumber,
        notes: notesText,
      });

      const response = await axios.post(
        `${apiUrl}/pos/checkout`,
        {
          cart: formattedCart,
          dineIn,
          amountPaid: parsedAmountPaid,
          discountCode: discountCode || null,
          numberOfPax: pax,
          numberOfSeniors: seniors,
          tableNo: tableNumber,
          notes: notesText,
        },
        { headers: { Authorization: `Bearer ${token}` } }
      );

      console.log("Checkout response:", response.data);

      if (response.data.status !== "success") {
        throw new Error(response.data.message || "Checkout failed unexpectedly.");
      }

      setModalVisible(false);

      const { invoiceNo, total, netOfVat, vat, vatDiscount, percentageDiscount, totalDiscount, totalDue, change } = response.data;

      setCurrentInvoiceNo(invoiceNo || "N/A");
      setCheckoutTime(currentTime);

      let receipt = `
Transaction Complete!
------------------------------
Invoice: ${invoiceNo || "N/A"}
Date:    ${currentTime}
Table:   ${tableNumber || "N/A"}
------------------------------
Items:
`;
      cart.forEach((item) => {
        const qty = item.quantity.toString().padStart(2);
        const price = `${parseFloat(item.price).toFixed(2)}`.padStart(7);
        const subtotal = `${parseFloat(item.subtotal).toFixed(2)}`.padStart(7);
        const productName = item.productName.length > 20 ? item.productName.substring(0, 17) + "..." : item.productName.padEnd(20);
        receipt += `${productName}
  Qty: ${qty} x ${price} = ${subtotal}
`;
      });
      receipt += `
------------------------------
Total:       ${parseFloat(total || 0).toFixed(2).padStart(7)}
Net VAT:     ${parseFloat(netOfVat || 0).toFixed(2).padStart(7)}
VAT:         ${parseFloat(vat || 0).toFixed(2).padStart(7)}
VAT Disc:    ${parseFloat(vatDiscount || 0).toFixed(2).padStart(7)}
Tot Disc:    ${parseFloat(totalDiscount || 0).toFixed(2).padStart(7)}
Due:         ${parseFloat(totalDue || 0).toFixed(2).padStart(7)}
Paid:        ${parsedAmountPaid.toFixed(2).padStart(7)}
Change:      ${parseFloat(change || 0).toFixed(2).padStart(7)}
Type:        ${dineIn ? "Dine In" : "Take Out"}
------------------------------
Thank you!
`;

      setReceiptContent(receipt);
      setReceiptModalVisible(true);
    } catch (error) {
      console.log("Checkout Error:", {
        message: error.message,
        status: error.response?.status,
        data: error.response?.data,
        requestData: {
          cart,
          dineIn,
          amountPaid: parsedAmountPaid,
          discountCode,
          numberOfPax: pax,
          numberOfSeniors: seniors,
          tableNo: tableNumber,
          notes: notesText,
        },
      });

      let errorMessage = error.response?.data?.message || error.message || "An error occurred during checkout.";
      if (errorMessage.includes("Amount paid must be equal to or greater than total due")) {
        errorMessage = "Insufficient funds. Amount paid must be at least the total due.";
        setModalVisible(false);
        setView("cart");
        setAmountPaid("");
        setDiscountCode("");
        setNumberOfPax("");
        setNumberOfSeniors("");
        setTableNo("");
        setNotes("");
        setTotal(0);
        setDiscountAmount(0);
        setVatDiscount(0);
        setPercentageDiscount(0);
        setTotalDue(0);
      } else if (error.response?.status === 401) {
        handleError(error);
        return;
      } else {
        setModalVisible(false);
        setView("cart");
      }
      if (Platform.OS === "web") {
        window.alert(errorMessage);
      } else {
        Alert.alert("Checkout Failed", errorMessage);
      }
    } finally {
      setLoading(false);
    }
  };

  const cancelCheckout = () => {
    setModalVisible(false);
    setView("cart");
    setAmountPaid("");
    setDiscountCode("");
    setNumberOfPax("");
    setNumberOfSeniors("");
    setTableNo("");
    setNotes("");
    setTotal(0);
    setDiscountAmount(0);
    setVatDiscount(0);
    setPercentageDiscount(0);
    setTotalDue(0);
  };

  const generateKitchenOrder = () => {
    let kitchenOrder = `
Alicias Special Batchoy
Kitchen Order
Order #: ${currentInvoiceNo}
Type: ${dineIn ? "Dine In" : "Take Out"}
Served by: ${serverName}
Checkout Time: ${checkoutTime}
--------------------
`;
    cart.forEach((item) => {
      kitchenOrder += `Product: ${item.productName || "Unknown Product"}
Qty: ${item.quantity || 0}
--------------------
`;
    });

    const notesText = notes.trim() || "None";
    const totalItems = cart.reduce((sum, item) => sum + (parseInt(item.quantity) || 0), 0);
    kitchenOrder += `Notes: ${notesText}
Total Items: ${totalItems}
Thank You!

[Manual tear]
`;

    setKitchenOrderContent(kitchenOrder);
  };

  const handleReceiptClose = () => {
    setReceiptModalVisible(false);
    generateKitchenOrder();
    setKitchenOrderModalVisible(true);
  };

  const handleKitchenOrderClose = () => {
    setKitchenOrderModalVisible(false);
    setCart([]);
    saveCart([]);
    setView("products");
    setAmountPaid("");
    setDiscountCode("");
    setNumberOfPax("");
    setNumberOfSeniors("");
    setTableNo("");
    setNotes("");
    setTotal(0);
    setDiscountAmount(0);
    setVatDiscount(0);
    setPercentageDiscount(0);
    setTotalDue(0);
    setSelectedCategory(null);
    setCurrentInvoiceNo("");
    setCheckoutTime("");
    fetchCategories();
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
      {item.imageUrl && !imageErrors[item.ProductCode] ? (
        <Image
          ref={(ref) => (imageRefs.current[item.ProductCode] = ref)}
          source={{ uri: item.imageUrl }}
          style={styles.productImage}
          resizeMode="cover"
          onError={() => {
            setImageErrors((prev) => ({ ...prev, [item.ProductCode]: true }));
          }}
        />
      ) : (
        <View style={styles.productImagePlaceholder}>
          <Text style={styles.placeholderText}>No Image</Text>
        </View>
      )}
      <Text style={styles.productName}>{item.Product}</Text>
      <Text style={styles.productPrice}>₱{item.price?.toFixed(2)}</Text>
      <View style={styles.quantityContainer}>
        <TouchableOpacity
          style={styles.quantityButton}
          onPress={() => updateQuantity(item.ProductCode, -1)}
          disabled={loading || quantities[item.ProductCode] <= 0}
        >
          <Text style={styles.quantityButtonText}>−</Text>
        </TouchableOpacity>
        <Text style={styles.quantityText}>{quantities[item.ProductCode]}</Text>
        <TouchableOpacity
          style={styles.quantityButton}
          onPress={() => updateQuantity(item.ProductCode, 1)}
          disabled={loading}
        >
          <Text style={styles.quantityButtonText}>+</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={styles.addButton}
          onPress={() => addToCart(item)}
          disabled={loading || quantities[item.ProductCode] <= 0}
        >
          <Text style={styles.addButtonText}>Add</Text>
        </TouchableOpacity>
      </View>
    </View>
  );

  const renderCartItem = ({ item, index }) => (
    <View style={styles.cartItem}>
      <View style={styles.cartItemDetails}>
        <Text style={styles.cartItemText}>
          {item.productName} x{item.quantity} = ₱{item.subtotal.toFixed(2)}
        </Text>
        <View style={styles.quantityContainer}>
          <TouchableOpacity
            style={styles.quantityButton}
            onPress={() => updateCartQuantity(index, -1)}
            disabled={loading}
          >
            <Text style={styles.quantityButtonText}>−</Text>
          </TouchableOpacity>
          <Text style={styles.quantityText}>{item.quantity}</Text>
          <TouchableOpacity
            style={styles.quantityButton}
            onPress={() => updateCartQuantity(index, 1)}
            disabled={loading}
          >
            <Text style={styles.quantityButtonText}>+</Text>
          </TouchableOpacity>
        </View>
      </View>
      <TouchableOpacity onPress={() => removeFromCart(index)} disabled={loading}>
        <Ionicons name="trash" size={20} color="#D32F2F" />
      </TouchableOpacity>
    </View>
  );

  return (
    <View
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
        <TouchableOpacity style={styles.navItem} onPress={() => navigation.navigate("Home")}>
          <Ionicons name="home-outline" size={20} color="#3D2C29" />
          <Text style={styles.navText}>Home</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.navItem} onPress={() => navigation.navigate("PendingOrders")}>
          <Ionicons name="hourglass-outline" size={20} color="#3D2C29" />
          <Text style={styles.navText}>Pending Orders</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.navItem} onPress={() => navigation.navigate("RunningBills")}>
          <Ionicons name="receipt-outline" size={20} color="#3D2C29" />
          <Text style={styles.navText}>Running Bills</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={styles.navItem}
          onPress={() => setView("cart")}
          disabled={loading || cart.length === 0}
        >
          <Ionicons name="cart-outline" size={20} color="#3D2C29" />
          <Text style={styles.navText}>Cart ({calculateTotalQuantity()})</Text>
        </TouchableOpacity>
      </View>

      {view === "products" && (
        <>
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
              <TouchableOpacity style={styles.clearSearchButton} onPress={clearSearch}>
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
              scrollEventThrottle={16}
              onMouseDown={Platform.OS === "web" ? handleMouseDown : undefined}
            />
          </View>
        </>
      )}

      {loading ? (
        <ActivityIndicator size="large" color="#F28C38" style={styles.loading} />
      ) : error ? (
        <View style={styles.errorContainer}>
          <Text style={styles.errorText}>{error}</Text>
          <TouchableOpacity style={styles.retryButton} onPress={fetchCategories}>
            <Text style={styles.retryButtonText}>Retry</Text>
          </TouchableOpacity>
        </View>
      ) : view === "products" && selectedCategory ? (
        <FlatList
          data={filteredProducts}
          renderItem={renderProduct}
          keyExtractor={(item) => item.ProductCode?.toString() || Math.random().toString()}
          contentContainerStyle={styles.productContainer}
          numColumns={2}
          ListEmptyComponent={<Text style={styles.noDataText}>No products found.</Text>}
        />
      ) : view === "cart" ? (
        <View style={styles.contentContainer}>
          <TouchableOpacity
            style={styles.backButton}
            onPress={() => setView("products")}
            disabled={loading}
          >
            <Ionicons name="arrow-back" size={20} color="#FFF" />
            <Text style={styles.backButtonText}>Back to Products</Text>
          </TouchableOpacity>
          <FlatList
            data={cart}
            renderItem={renderCartItem}
            keyExtractor={(item, index) => index.toString()}
            contentContainerStyle={styles.cartList}
            ListHeaderComponent={
              <View style={styles.cartSummary}>
                <Text style={styles.cartHeader}>Cart Total: ₱{total.toFixed(2)}</Text>
              </View>
            }
            ListEmptyComponent={<Text style={styles.noDataText}>Cart is empty.</Text>}
          />
          {cart.length > 0 && (
            <TouchableOpacity style={styles.clearCartButton} onPress={clearCart} disabled={loading}>
              <Text style={styles.clearCartButtonText}>Clear Cart</Text>
            </TouchableOpacity>
          )}
          <TouchableOpacity
            style={styles.checkoutButton}
            onPress={initiateCheckout}
            disabled={loading || cart.length === 0}
          >
            <Text style={styles.checkoutButtonText}>Checkout</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <View style={styles.contentContainer}>
          <FlatList
            data={cart}
            renderItem={renderCartItem}
            keyExtractor={(item, index) => index.toString()}
            contentContainerStyle={styles.cartList}
            ListHeaderComponent={
              <View style={styles.cartSummary}>
                <Text style={styles.cartHeader}>Cart Total: ₱{total.toFixed(2)}</Text>
                {discountAmount > 0 && (
                  <>
                    <Text style={styles.cartHeader}>VAT Discount: ₱{vatDiscount.toFixed(2)}</Text>
                    <Text style={styles.cartHeader}>Percentage Discount: ₱{percentageDiscount.toFixed(2)}</Text>
                    <Text style={styles.cartHeader}>Total Discount: ₱{discountAmount.toFixed(2)}</Text>
                  </>
                )}
                <Text style={styles.cartHeader}>Total Due: ₱{totalDue.toFixed(2)}</Text>
              </View>
            }
            ListEmptyComponent={<Text style={styles.noDataText}>Cart is empty.</Text>}
          />

          <Modal
            animationType="slide"
            transparent={true}
            visible={modalVisible}
            onRequestClose={cancelCheckout}
          >
            <View style={styles.modalOverlay}>
              <ScrollView contentContainerStyle={styles.modalContent}>
                <Text style={styles.modalTitle}>Enter Payment Details</Text>
                <TextInput
                  style={styles.input}
                  placeholder="Number of Customers"
                  placeholderTextColor="#000000"
                  value={numberOfPax}
                  onChangeText={(text) => {
                    setNumberOfPax(text);
                    setDiscountAmount(0);
                    setVatDiscount(0);
                    setPercentageDiscount(0);
                    setTotalDue(total);
                  }}
                  keyboardType="numeric"
                  editable={!loading}
                />
                <TextInput
                  style={styles.input}
                  placeholder="Number of Seniors"
                  placeholderTextColor="#000000"
                  value={numberOfSeniors}
                  onChangeText={(text) => {
                    setNumberOfSeniors(text);
                    setDiscountAmount(0);
                    setVatDiscount(0);
                    setPercentageDiscount(0);
                    setTotalDue(total);
                  }}
                  keyboardType="numeric"
                  editable={!loading}
                />
                <TextInput
                  style={styles.input}
                  placeholder="Table Number"
                  placeholderTextColor="#000000"
                  value={tableNo}
                  onChangeText={setTableNo}
                  keyboardType="numeric"
                  editable={!loading}
                />
                <TextInput
                  style={styles.input}
                  placeholder="Notes (optional)"
                  placeholderTextColor="#000000"
                  value={notes}
                  onChangeText={setNotes}
                  editable={!loading}
                />
                <TextInput
                  style={styles.input}
                  placeholder="Discount code (optional)"
                  placeholderTextColor="#000000"
                  value={discountCode}
                  onChangeText={(text) => {
                    setDiscountCode(text);
                    setDiscountAmount(0);
                    setVatDiscount(0);
                    setPercentageDiscount(0);
                    setTotalDue(total);
                  }}
                  keyboardType="numeric"
                  editable={!loading}
                />
                <TouchableOpacity
                  style={styles.applyButton}
                  onPress={applyDiscount}
                  disabled={loading}
                >
                  <Text style={styles.applyButtonText}>Apply Discount</Text>
                </TouchableOpacity>
                <Text style={styles.summaryText}>Original Total: ₱{total.toFixed(2)}</Text>
                {discountAmount > 0 && (
                  <>
                    <Text style={styles.summaryText}>VAT Discount: ₱{vatDiscount.toFixed(2)}</Text>
                    <Text style={styles.summaryText}>Percentage Discount: ₱{percentageDiscount.toFixed(2)}</Text>
                    <Text style={styles.summaryText}>Total Discount: ₱{discountAmount.toFixed(2)}</Text>
                  </>
                )}
                <Text style={styles.summaryText}>Total Due: ₱{totalDue.toFixed(2)}</Text>
                <TextInput
                  style={styles.input}
                  placeholder="Amount Paid (₱)"
                  placeholderTextColor="#000000"
                  value={amountPaid}
                  onChangeText={setAmountPaid}
                  keyboardType="numeric"
                  editable={!loading}
                />
                <View style={styles.optionContainer}>
                  <TouchableOpacity
                    style={[styles.optionButton, dineIn && styles.selectedOption]}
                    onPress={() => setDineIn(true)}
                    disabled={loading}
                  >
                    <Text style={dineIn ? styles.selectedOptionText : styles.optionText}>Dine In</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={[styles.optionButton, !dineIn && styles.selectedOption]}
                    onPress={() => setDineIn(false)}
                    disabled={loading}
                  >
                    <Text style={!dineIn ? styles.selectedOptionText : styles.optionText}>Take Out</Text>
                  </TouchableOpacity>
                </View>
                <View style={styles.modalButtonContainer}>
                  <TouchableOpacity
                    style={styles.cancelButton}
                    onPress={cancelCheckout}
                    disabled={loading}
                  >
                    <Text style={styles.cancelButtonText}>Cancel</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={styles.confirmButton}
                    onPress={confirmCheckout}
                    disabled={loading}
                  >
                    <Text style={styles.confirmButtonText}>
                      {loading ? "Processing..." : "Confirm"}
                    </Text>
                  </TouchableOpacity>
                </View>
              </ScrollView>
            </View>
          </Modal>

          <Modal
            animationType="slide"
            transparent={true}
            visible={receiptModalVisible}
            onRequestClose={handleReceiptClose}
          >
            <View style={styles.modalOverlay}>
              <ScrollView contentContainerStyle={styles.receiptModalContent}>
                <Text style={styles.modalTitle}>Transaction Receipt</Text>
                <Text style={styles.receiptText}>{receiptContent}</Text>
                <TouchableOpacity
                  style={styles.confirmButton}
                  onPress={handleReceiptClose}
                >
                  <Text style={styles.confirmButtonText}>OK</Text>
                </TouchableOpacity>
              </ScrollView>
            </View>
          </Modal>

          <Modal
            animationType="slide"
            transparent={true}
            visible={kitchenOrderModalVisible}
            onRequestClose={handleKitchenOrderClose}
          >
            <View style={styles.modalOverlay}>
              <ScrollView contentContainerStyle={styles.receiptModalContent}>
                <Text style={styles.modalTitle}>Kitchen Order</Text>
                <Text style={styles.receiptText}>{kitchenOrderContent}</Text>
                <TouchableOpacity
                  style={styles.confirmButton}
                  onPress={handleKitchenOrderClose}
                >
                  <Text style={styles.confirmButtonText}>Close</Text>
                </TouchableOpacity>
              </ScrollView>
            </View>
          </Modal>
        </View>
      )}
    </View>
  );
};

export default POSScreen;