/**
 * Pocket Print Shop
 *
 * @format
 * @flow strict-local
 */

import React, { useState } from 'react';
import { SafeAreaView, ScrollView, Text, View } from 'react-native';

import RNBluetoothClassic from 'react-native-bluetooth-classic';

const App = () => {
  const [bluetoothEnabled, setBluetoothEnabled] = useState(false);

  // set up callbacks to track bluetooth state
  React.useEffect(() => {
    RNBluetoothClassic.isBluetoothEnabled()
      .then(setBluetoothEnabled)
      .catch(err => Alert.alert('Could not check Bluetooth status: ' + err));

    RNBluetoothClassic.onBluetoothEnabled(() => setBluetoothEnabled(true));
    RNBluetoothClassic.onBluetoothDisabled(() => setBluetoothEnabled(false));
  }, []);

  return (
    <SafeAreaView>
      <ScrollView>
        <Text>Pocket Print Shop</Text>
        <View>
          <Text>Bluetooth enabled? {bluetoothEnabled ? <Text>Yep</Text> : <Text>Nope</Text>}</Text>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
};

export default App;
