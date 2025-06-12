import React, { useState, useEffect, createContext, useContext } from 'react';
import { View, Text, StyleSheet, ActivityIndicator, Image, TouchableOpacity, Platform, Alert } from 'react-native';
import * as WebBrowser from 'expo-web-browser';
import * as Google from 'expo-auth-session/providers/google';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { AntDesign, Feather } from '@expo/vector-icons'; // Ensure you have these icons installed
import { SafeAreaView, SafeAreaProvider } from 'react-native-safe-area-context'; // Import SafeAreaProvider

// Polyfill for TextEncoder/Decoder for some environments (e.g., React Native without full web APIs)
// Uncomment the line below if you encounter issues with URLSearchParams or fetch requests on certain platforms
// import 'react-native-url-polyfill/auto';

// Required for Expo WebBrowser to work correctly for auth sessions
WebBrowser.maybeCompleteAuthSession();

// --- AuthContext: Provides authentication state and functions to all components ---
const AuthContext = createContext(null);

// --- Custom Alert Component (replaces native alert for better UX and consistency) ---
function CustomAlert({ message, isVisible, onClose }) {
  if (!isVisible) return null;

  return (
    <View style={customAlertStyles.overlay}>
      <View style={customAlertStyles.alertBox}>
        <Text style={customAlertStyles.messageText}>{message}</Text>
        <TouchableOpacity style={customAlertStyles.okButton} onPress={onClose}>
          <Text style={customAlertStyles.okButtonText}>OK</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const customAlertStyles = StyleSheet.create({
  overlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 1000,
  },
  alertBox: {
    backgroundColor: '#fff',
    borderRadius: 15,
    padding: 25,
    width: '80%',
    maxWidth: 350,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 6,
    elevation: 8,
  },
  messageText: {
    fontSize: 18,
    textAlign: 'center',
    marginBottom: 20,
    color: '#333',
    fontWeight: '500',
  },
  okButton: {
    backgroundColor: '#007AFF',
    paddingVertical: 12,
    paddingHorizontal: 30,
    borderRadius: 25,
    minWidth: 100,
  },
  okButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
    textAlign: 'center',
  },
});


// --- Login Screen Component ---
function LoginScreen() {
  const { signInWithGoogle, isLoadingAuth, showCustomAlert } = useContext(AuthContext);

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.card}>
        <Image
          source={{ uri: 'https://placehold.co/150x150/000000/FFFFFF?text=ESP32' }} // Placeholder image for your app logo
          style={styles.logo}
        />
        <Text style={styles.title}>Connect with ESP32</Text>
        <Text style={styles.subtitle}>Unlock the power of your IoT devices.</Text>

        <TouchableOpacity
          style={styles.googleButton}
          onPress={signInWithGoogle}
          disabled={isLoadingAuth} // Disable button while auth is in progress
        >
          {isLoadingAuth ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <>
              <AntDesign name="google" size={24} color="white" style={styles.googleIcon} />
              <Text style={styles.googleButtonText}>Sign in with Google</Text>
            </>
          )}
        </TouchableOpacity>
        <Text style={styles.footerText}>Only authorized users can control devices.</Text>
      </View>
    </SafeAreaView>
  );
}

