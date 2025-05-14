import React, { useEffect, useState, useCallback, useRef } from "react";
import {
  FlatList,
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Platform,
} from "react-native";
import { useNavigation } from "@react-navigation/native";
import { Ionicons } from "@expo/vector-icons";
import axios from "axios";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { getAPIUrl } from "./config";
import styles from "./css/manageCategories.styles";

const ManageCategories = () => {
  const [categories, setCategories] = useState([]);
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(false);
  const [newCategory, setNewCategory] = useState("");
  const [newProduct, setNewProduct] = useState("");
  const [selectedCategory, setSelectedCategory] = useState(null);
  const [editCategory, setEditCategory] = useState(null);
  const [editProduct, setEditProduct] = useState(null);
  const [editProductIndex, setEditProductIndex] = useState(null);
  const [isAdmin, setIsAdmin] = useState(false);

  const navigation = useNavigation();
  const productListRef = useRef(null);

  useEffect(() => {
    const checkAdminStatus = async () => {
      try {
        const userData = await AsyncStorage.getItem("userData");
        if (userData) {
          const parsedData = JSON.parse(userData);
          setIsAdmin(parsedData.admin === true);
        }
      } catch (error) {
        console.error("Error fetching admin status:", error);
      }
    };
    checkAdminStatus();
    fetchCategories();
  }, []);

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
    } catch (err) {
      if (err.response?.status === 401) {
        Alert.alert("Session Expired", "Please log in again.", [
          { text: "OK", onPress: () => navigation.navigate("Login") },
        ]);
        await AsyncStorage.removeItem("token");
        await AsyncStorage.removeItem("userData");
      } else {
        Alert.alert(
          "Error",
          err.response?.data?.message || err.message || "Failed to load categories."
        );
      }
    } finally {
      setLoading(false);
    }
  }, []);

  const fetchProducts = useCallback(async (categoryCode) => {
    setLoading(true);
    try {
      const token = await AsyncStorage.getItem("token");
      const apiUrl = await getAPIUrl();
      const response = await axios.get(`${apiUrl}/stocks/${categoryCode}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!Array.isArray(response.data.products)) {
        throw new Error("Invalid products data");
      }
      setProducts(response.data.products);
      setSelectedCategory(categories.find((cat) => cat.CategoryCode === categoryCode) || null);
    } catch (err) {
      if (err.response?.status === 401) {
        Alert.alert("Session Expired", "Please log in again.", [
          { text: "OK", onPress: () => navigation.navigate("Login") },
        ]);
        await AsyncStorage.removeItem("token");
        await AsyncStorage.removeItem("userData");
      } else {
        Alert.alert(
          "Error",
          err.response?.data?.message || err.message || "Failed to load products."
        );
      }
    } finally {
      setLoading(false);
    }
  }, [categories]);

  const addCategory = useCallback(async () => {
    if (!isAdmin) {
      Alert.alert("Error", "Only admins can add categories.");
      return;
    }
    const trimmedCategory = newCategory.trim();
    if (!trimmedCategory) {
      Alert.alert("Error", "Category name cannot be empty.");
      return;
    }
    if (trimmedCategory.length > 500) {
      Alert.alert("Error", "Category name exceeds 500 characters.");
      return;
    }
    setLoading(true);
    try {
      const token = await AsyncStorage.getItem("token");
      const apiUrl = await getAPIUrl();
      const response = await axios.post(
        `${apiUrl}/categories`,
        { Category: trimmedCategory },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      const newCategoryData = response.data.category;
      if (!newCategoryData || !newCategoryData.CategoryCode) {
        throw new Error("Invalid response: CategoryCode missing");
      }
      setCategories([...categories, newCategoryData]);
      setNewCategory("");
      Alert.alert("Success", "Category added successfully.");
    } catch (err) {
      Alert.alert(
        "Error",
        err.response?.data?.message || err.message || "Failed to add category."
      );
    } finally {
      setLoading(false);
    }
  }, [newCategory, categories, isAdmin]);

  const updateCategory = useCallback(
    async (categoryCode) => {
      if (!isAdmin) {
        Alert.alert("Error", "Only admins can update categories.");
        return;
      }
      if (!editCategory?.Category.trim()) {
        Alert.alert("Error", "Category name cannot be empty.");
        return;
      }
      if (editCategory.Category.length > 500) {
        Alert.alert("Error", "Category name exceeds 500 characters.");
        return;
      }
      Alert.alert("Confirm", "Are you sure you want to save changes?", [
        { text: "Cancel", style: "cancel" },
        {
          text: "Save",
          onPress: async () => {
            setLoading(true);
            try {
              const token = await AsyncStorage.getItem("token");
              const apiUrl = await getAPIUrl();
              await axios.put(
                `${apiUrl}/categories/${categoryCode}`,
                { Category: editCategory.Category },
                { headers: { Authorization: `Bearer ${token}` } }
              );
              setCategories(
                categories.map((cat) => (cat.CategoryCode === categoryCode ? editCategory : cat))
              );
              setEditCategory(null);
              Alert.alert("Success", "Category updated successfully.");
            } catch (err) {
              Alert.alert(
                "Error",
                err.response?.data?.message || err.message || "Failed to update category."
              );
            } finally {
              setLoading(false);
            }
          },
        },
      ]);
    },
    [editCategory, categories, isAdmin]
  );

  const deleteCategory = useCallback(
    async (categoryCode) => {
      if (!isAdmin) {
        Alert.alert("Error", "Only admins can delete categories.");
        return;
      }
      Alert.alert("Confirm", "Are you sure you want to delete this category?", [
        { text: "Cancel", style: "cancel" },
        {
          text: "Delete",
          style: "destructive",
          onPress: async () => {
            setLoading(true);
            try {
              const token = await AsyncStorage.getItem("token");
              const apiUrl = await getAPIUrl();
              await axios.delete(`${apiUrl}/categories/${categoryCode}`, {
                headers: { Authorization: `Bearer ${token}` },
              });
              setCategories(categories.filter((cat) => cat.CategoryCode !== categoryCode));
              if (selectedCategory?.CategoryCode === categoryCode) {
                setSelectedCategory(null);
                setProducts([]);
              }
              Alert.alert("Success", "Category deleted successfully.");
            } catch (err) {
              Alert.alert(
                "Error",
                err.response?.data?.message || err.message || "Failed to delete category."
              );
            } finally {
              setLoading(false);
            }
          },
        },
      ]);
    },
    [categories, selectedCategory, products, isAdmin]
  );

  const addProduct = useCallback(async () => {
    if (!isAdmin) {
      Alert.alert("Error", "Only admins can add products.");
      return;
    }
    if (!newProduct.trim() || !selectedCategory) {
      Alert.alert("Error", "Product name and category selection are required.");
      return;
    }
    if (newProduct.length > 500) {
      Alert.alert("Error", "Product name exceeds 500 characters.");
      return;
    }
    setLoading(true);
    try {
      const token = await AsyncStorage.getItem("token");
      const apiUrl = await getAPIUrl();
      const response = await axios.post(
        `${apiUrl}/stocks/${selectedCategory.CategoryCode}`,
        { Product: newProduct },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      const newProductData = response.data.product;
      if (!newProductData || !newProductData.ProductCode) {
        throw new Error("Invalid response: ProductCode missing");
      }
      setProducts([...products, newProductData]);
      setNewProduct("");
      Alert.alert("Success", "Product added successfully.");
    } catch (err) {
      Alert.alert(
        "Error",
        err.response?.data?.message || err.message || "Failed to add product."
      );
    } finally {
      setLoading(false);
    }
  }, [newProduct, selectedCategory, products, isAdmin]);

  const updateProduct = useCallback(
    async (productCode) => {
      if (!isAdmin) {
        Alert.alert("Error", "Only admins can update products.");
        return;
      }
      if (!editProduct?.Product.trim()) {
        Alert.alert("Error", "Product name cannot be empty.");
        return;
      }
      if (editProduct.Product.length > 500) {
        Alert.alert("Error", "Product name exceeds 500 characters.");
        return;
      }
      Alert.alert("Confirm", "Are you sure you want to save changes?", [
        { text: "Cancel", style: "cancel" },
        {
          text: "Save",
          onPress: async () => {
            setLoading(true);
            try {
              const token = await AsyncStorage.getItem("token");
              const apiUrl = await getAPIUrl();
              await axios.put(
                `${apiUrl}/stocks/${selectedCategory.CategoryCode}/${productCode}`,
                { Product: editProduct.Product },
                { headers: { Authorization: `Bearer ${token}` } }
              );
              setProducts(products.map((prod) => (prod.ProductCode === productCode ? editProduct : prod)));
              setEditProduct(null);
              setEditProductIndex(null);
              Alert.alert("Success", "Product updated successfully.");
            } catch (err) {
              Alert.alert(
                "Error",
                err.response?.data?.message || err.message || "Failed to update product."
              );
            } finally {
              setLoading(false);
            }
          },
        },
      ]);
    },
    [editProduct, selectedCategory, products, isAdmin]
  );

  const deleteProduct = useCallback(
    async (productCode) => {
      if (!isAdmin) {
        Alert.alert("Error", "Only admins can delete products.");
        return;
      }
      Alert.alert("Confirm", "Are you sure you want to delete this product?", [
        { text: "Cancel", style: "cancel" },
        {
          text: "Delete",
          style: "destructive",
          onPress: async () => {
            setLoading(true);
            try {
              const token = await AsyncStorage.getItem("token");
              const apiUrl = await getAPIUrl();
              await axios.delete(`${apiUrl}/stocks/${selectedCategory.CategoryCode}/${productCode}`, {
                headers: { Authorization: `Bearer ${token}` },
              });
              setProducts(products.filter((prod) => prod.ProductCode !== productCode));
              Alert.alert("Success", "Product deleted successfully.");
            } catch (err) {
              Alert.alert(
                "Error",
                err.response?.data?.message || err.message || "Failed to delete product."
              );
            } finally {
              setLoading(false);
            }
          },
        },
      ]);
    },
    [products, selectedCategory, isAdmin]
  );

  const renderCategoryItem = ({ item }) => (
    <View style={styles.itemContainer}>
      {isAdmin && editCategory?.CategoryCode === item.CategoryCode ? (
        <TextInput
          style={styles.input}
          value={editCategory.Category}
          onChangeText={(text) => setEditCategory({ ...editCategory, Category: text })}
          autoFocus
        />
      ) : (
        <TouchableOpacity onPress={() => fetchProducts(item.CategoryCode)} disabled={loading}>
          <Text style={styles.itemText}>{item.Category}</Text>
        </TouchableOpacity>
      )}
      {isAdmin && (
        <View style={styles.buttonGroup}>
          {editCategory?.CategoryCode === item.CategoryCode ? (
            <>
              <TouchableOpacity
                onPress={() => updateCategory(item.CategoryCode)}
                disabled={loading}
              >
                <Ionicons name="checkmark" size={24} color={loading ? "#B0BEC5" : "#1976D2"} />
              </TouchableOpacity>
              <TouchableOpacity onPress={() => setEditCategory(null)} disabled={loading}>
                <Ionicons name="close" size={24} color={loading ? "#B0BEC5" : "#D32F2F"} />
              </TouchableOpacity>
            </>
          ) : (
            <TouchableOpacity onPress={() => setEditCategory(item)} disabled={loading}>
              <Ionicons name="pencil" size={24} color={loading ? "#B0BEC5" : "#FBC02D"} />
            </TouchableOpacity>
          )}
          <TouchableOpacity onPress={() => deleteCategory(item.CategoryCode)} disabled={loading}>
            <Ionicons name="trash" size={24} color={loading ? "#B0BEC5" : "#D32F2F"} />
          </TouchableOpacity>
        </View>
      )}
    </View>
  );

  const renderProductItem = ({ item, index }) => (
    <View style={styles.itemContainer}>
      {isAdmin && editProduct?.ProductCode === item.ProductCode ? (
        <TextInput
          style={styles.input}
          value={editProduct.Product}
          onChangeText={(text) => setEditProduct({ ...editProduct, Product: text })}
          autoFocus
          onFocus={() => {
            setEditProductIndex(index);
            setTimeout(() => {
              productListRef.current?.scrollToIndex({ index, animated: true });
            }, 100);
          }}
        />
      ) : (
        <Text style={styles.itemText}>{item.Product}</Text>
      )}
      {isAdmin && (
        <View style={styles.buttonGroup}>
          {editProduct?.ProductCode === item.ProductCode ? (
            <>
              <TouchableOpacity onPress={() => updateProduct(item.ProductCode)} disabled={loading}>
                <Ionicons name="checkmark" size={24} color={loading ? "#B0BEC5" : "#1976D2"} />
              </TouchableOpacity>
              <TouchableOpacity
                onPress={() => {
                  setEditProduct(null);
                  setEditProductIndex(null);
                }}
                disabled={loading}
              >
                <Ionicons name="close" size={24} color={loading ? "#B0BEC5" : "#D32F2F"} />
              </TouchableOpacity>
            </>
          ) : (
            <TouchableOpacity onPress={() => setEditProduct(item)} disabled={loading}>
              <Ionicons name="pencil" size={24} color={loading ? "#B0BEC5" : "#FBC02D"} />
            </TouchableOpacity>
          )}
          <TouchableOpacity onPress={() => deleteProduct(item.ProductCode)} disabled={loading}>
            <Ionicons name="trash" size={24} color={loading ? "#B0BEC5" : "#D32F2F"} />
          </TouchableOpacity>
        </View>
      )}
    </View>
  );

  const handleBackPress = () => {
    if (editCategory || editProduct) {
      Alert.alert(
        "Unsaved Changes",
        "You have unsaved changes. Are you sure you want to leave?",
        [
          { text: "Cancel", style: "cancel" },
          {
            text: "Leave",
            style: "destructive",
            onPress: () => {
              setEditCategory(null);
              setEditProduct(null);
              setEditProductIndex(null);
              navigation.navigate("Home");
            },
          },
        ]
      );
    } else {
      navigation.navigate("Home");
    }
  };

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === "ios" ? "padding" : "height"}
      keyboardVerticalOffset={Platform.OS === "ios" ? 100 : 20}
    >
      <View style={styles.header}>
        <TouchableOpacity style={styles.backButton} onPress={handleBackPress}>
          <Ionicons name="arrow-back" size={24} color="#FFF" />
          <Text style={styles.backButtonText}>Back to Home</Text>
        </TouchableOpacity>
        <Text style={styles.title}>
          {selectedCategory ? `Manage ${selectedCategory.Category} Products` : "Manage Categories"}
        </Text>
      </View>

      {loading ? (
        <ActivityIndicator size="large" color="#D32F2F" style={styles.loading} />
      ) : (
        <>
          {!selectedCategory ? (
            <>
              {isAdmin && (
                <View style={styles.inputContainer}>
                  <TextInput
                    style={styles.input}
                    placeholder="New Category Name"
                    value={newCategory}
                    onChangeText={setNewCategory}
                    maxLength={500}
                    placeholderTextColor="#757575"
                  />
                  <TouchableOpacity style={styles.addButton} onPress={addCategory} disabled={loading}>
                    <Ionicons name="add" size={24} color={loading ? "#B0BEC5" : "#FFF"} />
                  </TouchableOpacity>
                </View>
              )}
              <FlatList
                data={categories}
                renderItem={renderCategoryItem}
                keyExtractor={(item) => item.CategoryCode.toString()}
                contentContainerStyle={styles.listContent}
                initialNumToRender={10}
                windowSize={5}
                removeClippedSubviews={true}
              />
            </>
          ) : (
            <>
              <TouchableOpacity
                style={styles.backToCategories}
                onPress={() => {
                  setSelectedCategory(null);
                  setProducts([]);
                  setEditProduct(null);
                  setEditProductIndex(null);
                }}
                disabled={loading}
              >
                <Text
                  style={[styles.backToCategoriesText, { color: loading ? "#B0BEC5" : "#1976D2" }]}
                >
                  Back to Categories
                </Text>
              </TouchableOpacity>
              {isAdmin && (
                <View style={styles.inputContainer}>
                  <TextInput
                    style={styles.input}
                    placeholder="New Product Name"
                    value={newProduct}
                    onChangeText={setNewProduct}
                    maxLength={500}
                    placeholderTextColor="#757575"
                  />
                  <TouchableOpacity style={styles.addButton} onPress={addProduct} disabled={loading}>
                    <Ionicons name="add" size={24} color={loading ? "#B0BEC5" : "#FFF"} />
                  </TouchableOpacity>
                </View>
              )}
              <FlatList
                ref={productListRef}
                data={products}
                renderItem={renderProductItem}
                keyExtractor={(item) => item.ProductCode.toString()}
                contentContainerStyle={styles.listContent}
                keyboardShouldPersistTaps="handled"
                initialNumToRender={10}
                windowSize={5}
                removeClippedSubviews={true}
                onScrollToIndexFailed={(info) => {
                  const wait = new Promise((resolve) => setTimeout(resolve, 500));
                  wait.then(() => {
                    productListRef.current?.scrollToIndex({ index: info.index, animated: true });
                  });
                }}
              />
            </>
          )}
        </>
      )}
    </KeyboardAvoidingView>
  );
};

export default ManageCategories;