import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  FlatList,
  Alert,
  Platform,
  Modal,
  ScrollView,
} from "react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";
import axios from "axios";
import { useNavigation } from "@react-navigation/native";
import { Ionicons } from "@expo/vector-icons";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { getAPIUrl } from "./config";
import styles from "./css/runningBillScreen.styles";

const RunningBillScreen = ({ route }) => {
  const { tableNo: initialTableNo, invoiceNo: initialInvoiceNo } = route.params || {};
  const [tableNo, setTableNo] = useState(initialTableNo || "");
  const [invoiceNo, setInvoiceNo] = useState(initialInvoiceNo || "");
  const [runningBills, setRunningBills] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [checkoutModalVisible, setCheckoutModalVisible] = useState(false);
  const [selectedBill, setSelectedBill] = useState(null);
  const [numberOfCustomers, setNumberOfCustomers] = useState("");
  const [numberOfSeniors, setNumberOfSeniors] = useState("");
  const [amountPaid, setAmountPaid] = useState("");
  const [discountCode, setDiscountCode] = useState("");
  const [notes, setNotes] = useState("");
  const [receiptContent, setReceiptContent] = useState("");
  const [receiptModalVisible, setReceiptModalVisible] = useState(false);
  const [discountedTotal, setDiscountedTotal] = useState(null);
  const navigation = useNavigation();
  const insets = useSafeAreaInsets();

  useEffect(() => {
    fetchRunningBills();
  }, [initialTableNo, initialInvoiceNo]);

  const loadLocalBills = async () => {
    let localBills = [];
    if (Platform.OS === "web") {
      const keys = Object.keys(localStorage).filter((key) => key.startsWith("runningBill:"));
      for (const key of keys) {
        try {
          const billData = localStorage.getItem(key);
          if (billData) {
            const bill = JSON.parse(billData);
            if (
              bill &&
              bill.invoiceNo &&
              bill.posCode &&
              Array.isArray(bill.items) &&
              bill.items.every(
                (item) => item.ProductCode && item.itemId && item.productName && !isNaN(item.quantity) && !isNaN(item.price)
              )
            ) {
              localBills.push({
                ...bill,
                items: bill.items.map((item) => ({
                  itemId: item.itemId.toString(),
                  ProductCode: item.ProductCode.toString(),
                  productName: typeof item.productName === "string" ? item.productName : "Unknown Product",
                  quantity: parseFloat(item.quantity),
                  price: parseFloat(item.price) || 0,
                })),
                invoiceNo: bill.invoiceNo.toString(),
                posCode: bill.posCode.toString(),
                totalAmount: parseFloat(
                  bill.totalAmount ||
                    bill.items.reduce((sum, item) => sum + item.quantity * item.price, 0)
                ).toFixed(2),
              });
            } else {
              console.warn(`Invalid running bill data for key ${key}:`, bill);
              localStorage.removeItem(key);
            }
          }
        } catch (parseError) {
          console.warn(`Failed to parse local running bill data for key ${key}:`, parseError.message);
          localStorage.removeItem(key);
        }
      }
    } else {
      const keys = await AsyncStorage.getAllKeys();
      const runningBillKeys = keys.filter((key) => key.startsWith("runningBill:"));
      const bills = await AsyncStorage.multiGet(runningBillKeys);
      localBills = bills
        .map(([key, value]) => {
          try {
            const bill = JSON.parse(value);
            if (
              bill &&
              bill.invoiceNo &&
              bill.posCode &&
              Array.isArray(bill.items) &&
              bill.items.every(
                (item) => item.ProductCode && item.itemId && item.productName && !isNaN(item.quantity) && !isNaN(item.price)
              )
            ) {
              return {
                ...bill,
                items: bill.items.map((item) => ({
                  itemId: item.itemId.toString(),
                  ProductCode: item.ProductCode.toString(),
                  productName: typeof item.productName === "string" ? item.productName : "Unknown Product",
                  quantity: parseFloat(item.quantity),
                  price: parseFloat(item.price) || 0,
                })),
                invoiceNo: bill.invoiceNo.toString(),
                posCode: bill.posCode.toString(),
                totalAmount: parseFloat(
                  bill.totalAmount ||
                    bill.items.reduce((sum, item) => sum + item.quantity * item.price, 0)
                ).toFixed(2),
              };
            }
            console.warn(`Invalid running bill data for key ${key}:`, bill);
            AsyncStorage.removeItem(key);
            return null;
          } catch (parseError) {
            console.warn(`Failed to parse local running bill data for key ${key}:`, parseError.message);
            AsyncStorage.removeItem(key);
            return null;
          }
        })
        .filter((bill) => bill !== null);
    }
    return localBills;
  };

  const fetchRunningBills = async () => {
    setLoading(true);
    setError(null);
    let retryCount = 0;
    const maxRetries = 3;

    const attemptFetch = async () => {
      try {
        const token = await AsyncStorage.getItem("token");
        if (!token) throw new Error("No authentication token found. Please log in.");
        const apiUrl = await getAPIUrl();

        const params = { posted: 0 };
        if (tableNo) {
          params.tableNo = tableNo;
        } else if (invoiceNo) {
          params.invoiceNo = invoiceNo;
        } else {
          const userData = await AsyncStorage.getItem("userData");
          const posCode = userData ? JSON.parse(userData).posCode : null;
          if (!posCode) {
            console.warn("No posCode found in userData, using 'DEFAULT_POS' as fallback.");
            params.posCode = "DEFAULT_POS";
          } else {
            params.posCode = posCode;
          }
        }

        const response = await axios.get(`${apiUrl}/pending-running-bill/running-bills`, {
          params,
          headers: { Authorization: `Bearer ${token}` },
        });

        if (response.data.status !== "success") {
          throw new Error(response.data.message || "Failed to fetch running bills.");
        }
        if (!Array.isArray(response.data.runningBills)) {
          throw new Error("Invalid running bills data received.");
        }

        const serverBills = response.data.runningBills
          .filter((bill) => bill.posted === 0)
          .map((bill) => {
            const items = bill.items.map((item, index) => {
              const productName =
                typeof item.productName === "string" && item.productName
                  ? item.productName
                  : "Unknown Product";
              return {
                itemId: `server-${bill.invoiceNo}-${index}-${Date.now()}`,
                ProductCode: item.productCode?.toString() || "UNKNOWN",
                productName,
                quantity: parseFloat(item.quantity) || 0,
                price: parseFloat(item.price) || 0,
              };
            });
            return {
              tableNo: bill.tableNo || null,
              items,
              notes: bill.notes || "",
              invoiceNo: bill.invoiceNo?.toString() || "UNKNOWN",
              posCode: bill.posCode?.toString() || "UNKNOWN",
              dineIn: bill.dineIn ?? false,
              takeOut: bill.takeOut ?? false,
              timestamp: bill.timestamp || new Date().toISOString(),
              totalAmount: parseFloat(
                bill.totalAmount || items.reduce((sum, item) => sum + item.quantity * item.price, 0)
              ).toFixed(2),
            };
          });

        const localBills = await loadLocalBills();
        const mergedBills = [...serverBills];
        const localBillKeys = new Set(localBills.map((bill) => bill.invoiceNo));
        for (const serverBill of serverBills) {
          localBillKeys.delete(serverBill.invoiceNo);
          const key = `runningBill:${serverBill.invoiceNo}`;
          const billData = {
            ...serverBill,
            items: serverBill.items.map((item) => ({
              itemId: item.itemId,
              ProductCode: item.ProductCode,
              productName: item.productName,
              quantity: item.quantity,
              price: item.price,
            })),
          };
          if (Platform.OS === "web") {
            localStorage.setItem(key, JSON.stringify(billData));
          } else {
            await AsyncStorage.setItem(key, JSON.stringify(billData));
          }
        }
        for (const localBill of localBills) {
          if (localBillKeys.has(localBill.invoiceNo)) {
            mergedBills.push(localBill);
          }
        }

        const sortedBills = mergedBills.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));
        setRunningBills(sortedBills);
        if (sortedBills.length === 0) {
          const message = invoiceNo
            ? `No running bill found for Invoice ${invoiceNo}`
            : tableNo
            ? `No running bills found for Table ${tableNo}`
            : "No running bills found";
          if (Platform.OS === "web") {
            window.alert(message);
          } else {
            Alert.alert("Info", message);
          }
        }
      } catch (error) {
        console.error("Fetch Running Bills Error:", {
          message: error.message,
          status: error.response?.status,
          data: error.response?.data,
        });
        setError(`Error fetching running bills: ${error.message} ${error.response?.data?.message || ""}`);
        if (error.response?.status !== 400 || runningBills.length === 0) {
          if (Platform.OS === "web") {
            window.alert(
              `Error fetching running bills: ${error.message} ${error.response?.data?.message || ""}`
            );
          } else {
            Alert.alert(
              "Error",
              `Error fetching running bills: ${error.message} ${error.response?.data?.message || ""}`
            );
          }
        }
        const localBills = await loadLocalBills();
        const sortedLocalBills = localBills.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));
        setRunningBills(sortedLocalBills);

        if (error.response?.status === 400 && retryCount < maxRetries) {
          retryCount++;
          console.log(`Retrying fetchRunningBills (Attempt ${retryCount}/${maxRetries})...`);
          await attemptFetch();
        }
      } finally {
        setLoading(false);
      }
    };

    attemptFetch();
  };

  const cancelOrder = async (bill) => {
    if (!bill || !bill.invoiceNo) {
      setError("Invalid bill data.");
      if (Platform.OS === "web") {
        window.alert("Invalid bill data.");
      } else {
        Alert.alert("Error", "Invalid bill data.");
      }
      return;
    }
    const message = `Cancel accepted order for Invoice ${bill.invoiceNo}? This action cannot be undone.`;
    if (Platform.OS === "web") {
      const confirmed = window.confirm(message);
      if (!confirmed) return;
    } else {
      const confirmed = await new Promise((resolve) => {
        Alert.alert(
          "Cancel Order",
          message,
          [
            { text: "Cancel", style: "cancel", onPress: () => resolve(false) },
            { text: "Cancel Order", style: "destructive", onPress: () => resolve(true) },
          ],
          { cancelable: true }
        );
      });
      if (!confirmed) return;
    }
    try {
      const token = await AsyncStorage.getItem("token");
      if (!token) throw new Error("No authentication token found. Please log in.");
      const apiUrl = await getAPIUrl();

      await axios.delete(`${apiUrl}/pending-running-bill/cancel-order`, {
        headers: { Authorization: `Bearer ${token}` },
        data: { invoiceNo: bill.invoiceNo },
      });

      const key = `runningBill:${bill.invoiceNo}`;
      if (Platform.OS === "web") {
        localStorage.removeItem(key);
      } else {
        await AsyncStorage.removeItem(key);
      }

      setRunningBills((prev) => prev.filter((b) => b.invoiceNo !== bill.invoiceNo));
      if (Platform.OS === "web") {
        window.alert(`Order for Invoice ${bill.invoiceNo} canceled successfully.`);
      } else {
        Alert.alert("Success", `Order for Invoice ${bill.invoiceNo} canceled successfully.`);
      }
      await fetchRunningBills();
    } catch (error) {
      setError(error.message || "Error canceling order.");
      if (Platform.OS === "web") {
        window.alert(`Error canceling order: ${error.message}`);
      } else {
        Alert.alert("Error", `Error canceling order: ${error.message}`);
      }
    }
  };

  const openCheckoutModal = (bill) => {
    if (!bill || !Array.isArray(bill.items) || !bill.posCode || !bill.invoiceNo) {
      const errorMessage = "Invalid bill data.";
      setError(errorMessage);
      if (Platform.OS === "web") {
        window.alert(errorMessage);
      } else {
        Alert.alert("Error", errorMessage);
      }
      return;
    }
    setSelectedBill(bill);
    setNumberOfCustomers("");
    setNumberOfSeniors("");
    setAmountPaid("");
    setDiscountCode("");
    setNotes(bill.notes || "");
    setDiscountedTotal(null);
    setCheckoutModalVisible(true);
  };

  const previewDiscount = async () => {
    if (!selectedBill || !numberOfCustomers || isNaN(parseInt(numberOfCustomers)) || parseInt(numberOfCustomers) <= 0) {
      if (Platform.OS === "web") {
        window.alert("Please enter a valid number of customers.");
      } else {
        Alert.alert("Error", "Please enter a valid number of customers.");
      }
      return;
    }

    const customers = parseInt(numberOfCustomers);
    const seniors = parseInt(numberOfSeniors) || 0;
    if (isNaN(seniors) || seniors < 0 || seniors > customers) {
      if (Platform.OS === "web") {
        window.alert("Number of seniors must be a non-negative number and not exceed number of customers.");
      } else {
        Alert.alert("Error", "Number of seniors must be a non-negative number and not exceed number of customers.");
      }
      return;
    }

    try {
      const token = await AsyncStorage.getItem("token");
      if (!token) throw new Error("No authentication token found. Please log in.");
      const apiUrl = await getAPIUrl();

      const response = await axios.post(
        `${apiUrl}/preview-discount`,
        {
          cart: selectedBill.items,
          discountCode,
          numberOfPax: customers,
          numberOfSeniors: seniors,
        },
        { headers: { Authorization: `Bearer ${token}` } }
      );

      if (response.data.status !== "success") {
        throw new Error(response.data.message || "Failed to preview discount.");
      }

      const { totalDue } = response.data;
      setDiscountedTotal(totalDue);
      if (Platform.OS === "web") {
        window.alert(`Discount previewed! New total: ₱${totalDue}`);
      } else {
        Alert.alert("Success", `Discount previewed! New total: ₱${totalDue}`);
      }
    } catch (error) {
      console.error("Preview Discount Error:", error);
      setDiscountedTotal(null);
      if (Platform.OS === "web") {
        window.alert(`Error previewing discount: ${error.message || "Invalid discount code"}`);
      } else {
        Alert.alert("Error", `Error previewing discount: ${error.message || "Invalid discount code"}`);
      }
    }
  };

  const applyDiscount = async () => {
    await previewDiscount();
  };

  const handleCheckout = async () => {
    if (!selectedBill) {
      if (Platform.OS === "web") {
        window.alert("No bill selected for checkout.");
      } else {
        Alert.alert("Error", "No bill selected for checkout.");
      }
      return;
    }

    const customers = parseInt(numberOfCustomers);
    const seniors = parseInt(numberOfSeniors) || 0;
    const paid = parseFloat(amountPaid);
    const totalDue = discountedTotal ? parseFloat(discountedTotal) : parseFloat(selectedBill.totalAmount);

    if (!numberOfCustomers || isNaN(customers) || customers <= 0) {
      if (Platform.OS === "web") {
        window.alert("Please enter a valid number of customers.");
      } else {
        Alert.alert("Error", "Please enter a valid number of customers.");
      }
      return;
    }
    if (isNaN(seniors) || seniors < 0 || seniors > customers) {
      if (Platform.OS === "web") {
        window.alert("Number of seniors must be a non-negative number and not exceed number of customers.");
      } else {
        Alert.alert("Error", "Number of seniors must be a non-negative number and not exceed number of customers.");
      }
      return;
    }
    if (!amountPaid || isNaN(paid) || paid < 0) {
      if (Platform.OS === "web") {
        window.alert("Please enter a valid amount paid.");
      } else {
        Alert.alert("Error", "Please enter a valid amount paid.");
      }
      return;
    }

    if (paid < totalDue) {
      if (Platform.OS === "web") {
        window.alert("Amount paid is less than total due.");
      } else {
        Alert.alert("Error", "Amount paid is less than total due.");
      }
      return;
    }

    try {
      const token = await AsyncStorage.getItem("token");
      if (!token) throw new Error("No authentication token found. Please log in.");
      const apiUrl = await getAPIUrl();

      let discountPercentage = 0;
      if (discountCode) {
        const discountResponse = await axios.get(`${apiUrl}/discount/validate`, {
          params: { discountCode },
          headers: { Authorization: `Bearer ${token}` },
        });
        if (discountResponse.data.status === "success") {
          discountPercentage = discountResponse.data.discountPercentage;
        } else {
          throw new Error(discountResponse.data.message || "Failed to validate discount code.");
        }
      }

      const response = await axios.post(
        `${apiUrl}/runningbill-checkout`,
        {
          posCode: selectedBill.posCode,
          tableNo: selectedBill.tableNo,
          numberOfCustomers: customers,
          numberOfSeniors: seniors,
          notes: notes || null,
          discountCode: discountCode || null,
          discountPercentage: discountPercentage,
          amountPaid: paid,
          totalAmount: totalDue,
        },
        {
          headers: { Authorization: `Bearer ${token}` },
        }
      );

      if (response.data.status !== "success") {
        throw new Error(response.data.message || "Failed to checkout order.");
      }

      const key = `runningBill:${selectedBill.invoiceNo}`;
      if (Platform.OS === "web") {
        localStorage.removeItem(key);
      } else {
        await AsyncStorage.removeItem(key);
      }

      setRunningBills((prev) => prev.filter((b) => b.invoiceNo !== selectedBill.invoiceNo));
      setCheckoutModalVisible(false);
      setReceiptContent(response.data.receipt || "No receipt data received.");
      setReceiptModalVisible(true);
    } catch (error) {
      if (Platform.OS === "web") {
        window.alert(`Error checking out order: ${error.message}`);
      } else {
        Alert.alert("Error", `Error checking out order: ${error.message}`);
      }
    }
  };

  const renderRunningBillItem = ({ item }) => {
    if (!item || !Array.isArray(item.items)) {
      console.warn("Invalid running bill in renderRunningBillItem:", item);
      return (
        <View style={styles.runningBillContainer}>
          <Text style={styles.runningBillTitle}>Invoice {item?.invoiceNo || "Unknown"} - Invalid Bill</Text>
          <Text style={styles.noDataText}>No valid items in this bill.</Text>
        </View>
      );
    }
    const totalAmount = item.totalAmount || item.items.reduce((sum, product) =>
      sum + (parseFloat(product.quantity) * parseFloat(product.price || 0)), 0).toFixed(2);
    return (
      <View style={styles.runningBillContainer}>
        <Text style={styles.runningBillTitle}>
          Invoice {item.invoiceNo} - Table {item.tableNo || "N/A"} - {new Date(item.timestamp).toLocaleString()}
        </Text>
        {item.items.length > 0 ? (
          item.items.map((product) => (
            <View key={product.itemId} style={styles.orderItem}>
              <Text>{product.productName || "Unknown Product"} (x{product.quantity}) - ₱{(product.quantity * (product.price || 0)).toFixed(2)}</Text>
            </View>
          ))
        ) : (
          <Text style={styles.noDataText}>No items in this bill.</Text>
        )}
        <Text style={styles.orderNotes}>Notes: {item.notes || "None"}</Text>
        <Text style={styles.orderNotes}>Type: {item.dineIn ? "Dine-In" : "Take-Out"}</Text>
        <Text style={styles.orderNotes}>Total: ₱{totalAmount}</Text>
        <View style={styles.buttonContainer}>
          <TouchableOpacity
            style={styles.checkoutButton}
            onPress={() => openCheckoutModal(item)}
          >
            <Text style={styles.checkoutButtonText}>Checkout</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.cancelButton}
            onPress={() => cancelOrder(item)}
          >
            <Text style={styles.cancelButtonText}>Cancel</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  };

  return (
    <View
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
        <Text style={styles.headerTitle}>Running Bills</Text>
        <View style={styles.navContainer}>
          <TouchableOpacity
            style={styles.navItem}
            onPress={() => navigation.navigate("POS")}
          >
            <Ionicons name="arrow-back" size={20} color="#000" />
            <Text style={styles.navText}>Back to POS</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.navItem}
            onPress={() => navigation.navigate("PendingOrders")}
          >
            <Ionicons name="hourglass-outline" size={20} color="#000" />
            <Text style={styles.navText}>Pending Orders</Text>
          </TouchableOpacity>
        </View>
      </View>
      <View style={styles.filterSection}>
        <TextInput
          style={[styles.input, { flex: 1 }]}
          placeholder="Enter Table Number"
          value={tableNo}
          onChangeText={setTableNo}
          keyboardType="numeric"
          editable={!loading}
        />
        <TextInput
          style={[styles.input, { flex: 1, marginLeft: 10 }]}
          placeholder="Enter Invoice Number"
          value={invoiceNo}
          onChangeText={setInvoiceNo}
          keyboardType="default"
          editable={!loading}
        />
        <TouchableOpacity
          style={styles.filterButton}
          onPress={fetchRunningBills}
          disabled={loading}
        >
          <Text style={styles.filterButtonText}>Filter</Text>
        </TouchableOpacity>
      </View>
      <View style={styles.runningBillsSection}>
        <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
          <Text style={styles.sectionTitle}>Running Bills</Text>
          <TouchableOpacity
            style={styles.refreshButton}
            onPress={fetchRunningBills}
            accessibilityLabel="Refresh running bills"
          >
            <Ionicons name="refresh-outline" size={20} color="#000" />
            <Text style={styles.refreshButtonText}>Refresh</Text>
          </TouchableOpacity>
        </View>
        {loading ? (
          <Text style={styles.loadingText}>Loading running bills...</Text>
        ) : error ? (
          <View style={styles.errorContainer}>
            <Text style={styles.errorText}>{error}</Text>
            <TouchableOpacity
              style={styles.retryButton}
              onPress={fetchRunningBills}
              disabled={loading}
            >
              <Text style={styles.retryButtonText}>Retry</Text>
            </TouchableOpacity>
          </View>
        ) : (
          <FlatList
            data={runningBills}
            renderItem={renderRunningBillItem}
            keyExtractor={(item) => item.invoiceNo}
            contentContainerStyle={styles.runningBillList}
            ListEmptyComponent={<Text style={styles.noDataText}>No running bills found.</Text>}
          />
        )}
      </View>
      <Modal
        visible={checkoutModalVisible}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setCheckoutModalVisible(false)}
      >
        <View style={styles.modalContainer}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Checkout Order</Text>
            <Text style={styles.modalText}>
              Table: {selectedBill?.tableNo || "N/A"}
            </Text>
            <Text style={styles.modalText}>
              Type: {selectedBill?.dineIn ? "Dine-In" : "Take-Out"}
            </Text>
            <Text style={styles.modalTotalDue}>
              Total Due: ₱{discountedTotal !== null ? discountedTotal : selectedBill?.totalAmount || "0.00"}
            </Text>
            <TextInput
              style={styles.modalInput}
              placeholder="Number of Customers"
              value={numberOfCustomers}
              onChangeText={setNumberOfCustomers}
              keyboardType="numeric"
            />
            <TextInput
              style={styles.modalInput}
              placeholder="Number of Seniors"
              value={numberOfSeniors}
              onChangeText={setNumberOfSeniors}
              keyboardType="numeric"
            />
            <TextInput
              style={styles.modalInput}
              placeholder="Amount Paid"
              value={amountPaid}
              onChangeText={setAmountPaid}
              keyboardType="numeric"
            />
            <View style={styles.discountContainer}>
              <TextInput
                style={styles.discountInput}
                placeholder="Discount Code"
                value={discountCode}
                onChangeText={setDiscountCode}
                keyboardType="numeric"
              />
              <TouchableOpacity
                style={styles.applyButton}
                onPress={applyDiscount}
              >
                <Text style={styles.applyButtonText}>Apply</Text>
              </TouchableOpacity>
            </View>
            <TextInput
              style={styles.modalInput}
              placeholder="Notes (optional)"
              value={notes}
              onChangeText={setNotes}
              multiline
            />
            <View style={styles.modalButtonContainer}>
              <TouchableOpacity
                style={styles.modalButton}
                onPress={handleCheckout}
              >
                <Text style={styles.modalButtonText}>Confirm Checkout</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.modalButton, styles.cancelButton]}
                onPress={() => setCheckoutModalVisible(false)}
              >
                <Text style={styles.modalButtonText}>Cancel</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
      <Modal
        visible={receiptModalVisible}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setReceiptModalVisible(false)}
      >
        <View style={styles.modalContainer}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Customer Receipt</Text>
            <ScrollView style={styles.receiptContainer}>
              <Text style={styles.receiptText}>{receiptContent}</Text>
            </ScrollView>
            <TouchableOpacity
              style={styles.modalButton}
              onPress={() => {
                setReceiptModalVisible(false);
                fetchRunningBills();
              }}
            >
              <Text style={styles.modalButtonText}>Close</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </View>
  );
};

export default RunningBillScreen;