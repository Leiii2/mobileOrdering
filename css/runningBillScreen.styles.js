import { StyleSheet, Platform, Dimensions } from "react-native";

const { width } = Dimensions.get("window");

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#F5F5F5",
  },
  topNav: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    backgroundColor: "#FFFFFF",
    paddingVertical: 10,
    paddingHorizontal: 15,
    borderBottomWidth: 1,
    borderBottomColor: "#E0E0E0",
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: "700",
    color: "#333333",
    ...Platform.select({
      ios: { fontFamily: "System" },
      android: { fontFamily: "Roboto" },
      web: { fontFamily: "'Roboto', 'Arial', sans-serif" },
    }),
  },
  navContainer: {
    flexDirection: "row",
    justifyContent: "flex-end",
    alignItems: "center",
    flex: 1,
    paddingHorizontal: 10,
  },
  navItem: {
    flexDirection: "row",
    alignItems: "center",
    marginLeft: 15,
  },
  navText: {
    fontSize: 16,
    color: "#333333",
    marginLeft: 5,
    fontWeight: "600",
    ...Platform.select({
      ios: { fontFamily: "System" },
      android: { fontFamily: "Roboto" },
      web: { fontFamily: "'Roboto', 'Arial', sans-serif" },
    }),
  },
  filterSection: {
    flexDirection: "row",
    alignItems: "center",
    padding: 15,
    backgroundColor: "#FFFFFF",
    borderBottomWidth: 1,
    borderBottomColor: "#E0E0E0",
  },
  input: {
    flex: 1,
    borderWidth: 1,
    borderColor: "#E0E0E0",
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
    color: "#333333",
    backgroundColor: "#F9F9F9",
    marginRight: 10,
    ...Platform.select({
      ios: { fontFamily: "System" },
      android: { fontFamily: "Roboto" },
      web: { fontFamily: "'Roboto', 'Arial', sans-serif" },
    }),
  },
  filterButton: {
    backgroundColor: "#F28C38",
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderRadius: 8,
    ...Platform.select({
      ios: {
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.2,
        shadowRadius: 3,
      },
      android: { elevation: 2 },
      web: {
        boxShadow: "0 2px 3px rgba(0,0,0,0.2)",
        transition: "background-color 0.2s",
        ":hover": {
          backgroundColor: "#E07B30",
          cursor: "pointer",
        },
      },
    }),
  },
  filterButtonText: {
    color: "#FFFFFF",
    fontSize: 16,
    fontWeight: "600",
    ...Platform.select({
      ios: { fontFamily: "System" },
      android: { fontFamily: "Roboto" },
      web: { fontFamily: "'Roboto', 'Arial', sans-serif" },
    }),
  },
  runningBillsSection: {
    flex: 1,
    padding: 15,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: "700",
    color: "#333333",
    marginBottom: 10,
    ...Platform.select({
      ios: { fontFamily: "System" },
      android: { fontFamily: "Roboto" },
      web: { fontFamily: "'Roboto', 'Arial', sans-serif" },
    }),
  },
  refreshButton: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#F28C38",
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 8,
    ...Platform.select({
      ios: {
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.2,
        shadowRadius: 3,
      },
      android: { elevation: 2 },
      web: {
        boxShadow: "0 2px 3px rgba(0,0,0,0.2)",
        transition: "background-color 0.2s",
        ":hover": {
          backgroundColor: "#E07B30",
          cursor: "pointer",
        },
      },
    }),
  },
  refreshButtonText: {
    color: "#FFFFFF",
    fontSize: 14,
    fontWeight: "600",
    marginLeft: 5,
    ...Platform.select({
      ios: { fontFamily: "System" },
      android: { fontFamily: "Roboto" },
      web: { fontFamily: "'Roboto', 'Arial', sans-serif" },
    }),
  },
  errorContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    padding: 20,
    backgroundColor: "#FFFFFF",
    borderRadius: 10,
    margin: 15,
    ...Platform.select({
      ios: {
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 4,
      },
      android: { elevation: 3 },
      web: { boxShadow: "0 2px 4px rgba(0,0,0,0.1)" },
    }),
  },
  errorText: {
    fontSize: 16,
    color: "#D32F2F",
    textAlign: "center",
    marginBottom: 20,
    ...Platform.select({
      ios: { fontFamily: "System" },
      android: { fontFamily: "Roboto" },
      web: { fontFamily: "'Roboto', 'Arial', sans-serif" },
    }),
  },
  retryButton: {
    backgroundColor: "#F28C38",
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderRadius: 8,
    ...Platform.select({
      ios: {
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.2,
        shadowRadius: 3,
      },
      android: { elevation: 2 },
      web: {
        boxShadow: "0 2px 3px rgba(0,0,0,0.2)",
        transition: "background-color 0.2s",
        ":hover": {
          backgroundColor: "#E07B30",
          cursor: "pointer",
        },
      },
    }),
  },
  retryButtonText: {
    color: "#FFFFFF",
    fontSize: 16,
    fontWeight: "600",
    ...Platform.select({
      ios: { fontFamily: "System" },
      android: { fontFamily: "Roboto" },
      web: { fontFamily: "'Roboto', 'Arial', sans-serif" },
    }),
  },
  runningBillList: {
    padding: 0, // Adjusted to avoid double padding with section padding
  },
  runningBillContainer: {
    backgroundColor: "#FFFFFF",
    borderRadius: 10,
    padding: 15,
    marginBottom: 15,
    ...Platform.select({
      ios: {
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 4,
      },
      android: { elevation: 3 },
      web: { boxShadow: "0 2px 4px rgba(0,0,0,0.1)" },
    }),
  },
  runningBillTitle: {
    fontSize: 18,
    fontWeight: "700",
    color: "#333333",
    marginBottom: 10,
    ...Platform.select({
      ios: { fontFamily: "System" },
      android: { fontFamily: "Roboto" },
      web: { fontFamily: "'Roboto', 'Arial', sans-serif" },
    }),
  },
  orderItem: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingVertical: 5,
  },
  orderNotes: {
    fontSize: 14,
    color: "#6B5E4A",
    marginVertical: 5,
    ...Platform.select({
      ios: { fontFamily: "System" },
      android: { fontFamily: "Roboto" },
      web: { fontFamily: "'Roboto', 'Arial', sans-serif" },
    }),
  },
  buttonContainer: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginTop: 10,
  },
  checkoutButton: {
    backgroundColor: "#F28C38",
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderRadius: 8,
    flex: 1,
    marginRight: 5,
    ...Platform.select({
      ios: {
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.2,
        shadowRadius: 3,
      },
      android: { elevation: 2 },
      web: {
        boxShadow: "0 2px 3px rgba(0,0,0,0.2)",
        transition: "background-color 0.2s",
        ":hover": {
          backgroundColor: "#E07B30",
          cursor: "pointer",
        },
      },
    }),
  },
  checkoutButtonText: {
    color: "#FFFFFF",
    fontSize: 16,
    fontWeight: "600",
    textAlign: "center",
    ...Platform.select({
      ios: { fontFamily: "System" },
      android: { fontFamily: "Roboto" },
      web: { fontFamily: "'Roboto', 'Arial', sans-serif" },
    }),
  },
  cancelButton: {
    backgroundColor: "#D32F2F",
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderRadius: 8,
    flex: 1,
    marginLeft: 5,
    ...Platform.select({
      ios: {
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.2,
        shadowRadius: 3,
      },
      android: { elevation: 2 },
      web: {
        boxShadow: "0 2px 3px rgba(0,0,0,0.2)",
        transition: "background-color 0.2s",
        ":hover": {
          backgroundColor: "#C9302C",
          cursor: "pointer",
        },
      },
    }),
  },
  cancelButtonText: {
    color: "#FFFFFF",
    fontSize: 16,
    fontWeight: "600",
    textAlign: "center",
    ...Platform.select({
      ios: { fontFamily: "System" },
      android: { fontFamily: "Roboto" },
      web: { fontFamily: "'Roboto', 'Arial', sans-serif" },
    }),
  },
  noDataText: {
    fontSize: 16,
    color: "#6B5E4A",
    textAlign: "center",
    marginTop: 20,
    ...Platform.select({
      ios: { fontFamily: "System" },
      android: { fontFamily: "Roboto" },
      web: { fontFamily: "'Roboto', 'Arial', sans-serif" },
    }),
  },
  loadingText: {
    fontSize: 16,
    color: "#333333",
    textAlign: "center",
    marginTop: 20,
    ...Platform.select({
      ios: { fontFamily: "System" },
      android: { fontFamily: "Roboto" },
      web: { fontFamily: "'Roboto', 'Arial', sans-serif" },
    }),
  },
  modalContainer: {
    flex: 1,
    backgroundColor: "rgba(0, 0, 0, 0.6)",
    justifyContent: "center",
    alignItems: "center",
    ...Platform.select({
      web: {
        position: "fixed",
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
      },
    }),
  },
  modalContent: {
    backgroundColor: "#FFFFFF",
    borderRadius: 15,
    padding: 24,
    marginHorizontal: 10,
    maxWidth: Platform.OS === "web" ? 450 : width - 30,
    width: "100%",
    ...Platform.select({
      ios: {
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 3 },
        shadowOpacity: 0.3,
        shadowRadius: 6,
      },
      android: { elevation: 5 },
      web: { boxShadow: "0 4px 12px rgba(0,0,0,0.3)" },
    }),
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: "700",
    color: "#333333",
    textAlign: "center",
    marginBottom: 20,
    ...Platform.select({
      ios: { fontFamily: "System" },
      android: { fontFamily: "Roboto" },
      web: { fontFamily: "'Roboto', 'Arial', sans-serif" },
    }),
  },
  modalText: {
    fontSize: 16,
    color: "#333333",
    marginBottom: 10,
    ...Platform.select({
      ios: { fontFamily: "System" },
      android: { fontFamily: "Roboto" },
      web: { fontFamily: "'Roboto', 'Arial', sans-serif" },
    }),
  },
  modalTotalDue: {
    fontSize: 18,
    fontWeight: "600",
    color: "#F28C38",
    textAlign: "center",
    marginBottom: 15,
    ...Platform.select({
      ios: { fontFamily: "System" },
      android: { fontFamily: "Roboto" },
      web: { fontFamily: "'Roboto', 'Arial', sans-serif" },
    }),
  },
  modalInput: {
    borderWidth: 1,
    borderColor: "#E0E0E0",
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
    color: "#333333",
    backgroundColor: "#F9F9F9",
    marginBottom: 15,
    ...Platform.select({
      ios: { fontFamily: "System" },
      android: { fontFamily: "Roboto" },
      web: { fontFamily: "'Roboto', 'Arial', sans-serif" },
    }),
  },
  discountContainer: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 15,
  },
  discountInput: {
    flex: 1,
    borderWidth: 1,
    borderColor: "#E0E0E0",
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
    color: "#333333",
    backgroundColor: "#F9F9F9",
    marginRight: 10,
    ...Platform.select({
      ios: { fontFamily: "System" },
      android: { fontFamily: "Roboto" },
      web: { fontFamily: "'Roboto', 'Arial', sans-serif" },
    }),
  },
  applyButton: {
    backgroundColor: "#4CAF50",
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderRadius: 8,
    ...Platform.select({
      ios: {
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.2,
        shadowRadius: 3,
      },
      android: { elevation: 2 },
      web: {
        boxShadow: "0 2px 3px rgba(0,0,0,0.2)",
        transition: "background-color 0.2s",
        ":hover": {
          backgroundColor: "#45A049",
          cursor: "pointer",
        },
      },
    }),
  },
  applyButtonText: {
    color: "#FFFFFF",
    fontSize: 16,
    fontWeight: "600",
    textAlign: "center",
    ...Platform.select({
      ios: { fontFamily: "System" },
      android: { fontFamily: "Roboto" },
      web: { fontFamily: "'Roboto', 'Arial', sans-serif" },
    }),
  },
  modalButtonContainer: {
    flexDirection: "row",
    justifyContent: "space-around",
    marginTop: 20,
  },
  modalButton: {
    backgroundColor: "#F28C38",
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderRadius: 8,
    flex: 1,
    marginHorizontal: 5,
    ...Platform.select({
      ios: {
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.2,
        shadowRadius: 3,
      },
      android: { elevation: 2 },
      web: {
        boxShadow: "0 2px 3px rgba(0,0,0,0.2)",
        transition: "background-color 0.2s",
        ":hover": {
          backgroundColor: "#E07B30",
          cursor: "pointer",
        },
      },
    }),
  },
  modalButtonText: {
    color: "#FFFFFF",
    fontSize: 16,
    fontWeight: "600",
    textAlign: "center",
    ...Platform.select({
      ios: { fontFamily: "System" },
      android: { fontFamily: "Roboto" },
      web: { fontFamily: "'Roboto', 'Arial', sans-serif" },
    }),
  },
  receiptContainer: {
    maxHeight: 350,
    marginBottom: 20,
  },
  receiptText: {
    fontSize: 12,
    color: "#333333",
    fontFamily: Platform.OS === "ios" ? "Courier" : "monospace",
    lineHeight: 20,
    textAlign: "left",
    ...Platform.select({
      web: { whiteSpace: "pre-wrap" },
    }),
  },
});

export default styles;