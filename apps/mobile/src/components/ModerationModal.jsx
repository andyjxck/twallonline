import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, TextInput, Modal, ActivityIndicator } from 'react-native';
import { X, AlertTriangle, Link, Image as ImageIcon, User, Flag, Shield, Ban, Trash2, Info } from 'lucide-react-native';
import { useTheme } from "@/utils/ThemeContext";
import { BlurView } from 'expo-blur';
import * as Haptics from 'expo-haptics';
import { toast } from 'sonner-native';
import { supabase } from '@/utils/supabase';
import { getStoredUser } from '@/utils/user';

// Terms of Service aligned violation categories
const VIOLATION_CATEGORIES = {
  CONTENT: {
    title: 'Content Violations',
    icon: AlertTriangle,
    violations: [
      { id: 'sexually_explicit', label: 'Sexually explicit or pornographic content', description: 'Contains adult content' },
      { id: 'violence_gore', label: 'Violence, gore, or self-harm', description: 'Depicts violence or self-harm' },
      { id: 'hate_speech', label: 'Hate speech or discrimination', description: 'Targets protected groups' },
      { id: 'harassment', label: 'Harassment or bullying', description: 'Intimidates or threatens others' },
      { id: 'defamation', label: 'Defamatory or privacy invading', description: 'False claims or private info' },
      { id: 'illegal_content', label: 'Illegal activities or substances', description: 'Promotes illegal behavior' },
      { id: 'spam', label: 'Spam or fraudulent content', description: 'Misleading or deceptive' },
      { id: 'malware', label: 'Malware or harmful code', description: 'Contains malicious software' },
      { id: 'ip_infringement', label: 'IP infringement', description: 'Violates copyrights/trademarks' },
      { id: 'impersonation', label: 'Impersonation', description: 'Fake identity or business' },
      { id: 'misinformation', label: 'Misinformation', description: 'False or misleading information' },
      { id: 'minor_exploitation', label: 'Minor exploitation', description: 'Exploits or endangers minors' },
    ]
  },
  STORY: {
    title: 'Story Content Violations',
    icon: AlertTriangle,
    violations: [
      { id: 'spam_story', label: 'Spam or repetitive stories', description: 'Excessive or unwanted story content' },
      { id: 'inappropriate_story', label: 'Inappropriate story content', description: 'Offensive or unsuitable material' },
      { id: 'harassment_story', label: 'Harassment or bullying', description: 'Targeting or threatening others in stories' },
      { id: 'hate_speech_story', label: 'Hate speech', description: 'Discriminatory or offensive language' },
      { id: 'misinformation_story', label: 'False or misleading information', description: 'Sharing incorrect or harmful info' },
      { id: 'personal_info_story', label: 'Personal information sharing', description: 'Sharing private data about others' },
      { id: 'copyright_violation_story', label: 'Copyright infringement', description: 'Using others\' content without permission' },
      { id: 'violent_content_story', label: 'Violent or graphic content', description: 'Excessive violence or gore' },
      { id: 'sexual_content_story', label: 'Sexually explicit content', description: 'Adult or inappropriate sexual material' },
      { id: 'illegal_content_story', label: 'Illegal activities', description: 'Promoting illegal behavior or substances' },
    ]
  },
  POST: {
    title: 'Post Content Violations',
    icon: AlertTriangle,
    violations: [
      { id: 'spam_post', label: 'Spam or repetitive content', description: 'Excessive or unwanted posts' },
      { id: 'inappropriate_content', label: 'Inappropriate content', description: 'Offensive or unsuitable material' },
      { id: 'harassment', label: 'Harassment or bullying', description: 'Targeting or threatening others' },
      { id: 'hate_speech', label: 'Hate speech', description: 'Discriminatory or offensive language' },
      { id: 'misinformation', label: 'False or misleading information', description: 'Sharing incorrect or harmful info' },
      { id: 'personal_info', label: 'Personal information sharing', description: 'Sharing private data about others' },
      { id: 'copyright_violation', label: 'Copyright infringement', description: 'Using others\' content without permission' },
      { id: 'violent_content', label: 'Violent or graphic content', description: 'Excessive violence or gore' },
      { id: 'sexual_content', label: 'Sexually explicit content', description: 'Adult or inappropriate sexual material' },
      { id: 'illegal_content', label: 'Illegal activities', description: 'Promoting illegal behavior or substances' },
    ]
  },
  BUSINESS: {
    title: 'Business Listing Violations',
    icon: Trash2,
    violations: [
      { id: 'fake_business', label: 'Fake or non-existent business', description: 'Business does not exist' },
      { id: 'misleading_info', label: 'Misleading business information', description: 'Incorrect address, phone, etc.' },
      { id: 'inappropriate_image', label: 'Inappropriate business imagery', description: 'Unsuitable photos/logos' },
      { id: 'broken_links', label: 'Broken or malicious links', description: 'Links don\'t work or are harmful' },
      { id: 'unauthorized_business', label: 'Unauthorized business representation', description: 'Not authorized to represent business' },
      { id: 'spam_business', label: 'Spam or promotional abuse', description: 'Excessive self-promotion' },
    ]
  },
  TALENT: {
    title: 'Talent Profile Violations', 
    icon: Ban,
    violations: [
      { id: 'fake_talent', label: 'Fake talent profile', description: 'Person doesn\'t exist or is misrepresenting' },
      { id: 'inappropriate_content', label: 'Inappropriate talent content', description: 'Unsuitable portfolio/work' },
      { id: 'broken_links', label: 'Broken or malicious links', description: 'Social media links don\'t work' },
      { id: 'misrepresentation', label: 'Talent misrepresentation', description: 'False claims about skills/work' },
      { id: 'copyright_violation', label: 'Copyright violation', description: 'Using others\' work without permission' },
    ]
  },
  CONDUCT: {
    title: 'Platform Conduct',
    icon: Shield,
    violations: [
      { id: 'automated_abuse', label: 'Automated systems or bots', description: 'Using scripts/bots' },
      { id: 'data_harvesting', label: 'Data harvesting or scraping', description: 'Collecting user data' },
      { id: 'service_disruption', label: 'Service disruption', description: 'Interfering with platform' },
      { id: 'unauthorized_access', label: 'Unauthorized access attempts', description: 'Trying to breach security' },
      { id: 'commercial_solicitation', label: 'Unauthorized commercial use', description: 'Commercial activity without permission' },
      { id: 'fake_accounts', label: 'Fake accounts or inauthentic behavior', description: 'Multiple accounts or fake profiles' },
      { id: 'competition', label: 'Competitive analysis', description: 'Using platform to compete' },
    ]
  }
};

