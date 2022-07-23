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
import android.graphics.BitmapFactory;
import android.util.Base64;

import org.junit.Assert;
import org.junit.Test;
import org.junit.runner.RunWith;
import org.robolectric.RobolectricTestRunner;
import org.robolectric.annotation.Config;

import java.nio.ByteBuffer;
import java.nio.ByteOrder;

@RunWith(RobolectricTestRunner.class)
@Config(application = TestApplication.class)
public class PngEncoderTest {
    private static byte[] intsToBytes(int[] ints) {
        ByteBuffer buffer = ByteBuffer.allocate(ints.length * 4).order(ByteOrder.nativeOrder());
        buffer.asIntBuffer().put(ints);
        return buffer.array();
    }

    @Test
    public void encodesCorrectly() throws Throwable {
        // note - tests seem to fail when alpha value is not 255, not an issue for us though since
        // our images won't be transparent
        int[] expected = new int[]{
                0xffbeefff, 0xffffbabe, 0xff133769,
                0xff123456, 0xff6789ab, 0xffffffff,
        };
        final int WIDTH = 3;
        final int HEIGHT = 2;
        MockPromise promise = new MockPromise();
        new PngEncoderModule(null)
                .encode(Base64.encodeToString(intsToBytes(expected), 0), WIDTH, HEIGHT, promise);
        byte[] compressed = Base64.decode((String) promise.get(), 0);
        Bitmap decompressed = BitmapFactory.decodeByteArray(compressed, 0, compressed.length);
        Assert.assertEquals(WIDTH, decompressed.getWidth());
        Assert.assertEquals(HEIGHT, decompressed.getHeight());
        int[] actual = new int[WIDTH * HEIGHT];
        decompressed.getPixels(actual, 0, WIDTH, 0, 0, WIDTH, HEIGHT);;
        Assert.assertArrayEquals(expected, actual);
    }

    @Test
    public void rejectsIfNotEnoughPixels() {
        Assert.assertThrows(Throwable.class, () -> {
            MockPromise promise = new MockPromise();
            new PngEncoderModule(null)
                    .encode("", 1, 1, promise);
            promise.get();
        });
    }

    @Test
    public void rejectsIfInvalidDimensions() {
        Assert.assertThrows(Throwable.class, () -> {
            MockPromise promise = new MockPromise();
            new PngEncoderModule(null)
                    .encode("", 1, 0, promise);
            promise.get();
        });

        Assert.assertThrows(Throwable.class, () -> {
            MockPromise promise = new MockPromise();
            new PngEncoderModule(null)
                    .encode("", 0, 1, promise);
            promise.get();
        });
    }
}
