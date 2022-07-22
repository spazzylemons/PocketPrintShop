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

import React, { useEffect, useState } from 'react';
import { Linking, ScrollView, Text, ToastAndroid, View } from 'react-native';
import styles from '../styles';
import RNFS from 'react-native-fs';
import Button from '../Button';

const LicenseScreen = () => {
    const [licenseText, setLicenseText] = useState<string | null>(null);

    useEffect(() => {
        RNFS.readFileAssets('license.txt')
            .then(res => setLicenseText(res))
            .catch(err => console.error(err));
    }, []);

    return <View style={styles.main}>
        {licenseText !== null
            ? <ScrollView>
                <Text style={styles.license}>{licenseText}</Text>
            </ScrollView>
            : <View>
                <Text style={styles.textLine}>
                    This software is licensed under the GNU General Public License v3.
                </Text>
                <Button
                    onPress={async () => {
                        try {
                            await Linking.openURL('https://www.gnu.org/licenses/gpl-3.0.en.html');
                        } catch (err) {
                            ToastAndroid.show('Failed to open link: ' + err, ToastAndroid.LONG);
                        }
                    }}
                    title='View online'/>
            </View>}
    </View>;
};

export default LicenseScreen;
