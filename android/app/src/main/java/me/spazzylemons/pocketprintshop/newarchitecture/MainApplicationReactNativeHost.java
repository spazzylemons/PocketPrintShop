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

package me.spazzylemons.pocketprintshop.newarchitecture;

import android.app.Application;
import androidx.annotation.NonNull;
import com.facebook.react.PackageList;
import com.facebook.react.ReactInstanceManager;
import com.facebook.react.ReactNativeHost;
import com.facebook.react.ReactPackage;
import com.facebook.react.ReactPackageTurboModuleManagerDelegate;
import com.facebook.react.bridge.JSIModulePackage;
import com.facebook.react.bridge.JSIModuleProvider;
import com.facebook.react.bridge.JSIModuleSpec;
import com.facebook.react.bridge.JSIModuleType;
import com.facebook.react.bridge.UIManager;
import com.facebook.react.fabric.ComponentFactory;
import com.facebook.react.fabric.CoreComponentsRegistry;
import com.facebook.react.fabric.FabricJSIModuleProvider;
import com.facebook.react.fabric.ReactNativeConfig;
import com.facebook.react.uimanager.ViewManagerRegistry;
import me.spazzylemons.pocketprintshop.BuildConfig;
import me.spazzylemons.pocketprintshop.PngEncoderPackage;
import me.spazzylemons.pocketprintshop.UsbSerialPackage;
import me.spazzylemons.pocketprintshop.newarchitecture.components.MainComponentsRegistry;
import me.spazzylemons.pocketprintshop.newarchitecture.modules.MainApplicationTurboModuleManagerDelegate;

import java.util.ArrayList;
import java.util.List;

/**
 * A {@link ReactNativeHost} that helps you load everything needed for the New Architecture, both
 * TurboModule delegates and the Fabric Renderer.
 *
 * <p>Please note that this class is used ONLY if you opt-in for the New Architecture (see the
 * `newArchEnabled` property). Is ignored otherwise.
 */
public class MainApplicationReactNativeHost extends ReactNativeHost {
    public MainApplicationReactNativeHost(Application application) {
        super(application);
    }

    @Override
    public boolean getUseDeveloperSupport() {
        return BuildConfig.DEBUG;
    }

    @Override
    protected List<ReactPackage> getPackages() {
        List<ReactPackage> packages = new PackageList(this).getPackages();
        packages.add(new UsbSerialPackage());
        packages.add(new PngEncoderPackage());
        return packages;
    }

    @Override
    protected String getJSMainModuleName() {
        return "index";
    }

    @NonNull
    @Override
    protected ReactPackageTurboModuleManagerDelegate.Builder
    getReactPackageTurboModuleManagerDelegateBuilder() {
        // Here we provide the ReactPackageTurboModuleManagerDelegate Builder. This is necessary
        // for the new architecture and to use TurboModules correctly.
        return new MainApplicationTurboModuleManagerDelegate.Builder();
    }

    @Override
    protected JSIModulePackage getJSIModulePackage() {
        return (reactApplicationContext, jsContext) -> {
            @SuppressWarnings("rawtypes")
            final List<JSIModuleSpec> specs = new ArrayList<>();

            // Here we provide a new JSIModuleSpec that will be responsible of providing the
            // custom Fabric Components.
            specs.add(
                    new JSIModuleSpec<UIManager>() {
                        @Override
                        public JSIModuleType getJSIModuleType() {
                            return JSIModuleType.UIManager;
                        }

                        @Override
                        public JSIModuleProvider<UIManager> getJSIModuleProvider() {
                            final ComponentFactory componentFactory = new ComponentFactory();
                            CoreComponentsRegistry.register(componentFactory);

                            // Here we register a Components Registry.
                            // The one that is generated with the template contains no components
                            // and just provides you the one from React Native core.
                            MainComponentsRegistry.register(componentFactory);

                            final ReactInstanceManager reactInstanceManager = getReactInstanceManager();

                            ViewManagerRegistry viewManagerRegistry =
                                    new ViewManagerRegistry(
                                            reactInstanceManager.getOrCreateViewManagers(reactApplicationContext));

                            return new FabricJSIModuleProvider(
                                    reactApplicationContext,
                                    componentFactory,
                                    ReactNativeConfig.DEFAULT_CONFIG,
                                    viewManagerRegistry);
                        }
                    });
            return specs;
        };
    }
}
