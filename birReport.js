// screens/birReport.js
import React, { useEffect, useState } from 'react';
import { FlatList, View, Text, TouchableOpacity, ActivityIndicator } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import axios from 'axios';
import { getAPIUrl } from './config';
import styles from './css/birReport.styles';

const BIRReportScreen = () => {
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const navigation = useNavigation();

  useEffect(() => {
    fetchBIRReport();
  }, []);

  const fetchBIRReport = async () => {
    setLoading(true);
    setError(null);
    try {
      const apiUrl = await getAPIUrl();
      const response = await axios.get(`${apiUrl}/report/birreport`);
      setData(response.data.records || []);
    } catch (error) {
      setError(error.message || "Failed to load BIR report.");
    } finally {
      setLoading(false);
    }
  };

  const handleBackPress = () => {
    navigation.navigate('Home'); // Navigate to Home screen instead of going back
  };

  const renderHeader = () => {
    return (
      <View style={styles.headerContainer}>
        <View style={styles.backButtonContainer}>
          <TouchableOpacity style={styles.backButton} onPress={handleBackPress}>
            <Ionicons name="arrow-back" size={20} color="#FFF8DC" />
            <Text style={styles.backButtonText}>Back</Text>
          </TouchableOpacity>
        </View>
        <View style={styles.titleContainer}>
          <Text style={styles.title} numberOfLines={1} ellipsizeMode="tail">
            BIR Report
          </Text>
        </View>
      </View>
    );
  };

  const renderItem = ({ item }) => {
    return (
      <View style={styles.reportItem}>
        <Text style={styles.reportTitle}>Report Entry: {item.BirCode}</Text>
        <View style={styles.reportDetails}>
          <View style={styles.detailRow}>
            <Ionicons name="calendar-outline" size={18} color="#FF6F61" />
            <Text style={styles.detailsText}>
              {item.TDate ? new Date(item.TDate).toLocaleDateString('en-US') : 'N/A'}
            </Text>
          </View>
          <View style={styles.detailRow}>
            <Ionicons name="cash-outline" size={18} color="#FF6F61" />
            <Text style={styles.detailsText}>
              Registered Sales: {item.RegisteredSales?.toLocaleString() || '0.0000'}
            </Text>
          </View>
          <View style={styles.detailRow}>
            <Ionicons name="trending-up-outline" size={18} color="#FF6F61" />
            <Text style={styles.detailsText}>
              Net Sales: {item.NetSales?.toLocaleString() || '0.0000'}
            </Text>
          </View>
        </View>
      </View>
    );
  };

  const renderEmptyComponent = () => {
    return error ? (
      <View style={styles.emptyContainer}>
        <Text style={styles.noDataText}>{error}</Text>
        <TouchableOpacity style={styles.backButton} onPress={fetchBIRReport}>
          <Text style={styles.backButtonText}>Retry</Text>
        </TouchableOpacity>
      </View>
    ) : (
      <Text style={styles.noDataText}>No data available.</Text>
    );
  };

  return (
    <View style={styles.container}>
      {renderHeader()}
      {loading ? (
        <ActivityIndicator size="large" color="#A0522D" style={styles.loading} />
      ) : (
        <FlatList
          data={data}
          renderItem={renderItem}
          keyExtractor={(item) => item.BirCode.toString()}
          ListEmptyComponent={renderEmptyComponent}
          contentContainerStyle={styles.listContent}
        />
      )}
    </View>
  );
};

export default BIRReportScreen;