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
  categoryPicker: {
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
        cursor: "pointer",
        fontSize: 14,
        fontFamily: "'Roboto', 'Arial', sans-serif",
      },
    }),
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
    flexWrap: "wrap",
    justifyContent: "center",
    gap: 5,
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
  replaceButton: {
    backgroundColor: "#4A704A",
    ...Platform.select({
      web: {
        ":hover": {
          backgroundColor: "#3D5C3D",
          cursor: "pointer",
        },
      },
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
  disabledButton: {
    backgroundColor: "#A9A9A9",
    opacity: 0.7,
    ...Platform.select({
      web: {
        cursor: "not-allowed",
      },
    }),
  },
  loading: {
    position: "absolute",
    top: "50%",
    left: "50%",
    transform: [{ translateX: -25 }, { translateY: -25 }],
  },
  noDataText: {
    fontSize: 14,
    color: "#6B5E4A",
    textAlign: "center",
    marginVertical: 15,
    marginHorizontal: 5,
    fontStyle: "italic",
    ...Platform.select({
      ios: { fontFamily: "System" },
      android: { fontFamily: "Roboto" },
      web: { fontFamily: "'Roboto', 'Arial', sans-serif" },
    }),
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
  modalTitle: {
    fontSize: 18,
    fontWeight: "bold",
    color: "#3D2C29",
    textAlign: "center",
    marginBottom: 10,
    ...Platform.select({
      ios: { fontFamily: "System" },
      android: { fontFamily: "Roboto" },
      web: { fontFamily: "'Roboto', 'Arial', sans-serif" },
    }),
  },
  modalMessage: {
    fontSize: 14,
    color: "#3D2C29",
    textAlign: "center",
    marginBottom: 20,
    ...Platform.select({
      ios: { fontFamily: "System" },
      android: { fontFamily: "Roboto" },
      web: { fontFamily: "'Roboto', 'Arial', sans-serif" },
    }),
  },
  modalButtonContainer: {
    flexDirection: "row",
    flexWrap: "wrap",
    justifyContent: "center",
    gap: 12,
    width: "100%",
  },
  modalButton: {
    paddingVertical: 10,
    paddingHorizontal: 20,
    borderRadius: 8,
    marginVertical: 5,
    width: Platform.OS === "web" ? "45%" : "40%",
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
});

export default styles;