// --- Dashboard Screen Component ---
function DashboardScreen() {
  const { signOut, user, showCustomAlert } = useContext(AuthContext);
  const [bluetoothStatus, setBluetoothStatus] = useState('Scanning for devices...');
  const [connectedDevice, setConnectedDevice] = useState(null); // Stores information about the connected device

  // This useEffect simulates Bluetooth scanning and connection.
  // In a real application, you would integrate a BLE library like 'react-native-ble-plx'.
  useEffect(() => {
    // Simulate initial scan, setting a timeout to indicate no devices found
    const scanTimer = setTimeout(() => {
      setBluetoothStatus('No ESP32 devices found nearby. Try again later.');
    }, 5000);

    /*
    // Example conceptual BLE integration (requires react-native-ble-plx)
    // IMPORTANT: If you uncomment this, ensure 'react-native-ble-plx' is installed
    // and its import is at the TOP LEVEL of the file (outside of any functions/components).
    // import { BleManager } from 'react-native-ble-plx'; // <--- THIS BELONGS AT THE VERY TOP OF THE FILE

    // const bleManager = new BleManager();

    // const subscription = bleManager.onStateChange((state) => {
    //   if (state === 'PoweredOn') {
    //     console.log('Bluetooth is powered on. Starting scan...');
    //     setBluetoothStatus('Bluetooth is ON. Scanning...');
    //     bleManager.startDeviceScan(null, { allowDuplicates: false }, (error, device) => {
    //       if (error) {
    //         console.error("Bluetooth scan error:", error);
    //         setBluetoothStatus(`Scan Error: ${error.message}`);
    //         return;
    //       }
    //       // Filter for your ESP32 devices (e.g., by name prefix or advertised service UUID)
    //       if (device.name && device.name.includes('ESP32')) {
    //         console.log('Found ESP32 device:', device.name, device.id);
    //         // In a real app, you'd add this device to a list state variable
    //         // For now, we'll just use dummyDevices
    //         setBluetoothStatus(`Found ${device.name} (${device.id})`);
    //         // You might stop scanning here if you only want to connect to one
    //         // bleManager.stopDeviceScan();
    //       }
    //     });
    //   } else {
    //     setBluetoothStatus(`Bluetooth is ${state}. Please turn it ON.`);
    //   }
    // }, true); // The 'true' makes it run immediately on component mount

    // return () => {
    //   clearTimeout(scanTimer); // Clear simulated timer
    //   // subscription.remove(); // Unsubscribe from BLE state changes
    //   // bleManager.destroy(); // Clean up BLE manager
    // };
    */
    return () => clearTimeout(scanTimer); // Cleanup for the simulated timer
  }, []);

  const handleConnectDevice = async (deviceId) => {
    // In a real BLE scenario, this would involve:
    // 1. Stopping the scan if it's active.
    // 2. Calling `bleManager.connectToDevice(deviceId)`.
    // 3. Discovering services and characteristics (`device.discoverAllServicesAndCharacteristics()`).
    // 4. Storing the connected device object and its relevant characteristics.

    setBluetoothStatus(`Connecting to ${deviceId}...`);
    try {
      // Simulate connection time
      await new Promise(resolve => setTimeout(resolve, 1500));
      setConnectedDevice({ id: deviceId, name: `ESP32-Device-${deviceId.substring(0,4)}` });
      setBluetoothStatus(`Connected to ESP32: ${deviceId}`);
      console.log(`Successfully simulated connection to device: ${deviceId}`);
    } catch (error) {
      console.error('Connection error:', error);
      showCustomAlert(`Failed to connect: ${error.message}`);
      setBluetoothStatus(`Connection failed: ${error.message}`);
    }
  };

  const handleTriggerGpio = async () => {
    if (!connectedDevice) {
      showCustomAlert('Please connect to an ESP32 device first!');
      return;
    }

    console.log(`Attempting to trigger GPIO 27 on ${connectedDevice.name}...`);
    setBluetoothStatus(`Triggering GPIO 27 on ${connectedDevice.name}...`);

    try {
      // Option 1: Direct BLE communication from app to ESP32 (recommended for BLE-only)
      // This is where you would write to the specific BLE characteristic on the ESP32.
      // You'd need to know the Service UUID and Characteristic UUID exposed by your ESP32.
      /*
      // Assuming 'connectedDevice' is a BleDevice object from react-native-ble-plx
      await connectedDevice.writeCharacteristicWithResponseForService(
        'YOUR_ESP32_SERVICE_UUID',       // Replace with your ESP32's Service UUID
        'YOUR_ESP32_CHARACTERISTIC_UUID', // Replace with your ESP32's Characteristic UUID for GPIO control
        'AQ=='                           // Base64 encoded value, e.g., '1' for ON. Convert your value to Base64.
      );
      */

      // Option 2: Backend-mediated communication (if ESP32 connects to Wi-Fi/MQTT)
      // If your backend handles the actual command to the ESP32 (e.g., via Wi-Fi or MQTT),
      // then you would make a fetch call to your Node.js backend here.
      /*
      const backendUrl = 'YOUR_HEROKU_BACKEND_URL'; // Ensure this matches your deployed backend URL
      const response = await fetch(`${backendUrl}/api/trigger-gpio`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${user.idToken}`, // Send ID token for backend verification
        },
        body: JSON.stringify({ deviceId: connectedDevice.id, gpioPin: 27 }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Failed to trigger GPIO via backend');
      }

      const data = await response.json();
      console.log('GPIO trigger response from backend:', data);
      */

      // Simulating success
      await new Promise(resolve => setTimeout(resolve, 1000));
      setBluetoothStatus(`Successfully triggered GPIO 27 on ${connectedDevice.name}!`);
    } catch (error) {
      console.error('Error triggering GPIO:', error);
      showCustomAlert(`Error triggering GPIO: ${error.message}`);
      setBluetoothStatus(`Error triggering GPIO: ${error.message}`);
    }
  };

  const dummyDevices = [ // Simulate discovered devices for display
    { id: 'ABCD12345678', name: 'MyESP32-A' },
    { id: 'EFGH98765432', name: 'AnotherESP32' },
  ];

  return (
    <SafeAreaView style={styles.container}>
      {/* Header Section */}
      <View style={styles.header}>
        {user && user.photoUrl && (
          <Image source={{ uri: user.photoUrl }} style={styles.profilePic} />
        )}
        <Text style={styles.welcomeText} numberOfLines={1} ellipsizeMode="tail">
          Welcome, {user ? user.givenName || user.email : 'Guest'}!
        </Text>
        <TouchableOpacity onPress={signOut} style={styles.signOutButton}>
          <Feather name="log-out" size={24} color="gray" />
          <Text style={styles.signOutButtonText}>Sign Out</Text>
        </TouchableOpacity>
      </View>

      {/* Dashboard Content Card */}
      <View style={styles.dashboardCard}>
        <Text style={styles.dashboardTitle}>Bluetooth Devices</Text>
        <Text style={styles.bluetoothStatusText}>{bluetoothStatus}</Text>

        <Text style={styles.subHeading}>Available ESP32 Devices:</Text>
        {dummyDevices.length > 0 ? (
          dummyDevices.map((device) => (
            <TouchableOpacity
              key={device.id}
              style={[styles.deviceItem, connectedDevice?.id === device.id && styles.connectedDeviceItem]}
              onPress={() => handleConnectDevice(device.id)}
              disabled={connectedDevice !== null} // Disable selecting if already connected
            >
              <Text style={styles.deviceName}>{device.name}</Text>
              <Text style={styles.deviceId}>{device.id}</Text>
            </TouchableOpacity>
          ))
        ) : (
          <Text style={styles.noDevicesText}>No devices found yet.</Text>
        )}

        {connectedDevice && (
          <View style={styles.connectedInfo}>
            <Text style={styles.connectedText}>Connected to: {connectedDevice.name}</Text>
            <TouchableOpacity
              style={styles.triggerButton}
              onPress={handleTriggerGpio}
            >
              <Text style={styles.triggerButtonText}>TRIGGER GPIO 27</Text>
              <Feather name="zap" size={20} color="white" style={{ marginLeft: 8 }} />
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.disconnectButton}
              onPress={() => {
                setConnectedDevice(null); // Disconnect
                setBluetoothStatus('Disconnected. Scanning for devices...');
              }}
            >
              <Text style={styles.disconnectButtonText}>Disconnect</Text>
            </TouchableOpacity>
          </View>
        )}
      </View>
    </SafeAreaView>
  );
}

