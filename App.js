/**
 * Pocket Print Shop
 *
 * @format
 * @flow strict-local
 */

import React, { useState } from 'react';
import { Alert, Button, FlatList, PermissionsAndroid, SafeAreaView, ScrollView, Text, View } from 'react-native';

import RNBluetoothClassic from 'react-native-bluetooth-classic';

const App = () => {
  const [bluetoothEnabled, setBluetoothEnabled] = useState(false);
  const [bondedDevices, setBondedDevices] = useState([{name: 'This is a test'}]);

  // set up callbacks to track bluetooth state
  React.useEffect(() => {
    RNBluetoothClassic.isBluetoothEnabled()
      .then(setBluetoothEnabled)
      .catch(err => Alert.alert('Could not check Bluetooth status: ' + err));

    RNBluetoothClassic.onBluetoothEnabled(() => setBluetoothEnabled(true));
    RNBluetoothClassic.onBluetoothDisabled(() => setBluetoothEnabled(false));
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

  const renderBondedDevice = ({item}) => <Text>{item.name}</Text>;

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
