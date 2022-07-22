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
