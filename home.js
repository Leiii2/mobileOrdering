import React, { useEffect, useState } from 'react';
import { View, Text, ActivityIndicator, TouchableOpacity, Modal, Alert, Animated, Platform } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import homeStyles from './css/home.styles';

// Button animation component
const AnimatedButton = ({ children, onPress, style }) => {
  const scale = new Animated.Value(1);

  const onPressIn = () => {
    Animated.spring(scale, { toValue: 0.95, friction: 5, useNativeDriver: true }).start();
  };

  const onPressOut = () => {
    Animated.spring(scale, { toValue: 1, friction: 5, useNativeDriver: true }).start();
  };

  return (
    <Animated.View style={[style, { transform: [{ scale }] }]}>
      <TouchableOpacity
        onPressIn={onPressIn}
        onPressOut={onPressOut}
        onPress={onPress}
        activeOpacity={0.8}
      >
        {children}
      </TouchableOpacity>
    </Animated.View>
  );
};

const Home = ({ navigation }) => {
  const [userName, setUserName] = useState(null);
  const [loading, setLoading] = useState(true);
  const [modalVisible, setModalVisible] = useState(false);
  const [isAdmin, setIsAdmin] = useState(false);
  const [hasPOSRole, setHasPOSRole] = useState(false);

  useEffect(() => {
    const getUserData = async () => {
      try {
        const userData = await AsyncStorage.getItem('userData');
        console.log('Raw userData from AsyncStorage (Home):', userData); // Debug
        if (userData) {
          const parsedData = JSON.parse(userData);
          console.log('Parsed userData (Home):', parsedData); // Debug
          setUserName(parsedData.name || 'User');
          setIsAdmin(parsedData.admin === true); // Strict boolean check
          setHasPOSRole(parsedData.pos === true); // Strict boolean check
        } else {
          console.log('No userData found in AsyncStorage (Home)');
          setUserName('User');
          setIsAdmin(false);
          setHasPOSRole(false);
        }
      } catch (error) {
        console.error('❌ Error fetching user data (Home):', error);
        setUserName('User');
        setIsAdmin(false);
        setHasPOSRole(false);
      } finally {
        setLoading(false);
      }
    };

    getUserData();
  }, []);

  const handleLogout = async () => {
    if (Platform.OS === "web") {
      const confirmed = window.confirm("Are you sure you want to log out?");
      if (!confirmed) {
        return; // Exit if user cancels
      }
      // Web: Directly log out after confirming
      try {
        await AsyncStorage.removeItem('userData');
        await AsyncStorage.removeItem('token');
        navigation.replace('Login');
      } catch (error) {
        console.error('❌ Error during logout:', error);
        Alert.alert('Error', 'Failed to log out. Please try again.');
      }
      setModalVisible(false);
    } else {
      // Mobile: Show Alert.alert
      setModalVisible(false);
      Alert.alert(
        'Logout Confirmation',
        'Are you sure you want to logout?',
        [
          { text: 'Cancel', style: 'cancel' },
          {
            text: 'Logout',
            onPress: async () => {
              try {
                await AsyncStorage.removeItem('userData');
                await AsyncStorage.removeItem('token');
                navigation.replace('Login');
              } catch (error) {
                console.error('❌ Error during logout:', error);
                Alert.alert('Error', 'Failed to log out. Please try again.');
              }
            },
            style: 'destructive',
          },
        ]
      );
    }
  };

  const handleNavigateToPOS = () => {
    console.log('Navigating to POS, hasPOSRole:', hasPOSRole); // Debug before navigation
    navigation.navigate('POS');
  };

  const handleNavigateToCustomerOrder = () => {
    console.log('Navigating to CustomerOrder'); // Debug before navigation
    navigation.navigate('CustomerOrder');
  };

  const handleNavigateToAdminProduct = () => {
    console.log('Navigating to AdminProduct'); // Debug before navigation
    // Pass placeholder categoryCode and productCode; in a real app, these would be dynamic
    navigation.navigate('AdminProduct', { categoryCode: "1", productCode: "1" });
  };

  return (
    <LinearGradient
      colors={['#FF6F61', '#FF9F1C']}
      style={homeStyles.homeContainer}
    >
      {loading ? (
        <ActivityIndicator size="large" color="#FFFFFF" />
      ) : (
        <>
          {/* Profile Button */}
          <TouchableOpacity style={homeStyles.homeProfileButton} onPress={() => setModalVisible(true)}>
            <Ionicons name="person-circle-outline" size={36} color="#1A1A1A" />
          </TouchableOpacity>

          {/* Welcome Message */}
          <Text style={homeStyles.homeWelcomeText}>
            Hey, {userName || 'User'}!
          </Text>

          {/* Animated Buttons */}
          <AnimatedButton style={homeStyles.homeTraceUpButton} onPress={() => navigation.navigate('TraceUp')}>
            <Text style={homeStyles.homeTraceUpButtonText}>TraceUp</Text>
          </AnimatedButton>

          {isAdmin && (
            <AnimatedButton style={homeStyles.homeTraceUpButton} onPress={() => navigation.navigate('ManageCategories')}>
              <Text style={homeStyles.homeTraceUpButtonText}>Categories</Text>
            </AnimatedButton>
          )}

          {hasPOSRole && (
            <AnimatedButton style={homeStyles.homeTraceUpButton} onPress={handleNavigateToPOS}>
              <Text style={homeStyles.homeTraceUpButtonText}>POS</Text>
            </AnimatedButton>
          )}

          <AnimatedButton style={homeStyles.homeTraceUpButton} onPress={() => navigation.navigate('BIRReport')}>
            <Text style={homeStyles.homeTraceUpButtonText}>BIR Report</Text>
          </AnimatedButton>

          <AnimatedButton style={homeStyles.homeTraceUpButton} onPress={() => navigation.navigate('DailyReport')}>
            <Text style={homeStyles.homeTraceUpButtonText}>View Sales Report</Text>
          </AnimatedButton>

          {/* Button for CustomerOrder */}
          <AnimatedButton style={homeStyles.homeTraceUpButton} onPress={handleNavigateToCustomerOrder}>
            <Text style={homeStyles.homeTraceUpButtonText}>Place Order</Text>
          </AnimatedButton>

          {/* New Button for AdminProduct (Admin Only) */}
          {isAdmin && (
            <AnimatedButton style={homeStyles.homeTraceUpButton} onPress={handleNavigateToAdminProduct}>
              <Text style={homeStyles.homeTraceUpButtonText}>Upload Product Image</Text>
            </AnimatedButton>
          )}
        </>
      )}

      {/* Profile Modal */}
      <Modal animationType="slide" transparent={true} visible={modalVisible}>
        <View style={homeStyles.homeModalContainer}>
          <View style={homeStyles.homeModalContent}>
            <Text style={homeStyles.homeModalTitle}>Your Profile</Text>
            <Text style={homeStyles.homeModalText}>Name: {String(userName || 'User')}</Text>
            <Text style={homeStyles.homeModalText}>Role: {isAdmin ? 'Admin' : 'User'}</Text>
            <Text style={homeStyles.homeModalText}>POS Access: {hasPOSRole ? 'Yes' : 'No'}</Text>

            <AnimatedButton style={homeStyles.homeLogoutButton} onPress={handleLogout}>
              <Text style={homeStyles.homeLogoutButtonText}>Logout</Text>
            </AnimatedButton>

            <AnimatedButton style={homeStyles.homeCloseButton} onPress={() => setModalVisible(false)}>
              <Text style={homeStyles.homeCloseButtonText}>Close</Text>
            </AnimatedButton>
          </View>
        </View>
      </Modal>
    </LinearGradient>
  );
};

export default Home;