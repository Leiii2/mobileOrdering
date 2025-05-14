import React, { useEffect, useState } from "react";
import { View, Text, FlatList, ActivityIndicator } from "react-native";
import axios from "axios";
import { getAPIUrl } from "./config"; // Ensure this imports the function correctly
import styles from "./css/login.styles";

const Login = () => {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchUsers = async () => {
      try {
        const url = await getAPIUrl(); // Fetch dynamic API URL
        console.log("API URL:", url); // Log the URL being used
        const response = await axios.get(`${url}/users/all`); // Request the API endpoint to fetch users
        console.log("API Response:", response); // Log the full API response to verify structure

        if (response.data.status === "success" && Array.isArray(response.data.users)) {
          setUsers(response.data.users); // Set the users state if the response is successful
        } else {
          console.log("No users found or error in response structure");
        }
      } catch (error) {
        console.error("Error:", error.message); // Handle errors in API call
      } finally {
        setLoading(false); // Set loading to false when the request finishes
      }
    };

    fetchUsers(); // Call the fetch function to load users
  }, []); // Empty dependency array to call this effect once when the component mounts

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Alicia’s</Text>
      <Text style={styles.subtitle}>User List</Text>

      {loading ? (
        <ActivityIndicator size="large" color="#0000ff" /> // Show loading spinner while fetching data
      ) : (
        <FlatList
          data={users}
          keyExtractor={(item, index) => index.toString()} // Use index as the key for each item in the list
          renderItem={({ item }) => (
            <View style={styles.userItem}>
              <Text style={styles.userName}>{item.Name}</Text> {/* Assuming the user object has a "Name" property */}
            </View>
          )}
        />
      )}
    </View>
  );
};

export default Login;
