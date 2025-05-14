import React, { useEffect, useState } from 'react';
import { FlatList, View, Text, TouchableOpacity, ActivityIndicator } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import axios from 'axios';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { getAPIUrl } from './config';
import styles from './css/traceUpScreen.styles';

const TraceUpScreen = () => {
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [selectedCategory, setSelectedCategory] = useState(null);
  const [selectedProduct, setSelectedProduct] = useState(null);

  const navigation = useNavigation();

  useEffect(() => {
    fetchCategories();
  }, []);

  const fetchCategories = async () => {
    setLoading(true);
    setError(null);
    try {
      const token = await AsyncStorage.getItem('token');
      const apiUrl = await getAPIUrl();
      const response = await axios.get(`${apiUrl}/categories`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      setData({ type: 'categories', items: response.data.categories || [] });
    } catch (error) {
      setError(error.message || "Failed to load categories.");
    } finally {
      setLoading(false);
    }
  };

  const fetchProducts = async (categoryCode, categoryName) => {
    setLoading(true);
    setError(null);
    setSelectedCategory({ categoryCode, categoryName });
    setSelectedProduct(null);
    try {
      const token = await AsyncStorage.getItem('token');
      const apiUrl = await getAPIUrl();
      const response = await axios.get(`${apiUrl}/stocks/${categoryCode}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const products = response.data.products || [];
      setData({
        type: 'products',
        items: products.map(product => ({
          ...product,
          ProductCode: parseInt(product.ProductCode) || 0,
          Stock: parseInt(product.Stock) || 0,
        })),
      });
    } catch (error) {
      setError(error.message || "Failed to load products.");
    } finally {
      setLoading(false);
    }
  };

  const fetchTraceUpHistory = async (ProductCode, productName) => {
    setLoading(true);
    setError(null);
    setSelectedProduct({ ProductCode: parseInt(ProductCode), productName });
    try {
      const token = await AsyncStorage.getItem('token');
      const apiUrl = await getAPIUrl();
      const response = await axios.get(`${apiUrl}/traceup/${parseInt(ProductCode)}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      setData({ type: 'history', items: response.data.history || [] });
    } catch (error) {
      setError(error.message || "Failed to load transaction history.");
    } finally {
      setLoading(false);
    }
  };

  const handleBackPress = () => {
    if (selectedProduct) {
      fetchProducts(selectedCategory.categoryCode, selectedCategory.categoryName);
    } else if (selectedCategory) {
      fetchCategories();
      setSelectedCategory(null);
    } else {
      navigation.goBack();
    }
  };

  const renderHeader = () => {
    let title = 'Select a Category';
    let backText = 'Home';

    if (selectedProduct) {
      title = `Transaction History: ${selectedProduct.productName}`;
      backText = 'Products';
    } else if (selectedCategory) {
      title = `${selectedCategory.categoryName} Products`;
      backText = 'Categories';
    }

    return (
      <View style={styles.headerContainer}>
        <View style={styles.backButtonContainer}>
          <TouchableOpacity style={styles.backButton} onPress={handleBackPress}>
            <Ionicons name="arrow-back" size={20} color="#FFF8DC" />
            <Text style={styles.backButtonText}>{backText}</Text>
          </TouchableOpacity>
        </View>
        <View style={styles.titleContainer}>
          <Text style={styles.title} numberOfLines={1} ellipsizeMode="tail">
            {title}
          </Text>
        </View>
      </View>
    );
  };

  const renderItem = ({ item }) => {
    if (item.type === 'categories') {
      return (
        <FlatList
          data={item.items}
          keyExtractor={(cat) => cat.CategoryCode.toString()}
          renderItem={({ item: cat }) => (
            <TouchableOpacity style={styles.categoryItem} onPress={() => fetchProducts(cat.CategoryCode, cat.Category)}>
              <Text style={styles.categoryText}>{cat.Category || 'Unnamed Category'}</Text>
            </TouchableOpacity>
          )}
        />
      );
    }

    if (item.type === 'products') {
      return (
        <FlatList
          data={item.items}
          keyExtractor={(prod) => prod.ProductCode.toString()}
          renderItem={({ item: prod }) => (
            <TouchableOpacity style={styles.productItem} onPress={() => fetchTraceUpHistory(prod.ProductCode, prod.Product)}>
              <Text style={styles.itemText}>{prod.Product || 'Unnamed Product'}</Text>
              <Text style={styles.stockText}>Stock: {prod.Stock ?? 0}</Text>
            </TouchableOpacity>
          )}
        />
      );
    }

    if (item.type === 'history') {
      return (
        <FlatList
          data={item.items}
          keyExtractor={(trans) => trans.StockOnHandTraceUpCode.toString()}
          renderItem={({ item: trans }) => (
            <View style={styles.historyItem}>
              <Text style={styles.transactionType}>{trans.TransactionType || 'Unknown'}</Text>
              <View style={styles.historyDetails}>
                <View style={styles.detailRow}>
                  <Ionicons name="calendar-outline" size={18} color="#FF6F61" />
                  <Text style={styles.detailsText}>
                    {trans.TDate ? new Date(trans.TDate).toLocaleDateString('en-US', {
                      month: '2-digit',
                      day: '2-digit',
                      year: 'numeric',
                    }) : 'No Date'}
                  </Text>
                </View>
                <View style={styles.detailRow}>
                  <Ionicons name="cube-outline" size={18} color="#FF6F61" />
                  <Text style={styles.detailsText}>Quantity: {trans.Qty ?? 0}</Text>
                </View>
                <View style={styles.detailRow}>
                  <Ionicons name="archive-outline" size={18} color="#FF6F61" />
                  <Text style={styles.detailsText}>Remaining: {trans.Remaining ?? 0}</Text>
                </View>
                <View style={styles.detailRow}>
                  <Ionicons name="person-outline" size={18} color="#FF6F61" />
                  <Text style={styles.detailsText}>User: {trans.UserName || 'Unknown'}</Text>
                </View>
              </View>
            </View>
          )}
          ListHeaderComponent={() => (
            <Text style={styles.historyNote}>
              Showing the top 100 most recent transactions. Older transactions are not displayed.
            </Text>
          )}
        />
      );
    }

    return null;
  };

  return (
    <View style={styles.container}>
      {renderHeader()}
      {loading ? (
        <ActivityIndicator size="large" color="#A0522D" style={{ marginTop: 20 }} />
      ) : error ? (
        <View style={{ alignItems: 'center', marginTop: 20 }}>
          <Text style={styles.noDataText}>{error || 'An error occurred'}</Text>
          <TouchableOpacity style={styles.backButton} onPress={fetchCategories}>
            <Text style={styles.backButtonText}>Retry</Text>
          </TouchableOpacity>
        </View>
      ) : data.items && data.items.length === 0 ? (
        <Text style={styles.noDataText}>No data available.</Text>
      ) : (
        <FlatList data={[data]} renderItem={renderItem} keyExtractor={(_, index) => index.toString()} contentContainerStyle={{ paddingBottom: 30 }} />
      )}
    </View>
  );
};

export default TraceUpScreen;