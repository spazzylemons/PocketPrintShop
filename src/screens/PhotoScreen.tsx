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

import React, { useContext } from 'react';
import { Pressable, ScrollView, View } from 'react-native';
import styles from '../styles';
import Icon from 'react-native-vector-icons/Feather';

import Navigation, { GalleryContext, PhotoParams } from '../Navigation';

const PhotoIcon = ({ name }: { name: string }) => (
    <Icon name={name} size={32} color={'#fff'} />
);

const PhotoScreen = ({ navigation, route }: { navigation: Navigation, route: { params: PhotoParams } }) => {
    const { images, setImages } = useContext(GalleryContext);
    const image = route.params.image;

    return <View style={styles.main}>
        <ScrollView>
            <View style={styles.pictureFrame}>{image.render()}</View>
            <View style={{ flexDirection: 'row', alignSelf: 'center' }}>
                <Pressable style={styles.photoIcon} onPress={image.download.bind(image)}>
                    <PhotoIcon name='download' />
                </Pressable>
                <Pressable style={styles.photoIcon} onPress={image.share.bind(image)}>
                    <PhotoIcon name='share' />
                </Pressable>
                <Pressable style={styles.photoIcon} onPress={() => {
                    setImages(images.filter(i => i !== image));
                    navigation.goBack();
                }}>
                    <PhotoIcon name='trash' />
                </Pressable>
            </View>
        </ScrollView>
    </View>;
};

export default PhotoScreen;
