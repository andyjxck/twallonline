import { StyleSheet, Platform, View } from 'react-native';
import { Image } from 'expo-image';

const patternUri = Platform.OS === 'web'
  ? require('../../assets/images/gback.png')
  : null;

export default function BackgroundPattern({ opacity = 0.075 }) {
  if (Platform.OS === 'web') {
    return (
      <View
        style={[
          StyleSheet.absoluteFill,
          {
            opacity,
            backgroundImage: `url(${typeof patternUri === 'object' ? patternUri.uri || patternUri.default || patternUri : patternUri})`,
            backgroundRepeat: 'repeat',
            backgroundSize: 'auto',
          },
        ]}
        pointerEvents="none"
      />
    );
  }

  return (
    <Image
      source={require('../../assets/images/gback.png')}
      style={[StyleSheet.absoluteFill, { opacity }]}
      contentFit="repeat"
      pointerEvents="none"
    />
  );
}
