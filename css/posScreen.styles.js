import { StyleSheet, Dimensions, Platform } from "react-native";

const { width } = Dimensions.get("window");

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#FDF6E3",
    ...Platform.select({
      web: {
        overflowY: "auto",
        height: "100vh",
        WebkitOverflowScrolling: "touch",
      },
    }),
  },
  topNav: {
    flexDirection: "row",
    justifyContent: "space-between",
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: "#E0E0E0",
    width: "100%",
    paddingHorizontal: 20,
    marginTop: 10,
    borderBottomLeftRadius: 12,
    borderBottomRightRadius: 12,
    ...Platform.select({
      ios: {
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 3 },
        shadowOpacity: 0.2,
        shadowRadius: 6,
      },
      android: {
        elevation: 4,
      },
      web: {
        boxShadow: "0 3px 6px rgba(0,0,0,0.2)",
      },
    }),
  },
  navItem: {
    alignItems: "center",
    paddingVertical: 6,
    ...Platform.select({
      web: {
        transition: "opacity 0.2s",
        ":hover": {
          opacity: 0.8,
          cursor: "pointer",
        },
      },
    }),
  },
  navText: {
    fontSize: 10,
    color: "#3D2C29",
    marginTop: 3,
    fontWeight: "600",
    ...Platform.select({
      ios: { fontFamily: "System" },
      android: { fontFamily: "Roboto" },
      web: { fontFamily: "'Roboto', 'Arial', sans-serif" },
    }),
  },
  searchContainer: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#FFFFFF",
    borderRadius: 10,
    marginHorizontal: 10,
    marginVertical: 10,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderWidth: 1,
    borderColor: "#E0E0E0",
    ...Platform.select({
      ios: {
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.1,
        shadowRadius: 2,
      },
      android: {
        elevation: 1,
      },
      web: {
        boxShadow: "0 1px 2px rgba(0,0,0,0.1)",
      },
    }),
  },
  searchInput: {
    flex: 1,
    fontSize: 14,
    color: "#3D2C29",
    paddingVertical: 8,
    paddingHorizontal: 10,
    ...Platform.select({
      ios: { fontFamily: "System" },
      android: { fontFamily: "Roboto" },
      web: { fontFamily: "'Roboto', 'Arial', sans-serif" },
    }),
  },
  clearSearchButton: {
    padding: 5,
    ...Platform.select({
      web: {
        transition: "opacity 0.2s",
        ":hover": {
          opacity: 0.7,
          cursor: "pointer",
        },
      },
    }),
  },
  categoryContainer: {
    backgroundColor: "#FFFFFF",
    borderBottomWidth: 1,
    borderBottomColor: "#E0E0E0",
    paddingVertical: 10,
    marginTop: 10,
    borderRadius: 12,
    marginHorizontal: 10,
    height: 100,
    width: "100%",
    ...Platform.select({
      ios: {
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 4,
      },
      android: {
        elevation: 2,
      },
      web: {
        boxShadow: "0 2px 4px rgba(0,0,0,0.1)",
        overflowX: "auto",
        overflowY: "hidden",
        whiteSpace: "nowrap",
        display: "flex",
        flexDirection: "row",
        WebkitOverflowScrolling: "touch",
        userSelect: "none",
        cursor: "grab",
        "&:active": {
          cursor: "grabbing",
        },
        scrollbarWidth: "thin",
        scrollbarColor: "#F28C38 #E0E0E0",
        "&::-webkit-scrollbar": {
          height: 8,
        },
        "&::-webkit-scrollbar-track": {
          background: "#E0E0E0",
          borderRadius: 4,
        },
        "&::-webkit-scrollbar-thumb": {
          background: "#F28C38",
          borderRadius: 4,
        },
      },
    }),
  },
  categoryList: {
    paddingHorizontal: 10,
    flexGrow: 1,
    alignItems: "center",
    ...Platform.select({
      web: {
        overflowX: "auto",
        overflowY: "hidden",
        display: "flex",
        flexDirection: "row",
        minWidth: "100%",
      },
    }),
  },
  categoryItem: {
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#FFFFFF",
    borderWidth: 1,
    borderColor: "#E0E0E0",
    borderRadius: 10,
    paddingVertical: 8,
    paddingHorizontal: 14,
    marginRight: 10,
    ...Platform.select({
      ios: {
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.1,
        shadowRadius: 2,
      },
      android: {
        elevation: 1,
      },
      web: {
        boxShadow: "0 1px 2px rgba(0,0,0,0.1)",
        transition: "transform 0.2s",
        ":hover": {
          transform: "scale(1.05)",
          cursor: "pointer",
        },
      },
    }),
  },
  categoryItemSelected: {
    backgroundColor: "#F28C38",
    borderColor: "#F28C38",
    ...Platform.select({
      web: {
        transform: "scale(1.05)",
        ":hover": {
          transform: "scale(1.1)",
        },
      },
    }),
  },
  categoryText: {
    fontSize: 14,
    color: "#3D2C29",
    marginTop: 3,
    textAlign: "center",
    fontWeight: "500",
    ...Platform.select({
      ios: { fontFamily: "System" },
      android: { fontFamily: "Roboto" },
      web: { fontFamily: "'Roboto', 'Arial', sans-serif" },
    }),
  },
  categoryTextSelected: {
    color: "#FFFFFF",
    fontWeight: "600",
  },
  categoryCount: {
    fontSize: 12,
    color: "#6B5E4A",
    marginTop: 2,
    ...Platform.select({
      ios: { fontFamily: "System" },
      android: { fontFamily: "Roboto" },
      web: { fontFamily: "'Roboto', 'Arial', sans-serif" },
    }),
  },
  categoryCountSelected: {
    color: "#FFFFFF",
  },
  productContainer: {
    paddingVertical: 10,
    paddingHorizontal: 5,
    ...Platform.select({
      web: {
        overflowY: "auto",
        maxHeight: "70vh",
        WebkitOverflowScrolling: "touch",
      },
    }),
  },
  productCard: {
    flex: 1,
    backgroundColor: "#FFFFFF",
    borderRadius: 15,
    padding: 12,
    margin: 5,
    alignItems: "center",
    maxWidth: Platform.OS === "web" ? "45%" : (width - 40) / 2,
    ...Platform.select({
      ios: {
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 3 },
        shadowOpacity: 0.15,
        shadowRadius: 6,
      },
      android: {
        elevation: 3,
      },
      web: {
        boxShadow: "0 3px 6px rgba(0,0,0,0.15)",
        transition: "transform 0.2s",
        ":hover": {
          transform: "scale(1.02)",
        },
      },
    }),
  },
  productImage: {
    width: 80,
    height: 80,
    borderRadius: 12,
    marginBottom: 10,
    marginTop: 10,
    borderWidth: 1,
    borderColor: "#E0E0E0",
  },
  productImagePlaceholder: {
    width: 80,
    height: 80,
    backgroundColor: "#E8ECEF",
    borderRadius: 12,
    marginBottom: 10,
    marginTop: 10,
    justifyContent: "center",
    alignItems: "center",
    borderWidth: 1,
    borderColor: "#D0D5DD",
  },
  placeholderText: {
    fontSize: 12,
    color: "#6B5E4A",
    fontStyle: "italic",
    ...Platform.select({
      ios: { fontFamily: "System" },
      android: { fontFamily: "Roboto" },
      web: { fontFamily: "'Roboto', 'Arial', sans-serif" },
    }),
  },
  productName: {
    fontSize: 14,
    fontWeight: "bold",
    color: "#3D2C29",
    textAlign: "center",
    marginBottom: 5,
    ...Platform.select({
      ios: { fontFamily: "System" },
      android: { fontFamily: "Roboto" },
      web: { fontFamily: "'Roboto', 'Arial', sans-serif" },
    }),
  },
  productPrice: {
    fontSize: 12,
    fontWeight: "bold",
    color: "#4A704A",
    backgroundColor: "rgba(74, 112, 74, 0.1)",
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
    marginBottom: 5,
  },
  quantityContainer: {
    flexDirection: "row",
    alignItems: "center",
    marginTop: 5,
  },
  quantityButton: {
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 8,
    marginHorizontal: 5,
    backgroundColor: "#F28C38",
    ...Platform.select({
      ios: {
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.2,
        shadowRadius: 3,
      },
      android: {
        elevation: 2,
      },
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
  quantityButtonText: {
    color: "#FFFFFF",
    fontSize: 12,
    fontWeight: "600",
    textAlign: "center",
    ...Platform.select({
      ios: { fontFamily: "System" },
      android: { fontFamily: "Roboto" },
      web: { fontFamily: "'Roboto', 'Arial', sans-serif" },
    }),
  },
  addButton: {
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 8,
    marginHorizontal: 5,
    backgroundColor: "#F28C38",
    ...Platform.select({
      ios: {
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.2,
        shadowRadius: 3,
      },
      android: {
        elevation: 2,
      },
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
  addButtonText: {
    color: "#FFFFFF",
    fontSize: 12,
    fontWeight: "600",
    textAlign: "center",
    ...Platform.select({
      ios: { fontFamily: "System" },
      android: { fontFamily: "Roboto" },
      web: { fontFamily: "'Roboto', 'Arial', sans-serif" },
    }),
  },
  quantityText: {
    fontSize: 14,
    color: "#3D2C29",
    marginHorizontal: 5,
    ...Platform.select({
      ios: { fontFamily: "System" },
      android: { fontFamily: "Roboto" },
      web: { fontFamily: "'Roboto', 'Arial', sans-serif" },
    }),
  },
  contentContainer: {
    marginVertical: 15,
  },
  cartItem: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    backgroundColor: "#FFFFFF",
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 10,
    marginVertical: 8,
    ...Platform.select({
      ios: {
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 5,
      },
      android: {
        elevation: 2,
      },
      web: {
        boxShadow: "0 2px 5px rgba(0,0,0,0.1)",
      },
    }),
  },
  cartItemText: {
    fontSize: 14,
    fontWeight: "bold",
    color: "#3D2C29",
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
    marginVertical: 20,
    marginHorizontal: 5,
    backgroundColor: "#FFFFFF",
    borderRadius: 10,
    padding: 15,
    ...Platform.select({
      ios: {
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 5,
      },
      android: {
        elevation: 2,
      },
      web: {
        boxShadow: "0 2px 5px rgba(0,0,0,0.1)",
      },
    }),
  },
  errorText: {
    fontSize: 14,
    color: "#D9534F",
    textAlign: "center",
    marginBottom: 10,
    fontWeight: "500",
    ...Platform.select({
      ios: { fontFamily: "System" },
      android: { fontFamily: "Roboto" },
      web: { fontFamily: "'Roboto', 'Arial', sans-serif" },
    }),
  },
  retryButton: {
    paddingVertical: 8,
    paddingHorizontal: 15,
    borderRadius: 8,
    backgroundColor: "#F28C38",
    ...Platform.select({
      ios: {
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.2,
        shadowRadius: 3,
      },
      android: {
        elevation: 2,
      },
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
    fontSize: 14,
    color: "#FFFFFF",
    fontWeight: "600",
    textAlign: "center",
    ...Platform.select({
      ios: { fontFamily: "System" },
      android: { fontFamily: "Roboto" },
      web: { fontFamily: "'Roboto', 'Arial', sans-serif" },
    }),
  },
  cartList: {
    paddingHorizontal: 0,
    paddingBottom: 20,
  },
  cartHeader: {
    fontSize: 16,
    fontWeight: "bold",
    color: "#3D2C29",
    textAlign: "center",
    paddingVertical: 8,
  },
  noDataText: {
    fontSize: 14,
    color: "#6B5E4A",
    textAlign: "center",
    marginVertical: 15,
    fontStyle: "italic",
    ...Platform.select({
      ios: { fontFamily: "System" },
      android: { fontFamily: "Roboto" },
      web: { fontFamily: "'Roboto', 'Arial', sans-serif" },
    }),
  },
  checkoutButton: {
    backgroundColor: "#F28C38",
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderRadius: 20,
    marginVertical: 10,
    alignItems: "center",
    ...Platform.select({
      ios: {
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.2,
        shadowRadius: 3,
      },
      android: {
        elevation: 2,
      },
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
    fontWeight: "bold",
    ...Platform.select({
      ios: { fontFamily: "System" },
      android: { fontFamily: "Roboto" },
      web: { fontFamily: "'Roboto', 'Arial', sans-serif" },
    }),
  },
  clearCartButton: {
    backgroundColor: "#D9534F",
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderRadius: 20,
    marginVertical: 10,
    alignItems: "center",
    ...Platform.select({
      ios: {
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.2,
        shadowRadius: 3,
      },
      android: {
        elevation: 2,
      },
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
  clearCartButtonText: {
    color: "#FFFFFF",
    fontSize: 16,
    fontWeight: "bold",
    ...Platform.select({
      ios: { fontFamily: "System" },
      android: { fontFamily: "Roboto" },
      web: { fontFamily: "'Roboto', 'Arial', sans-serif" },
    }),
  },
  backButton: {
    backgroundColor: "#F28C38",
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderRadius: 20,
    marginVertical: 10,
    flexDirection: "row",
    alignItems: "center",
    alignSelf: "flex-start",
    ...Platform.select({
      ios: {
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.2,
        shadowRadius: 3,
      },
      android: {
        elevation: 2,
      },
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
  backButtonText: {
    color: "#FFFFFF",
    fontSize: 16,
    fontWeight: "bold",
    marginLeft: 5,
    ...Platform.select({
      ios: { fontFamily: "System" },
      android: { fontFamily: "Roboto" },
      web: { fontFamily: "'Roboto', 'Arial', sans-serif" },
    }),
  },
  optionContainer: {
    flexDirection: "row",
    justifyContent: "space-around",
    marginVertical: 10,
  },
  optionButton: {
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 20,
    borderWidth: 2,
    borderColor: "#F28C38",
    marginHorizontal: 5,
  },
  selectedOption: {
    backgroundColor: "#F28C38",
  },
  optionText: {
    fontSize: 14,
    color: "#3D2C29",
    ...Platform.select({
      ios: { fontFamily: "System" },
      android: { fontFamily: "Roboto" },
      web: { fontFamily: "'Roboto', 'Arial', sans-serif" },
    }),
  },
  selectedOptionText: {
    fontSize: 14,
    color: "#FFFFFF",
    fontWeight: "bold",
    ...Platform.select({
      ios: { fontFamily: "System" },
      android: { fontFamily: "Roboto" },
      web: { fontFamily: "'Roboto', 'Arial', sans-serif" },
    }),
  },
  confirmButton: {
    backgroundColor: "#F28C38",
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderRadius: 20,
    marginHorizontal: 10,
    marginVertical: 10,
    ...Platform.select({
      ios: {
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.2,
        shadowRadius: 3,
      },
      android: {
        elevation: 2,
      },
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
  confirmButtonText: {
    color: "#FFFFFF",
    fontSize: 16,
    fontWeight: "bold",
    ...Platform.select({
      ios: { fontFamily: "System" },
      android: { fontFamily: "Roboto" },
      web: { fontFamily: "'Roboto', 'Arial', sans-serif" },
    }),
  },
  cancelButton: {
    backgroundColor: "#D9534F",
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderRadius: 20,
    marginHorizontal: 10,
    marginVertical: 10,
    ...Platform.select({
      ios: {
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.2,
        shadowRadius: 3,
      },
      android: {
        elevation: 2,
      },
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
    fontWeight: "bold",
    ...Platform.select({
      ios: { fontFamily: "System" },
      android: { fontFamily: "Roboto" },
      web: { fontFamily: "'Roboto', 'Arial', sans-serif" },
    }),
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: "transparent",
    justifyContent: "center",
    alignItems: "center",
    marginTop: 100,
    zIndex: 1000,
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
  confirmModalOverlay: {
    zIndex: 2000,
    backgroundColor: "rgba(0, 0, 0, 0.6)",
  },
  modalContent: {
    backgroundColor: "#FFFFFF",
    borderRadius: 15,
    padding: 24,
    marginHorizontal: 10,
    maxWidth: Platform.OS === "web" ? 600 : width - 20,
    width: "100%",
    ...Platform.select({
      ios: {
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 3 },
        shadowOpacity: 0.3,
        shadowRadius: 6,
      },
      android: {
        elevation: 5,
      },
      web: {
        boxShadow: "0 4px 8px rgba(0,0,0,0.3)",
      },
    }),
  },
  confirmModalContent: {
    backgroundColor: "#FFFFFF",
    borderRadius: 15,
    padding: 20,
    marginHorizontal: 20,
    maxWidth: Platform.OS === "web" ? 400 : width - 60,
    width: "100%",
    zIndex: 2100,
    ...Platform.select({
      ios: {
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.4,
        shadowRadius: 8,
      },
      android: {
        elevation: 6,
      },
      web: {
        boxShadow: "0 6px 12px rgba(0,0,0,0.4)",
      },
    }),
  },
  receiptModalContent: {
    backgroundColor: "#FFFFFF",
    borderRadius: 15,
    padding: 20,
    marginHorizontal: 20,
    maxWidth: Platform.OS === "web" ? 500 : width - 40,
    width: "100%",
    ...Platform.select({
      ios: {
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 3 },
        shadowOpacity: 0.3,
        shadowRadius: 6,
      },
      android: {
        elevation: 5,
      },
      web: {
        boxShadow: "0 4px 8px rgba(0,0,0,0.3)",
      },
    }),
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: "bold",
    color: "#3D2C29",
    textAlign: "center",
    marginBottom: 15,
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
  input: {
    backgroundColor: "#F9F9F9",
    borderRadius: 10,
    paddingVertical: 10,
    paddingHorizontal: 15,
    marginVertical: 8,
    borderWidth: 1,
    borderColor: "#E0E0E0",
    fontSize: 14,
    color: "#3D2C29",
    ...Platform.select({
      ios: { fontFamily: "System" },
      android: { fontFamily: "Roboto" },
      web: { fontFamily: "'Roboto', 'Arial', sans-serif" },
    }),
  },
  applyButton: {
    backgroundColor: "#F28C38",
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderRadius: 20,
    marginVertical: 10,
    alignItems: "center",
    ...Platform.select({
      ios: {
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.2,
        shadowRadius: 3,
      },
      android: {
        elevation: 2,
      },
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
  applyButtonText: {
    color: "#FFFFFF",
    fontSize: 16,
    fontWeight: "bold",
    ...Platform.select({
      ios: { fontFamily: "System" },
      android: { fontFamily: "Roboto" },
      web: { fontFamily: "'Roboto', 'Arial', sans-serif" },
    }),
  },
  summaryText: {
    fontSize: 14,
    color: "#3D2C29",
    marginVertical: 5,
    textAlign: "center",
    ...Platform.select({
      ios: { fontFamily: "System" },
      android: { fontFamily: "Roboto" },
      web: { fontFamily: "'Roboto', 'Arial', sans-serif" },
    }),
  },
  webAlertOverlay: {
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
  webAlertContainer: {
    backgroundColor: "#FFFFFF",
    borderRadius: 15,
    padding: 20,
    maxWidth: 400,
    width: "90%",
    ...Platform.select({
      web: {
        boxShadow: "0 6px 12px rgba(0,0,0,0.3)",
      },
    }),
  },
  webAlertTitle: {
    fontSize: 18,
    fontWeight: "bold",
    color: "#3D2C29",
    textAlign: "center",
    marginBottom: 10,
    ...Platform.select({
      web: { fontFamily: "'Roboto', 'Arial', sans-serif" },
    }),
  },
  webAlertMessage: {
    fontSize: 14,
    color: "#3D2C29",
    textAlign: "center",
    marginBottom: 20,
    ...Platform.select({
      web: { fontFamily: "'Roboto', 'Arial', sans-serif" },
    }),
  },
  webAlertButtonContainer: {
    flexDirection: "row",
    justifyContent: "space-around",
  },
  webAlertButton: {
    backgroundColor: "#F28C38",
    paddingVertical: 10,
    paddingHorizontal: 20,
    borderRadius: 10,
    minWidth: 100,
    alignItems: "center",
    ...Platform.select({
      web: {
        transition: "background-color 0.2s",
        ":hover": {
          backgroundColor: "#E07B30",
          cursor: "pointer",
        },
      },
    }),
  },
  webAlertCancelButton: {
    backgroundColor: "#D9534F",
    ...Platform.select({
      web: {
        ":hover": {
          backgroundColor: "#C9302C",
        },
      },
    }),
  },
  webAlertDestructiveButton: {
    backgroundColor: "#D9534F",
    ...Platform.select({
      web: {
        ":hover": {
          backgroundColor: "#C9302C",
        },
      },
    }),
  },
  webAlertButtonText: {
    color: "#FFFFFF",
    fontSize: 14,
    fontWeight: "600",
    ...Platform.select({
      web: { fontFamily: "'Roboto', 'Arial', sans-serif" },
    }),
  },
  receiptText: {
    fontSize: 12,
    color: "#3D2C29",
    fontFamily: Platform.OS === "ios" ? "Courier" : "monospace",
    marginBottom: 20,
    lineHeight: 20,
    textAlign: "left",
    ...Platform.select({
      web: { whiteSpace: "pre-wrap" },
    }),
  },
  loading: {
    marginVertical: 20,
  },
});

export default styles;