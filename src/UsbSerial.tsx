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

    export function onListUpdate(callback: () => void): EmitterSubscription {
        return eventEmitter.addListener('usbSerialListUpdate', callback);
    }

    export function getDeviceName(device: UsbSerial.Device) {
        return device.name ?? `[id ${device.id}]`;
    }
}

export default UsbSerial;
