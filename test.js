import React, { useState, useEffect } from "react";
import { View, Text, StyleSheet, FlatList, ActivityIndicator } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import axios from "axios";
import { getAPIUrl } from "./config"; // Assuming config.js provides the API base URL

const TestScreen = () => {
  const insets = useSafeAreaInsets();
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    fetchUsers();
  }, []);

  const fetchUsers = async () => {
    setLoading(true);
    setError(null);
    try {
      const apiUrl = await getAPIUrl();
      const response = await axios.get(`${apiUrl}/users/all`);
      if (response.data.status !== "success") {
        throw new Error(response.data.message || "Failed to fetch users.");
      }
      setUsers(response.data.users || []);
    } catch (err) {
      setError(err.message || "An error occurred while fetching users.");
    } finally {
      setLoading(false);
    }
  };

  const renderUser = ({ item }) => (
    <View style={styles.userItem}>
      <Text style={styles.userText}>{item.Name || "Unnamed User"}</Text>
    </View>
  );

  return (
    <View
      style={[
        styles.container,
        {
          paddingTop: insets.top,
          paddingBottom: insets.bottom,
          paddingLeft: insets.left,
          paddingRight: insets.right,
        },
      ]}
    >
      <View style={styles.header}>
        <Text style={styles.headerText}>Test Screen</Text>
      </View>
      <View style={styles.content}>
        {loading ? (
          <ActivityIndicator size="large" color="#F28C38" style={styles.loading} />
        ) : error ? (
          <Text style={styles.errorText}>{error}</Text>
        ) : users.length === 0 ? (
          <Text style={styles.contentText}>No users found.</Text>
        ) : (
          <FlatList
            data={users}
            renderItem={renderUser}
            keyExtractor={(item, index) => index.toString()}
            contentContainerStyle={styles.userList}
          />
        )}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#FFF",
  },
  header: {
    backgroundColor: "#F28C38",
    padding: 15,
    alignItems: "center",
  },
  headerText: {
    fontSize: 20,
    fontWeight: "bold",
    color: "#FFF",
  },
  content: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    padding: 20,
  },
  contentText: {
    fontSize: 18,
    color: "#3D2C29",
    marginBottom: 10,
    textAlign: "center",
  },
  userList: {
    width: "100%",
  },
  userItem: {
    padding: 10,
    borderBottomWidth: 1,
    borderBottomColor: "#E0E0E0",
  },
  userText: {
    fontSize: 16,
    color: "#3D2C29",
  },
  loading: {
    marginVertical: 20,
  },
  errorText: {
    fontSize: 16,
    color: "#D32F2F",
    textAlign: "center",
  },
});

export default TestScreen;