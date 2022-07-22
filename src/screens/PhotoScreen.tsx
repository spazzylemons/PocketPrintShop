import React, { useContext } from 'react';
import { View } from 'react-native';
import styles from '../styles';
import Button from '../Button';

import Navigation, { GalleryContext, PhotoParams } from '../Navigation';


const PhotoScreen = ({ navigation, route }: { navigation: Navigation, route: { params: PhotoParams } }) => {
    const { images, setImages } = useContext(GalleryContext);
    const image = route.params.image;

    return <View style={styles.main}>
        <View style={styles.pictureFrame}>{image.render()}</View>
        <Button onPress={() => image.download()} title='Download'/>
        <Button onPress={() => image.share()} title='Share'/>
        <Button
            onPress={() => {
                setImages(images.filter(i => i !== image));
                navigation.goBack();
            }}
            title='Delete'/>
    </View>;
};

export default PhotoScreen;
