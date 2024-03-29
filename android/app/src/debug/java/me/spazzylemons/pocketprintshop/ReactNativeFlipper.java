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

import android.content.Context;

import com.facebook.flipper.android.AndroidFlipperClient;
import com.facebook.flipper.android.utils.FlipperUtils;
import com.facebook.flipper.core.FlipperClient;
import com.facebook.flipper.plugins.crashreporter.CrashReporterPlugin;
import com.facebook.flipper.plugins.databases.DatabasesFlipperPlugin;
import com.facebook.flipper.plugins.fresco.FrescoFlipperPlugin;
import com.facebook.flipper.plugins.inspector.DescriptorMapping;
import com.facebook.flipper.plugins.inspector.InspectorFlipperPlugin;
import com.facebook.flipper.plugins.network.FlipperOkhttpInterceptor;
import com.facebook.flipper.plugins.network.NetworkFlipperPlugin;
import com.facebook.flipper.plugins.react.ReactFlipperPlugin;
import com.facebook.flipper.plugins.sharedpreferences.SharedPreferencesFlipperPlugin;
import com.facebook.react.ReactInstanceEventListener;
import com.facebook.react.ReactInstanceManager;
import com.facebook.react.bridge.ReactContext;
import com.facebook.react.modules.network.NetworkingModule;

public class ReactNativeFlipper {
    public static void initializeFlipper(Context context, ReactInstanceManager reactInstanceManager) {
        if (FlipperUtils.shouldEnableFlipper(context)) {
            final FlipperClient client = AndroidFlipperClient.getInstance(context);

            client.addPlugin(new InspectorFlipperPlugin(context, DescriptorMapping.withDefaults()));
            client.addPlugin(new ReactFlipperPlugin());
            client.addPlugin(new DatabasesFlipperPlugin(context));
            client.addPlugin(new SharedPreferencesFlipperPlugin(context));
            client.addPlugin(CrashReporterPlugin.getInstance());

            NetworkFlipperPlugin networkFlipperPlugin = new NetworkFlipperPlugin();
            NetworkingModule.setCustomClientBuilder(
                    builder -> builder.addNetworkInterceptor(new FlipperOkhttpInterceptor(networkFlipperPlugin)));
            client.addPlugin(networkFlipperPlugin);
            client.start();

            // Fresco Plugin needs to ensure that ImagePipelineFactory is initialized
            // Hence we run if after all native modules have been initialized
            ReactContext reactContext = reactInstanceManager.getCurrentReactContext();
            if (reactContext == null) {
                reactInstanceManager.addReactInstanceEventListener(
                        new ReactInstanceEventListener() {
                            @Override
                            public void onReactContextInitialized(ReactContext reactContext) {
                                reactInstanceManager.removeReactInstanceEventListener(this);
                                reactContext.runOnNativeModulesQueueThread(
                                        () -> client.addPlugin(new FrescoFlipperPlugin()));
                            }
                        });
            } else {
                client.addPlugin(new FrescoFlipperPlugin());
            }
        }
    }
}
