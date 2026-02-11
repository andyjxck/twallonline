import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, Modal, TouchableOpacity, ScrollView } from 'react-native';
import { useTheme } from '@/utils/ThemeContext';
import { useAuth } from '@/utils/auth/useAuth';
import { supabase } from '@/utils/supabase';
import { AlertTriangle, ShieldAlert } from 'lucide-react-native';

export default function UserWarningOverlay() {
  const { auth, setAuth } = useAuth();
  const { theme } = useTheme();
  const [isVisible, setIsVisible] = useState(false);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (auth?.warning_count > 0) {
      const acknowledged = auth.acknowledged_warning_at;
      // If warning count has increased since last acknowledgment
      if (!acknowledged || new Date(auth.updated_at) > new Date(acknowledged)) {
          setIsVisible(true);
      }
    } else {
        setIsVisible(false);
    }
  }, [auth]);

  const handleAcknowledge = async () => {
    if (!auth?.id) return;
    setLoading(true);
    try {
      const now = new Date().toISOString();
      const { data, error } = await supabase
        .from('rusers')
        .update({ acknowledged_warning_at: now })
        .eq('id', auth.id)
        .select()
        .single();
      
      if (error) throw error;
      
      if (data) {
          setAuth(data);
      }
      setIsVisible(false);
    } catch (error) {
      console.error('Failed to acknowledge warning:', error);
    } finally {
      setLoading(false);
    }
  };

  if (!isVisible) return null;

  return (
    <Modal visible={isVisible} transparent animationType="fade">
      <View style={styles.overlay}>
        <View style={[styles.container, { backgroundColor: theme.colors.surface }]}>
          <View style={[styles.header, { backgroundColor: '#F59E0B' }]}>
            <AlertTriangle color="#FFF" size={32} />
            <Text style={styles.headerTitle}>OFFICIAL WARNING</Text>
          </View>

          <ScrollView style={styles.content}>
            <Text style={[styles.message, { color: theme.colors.text }]}>
              You have been issued a formal warning for violating our community guidelines.
            </Text>
            
            <View style={[styles.termsBox, { backgroundColor: theme.colors.background, borderColor: theme.colors.border }]}>
              <Text style={[styles.termsTitle, { color: theme.colors.text }]}>COMMUNITY GUIDELINES (EULA)</Text>
              <Text style={[styles.termsText, { color: theme.colors.textSecondary }]}>
                1. Zero tolerance for objectionable content.{"\n"}
                2. No abusive or harassing behavior.{"\n"}
                3. Content scanning and moderation are in effect.{"\n"}
                4. Repeat offenders will be permanently banned.
              </Text>
            </View>

            <View style={styles.warningAlert}>
              <ShieldAlert color="#EF4444" size={20} />
              <Text style={styles.warningAlertText}>
                This is your ONE AND ONLY warning. Any further violations will result in an immediate and permanent ban from the platform.
              </Text>
            </View>
          </ScrollView>

          <TouchableOpacity 
            style={[styles.button, { backgroundColor: theme.colors.primary }]} 
            onPress={handleAcknowledge}
            disabled={loading}
          >
            <Text style={styles.buttonText}>{loading ? 'Processing...' : 'I UNDERSTAND, THIS IS MY WARNING'}</Text>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.85)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  container: {
    width: '100%',
    maxWidth: 400,
    borderRadius: 20,
    overflow: 'hidden',
    elevation: 5,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
  },
  header: {
    padding: 30,
    alignItems: 'center',
    gap: 12,
  },
  headerTitle: {
    color: '#FFF',
    fontSize: 24,
    fontWeight: '900',
    letterSpacing: 1,
  },
  content: {
    padding: 20,
    maxHeight: 400,
  },
  message: {
    fontSize: 18,
    fontWeight: '600',
    textAlign: 'center',
    marginBottom: 20,
    lineHeight: 26,
  },
  termsBox: {
    padding: 15,
    borderRadius: 12,
    borderWidth: 1,
    marginBottom: 20,
  },
  termsTitle: {
    fontSize: 14,
    fontWeight: '700',
    marginBottom: 8,
    textAlign: 'center',
  },
  termsText: {
    fontSize: 13,
    lineHeight: 20,
  },
  warningAlert: {
    flexDirection: 'row',
    backgroundColor: 'rgba(239, 68, 68, 0.1)',
    padding: 15,
    borderRadius: 12,
    gap: 12,
    alignItems: 'center',
    marginBottom: 20,
  },
  warningAlertText: {
    color: '#EF4444',
    fontSize: 14,
    fontWeight: '700',
    flex: 1,
    lineHeight: 20,
  },
  button: {
    margin: 20,
    padding: 18,
    borderRadius: 12,
    alignItems: 'center',
  },
  buttonText: {
    color: '#FFF',
    fontSize: 16,
    fontWeight: '800',
  },
});
