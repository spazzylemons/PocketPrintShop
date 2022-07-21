/**
 * Pocket Print Shop
 *
 * @format
 * @flow strict-local
 */

import React, { useState } from 'react';

import { Buffer } from 'buffer';

import {
  Alert,
  FlatList,
  Image,
  NativeEventEmitter,
  NativeModules,
  SafeAreaView,
  StyleSheet,
  Text,
  View,
} from 'react-native';

import { deflateSync } from 'react-zlib-js';

import CRC32 from 'crc-32';

const { UsbSerialModule } = NativeModules;

const styles = StyleSheet.create({
  main: {
    backgroundColor: 'white',
    color: 'black',
    flex: 1,
  },

  title: {
    padding: 10,
    fontSize: 24,
    backgroundColor: 'black',
    color: 'white',
    textAlign: 'center',
    fontWeight: 'bold',
  },

  availableDevice: {
    color: 'black',
    fontSize: 24,
    padding: 5,
    textAlign: 'center',
  },

  connectedDevice: {
    color: 'white',
    backgroundColor: 'black',
  },

  sectionHeader: {
    color: 'black',
    textAlign: 'center',
  },

  pictureFrame: {
    backgroundColor: 'red',
    padding: 10,
    margin: 10,
    alignSelf: 'center',
  },
});

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
    // get magic
    const magicLo = stream[i++];
    const magicHi = stream[i++];
    const magic = magicLo | (magicHi << 8);
    if (magic != 0x3388) {
      console.error('magic data missing');
      return null;
    }
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
    // get checksum
    const sumLo = stream[i++];
    const sumHi = stream[i++];
    const sum = sumLo | (sumHi << 8);
    const compare = command + compression + sizeLo + sizeHi;
    for (let k = 0; k < size; k++) {
      compare = (compare + payload[k]) & 0xffff;
    }
    // ignore ack
    i += 1;
    // get status
    const status = stream[i++];
    if (compare != sum) {
      console.error('checksum incorrect, ignoring packet');
      if ((status & 1) == 0) {
        console.error('emulator disagrees about checksum error');
      }
      continue;
    }
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

  return <Image style={{ width: 160, height }} source={{uri: source}} />;
}

let connectionInProgress = false;
let readListener = null;

const eventEmitter = new NativeEventEmitter(UsbSerialModule);

const App = () => {
  // TODO is there some way to handle unexpected disconnect of the device?
  const [devices, setDevices] = useState([]);
  const [connectedDevice, setConnectedDevice] = useState(null);
  const [images, setImages] = useState([]);

  React.useEffect(() => {
    // listen for disconnect
    eventEmitter.addListener('usbSerialDisconnect', () => {
      setConnectedDevice(null);
      if (readListener !== null) {
        readListener.remove();
        readListener = null;
      }
    });
    // repeatedly read the devices list
    (async function checkDevices() {
      try {
        setDevices(await UsbSerialModule.listDevices());
      } catch (err) {
        console.error(err);
      }
      setTimeout(checkDevices, 1000);
    })();
  }, []);

  const requestConnect = (device) => async () => {
    if (connectionInProgress) return;

    // if we're connected to this very device, we'll do a disconnect instead
    if (connectedDevice === device) {
      try {
        UsbSerialModule.disconnect();
      } catch (err) {
        console.log(err);
      }
      return;
    }

    if (connectedDevice !== null) {
      Alert.alert('Disconnect previous device first.');
      return;
    }

    try {
      connectionInProgress = true;

      await UsbSerialModule.connect(device);
      setConnectedDevice(device);
    } catch (err) {
      if (err !== 'permission denied') {
        Alert.alert('Could not connect: ' + err);
      }
      return;
    } finally {
      connectionInProgress = false;
    }

    let timeout = null;
    let printerData = [];
    readListener = eventEmitter.addListener('usbSerialRead', ({data}) => {
      printerData = printerData.concat(Buffer.from(data, 'base64').toJSON().data);
      clearTimeout(timeout);
      timeout = setTimeout(() => {
        timeout = null;
        const image = processData(printerData);
        if (image) {
          images.push(image);
          setImages(images);
        }
        printerData = [];
      }, 1000);
    });
  };

  const renderDevice = ({item}) => {
    const deviceStyles = [styles.availableDevice];
    if (item === connectedDevice) {
      deviceStyles.push(styles.connectedDevice);
    }
    return <Text style={deviceStyles} onPress={requestConnect(item)}>deviceId = {item}</Text>;
  };

  const renderImage = ({item}) => {
    return <View style={styles.pictureFrame}>
      {item}
    </View>
  };

  return (
    <SafeAreaView style={styles.main}>
      <Text style={styles.title}>Pocket Print Shop</Text>
      <Text style={styles.sectionHeader}>Available devices</Text>
      <FlatList
        data={devices}
        renderItem={renderDevice}
      />
      <Text style={styles.sectionHeader}>Temporary gallery</Text>
      <FlatList
        data={images}
        renderItem={renderImage}
      />
    </SafeAreaView>
  );
};

export default App;