// --- Main App Component ---
export default function App() {
  const [user, setUser] = useState(null);
  const [isLoadingAuth, setIsLoadingAuth] = useState(true); // Start as true to show loading indicator
  const [isAlertVisible, setIsAlertVisible] = useState(false);
  const [alertMessage, setAlertMessage] = useState('');

  // Expo Google Auth Hook (replace with your actual client IDs from Google Cloud)
  const [request, response, promptAsync] = Google.useAuthRequest({
    iosClientId: process.env.EXPO_PUBLIC_IOS_CLIENT_ID,
    androidClientId: process.env.EXPO_PUBLIC_ANDROID_CLIENT_ID,
    webClientId: process.env.EXPO_PUBLIC_WEB_CLIENT_ID,
    scopes: ['profile', 'email'],
  });

  const showCustomAlert = (message) => {
    setAlertMessage(message);
    setIsAlertVisible(true);
  };

  const hideCustomAlert = () => {
    setIsAlertVisible(false);
    setAlertMessage('');
  };

  useEffect(() => {
    // Handle Google auth response when it changes
    if (response?.type === 'success') {
      const { authentication } = response;
      if (authentication && authentication.accessToken) {
        fetchUserInfo(authentication.accessToken, authentication.idToken);
      }
    } else if (response?.type === 'error') {
      console.error('Google Auth Error:', response.error);
      setIsLoadingAuth(false);
      showCustomAlert(`Authentication Error: ${response.error.message || 'Unknown error'}`);
    }
  }, [response]); // Dependency on 'response' object

  useEffect(() => {
    // On app load, try to load user from async storage to maintain session
    loadUserFromStorage();
  }, []); // Empty dependency array means this runs once on mount

  const fetchUserInfo = async (accessToken, idToken) => {
    try {
      // Fetch user profile information from Google
      const userInfoResponse = await fetch('https://www.googleapis.com/userinfo/v2/me', {
        headers: { Authorization: `Bearer ${accessToken}` },
      });

      if (!userInfoResponse.ok) {
        throw new Error(`Failed to fetch user info: ${userInfoResponse.statusText}`);
      }

      const userInfo = await userInfoResponse.json();
      const userPayload = {
        accessToken: accessToken,
        idToken: idToken, // Important for sending to your backend for verification
        email: userInfo.email,
        givenName: userInfo.given_name,
        photoUrl: userInfo.picture,
        // You can add more user data if needed
      };
      setUser(userPayload);
      // Store user info in AsyncStorage for persistence across app launches
      await AsyncStorage.setItem('user', JSON.stringify(userPayload));
      console.log('User logged in:', userPayload.email);
    } catch (error) {
      console.error('Failed to fetch user info:', error);
      showCustomAlert(`Error fetching user info: ${error.message}`);
      // If fetching user info fails, you might still consider the user logged in with just the token,
      // or force re-login depending on your security policy.
      setUser({ accessToken, idToken }); // Minimal user info
    } finally {
      setIsLoadingAuth(false);
    }
  };

  const loadUserFromStorage = async () => {
    try {
      const storedUser = await AsyncStorage.getItem('user');
      if (storedUser) {
        const parsedUser = JSON.parse(storedUser);
        setUser(parsedUser);
        console.log('User restored from storage:', parsedUser.email);
      }
    } catch (error) {
      console.error('Failed to load user from storage:', error);
      showCustomAlert(`Error loading session: ${error.message}`);
    } finally {
      setIsLoadingAuth(false);
    }
  };

  const signInWithGoogle = async () => {
    setIsLoadingAuth(true);
    try {
      // This will open the browser/system dialogue for Google login
      await promptAsync();
      // The response is handled by the useEffect hook
    } catch (error) {
      console.error('Google sign-in prompt error:', error);
      setIsLoadingAuth(false);
      showCustomAlert(`Sign-in prompt error: ${error.message}`);
    }
  };

  const signOut = async () => {
    setIsLoadingAuth(true);
    try {
      await AsyncStorage.removeItem('user'); // Clear user data from storage
      setUser(null); // Clear user state
      console.log('User signed out.');
    } catch (error) {
      console.error('Failed to sign out:', error);
      showCustomAlert(`Error signing out: ${error.message}`);
    } finally {
      setIsLoadingAuth(false);
    }
  };

  // Auth context value to be passed down to children components
  const authContextValue = {
    user,
    signInWithGoogle,
    signOut,
    isLoadingAuth,
    showCustomAlert, // Provide the custom alert function via context
  };

  // Conditional rendering based on authentication state
  return (
    <SafeAreaProvider> {/* Add SafeAreaProvider here */}
      <AuthContext.Provider value={authContextValue}>
        {isLoadingAuth ? (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color="#007AFF" />
            <Text style={styles.loadingText}>Loading...</Text>
          </View>
        ) : user ? (
          <DashboardScreen />
        ) : (
          <LoginScreen />
        )}
        <CustomAlert message={alertMessage} isVisible={isAlertVisible} onClose={hideCustomAlert} />
      </AuthContext.Provider>
    </SafeAreaProvider>
  );
}

