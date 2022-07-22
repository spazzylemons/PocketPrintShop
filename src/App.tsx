import React, { useEffect, useState } from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { NavigatorTheme } from './styles';
import parsePackets, { PrinterImage } from './parsePackets';
import { DeviceListContext, ConnectedDeviceContext, GalleryContext } from './Navigation';
import UsbSerial from './UsbSerial';

// screens
import DevicesScreen from './screens/DevicesScreen';
import HomeScreen from './screens/HomeScreen';
import LicenseScreen from './screens/LicenseScreen';
import PhotoScreen from './screens/PhotoScreen';

const Stack = createNativeStackNavigator();

let addImage = (image: PrinterImage) => {};

const App = () => {
    const [devices, setDevices] = useState<UsbSerial.Device[]>([]);
    const deviceList = { devices, setDevices };

    const [current, setCurrent] = useState<UsbSerial.Device | null>(null);
    const connectedDevice = { current, setCurrent };

    const [images, setImages] = useState<PrinterImage[]>([]);
    const gallery = { images, setImages };

    addImage = image => {
        setImages(images.concat([image]));
    };

    useEffect(() => {
        const endData = parsePackets(image => {
            addImage(image);
        });

        UsbSerial.onDisconnect(() => {
            setCurrent(null);
            endData();
        });

        (async function checkDevices() {
            try {
                setDevices(await UsbSerial.listDevices());
            } catch (err) {
                console.error(err);
            }
            setTimeout(checkDevices, 1000);
        })();
    }, []);

    return (
        <DeviceListContext.Provider value={deviceList}>
            <ConnectedDeviceContext.Provider value={connectedDevice}>
                <GalleryContext.Provider value={gallery}>
                    <NavigationContainer theme={NavigatorTheme}>
                        <Stack.Navigator>
                            <Stack.Screen
                                name='Home'
                                component={HomeScreen} />
                            <Stack.Screen
                                name='Devices'
                                component={DevicesScreen} />
                            <Stack.Screen
                                name='Photo'
                                component={PhotoScreen} />
                            <Stack.Screen
                                name='License'
                                component={LicenseScreen} />
                        </Stack.Navigator>
                    </NavigationContainer>
            </GalleryContext.Provider>
            </ConnectedDeviceContext.Provider>
        </DeviceListContext.Provider>
    );
};

export default App;
