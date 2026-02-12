import React, { useState, useEffect, useCallback } from 'react';
import { View, Text, TouchableOpacity, Modal, StyleSheet, Platform } from 'react-native';
import { useTheme } from '../utils/ThemeContext';

// Global event system for triggering alerts from anywhere
const listeners = new Set();

export function showAlert(title, message, buttons) {
  listeners.forEach(fn => fn({ title, message, buttons }));
}

export function AlertProvider() {
  const { theme } = useTheme();
  const [alert, setAlert] = useState(null);

  useEffect(() => {
    const handler = (data) => setAlert(data);
    listeners.add(handler);
    return () => listeners.delete(handler);
  }, []);

  const dismiss = useCallback(() => setAlert(null), []);

  const handleButton = useCallback((btn) => {
    dismiss();
    if (btn?.onPress) {
      // Small delay so modal closes before action runs
      setTimeout(() => btn.onPress(), 100);
    }
  }, [dismiss]);

  if (!alert) return null;

  const { title, message, buttons = [{ text: 'OK' }] } = alert;
  const cancelBtn = buttons.find(b => b.style === 'cancel');
  const actionButtons = buttons.filter(b => b.style !== 'cancel');

  return (
    <Modal transparent visible animationType="fade" onRequestClose={dismiss}>
      <View style={styles.backdrop}>
        <TouchableOpacity style={StyleSheet.absoluteFill} onPress={dismiss} activeOpacity={1} />
        <View style={[styles.card, { backgroundColor: theme.colors.surface, borderColor: theme.colors.border }]}>
          <Text style={[styles.title, { color: theme.colors.text }]}>{title}</Text>
          {message ? <Text style={[styles.message, { color: theme.colors.textSecondary }]}>{message}</Text> : null}
          
          <View style={styles.buttonRow}>
            {cancelBtn && (
              <TouchableOpacity
                onPress={() => handleButton(cancelBtn)}
                style={[styles.btn, styles.cancelBtn, { borderColor: theme.colors.border }]}
                activeOpacity={0.7}
              >
                <Text style={[styles.btnText, { color: theme.colors.textSecondary }]}>{cancelBtn.text || 'Cancel'}</Text>
              </TouchableOpacity>
            )}
            {actionButtons.map((btn, i) => (
              <TouchableOpacity
                key={i}
                onPress={() => handleButton(btn)}
                style={[
                  styles.btn,
                  styles.actionBtn,
                  { backgroundColor: btn.style === 'destructive' ? '#EF4444' : theme.colors.primary }
                ]}
                activeOpacity={0.7}
              >
                <Text style={[styles.btnText, { color: btn.style === 'destructive' ? '#FFF' : '#000', fontWeight: '700' }]}>
                  {btn.text}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.6)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  card: {
    width: '100%',
    maxWidth: 380,
    borderRadius: 16,
    padding: 24,
    borderWidth: 1,
    ...(Platform.OS === 'web' ? { boxShadow: '0 20px 60px rgba(0,0,0,0.5)' } : {}),
  },
  title: {
    fontSize: 18,
    fontWeight: '700',
    marginBottom: 8,
  },
  message: {
    fontSize: 14,
    lineHeight: 20,
    marginBottom: 20,
  },
  buttonRow: {
    flexDirection: 'row',
    gap: 10,
    justifyContent: 'flex-end',
  },
  btn: {
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 10,
    minWidth: 80,
    alignItems: 'center',
  },
  cancelBtn: {
    borderWidth: 1,
  },
  actionBtn: {},
  btnText: {
    fontSize: 14,
    fontWeight: '600',
  },
});
