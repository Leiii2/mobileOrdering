import React, { useState, useEffect, useRef } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  FlatList,
  ActivityIndicator,
  SafeAreaView,
  Image,
  Modal,
  Animated,
  Easing,
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
import { v4 as uuidv4 } from "uuid";

const CustomerOrderScreen = () => {
  const [categories, setCategories] = useState([]);
  const [products, setProducts] = useState([]);
  const [filteredProducts, setFilteredProducts] = useState([]);
  const [selectedCategory, setSelectedCategory] = useState(null);
  const [loading, setLoading] = useState(false);
  const [imageErrors, setImageErrors] = useState({});
  const [showImagePreview, setShowImagePreview] = useState(false);
  const [previewImageUri, setPreviewImageUri] = useState(null);
  const [cart, setCart] = useState([]);
  const [showCartModal, setShowCartModal] = useState(false);
  const [showPendingOrdersModal, setShowPendingOrdersModal] = useState(false);
  const [pendingOrders, setPendingOrders] = useState([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [tableTaken, setTableTaken] = useState(false);
  const [tableStatusMessage, setTableStatusMessage] = useState("");
  const navigation = useNavigation();
  const route = useRoute();
  const insets = useSafeAreaInsets();
  const [cartAnimation, setCartAnimation] = useState(null);
  const animatedValue = useRef(new Animated.Value(0)).current;
  const cartIconRef = useRef(null);
  const imageRefs = useRef({});
  const searchInputRef = useRef(null);
  const categoryListRef = useRef(null);
  const isDragging = useRef(false);
  const startX = useRef(0);
  const scrollOffset = useRef(0);

  const tableNo = route.params?.tableNo?.toString() || "";
  const [deviceId, setDeviceId] = useState(null);

  const saveCartToStorage = async (newCart) => {
    try {
      await AsyncStorage.setItem(`cart_${deviceId}_${tableNo}`, JSON.stringify(newCart));
      console.log("CustomerOrderScreen: Cart saved to AsyncStorage for table:", tableNo, "deviceId:", deviceId);
    } catch (error) {
      console.warn("CustomerOrderScreen: Failed to save cart to AsyncStorage:", {
        message: error.message,
        tableNo,
        deviceId,
      });
    }
  };

  const loadCartFromStorage = async () => {
    try {
      const storedCart = await AsyncStorage.getItem(`cart_${deviceId}_${tableNo}`);
      if (storedCart) {
        setCart(JSON.parse(storedCart));
        console.log("CustomerOrderScreen: Cart loaded from AsyncStorage for table:", tableNo, "deviceId:", deviceId);
      }
    } catch (error) {
      console.warn("CustomerOrderScreen: Failed to load cart from AsyncStorage:", {
        message: error.message,
        tableNo,
        deviceId,
      });
    }
  };

  const checkTableAvailability = async () => {
    if (!tableNo || !deviceId) {
      setTableTaken(true);
      setTableStatusMessage("Table number and device ID are required.");
      console.warn("CustomerOrderScreen: Missing tableNo or deviceId for availability check", { tableNo, deviceId });
      return;
    }

    try {
      setLoading(true);
      const apiUrl = await getAPIUrl();
      const response = await axios.get(`${apiUrl}/customer-order/check-table/${tableNo}`, {
        params: { deviceId },
        timeout: 10000,
      });

      if (response.data.status === "success") {
        setTableTaken(false);
        setTableStatusMessage("");
        console.log("CustomerOrderScreen: Table is available or owned by deviceId:", deviceId);
      } else {
        setTableTaken(true);
        setTableStatusMessage(response.data.message || "Table number already taken by another device or invalid.");
        console.log("CustomerOrderScreen: Table check failed:", response.data.message);
      }
    } catch (error) {
      console.error("CustomerOrderScreen: Check Table Availability Error:", {
        message: error.message,
        status: error.response?.status,
        data: error.response?.data,
        tableNo,
        deviceId,
      });
      setTableTaken(true);
      setTableStatusMessage(
        error.response?.data?.message || (error.response?.status === 400 ? "Invalid table number." : "Table number already taken by another device.")
      );
    } finally {
      setLoading(false);
      console.log("CustomerOrderScreen: checkTableAvailability completed, loading:", false);
    }
  };

  const fetchPendingOrders = async () => {
    if (!tableNo || !deviceId) {
      console.warn("CustomerOrderScreen: Missing tableNo or deviceId for fetching pending orders", { tableNo, deviceId });
      return;
    }

    try {
      setLoading(true);
      const apiUrl = await getAPIUrl();
      const cacheBuster = Date.now();
      const response = await axios.get(`${apiUrl}/customer-order/pending-orders/${tableNo}`, {
        params: { deviceId, cb: cacheBuster },
        timeout: 10000,
      });

      if (response.data.status === "success") {
        const orders = response.data.orders.map((order) => ({
          ...order,
          Done: Number(order.Done),
        }));
        setPendingOrders(orders);
        console.log("CustomerOrderScreen: Fetched pending orders, count:", orders.length, "orders:", JSON.stringify(orders));
      } else {
        throw new Error(response.data.message || "Failed to fetch pending orders");
      }
    } catch (error) {
      console.error("CustomerOrderScreen: Fetch Pending Orders Error:", {
        message: error.message,
        status: error.response?.status,
        data: error.response?.data,
        tableNo,
        deviceId,
      });
      setPendingOrders([]);
    } finally {
      setLoading(false);
      console.log("CustomerOrderScreen: fetchPendingOrders completed, loading:", false);
    }
  };

  useEffect(() => {
    const loadDeviceId = async () => {
      try {
        let storedDeviceId = await AsyncStorage.getItem("deviceId");
        if (!storedDeviceId) {
          storedDeviceId = uuidv4();
          await AsyncStorage.setItem("deviceId", storedDeviceId);
          console.log("CustomerOrderScreen: Generated new deviceId:", storedDeviceId);
        } else {
          console.log("CustomerOrderScreen: Loaded existing deviceId:", storedDeviceId);
        }
        setDeviceId(storedDeviceId);
      } catch (error) {
        console.error("CustomerOrderScreen: Failed to load/generate deviceId:", {
          message: error.message,
        });
        setTableTaken(true);
        setTableStatusMessage("Failed to load device ID.");
      }
    };
    loadDeviceId();
  }, []);

  useEffect(() => {
    console.log("CustomerOrderScreen: useEffect triggered with route.params:", route.params);
    console.log("CustomerOrderScreen: tableNo:", tableNo, "deviceId:", deviceId);
    if (!tableNo) {
      setTableTaken(true);
      setTableStatusMessage("Table number is required. Please access via a valid deeplink.");
      if (Platform.OS === "web") window.alert("Table number is required.");
      else Alert.alert("Error", "Table number is required.");
      return;
    }
    if (deviceId) {
      checkTableAvailability().then(() => {
        if (!tableTaken) {
          loadCartFromStorage();
          fetchCategories();
          fetchPendingOrders();
        }
      });
    }
  }, [route.params, tableNo, deviceId]);

  useEffect(() => {
    console.log("CustomerOrderScreen: Search query changed:", searchQuery);
    if (searchQuery.trim() === "") {
      setFilteredProducts(products);
    } else {
      const filtered = products.filter((product) =>
        product?.Product?.toLowerCase()?.includes(searchQuery.toLowerCase())
      );
      setFilteredProducts(filtered);
      console.log("CustomerOrderScreen: Filtered products count:", filtered.length);
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
      console.log("CustomerOrderScreen: Mouse down detected for category scroll");
    }
  };

  const handleMouseMove = (event) => {
    if (isDragging.current && Platform.OS === "web" && categoryListRef.current) {
      const deltaX = event.clientX - startX.current;
      const newOffset = scrollOffset.current - deltaX * 1.5;
      categoryListRef.current.scrollToOffset({ offset: newOffset, animated: false });
      scrollOffset.current = newOffset;
      startX.current = event.clientX;
      console.log("CustomerOrderScreen: Mouse move, new scroll offset:", newOffset);
    }
  };

  const handleMouseUp = () => {
    if (Platform.OS === "web") {
      isDragging.current = false;
      document.removeEventListener("mousemove", handleMouseMove);
      document.removeEventListener("mouseup", handleMouseUp);
      console.log("CustomerOrderScreen: Mouse up, dragging ended");
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
      const response = await axios.get(`${apiUrl}/customer-order/categories`, { timeout: 10000 });
      if (Array.isArray(response.data.categories)) {
        const categoriesWithCounts = await Promise.all(
          response.data.categories.map(async (category) => {
            try {
              const productResponse = await axios.get(
                `${apiUrl}/customer-order/stocks/${category.CategoryCode}`,
                { timeout: 10000 }
              );
              return { ...category, itemCount: productResponse.data.products?.length || 0 };
            } catch (error) {
              console.warn(
                "CustomerOrderScreen: Failed to fetch products for category",
                category.CategoryCode,
                error.message
              );
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
      setTableTaken(true);
      setTableStatusMessage("Failed to fetch categories.");
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
      const response = await axios.get(`${apiUrl}/customer-order/stocks/${categoryCode}`, { timeout: 10000 });
      if (response.data.status === "success" && Array.isArray(response.data.products)) {
        const productsWithPricesAndImages = await Promise.all(
          response.data.products.map(async (product) => {
            let price = 100;
            let imageUrl = null;
            try {
              const priceResponse = await axios.get(
                `${apiUrl}/customer-order/stocks/${categoryCode}/${product.ProductCode}/price`,
                { timeout: 10000 }
              );
              price = priceResponse.data.price || 100;
            } catch (error) {
              console.warn("CustomerOrderScreen: Failed to fetch price for product", product.ProductCode, error.message);
            }
            try {
              const extensions = ["jpg", "png", "jpeg"];
              const cacheBuster = Date.now();
              for (const ext of extensions) {
                const potentialImageUrl = `${apiUrl}/Uploads/product_${product.ProductCode}.${ext}?cb=${cacheBuster}`;
                try {
                  const imageResponse = await axios.head(potentialImageUrl, { timeout: 5000 });
                  if (imageResponse.status === 200) {
                    imageUrl = potentialImageUrl;
                    break;
                  }
                } catch (e) {
                  console.warn("CustomerOrderScreen: Image not found for", product.ProductCode, ext);
                }
              }
            } catch (error) {
              console.warn("CustomerOrderScreen: Failed to fetch image for product", product.ProductCode, error.message);
            }
            return { ...product, price, imageUrl };
          })
        );
        setProducts(productsWithPricesAndImages);
        setFilteredProducts(productsWithPricesAndImages);
        console.log("CustomerOrderScreen: Successfully fetched products count:", productsWithPricesAndImages.length);
      } else {
        throw new Error("Invalid products response: Expected 'products' array with status 'success'");
      }
    } catch (error) {
      console.error("CustomerOrderScreen: Fetch Products Error:", {
        message: error.message,
        status: error.response?.status,
        data: error.response?.data,
        categoryCode,
      });
      setProducts([]);
      setFilteredProducts([]);
      setTableTaken(true);
      setTableStatusMessage("Failed to fetch products.");
    } finally {
      setLoading(false);
      console.log("CustomerOrderScreen: fetchProducts completed, loading:", false);
    }
  };

  const addToCart = (product, productCode) => {
    if (tableTaken) return;
    console.log("CustomerOrderScreen: Adding to cart:", product.Product, productCode);
    if (imageRefs.current[productCode] && product.imageUrl && !imageErrors[productCode] && cartIconRef.current) {
      imageRefs.current[productCode].measure((x, y, width, height, pageX, pageY) => {
        cartIconRef.current.measure((cx, cy, cWidth, cHeight, cPageX, cPageY) => {
          const endXOffset = -10;
          const endYOffset = -20;
          const adjustedEndX = cPageX + endXOffset;
          const adjustedEndY = cPageY + endYOffset;

          const animation = Animated.timing(animatedValue, {
            toValue: 1,
            duration: 600,
            easing: Easing.out(Easing.quad),
            useNativeDriver: Platform.OS !== "web",
          });

          setCartAnimation({ product, startX: pageX, startY: pageY, endX: adjustedEndX, endY: adjustedEndY });
          animation.start(() => {
            setCartAnimation(null);
            animatedValue.setValue(0);
          });
        });
      });
    }

    setCart((prevCart) => {
      const existingItem = prevCart.find((item) => item.ProductCode === productCode);
      let newCart;
      if (existingItem) {
        newCart = prevCart.map((item) =>
          item.ProductCode === productCode
            ? { ...item, quantity: (item.quantity || 0) + 1 }
            : item
        );
      } else {
        newCart = [
          ...prevCart,
          {
            id: uuidv4(),
            ...product,
            ProductCode: productCode,
            quantity: 1,
          },
        ];
      }
      saveCartToStorage(newCart);
      console.log("CustomerOrderScreen: Updated cart, items:", newCart.length);
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

  const removeFromCart = (cartItemId) => {
    if (tableTaken) return;
    console.log("CustomerOrderScreen: Removing from cart, id:", cartItemId);
    setCart((prevCart) => {
      const newCart = prevCart.filter((item) => item.id !== cartItemId);
      saveCartToStorage(newCart);
      return newCart;
    });
    const message = "Item removed from cart!";
    if (Platform.OS === "web") window.alert(message);
    else Alert.alert("Success", message);
  };

  const updateQuantity = (cartItemId, newQuantity) => {
    if (tableTaken) return;
    console.log("CustomerOrderScreen: Updating quantity for id:", cartItemId, "to", newQuantity);
    if (newQuantity < 1) {
      removeFromCart(cartItemId);
      return;
    }
    setCart((prevCart) => {
      const newCart = prevCart.map((item) =>
        item.id === cartItemId ? { ...item, quantity: newQuantity } : item
      );
      saveCartToStorage(newCart);
      return newCart;
    });
  };

  const submitCart = async () => {
    if (tableTaken) return;
    console.log("CustomerOrderScreen: Submitting cart:", cart);
    if (cart.length === 0) {
      const message = "Cart is empty.";
      if (Platform.OS === "web") window.alert(message);
      else Alert.alert("Error", message);
      return;
    }
    if (!tableNo || !deviceId) {
      const message = "Table number and device ID are required.";
      if (Platform.OS === "web") window.alert(message);
      else Alert.alert("Error", message);
      return;
    }

    try {
      setLoading(true);
      const orderData = {
        tableNo,
        cart: cart.map((item) => ({
          productCode: item.ProductCode?.toString(),
          quantity: item.quantity || 1,
          price: parseFloat(item.price) || 100,
        })),
        notes: "",
        dineIn: true,
        takeOut: false,
        deviceId,
      };

      if (orderData.cart.some((item) => !item.productCode || item.quantity <= 0 || isNaN(item.price))) {
        throw new Error("Invalid item data in cart.");
      }

      const apiUrl = await getAPIUrl();
      const response = await axios.post(`${apiUrl}/customer-order/accept`, orderData, {
        timeout: 10000,
      });
      if (response.data.status !== "success" || !response.data.order) {
        throw new Error(response.data.message || "Failed to place order.");
      }

      setCart([]);
      await AsyncStorage.removeItem(`cart_${deviceId}_${tableNo}`);
      setShowCartModal(false);
      await fetchPendingOrders();
      const message = "Order placed successfully!";
      if (Platform.OS === "web") {
        if (window.confirm(message + " View pending orders?")) setShowPendingOrdersModal(true);
      } else {
        Alert.alert("Success", message, [
          { text: "Close", style: "cancel" },
          { text: "View Pending Orders", onPress: () => setShowPendingOrdersModal(true) },
        ]);
      }
    } catch (error) {
      console.error("CustomerOrderScreen: Submit Cart Error:", {
        message: error.message,
        status: error.response?.status,
        data: error.response?.data,
        tableNo,
        deviceId,
      });
      const userMessage =
        error.response?.status === 403
          ? error.response.data.message
          : error.response?.status === 400
          ? "Invalid table number or order data."
          : error.message.includes("Network Error") || error.code === "ECONNABORTED"
          ? "Failed to connect to the server."
          : error.response?.data?.message || "Error placing order.";
      if (Platform.OS === "web") window.alert(userMessage);
      else Alert.alert("Error", userMessage);
    } finally {
      setLoading(false);
      console.log("CustomerOrderScreen: submitCart completed, loading:", false);
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

  const getTotal = () => {
    const total = cart
      .reduce((total, item) => total + (item.price || 0) * (item.quantity || 0), 0)
      .toFixed(2);
    console.log("CustomerOrderScreen: Calculated cart total:", total);
    return total;
  };

  const getTotalPendingQuantity = () => {
    const totalQty = pendingOrders.reduce((sum, item) => {
      return item.Done === 0 ? sum + (parseFloat(item.Qty) || 0) : sum;
    }, 0);
    console.log("CustomerOrderScreen: Calculated total pending quantity:", totalQty);
    return totalQty;
  };

  const getTotalAcceptedDue = () => {
    const totalDue = pendingOrders
      .reduce((sum, item) => {
        return item.Done === 1 ? sum + (parseFloat(item.Price) * parseFloat(item.Qty) || 0) : sum;
      }, 0)
      .toFixed(2);
    console.log("CustomerOrderScreen: Calculated total accepted due:", totalDue);
    return totalDue;
  };

  const renderCategory = ({ item }) => (
    <TouchableOpacity
      style={[styles.categoryItem, selectedCategory === item.CategoryCode && styles.categoryItemSelected]}
      onPress={() => fetchProducts(item.CategoryCode)}
      disabled={loading || tableTaken}
    >
      <Ionicons
        name={item.Category === "All Menu" ? "menu" : "restaurant-outline"}
        size={20}
        color={selectedCategory === item.CategoryCode ? "#FFFFFF" : "#3D2C29"}
      />
      <Text style={[styles.categoryText, selectedCategory === item.CategoryCode && styles.categoryTextSelected]}>
        {item.Category || "Unnamed Category"}
      </Text>
      <Text style={[styles.categoryCount, selectedCategory === item.CategoryCode && styles.categoryCountSelected]}>
        {item.itemCount} {item.itemCount === 1 ? "item" : "items"}
      </Text>
    </TouchableOpacity>
  );

  const renderProduct = ({ item }) => (
    <View style={styles.productCard}>
      <TouchableOpacity
        onPress={() => {
          if (item.imageUrl && !imageErrors[item.ProductCode]) {
            setPreviewImageUri(item.imageUrl);
            setShowImagePreview(true);
            console.log("CustomerOrderScreen: Previewing image for product:", item.Product);
          }
        }}
        disabled={!item.imageUrl || imageErrors[item.ProductCode] || tableTaken}
      >
        {item.imageUrl && !imageErrors[item.ProductCode] ? (
          <Image
            ref={(ref) => (imageRefs.current[item.ProductCode] = ref)}
            source={{ uri: item.imageUrl }}
            style={styles.productImage}
            resizeMode="cover"
            onError={() => {
              console.warn("CustomerOrderScreen: Image load error for product:", item.ProductCode);
              setImageErrors((prev) => ({ ...prev, [item.ProductCode]: true }));
            }}
          />
        ) : (
          <View style={styles.productImagePlaceholder}>
            <Text style={styles.placeholderText}>No Image</Text>
          </View>
        )}
      </TouchableOpacity>
      <Text style={styles.productName}>{item.Product || "Unnamed Product"}</Text>
      <Text style={styles.productPrice}>₱{(item.price || 0).toFixed(2)}</Text>
      <View style={styles.quantityContainer}>
        <TouchableOpacity
          style={styles.quantityButton}
          onPress={() => addToCart(item, item.ProductCode)}
          disabled={loading || tableTaken}
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
          onPress={() => updateQuantity(item.id, item.quantity - 1)}
          disabled={loading || tableTaken}
        >
          <Text style={styles.quantityButtonText}>-</Text>
        </TouchableOpacity>
        <Text style={styles.quantityText}>{item.quantity}</Text>
        <TouchableOpacity
          style={styles.quantityButton}
          onPress={() => updateQuantity(item.id, item.quantity + 1)}
          disabled={loading || tableTaken}
        >
          <Text style={styles.quantityButtonText}>+</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.quantityButton, styles.removeButton]}
          onPress={() => removeFromCart(item.id)}
          disabled={loading || tableTaken}
        >
          <Text style={styles.quantityButtonText}>Remove</Text>
        </TouchableOpacity>
      </View>
    </View>
  );

  const renderPendingOrderItem = ({ item }) => (
    <View style={styles.cartItem}>
      <Text style={styles.cartItemName}>
        {item.ProductName} (x{item.Qty}) - POSCode: {item.POSCode}
      </Text>
      <View style={styles.quantityControl}>
        <Text style={styles.cartItemPrice}>₱{(item.Price * item.Qty).toFixed(2)}</Text>
        <Text style={styles.quantityText}>Notes: {item.Notes || "None"}</Text>
        <Text style={[styles.quantityText, item.Done === 1 ? styles.statusAccepted : styles.statusPending]}>
          Status: {item.Done === 1 ? "Accepted" : "Pending"}
        </Text>
      </View>
    </View>
  );

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
      {tableTaken ? (
        <View style={styles.tableTakenContainer}>
          <Text style={styles.tableTakenText}>{tableStatusMessage}</Text>
        </View>
      ) : (
        <>
          <View style={styles.topNav}>
            <TouchableOpacity
              ref={cartIconRef}
              style={styles.navItem}
              onPress={() => {
                console.log("CustomerOrderScreen: Opening cart modal");
                setShowCartModal(true);
              }}
              disabled={loading}
            >
              <Ionicons name="cart-outline" size={20} color="#3D2C29" />
              <Text style={styles.navText}>Cart ({cart.length})</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.navItem}
              onPress={() => {
                console.log("CustomerOrderScreen: Opening pending orders modal");
                fetchPendingOrders();
                setShowPendingOrdersModal(true);
              }}
              disabled={loading}
            >
              <Ionicons name="list-outline" size={20} color="#3D2C29" />
              <Text style={styles.navText}>Pending Orders ({getTotalPendingQuantity()})</Text>
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
              editable={!loading && !tableTaken}
            />
            {searchQuery.length > 0 && (
              <TouchableOpacity
                style={styles.clearSearchButton}
                onPress={clearSearch}
                disabled={loading || tableTaken}
              >
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
            visible={showImagePreview}
            transparent={true}
            animationType="fade"
            onRequestClose={() => {
              console.log("CustomerOrderScreen: Closing image preview modal");
              setShowImagePreview(false);
              setPreviewImageUri(null);
            }}
          >
            <View style={styles.modalContainer}>
              <View style={styles.previewContainer}>
                {previewImageUri && <Image source={{ uri: previewImageUri }} style={styles.previewImage} />}
                <TouchableOpacity
                  style={styles.modalButton}
                  onPress={() => {
                    console.log("CustomerOrderScreen: Closing image preview via button");
                    setShowImagePreview(false);
                    setPreviewImageUri(null);
                  }}
                >
                  <Text style={styles.modalButtonText}>Close</Text>
                </TouchableOpacity>
              </View>
            </View>
          </Modal>
          <Modal
            visible={showCartModal}
            transparent={true}
            animationType="fade"
            onRequestClose={() => {
              console.log("CustomerOrderScreen: Closing cart modal");
              setShowCartModal(false);
            }}
          >
            <View style={styles.modalContainer}>
              <View style={styles.cartModalContainer}>
                <Text style={styles.cartTitle}>Your Cart</Text>
                {tableNo && <Text style={styles.tableNoText}>Table Number: {tableNo}</Text>}
                <FlatList
                  data={cart}
                  renderItem={renderCartItem}
                  keyExtractor={(item) => item.id}
                  ListEmptyComponent={<Text style={styles.noDataText}>Cart is empty.</Text>}
                  contentContainerStyle={styles.cartList}
                />
                {cart.length > 0 && (
                  <View style={styles.cartTotal}>
                    <Text style={styles.cartTotalText}>Total: ₱{getTotal()}</Text>
                  </View>
                )}
                {cart.length > 0 && (
                  <TouchableOpacity
                    style={[styles.modalButton, styles.clearCartButton]}
                    onPress={clearCart}
                    disabled={loading || tableTaken}
                  >
                    <Text style={styles.modalButtonText}>Clear Cart</Text>
                  </TouchableOpacity>
                )}
                {cart.length > 0 && (
                  <TouchableOpacity
                    style={[styles.modalButton, { backgroundColor: "#F28C38", padding: 10, borderRadius: 5, marginVertical: 5, alignItems: "center" }]}
                    onPress={submitCart}
                    disabled={loading || tableTaken}
                  >
                    <Text style={styles.modalButtonText}>Place Order</Text>
                  </TouchableOpacity>
                )}
                <TouchableOpacity
                  style={[styles.modalButton, styles.closeCartButton]}
                  onPress={() => {
                    console.log("CustomerOrderScreen: Closing cart modal via button");
                    setShowCartModal(false);
                  }}
                  disabled={loading}
                >
                  <Text style={styles.modalButtonText}>Close</Text>
                </TouchableOpacity>
              </View>
            </View>
          </Modal>
          <Modal
            visible={showPendingOrdersModal}
            transparent={true}
            animationType="fade"
            onRequestClose={() => {
              console.log("CustomerOrderScreen: Closing pending orders modal");
              setShowPendingOrdersModal(false);
            }}
          >
            <View style={styles.modalContainer}>
              <View style={styles.cartModalContainer}>
                <Text style={styles.cartTitle}>Pending and Accepted Orders</Text>
                {tableNo && <Text style={styles.tableNoText}>Table Number: {tableNo}</Text>}
                <TouchableOpacity
                  style={[styles.modalButton, { backgroundColor: "#F28C38", padding: 10, borderRadius: 5, marginVertical: 5, alignItems: "center" }]}
                  onPress={() => {
                    console.log("CustomerOrderScreen: Refreshing pending orders");
                    fetchPendingOrders();
                  }}
                  disabled={loading}
                >
                  <Text style={styles.modalButtonText}>Refresh Orders</Text>
                </TouchableOpacity>
                <Text style={[styles.cartTitle, { fontSize: 18, marginTop: 10 }]}>Pending Orders</Text>
                <FlatList
                  data={pendingOrders.filter((item) => item.Done === 0)}
                  renderItem={renderPendingOrderItem}
                  keyExtractor={(item) => item.PosDetailsCode?.toString() || Math.random().toString()}
                  ListEmptyComponent={<Text style={styles.noDataText}>No pending orders.</Text>}
                  contentContainerStyle={styles.cartList}
                />
                {pendingOrders.some((item) => item.Done === 0) && (
                  <View style={styles.cartTotal}>
                    <Text style={styles.cartTotalText}>Total Pending Quantity: {getTotalPendingQuantity()}</Text>
                  </View>
                )}
                <Text style={[styles.cartTitle, { fontSize: 18, marginTop: 10 }]}>Accepted Orders</Text>
                <FlatList
                  data={pendingOrders.filter((item) => item.Done === 1)}
                  renderItem={renderPendingOrderItem}
                  keyExtractor={(item) => item.PosDetailsCode?.toString() || Math.random().toString()}
                  ListEmptyComponent={<Text style={styles.noDataText}>No accepted orders.</Text>}
                  contentContainerStyle={styles.cartList}
                />
                {pendingOrders.some((item) => item.Done === 1) && (
                  <View style={styles.cartTotal}>
                    <Text style={styles.cartTotalText}>Total Accepted Due: ₱{getTotalAcceptedDue()}</Text>
                  </View>
                )}
                <TouchableOpacity
                  style={[styles.modalButton, styles.closeCartButton]}
                  onPress={() => {
                    console.log("CustomerOrderScreen: Closing pending orders modal via button");
                    setShowPendingOrdersModal(false);
                  }}
                  disabled={loading}
                >
                  <Text style={styles.modalButtonText}>Close</Text>
                </TouchableOpacity>
              </View>
            </View>
          </Modal>
          {cartAnimation && (
            <Animated.View
              style={[
                styles.animatedImageContainer,
                {
                  transform: [
                    {
                      translateX: animatedValue.interpolate({
                        inputRange: [0, 1],
                        outputRange: [cartAnimation.startX, cartAnimation.endX],
                      }),
                    },
                    {
                      translateY: animatedValue.interpolate({
                        inputRange: [0, 1],
                        outputRange: [cartAnimation.startY, cartAnimation.endY],
                      }),
                    },
                    {
                      scale: animatedValue.interpolate({
                        inputRange: [0, 1],
                        outputRange: [1, 0.3],
                      }),
                    },
                  ],
                  opacity: animatedValue.interpolate({
                    inputRange: [0, 1],
                    outputRange: [1, 0],
                  }),
                },
              ]}
            >
              <Image source={{ uri: cartAnimation.product.imageUrl }} style={styles.animatedImage} />
            </Animated.View>
          )}
        </>
      )}
    </SafeAreaView>
  );

  function clearCart() {
    if (tableTaken) return;
    console.log("CustomerOrderScreen: Clearing cart");
    if (Platform.OS === "web") {
      if (window.confirm("Clear all items from cart?")) {
        setCart([]);
        saveCartToStorage([]);
        window.alert("Cart cleared!");
      }
    } else {
      Alert.alert("Clear Cart", "Remove all items from cart?", [
        { text: "Cancel", style: "cancel" },
        {
          text: "Clear",
          style: "destructive",
          onPress: () => {
            setCart([]);
            saveCartToStorage([]);
            Alert.alert("Success", "Cart cleared!");
          },
        },
      ]);
    }
  }
};

export default CustomerOrderScreen;