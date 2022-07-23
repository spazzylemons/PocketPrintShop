/**
 * Pocket Print Shop - Print portable game pictures from your phone
 * Copyright (C) 2022 spazzylemons
 *
 * This program is free software: you can redistribute it and/or modify
 * it under the terms of the GNU General Public License as published by
 * the Free Software Foundation, either version 3 of the License, or
 * (at your option) any later version.
 *
 * This program is distributed in the hope that it will be useful,
 * but WITHOUT ANY WARRANTY; without even the implied warranty of
 * MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
 * GNU General Public License for more details.
 *
 * You should have received a copy of the GNU General Public License
 * along with this program.  If not, see <https://www.gnu.org/licenses/>.
 */

import React, { useEffect, useState } from 'react';
import { ToastAndroid } from 'react-native';
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

        const updateDevices = () => {
            UsbSerial.listDevices()
                .then(setDevices)
                .catch(err => {
                    ToastAndroid.show('Failed to get device list: ' + err, ToastAndroid.LONG);
                });
        };

        updateDevices();

        UsbSerial.onListUpdate(updateDevices);
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
