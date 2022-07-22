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
import { FlatList, Pressable, Text, View } from 'react-native';
import styles from '../styles';
import UsbSerial from '../UsbSerial';
import Button from '../Button';
import Navigation, { ConnectedDeviceContext, GalleryContext } from '../Navigation';

const HomeScreen = ({ navigation }: { navigation: Navigation }) => {
    const { current } = useContext(ConnectedDeviceContext);
    const { images } = useContext(GalleryContext);

    return <View style={styles.main}>
        {current !== null
            ? <Text style={styles.textLine}>Connected to {UsbSerial.getDeviceName(current)}</Text>
            : <Text style={styles.textLine}>Not connected</Text>
        }
        <Button
            onPress={() => navigation.navigate('Devices', {})}
            title='Devices'/>
        <FlatList
            data={images}
            renderItem={({ item }) => (
                <View style={styles.pictureFrame}>
                    <Pressable onPress={() => navigation.navigate('Photo', { image: item })}>
                        {item.render()}
                    </Pressable>
                </View>
            )}/>
        <Pressable style={{ position: 'absolute', bottom: 0 }} onPress={() => navigation.navigate('License', {})}>
            <Text style={styles.textLine}>License</Text>
        </Pressable>
    </View>;
};

export default HomeScreen;
