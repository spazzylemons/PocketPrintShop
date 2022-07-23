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

import android.graphics.Bitmap;
import android.util.Base64;

import androidx.annotation.NonNull;

import com.facebook.react.bridge.Promise;
import com.facebook.react.bridge.ReactApplicationContext;
import com.facebook.react.bridge.ReactContextBaseJavaModule;
import com.facebook.react.bridge.ReactMethod;

import java.io.ByteArrayOutputStream;
import java.nio.ByteBuffer;
import java.nio.ByteOrder;
import java.nio.IntBuffer;

/**
 * A module that exposes the native function for encoding PNG images.
 */
public class PngEncoderModule extends ReactContextBaseJavaModule {
    /**
     * Create a new PngEncoderModule.
     * @param reactContext The context to connect this module to.
     */
    PngEncoderModule(@NonNull ReactApplicationContext reactContext) {
        super(reactContext);
    }

    @Override
    public @NonNull String getName() {
        return "PngEncoderModule";
    }

    /**
     * Encode a pixel bitmap as a PNG image.
     * @param pixelString Native-endian ARGB pixels, encoded in Base64.
     * @param width       The width of the image in pixels.
     * @param height      The height of the image in pixels.
     * @param promise     Resolves with the PNG data encoded in Base64, or rejects on failure.
     */
    @ReactMethod
    public void encode(@NonNull String pixelString, int width, int height, @NonNull Promise promise) {
        try {
            // decode the input into bytes
            byte[] pixelBytes = Base64.decode(pixelString, 0);
            // pack bytes using native endian
            IntBuffer buffer = ByteBuffer.wrap(pixelBytes).order(ByteOrder.nativeOrder()).asIntBuffer();
            int[] pixels = new int[buffer.capacity()];
            buffer.get(pixels);
            // create ARGB image
            Bitmap bitmap = Bitmap.createBitmap(pixels, width, height, Bitmap.Config.ARGB_8888);
            // compress to PNG
            ByteArrayOutputStream out = new ByteArrayOutputStream();
            bitmap.compress(Bitmap.CompressFormat.PNG, 100, out);
            // send PNG to javascript
            promise.resolve(Base64.encodeToString(out.toByteArray(), 0));
        } catch (Exception e) {
            promise.reject(e);
        }
    }
}
