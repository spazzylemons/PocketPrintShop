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

import androidx.annotation.NonNull;
import androidx.annotation.Nullable;

import com.facebook.react.bridge.Promise;
import com.facebook.react.bridge.WritableMap;

import org.junit.Assert;

public class MockPromise implements Promise {
    private boolean consumed = false;
    private @Nullable Object value = null;
    private @Nullable Throwable error = null;

    @Override
    public void resolve(@Nullable Object o) {
        Assert.assertFalse(this.consumed);
        this.value = o;
        this.consumed = true;
    }

    private void myReject(Throwable throwable) {
        Assert.assertFalse(this.consumed);
        this.error = throwable;
        this.consumed = true;
    }

    private void myReject(String s) {
        this.myReject(new RuntimeException(s));
    }

    @Override
    public void reject(String s, String s1) {
        this.myReject(s);
    }

    @Override
    public void reject(String s, Throwable throwable) {
        this.myReject(throwable);
    }

    @Override
    public void reject(String s, String s1, Throwable throwable) {
        this.myReject(throwable);
    }

    @Override
    public void reject(Throwable throwable) {
        this.myReject(throwable);
    }

    @Override
    public void reject(Throwable throwable, WritableMap writableMap) {
        this.myReject(throwable);
    }

    @Override
    public void reject(String s, @NonNull WritableMap writableMap) {
        this.myReject(s);
    }

    @Override
    public void reject(String s, Throwable throwable, WritableMap writableMap) {
        this.myReject(throwable);
    }

    @Override
    public void reject(String s, String s1, @NonNull WritableMap writableMap) {
        this.myReject(s);
    }

    @Override
    public void reject(String s, String s1, Throwable throwable, WritableMap writableMap) {
        this.myReject(throwable);
    }

    @Override
    public void reject(String s) {
        this.reject(s, null, new RuntimeException(s), null);
    }

    public Object get() throws Throwable {
        Assert.assertTrue(this.consumed);
        if (this.error != null) {
            throw this.error;
        }
        return this.value;
    }
}
