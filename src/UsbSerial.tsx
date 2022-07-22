import { Buffer } from 'buffer';
import { NativeEventEmitter, NativeModules } from 'react-native';
import type { EmitterSubscription } from 'react-native';

const { UsbSerialModule } = NativeModules;

const eventEmitter = new NativeEventEmitter(UsbSerialModule);

namespace UsbSerial {
    export function listDevices(): Promise<number[]> {
        return UsbSerialModule.listDevices();
    }

    export function connect(device: number): Promise<null> {
        return UsbSerialModule.connect(device);
    }

    export function disconnect(): void {
        UsbSerialModule.disconnect();
    }

    export function onDisconnect(callback: () => void): EmitterSubscription {
        return eventEmitter.addListener('usbSerialDisconnect', callback);
    }

    export function onRead(callback: (data: Buffer) => void): EmitterSubscription {
        return eventEmitter.addListener('usbSerialRead', ({ data }) => {
            callback(Buffer.from(data, 'base64'));
        });
    }
}

export default UsbSerial;
