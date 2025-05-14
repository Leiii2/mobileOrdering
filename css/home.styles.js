import { StyleSheet } from 'react-native';

const homeStyles = StyleSheet.create({
  homeContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(0, 206, 209, 0.2)', // Light teal tint to match logo's teal
    padding: 20,
  },
  homeProfileButton: {
    position: 'absolute',
    top: 50,
    right: 20,
    backgroundColor: '#00CED1', // Teal to match "Batchoy" text
    borderRadius: 50,
    padding: 5,
    elevation: 5,
  },
  homeWelcomeText: {
    fontSize: 32,
    fontWeight: '900',
    color: '#FF69B4', // Hot pink to match "Alicia's Special" text
    textShadowColor: '#000',
    textShadowOffset: { width: 2, height: 2 },
    textShadowRadius: 5,
    marginBottom: 40,
  },
  homeTraceUpButton: {
    backgroundColor: '#00CED1', // Teal to match "Batchoy" text
    paddingVertical: 15,
    paddingHorizontal: 35,
    borderRadius: 15,
    elevation: 8,
    shadowColor: '#000',
    shadowOpacity: 0.3,
    shadowOffset: { width: 0, height: 4 },
    shadowRadius: 8,
    marginVertical: 15,
    borderWidth: 2,
    borderColor: '#FFFFFF', // White border for pop
  },
  homeTraceUpButtonText: {
    fontSize: 20,
    color: '#FFFFFF', // White for contrast on teal
    fontWeight: 'bold',
    textAlign: 'center',
  },
  homeModalContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(0, 0, 0, 0.7)', // Keep darker overlay for contrast
  },
  homeModalContent: {
    width: '85%',
    backgroundColor: '#FFF', // White for readability
    padding: 25,
    borderRadius: 15,
    alignItems: 'center',
    borderWidth: 3,
    borderColor: '#00CED1', // Teal border to match "Batchoy" text
  },
  homeModalTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#FF69B4', // Hot pink to match "Alicia's Special" text
    marginBottom: 15,
  },
  homeModalText: {
    fontSize: 18,
    color: '#333', // Dark gray for readability on white
    marginBottom: 20,
  },
  homeLogoutButton: {
    backgroundColor: '#FF69B4', // Hot pink to match "Alicia's Special" text, replacing fiery orange-red
    paddingVertical: 12,
    paddingHorizontal: 25,
    borderRadius: 12,
    marginBottom: 15,
  },
  homeLogoutButtonText: {
    fontSize: 18,
    color: '#FFF',
    fontWeight: 'bold',
  },
  homeCloseButton: {
    backgroundColor: '#00CED1', // Teal to match "Batchoy" text
    paddingVertical: 12,
    paddingHorizontal: 25,
    borderRadius: 12,
  },
  homeCloseButtonText: {
    fontSize: 18,
    color: '#FFFFFF', // White for contrast on teal
    fontWeight: 'bold',
  },
});

export default homeStyles;