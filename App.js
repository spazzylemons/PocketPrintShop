/**
 * Pocket Print Shop
 *
 * @format
 * @flow strict-local
 */

import React, { useState } from 'react';
import { Alert, Button, FlatList, PermissionsAndroid, SafeAreaView, ScrollView, Text, View } from 'react-native';

import RNBluetoothClassic, { BluetoothDevice } from 'react-native-bluetooth-classic';

const App = () => {
  const [bluetoothEnabled, setBluetoothEnabled] = useState(false);
  const [bondedDevices, setBondedDevices] = useState([{name: 'This is a test'}]);
  const [connectedDevice, setConnectedDevice] = useState(null);

  // set up callbacks to track bluetooth state
  React.useEffect(() => {
    RNBluetoothClassic.isBluetoothEnabled()
      .then(setBluetoothEnabled)
      .catch(err => Alert.alert('Could not check Bluetooth status: ' + err));

    RNBluetoothClassic.onBluetoothEnabled(() => setBluetoothEnabled(true));
    RNBluetoothClassic.onBluetoothDisabled(() => {
      setConnectedDevice(null);
      setBluetoothEnabled(false);
    });

    RNBluetoothClassic.onDeviceDisconnected(event => {
      if (event.device === connectedDevice) {
        setConnectedDevice(null);
      }
    });
  }, []);

  const checkBondedDevices = async () => {
    // don't check devices if bluetooth is off
    if (!bluetoothEnabled) return;
    try {
      // TODO iOS support
      const granted = await PermissionsAndroid.request(PermissionsAndroid.PERMISSIONS.BLUETOOTH_CONNECT);
      if (granted !== PermissionsAndroid.RESULTS.GRANTED) {
        return;
      }
      setBondedDevices(await RNBluetoothClassic.getBondedDevices());
    } catch (err) {
      Alert.alert('Could not get bonded devices: ' + err);
      console.error(err);
    }
  };

  const requestConnect = (device) => async () => {
    if (connectedDevice !== null) {
      Alert.alert('Disconnect previous device first.');
      return;
    }

    if (!bluetoothEnabled) return;

    try {
      if (!await device.isConnected()) {
        if (!await device.connect()) {
          Alert.alert('Connection failed');
        }
      }
      device.onDataReceived(event => {
        const bytes = Buffer.from(event.data, 'base64');
        Alert.alert('data! [' + [...bytes] + ']');
      });
      setConnectedDevice(device);
      await device.write('hello\n');
    } catch (err) {
      Alert.alert('Could not connect: ' + err);
      console.error(err);
    }
  };

  const renderBondedDevice = ({item}) => <Text onPress={requestConnect(item)}>{item.name}</Text>;

  return (
    <SafeAreaView>
      <Text>Pocket Print Shop</Text>
      <View>
        <Text>Bluetooth enabled? {bluetoothEnabled ? <Text>Yep</Text> : <Text>Nope</Text>}</Text>
        <Button
          title='Check paired devices'
          onPress={checkBondedDevices}
        />
      </View>
      <FlatList
        data={bondedDevices}
        renderItem={renderBondedDevice}
      />
    </SafeAreaView>
  );
};

export default App;
