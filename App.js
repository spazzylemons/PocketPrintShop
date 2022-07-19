/**
 * Pocket Print Shop
 *
 * @format
 * @flow strict-local
 */

import React, { useState } from 'react';
import { Alert, Button, FlatList, Image, PermissionsAndroid, SafeAreaView, Text, View } from 'react-native';

import RNBluetoothClassic from 'react-native-bluetooth-classic';

import { deflateSync } from 'react-zlib-js';

import CRC32 from 'crc-32';

function intToBytes(int) {
  return [
    (int >> 24) & 0xff,
    (int >> 16) & 0xff,
    (int >> 8) & 0xff,
    (int >> 0) & 0xff,
  ];
}

function createPngChunk(fourcc, data) {
  const result = intToBytes(data.length);
  const checksummed = [...Buffer.from(fourcc)].concat(data);
  return result.concat(checksummed).concat(intToBytes(CRC32.buf(checksummed)));
}

function processData(stream) {
  let height = 0;
  let vram = [];
  const imageParts = [];

  let i = 0;
  while (i < stream.length) {
    // ignore magic
    i += 2;
    // get command
    const command = stream[i++];
    // get compression
    const compression = stream[i++];
    // get size
    const sizeLo = stream[i++];
    const sizeHi = stream[i++];
    const size = sizeLo | (sizeHi << 8);
    // get payload
    const payload = stream.slice(i, i + size);
    i += size;
    // ignore checksum and ack
    i += 3;
    // get status
    const status = stream[i++];
    // process packet
    switch (command) {
      case 1:
        vram = [];
        break;
      case 2:
        imageParts.push({ payload, pixels: vram.slice() });
        height += Math.floor(vram.length / 40);
        break;
      case 4:
        if (compression !== 0) {
          let j = 0;
          while (j < payload.length) {
            if ((payload[j] & 0x80) !== 0) {
              const length = (payload[j++] & 0x7f) + 2;
              const value = payload[j++];
              for (let k = 0; k < length; k++) vram.push(value);
            } else {
              const length = payload[j++] + 1;
              for (let k = 0; k < length; k++) vram.push(payload[j++]);
            }
          }
        } else {
          vram = vram.concat(payload);
        }
        break;
    }
  }

  const data = Buffer.alloc(height * 161);

  let y = 0;
  for (const { payload, pixels } of imageParts) {
    const palette = payload[2];
    let i = 0;
    while (i < pixels.length) {
      for (let x = 0; x < 160; x += 8) {
        for (let py = 0; py < 8; py++) {
          let lo = pixels[i++];
          let hi = pixels[i++];
          for (let px = 0; px < 8; px++) {
            const index = (161 * (y + py) + x + px + 1);
            const color = (3 - ((palette >> (2 * ((lo >> 7) + (2 * (hi >> 7))))) & 3));
            data[index] = color;
            lo = (lo << 1) & 0xff;
            hi = (hi << 1) & 0xff;
          }
        }
      }
      y += 8;
    }
  }

  let pngData = [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a];
  pngData = pngData.concat(createPngChunk('IHDR',
    intToBytes(160)
      .concat(intToBytes(height))
      .concat([8, 3, 0, 0, 0])));
  pngData = pngData.concat(createPngChunk('PLTE',
    [0, 0, 0, 85, 85, 85, 170, 170, 170, 255, 255, 255]));
  pngData = pngData.concat(createPngChunk('IDAT',
    deflateSync(data).toJSON().data));
  pngData = pngData.concat(createPngChunk('IEND', []));
  const source = 'data:image/png;base64,' + Buffer.from(pngData).toString('base64');

  return <Image style={{width: 160, height: 144}} source={{uri: source}} />;
}

let connectionInProgress = false;

const App = () => {
  const [bluetoothEnabled, setBluetoothEnabled] = useState(false);
  const [bondedDevices, setBondedDevices] = useState([{name: 'This is a test'}]);
  const [connectedDevice, setConnectedDevice] = useState(null);
  const [image, setImage] = useState(null);

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
    if (connectionInProgress) return;

    if (connectedDevice !== null) {
      Alert.alert('Disconnect previous device first.');
      return;
    }

    if (!bluetoothEnabled) return;

    try {
      connectionInProgress = true;

      if (!await device.isConnected()) {
        if (!await device.connect()) {
          Alert.alert('Connection failed');
        }
      }
      let printerData = [];
      device.onDataReceived(({ data }) => {
        for (let i = 0; i < data.length; i += 2) {
          if (data[i] == '!') {
            setImage(processData(printerData));
            printerData = [];
          } else {
            printerData.push(parseInt(data.substring(i, i + 2), 16));
          }
        }
      });
      setConnectedDevice(device);
      Alert.alert('i am connected');
    } catch (err) {
      Alert.alert('Could not connect: ' + err);
      console.error(err);
    } finally {
      connectionInProgress = false;
    }
  };

  const renderBondedDevice = ({item}) => <Text style={{fontSize: 30}} onPress={requestConnect(item)}>{item.name}</Text>;

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
      {image !== null ? image : <View><Text>no image???</Text></View>}
      <FlatList
        data={bondedDevices}
        renderItem={renderBondedDevice}
      />
    </SafeAreaView>
  );
};

export default App;
