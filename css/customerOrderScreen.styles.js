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
    backgroundColor: "#FFFFFF",
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
  tableNoContainer: {
    paddingVertical: 10,
    paddingHorizontal: 20,
    backgroundColor: "#FFFFFF",
    borderBottomWidth: 1,
    borderBottomColor: "#E0E0E0",
    alignItems: "center",
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
      },
    }),
  },
  tableNoText: {
    fontSize: 16,
    fontWeight: "bold",
    color: "#3D2C29",
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
    paddingBottom: 170, // Added to ensure last product is accessible
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
  removeButton: {
    backgroundColor: "#D9534F",
    ...Platform.select({
      web: {
        ":hover": {
          backgroundColor: "#C9302C",
          cursor: "pointer",
        },
      },
    }),
  },
  cartItem: {
    paddingVertical: 5,
    paddingHorizontal: 10,
    backgroundColor: "#FFFFFF",
    borderRadius: 10,
    marginBottom: 5,
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
  cartItemName: {
    fontSize: 14,
    fontWeight: "bold",
    color: "#3D2C29",
    width: "100%",
    marginBottom: 5,
    ...Platform.select({
      ios: { fontFamily: "System" },
      android: { fontFamily: "Roboto" },
      web: { fontFamily: "'Roboto', 'Arial', sans-serif" },
    }),
  },
  cartItemPrice: {
    fontSize: 14,
    fontWeight: "bold",
    color: "#4A704A",
    ...Platform.select({
      ios: { fontFamily: "System" },
      android: { fontFamily: "Roboto" },
      web: { fontFamily: "'Roboto', 'Arial', sans-serif" },
    }),
  },
  quantityControl: {
    flexDirection: "row",
    alignItems: "center",
    marginTop: 5,
  },
  cartModalContainer: {
    backgroundColor: "#FFFFFF",
    borderRadius: 15,
    padding: 15,
    width: Platform.OS === "web" ? "80%" : "90%",
    maxHeight: "80%",
    ...Platform.select({
      ios: {
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.3,
        shadowRadius: 8,
      },
      android: {
        elevation: 5,
      },
      web: {
        boxShadow: "0 4px 8px rgba(0,0,0,0.3)",
        overflowY: "auto",
        WebkitOverflowScrolling: "touch",
      },
    }),
  },
  cartTitle: {
    fontSize: 18,
    fontWeight: "bold",
    color: "#3D2C29",
    textAlign: "center",
    marginBottom: 10,
    borderBottomWidth: 2,
    borderBottomColor: "#F28C38",
    paddingBottom: 5,
    ...Platform.select({
      ios: { fontFamily: "System" },
      android: { fontFamily: "Roboto" },
      web: { fontFamily: "'Roboto', 'Arial', sans-serif" },
    }),
  },
  cartList: {
    paddingBottom: 10,
    ...Platform.select({
      web: {
        overflowY: "auto",
      },
    }),
  },
  cartTotal: {
    paddingVertical: 10,
    borderTopWidth: 1,
    borderTopColor: "#E0E0E0",
    alignItems: "center",
  },
  cartTotalText: {
    fontSize: 16,
    fontWeight: "bold",
    color: "#4A704A",
    ...Platform.select({
      ios: { fontFamily: "System" },
      android: { fontFamily: "Roboto" },
      web: { fontFamily: "'Roboto', 'Arial', sans-serif" },
    }),
  },
  loading: {
    position: "absolute",
    top: "50%",
    left: "50%",
    transform: [{ translateX: -25 }, { translateY: -25 }],
  },
  modalContainer: {
    flex: 1,
    backgroundColor: "rgba(0, 0, 0, 0.7)",
    justifyContent: "center",
    alignItems: "center",
    ...Platform.select({
      web: {
        zIndex: 1000,
        overflowY: "auto",
      },
    }),
  },
  previewContainer: {
    backgroundColor: "#FFFFFF",
    borderRadius: 15,
    padding: 15,
    width: Platform.OS === "web" ? "60%" : "80%",
    alignItems: "center",
    ...Platform.select({
      ios: {
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.3,
        shadowRadius: 8,
      },
      android: {
        elevation: 5,
      },
      web: {
        boxShadow: "0 4px 8px rgba(0,0,0,0.3)",
      },
    }),
  },
  previewImage: {
    width: "100%",
    height: 300,
    borderRadius: 10,
    marginBottom: 15,
  },
  modalButton: {
    paddingVertical: 10,
    paddingHorizontal: 20,
    borderRadius: 8,
    marginVertical: 5,
    width: "100%",
    alignItems: "center",
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
  closeCartButton: {
    backgroundColor: "#6B5E4A",
    ...Platform.select({
      web: {
        ":hover": {
          backgroundColor: "#5A4D3B",
          cursor: "pointer",
        },
      },
    }),
  },
  clearCartButton: {
    backgroundColor: "#D9534F",
    ...Platform.select({
      web: {
        ":hover": {
          backgroundColor: "#C9302C",
          cursor: "pointer",
        },
      },
    }),
  },
  modalButtonText: {
    fontSize: 16,
    color: "#FFFFFF",
    fontWeight: "600",
    textAlign: "center",
    ...Platform.select({
      ios: { fontFamily: "System" },
      android: { fontFamily: "Roboto" },
      web: { fontFamily: "'Roboto', 'Arial', sans-serif" },
    }),
  },
  animatedImageContainer: {
    position: "absolute",
    zIndex: 1000,
    ...Platform.select({
      web: {
        pointerEvents: "none",
      },
    }),
  },
  animatedImage: {
    width: 80,
    height: 80,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#E0E0E0",
  },
  pendingOrderContainer: {
    padding: 10,
    backgroundColor: "#FFF8E7",
    borderRadius: 5,
    marginVertical: 5,
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
  pendingOrderText: {
    fontSize: 14,
    color: "#3D2C29",
    fontWeight: "500",
    marginBottom: 5,
    ...Platform.select({
      ios: { fontFamily: "System" },
      android: { fontFamily: "Roboto" },
      web: { fontFamily: "'Roboto', 'Arial', sans-serif" },
    }),
  },
  // New styles for order type picker
  orderTypeContainer: {
    marginVertical: 10,
    padding: 10,
    backgroundColor: "#FFFFFF",
    borderRadius: 5,
    borderWidth: 1,
    borderColor: "#E0E0E0",
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
      },
    }),
  },
  orderTypeLabel: {
    fontSize: 16,
    color: "#3D2C29",
    marginBottom: 5,
    ...Platform.select({
      ios: { fontFamily: "System" },
      android: { fontFamily: "Roboto" },
      web: { fontFamily: "'Roboto', 'Arial', sans-serif" },
    }),
  },
  orderTypePicker: {
    height: 40,
    width: "100%",
    ...Platform.select({
      web: {
        borderWidth: 1,
        borderColor: "#E0E0E0",
        borderRadius: 5,
        transition: "border-color 0.2s",
        ":hover": {
          borderColor: "#F28C38",
          cursor: "pointer",
        },
      },
    }),
  },
});

export default styles;