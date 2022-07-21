import React, { useState } from 'react';

import { Buffer } from 'buffer';

import {
    Alert,
    FlatList,
    Image,
    NativeEventEmitter,
    NativeModules,
    SafeAreaView,
    Text,
    View,
} from 'react-native';

import type { EmitterSubscription } from 'react-native';

import styles from './styles';

const { PngEncoderModule, UsbSerialModule } = NativeModules;

/**
 * Allows asynchronoous reading of the printer packets.
 */
class AsyncStream {
    /** The current resolve() function for the pending available() call, if any. */
    public availableResolve: ((boolean) => void) | null;
    /** The queue of bytes read. */
    public dataQueue: number[];

    /**
     * Create a new AsyncStream.
     */
    constructor() {
        this.availableResolve = null;
        this.dataQueue = [];
    }

    /**
     * @return True if data is available.
     */
    public available(): Promise<boolean> {
        return new Promise((res, rej) => {
            this.availableResolve = res;
        });
    }

    /**
     * @param length The number of bytes to read.
     * @return The next bytes in the stream.
     */
    public async nextSlice(length: number): Promise<number[]> {
        while (this.dataQueue.length < length) {
            if (!await this.available()) {
                throw 'unexpected end of packet';
            }
        }
        return this.dataQueue.splice(0, length);
    }

    /**
     * @return The next byte in the stream.
     */
    public async next(): Promise<number> {
        return (await this.nextSlice(1))[0];
    }

    /**
     * @param value True if more data is available, false otherwise.
     */
    public setAvailable(value: boolean): void {
        if (this.availableResolve !== null) {
            this.availableResolve(value);
            this.availableResolve = null;
        }
    }
}

async function processData(stream: AsyncStream) {
    const width = 160;
    let height = 0;
    let vram: number[] = [];
    const imageParts: {
        payload: number[],
        pixels: number[],
    }[] = [];

    while (await stream.available()) {
        // get magic
        const magicLo = await stream.next();
        const magicHi = await stream.next();
        const magic = magicLo | (magicHi << 8);
        if (magic != 0x3388) {
            console.error('magic data missing - unreliable connection?');
            return null;
        }
        // get command
        const command = await stream.next();
        // get compression
        const compression = await stream.next();
        // get size
        const sizeLo = await stream.next();
        const sizeHi = await stream.next();
        const size = sizeLo | (sizeHi << 8);
        // get payload
        const payload = await stream.nextSlice(size);
        // get checksum
        const sumLo = await stream.next();
        const sumHi = await stream.next();
        const sum = sumLo | (sumHi << 8);
        let compare = command + compression + sizeLo + sizeHi;
        for (let k = 0; k < size; k++) {
            compare = (compare + payload[k]) & 0xffff;
        }
        // ignore ack
        await stream.next();
        // get status
        const status = await stream.next();
        // perform checksum check
        if (compare != sum) {
            if ((status & 1) == 0) {
                console.warn('checksum error but emulator did not report error - unreliable connection?');
            } else {
                continue;
            }
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

    const buffer = Buffer.alloc(width * height * 4);

    let y = 0;
    for (const { payload, pixels } of imageParts) {
        const palette = payload[2];
        let i = 0;
        while (i < pixels.length) {
            for (let x = 0; x < width; x += 8) {
                for (let py = 0; py < 8; py++) {
                    let lo = pixels[i++];
                    let hi = pixels[i++];
                    for (let px = 0; px < 8; px++) {
                        let index = 4 * (width * (y + py) + x + px);
                        const color = (3 - ((palette >> (2 * ((lo >> 7) + (2 * (hi >> 7))))) & 3));
                        buffer[index++] = 255;
                        buffer[index++] = color * 85;
                        buffer[index++] = color * 85;
                        buffer[index] = color * 85;
                        lo = (lo << 1) & 0xff;
                        hi = (hi << 1) & 0xff;
                    }
                }
            }
            y += 8;
        }
    }

    const source = 'data:image/png;base64,' + await PngEncoderModule.encode(buffer.toString('base64'), width, height);

    return <Image style={{ width, height }} source={{uri: source}} />;
}

let connectionInProgress = false;
let readListener: EmitterSubscription | null = null;

const eventEmitter = new NativeEventEmitter(UsbSerialModule);

const App = () => {
    // TODO is there some way to handle unexpected disconnect of the device?
    const [devices, setDevices] = useState([]);
    const [connectedDevice, setConnectedDevice] = useState(null);
    const [images, setImages] = useState<JSX.Element[]>([]);

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

        let timeout: NodeJS.Timeout | null = null;
        const stream = new AsyncStream();
        const promise = processData(stream);
        readListener = eventEmitter.addListener('usbSerialRead', ({data}) => {
            stream.dataQueue.push(...Buffer.from(data, 'base64'));
            stream.setAvailable(true);
            if (timeout !== null) {
                clearTimeout(timeout);
            }
            timeout = setTimeout(async () => {
                try {
                    stream.setAvailable(false);
                    timeout = null;
                    const image = await promise;
                    if (image !== null) {
                        setImages(images.concat([image]));
                    }
                } catch (err) {
                    console.error(err);
                }
            }, 1000);
        });
    };

    const renderDevice = ({item}) => {
        const deviceStyles: object[] = [styles.availableDevice];
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
