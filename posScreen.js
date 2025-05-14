import React, { useState, useEffect } from "react";
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
} from "react-native";
import { useNavigation } from "@react-navigation/native";
import { Ionicons } from "@expo/vector-icons";
import axios from "axios";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { getAPIUrl } from "./config";
import styles from "./css/posScreen.styles";

const POSScreen = () => {
  const [view, setView] = useState("products");
  const [categories, setCategories] = useState([]);
  const [products, setProducts] = useState([]);
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
  const [receiptContent, setReceiptContent] = useState("");
  const [total, setTotal] = useState(0);
  const [totalDue, setTotalDue] = useState(0);
  const [discountAmount, setDiscountAmount] = useState(0);
  const [vatDiscount, setVatDiscount] = useState(0);
  const [percentageDiscount, setPercentageDiscount] = useState(0);
  const [numberOfPax, setNumberOfPax] = useState("");
  const [numberOfSeniors, setNumberOfSeniors] = useState("");
  const navigation = useNavigation();

  useEffect(() => {
    fetchCategories();
    checkPOSRole();
    loadCart();
  }, []);

  useEffect(() => {
    calculateTotal();
  }, [cart]);

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
      Alert.alert("Access Error", error.message, [
        { text: "OK", onPress: () => navigation.navigate(error.message.includes("log in") ? "Login" : "Home") },
      ]);
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
      setCategories(response.data.categories);
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
      const productsWithPrices = await Promise.all(
        response.data.products.map(async (product) => {
          const priceResponse = await axios.get(`${apiUrl}/stocks/${categoryCode}/${product.ProductCode}/price`, {
            headers: { Authorization: `Bearer ${token}` },
          });
          return { ...product, price: priceResponse.data.price || 100 };
        })
      );
      setProducts(productsWithPrices);
      const initialQuantities = productsWithPrices.reduce((acc, product) => {
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

  const addToCart = (product) => {
    const qty = quantities[product.ProductCode];
    if (qty <= 0 || isNaN(parseFloat(qty))) {
      setError("Please select a valid quantity greater than 0.");
      return;
    }
    const price = parseFloat(product.price);
    if (isNaN(price)) {
      setError("Invalid price for product.");
      return;
    }
    const subtotal = qty * price;
    const cartItem = {
      productCode: product.ProductCode,
      productName: product.Product,
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
  };

  const removeFromCart = (index) => {
    const newCart = [...cart];
    newCart.splice(index, 1);
    setCart(newCart);
    saveCart(newCart);
  };

  const clearCart = () => {
    setCart([]);
    saveCart([]);
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
      Alert.alert("Validation Error", "Number of customers must be greater than 0.");
      return;
    }
    if (seniors > pax) {
      Alert.alert("Validation Error", "Number of seniors cannot exceed total number of customers.");
      return;
    }
    if (!discountCode.trim()) {
      Alert.alert("Validation Error", "Please enter a discount code to apply a discount.");
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
            quantity,
            price,
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
      console.log("Apply Discount Error:", { message: error.message });
      Alert.alert("Discount Error", error.message);
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
    console.log("Handle Error:", { message: error.message, status: error.response?.status });
    if (error.response?.status === 401) {
      Alert.alert("Session Expired", "Please log in again.", [
        { text: "OK", onPress: () => navigation.navigate("Login") },
      ]);
      AsyncStorage.removeItem("token");
      AsyncStorage.removeItem("userData");
    } else {
      setError(error.message || "An unexpected error occurred.");
    }
  };

  const confirmCheckout = async () => {
    const parsedAmountPaid = parseFloat(amountPaid) || 0;
    const pax = parseInt(numberOfPax) || 0;
    const seniors = parseInt(numberOfSeniors) || 0;

    if (!amountPaid.trim()) {
      Alert.alert("Validation Error", "Amount Paid is required.");
      return;
    }
    if (pax <= 0) {
      Alert.alert("Validation Error", "Number of customers must be greater than 0.");
      return;
    }
    if (seniors > pax) {
      Alert.alert("Validation Error", "Number of seniors cannot exceed total number of customers.");
      return;
    }

    setLoading(true);
    setError(null);
    try {
      const token = await AsyncStorage.getItem("token");
      if (!token) throw new Error("No authentication token found. Please log in.");
      const apiUrl = await getAPIUrl();
      const response = await axios.post(
        `${apiUrl}/pos/checkout`,
        {
          cart: cart.map(({ productCode, quantity, price }) => {
            const parsedQuantity = parseFloat(quantity);
            const parsedPrice = parseFloat(price);
            if (isNaN(parsedQuantity) || isNaN(parsedPrice)) {
              throw new Error(`Invalid cart item: ${productCode}`);
            }
            return { productCode, quantity: parsedQuantity, price: parsedPrice };
          }),
          dineIn,
          amountPaid: parsedAmountPaid,
          discountCode: discountCode || null,
          numberOfPax: pax,
          numberOfSeniors: seniors,
        },
        { headers: { Authorization: `Bearer ${token}` } }
      );

      if (response.data.status !== "success") {
        throw new Error(response.data.message || "Checkout failed unexpectedly.");
      }

      setModalVisible(false);

      const { invoiceNo, total, netOfVat, vat, vatDiscount, percentageDiscount, totalDiscount, totalDue, change, discountPercentage } = response.data;

      let receipt = `
        Transaction Completed Successfully!\n
        ------------------------------------\n
        Invoice No: ${invoiceNo || "N/A"}\n
        Date: ${new Date().toLocaleString()}\n
        ------------------------------------\n
        Items:\n
      `;
      cart.forEach((item) => {
        receipt += `  ${item.productName}\n`;
        receipt += `    Qty: ${item.quantity} x ₱${parseFloat(item.price).toFixed(2)} = ₱${parseFloat(item.subtotal).toFixed(2)}\n`;
      });
      receipt += `
        ------------------------------------\n
        Original Total: ₱${parseFloat(total || 0).toFixed(2)}\n
        Net of VAT: ₱${parseFloat(netOfVat || 0).toFixed(2)}\n
        VAT: ₱${parseFloat(vat || 0).toFixed(2)}\n
        VAT Discount (Seniors): ₱${parseFloat(vatDiscount || 0).toFixed(2)}\n
        ${discountPercentage || 0}% Discount: ₱${parseFloat(percentageDiscount || 0).toFixed(2)}\n
        Total Discount: ₱${parseFloat(totalDiscount || 0).toFixed(2)}\n
        Total Due: ₱${parseFloat(totalDue || 0).toFixed(2)}\n
        Amount Paid: ₱${parsedAmountPaid.toFixed(2)}\n
        Change: ₱${parseFloat(change || 0).toFixed(2)}\n
        Type: ${dineIn ? "Dine In" : "Take Out"}\n
        Number of Customers: ${pax}\n
        Number of Seniors: ${seniors}\n
        ------------------------------------\n
        Thank you for your purchase!
      `;

      setReceiptContent(receipt);
      setReceiptModalVisible(true);

    } catch (error) {
      console.log("Checkout Error:", {
        message: error.response?.data?.message || error.message,
        status: error.response?.data?.status,
      });

      if (error.response?.data?.message?.includes("Amount paid must be equal to or greater than total due")) {
        setModalVisible(false);
        setView("cart");
        setAmountPaid("");
        setDiscountCode("");
        setNumberOfPax("");
        setNumberOfSeniors("");
        setTotal(0);
        setDiscountAmount(0);
        setVatDiscount(0);
        setPercentageDiscount(0);
        setTotalDue(0);

        Alert.alert(
          "Payment Error",
          "Insufficient funds",
          [
            {
              text: "OK",
              onPress: () => {},
            },
          ],
          { cancelable: false }
        );
      } else {
        const errorMessage = error.response?.data?.message || error.message || "An error occurred during checkout.";
        handleError(error);
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
    setTotal(0);
    setDiscountAmount(0);
    setVatDiscount(0);
    setPercentageDiscount(0);
    setTotalDue(0);
  };

  const handleReceiptClose = () => {
    setReceiptModalVisible(false);
    setCart([]);
    saveCart([]);
    setView("products");
    setAmountPaid("");
    setDiscountCode("");
    setNumberOfPax("");
    setNumberOfSeniors("");
    setTotal(0);
    setDiscountAmount(0);
    setVatDiscount(0);
    setPercentageDiscount(0);
    setTotalDue(0);
    setSelectedCategory(null);
    fetchCategories();
  };

  const renderCategory = ({ item }) => (
    <TouchableOpacity
      style={styles.categoryItem}
      onPress={() => fetchProducts(item.CategoryCode)}
      disabled={loading}
    >
      <Text style={styles.categoryText}>{item.Category || "Unnamed Category"}</Text>
    </TouchableOpacity>
  );

  const renderProduct = ({ item }) => (
    <View style={styles.productItem}>
      <Text style={styles.productText}>
        {item.Product} (Stock: {item.Stock}, Price: ₱{item.price.toFixed(2)})
      </Text>
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
          disabled={loading || item.Stock <= quantities[item.ProductCode]}
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
      <Text style={styles.cartItemText}>
        {item.productName} x{item.quantity} = ₱{item.subtotal.toFixed(2)}
      </Text>
      <TouchableOpacity onPress={() => removeFromCart(index)} disabled={loading}>
        <Ionicons name="trash" size={20} color="#D32F2F" />
      </TouchableOpacity>
    </View>
  );

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        {(view === "products" || view === "checkout") && (
          <TouchableOpacity style={styles.backButton} onPress={() => navigation.goBack()} disabled={loading}>
            <Ionicons name="arrow-back" size={20} color="#FFF" />
            <Text style={styles.backButtonText}>Back</Text>
          </TouchableOpacity>
        )}
        <Text style={styles.title}>
          {view === "products" ? "POS System" : view === "cart" ? "Cart" : "Checkout"}
        </Text>
      </View>

      {view === "products" && (
        <>
          <TouchableOpacity
            style={styles.viewCartButton}
            onPress={() => setView("cart")}
            disabled={loading || cart.length === 0}
          >
            <Ionicons name="cart-outline" size={24} color="#FFF" />
            <Text style={styles.viewCartButtonText}>View Cart (Qty: {calculateTotalQuantity()})</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.viewCartButton} // Using same style as viewCartButton
            disabled={loading}
          >
            <Ionicons name="qr-code-outline" size={24} color="#FFF" />
            <Text style={styles.viewCartButtonText}>Scan QR Code</Text>
          </TouchableOpacity>
        </>
      )}

      {loading ? (
        <ActivityIndicator size="large" color="#A0522D" style={styles.loading} />
      ) : error ? (
        <View style={styles.errorContainer}>
          <Text style={styles.errorText}>{error}</Text>
          <TouchableOpacity style={styles.retryButton} onPress={fetchCategories}>
            <Text style={styles.retryButtonText}>Retry</Text>
          </TouchableOpacity>
        </View>
      ) : view === "products" ? (
        !selectedCategory ? (
          <FlatList
            data={categories}
            renderItem={renderCategory}
            keyExtractor={(item) => item.CategoryCode.toString()}
            contentContainerStyle={styles.list}
            ListEmptyComponent={<Text style={styles.noDataText}>No categories available.</Text>}
          />
        ) : (
          <View style={styles.contentContainer}>
            <TouchableOpacity
              style={styles.backButton}
              onPress={() => setSelectedCategory(null)}
              disabled={loading}
            >
              <Text style={styles.backButtonText}>Back to Categories</Text>
            </TouchableOpacity>
            <FlatList
              data={products}
              renderItem={renderProduct}
              keyExtractor={(item) => item.ProductCode.toString()}
              contentContainerStyle={styles.productList}
              ListEmptyComponent={<Text style={styles.noDataText}>No products available.</Text>}
            />
          </View>
        )
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
        </View>
      )}
    </View>
  );
};

export default POSScreen;
