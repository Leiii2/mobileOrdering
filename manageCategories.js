import React, { useEffect, useState, useCallback, useRef } from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
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
  const [newProductPrice, setNewProductPrice] = useState("");
  const [selectedCategory, setSelectedCategory] = useState(null);
  const [editCategory, setEditCategory] = useState(null);
  const [editProduct, setEditProduct] = useState(null);
  const [editProductPrice, setEditProductPrice] = useState("");
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
        showConfirm("Session Expired", "Please log in again.", () => navigation.navigate("Login"));
        await AsyncStorage.removeItem("token");
        await AsyncStorage.removeItem("userData");
      } else {
        showConfirm(
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
      const response = await axios.get(`${apiUrl}/products/${categoryCode}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!Array.isArray(response.data.products)) {
        throw new Error("Invalid products data");
      }
      setProducts(response.data.products);
      setSelectedCategory(categories.find((cat) => cat.CategoryCode === categoryCode) || null);
    } catch (err) {
      if (err.response?.status === 401) {
        showConfirm("Session Expired", "Please log in again.", () => navigation.navigate("Login"));
        await AsyncStorage.removeItem("token");
        await AsyncStorage.removeItem("userData");
      } else {
        showConfirm(
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
      showConfirm("Error", "Only admins can add categories.");
      return;
    }
    const trimmedCategory = newCategory.trim();
    if (!trimmedCategory) {
      showConfirm("Error", "Category name cannot be empty.");
      return;
    }
    if (trimmedCategory.length > 500) {
      showConfirm("Error", "Category name exceeds 500 characters.");
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
      showConfirm("Success", "Category added successfully.");
    } catch (err) {
      showConfirm(
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
        showConfirm("Error", "Only admins can update categories.");
        return;
      }
      if (!editCategory?.Category.trim()) {
        showConfirm("Error", "Category name cannot be empty.");
        return;
      }
      if (editCategory.Category.length > 500) {
        showConfirm("Error", "Category name exceeds 500 characters.");
        return;
      }
      showConfirm("Confirm", "Are you sure you want to save changes?", async () => {
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
          showConfirm("Success", "Category updated successfully.");
        } catch (err) {
          showConfirm(
            "Error",
            err.response?.data?.message || err.message || "Failed to update category."
          );
        } finally {
          setLoading(false);
        }
      });
    },
    [editCategory, categories, isAdmin]
  );

  const deleteCategory = useCallback(
    async (categoryCode) => {
      if (!isAdmin) {
        showConfirm("Error", "Only admins can delete categories.");
        return;
      }
      showConfirm("Confirm", "Are you sure you want to delete this category?", async () => {
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
          showConfirm("Success", "Category deleted successfully.");
        } catch (err) {
          showConfirm(
            "Error",
            err.response?.data?.message || err.message || "Failed to delete category."
          );
        } finally {
          setLoading(false);
        }
      });
    },
    [categories, selectedCategory, products, isAdmin]
  );

  const addProduct = useCallback(async () => {
    if (!isAdmin) {
      showConfirm("Error", "Only admins can add products.");
      return;
    }
    if (!newProduct.trim() || !selectedCategory || !newProductPrice.trim()) {
      showConfirm("Error", "Product name, category selection, and price are required.");
      return;
    }
    if (newProduct.length > 500) {
      showConfirm("Error", "Product name exceeds 500 characters.");
      return;
    }
    const priceValue = parseFloat(newProductPrice.replace(/[^0-9.]/g, ""));
    if (isNaN(priceValue) || priceValue <= 0) {
      showConfirm("Error", "Please enter a valid price greater than 0.");
      return;
    }
    setLoading(true);
    try {
      const token = await AsyncStorage.getItem("token");
      const apiUrl = await getAPIUrl();
      const response = await axios.post(
        `${apiUrl}/products/${selectedCategory.CategoryCode}`,
        { Product: newProduct, SellingPrice: priceValue },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      const newProductData = response.data.product;
      if (!newProductData || !newProductData.ProductCode) {
        throw new Error("Invalid response: ProductCode missing");
      }
      setProducts([...products, newProductData]);
      setNewProduct("");
      setNewProductPrice("");
      showConfirm("Success", "Product added successfully.");
    } catch (err) {
      showConfirm(
        "Error",
        err.response?.data?.message || err.message || "Failed to add product."
      );
    } finally {
      setLoading(false);
    }
  }, [newProduct, newProductPrice, selectedCategory, products, isAdmin]);

  const updateProduct = useCallback(
    async (productCode) => {
      if (!isAdmin) {
        showConfirm("Error", "Only admins can update products.");
        return;
      }
      if (!editProduct?.Product.trim()) {
        showConfirm("Error", "Product name cannot be empty.");
        return;
      }
      if (editProduct.Product.length > 500) {
        showConfirm("Error", "Product name exceeds 500 characters.");
        return;
      }
      const priceValue = parseFloat(editProductPrice.replace(/[^0-9.]/g, ""));
      if (isNaN(priceValue) || priceValue <= 0) {
        showConfirm("Error", "Please enter a valid price greater than 0.");
        return;
      }
      showConfirm("Confirm", "Are you sure you want to save changes?", async () => {
        setLoading(true);
        try {
          const token = await AsyncStorage.getItem("token");
          const apiUrl = await getAPIUrl();
          await axios.put(
            `${apiUrl}/products/${selectedCategory.CategoryCode}/${productCode}`,
            { Product: editProduct.Product, SellingPrice: priceValue },
            { headers: { Authorization: `Bearer ${token}` } }
          );
          setProducts(products.map((prod) => (prod.ProductCode === productCode ? { ...editProduct, SellingPrice: priceValue } : prod)));
          setEditProduct(null);
          setEditProductPrice("");
          setEditProductIndex(null);
          showConfirm("Success", "Product updated successfully.");
        } catch (err) {
          showConfirm(
            "Error",
            err.response?.data?.message || err.message || "Failed to update product."
          );
        } finally {
          setLoading(false);
        }
      });
    },
    [editProduct, editProductPrice, selectedCategory, products, isAdmin]
  );

  const deleteProduct = useCallback(
    async (productCode) => {
      if (!isAdmin) {
        showConfirm("Error", "Only admins can delete products.");
        return;
      }
      showConfirm("Confirm", "Are you sure you want to delete this product?", async () => {
        setLoading(true);
        try {
          const token = await AsyncStorage.getItem("token");
          const apiUrl = await getAPIUrl();
          await axios.delete(`${apiUrl}/products/${selectedCategory.CategoryCode}/${productCode}`, {
            headers: { Authorization: `Bearer ${token}` },
          });
          setProducts(products.filter((prod) => prod.ProductCode !== productCode));
          showConfirm("Success", "Product deleted successfully.");
        } catch (err) {
          showConfirm(
            "Error",
            err.response?.data?.message || err.message || "Failed to delete product."
          );
        } finally {
          setLoading(false);
        }
      });
    },
    [products, selectedCategory, isAdmin]
  );

  const showConfirm = (title, message, onConfirm) => {
    if (Platform.OS === "web") {
      if (onConfirm) {
        if (window.confirm(`${title}: ${message}`)) {
          onConfirm();
        }
      } else {
        window.alert(`${title}: ${message}`);
      }
    } else {
      if (onConfirm) {
        Alert.alert(title, message, [
          { text: "Cancel", style: "cancel" },
          { text: "OK", onPress: onConfirm },
        ]);
      } else {
        Alert.alert(title, message);
      }
    }
  };

  const formatPrice = (price) => {
    if (!price && price !== 0) return "₱N/A";
    return `₱${parseFloat(price).toFixed(2)}`;
  };

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
        <>
          <TextInput
            style={styles.input}
            value={editProduct.Product}
            onChangeText={(text) => setEditProduct({ ...editProduct, Product: text })}
            autoFocus
            onFocus={() => {
              setEditProductIndex(index);
              setTimeout(() => {
                if (productListRef.current) {
                  const element = productListRef.current.querySelector(`[data-index="${index}"]`);
                  element?.scrollIntoView({ behavior: "smooth", block: "center" });
                }
              }, 100);
            }}
          />
          <TextInput
            style={styles.input}
            value={editProductPrice || formatPrice(item.SellingPrice)}
            onChangeText={setEditProductPrice}
            placeholder="Enter price"
            keyboardType="numeric"
          />
        </>
      ) : (
        <>
          <Text style={styles.itemText}>{item.Product}</Text>
          <Text style={styles.itemText}>{formatPrice(item.SellingPrice)}</Text>
        </>
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
                  setEditProductPrice("");
                  setEditProductIndex(null);
                }}
                disabled={loading}
              >
                <Ionicons name="close" size={24} color={loading ? "#B0BEC5" : "#D32F2F"} />
              </TouchableOpacity>
            </>
          ) : (
            <TouchableOpacity onPress={() => { setEditProduct(item); setEditProductPrice(""); }} disabled={loading}>
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
      showConfirm(
        "Unsaved Changes",
        "You have unsaved changes. Are you sure you want to leave?",
        () => {
          setEditCategory(null);
          setEditProduct(null);
          setEditProductPrice("");
          setEditProductIndex(null);
          navigation.navigate("Home");
        }
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
              <ScrollView style={styles.scrollContainer} contentContainerStyle={styles.listContent}>
                {categories.map((item, index) => (
                  <View key={item.CategoryCode.toString()} data-index={index}>
                    {renderCategoryItem({ item })}
                  </View>
                ))}
              </ScrollView>
            </>
          ) : (
            <>
              <TouchableOpacity
                style={styles.backToCategories}
                onPress={() => {
                  setSelectedCategory(null);
                  setProducts([]);
                  setEditProduct(null);
                  setEditProductPrice("");
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
                  <TextInput
                    style={styles.input}
                    placeholder="Price (e.g., 120.00)"
                    value={newProductPrice}
                    onChangeText={setNewProductPrice}
                    keyboardType="numeric"
                  />
                  <TouchableOpacity style={styles.addButton} onPress={addProduct} disabled={loading}>
                    <Ionicons name="add" size={24} color={loading ? "#B0BEC5" : "#FFF"} />
                  </TouchableOpacity>
                </View>
              )}
              <ScrollView style={styles.scrollContainer} contentContainerStyle={styles.listContent} ref={productListRef}>
                {products.map((item, index) => (
                  <View key={item.ProductCode.toString()} data-index={index}>
                    {renderProductItem({ item, index })}
                  </View>
                ))}
              </ScrollView>
            </>
          )}
        </>
      )}
    </KeyboardAvoidingView>
  );
};

export default ManageCategories;