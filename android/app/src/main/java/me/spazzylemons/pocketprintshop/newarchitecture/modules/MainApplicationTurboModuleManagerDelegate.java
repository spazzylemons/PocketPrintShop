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

package me.spazzylemons.pocketprintshop.newarchitecture.modules;

import com.facebook.jni.HybridData;
import com.facebook.react.ReactPackage;
import com.facebook.react.ReactPackageTurboModuleManagerDelegate;
import com.facebook.react.bridge.ReactApplicationContext;
import com.facebook.soloader.SoLoader;
import java.util.List;

/**
 * Class responsible to load the TurboModules. This class has native methods and needs a
 * corresponding C++ implementation/header file to work correctly (already placed inside the jni/
 * folder for you).
 *
 * <p>Please note that this class is used ONLY if you opt-in for the New Architecture (see the
 * `newArchEnabled` property). Is ignored otherwise.
 */
public class MainApplicationTurboModuleManagerDelegate
        extends ReactPackageTurboModuleManagerDelegate {

    private static volatile boolean sIsSoLibraryLoaded;

    protected MainApplicationTurboModuleManagerDelegate(
            ReactApplicationContext reactApplicationContext, List<ReactPackage> packages) {
        super(reactApplicationContext, packages);
    }

    protected native HybridData initHybrid();

    native boolean canCreateTurboModule(String moduleName);

    public static class Builder extends ReactPackageTurboModuleManagerDelegate.Builder {
        protected MainApplicationTurboModuleManagerDelegate build(
                ReactApplicationContext context, List<ReactPackage> packages) {
            return new MainApplicationTurboModuleManagerDelegate(context, packages);
        }
    }

    @Override
    protected synchronized void maybeLoadOtherSoLibraries() {
        if (!sIsSoLibraryLoaded) {
            // If you change the name of your application .so file in the Android.mk file,
            // make sure you update the name here as well.
            SoLoader.loadLibrary("pocketprintshop_appmodules");
            sIsSoLibraryLoaded = true;
        }
    }
}
