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

import React, { useContext } from 'react';
import { FlatList, Text, ToastAndroid, View } from 'react-native';
import styles from '../styles';
import UsbSerial from '../UsbSerial';
import { DeviceListContext, ConnectedDeviceContext } from '../Navigation';

// TODO use ref
let connectionInProgress = false;

const DevicesScreen = () => {
    const { devices } = useContext(DeviceListContext);
    const { current, setCurrent } = useContext(ConnectedDeviceContext);

    const getDeviceStyles = (device: UsbSerial.Device) => {
        const deviceStyles: object[] = [styles.availableDevice];
        if (device.id === current?.id) {
            // show that it is connected
            deviceStyles.push(styles.connectedDevice);
        }
        return deviceStyles;
    };

    const connect = async (device: UsbSerial.Device) => {
        if (connectionInProgress) return;

        if (current?.id === device.id) {
            // if we're connected to this very device, we'll do a disconnect instead
            try {
                UsbSerial.disconnect();
            } catch (err) {
                console.log(err);
            }
        } else {
            if (current !== null) {
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
                await UsbSerial.connect(device.id);
                setCurrent(device);
            } catch (err) {
                ToastAndroid.show('Connection failed: ' + err, ToastAndroid.LONG);
            } finally {
                connectionInProgress = false;
            }
        }
    };

    return <View style={styles.main}>
        <FlatList
            data={devices}
            renderItem={({ item }) => (
                <Text style={getDeviceStyles(item)} onPress={() => connect(item)}>
                    {UsbSerial.getDeviceName(item)}
                </Text>
            )}/>
    </View>;
};

export default DevicesScreen;
