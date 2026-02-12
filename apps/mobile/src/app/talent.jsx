import React, { useState, useEffect, useMemo } from 'react';
import { View, Text, StyleSheet, TextInput, TouchableOpacity, ScrollView, Alert, ActivityIndicator, Modal, Image, Platform, FlatList, Linking, Dimensions } from 'react-native';
import { useRouter } from 'expo-router';
import { ChevronLeft, Music, Youtube, Globe, Info, Plus, ExternalLink, ShieldCheck, Instagram, CheckCircle2, Star, Camera, Search, X, Facebook, Trash2, Link as LinkIcon } from 'lucide-react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { useTheme } from "@/utils/ThemeContext";
import { BlurView } from 'expo-blur';
import * as Haptics from 'expo-haptics';
import { supabase } from '@/utils/supabase';

let Purchases;
if (Platform.OS !== 'web') {
  Purchases = require('react-native-purchases').default;
}
import { decode } from 'base64-arraybuffer';
import * as ImagePicker from 'expo-image-picker';
import { getStoredUser } from '@/utils/user';
import { useLocationStore } from "@/utils/locationStore";
import { goBack } from "@/utils/navigation";
import { crossAlert } from "@/utils/alert";
import { toast } from 'sonner-native';
import { useAuthStore } from '@/utils/auth';
import { BadgeCheck } from 'lucide-react-native';

