package com.pocketprintshop;

import android.annotation.SuppressLint;
import android.app.Activity;
import android.app.PendingIntent;
import android.content.BroadcastReceiver;
import android.content.Context;
import android.content.Intent;
import android.hardware.usb.UsbDevice;
import android.hardware.usb.UsbDeviceConnection;
import android.hardware.usb.UsbManager;
import android.util.Base64;

import androidx.annotation.NonNull;
import androidx.annotation.Nullable;

import com.facebook.react.bridge.Arguments;
import com.facebook.react.bridge.Callback;
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

    private UsbSerialPort currentPort = null;
    private SerialInputOutputManager ioManager = null;

    UsbSerialModule(ReactApplicationContext reactContext) {
        super(reactContext);
    }

    @Override
    public @NonNull String getName() {
        return "UsbSerialModule";
    }

    private UsbManager getManager() {
        Activity activity = getCurrentActivity();
        if (activity == null) {
            throw new IllegalStateException("no current activity");
        }
        return (UsbManager) activity.getSystemService(Context.USB_SERVICE);
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

    @ReactMethod
    public void listDevices(Promise promise) {
        try {
            WritableArray result = Arguments.createArray();
            for (UsbSerialDriver driver : findDrivers()) {
                result.pushInt(driver.getDevice().getDeviceId());
            }
            promise.resolve(result);
        } catch (Exception e) {
            promise.reject("failed to list devices", e);
        }
    }

    @ReactMethod
    public void connect(int deviceId, Promise promise) {
        try {
            UsbSerialDriver driver = getDriverById(deviceId);
            if (driver == null) {
                throw new IllegalArgumentException("device does not exist");
            }
            UsbDevice device = driver.getDevice();
            UsbDeviceConnection conn = getManager().openDevice(device);
            if (conn == null) {
                UsbManager manager = getManager();
                if (!manager.hasPermission(device)) {
                    // request permission so we'll hopefully have it later
                    PendingIntent intent;
                    if (android.os.Build.VERSION.SDK_INT >= android.os.Build.VERSION_CODES.M) {
                        intent = PendingIntent.getBroadcast(getCurrentActivity(), 0, new Intent(INTENT), PendingIntent.FLAG_IMMUTABLE);
                    } else {
                        intent = PendingIntent.getBroadcast(getCurrentActivity(), 0, new Intent(INTENT), 0);
                    }
                    manager.requestPermission(device, intent);
                    throw new RuntimeException("permission denied");
                }
                throw new RuntimeException("connection failed");
            }
            UsbSerialPort port = driver.getPorts().get(0);
            port.open(conn);
            port.setParameters(115200, 8, UsbSerialPort.STOPBITS_1, UsbSerialPort.PARITY_NONE);
            synchronized (this) {
                if (currentPort != null) {
                    port.close();
                    throw new IllegalStateException("already connected");
                }
                currentPort = port;
                ioManager = new SerialInputOutputManager(port, this);
                ioManager.start();
                promise.resolve(null);
            }
        } catch (Exception e) {
            promise.reject("failed to connect", e);
        }
    }

    @Override
    public void onNewData(byte[] data) {
        synchronized (this) {
            WritableMap map = Arguments.createMap();
            map.putString("data", Base64.encodeToString(data, 0));
            sendEvent(READ_EVENT, map);
        }
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
