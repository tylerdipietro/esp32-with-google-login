import { BleManager } from 'react-native-ble-plx';

let bleManagerInstance = null;

export const getBleManager = () => {
  if (!bleManagerInstance) {
    bleManagerInstance = new BleManager();
    console.log("[BLE] BleManager initialized");
  }
  return bleManagerInstance;
};

export const destroyBleManager = () => {
  if (bleManagerInstance) {
    bleManagerInstance.destroy();
    bleManagerInstance = null;
    console.log("[BLE] BleManager destroyed");
  }
};