// --- Stylesheet for the components ---
const styles = StyleSheet.create({
  container: {
    flex: 1, // Takes up full height
    backgroundColor: '#f0f4f8',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 20,
    width: '100%', // Ensure it takes full width for web/large screens
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#f0f4f8',
  },
  loadingText: {
    marginTop: 10,
    fontSize: 16,
    color: '#333',
  },
  card: {
    backgroundColor: '#fff',
    borderRadius: 20,
    padding: 30,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 5, // Android shadow
    width: '90%', // Responsive width
    maxWidth: 400, // Max width for larger screens
  },
  logo: {
    width: 120,
    height: 120,
    borderRadius: 60,
    marginBottom: 20,
    borderColor: '#007AFF',
    borderWidth: 2,
  },
  title: {
    fontSize: 28,
    fontWeight: '700',
    color: '#333',
    marginBottom: 10,
  },
  subtitle: {
    fontSize: 16,
    color: '#666',
    textAlign: 'center',
    marginBottom: 30,
  },
  googleButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#4285F4', // Google blue
    paddingVertical: 12,
    paddingHorizontal: 25,
    borderRadius: 30,
    marginBottom: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
  },
  googleIcon: {
    marginRight: 10,
  },
  googleButtonText: {
    color: '#fff',
    fontSize: 18,
    fontWeight: '600',
  },
  footerText: {
    fontSize: 12,
    color: '#999',
    textAlign: 'center',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    width: '100%',
    paddingHorizontal: 20,
    paddingVertical: 15,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
    // Using default flex layout which should naturally push it to top within SafeAreaView
    // and rely on container's flex behavior to place the dashboardCard below it.
  },
  profilePic: {
    width: 40,
    height: 40,
    borderRadius: 20,
    marginRight: 10,
  },
  welcomeText: {
    fontSize: 18,
    fontWeight: '600',
    color: '#333',
    flex: 1, // Allows text to take available space
  },
  signOutButton: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 8,
    borderRadius: 10,
    backgroundColor: '#f0f0f0',
  },
  signOutButtonText: {
    marginLeft: 5,
    color: 'gray',
    fontSize: 14,
  },
  dashboardCard: {
    backgroundColor: '#fff',
    borderRadius: 20,
    padding: 25,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 5,
    width: '90%',
    maxWidth: 500,
    marginTop: 20, // Add some top margin to separate from header
    flexGrow: 1, // Allows the card to grow and take available space
  },
  dashboardTitle: {
    fontSize: 24,
    fontWeight: '700',
    color: '#333',
    marginBottom: 20,
    textAlign: 'center',
  },
  bluetoothStatusText: {
    fontSize: 16,
    color: '#555',
    marginBottom: 20,
    textAlign: 'center',
  },
  subHeading: {
    fontSize: 18,
    fontWeight: '600',
    color: '#444',
    marginBottom: 15,
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
    paddingBottom: 5,
  },
  deviceItem: {
    backgroundColor: '#f8f8f8',
    padding: 15,
    borderRadius: 10,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: '#e0e0e0',
  },
  connectedDeviceItem: {
    borderColor: '#007AFF',
    borderWidth: 2,
  },
  deviceName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
  },
  deviceId: {
    fontSize: 12,
    color: '#777',
    marginTop: 5,
  },
  noDevicesText: {
    fontSize: 14,
    color: '#777',
    textAlign: 'center',
    paddingVertical: 20,
  },
  connectedInfo: {
    marginTop: 30,
    paddingTop: 20,
    borderTopWidth: 1,
    borderTopColor: '#e0e0e0',
    alignItems: 'center',
  },
  connectedText: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#007AFF',
    marginBottom: 15,
  },
  triggerButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#28a745', // Green for trigger
    paddingVertical: 15,
    paddingHorizontal: 30,
    borderRadius: 30,
    marginBottom: 15,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
  },
  triggerButtonText: {
    color: '#fff',
    fontSize: 18,
    fontWeight: '700',
  },
  disconnectButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#dc3545', // Red for disconnect
    paddingVertical: 12,
    paddingHorizontal: 25,
    borderRadius: 30,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
  },
  disconnectButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
});
