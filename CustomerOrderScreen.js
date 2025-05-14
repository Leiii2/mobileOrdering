import React, { useState, useEffect, useRef } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  FlatList,
  ActivityIndicator,
  Alert,
  SafeAreaView,
  Image,
  Modal,
  Animated,
  Easing,
} from "react-native";
import { useNavigation } from "@react-navigation/native";
import { Ionicons } from "@expo/vector-icons";
import axios from "axios";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { getAPIUrl } from "./config";
import QRCode from "react-native-qrcode-svg";
import styles from "./css/customerOrderScreen.styles";

const CustomerOrderScreen = () => {
  const [categories, setCategories] = useState([]);
  const [products, setProducts] = useState([]);
  const [selectedCategory, setSelectedCategory] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [imageErrors, setImageErrors] = useState({});
  const [showImagePreview, setShowImagePreview] = useState(false);
  const [previewImageUri, setPreviewImageUri] = useState(null);
  const [cart, setCart] = useState({});
  const [showCartModal, setShowCartModal] = useState(false);
  const [showQRModal, setShowQRModal] = useState(false); // New state for QR modal
  const [qrValue, setQrValue] = useState(""); // New state for QR code value
  const navigation = useNavigation();
  const [cartAnimation, setCartAnimation] = useState(null);
  const animatedValue = useRef(new Animated.Value(0)).current;
  const cartIconRef = useRef(null);
  const imageRefs = useRef({}).current;

  useEffect(() => {
    fetchCategories();
    checkCustomerAccess();
  }, []);

  const checkCustomerAccess = async () => {
    try {
      const token = await AsyncStorage.getItem("token");
      if (!token) {
        Alert.alert("Access Error", "Please log in to place an order.", [
          { text: "OK", onPress: () => navigation.navigate("Login") },
        ]);
      }
    } catch (error) {
      Alert.alert("Access Error", "Failed to verify access. Please try again.");
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
          let price = 100;
          let imageUrl = null;
          try {
            const priceResponse = await axios.get(
              `${apiUrl}/stocks/${categoryCode}/${product.ProductCode}/price`,
              { headers: { Authorization: `Bearer ${token}` } }
            );
            price = priceResponse.data.price || 100;
          } catch (err) {}
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
                if (err.response?.status !== 404) {}
              }
            }
          } catch (err) {}
          return {
            ...product,
            price,
            imageUrl,
          };
        })
      );
      setProducts(productsWithPricesAndImages);
    } catch (error) {
      handleError(error);
    } finally {
      setLoading(false);
    }
  };

  const handleError = (error) => {
    if (error.response?.status === 401) {
      Alert.alert("Session Expired", "Please log in again.", [
        { text: "OK", onPress: () => navigation.navigate("Login") },
      ]);
      AsyncStorage.removeItem("token");
    } else {
      setError(error.message || "An unexpected error occurred.");
    }
  };

  const addToCart = (product, productCode) => {
    if (imageRefs[productCode] && product.imageUrl && !imageErrors[productCode]) {
      imageRefs[productCode].measure((x, y, width, height, pageX, pageY) => {
        cartIconRef.current.measure((cx, cy, cWidth, cHeight, cPageX, cPageY) => {
          const endXOffset = -10;
          const endYOffset = -20;
          const adjustedEndX = cPageX + endXOffset;
          const adjustedEndY = cPageY + endYOffset;

          const animation = Animated.timing(animatedValue, {
            toValue: 1,
            duration: 600,
            easing: Easing.out(Easing.quad),
            useNativeDriver: true,
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
      const existingQty = prevCart[product.ProductCode]?.quantity || 0;
      return {
        ...prevCart,
        [product.ProductCode]: {
          ...product,
          quantity: existingQty + 1,
        },
      };
    });
    Alert.alert(
      "Success",
      `${product.Product} added to cart!`,
      [
        { text: "Close", onPress: () => {} },
        { text: "View Cart", onPress: () => setShowCartModal(true) },
      ],
      { cancelable: true }
    );
  };

  const removeFromCart = (productCode) => {
    setCart((prevCart) => {
      const newCart = { ...prevCart };
      delete newCart[productCode];
      return newCart;
    });
    Alert.alert("Success", "Item removed from cart!");
  };

  const clearCart = () => {
    Alert.alert(
      "Clear Cart",
      "Are you sure you want to remove all items from your cart?",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Clear",
          style: "destructive",
          onPress: () => {
            setCart({});
            Alert.alert("Success", "Cart cleared!");
          },
        },
      ],
      { cancelable: true }
    );
  };

  const updateQuantity = (productCode, newQuantity) => {
    setCart((prevCart) => {
      if (newQuantity < 1) return prevCart;
      return {
        ...prevCart,
        [productCode]: {
          ...prevCart[productCode],
          quantity: newQuantity,
        },
      };
    });
  };

  const generateQRCode = () => {
    if (Object.keys(cart).length === 0) {
      Alert.alert("Error", "Cart is empty. Add items to generate a QR code.");
      return;
    }
    // Convert cart to POSScreen cart format
    const qrCart = Object.values(cart).map((item) => ({
      productCode: item.ProductCode,
      productName: item.Product,
      quantity: item.quantity,
      price: item.price,
      subtotal: item.quantity * item.price,
    }));
    const qrData = JSON.stringify(qrCart);
    setQrValue(qrData);
    setShowQRModal(true);
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

  const renderProduct = ({ item }) => {
    return (
      <View style={styles.productCard}>
        <TouchableOpacity
          onPress={() => {
            if (item.imageUrl && !imageErrors[item.ProductCode]) {
              setPreviewImageUri(item.imageUrl);
              setShowImagePreview(true);
            }
          }}
          disabled={!item.imageUrl || imageErrors[item.ProductCode]}
        >
          {item.imageUrl && !imageErrors[item.ProductCode] ? (
            <Image
              ref={(ref) => (imageRefs[item.ProductCode] = ref)}
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
        </TouchableOpacity>
        <Text style={styles.productName}>{item.Product}</Text>
        <Text style={styles.productPrice}>₱{item.price.toFixed(2)}</Text>
        <View style={styles.quantityContainer}>
          <TouchableOpacity
            style={styles.quantityButton}
            onPress={() => addToCart(item, item.ProductCode)}
          >
            <Text style={styles.quantityButtonText}>Add to Cart</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  };

  const renderCartItem = ({ item }) => (
    <View style={styles.cartItem}>
      <Text style={styles.cartItemName}>{item.Product} (x{item.quantity})</Text>
      <View style={styles.quantityControl}>
        <Text style={styles.cartItemPrice}>₱{(item.price * item.quantity).toFixed(2)}</Text>
        <TouchableOpacity
          style={styles.quantityButton}
          onPress={() => updateQuantity(item.ProductCode, item.quantity - 1)}
        >
          <Text style={styles.quantityButtonText}>-</Text>
        </TouchableOpacity>
        <Text style={styles.quantityText}>{item.quantity}</Text>
        <TouchableOpacity
          style={styles.quantityButton}
          onPress={() => updateQuantity(item.ProductCode, item.quantity + 1)}
        >
          <Text style={styles.quantityButtonText}>+</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.quantityButton, styles.removeButton]}
          onPress={() => removeFromCart(item.ProductCode)}
        >
          <Text style={styles.quantityButtonText}>Remove</Text>
        </TouchableOpacity>
      </View>
    </View>
  );

  const getTotal = () => {
    return Object.values(cart).reduce((total, item) => total + item.price * item.quantity, 0).toFixed(2);
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.topNav}>
        <TouchableOpacity style={styles.navItem} onPress={() => navigation.navigate("Home")}>
          <Ionicons name="home-outline" size={20} color="#3D2C29" />
          <Text style={styles.navText}>Home</Text>
        </TouchableOpacity>
        <TouchableOpacity
          ref={cartIconRef}
          style={styles.navItem}
          onPress={() => setShowCartModal(true)}
        >
          <Ionicons name="cart-outline" size={20} color="#3D2C29" />
          <Text style={styles.navText}>Cart ({Object.keys(cart).length})</Text>
        </TouchableOpacity>
      </View>
      <View style={styles.categoryContainer}>
        <FlatList
          data={categories}
          renderItem={renderCategory}
          keyExtractor={(item) => item.CategoryCode.toString()}
          horizontal
          contentContainerStyle={styles.categoryList}
          showsHorizontalScrollIndicator={false}
          ListEmptyComponent={<Text style={styles.noDataText}>No categories available.</Text>}
        />
      </View>
      {selectedCategory ? (
        <FlatList
          data={products}
          renderItem={renderProduct}
          keyExtractor={(item) => item.ProductCode.toString()}
          contentContainerStyle={styles.productContainer}
          numColumns={2}
          ListEmptyComponent={<Text style={styles.noDataText}>No products available.</Text>}
        />
      ) : null}
      {loading && <ActivityIndicator size="large" color="#F28C38" style={styles.loading} />}
      {error && (
        <View style={styles.errorContainer}>
          <Text style={styles.errorText}>{error}</Text>
          <TouchableOpacity style={styles.retryButton} onPress={fetchCategories}>
            <Text style={styles.retryButtonText}>Retry</Text>
          </TouchableOpacity>
        </View>
      )}
      <Modal
        visible={showImagePreview}
        transparent={true}
        animationType="fade"
        onRequestClose={() => {
          setShowImagePreview(false);
          setPreviewImageUri(null);
        }}
      >
        <View style={styles.modalContainer}>
          <View style={styles.previewContainer}>
            {previewImageUri && (
              <Image source={{ uri: previewImageUri }} style={styles.previewImage} />
            )}
            <TouchableOpacity
              style={styles.modalButton}
              onPress={() => {
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
        onRequestClose={() => setShowCartModal(false)}
      >
        <View style={styles.modalContainer}>
          <View style={styles.cartModalContainer}>
            <Text style={styles.cartTitle}>Your Cart</Text>
            <FlatList
              data={Object.values(cart)}
              renderItem={renderCartItem}
              keyExtractor={(item) => item.ProductCode.toString()}
              ListEmptyComponent={<Text style={styles.noDataText}>Cart is empty.</Text>}
              contentContainerStyle={styles.cartList}
            />
            {Object.keys(cart).length > 0 && (
              <View style={styles.cartTotal}>
                <Text style={styles.cartTotalText}>Total: ₱{getTotal()}</Text>
              </View>
            )}
            {Object.keys(cart).length > 0 && (
              <TouchableOpacity
                style={[styles.modalButton, styles.qrButton]}
                onPress={generateQRCode}
              >
                <Text style={styles.modalButtonText}>Generate QR Code</Text>
              </TouchableOpacity>
            )}
            {Object.keys(cart).length > 0 && (
              <TouchableOpacity
                style={[styles.modalButton, styles.clearCartButton]}
                onPress={clearCart}
              >
                <Text style={styles.modalButtonText}>Clear Cart</Text>
              </TouchableOpacity>
            )}
            <TouchableOpacity
              style={[styles.modalButton, styles.closeCartButton]}
              onPress={() => setShowCartModal(false)}
            >
              <Text style={styles.modalButtonText}>Close</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
      <Modal
        visible={showQRModal}
        transparent={true}
        animationType="fade"
        onRequestClose={() => setShowQRModal(false)}
      >
        <View style={styles.modalContainer}>
          <View style={styles.qrModalContainer}>
            <Text style={styles.cartTitle}>Scan this QR Code</Text>
            <View style={styles.qrCodeContainer}>
              <QRCode
                value={qrValue}
                size={200}
                color="#3D2C29"
                backgroundColor="#FFFFFF"
              />
            </View>
            <TouchableOpacity
              style={[styles.modalButton, styles.closeCartButton]}
              onPress={() => setShowQRModal(false)}
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
          <Image
            source={{ uri: cartAnimation.product.imageUrl }}
            style={styles.animatedImage}
          />
        </Animated.View>
      )}
    </SafeAreaView>
  );
};

export default CustomerOrderScreen;