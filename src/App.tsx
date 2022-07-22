import React, { useState } from 'react';
import { Alert, Button, FlatList, Pressable, SafeAreaView, Text, ToastAndroid, View } from 'react-native';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import Share from 'react-native-share';
import styles from './styles';
import UsbSerial from './UsbSerial';
import parsePackets, { PrinterImage } from './parsePackets';
import RNFS from 'react-native-fs';
import type { ListRenderItemInfo } from 'react-native';
import type { NavigationHelpers } from '@react-navigation/native';

let connectionInProgress = false;

const Stack = createNativeStackNavigator();

type HomeParams = {};
type PhotoParams = { data: PrinterImage };

type Navigation = NavigationHelpers<{
    Home: HomeParams,
    Photo: PhotoParams,
}>;

const App = () => {
    const [devices, setDevices] = useState<UsbSerial.Device[]>([]);
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

    const HomeScreen = ({ navigation, route }: { navigation: Navigation, route: { params: HomeParams } }) => {
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
    
        function renderDevice(info: ListRenderItemInfo<UsbSerial.Device>): React.ReactElement {
            const device = info.item;
            const deviceStyles: object[] = [styles.availableDevice];
            if (device.id === connectedDevice) {
                deviceStyles.push(styles.connectedDevice);
            }
            return <View>
                <Text style={deviceStyles} onPress={requestConnect(device.id)}>{device.name ?? `<id ${device.id}>`}</Text>
            </View>;
        }
    
        function renderImage(info: ListRenderItemInfo<PrinterImage>): React.ReactElement {
            return <View style={styles.pictureFrame}>
                <Pressable onPress={() => navigation.navigate('Photo', { data: info.item })}>
                    {info.item.render()}
                </Pressable>
            </View>;
        }
    
        return (
            <SafeAreaView style={styles.main}>
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
    
    const PhotoScreen = ({ navigation, route }: { navigation: Navigation, route: { params: PhotoParams } }) => {
        async function download() {
            const path = RNFS.DownloadDirectoryPath + '/' + route.params.data.filename;
    
            try {
                await RNFS.writeFile(path, route.params.data.data, 'base64');
                ToastAndroid.show('Image downloaded.', ToastAndroid.SHORT);
            } catch (err) {
                console.error(err);
            }
        }
    
        async function share() {
            try {
                await Share.open({
                    filename: route.params.data.filename,
                    type: 'image/png',
                    url: route.params.data.uri,
                });
            } catch (err) {
                console.error(err);
            }
        }
    
        function remove() {
            const index = images.indexOf(route.params.data);
            images.splice(index, 1);
            setImages(images);
            navigation.goBack();
        }
    
        return (
            <SafeAreaView style={styles.main}>
                {route.params.data.render()}
                <Button title='Download' onPress={download}/>
                <Button title='Share' onPress={share}/>
                <Button title='Delete' onPress={remove}/>
            </SafeAreaView>
        );
    };

    return (
        <NavigationContainer>
            <Stack.Navigator>
                <Stack.Screen
                    name="Home"
                    component={HomeScreen} />
                <Stack.Screen
                    name="Photo"
                    component={PhotoScreen} />
            </Stack.Navigator>
        </NavigationContainer>
    );
};

export default App;
