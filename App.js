    import React, { useState, useEffect, createContext, useContext, useRef } from 'react';
    import { View, Text, StyleSheet, ActivityIndicator, Image, TouchableOpacity, PermissionsAndroid, Alert as ReactNativeAlert, Platform } from 'react-native';
    import * as WebBrowser from 'expo-web-browser';
    import * as Google from 'expo-auth-session/providers/google';
    import AsyncStorage from '@react-native-async-storage/async-storage';
    import { AntDesign, Feather } from '@expo/vector-icons';
    import { SafeAreaView, SafeAreaProvider } from 'react-native-safe-area-context';
    import { BleManager, State as BluetoothState } from 'react-native-ble-plx';
    import { Buffer } from 'buffer';
    import { getBleManager, destroyBleManager } from './bleManager'; // adjust path
    
    // Conditionally complete auth session for non-web platforms
    if (Platform.OS !== 'web') {
      WebBrowser.maybeCompleteAuthSession();
    }

    // Initialize Buffer for global use if needed (often automatically handled by bundlers)
    if (typeof Buffer === 'undefined') {
      global.Buffer = require('buffer').Buffer;
    }

    // --- AuthContext: Provides authentication state and functions to all components ---
    const AuthContext = createContext(null);

    // --- Custom Alert Component (replaces native Alert for better UX and consistency) ---
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
              source={{ uri: 'https://placehold.co/150x150/000000/FFFFFF?text=ESP32' }}
              style={styles.logo}
            />
            <Text style={styles.title}>Connect with ESP32</Text>
            <Text style={styles.subtitle}>Unlock the power of your IoT devices.</Text>

            <TouchableOpacity
              style={styles.googleButton}
              onPress={signInWithGoogle}
              disabled={isLoadingAuth}
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

      // BLE State Management
      const bleManager = useRef(getBleManager()).current;
      const [bluetoothStatus, setBluetoothStatus] = useState('Initializing Bluetooth...');
      const [scannedDevices, setScannedDevices] = useState([]);
      const [isScanning, setIsScanning] = useState(false);
      const [connectedDevice, setConnectedDevice] = useState(null);
      const [isConnecting, setIsConnecting] = useState(false);
      const [isTriggering, setIsTriggering] = useState(false);

      // Replace with your ESP32's actual Service and Characteristic UUIDs
      // These UUIDs MUST EXACTLY match those in your ESP32 firmware.
      const ESP32_SERVICE_UUID = '0000ffe0-0000-1000-8000-00805f9b34fb';
      const ESP32_CHARACTERISTIC_UUID = '0000ffe1-0000-1000-8000-00805f9b34fb';

      // --- Bluetooth State & Permissions ---
      useEffect(() => {
        let stateSubscription = null;

        // Check and request Bluetooth permissions (Android specific)
        const requestPermissions = async () => {
          console.log("[DEBUG] Requesting Bluetooth permissions...");
          if (Platform.OS === 'android') {
            const granted = await PermissionsAndroid.request(
              PermissionsAndroid.PERMISSIONS.ACCESS_FINE_LOCATION,
              {
                title: "Bluetooth Permission",
                message: "This app needs access to your location to scan for Bluetooth devices.",
                buttonNeutral: "Ask Me Later",
                buttonNegative: "Cancel",
                buttonPositive: "OK"
              }
            );
            if (granted !== PermissionsAndroid.RESULTS.GRANTED) {
              showCustomAlert("Location permission denied. Cannot scan for Bluetooth devices.");
              setBluetoothStatus("Permissions denied.");
              console.log("[DEBUG] Location permission denied.");
              return false;
            }
            // For Android 12+
            if (Platform.Version >= 31) { // Android 12 and above
              const bluetoothScanGranted = await PermissionsAndroid.request(
                PermissionsAndroid.PERMISSIONS.BLUETOOTH_SCAN,
                {
                  title: "Bluetooth Scan Permission",
                  message: "This app needs Bluetooth Scan permission.",
                  buttonNeutral: "Ask Me Later",
                  buttonNegative: "Cancel",
                  buttonPositive: "OK"
                }
              );
              const bluetoothConnectGranted = await PermissionsAndroid.request(
                PermissionsAndroid.PERMISSIONS.BLUETOOTH_CONNECT,
                {
                  title: "Bluetooth Connect Permission",
                  message: "This app needs Bluetooth Connect permission.",
                  buttonNeutral: "Ask Me Later",
                  buttonNegative: "Cancel",
                  buttonPositive: "OK"
                }
              );
              if (bluetoothScanGranted !== PermissionsAndroid.RESULTS.GRANTED || bluetoothConnectGranted !== PermissionsAndroid.RESULTS.GRANTED) {
                showCustomAlert("Bluetooth Scan/Connect permissions denied.");
                setBluetoothStatus("Permissions denied.");
                console.log("[DEBUG] Bluetooth Scan/Connect permissions denied.");
                return false;
              }
            }
            console.log("[DEBUG] Permissions granted for Android.");
            return true;
          }
          console.log("[DEBUG] Permissions assumed granted for iOS (no explicit runtime request needed).");
          return true; // iOS doesn't need explicit runtime location permission for BLE itself.
        };

        // Listen for Bluetooth adapter state changes
        stateSubscription = bleManager.onStateChange((state) => {
          console.log(`[DEBUG] Bluetooth State Changed: ${state}`);
          setBluetoothStatus(`Bluetooth: ${state}`);
          if (state === BluetoothState.PoweredOn) {
            setBluetoothStatus('Bluetooth ON. Ready to scan.');
            // Trigger scan immediately after Bluetooth is powered on
            // This is important for robust startup behavior
            if (!isScanning) { // Prevent re-triggering if already scanning
                console.log("[DEBUG] Bluetooth powered on, automatically starting scan.");
                startScan();
            }
          } else if (state === BluetoothState.PoweredOff) {
            setConnectedDevice(null);
            setScannedDevices([]);
            setIsScanning(false);
            showCustomAlert("Bluetooth is OFF. Please turn it ON to connect devices.");
          }
        }, true); // `true` makes it run immediately on mount

        return () => {
          // Cleanup on unmount
          if (stateSubscription) stateSubscription.remove();
          bleManager.destroy();
          console.log("[DEBUG] BleManager destroyed on unmount.");
        };
      }, [bleManager, showCustomAlert, isScanning]); // Added isScanning to dependencies


      // --- New useEffect to start scan automatically on component mount ---
      useEffect(() => {
        console.log("[DEBUG] DashboardScreen mounted. Attempting to start initial scan.");
        // Only start scan if Bluetooth is powered on already or we are waiting for it
        // The onStateChange listener will handle starting the scan once Bluetooth is ON
        bleManager.state().then(state => {
          if (state === BluetoothState.PoweredOn) {
            startScan();
          } else {
            setBluetoothStatus(`Bluetooth: ${state}. Waiting to power on for scan.`);
          }
        });

        // Cleanup: Stop any ongoing scan when the component unmounts
        return () => {
          if (isScanning) {
            bleManager.stopDeviceScan();
            setIsScanning(false);
            console.log("[DEBUG] Scan stopped due to DashboardScreen unmount.");
          }
        };
      }, [bleManager, isScanning]); // Added isScanning as dependency to ensure cleanup runs correctly

      // --- BLE Operations ---

   const startScan = async () => {
  console.log("[DEBUG] startScan initiated.");
  const hasPermissions = await requestPermissions();
  if (!hasPermissions) {
    console.log("[DEBUG] startScan aborted: Permissions not granted.");
    return;
  }

  if (isScanning) {
    showCustomAlert("Already scanning!");
    console.log("[DEBUG] startScan aborted: Already scanning.");
    return;
  }

  // Check Bluetooth state (optional but recommended)
  const btState = await bleManager.state();
  if (btState !== "PoweredOn") {
    showCustomAlert("Please enable Bluetooth.");
    setBluetoothStatus("Bluetooth is off.");
    return;
  }

  setScannedDevices([]); // Clear previous scan results
  setBluetoothStatus("Scanning for ESP32 devices...");
  setIsScanning(true);

  bleManager.startDeviceScan([ESP32_SERVICE_UUID], null, (error, device) => {
    if (error) {
      console.error("Scan error:", error);
      setBluetoothStatus(`Scan Error: ${error.message}`);
      showCustomAlert(`Bluetooth Scan Error: ${error.message}`);
      setIsScanning(false);
      return;
    }

    if (device) {
      console.log(`[DEBUG] Found device: ID=${device.id}, Name=${device.name || 'N/A'}`);
      setScannedDevices(prevDevices => {
        if (prevDevices.some(d => d.id === device.id)) {
          return prevDevices;
        }
        console.log(`[DEBUG] Adding device: ${device.name || device.id}`);
        return [...prevDevices, device];
      });
    }
  });

  // Stop scanning after 10 seconds
  setTimeout(() => {
    bleManager.stopDeviceScan();
    setIsScanning(false);
    setBluetoothStatus("Scan finished.");
    console.log("[DEBUG] Scan timer ended, setIsScanning(false).");
  }, 10000);
};


      const connectToDevice = async (device) => {
        if (isConnecting) return;
        setIsConnecting(true);
        bleManager.stopDeviceScan(); // Stop scanning before connecting
        setIsScanning(false); // Ensure scanning stops visually too
        setBluetoothStatus(`Connecting to ${device.name || device.id}...`);

        try {
          const connected = await device.connect();
          const discovered = await connected.discoverAllServicesAndCharacteristics();
          setConnectedDevice(discovered);
          setBluetoothStatus(`Connected to ${discovered.name || discovered.id}`);
          showCustomAlert(`Connected to ${discovered.name || discovered.id}`);
        } catch (error) {
          console.error("Connection error:", error);
          setBluetoothStatus(`Connection Failed: ${error.message}`);
          showCustomAlert(`Connection Failed: ${error.message}`);
          setConnectedDevice(null);
        } finally {
          setIsConnecting(false);
        }
      };

      const disconnectDevice = async () => {
        if (!connectedDevice) return;
        setBluetoothStatus(`Disconnecting from ${connectedDevice.name || connectedDevice.id}...`);
        try {
          await connectedDevice.cancelConnection();
          setConnectedDevice(null);
          setBluetoothStatus("Disconnected. Ready to scan.");
          showCustomAlert("Device disconnected.");
        } catch (error) {
          console.error("Disconnection error:", error);
          setBluetoothStatus(`Disconnection Failed: ${error.message}`);
          showCustomAlert(`Disconnection Failed: ${error.message}`);
        }
      };

      const handleTriggerGpio = async () => {
        if (!connectedDevice) {
          showCustomAlert('No device connected. Please connect to an ESP32 first!');
          return;
        }
        if (isTriggering) return;

        setIsTriggering(true);
        setBluetoothStatus(`Triggering GPIO 27 on ${connectedDevice.name || connectedDevice.id}...`);

        try {
          // Find the service
          const service = await connectedDevice.services().then(services =>
            services.find(s => s.uuid.toLowerCase() === ESP32_SERVICE_UUID.toLowerCase())
          );

          if (!service) {
            throw new Error(`Service with UUID ${ESP32_SERVICE_UUID} not found.`);
          }

          // Find the characteristic
          const characteristic = await service.characteristics().then(chars =>
            chars.find(c => c.uuid.toLowerCase() === ESP32_CHARACTERISTIC_UUID.toLowerCase())
          );

          if (!characteristic) {
            throw new Error(`Characteristic with UUID ${ESP32_CHARACTERISTIC_UUID} not found.`);
          }

          // Value to write (e.g., '1' to toggle, or 'ON'/'OFF' depending on your ESP32 firmware)
          // Needs to be base64 encoded.
          const valueToSend = '1'; // Or 'TOGGLE' or whatever your ESP32 expects
          const encodedValue = Buffer.from(valueToSend).toString('base64');

          // Write to the characteristic
          await characteristic.writeWithResponse(encodedValue);

          setBluetoothStatus(`GPIO 27 triggered successfully on ${connectedDevice.name || connectedDevice.id}!`);
          showCustomAlert(`GPIO 27 triggered successfully!`);
        } catch (error) {
          console.error("Error triggering GPIO:", error);
          setBluetoothStatus(`Error triggering GPIO: ${error.message}`);
          showCustomAlert(`Error triggering GPIO: ${error.message}`);
        } finally {
          setIsTriggering(false);
        }
      };


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

            {!connectedDevice ? (
              <>
                <TouchableOpacity
                  style={[styles.scanButton, isScanning && styles.scanButtonDisabled]}
                  // We keep the button, but now it can also be used to restart the scan
                  onPress={() => {
                    console.log("[DEBUG] 'Scan for ESP32 Devices' button pressed (manual trigger).");
                    startScan();
                  }}
                  disabled={isScanning}
                >
                  {isScanning ? (
                    // Show ActivityIndicator when scanning is true
                    <ActivityIndicator color="#fff" style={{ marginRight: 10 }} />
                  ) : (
                    // Show Bluetooth icon when not scanning
                    <AntDesign name="bluetooth" size={24} color="white" style={{ marginRight: 10 }} />
                  )}
                  <Text style={styles.scanButtonText}>
                    {isScanning ? 'Scanning...' : 'Scan for ESP32 Devices'}
                  </Text>
                </TouchableOpacity>

                <Text style={styles.subHeading}>Found Devices:</Text>
                {scannedDevices.length > 0 ? (
                  scannedDevices.map((device) => (
                    <TouchableOpacity
                      key={device.id}
                      style={[styles.deviceItem, isConnecting && styles.deviceItemDisabled]}
                      onPress={() => connectToDevice(device)}
                      disabled={isConnecting}
                    >
                      <Text style={styles.deviceName}>{device.name || 'N/A'}</Text>
                      <Text style={styles.deviceId}>{device.id}</Text>
                      {isConnecting && device.id === connectedDevice?.id && (
                        <ActivityIndicator size="small" color="#007AFF" style={{ marginLeft: 'auto' }} />
                      )}
                    </TouchableOpacity>
                  ))
                ) : (
                  <Text style={styles.noDevicesText}>
                    {isScanning ? 'Searching...' : 'No devices found. Tap Scan to retry.'}
                  </Text>
                )}
              </>
            ) : (
              <View style={styles.connectedInfo}>
                <Text style={styles.connectedText}>Connected to: {connectedDevice.name || connectedDevice.id}</Text>
                <TouchableOpacity
                  style={[styles.triggerButton, isTriggering && styles.triggerButtonDisabled]}
                  onPress={handleTriggerGpio}
                  disabled={isTriggering}
                >
                  {isTriggering ? (
                    <ActivityIndicator color="#fff" style={{ marginRight: 10 }} />
                  ) : (
                    <Feather name="zap" size={20} color="white" style={{ marginRight: 10 }} />
                  )}
                  <Text style={styles.triggerButtonText}>
                    {isTriggering ? 'Triggering...' : 'TRIGGER GPIO 27'}
                  </Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={styles.disconnectButton}
                  onPress={disconnectDevice}
                >
                  <Text style={styles.disconnectButtonText}>Disconnect</Text>
                </TouchableOpacity>
              </View>
            )}
          </View>
        </SafeAreaView>
      );
    }

    // --- Main App Component (Wrapper for SafeAreaProvider and AuthContext) ---
    export default function App() {
      const [user, setUser] = useState(null);
      const [isLoadingAuth, setIsLoadingAuth] = useState(true);
      const [isAlertVisible, setIsAlertVisible] = useState(false);
      const [alertMessage, setAlertMessage] = useState('');

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
      }, [response]);

      useEffect(() => {
        loadUserFromStorage();
      }, []);

      const fetchUserInfo = async (accessToken, idToken) => {
        try {
          const userInfoResponse = await fetch('https://www.googleapis.com/userinfo/v2/me', {
            headers: { Authorization: `Bearer ${accessToken}` },
          });

          if (!userInfoResponse.ok) {
            throw new Error(`Failed to fetch user info: ${userInfoResponse.statusText}`);
          }

          const userInfo = await userInfoResponse.json();
          const userPayload = {
            accessToken: accessToken,
            idToken: idToken,
            email: userInfo.email,
            givenName: userInfo.given_name,
            photoUrl: userInfo.picture,
          };
          setUser(userPayload);
          await AsyncStorage.setItem('user', JSON.stringify(userPayload));
          console.log('User logged in:', userPayload.email);
        } catch (error) {
          console.error('Failed to fetch user info:', error);
          showCustomAlert(`Error fetching user info: ${error.message}`);
          setUser({ accessToken, idToken });
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
          await promptAsync();
        } catch (error) {
          console.error('Google sign-in prompt error:', error);
          setIsLoadingAuth(false);
          showCustomAlert(`Sign-in prompt error: ${error.message}`);
        }
      };

      const signOut = async () => {
        setIsLoadingAuth(true);
        try {
          await AsyncStorage.removeItem('user');
          setUser(null);
          console.log('User signed out.');
        } catch (error) {
          console.error('Failed to sign out:', error);
          showCustomAlert(`Error signing out: ${error.message}`);
        } finally {
          setIsLoadingAuth(false);
        }
      };

      const authContextValue = {
        user,
        signInWithGoogle,
        signOut,
        isLoadingAuth,
        showCustomAlert,
      };

      return (
        <SafeAreaProvider>
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
        flex: 1,
        backgroundColor: '#f0f4f8',
        alignItems: 'center',
        justifyContent: 'center',
        padding: 20,
        width: '100%',
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
        elevation: 5,
        width: '90%',
        maxWidth: 400,
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
        backgroundColor: '#4285F4',
        paddingVertical: 12,
        paddingHorizontal: 25,
        borderRadius: 30,
        marginBottom: 20,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.2,
        shadowRadius: 4,
        width: '100%',
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
    flex: 1,
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
    marginTop: 20,
    flexGrow: 1,
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
  // New styles for scan button and device list
  scanButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#007AFF', // Blue for scan
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderRadius: 30,
    marginBottom: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    width: '100%',
  },
  scanButtonDisabled: {
    opacity: 0.6,
  },
  scanButtonText: {
    color: '#fff',
    fontSize: 18,
    fontWeight: '600',
  },
  deviceItem: {
    backgroundColor: '#f8f8f8',
    padding: 15,
    borderRadius: 10,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: '#e0e0e0',
    flexDirection: 'row', // To align text and activity indicator
    alignItems: 'center',
  },
  deviceItemDisabled: {
    opacity: 0.6,
  },
  deviceName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    flexShrink: 1, // Allow text to shrink
    marginRight: 10,
  },
  deviceId: {
    fontSize: 12,
    color: '#777',
    marginTop: 5,
    flexShrink: 1,
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
    justifyContent: 'center',
    backgroundColor: '#28a745',
    paddingVertical: 15,
    paddingHorizontal: 30,
    borderRadius: 30,
    marginBottom: 15,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    width: '100%',
  },
  triggerButtonDisabled: {
    opacity: 0.6,
  },
  triggerButtonText: {
    color: '#fff',
    fontSize: 18,
    fontWeight: '700',
  },
  disconnectButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#dc3545',
    paddingVertical: 12,
    paddingHorizontal: 25,
    borderRadius: 30,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    width: '100%',
  },
  disconnectButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
    textAlign: 'center',
  },
});
    