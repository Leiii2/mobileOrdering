import React from "react";
import { NavigationContainer } from "@react-navigation/native";
import { createStackNavigator } from "@react-navigation/stack";
import Login from "./login";
import Home from "./home";
import TraceUpScreen from "./traceUpScreen";
import CheckScreen from "./check";
import ManageCategories from "./manageCategories";
import BIRReportScreen from "./birReport";
import POSScreen from "./posScreen";
import DailyReport from "./dailyReport";
import CustomerOrderScreen from "./CustomerOrderScreen";
import AdminProductScreen from "./adminProductScreen"; // Ensure this import exists
import { StatusBar } from "expo-status-bar";

// Verify the Stack navigator is available
if (!createStackNavigator) {
  console.error("Error: createStackNavigator is not defined. Check @react-navigation/stack installation.");
}

const Stack = createStackNavigator();

export default function App() {
  return (
    <NavigationContainer>
      <Stack.Navigator initialRouteName="Login">
        <>
          <Stack.Screen name="Login" component={Login} options={{ headerShown: false }} />
          <Stack.Screen name="Home" component={Home} options={{ headerShown: false }} />
          <Stack.Screen name="TraceUp" component={TraceUpScreen} options={{ headerShown: false }} />
          <Stack.Screen name="Check" component={CheckScreen} options={{ headerShown: false }} />
          <Stack.Screen name="ManageCategories" component={ManageCategories} options={{ headerShown: false }} />
          <Stack.Screen name="BIRReport" component={BIRReportScreen} options={{ headerShown: false }} />
          <Stack.Screen name="POS" component={POSScreen} options={{ headerShown: false }} />
          <Stack.Screen name="DailyReport" component={DailyReport} options={{ headerShown: false }} />
          <Stack.Screen name="CustomerOrder" component={CustomerOrderScreen} options={{ headerShown: false }} />
          <Stack.Screen name="AdminProduct" component={AdminProductScreen} options={{ headerShown: false }} />
        </>
      </Stack.Navigator>
      <StatusBar style="auto" />
    </NavigationContainer>
  );
}