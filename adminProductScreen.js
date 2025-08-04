import React, { useState, useEffect, useCallback, useRef } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  ActivityIndicator,
  FlatList,
  TextInput,
  Image,
  Platform,
  Modal,
  SafeAreaView,
  Alert, // Added for error alerts
} from "react-native";
import { Picker } from "@react-native-picker/picker";
import { Ionicons } from "@expo/vector-icons";
import * as Linking from "expo-linking";
import axios from "axios";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { useNavigation } from "@react-navigation/native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { getAPIUrl } from "./config";
import styles from "./css/adminProductScreen.styles";

const AdminProductScreen = ({ route }) => {
  const initialCategoryCode = route.params?.categoryCode || "all";
  const [categories, setCategories] = useState([]);
  const [selectedCategoryCode, setSelectedCategoryCode] = useState(initialCategoryCode);
  const [products, setProducts] = useState([]);
  const [filteredProducts, setFilteredProducts] = useState([]);
  const [selectedProduct, setSelectedProduct] = useState(null);
  const [uploading, setUploading] = useState(false);
  const [loading, setLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [imageErrors, setImageErrors] = useState({});
  const [previewImageUri, setPreviewImageUri] = useState(null);
  const [showPreviewModal, setShowPreviewModal] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const navigation = useNavigation();
  const insets = useSafeAreaInsets();
  const imageRefs = useRef({});
  const searchInputRef = useRef(null);

  const fetchCategories = useCallback(async () => {
    setLoading(true);
    try {
      const token = await AsyncStorage.getItem("token");
      const apiUrl = await getAPIUrl();
      const response = await axios.get(`${apiUrl}/categories`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!Array.isArray(response.data.categories)) {
        throw new Error("Invalid categories data");
      }
      setCategories(response.data.categories);
    } catch (error) {
      if (error.response?.status === 401) {
        navigation.navigate("Login");
        await AsyncStorage.removeItem("token");
        await AsyncStorage.removeItem("userData");
      } else {
        console.error("Failed to load categories:", error.message);
        Alert.alert("Error", "Failed to load categories. Please try again.");
      }
    } finally {
      setLoading(false);
    }
  }, [navigation]);

  const fetchProducts = useCallback(async () => {
    setLoading(true);
    try {
      const token = await AsyncStorage.getItem("token");
      const apiUrl = await getAPIUrl();
      let fetchedProducts = [];

      if (selectedCategoryCode === "all") {
        for (const category of categories) {
          try {
            const response = await axios.get(`${apiUrl}/stocks/${category.CategoryCode}`, {
              headers: { Authorization: `Bearer ${token}` },
            });
            if (!Array.isArray(response.data.products)) {
              throw new Error(`Invalid products data for category ${category.CategoryCode}`);
            }
            fetchedProducts = [
              ...fetchedProducts,
              ...response.data.products.map((product) => ({
                ...product,
                CategoryCode: category.CategoryCode,
                Category: category.Category,
                imageUrl: null,
              })),
            ];
          } catch (error) {
            console.warn(`Failed to fetch products for category ${category.CategoryCode}:`, error.message);
          }
        }
      } else {
        const response = await axios.get(`${apiUrl}/stocks/${selectedCategoryCode}`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        if (!Array.isArray(response.data.products)) {
          throw new Error("Invalid products data");
        }
        const category = categories.find(
          (cat) => cat.CategoryCode.toString() === selectedCategoryCode
        );
        fetchedProducts = response.data.products.map((product) => ({
          ...product,
          CategoryCode: parseInt(selectedCategoryCode),
          Category: category ? category.Category : "Unknown",
          imageUrl: null,
        }));
      }

      // Fetch images for products
      const productsWithImages = await Promise.all(
        fetchedProducts.map(async (product) => {
          let imageUrl = null;
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
          return { ...product, imageUrl };
        })
      );

      productsWithImages.sort((a, b) => {
        if (a.CategoryCode === b.CategoryCode) {
          return a.Product.localeCompare(b.Product);
        }
        return a.CategoryCode - b.CategoryCode;
      });

      setProducts(productsWithImages);
      setFilteredProducts(productsWithImages);
    } catch (error) {
      if (error.response?.status === 401) {
        navigation.navigate("Login");
        await AsyncStorage.removeItem("token");
        await AsyncStorage.removeItem("userData");
      } else {
        console.error("Failed to load products:", error.message);
        Alert.alert("Error", "Failed to load products. Please try again.");
      }
    } finally {
      setLoading(false);
    }
  }, [selectedCategoryCode, categories, navigation]);

  useEffect(() => {
    fetchCategories();
  }, [fetchCategories]);

  useEffect(() => {
    if (categories.length > 0) {
      fetchProducts();
    }
  }, [fetchProducts, categories]);

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

  const selectAndPreviewImage = async (product, isReplace = false) => {
    setSelectedProduct(product);
    if (!product.CategoryCode) {
      console.error("Selected product is missing CategoryCode");
      Alert.alert("Error", "Selected product is missing category information.");
      return;
    }

    if (Platform.OS === "web") {
      const input = document.createElement("input");
      input.type = "file";
      input.accept = "image/*";
      input.onchange = async (event) => {
        const file = event.target.files[0];
        if (file) {
          const reader = new FileReader();
          reader.onload = (e) => {
            setPreviewImageUri(e.target.result);
            setShowPreviewModal(true);
          };
          reader.readAsDataURL(file);
        }
      };
      input.click();
    } else {
      try {
        const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
        if (status !== "granted") {
          console.error("Photo library permission denied");
          Alert.alert("Error", "Photo library permission denied.");
          return;
        }

        const result = await ImagePicker.launchImageLibraryAsync({
          mediaTypes: ImagePicker.MediaTypeOptions.Images,
          quality: 0.8,
        });

        if (result.canceled) {
          return;
        }

        const asset = result.assets[0];
        setPreviewImageUri(asset.uri);
        setShowPreviewModal(true);
      } catch (error) {
        console.error("Failed to select image:", error.message);
        Alert.alert("Error", "Failed to select image. Please try again.");
      }
    }
  };

  const cropImage = async () => {
    if (!previewImageUri) {
      console.error("No image to crop");
      Alert.alert("Error", "No image selected for cropping.");
      return;
    }

    if (Platform.OS === "web") {
      console.log("Image cropping is not supported on web");
      return;
    }

    setUploading(true);
    try {
      const imageInfo = await ImageManipulator.manipulateAsync(previewImageUri, [], {});
      const { width, height } = imageInfo;

      const cropSize = Math.min(300, width, height);
      const cropOriginX = (width - cropSize) / 2;
      const cropOriginY = (height - cropSize) / 2;

      if (cropOriginX < 0 || cropOriginY < 0) {
        throw new Error("Image too small to crop");
      }

      const manipResult = await ImageManipulator.manipulateAsync(
        previewImageUri,
        [
          {
            crop: {
              originX: cropOriginX,
              originY: cropOriginY,
              width: cropSize,
              height: cropSize,
            },
          },
          {
            resize: {
              width: 300,
              height: 300,
            },
          },
        ],
        { compress: 0.8, format: ImageManipulator.SaveFormat.JPEG }
      );

      if (!manipResult.uri) {
        throw new Error("Image manipulation failed");
      }

      setPreviewImageUri(manipResult.uri);
    } catch (error) {
      console.error("Failed to crop image:", error.message);
      Alert.alert("Error", "Failed to crop image. Please try again.");
    } finally {
      setUploading(false);
    }
  };

  const uploadImage = async () => {
    if (!previewImageUri || !selectedProduct) {
      console.error("No image selected or product not set");
      Alert.alert("Error", "No image or product selected for upload.");
      return;
    }

    try {
      let extension = previewImageUri.split(".").pop()?.toLowerCase();
      if (!extension || !["jpg", "jpeg", "png"].includes(extension)) {
        extension = "jpg";
      }
      const mimeType = `image/${extension === "jpg" ? "jpeg" : extension}`;
      const fileName = `product_${selectedProduct.ProductCode}.${extension}`;

      let fileData;
      if (Platform.OS === "web" && previewImageUri.startsWith("data:image")) {
        const base64Data = previewImageUri.split(",")[1];
        const byteCharacters = atob(base64Data);
        const byteNumbers = new Array(byteCharacters.length);
        for (let i = 0; i < byteCharacters.length; i++) {
          byteNumbers[i] = byteCharacters.charCodeAt(i);
        }
        const byteArray = new Uint8Array(byteNumbers);
        const blob = new Blob([byteArray], { type: mimeType });
        fileData = new File([blob], fileName, { type: mimeType });
      } else {
        fileData = { uri: previewImageUri, type: mimeType, name: fileName };
      }

      const formData = new FormData();
      formData.append("image", fileData);

      setUploading(true);
      try {
        const token = await AsyncStorage.getItem("token");
        const apiUrl = await getAPIUrl();
        // Updated endpoint to match productimageUpload.js
        const uploadUrl = `${apiUrl}/product-image/${parseInt(selectedProduct.CategoryCode)}/${parseInt(selectedProduct.ProductCode)}/image`;
        const uploadResponse = await axios.post(uploadUrl, formData, {
          headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "multipart/form-data",
          },
        });

        if (uploadResponse.data.status === "success") {
          console.log("Image uploaded successfully");
          setShowPreviewModal(false);
          setPreviewImageUri(null);
          setSelectedProduct(null);
          fetchProducts();
        } else {
          throw new Error(uploadResponse.data.message || "Failed to upload image");
        }
      } catch (error) {
        console.error("Failed to upload image:", error.message);
        Alert.alert("Error", error.response?.data?.message || "Failed to upload image. Please try again.");
      } finally {
        setUploading(false);
      }
    } catch (error) {
      console.error("Failed to prepare image:", error.message);
      Alert.alert("Error", "Failed to prepare image for upload. Please try again.");
    }
  };

  const deleteImage = (product) => {
    setSelectedProduct(product);
    if (!product || !product.imageUrl) {
      console.error("No image to delete");
      Alert.alert("Error", "No image available to delete.");
      return;
    }
    if (!product.CategoryCode) {
      console.error("Selected product is missing CategoryCode");
      Alert.alert("Error", "Selected product is missing category information.");
      return;
    }
    setShowDeleteModal(true);
  };

  const confirmDeleteImage = async () => {
    if (!selectedProduct) return;
    setUploading(true);
    try {
      const token = await AsyncStorage.getItem("token");
      const apiUrl = await getAPIUrl();
      // Updated endpoint to match productimageUpload.js
      const deleteUrl = `${apiUrl}/product-image/${parseInt(selectedProduct.CategoryCode)}/${parseInt(selectedProduct.ProductCode)}/image`;
      const deleteResponse = await axios.delete(deleteUrl, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      if (deleteResponse.data.status === "success") {
        console.log("Image deleted successfully");
        setShowDeleteModal(false);
        setSelectedProduct(null);
        fetchProducts();
      } else {
        throw new Error(deleteResponse.data.message || "Failed to delete image");
      }
    } catch (error) {
      console.error("Failed to delete image:", error.message);
      Alert.alert("Error", error.response?.data?.message || "Failed to delete image. Please try again.");
    } finally {
      setUploading(false);
      setShowDeleteModal(false);
    }
  };

  const clearSearch = () => {
    setSearchQuery("");
    if (searchInputRef.current) {
      searchInputRef.current.clear();
      searchInputRef.current.blur();
    }
  };

  const renderProductItem = ({ item }) => (
    <View style={styles.productCard}>
      <TouchableOpacity
        onPress={() => {
          if (item.imageUrl && !imageErrors[item.ProductCode]) {
            setPreviewImageUri(item.imageUrl);
            setShowPreviewModal(true);
          }
        }}
        disabled={!item.imageUrl || imageErrors[item.ProductCode]}
      >
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
      </TouchableOpacity>
      <Text style={styles.productName}>{item.Product}</Text>
      <Text style={styles.productPrice}>Code: {item.ProductCode}</Text>
      <View style={styles.quantityContainer}>
        {!item.imageUrl ? (
          <TouchableOpacity
            style={[styles.quantityButton, uploading && styles.disabledButton]}
            onPress={() => selectAndPreviewImage(item, false)}
            disabled={uploading}
          >
            <Text style={styles.quantityButtonText}>Upload Photo</Text>
          </TouchableOpacity>
        ) : (
          <>
            <TouchableOpacity
              style={[styles.quantityButton, styles.replaceButton, uploading && styles.disabledButton]}
              onPress={() => selectAndPreviewImage(item, true)}
              disabled={uploading}
            >
              <Text style={styles.quantityButtonText}>Replace</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.quantityButton, styles.removeButton, uploading && styles.disabledButton]}
              onPress={() => deleteImage(item)}
              disabled={uploading}
            >
              <Text style={styles.quantityButtonText}>Remove</Text>
            </TouchableOpacity>
          </>
        )}
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
      <View style={styles.topNav}>
        <TouchableOpacity style={styles.navItem} onPress={() => navigation.navigate("Home")}>
          <Ionicons name="home-outline" size={20} color="#3D2C29" />
          <Text style={styles.navText}>Home</Text>
        </TouchableOpacity>
      </View>
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
        />
        {searchQuery.length > 0 && (
          <TouchableOpacity style={styles.clearSearchButton} onPress={clearSearch}>
            <Ionicons name="close-circle" size={20} color="#6B5E4A" />
          </TouchableOpacity>
        )}
      </View>
      <Picker
        selectedValue={selectedCategoryCode}
        onValueChange={(value) => {
          setSelectedCategoryCode(value);
          setSelectedProduct(null);
          setPreviewImageUri(null);
        }}
        style={styles.categoryPicker}
      >
        <Picker.Item label="All Categories" value="all" />
        {categories.map((category) => (
          <Picker.Item
            key={category.CategoryCode}
            label={category.Category}
            value={category.CategoryCode.toString()}
          />
        ))}
      </Picker>
      {loading ? (
        <ActivityIndicator size="large" color="#F28C38" style={styles.loading} />
      ) : (
        <FlatList
          data={filteredProducts}
          renderItem={renderProductItem}
          keyExtractor={(item) => item.ProductCode.toString()}
          contentContainerStyle={styles.productContainer}
          numColumns={2}
          ListEmptyComponent={<Text style={styles.noDataText}>No products found.</Text>}
        />
      )}
      <Modal
        visible={showPreviewModal}
        transparent={true}
        animationType="fade"
        onRequestClose={() => {
          setShowPreviewModal(false);
          setPreviewImageUri(null);
        }}
      >
        <View style={styles.modalContainer}>
          <View style={styles.previewContainer}>
            {previewImageUri && (
              <Image source={{ uri: previewImageUri }} style={styles.previewImage} />
            )}
            <View style={styles.modalButtonContainer}>
              {Platform.OS !== "web" && (
                <TouchableOpacity
                  style={[styles.modalButton, uploading && styles.disabledButton]}
                  onPress={cropImage}
                  disabled={uploading}
                >
                  <Text style={styles.modalButtonText}>Crop Image</Text>
                </TouchableOpacity>
              )}
              <TouchableOpacity
                style={[styles.modalButton, uploading && styles.disabledButton]}
                onPress={uploadImage}
                disabled={uploading}
              >
                <Text style={styles.modalButtonText}>
                  {uploading ? "Uploading..." : "Upload"}
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.modalButton, uploading && styles.disabledButton]}
                onPress={() => {
                  setShowPreviewModal(false);
                  setPreviewImageUri(null);
                }}
                disabled={uploading}
              >
                <Text style={styles.modalButtonText}>Cancel</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
      <Modal
        visible={showDeleteModal}
        transparent={true}
        animationType="fade"
        onRequestClose={() => setShowDeleteModal(false)}
      >
        <View style={styles.modalContainer}>
          <View style={styles.previewContainer}>
            <Text style={styles.modalTitle}>Confirm Delete</Text>
            <Text style={styles.modalMessage}>
              Are you sure you want to delete the image for {selectedProduct?.Product}? This action cannot be undone.
            </Text>
            <View style={styles.modalButtonContainer}>
              <TouchableOpacity
                style={[styles.modalButton, uploading && styles.disabledButton, styles.removeButton]}
                onPress={confirmDeleteImage}
                disabled={uploading}
              >
                <Text style={styles.modalButtonText}>Delete</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.modalButton, uploading && styles.disabledButton]}
                onPress={() => setShowDeleteModal(false)}
                disabled={uploading}
              >
                <Text style={styles.modalButtonText}>Cancel</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
};

export default AdminProductScreen;