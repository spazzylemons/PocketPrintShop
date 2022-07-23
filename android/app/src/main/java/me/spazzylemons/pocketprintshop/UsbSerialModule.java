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

package me.spazzylemons.pocketprintshop;

import android.app.Activity;
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

import java.io.IOException;
import java.util.List;

public class UsbSerialModule extends ReactContextBaseJavaModule implements SerialInputOutputManager.Listener {
    private static final String INTENT = BuildConfig.APPLICATION_ID + ".GRANT_USB";

    private static final String DISCONNECT_EVENT = "usbSerialDisconnect";
    private static final String READ_EVENT = "usbSerialRead";
    private static final String LIST_UPDATE_EVENT = "usbSerialListUpdate";

    private UsbSerialPort currentPort = null;
    private SerialInputOutputManager ioManager = null;

    UsbSerialModule(ReactApplicationContext reactContext) {
        super(reactContext);
        IntentFilter filter = new IntentFilter();
        filter.addAction(UsbManager.ACTION_USB_DEVICE_ATTACHED);
        filter.addAction(UsbManager.ACTION_USB_DEVICE_DETACHED);
        UsbSerialModule that = this;
        reactContext.registerReceiver(new BroadcastReceiver() {
            @Override
            public void onReceive(Context context, Intent intent) {
                String action = intent.getAction();

                // update the device list when devices are attached or detached
                if (UsbManager.ACTION_USB_DEVICE_ATTACHED.equals(action)) {
                    that.sendEvent(LIST_UPDATE_EVENT, null);
                } else if (UsbManager.ACTION_USB_DEVICE_DETACHED.equals(action)) {
                    that.sendEvent(LIST_UPDATE_EVENT, null);
                }
            }
        }, filter);
    }

    @Override
    public @NonNull String getName() {
        return "UsbSerialModule";
    }

    private @NonNull Activity getActivity() {
        Activity activity = getCurrentActivity();
        if (activity == null) {
            throw new IllegalStateException("no current activity");
        }
        return activity;
    }

    private UsbManager getManager() {
        return (UsbManager) getActivity().getSystemService(Context.USB_SERVICE);
    }

    private List<UsbSerialDriver> findDrivers() {
        return UsbSerialProber.getDefaultProber().findAllDrivers(getManager());
    }

    private @Nullable UsbSerialDriver getDriverById(int id) {
        for (UsbSerialDriver driver : findDrivers()) {
            if (driver.getDevice().getDeviceId() == id) {
                return driver;
            }
        }
        return null;
    }

    private void sendEvent(String name, @Nullable WritableMap params) {
        getReactApplicationContext()
                .getJSModule(DeviceEventManagerModule.RCTDeviceEventEmitter.class)
                .emit(name, params);
    }

    private void doDisconnect() {
        synchronized (this) {
            if (currentPort == null) {
                return;
            }
            try {
                currentPort.close();
            } catch (IOException e) {
                e.printStackTrace();
            }
            currentPort = null;
            if (ioManager != null) {
                ioManager.setListener(null);
                ioManager.stop();
                ioManager = null;
            }
            sendEvent(DISCONNECT_EVENT, null);
        }
    }

    private void doConnect(UsbDeviceConnection connection, UsbSerialDriver driver) throws IOException {
        UsbSerialPort port = driver.getPorts().get(0);
        try {
            port.open(connection);
            port.setParameters(115200, 8, UsbSerialPort.STOPBITS_1, UsbSerialPort.PARITY_NONE);
            synchronized (this) {
                if (currentPort != null) {
                    port.close();
                    throw new IllegalStateException("already connected");
                }
                currentPort = port;
                port = null;
                ioManager = new SerialInputOutputManager(currentPort, this);
                ioManager.start();
            }
        } catch (Exception e) {
            if (port != null) port.close();
        }
    }

    @ReactMethod
    public void listDevices(Promise promise) {
        try {
            WritableArray result = Arguments.createArray();
            for (UsbSerialDriver driver : findDrivers()) {
                WritableMap map = Arguments.createMap();
                UsbDevice device = driver.getDevice();
                map.putInt("id", device.getDeviceId());
                map.putString("name", device.getProductName());
                result.pushMap(map);
            }
            promise.resolve(result);
        } catch (Exception e) {
            promise.reject("failed to list devices", e);
        }
    }

    // synchronized to avoid attempting multiple connections at the same time
    @ReactMethod
    public synchronized void connect(int deviceId, Promise promise) {
        try {
            UsbSerialDriver driver = getDriverById(deviceId);
            if (driver == null) {
                throw new IllegalArgumentException("device does not exist");
            }
            UsbDevice device = driver.getDevice();
            UsbDeviceConnection connection = getManager().openDevice(device);
            // if the connection was successful, use it
            if (connection != null) {
                try {
                    doConnect(connection, driver);
                } catch (Exception e) {
                    connection.close();
                    throw e;
                }
                promise.resolve(null);
                return;
            }
            if (getManager().hasPermission(device)) {
                // if we had permission, then we don't know why it failed
                throw new IOException("connection failed");
            }
            // ask for permission and fail
            PendingIntent pendingIntent;
            if (android.os.Build.VERSION.SDK_INT >= android.os.Build.VERSION_CODES.M) {
                pendingIntent = PendingIntent.getBroadcast(getCurrentActivity(), 0, new Intent(INTENT), PendingIntent.FLAG_IMMUTABLE);
            } else {
                pendingIntent = PendingIntent.getBroadcast(getCurrentActivity(), 0, new Intent(INTENT), 0);
            }
            getManager().requestPermission(device, pendingIntent);
            throw new RuntimeException("permission denied");
        } catch (Exception e) {
            promise.reject(e);
        }
    }

    @Override
    public void onNewData(byte[] data) {
        WritableMap map = Arguments.createMap();
        map.putString("data", Base64.encodeToString(data, 0));
        sendEvent(READ_EVENT, map);
    }

    @Override
    public void onRunError(Exception e) {
        doDisconnect();
    }

    @ReactMethod
    public void disconnect() {
        doDisconnect();
    }

    @ReactMethod
    public void addListener(String name) {
        // stub, silences a react warning
    }

    @ReactMethod
    public void removeListeners(int count) {
        // stub, silences a react warning
    }
}
