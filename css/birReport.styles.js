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

  listContent: {
    paddingBottom: 20,
  },

  reportItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    backgroundColor: '#FFFFFF', // White for readability
    padding: 12,
    borderRadius: 8,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: '#00CED1', // Teal to match "Batchoy" text
    elevation: 2,
    shadowColor: '#000',
    shadowOpacity: 0.2,
    shadowOffset: { width: 0, height: 1 },
    shadowRadius: 2,
  },

  cell: {
    fontSize: 12,
    color: '#1A1A1A', // Dark gray for contrast on white
    fontWeight: '500',
    flex: 1,
    textAlign: 'center',
  },

  loading: {
    marginTop: 20,
  },

  emptyContainer: {
    alignItems: 'center',
    marginTop: 20,
  },

  noDataText: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#FF69B4', // Hot pink to match "Alicia's Special" text
    textAlign: 'center',
    marginBottom: 10,
  },
});