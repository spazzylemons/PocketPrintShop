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

import { createContext } from 'react';
import type { PrinterImage } from './parsePackets';
import type { NavigationHelpers } from '@react-navigation/native';
import UsbSerial from './UsbSerial';

interface DeviceList {
    devices: UsbSerial.Device[],
    setDevices: (devices: UsbSerial.Device[]) => void,
};

interface ConnectedDevice {
    current: UsbSerial.Device | null,
    setCurrent: (current: UsbSerial.Device | null) => void,
};

interface Images {
    images: PrinterImage[],
    setImages: (images: PrinterImage[]) => void,
}

export const DeviceListContext = createContext<DeviceList>({ devices: [], setDevices: () => {} });
export const ConnectedDeviceContext = createContext<ConnectedDevice>({ current: null, setCurrent: () => {} });
export const GalleryContext = createContext<Images>({ images: [], setImages: () => {} });

export interface PhotoParams { image: PrinterImage };

type Navigation = NavigationHelpers<{
    Home: {},
    Devices: {},
    Photo: PhotoParams,
    License: {},
}>;

export default Navigation;
