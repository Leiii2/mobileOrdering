import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  FlatList,
  ActivityIndicator,
  Alert,
  Modal,
  ScrollView,
  SafeAreaView,
} from "react-native";
import { useNavigation } from "@react-navigation/native";
import { Ionicons } from "@expo/vector-icons";
import axios from "axios";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { getAPIUrl } from "./config";
import styles from "./css/dailyReport.styles";

const DailyReport = () => {
  const [reportData, setReportData] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [filterModalVisible, setFilterModalVisible] = useState(false);
  const [dateFilterType, setDateFilterType] = useState("all");
  const [singleDate, setSingleDate] = useState(new Date("2025-03-25"));
  const [startDate, setStartDate] = useState(new Date("2024-12-11"));
  const [endDate, setEndDate] = useState(new Date("2025-03-25"));
  const [showSingleDatePicker, setShowSingleDatePicker] = useState(false);
  const [showStartDatePicker, setShowStartDatePicker] = useState(false);
  const [showEndDatePicker, setShowEndDatePicker] = useState(false);
  const [minYear, setMinYear] = useState(new Date().getFullYear());
  const [tempYear, setTempYear] = useState(new Date("2025-03-25").getFullYear());
  const [tempMonth, setTempMonth] = useState(new Date("2025-03-25").getMonth());
  const [tempDay, setTempDay] = useState(new Date("2025-03-25").getDate());
  const [datePickerTarget, setDatePickerTarget] = useState(null);
  const [showYearPicker, setShowYearPicker] = useState(false);
  const [showMonthPicker, setShowMonthPicker] = useState(false);
  const [showDayPicker, setShowDayPicker] = useState(false);

  const navigation = useNavigation();

  useEffect(() => {
    const fetchMinYear = async () => {
      try {
        const token = await AsyncStorage.getItem("token");
        if (!token) throw new Error("No authentication token found. Please log in.");
        const apiUrl = await getAPIUrl();
        const response = await axios.get(`${apiUrl}/reports/min-year`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        if (response.data.status !== "success") {
          throw new Error(response.data.message || "Failed to fetch minimum year.");
        }
        setMinYear(response.data.minYear);
      } catch (error) {
        setError(error.message || "Failed to fetch minimum year.");
      }
    };

    fetchMinYear();
    fetchReportData();
  }, []);

  const fetchReportData = async (filter = {}) => {
    setLoading(true);
    setError(null);
    try {
      const token = await AsyncStorage.getItem("token");
      if (!token) throw new Error("No authentication token found. Please log in.");
      const apiUrl = await getAPIUrl();
      const requestBody = {
        dateFilterType: filter.dateFilterType || dateFilterType,
        singleDate: filter.singleDate || singleDate.toISOString().split("T")[0],
        startDate: filter.startDate || startDate.toISOString().split("T")[0],
        endDate: filter.endDate || endDate.toISOString().split("T")[0],
      };
      const response = await axios.post(
        `${apiUrl}/reports/daily`,
        requestBody,
        { headers: { Authorization: `Bearer ${token}` } }
      );
      if (response.data.status !== "success") {
        throw new Error(response.data.message || "Failed to fetch report data.");
      }
      setReportData(response.data.reportData);
    } catch (error) {
      setError(error.message || "Failed to fetch report data.");
    } finally {
      setLoading(false);
    }
  };

  const handleFilterApply = () => {
    if (dateFilterType === "range" && startDate > endDate) {
      Alert.alert("Validation Error", "Start date cannot be after end date.");
      return;
    }
    setFilterModalVisible(false);
    fetchReportData({
      dateFilterType,
      singleDate: singleDate.toISOString().split("T")[0],
      startDate: startDate.toISOString().split("T")[0],
      endDate: endDate.toISOString().split("T")[0],
    });
  };

  const handleFilterCancel = () => {
    setFilterModalVisible(false);
    setDateFilterType("all");
    setSingleDate(new Date("2025-03-25"));
    setStartDate(new Date("2024-12-11"));
    setEndDate(new Date("2025-03-25"));
  };

  const openDatePicker = (target) => {
    setDatePickerTarget(target);
    if (target === "single") {
      setTempYear(singleDate.getFullYear());
      setTempMonth(singleDate.getMonth());
      setTempDay(singleDate.getDate());
      setShowSingleDatePicker(true);
    } else if (target === "start") {
      setTempYear(startDate.getFullYear());
      setTempMonth(startDate.getMonth());
      setTempDay(startDate.getDate());
      setShowStartDatePicker(true);
    } else if (target === "end") {
      setTempYear(endDate.getFullYear());
      setTempMonth(endDate.getMonth());
      setTempDay(endDate.getDate());
      setShowEndDatePicker(true);
    }
  };

  const confirmDate = () => {
    const newDate = new Date(tempYear, tempMonth, tempDay);
    if (datePickerTarget === "single") {
      setSingleDate(newDate);
      setShowSingleDatePicker(false);
    } else if (datePickerTarget === "start") {
      setStartDate(newDate);
      setShowStartDatePicker(false);
    } else if (datePickerTarget === "end") {
      setEndDate(newDate);
      setShowEndDatePicker(false);
    }
    setDatePickerTarget(null);
  };

  const cancelDate = () => {
    setShowSingleDatePicker(false);
    setShowStartDatePicker(false);
    setShowEndDatePicker(false);
    setDatePickerTarget(null);
  };

  const currentYear = new Date().getFullYear();
  const years = Array.from(
    { length: currentYear - minYear + 1 },
    (_, i) => minYear + i
  );
  const months = Array.from({ length: 12 }, (_, i) => i);
  const daysInMonth = new Date(tempYear, tempMonth + 1, 0).getDate();
  const days = Array.from({ length: daysInMonth }, (_, i) => i + 1);

  useEffect(() => {
    const maxDays = new Date(tempYear, tempMonth + 1, 0).getDate();
    if (tempDay > maxDays) {
      setTempDay(maxDays);
    }
  }, [tempMonth, tempYear]);

  const formatTempDate = () => {
    return `${tempMonth + 1}/${tempDay}/${tempYear}`;
  };

  const renderReportItem = ({ item }) => (
    <View style={styles.reportRow}>
      <Text
        style={[styles.reportCell, { flex: 1 }]}
        numberOfLines={1}
        ellipsizeMode="tail"
      >
        {item.time}
      </Text>
      <Text
        style={[styles.reportCell, { flex: 1 }]}
        numberOfLines={1}
        ellipsizeMode="tail"
      >
        {item.invoiceNo}
      </Text>
      <Text
        style={[styles.reportCell, { flex: 1 }]}
        numberOfLines={1}
        ellipsizeMode="tail"
      >
        {item.tableNo}
      </Text>
      <Text
        style={[styles.reportCell, { flex: 1, textAlign: "right" }]}
        numberOfLines={1}
        ellipsizeMode="tail"
      >
        {parseFloat(item.discount).toFixed(2)}
      </Text>
      <Text
        style={[styles.reportCell, { flex: 1, textAlign: "right" }]}
        numberOfLines={1}
        ellipsizeMode="tail"
      >
        {parseFloat(item.totalDue).toFixed(2)}
      </Text>
      <Text
        style={[styles.reportCell, { flex: 1, textAlign: "center" }]}
        numberOfLines={1}
        ellipsizeMode="tail"
      >
        {item.cashier}
      </Text>
    </View>
  );

  return (
    <SafeAreaView style={{ flex: 1 }}>
      <View style={styles.container}>
        <View style={styles.header}>
          <Text style={styles.title}>Daily Summary Report</Text>
          <View style={styles.headerButtons}>
            <TouchableOpacity
              style={styles.backButton}
              onPress={() => navigation.goBack()}
              disabled={loading}
            >
              <Ionicons name="arrow-back" size={20} color="#FFF" />
              <Text style={styles.backButtonText}>Back</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.filterButton}
              onPress={() => setFilterModalVisible(true)}
              disabled={loading}
            >
              <Ionicons name="filter" size={20} color="#FFF" />
              <Text style={styles.filterButtonText}>Filter</Text>
            </TouchableOpacity>
          </View>
        </View>

        {loading ? (
          <ActivityIndicator size="large" color="#A0522D" style={styles.loading} />
        ) : error ? (
          <View style={styles.errorContainer}>
            <Text style={styles.errorText}>{error}</Text>
            <TouchableOpacity
              style={styles.retryButton}
              onPress={() => fetchReportData()}
            >
              <Text style={styles.retryButtonText}>Retry</Text>
            </TouchableOpacity>
          </View>
        ) : (
          <View style={styles.contentContainer}>
            <View style={styles.reportHeader}>
              <Text style={styles.reportDate}>
                DATE FROM:{" "}
                {dateFilterType === "all"
                  ? "All Dates"
                  : dateFilterType === "single"
                  ? `${singleDate.getMonth() + 1}/${singleDate.getDate()}/${singleDate.getFullYear()}`
                  : `${startDate.getMonth() + 1}/${startDate.getDate()}/${startDate.getFullYear()}`}
                {"  "}DATE TO:{" "}
                {dateFilterType === "all"
                  ? "All Dates"
                  : dateFilterType === "single"
                  ? `${singleDate.getMonth() + 1}/${singleDate.getDate()}/${singleDate.getFullYear()}`
                  : `${endDate.getMonth() + 1}/${endDate.getDate()}/${endDate.getFullYear()}`}
              </Text>
              <Text style={styles.reportPrinted}>
                Date Printed: {`${new Date().getMonth() + 1}/${new Date().getDate()}/${new Date().getFullYear()}`}
              </Text>
            </View>
            <View style={styles.tableContainer}>
              <View style={styles.tableHeader}>
                <Text
                  style={[styles.headerCell, { flex: 1 }]}
                  numberOfLines={1}
                  ellipsizeMode="tail"
                >
                  TIME
                </Text>
                <Text
                  style={[styles.headerCell, { flex: 1 }]}
                  numberOfLines={1}
                  ellipsizeMode="tail"
                >
                  INVOICE
                </Text>
                <Text
                  style={[styles.headerCell, { flex: 1 }]}
                  numberOfLines={1}
                  ellipsizeMode="tail"
                >
                  TABLE NO.
                </Text>
                <Text
                  style={[styles.headerCell, { flex: 1 }]}
                  numberOfLines={1}
                  ellipsizeMode="tail"
                >
                  DISC
                </Text>
                <Text
                  style={[styles.headerCell, { flex: 1 }]}
                  numberOfLines={1}
                  ellipsizeMode="tail"
                >
                  TOTAL
                </Text>
                <Text
                  style={[styles.headerCell, { flex: 1 }]}
                  numberOfLines={1}
                  ellipsizeMode="tail"
                >
                  CASHIER
                </Text>
              </View>
              <FlatList
                data={reportData}
                renderItem={renderReportItem}
                keyExtractor={(item) => item.invoiceNo.toString()}
                contentContainerStyle={styles.reportList}
                ListEmptyComponent={
                  <Text style={styles.noDataText}>
                    No transactions found for{" "}
                    {dateFilterType === "all"
                      ? "all dates"
                      : dateFilterType === "single"
                      ? `${singleDate.getMonth() + 1}/${singleDate.getDate()}/${singleDate.getFullYear()}`
                      : `${startDate.getMonth() + 1}/${startDate.getDate()}/${startDate.getFullYear()} to ${endDate.getMonth() + 1}/${endDate.getDate()}/${endDate.getFullYear()}`}.
                    Please try a different date range.
                  </Text>
                }
                initialNumToRender={50}
                maxToRenderPerBatch={50}
                windowSize={21}
              />
            </View>
          </View>
        )}

        <Modal
          animationType="slide"
          transparent={true}
          visible={filterModalVisible}
          onRequestClose={handleFilterCancel}
        >
          <View style={styles.modalOverlay}>
            <ScrollView contentContainerStyle={styles.modalContent}>
              <Text style={styles.modalTitle}>Filter Report</Text>
              <View style={styles.optionContainer}>
                <TouchableOpacity
                  style={[styles.optionButton, dateFilterType === "all" && styles.selectedOption]}
                  onPress={() => setDateFilterType("all")}
                  disabled={loading}
                >
                  <Text style={dateFilterType === "all" ? styles.selectedOptionText : styles.optionText}>
                    All Dates
                  </Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.optionButton, dateFilterType === "single" && styles.selectedOption]}
                  onPress={() => setDateFilterType("single")}
                  disabled={loading}
                >
                  <Text style={dateFilterType === "single" ? styles.selectedOptionText : styles.optionText}>
                    Single Date
                  </Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.optionButton, dateFilterType === "range" && styles.selectedOption]}
                  onPress={() => setDateFilterType("range")}
                  disabled={loading}
                >
                  <Text style={dateFilterType === "range" ? styles.selectedOptionText : styles.optionText}>
                    Date Range
                  </Text>
                </TouchableOpacity>
              </View>

              {dateFilterType === "single" && (
                <TouchableOpacity
                  style={styles.datePickerButton}
                  onPress={() => openDatePicker("single")}
                >
                  <Text style={styles.datePickerText}>
                    Select Date: {`${singleDate.getMonth() + 1}/${singleDate.getDate()}/${singleDate.getFullYear()}`}
                  </Text>
                </TouchableOpacity>
              )}
              {dateFilterType === "range" && (
                <>
                  <TouchableOpacity
                    style={styles.datePickerButton}
                    onPress={() => openDatePicker("start")}
                  >
                    <Text style={styles.datePickerText}>
                      Start Date: {`${startDate.getMonth() + 1}/${startDate.getDate()}/${startDate.getFullYear()}`}
                    </Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={styles.datePickerButton}
                    onPress={() => openDatePicker("end")}
                  >
                    <Text style={styles.datePickerText}>
                      End Date: {`${endDate.getMonth() + 1}/${endDate.getDate()}/${endDate.getFullYear()}`}
                    </Text>
                  </TouchableOpacity>
                </>
              )}

              <View style={styles.modalButtonContainer}>
                <TouchableOpacity
                  style={styles.cancelButton}
                  onPress={handleFilterCancel}
                  disabled={loading}
                >
                  <Text style={styles.cancelButtonText}>Cancel</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={styles.confirmButton}
                  onPress={handleFilterApply}
                  disabled={loading}
                >
                  <Text style={styles.confirmButtonText}>Apply</Text>
                </TouchableOpacity>
              </View>
            </ScrollView>
          </View>
        </Modal>

        <Modal
          animationType="slide"
          transparent={true}
          visible={showSingleDatePicker || showStartDatePicker || showEndDatePicker}
          onRequestClose={cancelDate}
        >
          <View style={styles.modalOverlay}>
            <View style={styles.modalContent}>
              <Text style={styles.modalTitle}>Select Date</Text>
              <Text style={styles.datePreview}>
                Selected: {formatTempDate()}
              </Text>
              <View style={styles.datePickerContainer}>
                <TouchableOpacity
                  style={styles.customPicker}
                  onPress={() => setShowYearPicker(true)}
                >
                  <Text style={styles.customPickerText}>{tempYear}</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={styles.customPicker}
                  onPress={() => setShowMonthPicker(true)}
                >
                  <Text style={styles.customPickerText}>
                    {new Date(0, tempMonth).toLocaleString("default", { month: "long" })}
                  </Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={styles.customPicker}
                  onPress={() => setShowDayPicker(true)}
                >
                  <Text style={styles.customPickerText}>{tempDay}</Text>
                </TouchableOpacity>
              </View>
              <View style={styles.modalButtonContainer}>
                <TouchableOpacity style={styles.cancelButton} onPress={cancelDate}>
                  <Text style={styles.cancelButtonText}>Cancel</Text>
                </TouchableOpacity>
                <TouchableOpacity style={styles.confirmButton} onPress={confirmDate}>
                  <Text style={styles.confirmButtonText}>Confirm</Text>
                </TouchableOpacity>
              </View>
            </View>
          </View>
        </Modal>

        <Modal
          animationType="slide"
          transparent={true}
          visible={showYearPicker}
          onRequestClose={() => setShowYearPicker(false)}
        >
          <View style={styles.modalOverlay}>
            <View style={styles.modalContent}>
              <Text style={styles.modalTitle}>Select Year</Text>
              <FlatList
                data={years}
                keyExtractor={(item) => item.toString()}
                renderItem={({ item }) => (
                  <TouchableOpacity
                    style={styles.pickerOption}
                    onPress={() => {
                      setTempYear(item);
                      setShowYearPicker(false);
                    }}
                  >
                    <Text style={styles.pickerOptionText}>{item}</Text>
                  </TouchableOpacity>
                )}
                style={styles.pickerList}
              />
              <TouchableOpacity
                style={styles.cancelButton}
                onPress={() => setShowYearPicker(false)}
              >
                <Text style={styles.cancelButtonText}>Cancel</Text>
              </TouchableOpacity>
            </View>
          </View>
        </Modal>

        <Modal
          animationType="slide"
          transparent={true}
          visible={showMonthPicker}
          onRequestClose={() => setShowMonthPicker(false)}
        >
          <View style={styles.modalOverlay}>
            <View style={styles.modalContent}>
              <Text style={styles.modalTitle}>Select Month</Text>
              <FlatList
                data={months}
                keyExtractor={(item) => item.toString()}
                renderItem={({ item }) => (
                  <TouchableOpacity
                    style={styles.pickerOption}
                    onPress={() => {
                      setTempMonth(item);
                      setShowMonthPicker(false);
                    }}
                  >
                    <Text style={styles.pickerOptionText}>
                      {new Date(0, item).toLocaleString("default", { month: "long" })}
                    </Text>
                  </TouchableOpacity>
                )}
                style={styles.pickerList}
              />
              <TouchableOpacity
                style={styles.cancelButton}
                onPress={() => setShowMonthPicker(false)}
              >
                <Text style={styles.cancelButtonText}>Cancel</Text>
              </TouchableOpacity>
            </View>
          </View>
        </Modal>

        <Modal
          animationType="slide"
          transparent={true}
          visible={showDayPicker}
          onRequestClose={() => setShowDayPicker(false)}
        >
          <View style={styles.modalOverlay}>
            <View style={styles.modalContent}>
              <Text style={styles.modalTitle}>Select Day</Text>
              <FlatList
                data={days}
                keyExtractor={(item) => item.toString()}
                renderItem={({ item }) => (
                  <TouchableOpacity
                    style={styles.pickerOption}
                    onPress={() => {
                      setTempDay(item);
                      setShowDayPicker(false);
                    }}
                  >
                    <Text style={styles.pickerOptionText}>{item}</Text>
                  </TouchableOpacity>
                )}
                style={styles.pickerList}
              />
              <TouchableOpacity
                style={styles.cancelButton}
                onPress={() => setShowDayPicker(false)}
              >
                <Text style={styles.cancelButtonText}>Cancel</Text>
              </TouchableOpacity>
            </View>
          </View>
        </Modal>
      </View>
    </SafeAreaView>
  );
};

export default DailyReport;
