package com.pocketprintshop;

import android.graphics.Bitmap;
import android.util.Base64;
import android.util.Log;

import androidx.annotation.NonNull;

import com.facebook.react.bridge.Promise;
import com.facebook.react.bridge.ReactApplicationContext;
import com.facebook.react.bridge.ReactContextBaseJavaModule;
import com.facebook.react.bridge.ReactMethod;

import java.io.ByteArrayOutputStream;
import java.nio.ByteBuffer;
import java.nio.ByteOrder;
import java.nio.IntBuffer;

public class PngEncoderModule extends ReactContextBaseJavaModule {
    PngEncoderModule(ReactApplicationContext reactContext) {
        super(reactContext);
    }

    @Override
    public @NonNull String getName() {
        return "PngEncoderModule";
    }

    @ReactMethod
    public void encode(String pixelString, int width, int height, Promise promise) {
        Log.d("ENCODE", "GOT HERE 0");
        try {
            // decode the input into bytes
            byte[] pixelBytes = Base64.decode(pixelString, 0);
            // pack bytes big-endian
            IntBuffer buffer = ByteBuffer.wrap(pixelBytes).order(ByteOrder.BIG_ENDIAN).asIntBuffer();
            int[] pixels = new int[buffer.capacity()];;
            buffer.get(pixels);
            // create RGBA image
            Bitmap bitmap = Bitmap.createBitmap(pixels, width, height, Bitmap.Config.ARGB_8888);
            // compress to PNG
            ByteArrayOutputStream out = new ByteArrayOutputStream();
            bitmap.compress(Bitmap.CompressFormat.PNG, 100, out);
            // send PNG to javascript
            promise.resolve(Base64.encodeToString(out.toByteArray(), 0));
        } catch (Exception e) {
            promise.reject("failed to encode image", e);
        }
    }
}
