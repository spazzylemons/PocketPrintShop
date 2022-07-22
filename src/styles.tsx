import { StyleSheet } from 'react-native';

const styles = StyleSheet.create({
    main: {
        backgroundColor: 'white',
        color: 'black',
        flex: 1,
    },

    title: {
        padding: 10,
        fontSize: 24,
        backgroundColor: 'black',
        color: 'white',
        textAlign: 'center',
        fontWeight: 'bold',
    },

    availableDevice: {
        color: 'black',
        fontSize: 24,
        padding: 5,
        textAlign: 'center',
    },

    connectedDevice: {
        color: 'white',
        backgroundColor: 'black',
    },

    sectionHeader: {
        color: 'black',
        textAlign: 'center',
    },

    pictureFrame: {
        padding: 10,
        margin: 10,
        alignSelf: 'center',
    },
});

export default styles;
