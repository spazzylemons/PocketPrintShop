import React, { useState } from 'react';
import { Alert, FlatList, Image, SafeAreaView, Text, View } from 'react-native';
import styles from './styles';
import UsbSerial from './UsbSerial';
import parsePackets, { PrinterImage } from './parsePackets';
import type { ListRenderItemInfo } from 'react-native';

let connectionInProgress = false;

const App = () => {
    const [devices, setDevices] = useState<number[]>([]);
    const [connectedDevice, setConnectedDevice] = useState<number | null>(null);
    const [images, setImages] = useState<PrinterImage[]>([]);

    React.useEffect(() => {
        const endData = parsePackets(image => {
            images.push(image);
            setImages(images);
        });
        // listen for disconnect
        UsbSerial.onDisconnect(() => {
            setConnectedDevice(null);
            endData();
        });
        // repeatedly read the devices list
        (async function checkDevices() {
            try {
                setDevices(await UsbSerial.listDevices());
            } catch (err) {
                console.error(err);
            }
            setTimeout(checkDevices, 1000);
        })();
    }, []);

    function requestConnect(deviceId: number): () => Promise<void> {
        return async () => {
            if (connectionInProgress) return;

            if (connectedDevice === deviceId) {
                // if we're connected to this very device, we'll do a disconnect instead
                try {
                    UsbSerial.disconnect();
                } catch (err) {
                    console.log(err);
                }
            } else {
                if (connectedDevice !== null) {
                    // If we're connected to another device, disconnect first
                    try {
                        UsbSerial.disconnect();
                    } catch (err) {
                        console.log(err);
                        return;
                    }
                }

                try {
                    connectionInProgress = true;
                    await UsbSerial.connect(deviceId);
                    setConnectedDevice(deviceId);
                } catch (err) {
                    Alert.alert('Could not connect', err.toString());
                } finally {
                    connectionInProgress = false;
                }
            }
        };
    }

    function renderDevice(info: ListRenderItemInfo<number>): React.ReactElement {
        const device = info.item;
        const deviceStyles: object[] = [styles.availableDevice];
        if (device === connectedDevice) {
            deviceStyles.push(styles.connectedDevice);
        }
        return <Text style={deviceStyles} onPress={requestConnect(device)}>deviceId = {device}</Text>;
    }

    function renderImage(info: ListRenderItemInfo<PrinterImage>): React.ReactElement {
        return <View style={styles.pictureFrame}>
            <Image
                source={{ uri: 'data:image/png;base64,' + info.item.png }}
                style={{ width: info.item.width, height: info.item.height }}
                />
        </View>;
    }

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