export default function LocalTalent() {
  const { theme, isHippie, isLight } = useTheme();
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [talents, setTalents] = useState([]);
  const [myShowcases, setMyShowcases] = useState([]);
  const [currentUser, setCurrentUser] = useState(null);
  const [showModal, setShowModal] = useState(false);
    const [showEditModal, setShowEditModal] = useState(false);
    const [showLinksModal, setShowLinksModal] = useState(false);
    const [selectedTalent, setSelectedTalent] = useState(null);
    const [editForm, setEditForm] = useState(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState(null);
  const { width } = Dimensions.get('window');

  const dynamicStyles = useMemo(() => StyleSheet.create({
    headerTitle: { ...styles.headerTitle, color: theme.colors.text },
    categoryPillText: { ...styles.categoryPillText, color: theme.colors.textSecondary },
    activeCategoryPillText: { ...styles.activeCategoryPillText, color: isLight ? '#FFF' : '#000' },
    talentNameSmall: { ...styles.talentNameSmall, color: theme.colors.text },
    talentTitleSmall: { ...styles.talentTitleSmall, color: theme.colors.textSecondary },
    emptyText: { ...styles.emptyText, color: theme.colors.text },
    emptySubtext: { ...styles.emptySubtext, color: theme.colors.textSecondary },
    modalTitle: { ...styles.modalTitle, color: theme.colors.text },
    label: { ...styles.label, color: theme.colors.textSecondary },
    input: { ...styles.input, color: theme.colors.text, borderBottomColor: theme.colors.border },
    miniButtonText: { ...styles.miniButtonText, color: theme.colors.text },
    activeMiniButtonText: { color: isLight ? '#FFF' : '#000' },
    platformText: { ...styles.platformText, color: theme.colors.text },
    activePlatformText: { color: isLight ? '#FFF' : '#000' },
    submitButtonText: { ...styles.submitButtonText, color: isLight ? '#FFF' : '#000' },
  }), [theme, isLight]);
  
  const { city_id } = useLocationStore();
  const { create } = router.params || {};

  useEffect(() => {
    if (create === 'true') {
      setShowModal(true);
      router.setParams({ create: undefined });
    }
  }, [create]);
  
  const categories = ['YouTuber', 'Podcaster', 'Musician', 'Artist', 'Developer', 'Photography', 'Other'];

  const [form, setForm] = useState({
      name: '',
      title: '',
      platform: 'Youtube',
        link: '',
        description: '',
        category: 'YouTuber',
        avatar: null,
        links: []
      });

  useEffect(() => {
    initUser();
    fetchTalents();

    const channel = supabase
      .channel('rtalent_changes')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'rtalent' }, () => {
        fetchTalents();
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  const initUser = async () => {
    const user = await getStoredUser();
    setCurrentUser(user);
  };

  const fetchTalents = async () => {
    try {
      const user = await getStoredUser();
      
      const { data, error } = await supabase
        .from('rtalent')
        .select('*')
        .eq('is_deleted', false)
        .or(`status.eq.approved,user_id.eq.${user?.id || 0}`);

      if (error) throw error;
      
if (user?.id) {
          const myItems = data?.filter(t => t.user_id === user.id) || [];
          setMyShowcases(myItems);
          setTalents(data || []);
        } else {
          setMyShowcases([]);
          setTalents(data || []);
        }
    } catch (error) {
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  const pickImage = async () => {
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.5,
      base64: true,
    });

    if (!result.canceled) {
      setForm({ ...form, avatar: result.assets[0] });
    }
  };

  const uploadImage = async (userId) => {
    if (!form.avatar) return null;
    
    try {
      const fileName = `${userId || 'anon'}_${Date.now()}.jpg`;
      const filePath = `avatars/${fileName}`;
      
      const { data, error } = await supabase.storage
        .from('talent_avatars')
        .upload(filePath, decode(form.avatar.base64), {
          contentType: 'image/jpeg',
          upsert: true
        });

      if (error) throw error;
      
      const { data: { publicUrl } } = supabase.storage
        .from('talent_avatars')
        .getPublicUrl(filePath);
        
      return publicUrl;
    } catch (error) {
      console.error("Upload error:", error);
      return null;
    }
  };

  const handlePurchaseAndSubmit = async () => {
    if (!currentUser) {
      crossAlert("Account Required", "Please create an account or sign in to purchase a talent showcase.", [
        { text: "Cancel", style: "cancel" },
        { text: "Sign In", onPress: () => router.push("/auth?mode=login") },
      ]);
      return;
    }

    if (!form.name || !form.title || !form.link) {
      toast.error("Please fill in your name, title, and link.");
      return;
    }

    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    setSubmitting(true);

    try {
      const apiKey = process.env.EXPO_PUBLIC_REVENUECAT_APPLE_API_KEY;
      
      if (!apiKey) {
        // Fallback for development if no API key is provided yet
        crossAlert(
          "Development Mode",
          "No RevenueCat API key found. Would you like to proceed with a mock submission?",
          [
            { text: "Cancel", onPress: () => setSubmitting(false), style: "cancel" },
            { text: "Mock Submit", onPress: () => submitTalent('mock_paid') }
          ]
        );
        return;
      }

      const offerings = await Purchases.getOfferings();
      // Use the talent_showcase offering specifically
      const talentOffering = offerings.all?.['talent_showcase'] || offerings.current;
      
      if (talentOffering && talentOffering.availablePackages.length > 0) {
        const pkg = talentOffering.availablePackages.find(p => p.product.identifier === 'com.andysocial.townwall.talent.showcase1') || talentOffering.availablePackages[0];
        console.log('Selected package:', pkg.product.identifier);
        const { customerInfo } = await Purchases.purchasePackage(pkg);
        
        if (customerInfo) {
          await submitTalent('paid');
        }
      } else {
        throw new Error("No offerings available.");
      }
    } catch (e) {
      console.error('RevenueCat Error:', e);
      if (!e.userCancelled) {
        toast.error("There was a problem with the App Store.");
      }
      setSubmitting(false);
    }
  };

    const addLink = (isEdit = false) => {
      const newLink = { id: Date.now().toString(), label: '', url: '', description: '' };
      if (isEdit) {
        setEditForm({ ...editForm, links: [...(editForm.links || []), newLink] });
      } else {
        setForm({ ...form, links: [...(form.links || []), newLink] });
      }
    };

    const removeLink = (id, isEdit = false) => {
      if (isEdit) {
        setEditForm({ ...editForm, links: editForm.links.filter(l => l.id !== id) });
      } else {
        setForm({ ...form, links: form.links.filter(l => l.id !== id) });
      }
    };

    const updateLink = (id, field, value, isEdit = false) => {
      if (isEdit) {
        setEditForm({
          ...editForm,
          links: editForm.links.map(l => l.id === id ? { ...l, [field]: value } : l)
        });
      } else {
        setForm({
          ...form,
          links: form.links.map(l => l.id === id ? { ...l, [field]: value } : l)
        });
      }
    };

    const renderLinksManager = (links, isEdit) => {
      const safeLinks = Array.isArray(links) ? links : [];
      return (
      <View style={styles.linksManagerContainer}>
        <View style={styles.linksHeader}>
          <Text style={dynamicStyles.label}>ADDITIONAL LINKS (LINKTREE STYLE)</Text>
          <TouchableOpacity onPress={() => addLink(isEdit)} style={[styles.addLinkButton, { backgroundColor: theme.colors.primary }]}>
            <Plus size={14} color={isLight ? '#FFF' : '#000'} />
          </TouchableOpacity>
        </View>
        {safeLinks.map((link, index) => (
          <View key={link.id} style={[styles.linkCard, { backgroundColor: theme.colors.surface, borderColor: theme.colors.border }]}>
            <View style={styles.linkCardHeader}>
              <LinkIcon size={16} color={theme.colors.primary} />
              <TouchableOpacity onPress={() => removeLink(link.id, isEdit)}>
                <Trash2 size={16} color="#EF4444" />
              </TouchableOpacity>
            </View>
            <TextInput
              style={[styles.linkInput, { color: theme.colors.text, borderBottomColor: theme.colors.border }]}
              placeholder="Label (e.g. Instagram, Portfolio, Spotify)"
              placeholderTextColor={theme.colors.textSecondary}
              value={link.label}
              onChangeText={(t) => updateLink(link.id, 'label', t, isEdit)}
            />
            <TextInput
              style={[styles.linkInput, { color: theme.colors.text, borderBottomColor: theme.colors.border }]}
              placeholder="URL (https://...)"
              placeholderTextColor={theme.colors.textSecondary}
              autoCapitalize="none"
              value={link.url}
              onChangeText={(t) => updateLink(link.id, 'url', t, isEdit)}
            />
            <TextInput
              style={[styles.linkInput, { color: theme.colors.text, borderBottomColor: theme.colors.border }]}
              placeholder="Short Description (Optional)"
              placeholderTextColor={theme.colors.textSecondary}
              value={link.description}
              onChangeText={(t) => updateLink(link.id, 'description', t, isEdit)}
            />
          </View>
        ))}
        {safeLinks.length === 0 && (
          <Text style={{ fontSize: 11, color: theme.colors.textSecondary, fontStyle: 'italic', marginTop: 4 }}>
            No additional links added yet.
          </Text>
        )}
      </View>
    );
    };

    const LinksDisplayModal = () => {
      if (!selectedTalent) return null;
      
      const allLinks = [];
      if (selectedTalent.link) {
        allLinks.push({ label: `${selectedTalent.platform || 'Main'} Link`, url: selectedTalent.link, description: selectedTalent.title });
      }
      
      if (selectedTalent.links) {
        allLinks.push(...selectedTalent.links);
      }

      const avatarUri = selectedTalent.avatar_url || `https://avatar.vercel.sh/${selectedTalent.name}.png`;

      return (
        <Modal visible={showLinksModal} animationType="slide" transparent>
          <BlurView intensity={100} tint={isLight ? "light" : "dark"} style={[styles.modalOverlay, { justifyContent: 'center', alignItems: 'center', backgroundColor: Platform.OS === 'web' ? undefined : 'rgba(0,0,0,0.7)' }]}>
            <View style={[styles.modalContent, { backgroundColor: theme.colors.background, paddingBottom: insets.bottom + 20, paddingTop: 0, paddingHorizontal: 0, borderRadius: 24, borderTopLeftRadius: 24, borderTopRightRadius: 24, maxWidth: Platform.OS === 'web' ? 520 : '92%', width: '92%', maxHeight: '85%', borderTopWidth: 0 }]}>
              {/* Hero Image */}
              <View style={{ height: 200, overflow: 'hidden', borderTopLeftRadius: 24, borderTopRightRadius: 24 }}>
                <Image 
                  source={{ uri: avatarUri }} 
                  style={{ width: '100%', height: '100%' }} 
                  resizeMode="cover"
                />
                <LinearGradient
                  colors={['transparent', 'rgba(0,0,0,0.4)', theme.colors.background]}
                  style={{ position: 'absolute', bottom: 0, left: 0, right: 0, height: 120 }}
                />
                <TouchableOpacity 
                  onPress={() => setShowLinksModal(false)} 
                  style={{ position: 'absolute', top: 16, right: 16, width: 36, height: 36, borderRadius: 18, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'center', alignItems: 'center' }}
                >
                  <X size={20} color="#FFF" />
                </TouchableOpacity>
              </View>

              {/* Profile Info */}
              <View style={{ paddingHorizontal: 24, marginTop: 16 }}>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 14, marginBottom: 16 }}>
                  <View style={{ width: 56, height: 56, borderRadius: 28, borderWidth: 2, borderColor: theme.colors.border, overflow: 'hidden' }}>
                    <Image source={{ uri: avatarUri }} style={{ width: '100%', height: '100%' }} />
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={{ fontSize: 20, fontWeight: '800', color: theme.colors.text, letterSpacing: -0.5 }}>{selectedTalent.name}</Text>
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 2 }}>
                      <View style={{ backgroundColor: theme.colors.primary + '20', paddingHorizontal: 10, paddingVertical: 3, borderRadius: 20 }}>
                        <Text style={{ fontSize: 11, fontWeight: '700', color: theme.colors.primary }}>{selectedTalent.category || 'Talent'}</Text>
                      </View>
                      {selectedTalent.platform && (
                        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
                          {getPlatformIcon(selectedTalent.platform)}
                          <Text style={{ fontSize: 11, color: theme.colors.textSecondary }}>{selectedTalent.platform}</Text>
                        </View>
                      )}
                    </View>
                  </View>
                </View>
              </View>

              <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingHorizontal: 24, paddingBottom: 20 }}>
                {selectedTalent.description && (
                  <View style={{ marginBottom: 24, backgroundColor: theme.colors.surface, borderRadius: 16, padding: 16 }}>
                    <Text style={{ fontSize: 14, color: theme.colors.text, lineHeight: 22 }}>{selectedTalent.description}</Text>
                  </View>
                )}

                {allLinks.length > 0 && (
                  <>
                    <Text style={{ fontSize: 10, fontWeight: '800', letterSpacing: 2, color: theme.colors.textSecondary, marginBottom: 12 }}>LINKS & SOCIALS</Text>
                    <View style={{ gap: 10, marginBottom: 24 }}>
                      {allLinks.map((link, idx) => (
                        <TouchableOpacity 
                          key={idx} 
                          onPress={() => handleOpenLink(link.url)}
                          style={{ 
                            flexDirection: 'row', alignItems: 'center', padding: 16, borderRadius: 16, 
                            backgroundColor: theme.colors.surface, borderWidth: 1, borderColor: theme.colors.border,
                            gap: 12,
                          }}
                          activeOpacity={0.7}
                        >
                          <View style={{ width: 40, height: 40, borderRadius: 12, backgroundColor: theme.colors.primary + '15', justifyContent: 'center', alignItems: 'center' }}>
                            <ExternalLink size={18} color={theme.colors.primary} />
                          </View>
                          <View style={{ flex: 1 }}>
                            <Text style={{ fontSize: 15, fontWeight: '700', color: theme.colors.text }}>{link.label || 'Link'}</Text>
                            {link.description && (
                              <Text style={{ fontSize: 12, color: theme.colors.textSecondary, marginTop: 2 }} numberOfLines={1}>{link.description}</Text>
                            )}
                          </View>
                          <ChevronLeft size={16} color={theme.colors.textSecondary} style={{ transform: [{ rotate: '180deg' }] }} />
                        </TouchableOpacity>
                      ))}
                    </View>
                  </>
                )}
              </ScrollView>
            </View>
          </BlurView>
        </Modal>
      );
    };

    const submitTalent = async (paymentStatus) => {
    try {
      const user = await getStoredUser();
      
      let avatarUrl = null;
      if (form.avatar) {
        avatarUrl = await uploadImage(user?.id);
      }

const { error } = await supabase
          .from('rtalent')
          .insert({
            user_id: user?.id,
            name: form.name,
            title: form.title,
            platform: form.platform,
            link: form.link,
            description: form.description,
            category: form.category,
            links: form.links || [],
            avatar_url: avatarUrl,
            payment_status: paymentStatus,
            status: 'pending',
            city_id: city_id
          });

      if (error) throw error;
      
      toast.success("Talent submitted for moderation!");
      setShowModal(false);
      setForm({ name: '', title: '', platform: 'Youtube', link: '', description: '', category: 'Musician', avatar: null });
    } catch (error) {
      console.error(error);
      toast.error("Failed to save your submission.");
    } finally {
      setSubmitting(false);
    }
  };

  const handleClaimTalent = (item) => {
    crossAlert(
      "Claim Talent Account",
      `This will set your account as a Talent account linked to "${item.name}". Your posts will show a Talent badge and people can follow your account.`,
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Claim",
          onPress: async () => {
            try {
              const currentType = currentUser?.account_type || 'personal';
              const newType = (currentType === 'business') ? 'both' : 'talent';
              const { error } = await supabase
                .from('rusers')
                .update({
                  account_type: newType,
                  active_identity: 'talent',
                  talent_showcase_id: item.id,
                })
                .eq('id', currentUser.id);
              if (error) throw error;
              // Re-fetch full user from DB + showcase data
              const { data: freshUser } = await supabase
                .from('rusers')
                .select('*')
                .eq('id', currentUser.id)
                .single();
              if (freshUser) {
                // Attach showcase info to auth for display
                freshUser._talent = { name: item.name, avatar_url: item.avatar_url, title: item.title, category: item.category };
                setCurrentUser(freshUser);
                useAuthStore.getState().setAuth(freshUser);
              }
              toast.success("Talent account claimed! Your posts will now show a Talent badge.");
            } catch (e) {
              console.error('Claim talent error:', e);
              toast.error("Failed to claim talent account: " + (e.message || 'Unknown error'));
            }
          },
        },
      ]
    );
  };

  const handleOpenLink = async (url) => {
    try {
      const supported = await Linking.canOpenURL(url);
      if (supported) {
        await Linking.openURL(url);
      } else {
        toast.error("Cannot open this link");
      }
    } catch (error) {
      toast.error("An error occurred while opening the link.");
    }
  };

  const openEditModal = (item) => {
    setEditForm({
      id: item.id,
      name: item.name,
      title: item.title,
      platform: item.platform,
        link: item.link,
        description: item.description || '',
        category: item.category,
        avatar: null,
        links: item.links || [],
        originalData: item
      });
    setShowEditModal(true);
  };

  const pickEditImage = async () => {
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.5,
      base64: true,
    });

    if (!result.canceled) {
      setEditForm({ ...editForm, avatar: result.assets[0] });
    }
  };

  const handleDelete = async (item) => {
    crossAlert(
      "Delete Showcase",
      "Are you sure? You will not get your money back for this.",
      [
        { text: "Cancel", style: "cancel" },
        { 
          text: "Delete", 
          style: "destructive",
          onPress: async () => {
            try {
              setSubmitting(true);
              const { error } = await supabase
                .from('rtalent')
                .update({ is_deleted: true })
                .eq('id', item.id);

              if (error) throw error;
              
              Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
              setShowEditModal(false);
              setEditForm(null);
              fetchTalents();
            } catch (error) {
              console.error(error);
              toast.error("Failed to delete showcase.");
            } finally {
              setSubmitting(false);
            }
          }
        }
      ]
    );
  };

  const submitEdit = async () => {
    if (!editForm) return;
    
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    setSubmitting(true);

    try {
      const user = await getStoredUser();
      const changes = [];
      const orig = editForm.originalData;

      if (editForm.name !== orig.name) {
        changes.push({ field_name: 'name', old_value: orig.name, new_value: editForm.name });
      }
      if (editForm.title !== orig.title) {
        changes.push({ field_name: 'title', old_value: orig.title, new_value: editForm.title });
      }
      if (editForm.platform !== orig.platform) {
        changes.push({ field_name: 'platform', old_value: orig.platform, new_value: editForm.platform });
      }
      if (editForm.link !== orig.link) {
        changes.push({ field_name: 'link', old_value: orig.link, new_value: editForm.link });
      }
      if (editForm.description !== (orig.description || '')) {
        changes.push({ field_name: 'description', old_value: orig.description, new_value: editForm.description });
      }
        if (editForm.category !== orig.category) {
          changes.push({ field_name: 'category', old_value: orig.category, new_value: editForm.category });
        }
        if (JSON.stringify(editForm.links || []) !== JSON.stringify(orig.links || [])) {
          changes.push({ field_name: 'links', old_value: JSON.stringify(orig.links || []), new_value: JSON.stringify(editForm.links || []) });
        }

      if (editForm.avatar) {
        const fileName = `${user?.id || 'anon'}_${Date.now()}.jpg`;
        const filePath = `avatars/${fileName}`;
        
        await supabase.storage
          .from('talent_avatars')
          .upload(filePath, decode(editForm.avatar.base64), {
            contentType: 'image/jpeg',
            upsert: true
          });

        const { data: { publicUrl } } = supabase.storage
          .from('talent_avatars')
          .getPublicUrl(filePath);

        changes.push({ field_name: 'avatar_url', old_value: orig.avatar_url, new_value: publicUrl });
      }

      if (changes.length === 0) {
        toast.info("You haven't made any changes.");
        setSubmitting(false);
        return;
      }

      const insertData = changes.map(c => ({
        showcase_type: 'talent',
        showcase_id: editForm.id,
        user_id: user?.id,
        field_name: c.field_name,
        old_value: c.old_value,
        new_value: c.new_value,
        status: 'pending'
      }));

      const { error } = await supabase.from('showcase_pending_edits').insert(insertData);

      if (error) throw error;

      toast.success("Changes submitted for moderation!");
      setShowEditModal(false);
      setEditForm(null);
    } catch (error) {
      console.error(error);
      toast.error("Failed to submit your changes.");
    } finally {
      setSubmitting(false);
    }
  };

  const getPlatformIcon = (platform) => {
    const p = platform?.toLowerCase() || '';
    if (p.includes('youtube')) return <Youtube size={16} color="rgba(255,255,255,0.5)" />;
    if (p.includes('spotify') || p.includes('music') || p.includes('tiktok')) return <Music size={16} color="rgba(255,255,255,0.5)" />;
    if (p.includes('instagram')) return <Instagram size={16} color="rgba(255,255,255,0.5)" />;
    return <Globe size={16} color="rgba(255,255,255,0.5)" />;
  };

  const filteredTalents = talents.filter(t => {
    const matchesSearch = t.name.toLowerCase().includes(searchQuery.toLowerCase()) || 
                         t.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
                         t.description?.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesCategory = !selectedCategory || t.category === selectedCategory;
    return matchesSearch && matchesCategory;
  });

  const displayTalents = filteredTalents;

    const renderTalentCard = ({ item }) => {
      return (
        <TouchableOpacity 
          activeOpacity={0.9}
          onPress={() => {
            setSelectedTalent(item);
            setShowLinksModal(true);
          }}
          style={styles.talentCard}
        >
        <View style={styles.cardImageContainer}>
          <Image 
            source={{ uri: item.avatar_url || `https://avatar.vercel.sh/${item.name}.png` }} 
            style={styles.cardImage} 
            resizeMode="cover"
          />
            <LinearGradient
              colors={['transparent', 'rgba(0,0,0,0.8)']}
              style={styles.cardGradient}
            />
          </View>
        
          <View style={[styles.cardInfo, { backgroundColor: theme.colors.surface }]}>
            <Text style={dynamicStyles.talentNameSmall} numberOfLines={1}>{item.name}</Text>
            <Text style={dynamicStyles.talentTitleSmall} numberOfLines={1}>{item.category || 'Talent'}</Text>
          </View>
        </TouchableOpacity>
      );
    };
  
    return (
      <View style={[styles.container, { backgroundColor: theme.colors.background }]}>
        <View style={{ paddingTop: insets.top, flex: 1 }}>
            <View style={styles.header}>
              <TouchableOpacity onPress={() => goBack(router)} style={styles.backButton}>
                <ChevronLeft color={theme.colors.text} size={24} strokeWidth={2} />
              </TouchableOpacity>
              <Text style={dynamicStyles.headerTitle}>LOCAL TALENT</Text>
              <TouchableOpacity 
                onPress={() => {
                  Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                  setShowModal(true);
                }}
                style={[styles.headerCreateButton, { backgroundColor: theme.colors.primary }]}
              >
                <Plus color={isLight ? "#FFF" : "#000"} size={16} strokeWidth={3} />
                <Text style={[styles.headerCreateText, { color: isLight ? "#FFF" : "#000" }]}>£0.99</Text>
              </TouchableOpacity>
            </View>
  
          <View style={styles.searchSection}>
            <View style={[styles.searchBar, { backgroundColor: theme.colors.surface }]}>
              <Search size={18} color={theme.colors.textSecondary} />
              <TextInput
                style={[styles.searchInput, { color: theme.colors.text }]}
                placeholder="Search talent..."
                placeholderTextColor={theme.colors.textSecondary}
                value={searchQuery}
                onChangeText={setSearchQuery}
              />
              {searchQuery ? (
                <TouchableOpacity onPress={() => setSearchQuery('')}>
                  <X size={18} color={theme.colors.textSecondary} />
                </TouchableOpacity>
              ) : null}
            </View>
            
            <ScrollView 
              horizontal 
              showsHorizontalScrollIndicator={false} 
              contentContainerStyle={styles.categoryScroll}
            >
              <TouchableOpacity 
                onPress={() => {
                  Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                  setSelectedCategory(null);
                }}
                style={[styles.categoryPill, { backgroundColor: theme.colors.surface, borderColor: theme.colors.border }, !selectedCategory && { backgroundColor: theme.colors.primary, borderColor: theme.colors.primary }]}
              >
                <Text style={[dynamicStyles.categoryPillText, !selectedCategory && dynamicStyles.activeCategoryPillText]}>ALL</Text>
              </TouchableOpacity>
              {categories.map(cat => (
                <TouchableOpacity 
                  key={cat}
                  onPress={() => {
                    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                    setSelectedCategory(cat);
                  }}
                  style={[styles.categoryPill, { backgroundColor: theme.colors.surface, borderColor: theme.colors.border }, selectedCategory === cat && { backgroundColor: theme.colors.primary, borderColor: theme.colors.primary }]}
                >
                  <Text style={[dynamicStyles.categoryPillText, selectedCategory === cat && dynamicStyles.activeCategoryPillText]}>
                    {cat.toUpperCase()}
                  </Text>
                </TouchableOpacity>
              ))}
            </ScrollView>
          </View>
  
        {loading ? (
          <View style={styles.centered}>
            <ActivityIndicator color={theme.colors.primary} />
          </View>
        ) : (
          <FlatList
            data={displayTalents}
            renderItem={renderTalentCard}
            keyExtractor={(item) => item.id.toString()}
            numColumns={2}
            columnWrapperStyle={styles.columnWrapper}
            contentContainerStyle={styles.listContent}
            ListHeaderComponent={myShowcases.length > 0 ? (
              <View style={styles.myShowcaseSection}>
                <View style={styles.myShowcaseHeader}>
                  <Star size={16} color={theme.colors.primary} fill={theme.colors.primary} />
                  <Text style={[styles.myShowcaseTitle, { color: theme.colors.text }]}>MY SHOWCASES ({myShowcases.length})</Text>
                </View>
                {myShowcases.map((item) => (
                  <TouchableOpacity 
                    key={item.id}
                    activeOpacity={0.9}
                    onPress={() => {
                      setSelectedTalent(item);
                      setShowLinksModal(true);
                    }}
                    onLongPress={() => {
                    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
                    openEditModal(item);
                  }}
                  style={[styles.myShowcaseCard, { backgroundColor: theme.colors.surface, borderColor: theme.colors.primary, marginBottom: 12 }]}
                >
                  <Image 
                    source={{ uri: item.avatar_url || `https://avatar.vercel.sh/${item.name}.png` }} 
                    style={styles.myShowcaseImage} 
                  />
                    <View style={styles.myShowcaseInfo}>
                      <Text style={[styles.myShowcaseName, { color: theme.colors.text }]}>{item.name}</Text>
                      <Text style={[styles.myShowcaseCategory, { color: theme.colors.textSecondary }]}>{item.category}</Text>
                      {item.status === 'rejected' && item.moderation_reason && (
                        <View style={{ backgroundColor: '#F59E0B20', padding: 8, borderRadius: 8, marginTop: 8 }}>
                          <Text style={{ color: '#F59E0B', fontSize: 10, fontWeight: '800' }}>ACTION REQUIRED:</Text>
                          <Text style={{ color: theme.colors.text, fontSize: 11, marginTop: 2 }}>{item.moderation_reason.replace('EDIT REQUESTED: ', '')}</Text>
                        </View>
                      )}
                      <Text style={[styles.myShowcaseHint, { color: theme.colors.primary }]}>Hold to edit</Text>
                    </View>
                  <View style={{ alignItems: 'flex-end', gap: 8 }}>
                    <TouchableOpacity 
                      onPress={() => openEditModal(item)}
                      style={[styles.editButton, { backgroundColor: theme.colors.primary }]}
                    >
                      <Text style={[styles.editButtonText, { color: isLight ? '#FFF' : '#000' }]}>Edit</Text>
                    </TouchableOpacity>
                    {item.status === 'approved' && currentUser?.talent_showcase_id !== item.id && (
                      <TouchableOpacity
                        onPress={() => handleClaimTalent(item)}
                        style={[styles.editButton, { backgroundColor: '#F59E0B' }]}
                      >
                        <BadgeCheck size={14} color="#FFF" />
                        <Text style={[styles.editButtonText, { color: '#FFF', marginLeft: 4 }]}>Claim</Text>
                      </TouchableOpacity>
                    )}
                  </View>
                </TouchableOpacity>
                ))}
              </View>
            ) : null}
            ListEmptyComponent={
                <View style={styles.emptyState}>
                  <Music size={48} color={theme.colors.border} />
                  <Text style={dynamicStyles.emptyText}>No talent found.</Text>
                  <Text style={dynamicStyles.emptySubtext}>Try a different search or category.</Text>
                </View>
              }
              />
            )}
    
              </View>
  
          <LinksDisplayModal />
  
          {/* Submission Modal */}

      <Modal visible={showModal} animationType="slide" transparent>
        <BlurView intensity={100} tint={isLight ? "light" : "dark"} style={styles.modalOverlay}>
          <View style={[styles.modalContent, { backgroundColor: theme.colors.background, paddingBottom: insets.bottom + 20 }]}>
            <View style={styles.modalHeader}>
              <Text style={dynamicStyles.modalTitle}>Showcase Your Talent</Text>
              <TouchableOpacity onPress={() => setShowModal(false)}>
                <Text style={[styles.closeText, { color: theme.colors.textSecondary }]}>Close</Text>
              </TouchableOpacity>
            </View>

            <ScrollView showsVerticalScrollIndicator={false}>
              <View style={[styles.priceTag, { backgroundColor: theme.colors.surface }]}>
                <ShieldCheck size={16} color={theme.colors.success} />
                <Text style={[styles.priceText, { color: theme.colors.textSecondary }]}>One-time payment: £0.99p (Pending Moderation)</Text>
              </View>

              <Text style={dynamicStyles.label}>PROFILE IMAGE</Text>
              <TouchableOpacity style={[styles.imagePicker, { backgroundColor: theme.colors.surface, borderColor: theme.colors.border }]} onPress={pickImage}>
                {form.avatar ? (
                  <Image source={{ uri: form.avatar.uri }} style={styles.pickedImage} />
                ) : (
                  <View style={styles.imagePlaceholder}>
                    <Camera size={24} color={theme.colors.textSecondary} />
                    <Text style={[styles.imagePlaceholderText, { color: theme.colors.textSecondary }]}>Upload Photo</Text>
                  </View>
                )}
              </TouchableOpacity>

              <Text style={dynamicStyles.label}>YOUR NAME</Text>
              <TextInput
                style={dynamicStyles.input}
                placeholder="How should we call you?"
                placeholderTextColor={theme.colors.textSecondary}
                value={form.name}
                onChangeText={(t) => setForm({ ...form, name: t })}
              />

              <Text style={dynamicStyles.label}>TITLE</Text>
              <TextInput
                style={dynamicStyles.input}
                placeholder="e.g. My Latest Album / Photography Portfolio"
                placeholderTextColor={theme.colors.textSecondary}
                value={form.title}
                onChangeText={(t) => setForm({ ...form, title: t })}
              />

                <Text style={dynamicStyles.label}>CATEGORY</Text>
                <View style={styles.platformRow}>
                  {categories.map((c) => (
                    <TouchableOpacity
                      key={c}
                      onPress={() => setForm({ ...form, category: c })}
                      style={[styles.miniButton, { backgroundColor: theme.colors.surface, borderColor: theme.colors.border }, form.category === c && { backgroundColor: theme.colors.primary, borderColor: theme.colors.primary }]}
                    >
                      <Text style={[dynamicStyles.miniButtonText, form.category === c && dynamicStyles.activeMiniButtonText]}>
                        {c}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>

                <Text style={dynamicStyles.label}>PLATFORM</Text>
                <View style={styles.platformRow}>
                  {['Youtube', 'Spotify', 'Instagram', 'TikTok', 'Website'].map((p) => (
                    <TouchableOpacity
                      key={p}
                      onPress={() => setForm({ ...form, platform: p })}
                      style={[styles.platformButton, { backgroundColor: theme.colors.surface, borderColor: theme.colors.border }, form.platform === p && { backgroundColor: theme.colors.primary, borderColor: theme.colors.primary }]}
                    >
                      {p === 'Youtube' && <Youtube size={14} color={form.platform === p ? (isLight ? "#FFF" : "#000") : theme.colors.textSecondary} />}
                      {p === 'Spotify' && <Music size={14} color={form.platform === p ? (isLight ? "#FFF" : "#000") : theme.colors.textSecondary} />}
                      {p === 'Instagram' && <Instagram size={14} color={form.platform === p ? (isLight ? "#FFF" : "#000") : theme.colors.textSecondary} />}
                      {p === 'TikTok' && <Music size={14} color={form.platform === p ? (isLight ? "#FFF" : "#000") : theme.colors.textSecondary} />}
                      {p === 'Website' && <Globe size={14} color={form.platform === p ? (isLight ? "#FFF" : "#000") : theme.colors.textSecondary} />}
                      <Text style={[dynamicStyles.platformText, form.platform === p && dynamicStyles.activePlatformText]}>
                        {p}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>

              <Text style={dynamicStyles.label}>LINK (URL)</Text>
              <TextInput
                style={dynamicStyles.input}
                placeholder="https://..."
                placeholderTextColor={theme.colors.textSecondary}
                autoCapitalize="none"
                value={form.link}
                onChangeText={(t) => setForm({ ...form, link: t })}
              />

              <Text style={dynamicStyles.label}>DESCRIPTION</Text>
              <TextInput
                style={[dynamicStyles.input, styles.textArea]}
                placeholder="Tell the world about yourself..."
                placeholderTextColor={theme.colors.textSecondary}
                multiline
                numberOfLines={4}
                value={form.description}
                  onChangeText={(t) => setForm({ ...form, description: t })}
                />

                {renderLinksManager(form.links, false)}

                <TouchableOpacity 
                  style={[styles.submitButton, { backgroundColor: theme.colors.primary }]} 
                  onPress={handlePurchaseAndSubmit}
                disabled={submitting}
              >
                {submitting ? (
                  <ActivityIndicator color={isLight ? "#FFF" : "#000"} />
                ) : (
                  <Text style={dynamicStyles.submitButtonText}>PAY £0.99 & SUBMIT</Text>
                )}
              </TouchableOpacity>
            </ScrollView>
          </View>
        </BlurView>
      </Modal>

      <Modal visible={showEditModal} animationType="slide" transparent>
        <BlurView intensity={100} tint={isLight ? "light" : "dark"} style={styles.modalOverlay}>
          <View style={[styles.modalContent, { backgroundColor: theme.colors.background, paddingBottom: insets.bottom + 20 }]}>
            <View style={styles.modalHeader}>
              <Text style={dynamicStyles.modalTitle}>Edit Your Showcase</Text>
              <TouchableOpacity onPress={() => { setShowEditModal(false); setEditForm(null); }}>
                <Text style={[styles.closeText, { color: theme.colors.textSecondary }]}>Close</Text>
              </TouchableOpacity>
            </View>

            <ScrollView showsVerticalScrollIndicator={false}>
              <View style={[styles.priceTag, { backgroundColor: theme.colors.surface }]}>
                <Info size={16} color={theme.colors.primary} />
                <Text style={[styles.priceText, { color: theme.colors.textSecondary }]}>Changes will be reviewed before going live</Text>
              </View>

              <Text style={dynamicStyles.label}>PROFILE IMAGE</Text>
              <TouchableOpacity style={[styles.imagePicker, { backgroundColor: theme.colors.surface, borderColor: theme.colors.border }]} onPress={pickEditImage}>
                {editForm?.avatar ? (
                  <Image source={{ uri: editForm.avatar.uri }} style={styles.pickedImage} />
                ) : editForm?.originalData?.avatar_url ? (
                  <Image source={{ uri: editForm.originalData.avatar_url }} style={styles.pickedImage} />
                ) : (
                  <View style={styles.imagePlaceholder}>
                    <Camera size={24} color={theme.colors.textSecondary} />
                    <Text style={[styles.imagePlaceholderText, { color: theme.colors.textSecondary }]}>Upload Photo</Text>
                  </View>
                )}
              </TouchableOpacity>

              <Text style={dynamicStyles.label}>YOUR NAME</Text>
              <TextInput
                style={dynamicStyles.input}
                placeholder="How should we call you?"
                placeholderTextColor={theme.colors.textSecondary}
                value={editForm?.name || ''}
                onChangeText={(t) => setEditForm({ ...editForm, name: t })}
              />

              <Text style={dynamicStyles.label}>TITLE</Text>
              <TextInput
                style={dynamicStyles.input}
                placeholder="e.g. My Latest Album / Photography Portfolio"
                placeholderTextColor={theme.colors.textSecondary}
                value={editForm?.title || ''}
                onChangeText={(t) => setEditForm({ ...editForm, title: t })}
              />

              <Text style={dynamicStyles.label}>CATEGORY</Text>
              <View style={styles.platformRow}>
                {categories.map((c) => (
                  <TouchableOpacity
                    key={c}
                    onPress={() => setEditForm({ ...editForm, category: c })}
                    style={[styles.miniButton, { backgroundColor: theme.colors.surface, borderColor: theme.colors.border }, editForm?.category === c && { backgroundColor: theme.colors.primary, borderColor: theme.colors.primary }]}
                  >
                    <Text style={[dynamicStyles.miniButtonText, editForm?.category === c && dynamicStyles.activeMiniButtonText]}>
                      {c}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>

              <Text style={dynamicStyles.label}>PLATFORM</Text>
              <View style={styles.platformRow}>
                {['Youtube', 'Spotify', 'Instagram', 'TikTok', 'Website'].map((p) => (
                  <TouchableOpacity
                    key={p}
                    onPress={() => setEditForm({ ...editForm, platform: p })}
                    style={[styles.platformButton, { backgroundColor: theme.colors.surface, borderColor: theme.colors.border }, editForm?.platform === p && { backgroundColor: theme.colors.primary, borderColor: theme.colors.primary }]}
                  >
                    {p === 'Youtube' && <Youtube size={14} color={editForm?.platform === p ? (isLight ? "#FFF" : "#000") : theme.colors.textSecondary} />}
                    {p === 'Spotify' && <Music size={14} color={editForm?.platform === p ? (isLight ? "#FFF" : "#000") : theme.colors.textSecondary} />}
                    {p === 'Instagram' && <Instagram size={14} color={editForm?.platform === p ? (isLight ? "#FFF" : "#000") : theme.colors.textSecondary} />}
                    {p === 'TikTok' && <Music size={14} color={editForm?.platform === p ? (isLight ? "#FFF" : "#000") : theme.colors.textSecondary} />}
                    {p === 'Website' && <Globe size={14} color={editForm?.platform === p ? (isLight ? "#FFF" : "#000") : theme.colors.textSecondary} />}
                    <Text style={[dynamicStyles.platformText, editForm?.platform === p && dynamicStyles.activePlatformText]}>
                      {p}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>

              <Text style={dynamicStyles.label}>LINK (URL)</Text>
              <TextInput
                style={dynamicStyles.input}
                placeholder="https://..."
                placeholderTextColor={theme.colors.textSecondary}
                autoCapitalize="none"
                value={editForm?.link || ''}
                onChangeText={(t) => setEditForm({ ...editForm, link: t })}
              />

              <Text style={dynamicStyles.label}>DESCRIPTION</Text>
              <TextInput
                style={[dynamicStyles.input, styles.textArea]}
                placeholder="Tell the world about yourself..."
                placeholderTextColor={theme.colors.textSecondary}
                multiline
                numberOfLines={4}
                value={editForm?.description || ''}
                onChangeText={(t) => setEditForm({ ...editForm, description: t })}
              />

              {renderLinksManager(editForm?.links, true)}

                <View style={{ flexDirection: 'row', gap: 12, marginTop: 40 }}>
                  <TouchableOpacity 
                    style={[styles.submitButton, { backgroundColor: '#EF4444', flex: 1, marginTop: 0 }]} 
                    onPress={() => handleDelete(editForm)}
                    disabled={submitting}
                  >
                    <Trash2 size={20} color="#FFF" />
                  </TouchableOpacity>

                  <TouchableOpacity 
                    style={[styles.submitButton, { backgroundColor: theme.colors.primary, flex: 4, marginTop: 0 }]} 
                    onPress={submitEdit}
                    disabled={submitting}
                  >
                    {submitting ? (
                      <ActivityIndicator color={isLight ? "#FFF" : "#000"} />
                    ) : (
                      <Text style={dynamicStyles.submitButtonText}>SUBMIT FOR REVIEW</Text>
                    )}
                  </TouchableOpacity>
                </View>
            </ScrollView>
          </View>
        </BlurView>
      </Modal>
    </View>
  );
}

  const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 15,
  },
    headerTitle: {
      fontSize: 18,
      fontWeight: '900',
      letterSpacing: 2,
    },
    headerCreateButton: {
      flexDirection: 'row',
      alignItems: 'center',
      paddingHorizontal: 12,
      paddingVertical: 6,
      borderRadius: 100,
      gap: 4,
    },
    headerCreateText: {
      fontSize: 12,
      fontWeight: '900',
    },
    searchSection: {
    paddingVertical: 10,
  },
  searchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 12,
    marginHorizontal: 20,
    paddingHorizontal: 12,
    height: 44,
    gap: 10,
  },
  searchInput: {
    flex: 1,
    fontSize: 14,
  },
  categoryScroll: {
    paddingHorizontal: 20,
    paddingVertical: 12,
    gap: 10,
  },
  categoryPill: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    borderWidth: 1,
  },
  categoryPillText: {
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 1,
  },
  activeCategoryPillText: {
  },
  listContent: {
    paddingHorizontal: 12,
    paddingBottom: 120,
  },
  columnWrapper: {
    justifyContent: 'space-between',
  },
  talentCard: {
    flex: 1,
    height: 220,
    margin: 6,
    borderRadius: 24,
    overflow: 'hidden',
    borderWidth: 1,
  },
  cardImageContainer: {
    flex: 1,
    width: '100%',
  },
  cardImage: {
    width: '100%',
    height: '100%',
  },
  cardGradient: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    height: '60%',
  },
  cardPlatformBadge: {
    position: 'absolute',
    top: 10,
    right: 10,
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
  },
  cardInfo: {
    padding: 12,
  },
  talentNameSmall: {
    fontSize: 14,
    fontWeight: '800',
  },
  talentTitleSmall: {
    fontSize: 11,
    fontWeight: '600',
    marginTop: 2,
  },
  backButton: {
    padding: 5,
  },
  centered: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  fab: {
    position: 'absolute',
    right: 20,
    width: 56,
    height: 56,
    borderRadius: 28,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.5,
    shadowRadius: 15,
    elevation: 10,
  },
  emptyState: {
    alignItems: 'center',
    marginTop: 100,
  },
  emptyText: {
    fontSize: 18,
    fontWeight: '800',
    marginTop: 20,
  },
  emptySubtext: {
    fontSize: 14,
    marginTop: 5,
  },
  modalOverlay: {
    flex: 1,
    justifyContent: 'flex-end',
    ...(Platform.OS === 'web' ? {
      justifyContent: 'center',
      alignItems: 'center',
      backgroundColor: 'rgba(0,0,0,0.7)',
    } : {}),
  },
  modalContent: {
    borderTopLeftRadius: 40,
    borderTopRightRadius: 40,
    padding: 30,
    maxHeight: '92%',
    borderTopWidth: 1,
    ...(Platform.OS === 'web' ? {
      maxWidth: 520,
      width: '95%',
      maxHeight: '85vh',
      borderRadius: 24,
      borderTopWidth: 0,
    } : {}),
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 32,
  },
  modalTitle: {
    fontSize: 24,
    fontWeight: '300',
    letterSpacing: -0.5,
  },
  closeText: {
    fontSize: 14,
    fontWeight: '500',
  },
  priceTag: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    borderRadius: 16,
    marginBottom: 32,
    gap: 10,
  },
  priceText: {
    fontSize: 13,
    fontWeight: '400',
  },
  label: {
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 2,
    marginBottom: 12,
    marginTop: 20,
  },
  input: {
    borderBottomWidth: 1,
    paddingVertical: 12,
    fontSize: 17,
    marginBottom: 10,
  },
  textArea: {
    minHeight: 80,
    textAlignVertical: 'top',
  },
  platformRow: {
    flexDirection: 'row',
    gap: 10,
    marginBottom: 10,
    flexWrap: 'wrap',
  },
  platformButton: {
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 100,
    borderWidth: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  miniButton: {
    paddingHorizontal: 18,
    paddingVertical: 12,
    borderRadius: 100,
    borderWidth: 1,
  },
  platformText: {
    fontSize: 13,
    fontWeight: '600',
  },
  miniButtonText: {
    fontSize: 13,
    fontWeight: '600',
  },
  submitButton: {
    borderRadius: 100,
    padding: 20,
    alignItems: 'center',
    marginTop: 40,
  },
  submitButtonText: {
    fontSize: 15,
    fontWeight: '700',
    letterSpacing: 1,
  },
  imagePicker: {
    width: 100,
    height: 100,
    borderRadius: 50,
    borderWidth: 1,
    borderStyle: 'dashed',
    justifyContent: 'center',
    alignItems: 'center',
    overflow: 'hidden',
    marginBottom: 10,
  },
  pickedImage: {
    width: '100%',
    height: '100%',
  },
  imagePlaceholder: {
    alignItems: 'center',
    gap: 4,
  },
  imagePlaceholderText: {
    fontSize: 10,
    fontWeight: '600',
  },
  myShowcaseSection: {
    marginBottom: 20,
    paddingHorizontal: 8,
  },
  myShowcaseHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 12,
  },
  myShowcaseTitle: {
    fontSize: 12,
    fontWeight: '800',
    letterSpacing: 1,
  },
  myShowcaseCard: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    borderRadius: 16,
    borderWidth: 2,
    gap: 12,
  },
  myShowcaseImage: {
    width: 56,
    height: 56,
    borderRadius: 28,
  },
  myShowcaseInfo: {
    flex: 1,
  },
  myShowcaseName: {
    fontSize: 16,
    fontWeight: '700',
  },
  myShowcaseCategory: {
    fontSize: 12,
    marginTop: 2,
  },
  myShowcaseHint: {
    fontSize: 10,
    fontWeight: '600',
    marginTop: 4,
  },
  editButton: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
  },
    editButtonText: {
      fontSize: 12,
      fontWeight: '700',
    },
    linksManagerContainer: {
      marginTop: 20,
    },
    linksHeader: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      marginBottom: 12,
    },
    addLinkButton: {
      width: 28,
      height: 28,
      borderRadius: 14,
      justifyContent: 'center',
      alignItems: 'center',
    },
    linkCard: {
      padding: 12,
      borderRadius: 16,
      borderWidth: 1,
      marginBottom: 12,
    },
    linkCardHeader: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      marginBottom: 8,
    },
    linkInput: {
      borderBottomWidth: 1,
      fontSize: 14,
      paddingVertical: 8,
      marginBottom: 8,
    },
    linktreeButton: {
      flexDirection: 'row',
      alignItems: 'center',
      padding: 16,
      borderRadius: 16,
      borderWidth: 1,
      gap: 12,
    },
    linktreeLabel: {
      fontSize: 15,
      fontWeight: '700',
    },
  });
