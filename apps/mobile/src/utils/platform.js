import { Platform } from 'react-native';
import Constants from 'expo-constants';

export const isWeb = Platform.OS === 'web';
export const isExpoGo = Constants.appOwnership === 'expo';
export const isNative = Platform.OS === 'ios' || Platform.OS === 'android';

// Only use mobile-only features if it's native and NOT Expo Go (for some libs)
export const canUseMobileOnlyFeatures = isNative && !isExpoGo;
