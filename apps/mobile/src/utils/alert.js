import { Alert, Platform } from 'react-native';

/**
 * Cross-platform alert that works on web (window.confirm/alert) and native (Alert.alert).
 * 
 * Usage mirrors Alert.alert(title, message, buttons) but works on web too.
 * On web, destructive/default buttons become confirm/cancel in window.confirm().
 * If there's only one button (info alert), uses window.alert() on web.
 */
export function crossAlert(title, message, buttons = [{ text: 'OK' }]) {
  if (Platform.OS !== 'web') {
    Alert.alert(title, message, buttons);
    return;
  }

  // Web fallback
  if (buttons.length <= 1) {
    window.alert(message ? `${title}\n\n${message}` : title);
    const btn = buttons[0];
    if (btn?.onPress) btn.onPress();
    return;
  }

  // Find the action button (destructive or non-cancel)
  const cancelBtn = buttons.find(b => b.style === 'cancel');
  const actionBtn = buttons.find(b => b.style !== 'cancel') || buttons[buttons.length - 1];

  const confirmed = window.confirm(message ? `${title}\n\n${message}` : title);
  if (confirmed) {
    if (actionBtn?.onPress) actionBtn.onPress();
  } else {
    if (cancelBtn?.onPress) cancelBtn.onPress();
  }
}
