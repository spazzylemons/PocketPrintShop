/*
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

package me.spazzylemons.pocketprintshop;

import android.app.PendingIntent;
import android.content.BroadcastReceiver;
import android.content.Context;
import android.content.Intent;
import android.content.IntentFilter;
import android.hardware.usb.UsbDevice;
import android.hardware.usb.UsbDeviceConnection;
import android.hardware.usb.UsbManager;
import android.util.Base64;

import androidx.annotation.NonNull;
import androidx.annotation.Nullable;

import com.facebook.react.bridge.Arguments;
import com.facebook.react.bridge.Promise;
import com.facebook.react.bridge.ReactApplicationContext;
import com.facebook.react.bridge.ReactContextBaseJavaModule;
import com.facebook.react.bridge.ReactMethod;
import com.facebook.react.bridge.WritableArray;
import com.facebook.react.bridge.WritableMap;
import com.facebook.react.modules.core.DeviceEventManagerModule;
import com.hoho.android.usbserial.driver.UsbSerialDriver;
import com.hoho.android.usbserial.driver.UsbSerialPort;
import com.hoho.android.usbserial.driver.UsbSerialProber;
import com.hoho.android.usbserial.util.SerialInputOutputManager;

import java.io.Closeable;
import java.io.IOException;
import java.util.List;

/**
 * A module for handling a USB serial connection.
 */
public class UsbSerialModule extends ReactContextBaseJavaModule implements SerialInputOutputManager.Listener {
    /** The context that this module is connected to. */
    private final @NonNull ReactApplicationContext reactContext;
    /** The intent that is used for requesting permission. */
    private static final String INTENT = BuildConfig.APPLICATION_ID + ".GRANT_USB";
    /** The event ID for when the current device is disconnected. */
    private static final String DISCONNECT_EVENT = "usbSerialDisconnect";
    /** The event ID for when the current device has available data. */
    private static final String READ_EVENT = "usbSerialRead";
    /** The event ID for when the list of available devices may have changed. */
    private static final String LIST_UPDATE_EVENT = "usbSerialListUpdate";
    /** The current connection, or null if not connected. */
    private @Nullable Connection connection = null;

    /**
     * Create a new UsbSerialModule.
     * @param reactContext The context to connect this module to.
     */
    UsbSerialModule(@NonNull ReactApplicationContext reactContext) {
        super(reactContext);
        this.reactContext = reactContext;
        // register a receiver to handle changes in the USB device list
        IntentFilter filter = new IntentFilter();
        filter.addAction(UsbManager.ACTION_USB_DEVICE_ATTACHED);
        filter.addAction(UsbManager.ACTION_USB_DEVICE_DETACHED);
        reactContext.registerReceiver(new BroadcastReceiver() {
            @Override
            public void onReceive(Context context, Intent intent) {
                String action = intent.getAction();
                // update the device list when devices are attached or detached
                if (UsbManager.ACTION_USB_DEVICE_ATTACHED.equals(action)) {
                    UsbSerialModule.this.sendEvent(LIST_UPDATE_EVENT, null);
                } else if (UsbManager.ACTION_USB_DEVICE_DETACHED.equals(action)) {
                    UsbSerialModule.this.sendEvent(LIST_UPDATE_EVENT, null);
                }
            }
        }, filter);
    }

    @Override
    public @NonNull String getName() {
        return "UsbSerialModule";
    }

    @Override
    public void onNewData(@NonNull byte[] data) {
        WritableMap map = Arguments.createMap();
        map.putString("data", Base64.encodeToString(data, 0));
        this.sendEvent(READ_EVENT, map);
    }

    @Override
    public void onRunError(@NonNull Exception e) {
        this.disconnect();
    }

    /**
     * @return The USB manager. If not available, an exception is thrown.
     */
    private @NonNull UsbManager getManager() {
        Object result = reactContext.getSystemService(Context.USB_SERVICE);
        if (result == null) {
            throw new UnsupportedOperationException("USB not supported by this device");
        }
        return (UsbManager) result;
    }

    /**
     * @return The list of available USB drivers.
     */
    private @NonNull List<UsbSerialDriver> findDrivers() {
        return UsbSerialProber.getDefaultProber().findAllDrivers(this.getManager());
    }

    /**
     * @param id The ID of the device to find.
     * @return The driver for this USB device. If no device was found, an exception is thrown.
     */
    private @NonNull UsbSerialDriver getDriverById(int id) {
        for (UsbSerialDriver driver : this.findDrivers()) {
            if (driver.getDevice().getDeviceId() == id) {
                return driver;
            }
        }
        throw new IllegalArgumentException("device " + id + " not found");
    }

