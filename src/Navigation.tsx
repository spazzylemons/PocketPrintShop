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
