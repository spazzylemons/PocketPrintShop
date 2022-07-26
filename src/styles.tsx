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

import { StyleSheet } from 'react-native';
import { DefaultTheme } from '@react-navigation/native';

const colors = {
    darker: '#222',
    dark: '#444',
    light: '#ccc',
    lighter: '#fff',
};

const styles = StyleSheet.create({
    main: {
        backgroundColor: colors.darker,
        color: colors.lighter,
        flex: 1,
    },

    availableDevice: {
        backgroundColor: colors.dark,
        color: colors.light,
        fontSize: 24,
        padding: 8,
        textAlign: 'center',
    },

    connectedDevice: {
        backgroundColor: colors.light,
        color: colors.dark,
    },

    textLine: {
        color: colors.lighter,
        fontSize: 16,
        padding: 24,
        textAlign: 'center',
    },

    pictureFrame: {
        backgroundColor: colors.lighter,

        padding: 16,
        margin: 16,
        alignSelf: 'center',

        elevation: 3,
    },

    button: {
        backgroundColor: colors.light,

        alignSelf: 'center',
        borderRadius: 8,

        paddingVertical: 8,
        paddingHorizontal: 16,

        elevation: 3,

        margin: 8,
    },

    buttonText: {
        color: colors.darker,
        fontSize: 16,
    },

    license: {
        color: colors.lighter,
        fontFamily: 'monospace',
        fontSize: 8,
    },

    photoIcon: {
        padding: 16,
    },
});

export default styles;

export const NavigatorTheme = {
    dark: true,
    colors: {
        ...DefaultTheme.colors,
        primary: colors.dark,
        background: colors.darker,
        card: colors.dark,
        text: colors.lighter,
    }
};
