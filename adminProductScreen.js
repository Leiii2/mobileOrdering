import React, { useState, useEffect, useCallback } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  Alert,
  ActivityIndicator,
  FlatList,
  TextInput,
  Image,
  Platform,
  Modal,
} from "react-native";
import { Picker } from "@react-native-picker/picker";
import * as ImagePicker from "expo-image-picker";
import * as ImageManipulator from "expo-image-manipulator";
import * as Linking from "expo-linking";
import axios from "axios";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { getAPIUrl } from "./config";
import styles from "./css/adminProductScreen.styles";

const AdminProductScreen = ({ route, navigation }) => {
  const initialCategoryCode = route.params?.categoryCode || "all";
  const [categories, setCategories] = useState([]);
  const [selectedCategoryCode, setSelectedCategoryCode] = useState(initialCategoryCode);
  const [products, setProducts] = useState([]);
  const [selectedProduct, setSelectedProduct] = useState(null);
  const [uploading, setUploading] = useState(false);
  const [loading, setLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [imageUri, setImageUri] = useState(null);
  const [imageCacheBuster, setImageCacheBuster] = useState(Date.now());
  const [previewImageUri, setPreviewImageUri] = useState(null);
  const [showPreviewModal, setShowPreviewModal] = useState(false);

  const fetchCategories = useCallback(async () => {
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
        Alert.alert("Session Expired", "Please log in again.", [
          { text: "OK", onPress: () => navigation.navigate("Login") },
        ]);
        await AsyncStorage.removeItem("token");
        await AsyncStorage.removeItem("userData");
      } else {
        Alert.alert(
          "Error",
          error.response?.data?.message || error.message || "Failed to load categories"
        );
      }
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
              })),
            ];
          } catch (error) {
            // Silently skip errors for individual categories
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
        }));
      }

      fetchedProducts.sort((a, b) => {
        if (a.CategoryCode === b.CategoryCode) {
          return a.Product.localeCompare(b.Product);
        }
        return a.CategoryCode - b.CategoryCode;
      });

      setProducts(fetchedProducts);
    } catch (error) {
      if (error.response?.status === 401) {
        Alert.alert("Session Expired", "Please log in again.", [
          { text: "OK", onPress: () => navigation.navigate("Login") },
        ]);
        await AsyncStorage.removeItem("token");
        await AsyncStorage.removeItem("userData");
      } else {
        Alert.alert(
          "Error",
          error.response?.data?.message || error.message || "Failed to load products"
        );
      }
    } finally {
      setLoading(false);
    }
  }, [selectedCategoryCode, categories, navigation]);

  const loadProductImage = useCallback(async (productCode) => {
    try {
      const apiUrl = await getAPIUrl();
      const extensions = ["jpg", "png", "jpeg"];
      let foundImage = null;

      for (const ext of extensions) {
        const imageUrl = `${apiUrl}/uploads/product_${productCode}.${ext}?cb=${imageCacheBuster}`;
        try {
          const response = await axios.head(imageUrl);
          foundImage = imageUrl;
          break;
        } catch (error) {
          if (error.response?.status !== 404) {
            throw error;
          }
        }
      }

      if (!foundImage) {
        const defaultExt = "jpg";
        foundImage = `${apiUrl}/Uploads/product_${productCode}.${defaultExt}?cb=${imageCacheBuster}`;
      }

      setImageUri(foundImage);
    } catch (error) {
      setImageUri(null);
    }
  }, [imageCacheBuster]);

  const refreshScreen = useCallback(() => {
    setImageCacheBuster(Date.now());
    setPreviewImageUri(null);
    setShowPreviewModal(false);
    if (selectedProduct) {
      loadProductImage(selectedProduct.ProductCode);
    }
    fetchProducts();
  }, [fetchProducts, loadProductImage, selectedProduct]);

  useEffect(() => {
    fetchCategories();
  }, [fetchCategories]);

  useEffect(() => {
    if (categories.length > 0) {
      fetchProducts();
    }
  }, [fetchProducts, categories]);

  useEffect(() => {
    if (selectedProduct) {
      loadProductImage(selectedProduct.ProductCode);
    } else {
      setImageUri(null);
    }
  }, [selectedProduct, loadProductImage]);

  const selectAndPreviewImage = async () => {
    if (!selectedProduct) {
      Alert.alert("Error", "Please select a product first.");
      return;
    }

    if (!selectedProduct.CategoryCode) {
      Alert.alert("Error", "Selected product is missing CategoryCode.");
      return;
    }

    if (Platform.OS !== "web") {
      try {
        const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
        if (status !== "granted") {
          Alert.alert(
            "Permission Denied",
            "We need access to your photo library to upload images.",
            [
              { text: "OK" },
              { text: "Open Settings", onPress: () => Linking.openSettings() },
            ]
          );
          return;
        }
      } catch (error) {
        Alert.alert("Error", "Failed to request permissions: " + error.message);
        return;
      }
    }

    try {
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
      Alert.alert("Error", "Failed to select image: " + error.message);
    }
  };

  const cropImage = async () => {
    if (!previewImageUri) {
      Alert.alert("Error", "No image to crop.");
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
      Alert.alert("Error", "Failed to crop image: " + error.message);
    } finally {
      setUploading(false);
    }
  };

  const uploadImage = async () => {
    if (!previewImageUri) {
      Alert.alert("Error", "No image selected for upload.");
      return;
    }

    try {
      let extension = previewImageUri.split(".").pop()?.toLowerCase();
      if (!extension || !["jpg", "jpeg", "png"].includes(extension)) {
        extension = "jpg";
      }
      const mimeType = `image/${extension === "jpg" ? "jpeg" : extension}`;
      const fileName = `product_${selectedProduct.ProductCode}.${extension}`;

      let fileData = { uri: previewImageUri, type: mimeType, name: fileName };

      if (Platform.OS === "web" && previewImageUri.startsWith("data:image")) {
        const base64Data = previewImageUri.split(",")[1];
        const byteCharacters = atob(base64Data);
        const byteNumbers = new Array(byteCharacters.length);
        for (let i = 0; i < byteCharacters.length; i++) {
          byteNumbers[i] = byteCharacters.charCodeAt(i);
        }
        const byteArray = new Uint8Array(byteNumbers);
        const blob = new Blob([byteArray], { type: mimeType });
        fileData = { uri: blob, type: mimeType, name: fileName };
      }

      const formData = new FormData();
      formData.append("image", fileData);

      setUploading(true);
      try {
        const token = await AsyncStorage.getItem("token");
        const apiUrl = await getAPIUrl();
        const uploadUrl = `${apiUrl}/stocks/${selectedProduct.CategoryCode}/${selectedProduct.ProductCode}/image`;
        const uploadResponse = await axios.post(uploadUrl, formData, {
          headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "multipart/form-data",
          },
        });

        if (uploadResponse.data.status === "success") {
          Alert.alert("Success", "Image uploaded successfully!");
          setShowPreviewModal(false);
          setPreviewImageUri(null);
          refreshScreen();
        } else {
          throw new Error(uploadResponse.data.message || "Failed to upload image");
        }
      } catch (error) {
        Alert.alert(
          "Error",
          error.response?.data?.message || error.message || "Failed to upload image"
        );
      } finally {
        setUploading(false);
      }
    } catch (error) {
      Alert.alert("Error", "Failed to prepare image: " + error.message);
    }
  };

  const deleteImage = async () => {
    if (!selectedProduct || !imageUri) {
      Alert.alert("Error", "No image to delete.");
      return;
    }

    if (!selectedProduct.CategoryCode) {
      Alert.alert("Error", "Selected product is missing CategoryCode.");
      return;
    }

    Alert.alert(
      "Confirm Delete",
      "Are you sure you want to delete this image?",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Delete",
          style: "destructive",
          onPress: async () => {
            setUploading(true);
            try {
              const token = await AsyncStorage.getItem("token");
              const apiUrl = await getAPIUrl();
              const deleteUrl = `${apiUrl}/stocks/${selectedProduct.CategoryCode}/${selectedProduct.ProductCode}/image`;
              const deleteResponse = await axios.delete(deleteUrl, {
                headers: {
                  Authorization: `Bearer ${token}`,
                },
              });

              if (deleteResponse.data.status === "success") {
                Alert.alert("Success", "Image deleted successfully!");
                setImageUri(null);
                refreshScreen();
              } else {
                throw new Error(deleteResponse.data.message || "Failed to delete image");
              }
            } catch (error) {
              Alert.alert(
                "Error",
                error.response?.data?.message || error.message || "Failed to delete image"
              );
            } finally {
              setUploading(false);
            }
          },
        },
      ]
    );
  };

  const renderProductItem = ({ item }) => (
    <TouchableOpacity
      style={[
        styles.productItem,
        selectedProduct?.ProductCode === item.ProductCode && styles.selectedProductItem,
      ]}
      onPress={() => setSelectedProduct(item)}
      disabled={uploading || loading}
    >
      <Text style={styles.productText}>{item.Product}</Text>
      <Text style={styles.productCode}>Code: {item.ProductCode}</Text>
      <Text style={styles.categoryText}>Category: {item.Category}</Text>
    </TouchableOpacity>
  );

  const filteredProducts = products.filter((product) =>
    product.Product.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Manage Product Images</Text>
      <Picker
        selectedValue={selectedCategoryCode}
        onValueChange={(value) => {
          setSelectedCategoryCode(value);
          setSelectedProduct(null);
          setImageUri(null);
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
      <TextInput
        style={styles.searchInput}
        placeholder="Search products..."
        value={searchQuery}
        onChangeText={setSearchQuery}
        placeholderTextColor="#757575"
      />
      {loading ? (
        <ActivityIndicator size="large" color="#A0522D" style={styles.loading} />
      ) : (
        <>
          <FlatList
            data={filteredProducts}
            renderItem={renderProductItem}
            keyExtractor={(item) => item.ProductCode.toString()}
            contentContainerStyle={styles.productList}
            ListEmptyComponent={<Text style={styles.emptyText}>No products found</Text>}
          />
          {selectedProduct && (
            <View style={styles.uploadSection}>
              <Text style={styles.selectedProductText}>
                Selected: {selectedProduct.Product} (Code: {selectedProduct.ProductCode}, Category: {selectedProduct.Category})
              </Text>
              {imageUri ? (
                <Image
                  source={{ uri: imageUri }}
                  style={styles.productImage}
                  onError={() => {
                    setImageUri(null);
                  }}
                />
              ) : (
                <View style={styles.imagePlaceholder}>
                  <Text style={styles.placeholderText}>No Image</Text>
                </View>
              )}
              <View style={styles.buttonContainer}>
                <TouchableOpacity
                  style={[styles.uploadButton, uploading && styles.disabledButton]}
                  onPress={selectAndPreviewImage}
                  disabled={uploading}
                >
                  <Text style={styles.uploadButtonText}>
                    {uploading ? "Processing..." : "Select Image"}
                  </Text>
                </TouchableOpacity>
                {imageUri && (
                  <TouchableOpacity
                    style={[styles.deleteButton, uploading && styles.disabledButton]}
                    onPress={deleteImage}
                    disabled={uploading}
                  >
                    <Text style={styles.deleteButtonText}>Delete Image</Text>
                  </TouchableOpacity>
                )}
              </View>
            </View>
          )}
        </>
      )}
      <Modal
        visible={showPreviewModal}
        transparent={true}
        animationType="slide"
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
              <TouchableOpacity
                style={[styles.modalButton, uploading && styles.disabledButton]}
                onPress={cropImage}
                disabled={uploading}
              >
                <Text style={styles.modalButtonText}>Crop Image</Text>
              </TouchableOpacity>
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
    </View>
  );
};

export default AdminProductScreen;