import { StyleSheet } from 'react-native';

const styles = StyleSheet.create({
  backgroundImage: {
    flex: 1,
    width: '100%',
    height: '100%',
    backgroundColor: '#ab9f8d',
    justifyContent: 'center',
    alignItems: 'center',
  },
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
    marginTop: 150,
  },
  titleContainer: {
    backgroundColor: 'rgba(0, 206, 209, 0.2)',
    paddingHorizontal: 15,
    paddingVertical: 5,
    borderRadius: 8,
    marginBottom: 20,
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#FF69B4',
    textShadowColor: 'rgba(0, 0, 0, 0.9)',
    textShadowOffset: { width: 2, height: 2 },
    textShadowRadius: 4,
  },
  input: {
    width: 250,
    height: 50,
    borderColor: '#00CED1',
    borderWidth: 1,
    borderRadius: 10,
    paddingHorizontal: 15,
    fontSize: 16,
    backgroundColor: '#fff',
    marginBottom: 15,
    shadowColor: '#000',
    shadowOpacity: 0.3,
    shadowOffset: { width: 0, height: 4 },
    shadowRadius: 8,
    elevation: 5,
  },
  error: {
    color: 'red',
    fontSize: 14,
    marginBottom: 10,
    textShadowColor: 'rgba(0, 0, 0, 0.9)',
    textShadowOffset: { width: 2, height: 2 },
    textShadowRadius: 4,
  },
  buttonContainer: {
    width: '100%',
    borderRadius: 10,
    overflow: 'hidden',
  },
  loadingOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    justifyContent: 'center',
    alignItems: 'center',
    // Removed backgroundColor to make it fully transparent
  },
  loadingGif: {
    width: 100, // Adjust based on your GIF
    height: 100, // Adjust based on your GIF
    shadowColor: '#000',
    shadowOpacity: 0.3,
    shadowOffset: { width: 0, height: 4 },
    shadowRadius: 8,
    elevation: 5,
  },
});

export default styles;