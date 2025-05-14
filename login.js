import React, { useState } from "react";
import {
  View,
  Text,
  TextInput,
  Button,
  Image,
  ImageBackground,
  Alert,
} from "react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { getAPIUrl } from "./config";
import styles from "./css/login.styles";

const Login = ({ navigation }) => {
  const [userCode, setUserCode] = useState("");
  const [accessCode, setAccessCode] = useState("");
  const [loading, setLoading] = useState(false);

  const delay = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

  const showErrorPopup = (message) => {
    Alert.alert("Error", message, [{ text: "OK" }], { cancelable: false });
  };

  const handleLogin = async () => {
    setLoading(true);

    // Input validation
    if (!userCode.trim() || !accessCode.trim()) {
      showErrorPopup("UserCode and AccessCode are required.");
      setLoading(false);
      return;
    }

    try {
      const apiUrl = await getAPIUrl();
      const payload = { userCode: parseInt(userCode, 10), accessCode };

      const response = await fetch(`${apiUrl}/login`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const responseText = await response.text();
      let data;
      try {
        data = JSON.parse(responseText);
      } catch (parseError) {
        throw new Error("Invalid response from server. Please try again later.");
      }

      if (!response.ok) {
        if (response.status === 401) {
          throw new Error("Invalid credentials");
        } else if (response.status === 400) {
          throw new Error(data.message || "Bad request. Please ensure all fields are filled correctly.");
        } else if (response.status === 500) {
          throw new Error(data.message || "Server error. Please try again later.");
        } else {
          throw new Error(data.message || "An unexpected error occurred.");
        }
      }

      if (data.status === "success" && data.user && data.token) {
        await AsyncStorage.setItem("userData", JSON.stringify(data.user));
        await AsyncStorage.setItem("token", data.token);
        await delay(2000); // 2-second delay
        navigation.replace("Home");
      } else {
        throw new Error("Login failed. Please check your credentials.");
      }
    } catch (err) {
      const errorMessage = err.message.includes("Invalid credentials")
        ? "Invalid credentials"
        : err.message || "Something went wrong. Please try again.";
      showErrorPopup(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  return (
    <ImageBackground
      source={require("./assets/alicias.png")}
      style={styles.backgroundImage}
      resizeMode="contain"
      imageStyle={{ transform: [{ scale: 0.9 }, { translateY: -200 }] }}
    >
      <View style={styles.container}>
        <View style={styles.titleContainer}>
          <Text style={styles.title}>Login</Text>
        </View>

        <TextInput
          style={styles.input}
          placeholder="UserCode"
          keyboardType="numeric"
          value={userCode}
          onChangeText={setUserCode}
          editable={!loading}
          autoCapitalize="none"
        />

        <TextInput
          style={styles.input}
          placeholder="AccessCode"
          secureTextEntry
          value={accessCode}
          onChangeText={setAccessCode}
          editable={!loading}
          autoCapitalize="none"
        />

        <View style={styles.buttonContainer}>
          <Button
            title={loading ? "Logging in..." : "Login"}
            onPress={handleLogin}
            disabled={loading}
            color="#00CED1"
          />
        </View>

        {loading && (
          <View style={styles.loadingOverlay}>
            <Image
              source={require("./assets/batchoy.gif")}
              style={styles.loadingGif}
            />
          </View>
        )}
      </View>
    </ImageBackground>
  );
};

export default Login;