export default function ModerationModal({ 
  visible, 
  onClose, 
  itemType, // 'business' or 'talent' or 'post'
  itemId, 
  itemName,
  onActionComplete 
}) {
  const { theme, isLight } = useTheme();
  const [selectedViolations, setSelectedViolations] = useState(new Set());
  const [customReason, setCustomReason] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [currentUser, setCurrentUser] = useState(null);

  const toggleViolation = (violationId) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setSelectedViolations(prev => {
      const newSet = new Set(prev);
      if (newSet.has(violationId)) {
        newSet.delete(violationId);
      } else {
        newSet.add(violationId);
      }
      return newSet;
    });
  };

  useEffect(() => {
    const loadUser = async () => {
      const user = await getStoredUser();
      setCurrentUser(user);
    };
    loadUser();
  }, []);

  // Debug: Log when modal opens
  useEffect(() => {
    console.log('ModerationModal opened:', visible, 'itemType:', itemType, 'itemId:', itemId, 'itemName:', itemName);
  }, [visible, itemType, itemId, itemName]);

  const handleSubmit = async () => {
    if (selectedViolations.size === 0 && !customReason.trim()) {
      toast.error('Please select at least one violation or provide a custom reason');
      return;
    }

    if (!currentUser) {
      toast.error('User not authenticated');
      return;
    }

    setSubmitting(true);
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);

    try {
      // Get full violation details for storage
      const violationDetails = Array.from(selectedViolations).map(violationId => {
        // Find the violation in all categories
        for (const [categoryKey, category] of Object.entries(VIOLATION_CATEGORIES)) {
          const violation = category.violations.find(v => v.id === violationId);
          if (violation) {
            // Return immediately when found - don't continue checking other categories
            return {
              id: violation.id,
              label: violation.label,
              description: violation.description,
              category: categoryKey
            };
          }
        }
        return null;
      }).filter(Boolean);

      const structuredReason = {
        violations: violationDetails,
        custom_reason: customReason.trim(),
        moderator_id: currentUser.id,
        moderator_username: currentUser.username,
        timestamp: new Date().toISOString(),
        item_type: itemType,
        item_id: itemId,
        item_name: itemName
      };

      // Convert to string for storage
      const reasonString = JSON.stringify(structuredReason);

      // Update the item in database
      let error;
      
      if (itemType === 'post') {
        // Handle post moderation - blur the post
        const { error: postError } = await supabase
          .from('rposts')
          .update({ 
            is_blurred: true,
            blur_reason: reasonString
          })
          .eq('id', itemId);
        error = postError;
        
        if (!error) {
          toast.success('Post blurred');
        }
      } else if (itemType === 'story') {
        // Handle story moderation - blur the story
        const { error: storyError } = await supabase
          .from('rstories')
          .update({ 
            is_blurred: true,
            blur_reason: reasonString
          })
          .eq('id', itemId);
        error = storyError;
        
        if (!error) {
          toast.success('Story blurred');
        }
      } else {
        // Handle business/talent moderation
        const table = itemType === 'business' ? 'rbusinesses' : 'rtalent';
        const { error: listingError } = await supabase
          .from(table)
          .update({ 
            status: 'disabled',
            moderation_reason: reasonString,
            disabled_at: new Date().toISOString(),
            disabled_by: currentUser.id
          })
          .eq('id', itemId);
        error = listingError;
        
        if (!error) {
          toast.success(`${itemType === 'business' ? 'Business' : 'Talent'} listing disabled`);
        }
      }

      if (error) throw error;
      
      onActionComplete?.();
      onClose();
    } catch (error) {
      console.error('Moderation error:', error);
      toast.error('Failed to disable listing');
    } finally {
      setSubmitting(false);
    }
  };

  const dynamicStyles = StyleSheet.create({
    modalContainer: {
      flex: 1,
      justifyContent: 'center',
      alignItems: 'center',
      backgroundColor: 'rgba(0,0,0,0.5)',
    },
    modalContent: {
      width: '90%',
      height: '85%',
      maxHeight: '85%',
      backgroundColor: isLight ? '#FFFFFF' : theme.colors.background,
      borderRadius: 20,
      overflow: 'hidden',
    },
    header: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      padding: 20,
      borderBottomWidth: 1,
      borderBottomColor: theme.colors.border,
    },
    headerTitle: {
      fontSize: 18,
      fontWeight: '700',
      color: theme.colors.text,
    },
    content: {
      flex: 1,
      paddingHorizontal: 20,
    },
    categoryTitle: {
      fontSize: 16,
      fontWeight: '600',
      color: theme.colors.text,
      marginTop: 20,
      marginBottom: 12,
      flexDirection: 'row',
      alignItems: 'center',
    },
    violationItem: {
      backgroundColor: theme.colors.backgroundSecondary,
      borderRadius: 12,
      padding: 12,
      marginBottom: 8,
      borderWidth: 1,
      borderColor: theme.colors.border,
    },
    violationItemSelected: {
      backgroundColor: theme.colors.primary + '15',
      borderColor: theme.colors.primary,
    },
    violationLabel: {
      fontSize: 14,
      fontWeight: '600',
      color: theme.colors.text,
      marginBottom: 4,
    },
    violationDescription: {
      fontSize: 12,
      color: theme.colors.textSecondary,
    },
    customReasonContainer: {
      marginTop: 20,
      marginBottom: 20,
    },
    customReasonLabel: {
      fontSize: 14,
      fontWeight: '600',
      color: theme.colors.text,
      marginBottom: 8,
    },
    customReasonInput: {
      backgroundColor: theme.colors.backgroundSecondary,
      borderRadius: 12,
      padding: 12,
      fontSize: 14,
      color: theme.colors.text,
      borderWidth: 1,
      borderColor: theme.colors.border,
      minHeight: 80,
      textAlignVertical: 'top',
    },
    footer: {
      flexDirection: 'row',
      gap: 12,
      padding: 20,
      borderTopWidth: 1,
      borderTopColor: theme.colors.border,
    },
    cancelButton: {
      flex: 1,
      padding: 14,
      borderRadius: 12,
      backgroundColor: theme.colors.backgroundSecondary,
      alignItems: 'center',
    },
    cancelButtonText: {
      fontSize: 16,
      fontWeight: '600',
      color: theme.colors.text,
    },
    submitButton: {
      flex: 2,
      padding: 14,
      borderRadius: 12,
      backgroundColor: theme.colors.primary,
      alignItems: 'center',
    },
    submitButtonText: {
      fontSize: 16,
      fontWeight: '700',
      color: isLight ? '#000' : '#FFF',
    },
    submitButtonDisabled: {
      backgroundColor: theme.colors.textSecondary + '30',
    },
    infoBox: {
      backgroundColor: theme.colors.primary + '10',
      borderRadius: 12,
      padding: 12,
      marginBottom: 16,
      borderWidth: 1,
      borderColor: theme.colors.primary + '20',
    },
    infoText: {
      fontSize: 12,
      color: theme.colors.primary,
      lineHeight: 16,
    },
  });

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onClose}
    >
      <View style={dynamicStyles.modalContainer}>
        <View style={dynamicStyles.modalContent}>
          {/* Header */}
          <View style={dynamicStyles.header}>
            <Text style={dynamicStyles.headerTitle}>
              {itemType === 'post' ? 'Moderate Post' : itemType === 'story' ? 'Moderate Story' : 'Disable Listing'}
            </Text>
            <TouchableOpacity onPress={onClose}>
              <X size={24} color={theme.colors.text} />
            </TouchableOpacity>
          </View>

          {/* Content - Make it scrollable and taller */}
          <ScrollView style={{ maxHeight: '60%', padding: 20 }} showsVerticalScrollIndicator={false}>
            <Text style={{ color: theme.colors.text, fontSize: 16, marginBottom: 20 }}>
              {itemType === 'post' 
                ? 'Select all violations that apply. This will blur the post from public view but preserve the data for potential review.'
                : itemType === 'story'
                ? 'Select all violations that apply. This will blur the story from public view but preserve the data for potential review.'
                : 'Select all violations that apply. This will disable the listing from public view but preserve the data for potential re-enabling after corrections.'
              }
            </Text>

                        
            {/* Post Content Violations */}
            <View style={{ marginVertical: 20 }}>
              <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 15 }}>
                <AlertTriangle size={16} color={theme.colors.primary} style={{ marginRight: 8 }} />
                <Text style={{ color: theme.colors.text, fontSize: 16, fontWeight: 'bold' }}>Post Content Violations</Text>
              </View>
              
              {VIOLATION_CATEGORIES.POST.violations.map(violation => (
                <TouchableOpacity
                  key={violation.id}
                  style={{
                    backgroundColor: theme.colors.surface,
                    padding: 15,
                    marginBottom: 10,
                    borderRadius: 12,
                    borderWidth: 1,
                    borderColor: theme.colors.border
                  }}
                  onPress={() => toggleViolation(violation.id)}
                >
                  <Text style={{ color: theme.colors.text, fontSize: 14, fontWeight: '600', marginBottom: 4 }}>
                    {selectedViolations.has(violation.id) ? '✓ ' : ''}{violation.label}
                  </Text>
                  <Text style={{ color: theme.colors.textSecondary, fontSize: 12 }}>{violation.description}</Text>
                </TouchableOpacity>
              ))}
            </View>
            
            {/* Content Violations */}
            <View style={{ marginVertical: 20 }}>
              <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 15 }}>
                <AlertTriangle size={16} color={theme.colors.primary} style={{ marginRight: 8 }} />
                <Text style={{ color: theme.colors.text, fontSize: 16, fontWeight: 'bold' }}>Content Violations</Text>
              </View>
              
              {VIOLATION_CATEGORIES.CONTENT.violations.map(violation => (
                <TouchableOpacity
                  key={violation.id}
                  style={{
                    backgroundColor: theme.colors.surface,
                    padding: 15,
                    marginBottom: 10,
                    borderRadius: 12,
                    borderWidth: 1,
                    borderColor: theme.colors.border
                  }}
                  onPress={() => toggleViolation(violation.id)}
                >
                  <Text style={{ color: theme.colors.text, fontSize: 14, fontWeight: '600', marginBottom: 4 }}>
                    {selectedViolations.has(violation.id) ? '✓ ' : ''}{violation.label}
                  </Text>
                  <Text style={{ color: theme.colors.textSecondary, fontSize: 12 }}>{violation.description}</Text>
                </TouchableOpacity>
              ))}
            </View>

            {/* Custom Reason */}
            <View style={dynamicStyles.customReasonContainer}>
              <Text style={dynamicStyles.customReasonLabel}>Additional Details (Optional)</Text>
              <TextInput
                style={dynamicStyles.customReasonInput}
                value={customReason}
                onChangeText={setCustomReason}
                placeholder="Provide any additional context or specific details..."
                placeholderTextColor={theme.colors.textSecondary}
                multiline
              />
            </View>
          </ScrollView>

          {/* Footer */}
          <View style={dynamicStyles.footer}>
            <TouchableOpacity
              style={dynamicStyles.cancelButton}
              onPress={onClose}
              disabled={submitting}
            >
              <Text style={dynamicStyles.cancelButtonText}>Cancel</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[
                dynamicStyles.submitButton,
                (selectedViolations.size === 0 && !customReason.trim()) && dynamicStyles.submitButtonDisabled
              ]}
              onPress={handleSubmit}
              disabled={submitting || (selectedViolations.size === 0 && !customReason.trim())}
            >
              {submitting ? (
                <ActivityIndicator color={isLight ? '#000' : '#FFF'} />
              ) : (
                <Text style={dynamicStyles.submitButtonText}>
                  {itemType === 'post' ? 'Blur Post' : itemType === 'story' ? 'Blur Story' : 'Disable Listing'}
                </Text>
              )}
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
}
