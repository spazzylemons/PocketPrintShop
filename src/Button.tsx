import React from 'react';
import { Pressable, Text } from 'react-native';
import styles from './styles';

interface ButtonProps {
    onPress: () => void,
    title: string,
};

const Button = (props: ButtonProps) => (
    <Pressable style={styles.button} onPress={props.onPress}>
        <Text style={styles.buttonText}>{props.title}</Text>
    </Pressable>
);

export default Button;
