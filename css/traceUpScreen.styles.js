import { StyleSheet } from 'react-native';

export default StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: 'rgba(0, 206, 209, 0.2)', // Light teal tint to match logo's teal
    paddingHorizontal: 10,
    paddingTop: 40,
    paddingBottom: 20,
  },

  headerContainer: {
    backgroundColor: '#00CED1', // Teal to match "Batchoy" text
    borderRadius: 8,
    marginBottom: 12,
    elevation: 5,
    shadowColor: '#000',
    shadowOpacity: 0.3,
    shadowOffset: { width: 0, height: 2 },
    shadowRadius: 5,
    paddingVertical: 8,
  },

  backButtonContainer: {
    alignItems: 'center',
    paddingHorizontal: 10,
  },

  backButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 6,
    paddingHorizontal: 10,
    borderRadius: 20,
    backgroundColor: '#00CED1', // Teal to match "Batchoy" text
  },

  backButtonText: {
    color: '#FFFFFF', // White for contrast on teal
    fontSize: 14,
    fontWeight: 'bold',
    marginLeft: 6,
  },

  titleContainer: {
    alignItems: 'center',
    paddingHorizontal: 10,
  },

  title: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#FF69B4', // Hot pink to match "Alicia's Special" text
    textAlign: 'center',
    paddingVertical: 4,
  },

  categoryItem: {
    backgroundColor: '#00CED1', // Teal to match "Batchoy" text, replacing gold
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 10,
    marginBottom: 10,
    elevation: 3,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
  },

  categoryText: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#FF69B4', // Hot pink to match "Alicia's Special" text
    textAlign: 'center',
  },

  productItem: {
    backgroundColor: '#FFFFFF', // White for readability
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 10,
    marginVertical: 8,
    elevation: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.3,
    shadowRadius: 5,
    borderWidth: 2,
    borderColor: '#00CED1', // Teal to match "Batchoy" text
  },

  itemText: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#FF69B4', // Hot pink to match "Alicia's Special" text
  },

  stockText: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#FF69B4', // Hot pink to match "Alicia's Special" text
    marginTop: 4,
  },

  historyItem: {
    backgroundColor: '#FFFFFF', // White for readability
    padding: 12,
    borderRadius: 10,
    marginVertical: 8,
    borderWidth: 2,
    borderColor: '#00CED1', // Teal to match "Batchoy" text
    elevation: 3,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
  },

  transactionType: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#FF69B4', // Hot pink to match "Alicia's Special" text
    marginBottom: 8,
    textAlign: 'center',
    backgroundColor: '#00CED1', // Teal to match "Batchoy" text
    paddingVertical: 4,
    borderRadius: 5,
  },

  historyDetails: {
    paddingHorizontal: 5,
  },

  detailRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 6,
  },

  detailsText: {
    fontSize: 12,
    color: '#1A1A1A', // Dark gray for readability
    fontWeight: '500',
    marginLeft: 6,
  },

  noDataText: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#FF69B4', // Hot pink to match "Alicia's Special" text
    textAlign: 'center',
    marginTop: 20,
  },

  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)', // Keep darker overlay for contrast
    justifyContent: 'center',
    alignItems: 'center',
  },

  modalContainer: {
    width: '80%',
    backgroundColor: 'rgba(0, 206, 209, 0.2)', // Light teal tint to match logo's teal
    borderRadius: 10,
    padding: 16,
    alignItems: 'center',
    elevation: 5,
  },

  modalTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#FF69B4', // Hot pink to match "Alicia's Special" text
    marginBottom: 8,
  },

  profileText: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#FFFFFF', // White for contrast on teal background
    marginBottom: 12,
  },

  closeButton: {
    backgroundColor: '#00CED1', // Teal to match "Batchoy" text
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 20,
    marginBottom: 8,
  },

  closeButtonText: {
    color: '#FFFFFF', // White for contrast on teal
    fontSize: 14,
    fontWeight: 'bold',
  },

  logoutButton: {
    backgroundColor: '#FF69B4', // Hot pink to match "Alicia's Special" text
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: 20,
  },

  logoutButtonText: {
    color: '#FFFFFF', // White for contrast on pink
    fontSize: 14,
    fontWeight: 'bold',
  },

  animatedFadeIn: {
    opacity: 0, // animate to 1 for fade-in effect
  },

  // New style for the history note
  historyNote: {
    fontSize: 12,
    color: '#757575', // Neutral gray for notes
    textAlign: 'center',
    paddingVertical: 5,
    backgroundColor: 'rgba(0, 206, 209, 0.1)', // Light teal tint for consistency
    marginBottom: 8,
    borderRadius: 5,
  },
});