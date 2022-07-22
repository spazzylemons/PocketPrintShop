import { Buffer } from 'buffer';
import { NativeEventEmitter, NativeModules } from 'react-native';
import type { EmitterSubscription } from 'react-native';

const { UsbSerialModule } = NativeModules;

const eventEmitter = new NativeEventEmitter(UsbSerialModule);

namespace UsbSerial {
    export type Device = { id: number, name: string | null };

    export function listDevices(): Promise<Device[]> {
        return UsbSerialModule.listDevices();
    }

    export function connect(deviceId: number): Promise<null> {
        return UsbSerialModule.connect(deviceId);
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

    export function getDeviceName(device: UsbSerial.Device) {
        return device.name ?? `[id ${device.id}]`;
    }
}

export default UsbSerial;