    /**
     * Send an event.
     * @param name   The name of the event to send.
     * @param params The parameters for this event, or null if no parameters should be sent.
     */
    private void sendEvent(@NonNull String name, @Nullable WritableMap params) {
        reactContext.getJSModule(DeviceEventManagerModule.RCTDeviceEventEmitter.class)
                .emit(name, params);
    }

    /**
     * List the available devices.
     * @param promise Resolves to a list of available device IDs and names, rejects on failure.
     */
    @ReactMethod
    public void listDevices(@NonNull Promise promise) {
        try {
            WritableArray result = Arguments.createArray();
            for (UsbSerialDriver driver : this.findDrivers()) {
                WritableMap map = Arguments.createMap();
                UsbDevice device = driver.getDevice();
                map.putInt("id", device.getDeviceId());
                map.putString("name", device.getProductName());
                result.pushMap(map);
            }
            promise.resolve(result);
        } catch (Exception e) {
            promise.reject(e);
        }
    }

    /**
     * Request permission to use a device.
     * @param device The device we want to use.
     */
    private void requestPermission(@NonNull UsbDevice device) {
        int flags = 0;
        if (android.os.Build.VERSION.SDK_INT >= android.os.Build.VERSION_CODES.M) {
            flags |= PendingIntent.FLAG_IMMUTABLE;
        }
        PendingIntent pendingIntent = PendingIntent.getBroadcast(this.reactContext, 0, new Intent(INTENT), flags);
        this.getManager().requestPermission(device, pendingIntent);
    }

    /**
     * Connect to the device with the given ID.
     * @param deviceId The ID of the device to connect to.
     * @param promise  Resolves on success, rejects on failure.
     */
    @ReactMethod
    public synchronized void connect(int deviceId, Promise promise) {
        try {
            UsbSerialDriver driver = this.getDriverById(deviceId);
            UsbDevice device = driver.getDevice();
            UsbDeviceConnection connection = this.getManager().openDevice(device);
            if (connection == null) {
                if (this.getManager().hasPermission(device)) {
                    // if we had permission, then we don't know why it failed
                    throw new IOException("connection failed");
                }
                // request permission and fail
                this.requestPermission(device);
                throw new RuntimeException("permission denied");
            }
            try {
                // create a new connection with the device
                Connection newConnection = new Connection(connection, driver.getPorts().get(0));
                if (this.connection != null) {
                    // fail if we're already connected
                    newConnection.close();
                    throw new IllegalStateException("already connected");
                }
                this.connection = newConnection;
            } catch (Exception e) {
                // clean up connection
                connection.close();
                throw e;
            }
            promise.resolve(null);
        } catch (Exception e) {
            promise.reject(e);
        }
    }

    /**
     * Disconnect from the current device. If not connected, this method does nothing.
     */
    @ReactMethod
    public synchronized void disconnect() {
        if (this.connection == null) return;
        try {
            this.connection.close();
        } catch (IOException e) {
            e.printStackTrace();
        }
        this.connection = null;
        this.sendEvent(DISCONNECT_EVENT, null);
    }

    /**
     * Stub method required to silence a warning from React.
     */
    @ReactMethod
    public void addListener(String name) {}

    /**
     * Stub method required to silence a warning from React.
     */
    @ReactMethod
    public void removeListeners(Integer count) {}

    /**
     * Abstracts the connection and disconnection progress.
     */
    private class Connection implements Closeable {
        /** The port that this connection refers to. */
        private final @NonNull UsbSerialPort port;
        /** The I/O manager that handles events for this connection. */
        private final @NonNull SerialInputOutputManager ioManager;

        /**
         * Create a new connection.
         * @param connection The connection to open.
         * @param port The port to open.
         * @throws IOException If connecting fails
         */
        Connection(
                @NonNull UsbDeviceConnection connection,
                @NonNull UsbSerialPort port
        ) throws IOException {
            this.port = port;
            this.port.open(connection);
            try {
                this.port.setParameters(115200, 8, UsbSerialPort.STOPBITS_1, UsbSerialPort.PARITY_NONE);
                this.ioManager = new SerialInputOutputManager(port, UsbSerialModule.this);
                this.ioManager.start();
            } catch (Exception e) {
                this.port.close();
                throw e;
            }
        }

        /**
         * Close the connection.
         * @throws IOException If closing the connection fails
         */
        @Override
        public void close() throws IOException {
            this.ioManager.setListener(null);
            this.ioManager.stop();
            this.port.close();
        }
    }
}
