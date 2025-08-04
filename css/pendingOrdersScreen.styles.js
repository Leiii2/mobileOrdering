import { StyleSheet, Platform, Dimensions } from "react-native";

const { width, height } = Dimensions.get("window");

// Dynamic sizing with reduced scale for compactness
const isWeb = Platform.OS === "web";
const basePadding = isWeb ? 20 : 8;
const baseMargin = isWeb ? 15 : 8;
const maxWidth = isWeb ? width * 0.85 : "100%";
const maxHeight = isWeb ? height * 0.8 : "90%";
const sectionMaxHeight = isWeb ? height * 0.35 : height * 0.3; // Scrollable height for sections (used for runningBillsSection)
const selectedItemsHeight = isWeb ? height * 0.25 : height * 0.2; // Dedicated height for selected items (used in modal)

export default StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#F5F5F5",
    padding: basePadding,
    height: isWeb ? "100vh" : "100%", // Ensure full viewport height on web
  },
  header: {
    backgroundColor: "#2C3E50",
    padding: basePadding,
    borderRadius: 8,
    marginBottom: baseMargin,
    elevation: 4,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 4,
  },
  headerTitle: {
    color: "#FFF",
    fontSize: isWeb ? 24 : 20,
    fontWeight: "bold",
    textAlign: "center",
    marginBottom: baseMargin / 2,
  },
  refreshButton: {
    padding: basePadding / 2,
    marginLeft: baseMargin / 2,
    alignItems: "center",
    justifyContent: "center",
    flexDirection: "row",
  },
  navContainer: {
    flexDirection: "row",
    justifyContent: "space-around",
    flexWrap: "wrap",
  },
  navItem: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "rgba(255, 255, 255, 0.3)",
    padding: basePadding / 2,
    borderRadius: 6,
    margin: baseMargin / 4,
    minWidth: isWeb ? 130 : "auto",
  },
  navText: {
    color: "#FFF",
    fontSize: isWeb ? 16 : 14,
    marginLeft: 8,
    fontWeight: "500",
  },
  filterSection: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: baseMargin,
    backgroundColor: "#FFF",
    borderRadius: 8,
    padding: basePadding / 2,
    elevation: 2,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 3,
  },
  input: {
    flex: 1,
    borderWidth: 1,
    borderColor: "#DDD",
    borderRadius: 4,
    padding: basePadding / 2,
    fontSize: isWeb ? 16 : 14,
    backgroundColor: "#FFF",
    marginRight: baseMargin / 2,
  },
  filterButton: {
    backgroundColor: "#3498DB",
    paddingVertical: basePadding / 2,
    paddingHorizontal: basePadding,
    borderRadius: 4,
    alignItems: "center",
  },
  filterButtonText: {
    color: "#FFF",
    fontSize: isWeb ? 16 : 14,
    fontWeight: "600",
  },
  runningBillsSection: {
    marginBottom: baseMargin,
    maxHeight: sectionMaxHeight,
    overflowY: "auto",
  },
  sectionTitle: {
    fontSize: isWeb ? 20 : 16,
    fontWeight: "bold",
    color: "#2C3E50",
    marginBottom: baseMargin / 2,
    paddingLeft: basePadding / 2,
  },
  runningBillList: {
    paddingBottom: basePadding,
  },
  runningBillContainer: {
    backgroundColor: "#FFF",
    padding: basePadding,
    marginBottom: baseMargin / 2,
    borderRadius: 8,
    elevation: 2,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 3,
  },
  runningBillTitle: {
    fontSize: isWeb ? 18 : 16,
    fontWeight: "bold",
    color: "#2C3E50",
    marginBottom: baseMargin / 2,
  },
  pendingOrdersSection: {
    flex: 1, // Expand to fill remaining screen height
    maxHeight: isWeb ? height * 0.6 : undefined, // Constrain height on web for scrolling
    overflowY: isWeb ? "auto" : "visible", // Enable scrolling on web
    minHeight: 0, // Prevent flexbox collapse in some browsers
    ...Platform.select({
      web: {
        scrollbarWidth: "thin", // Modern scrollbar styling
        scrollbarColor: "#3498DB #F5F5F5",
        "::-webkit-scrollbar": {
          width: 8,
        },
        "::-webkit-scrollbar-track": {
          background: "#F5F5F5",
        },
        "::-webkit-scrollbar-thumb": {
          background: "#3498DB",
          borderRadius: 4,
        },
        "::-webkit-scrollbar-thumb:hover": {
          background: "#2980B9",
        },
      },
    }),
  },
  orderList: {
    paddingBottom: basePadding, // 20px web, 8px mobile
    // Removed flexGrow: 1 to prevent content from expanding parent container
  },
  orderContainer: {
    backgroundColor: "#FFF",
    padding: basePadding,
    marginBottom: baseMargin / 2,
    borderRadius: 8,
    elevation: 2,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 3,
  },
  orderTitle: {
    fontSize: isWeb ? 18 : 16,
    fontWeight: "bold",
    color: "#2C3E50",
    marginBottom: baseMargin / 2,
  },
  orderItem: {
    flexDirection: "row",
    justifyContent: "space-between",
    paddingVertical: basePadding / 4,
    borderBottomWidth: 1,
    borderBottomColor: "#EEE",
  },
  orderNotes: {
    fontSize: isWeb ? 14 : 12,
    color: "#7F8C8D",
    marginTop: baseMargin / 4,
  },
  orderButtonContainer: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginTop: baseMargin / 2,
  },
  acceptButton: {
    backgroundColor: "#2ECC71",
    padding: basePadding / 2,
    borderRadius: 4,
    flex: 1,
    marginRight: baseMargin / 4,
    alignItems: "center",
  },
  acceptButtonText: {
    color: "#FFF",
    fontSize: isWeb ? 14 : 12,
    fontWeight: "600",
  },
  editButton: {
    backgroundColor: "#3498DB",
    padding: basePadding / 2,
    borderRadius: 4,
    flex: 1,
    marginHorizontal: baseMargin / 4,
    alignItems: "center",
  },
  editButtonText: {
    color: "#FFF",
    fontSize: isWeb ? 14 : 12,
    fontWeight: "600",
  },
  removeButton: {
    backgroundColor: "#E74C3C",
    padding: basePadding / 2,
    borderRadius: 4,
    flex: 1,
    marginLeft: baseMargin / 4,
    alignItems: "center",
  },
  removeButtonText: {
    color: "#FFF",
    fontSize: isWeb ? 14 : 12,
    fontWeight: "600",
  },
  noDataText: {
    textAlign: "center",
    color: "#7F8C8D",
    fontSize: isWeb ? 16 : 14,
    padding: basePadding,
  },
  loadingText: {
    textAlign: "center",
    color: "#3498DB",
    fontSize: isWeb ? 16 : 14,
    padding: basePadding,
  },
  errorContainer: {
    alignItems: "center",
    marginTop: baseMargin,
  },
  errorText: {
    color: "#E74C3C",
    fontSize: isWeb ? 16 : 14,
    textAlign: "center",
    marginBottom: baseMargin / 2,
  },
  retryButton: {
    backgroundColor: "#3498DB",
    paddingVertical: basePadding / 2,
    paddingHorizontal: basePadding,
    borderRadius: 4,
  },
  retryButtonText: {
    color: "#FFF",
    fontSize: isWeb ? 14 : 12,
    fontWeight: "600",
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0, 0, 0, 0.5)",
    justifyContent: "center",
    padding: basePadding,
  },
  modalContent: {
    backgroundColor: "#FFF",
    borderRadius: 8,
    padding: basePadding,
    maxHeight: maxHeight,
    maxWidth: maxWidth,
    overflowY: isWeb ? "auto" : "visible",
    flex: 1, // Allow stretching
  },
  modalTitle: {
    fontSize: isWeb ? 20 : 18,
    fontWeight: "bold",
    color: "#2C3E50",
    textAlign: "center",
    marginBottom: baseMargin,
  },
  modalSubtitle: {
    fontSize: isWeb ? 16 : 14,
    fontWeight: "600",
    color: "#2C3E50",
    marginTop: baseMargin,
    marginBottom: baseMargin / 2,
  },
  searchContainer: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: baseMargin,
    backgroundColor: "#FFF",
    borderRadius: 4,
    borderWidth: 1,
    borderColor: "#DDD",
  },
  searchInput: {
    flex: 1,
    padding: basePadding / 2,
    fontSize: isWeb ? 16 : 14,
    color: "#333",
  },
  clearSearchButton: {
    padding: basePadding / 2,
  },
  categoryContainer: {
    marginBottom: baseMargin,
    height: isWeb ? 70 : 50,
  },
  categoryList: {
    paddingVertical: basePadding / 2,
  },
  categoryItem: {
    paddingVertical: basePadding / 2,
    paddingHorizontal: basePadding,
    marginHorizontal: baseMargin / 4,
    borderRadius: 4,
    borderWidth: 1,
    borderColor: "#DDD",
    backgroundColor: "#FFF",
    alignItems: "center",
  },
  categoryItemSelected: {
    backgroundColor: "#3498DB",
    borderColor: "#3498DB",
  },
  categoryText: {
    fontSize: isWeb ? 14 : 12,
    color: "#333",
  },
  categoryTextSelected: {
    color: "#FFF",
  },
  productList: {
    paddingBottom: basePadding,
    maxHeight: isWeb ? height * 0.2 : height * 0.15, // Limit product list height
    overflowY: "auto",
  },
  productCard: {
    backgroundColor: "#FFF",
    padding: basePadding,
    marginBottom: baseMargin / 2,
    borderRadius: 8,
    elevation: 1,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    flexDirection: "column",
    alignItems: "flex-start",
  },
  productName: {
    fontSize: isWeb ? 16 : 14,
    fontWeight: "600",
    color: "#2C3E50",
  },
  productPrice: {
    fontSize: isWeb ? 14 : 12,
    color: "#7F8C8D",
    marginVertical: baseMargin / 4,
  },
  quantityContainer: {
    flexDirection: "row",
    alignItems: "center",
    marginTop: baseMargin / 4,
  },
  quantityButton: {
    backgroundColor: "#3498DB",
    padding: basePadding / 4,
    borderRadius: 4,
    marginHorizontal: baseMargin / 4,
    width: isWeb ? 35 : 25,
    alignItems: "center",
  },
  quantityButtonText: {
    color: "#FFF",
    fontSize: isWeb ? 16 : 14,
    fontWeight: "bold",
  },
  quantityText: {
    fontSize: isWeb ? 16 : 14,
    width: isWeb ? 40 : 30,
    textAlign: "center",
    color: "#333",
  },
  addButton: {
    backgroundColor: "#2ECC71",
    paddingVertical: basePadding / 4,
    paddingHorizontal: basePadding / 2,
    borderRadius: 4,
    marginLeft: baseMargin / 2,
  },
  addButtonText: {
    color: "#FFF",
    fontSize: isWeb ? 14 : 12,
    fontWeight: "600",
  },
  modalButtonContainer: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginTop: baseMargin,
  },
  cancelButton: {
    backgroundColor: "#E74C3C",
    paddingVertical: basePadding / 2,
    paddingHorizontal: basePadding,
    borderRadius: 4,
    flex: 1,
    marginRight: baseMargin / 2,
    alignItems: "center",
  },
  cancelButtonText: {
    color: "#FFF",
    fontSize: isWeb ? 16 : 14,
    fontWeight: "600",
  },
  confirmButton: {
    backgroundColor: "#2ECC71",
    paddingVertical: basePadding / 2,
    paddingHorizontal: basePadding,
    borderRadius: 4,
    flex: 1,
    marginLeft: baseMargin / 2,
    alignItems: "center",
  },
  confirmButtonText: {
    color: "#FFF",
    fontSize: isWeb ? 16 : 14,
    fontWeight: "600",
  },
  receiptModalContent: {
    backgroundColor: "#FFF",
    borderRadius: 8,
    padding: basePadding,
    maxHeight: maxHeight,
    maxWidth: maxWidth,
    overflowY: isWeb ? "auto" : "visible",
    borderWidth: 2,
    borderColor: "#2C3E50",
  },
  receiptText: {
    fontSize: isWeb ? 14 : 12,
    color: "#333",
    lineHeight: 20,
    textAlign: "left",
    marginBottom: baseMargin,
  },
  orderTypeContainer: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: baseMargin,
  },
  orderTypeButton: {
    flex: 1,
    paddingVertical: basePadding / 2,
    borderWidth: 1,
    borderColor: "#DDD",
    borderRadius: 4,
    alignItems: "center",
    marginHorizontal: baseMargin / 4,
    backgroundColor: "#FFF",
  },
  orderTypeButtonSelected: {
    backgroundColor: "#3498DB",
    borderColor: "#3498DB",
  },
  orderTypeText: {
    fontSize: isWeb ? 14 : 12,
    color: "#333",
  },
});