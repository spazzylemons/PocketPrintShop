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
