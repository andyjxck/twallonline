import { StyleSheet } from 'react-native';
import { Image } from 'expo-image';

export default function BackgroundPattern({ opacity = 0.075 }) {
  return (
    <Image
      source={require('../../assets/images/gback.png')}
      style={[StyleSheet.absoluteFill, { opacity }]}
      contentFit="repeat"
      pointerEvents="none"
    />
  );
}
