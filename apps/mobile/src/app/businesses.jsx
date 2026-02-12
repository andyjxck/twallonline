import React, { useState, useEffect, useMemo } from 'react';
import { View, Text, StyleSheet, TextInput, TouchableOpacity, ScrollView, Alert, ActivityIndicator, Modal, Image, Platform, FlatList, Linking, Dimensions } from 'react-native';
import { useRouter } from 'expo-router';
import { ChevronLeft, Globe, Info, Plus, ExternalLink, ShieldCheck, CheckCircle2, Star, Camera, MapPin, Phone, Briefcase, Search, X, ShoppingBag, Truck, Instagram, Facebook, Trash2, Link as LinkIcon, MoreHorizontal } from 'lucide-react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { BlurView } from 'expo-blur';
import { supabase } from '@/utils/supabase';
import { getStoredUser } from '@/utils/user';
import * as Haptics from 'expo-haptics';
import * as ImagePicker from 'expo-image-picker';
import { decode } from 'base64-arraybuffer';

import { LinearGradient } from 'expo-linear-gradient';
import { useTheme } from "@/utils/ThemeContext";

let Purchases;
if (Platform.OS !== 'web') {
  Purchases = require('react-native-purchases').default;
}

let MapView, Marker, Callout;
if (Platform.OS !== 'web') {
  const Maps = require('react-native-maps');
  MapView = Maps.default;
  Marker = Maps.Marker;
  Callout = Maps.Callout;
}
import { useLocationStore } from "@/utils/locationStore";
import { goBack } from "@/utils/navigation";
import { crossAlert } from "@/utils/alert";
import { toast } from 'sonner-native';
import { useAuthStore } from '@/utils/auth';
import { BadgeCheck } from 'lucide-react-native';

const DELIVERY_PLATFORMS = [
  { id: 'amazon', name: 'Amazon', icon: ShoppingBag },
  { id: 'justeat', name: 'Just Eat', icon: Truck },
  { id: 'deliveroo', name: 'Deliveroo', icon: Truck },
  { id: 'ubereats', name: 'Uber Eats', icon: Truck },
];

export default function LocalBusinesses() {
  const { theme, isHippie, isLight } = useTheme();
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [processingLink, setProcessingLink] = useState(false);
  const [businesses, setBusinesses] = useState([]);
  const [myShowcases, setMyShowcases] = useState([]);
  const [currentUser, setCurrentUser] = useState(null);
  const [showModal, setShowModal] = useState(false);
    const [showEditModal, setShowEditModal] = useState(false);
    const [showLinksModal, setShowLinksModal] = useState(false);
    const [selectedBusiness, setSelectedBusiness] = useState(null);
    const [editForm, setEditForm] = useState(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [viewMode, setViewMode] = useState('list');
  const { width } = Dimensions.get('window');

  const dynamicStyles = useMemo(() => StyleSheet.create({
    headerTitle: { ...styles.headerTitle, color: theme.colors.text },
    bizNameSmall: { ...styles.bizNameSmall, color: theme.colors.text },
    emptyText: { ...styles.emptyText, color: theme.colors.text },
    emptySubtext: { ...styles.emptySubtext, color: theme.colors.textSecondary },
    modalTitle: { ...styles.modalTitle, color: theme.colors.text },
    label: { ...styles.label, color: theme.colors.textSecondary },
    input: { ...styles.input, color: theme.colors.text, borderBottomColor: theme.colors.border },
    tagText: { ...styles.tagText, color: theme.colors.text },
    activeTagText: { color: isLight ? '#FFF' : '#000' },
    submitButtonText: { ...styles.submitButtonText, color: isLight ? '#FFF' : '#000' },
    processButtonIcon: { color: isLight ? '#FFF' : '#000' },
  }), [theme, isLight]);
  
  const { city_id } = useLocationStore();
  const { create } = router.params || {};

  useEffect(() => {
    if (create === 'true') {
      setShowModal(true);
      router.setParams({ create: undefined });
    }
  }, [create]);
  
    const [form, setForm] = useState({
      name: '',
      category: 'Retail',
      link: '',
      address: '',
      phone: '',
      description: '',
      avatar: null,
      rating: null,
      delivery_links: {},
      links: []
    });

  useEffect(() => {
    initUser();
    fetchBusinesses();

    const channel = supabase
      .channel('rbusinesses_changes')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'rbusinesses' }, () => {
        fetchBusinesses();
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

    const fetchBusinesses = async () => {
    try {
      const user = await getStoredUser();
      
      const { data, error } = await supabase
        .from('rbusinesses')
        .select('*')
        .eq('is_deleted', false)
        .or(`status.eq.approved,user_id.eq.${user?.id || 0}`);

      if (error) throw error;
      
if (user?.id) {
          const myItems = data?.filter(b => b.user_id === user.id) || [];
          setMyShowcases(myItems);
          setBusinesses(data || []);
        } else {
          setMyShowcases([]);
          setBusinesses(data || []);
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
        .from('business_avatars')
        .upload(filePath, decode(form.avatar.base64), {
          contentType: 'image/jpeg',
          upsert: true
        });

      if (error) throw error;
      
      const { data: { publicUrl } } = supabase.storage
        .from('business_avatars')
        .getPublicUrl(filePath);
        
      return publicUrl;
    } catch (error) {
      console.error("Upload error:", error);
      return null;
    }
  };

    const processGoogleLink = async () => {
    if (!form.link.includes('google.com/maps') && !form.link.includes('maps.app.goo.gl')) {
      toast.error("Please enter a valid Google Maps link to auto-fill details.");
      return;
    }

    setProcessingLink(true);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);

    try {
      const apiKey = process.env.EXPO_PUBLIC_GOOGLE_MAPS_API_KEY;
      
      let finalUrl = form.link;
      let extractedName = '';
      let extractedAddress = '';
      let extractedPhone = '';
      let extractedRating = null;

      // 1. Resolve short links safely
      if (form.link.includes('maps.app.goo.gl') || form.link.includes('goo.gl/maps')) {
        try {
          const response = await fetch(form.link, { 
            method: 'HEAD', 
            redirect: 'follow' 
          });
          finalUrl = response.url;
          
          if (finalUrl.includes('consent.google.com') || finalUrl.includes('google.com/search')) {
            const urlObj = new URL(finalUrl);
            const continueUrl = urlObj.searchParams.get('continue');
            if (continueUrl) finalUrl = continueUrl;
          }
        } catch (e) {
          console.log("Short link resolution error:", e);
        }
      }

      const placeIdMatch = finalUrl.match(/!1s(ChI[a-zA-Z0-9_-]+)/);
      const placeId = placeIdMatch ? placeIdMatch[1] : null;
      
      const placeMatch = finalUrl.match(/\/place\/([^\/|@?]+)/);
      if (placeMatch && placeMatch[1]) {
        extractedName = decodeURIComponent(placeMatch[1].replace(/\+/g, ' '));
      }

      if (apiKey) {
        if (placeId) {
          const detailsResponse = await fetch(
            `https://maps.googleapis.com/maps/api/place/details/json?place_id=${placeId}&fields=name,formatted_phone_number,rating,formatted_address,geometry,website&key=${apiKey}`
          );
          const detailsData = await detailsResponse.json();
          
          if (detailsData.result) {
            const res = detailsData.result;
            extractedName = res.name;
            extractedAddress = res.formatted_address;
            extractedPhone = res.formatted_phone_number || '';
            extractedRating = res.rating?.toString();
          }
        } 
        
        if (!extractedAddress && (extractedName || form.link)) {
          const searchQuery = encodeURIComponent(extractedName || form.link);
          const searchResponse = await fetch(
            `https://maps.googleapis.com/maps/api/place/textsearch/json?query=${searchQuery}&key=${apiKey}`
          );
          const searchData = await searchResponse.json();

          if (searchData.results && searchData.results[0]) {
            const place = searchData.results[0];
            extractedName = place.name;
            extractedAddress = place.formatted_address;
            extractedRating = place.rating?.toString();

            if (place.place_id && !extractedPhone) {
              const detailsResponse = await fetch(
                `https://maps.googleapis.com/maps/api/place/details/json?place_id=${place.place_id}&fields=formatted_phone_number&key=${apiKey}`
              );
              const detailsData = await detailsResponse.json();
              if (detailsData.result?.formatted_phone_number) {
                extractedPhone = detailsData.result.formatted_phone_number;
              }
            }
          }
        }
      }

      const isConsentString = (str) => {
        if (!str) return true;
        const s = str.toLowerCase();
        return s.includes('before you continue') || s.includes('google maps') || s.includes('consent') || s.includes('cookie');
      };

      const finalName = !isConsentString(extractedName) ? extractedName : (placeMatch && placeMatch[1] ? decodeURIComponent(placeMatch[1].replace(/\+/g, ' ')) : '');

      setForm(prev => ({
        ...prev,
        name: finalName || prev.name,
        address: extractedAddress || prev.address,
        phone: extractedPhone || prev.phone,
        description: prev.description || (extractedAddress ? `Located at ${extractedAddress}` : prev.description),
        rating: extractedRating || prev.rating
      }));

      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      toast.success("Details extracted from Google Maps!");

    } catch (error) {
      console.error("Link processing error:", error);
      toast.error("Could not extract details. Please check the link or fill manually.");
    } finally {
      setProcessingLink(false);
    }
  };

  const handlePurchaseAndSubmit = async () => {
    if (!currentUser) {
      crossAlert("Account Required", "Please create an account or sign in to purchase a business showcase.", [
        { text: "Cancel", style: "cancel" },
        { text: "Sign In", onPress: () => router.push("/auth?mode=login") },
      ]);
      return;
    }

    if (!form.name || !form.category) {
      toast.error("Please fill in the business name and category.");
      return;
    }

    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    setSubmitting(true);

    try {
      const apiKey = process.env.EXPO_PUBLIC_REVENUECAT_APPLE_API_KEY;
      
      if (!apiKey) {
        crossAlert(
          "Development Mode",
          "No RevenueCat API key found. Would you like to proceed with a mock submission?",
          [
            { text: "Cancel", onPress: () => setSubmitting(false), style: "cancel" },
            { text: "Mock Submit", onPress: () => submitBusiness('mock_paid') }
          ]
        );
        return;
      }

        const offerings = await Purchases.getOfferings();
        // Use the business_card offering specifically (offerings.current is talent_showcase)
        const businessOffering = offerings.all?.['business_card'] || offerings.current;
        
        if (businessOffering && businessOffering.availablePackages.length > 0) {
          const pkg = businessOffering.availablePackages.find(p => p.product.identifier === 'com.andysocial.townwall.business.showcase1') || businessOffering.availablePackages[0];
          console.log('Selected package:', pkg.product.identifier);
          const { customerInfo } = await Purchases.purchasePackage(pkg);
          
          if (customerInfo) {
            await submitBusiness('paid');
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

    const LinksManager = ({ links: rawLinks, isEdit = false }) => {
      const links = Array.isArray(rawLinks) ? rawLinks : [];
      return (
      <View style={styles.linksManagerContainer}>
        <View style={styles.linksHeader}>
          <Text style={dynamicStyles.label}>ADDITIONAL LINKS</Text>
          <TouchableOpacity onPress={() => addLink(isEdit)} style={[styles.addLinkButton, { backgroundColor: theme.colors.primary }]}>
            <Plus size={14} color={isLight ? '#FFF' : '#000'} />
          </TouchableOpacity>
        </View>
        {links.map((link, index) => (
          <View key={link.id} style={[styles.linkCard, { backgroundColor: theme.colors.surface, borderColor: theme.colors.border }]}>
            <View style={styles.linkCardHeader}>
              <LinkIcon size={16} color={theme.colors.primary} />
              <TouchableOpacity onPress={() => removeLink(link.id, isEdit)}>
                <Trash2 size={16} color="#EF4444" />
              </TouchableOpacity>
            </View>
            <TextInput
              style={[styles.linkInput, { color: theme.colors.text, borderBottomColor: theme.colors.border }]}
              placeholder="Label (e.g. Instagram, Website, Menu)"
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
        {(!links || links.length === 0) && (
          <Text style={{ fontSize: 11, color: theme.colors.textSecondary, fontStyle: 'italic', marginTop: 4 }}>
            No additional links added yet.
          </Text>
        )}
      </View>
    );
    };

    const LinksDisplayModal = () => {
      if (!selectedBusiness) return null;
      
      const allLinks = [];
      if (selectedBusiness.link) {
        allLinks.push({ label: 'Main Website', url: selectedBusiness.link, description: 'Official business link' });
      }
      
      if (selectedBusiness.links) {
        allLinks.push(...selectedBusiness.links);
      }
      
      const deliveryLinks = [];
      if (selectedBusiness.delivery_links) {
        Object.entries(selectedBusiness.delivery_links).forEach(([id, url]) => {
          if (url) {
            const platform = DELIVERY_PLATFORMS.find(p => p.id === id);
            deliveryLinks.push({ label: platform?.name || id, url, icon: platform?.icon || ShoppingBag });
          }
        });
      }

      const avatarUri = selectedBusiness.avatar_url || `https://avatar.vercel.sh/${selectedBusiness.name}.png`;

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
                    <Text style={{ fontSize: 20, fontWeight: '800', color: theme.colors.text, letterSpacing: -0.5 }}>{selectedBusiness.name}</Text>
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 2 }}>
                      <View style={{ backgroundColor: theme.colors.primary + '20', paddingHorizontal: 10, paddingVertical: 3, borderRadius: 20 }}>
                        <Text style={{ fontSize: 11, fontWeight: '700', color: theme.colors.primary }}>{selectedBusiness.category || 'Business'}</Text>
                      </View>
                      {selectedBusiness.rating && (
                        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 3 }}>
                          <Star size={12} color="#FBBF24" fill="#FBBF24" />
                          <Text style={{ fontSize: 12, fontWeight: '700', color: '#FBBF24' }}>{selectedBusiness.rating}</Text>
                        </View>
                      )}
                    </View>
                  </View>
                </View>

                {/* Quick Info Pills */}
                {(selectedBusiness.address || selectedBusiness.phone) && (
                  <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 16 }}>
                    {selectedBusiness.address && (
                      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: theme.colors.surface, paddingHorizontal: 12, paddingVertical: 8, borderRadius: 12 }}>
                        <MapPin size={13} color={theme.colors.textSecondary} />
                        <Text style={{ fontSize: 12, color: theme.colors.textSecondary }} numberOfLines={1}>{selectedBusiness.address}</Text>
                      </View>
                    )}
                    {selectedBusiness.phone && (
                      <TouchableOpacity 
                        onPress={() => Linking.openURL(`tel:${selectedBusiness.phone}`)}
                        style={{ flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: theme.colors.surface, paddingHorizontal: 12, paddingVertical: 8, borderRadius: 12 }}
                      >
                        <Phone size={13} color={theme.colors.primary} />
                        <Text style={{ fontSize: 12, color: theme.colors.primary, fontWeight: '600' }}>{selectedBusiness.phone}</Text>
                      </TouchableOpacity>
                    )}
                  </View>
                )}
              </View>

              <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingHorizontal: 24, paddingBottom: 20 }}>
                {selectedBusiness.description && (
                  <View style={{ marginBottom: 24, backgroundColor: theme.colors.surface, borderRadius: 16, padding: 16 }}>
                    <Text style={{ fontSize: 14, color: theme.colors.text, lineHeight: 22 }}>{selectedBusiness.description}</Text>
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

                {deliveryLinks.length > 0 && (
                  <>
                    <Text style={{ fontSize: 10, fontWeight: '800', letterSpacing: 2, color: theme.colors.textSecondary, marginBottom: 12 }}>ORDER & DELIVERY</Text>
                    <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 10, marginBottom: 24 }}>
                      {deliveryLinks.map((link, idx) => {
                        const Icon = link.icon;
                        return (
                          <TouchableOpacity 
                            key={idx} 
                            onPress={() => handleOpenLink(link.url)}
                            style={{ 
                              flexDirection: 'row', alignItems: 'center', gap: 8, 
                              backgroundColor: theme.colors.surface, borderWidth: 1, borderColor: theme.colors.border,
                              paddingHorizontal: 16, paddingVertical: 12, borderRadius: 14,
                            }}
                            activeOpacity={0.7}
                          >
                            <Icon size={16} color={theme.colors.primary} />
                            <Text style={{ fontSize: 13, fontWeight: '700', color: theme.colors.text }}>{link.label}</Text>
                          </TouchableOpacity>
                        );
                      })}
                    </View>
                  </>
                )}
              </ScrollView>
            </View>
          </BlurView>
        </Modal>
      );
    };

    const submitBusiness = async (paymentStatus) => {
    try {
      const user = await getStoredUser();
      
      let avatarUrl = null;
      if (form.avatar) {
        avatarUrl = await uploadImage(user?.id);
      }

      const { error } = await supabase
            .from('rbusinesses')
            .insert({
              user_id: user?.id,
              name: form.name,
              category: form.category,
              link: form.link,
              address: form.address,
              phone: form.phone,
              description: form.description,
                avatar_url: avatarUrl,
                  rating: form.rating ? parseFloat(form.rating) : null,
                  delivery_links: form.delivery_links,
                  links: form.links || [],
                  payment_status: paymentStatus,
                status: 'pending',
                city_id: city_id
              });

        if (error) throw error;
        
        toast.success("Business submitted for moderation!");
        setShowModal(false);
        setForm({ name: '', category: 'Retail', link: '', address: '', phone: '', description: '', avatar: null, rating: null, delivery_links: {} });
      fetchBusinesses();
    } catch (error) {
      console.error(error);
      toast.error("Failed to save business details.");
    } finally {
      setSubmitting(false);
    }
  };

  const handleClaimBusiness = (item) => {
    crossAlert(
      "Claim Business Account",
      `This will set your account as a Business account linked to "${item.name}". Your posts will show a Business badge and people can follow your account.`,
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Claim",
          onPress: async () => {
            try {
              const currentType = currentUser?.account_type || 'personal';
              const newType = (currentType === 'talent') ? 'both' : 'business';
              const { error } = await supabase
                .from('rusers')
                .update({
                  account_type: newType,
                  active_identity: 'business',
                  business_showcase_id: item.id,
                })
                .eq('id', currentUser.id);
              if (error) throw error;
              // Re-fetch full user from DB to get all fields
              const { data: freshUser } = await supabase
                .from('rusers')
                .select('*')
                .eq('id', currentUser.id)
                .single();
              if (freshUser) {
                freshUser._business = { name: item.name, avatar_url: item.avatar_url, category: item.category };
                setCurrentUser(freshUser);
                useAuthStore.getState().setAuth(freshUser);
              }
              toast.success("Business account claimed! Your posts will now show a Business badge.");
            } catch (e) {
              console.error('Claim business error:', e);
              toast.error("Failed to claim business account: " + (e.message || 'Unknown error'));
            }
          },
        },
      ]
    );
  };

  const handleOpenLink = async (url) => {
    if (!url) return;
    try {
      const supported = await Linking.canOpenURL(url);
      if (supported) {
        await Linking.openURL(url);
      }
    } catch (error) {
      toast.error("Cannot open link");
    }
  };

  const openEditModal = (item) => {
    setEditForm({
      id: item.id,
      name: item.name,
      category: item.category,
      link: item.link || '',
      address: item.address || '',
      phone: item.phone || '',
        description: item.description || '',
        avatar: null,
        rating: item.rating?.toString() || '',
        delivery_links: item.delivery_links || {},
        links: Array.isArray(item.links) ? item.links : (typeof item.links === 'string' ? JSON.parse(item.links || '[]') : []),
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
                .from('rbusinesses')
                .update({ is_deleted: true })
                .eq('id', item.id);

              if (error) throw error;
              
              Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
              setShowEditModal(false);
              setEditForm(null);
              fetchBusinesses();
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
      if (editForm.category !== orig.category) {
        changes.push({ field_name: 'category', old_value: orig.category, new_value: editForm.category });
      }
      if (editForm.link !== (orig.link || '')) {
        changes.push({ field_name: 'link', old_value: orig.link, new_value: editForm.link });
      }
      if (editForm.address !== (orig.address || '')) {
        changes.push({ field_name: 'address', old_value: orig.address, new_value: editForm.address });
      }
      if (editForm.phone !== (orig.phone || '')) {
        changes.push({ field_name: 'phone', old_value: orig.phone, new_value: editForm.phone });
      }
        if (editForm.description !== (orig.description || '')) {
          changes.push({ field_name: 'description', old_value: orig.description, new_value: editForm.description });
        }
          if (JSON.stringify(editForm.delivery_links) !== JSON.stringify(orig.delivery_links || {})) {
            changes.push({ field_name: 'delivery_links', old_value: JSON.stringify(orig.delivery_links || {}), new_value: JSON.stringify(editForm.delivery_links) });
          }
          if (JSON.stringify(editForm.links || []) !== JSON.stringify(orig.links || [])) {
            changes.push({ field_name: 'links', old_value: JSON.stringify(orig.links || []), new_value: JSON.stringify(editForm.links || []) });
          }

      if (editForm.avatar) {
        const fileName = `${user?.id || 'anon'}_${Date.now()}.jpg`;
        const filePath = `avatars/${fileName}`;
        
        await supabase.storage
          .from('business_avatars')
          .upload(filePath, decode(editForm.avatar.base64), {
            contentType: 'image/jpeg',
            upsert: true
          });

        const { data: { publicUrl } } = supabase.storage
          .from('business_avatars')
          .getPublicUrl(filePath);

        changes.push({ field_name: 'avatar_url', old_value: orig.avatar_url, new_value: publicUrl });
      }

      if (changes.length === 0) {
        toast.info("You haven't made any changes.");
        setSubmitting(false);
        return;
      }

      const insertData = changes.map(c => ({
        showcase_type: 'business',
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

    const filteredBusinesses = useMemo(() => {
    return businesses.filter(b => {
      const isOwnUnapproved = b.user_id === currentUser?.id && b.status !== 'approved';
      if (isOwnUnapproved) return false;
      if (!searchQuery) return true;
      return b.name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        b.category?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        b.address?.toLowerCase().includes(searchQuery.toLowerCase());
    });
  }, [businesses, searchQuery, currentUser]);

    const renderItem = ({ item }) => {
        return (
          <TouchableOpacity
            activeOpacity={0.9}
            onPress={() => {
              setSelectedBusiness(item);
              setShowLinksModal(true);
            }}
            style={styles.businessCard}
          >
            <View style={styles.cardImageContainer}>
              <Image 
                source={{ uri: item.avatar_url || `https://avatar.vercel.sh/${item.name}.png` }} 
                style={styles.cardImage} 
                resizeMode="cover"
              />
              <LinearGradient
                colors={['transparent', 'rgba(0,0,0,0.8)']}
                style={StyleSheet.absoluteFill}
              />
              
              <View style={styles.cardOverlayTop}>
                {item.rating ? (
                  <View style={styles.ratingPill}>
                    <Star size={10} color="#FBBF24" fill="#FBBF24" />
                    <Text style={styles.ratingPillText}>{item.rating}</Text>
                  </View>
                ) : (
                  <View />
                )}
              </View>
            </View>
  
              <View style={[styles.cardInfo, { backgroundColor: theme.colors.surface }]}>
                <Text style={dynamicStyles.bizNameSmall} numberOfLines={1}>{item.name}</Text>
                <View style={styles.cardHeaderRow}>
                  <Text style={[styles.bizCategorySmall, { color: theme.colors.primary }]}>{item.category?.toUpperCase() || 'BUSINESS'}</Text>
                    <View style={styles.deliveryIconsRow}>
                      {item.delivery_links && Object.entries(item.delivery_links).map(([platformId, url]) => {
                        if (!url) return null;
                        const platform = DELIVERY_PLATFORMS.find(p => p.id === platformId);
                        if (!platform) return null;
                        const Icon = platform.icon;
                        return (
                          <TouchableOpacity 
                            key={platformId} 
                            onPress={(e) => {
                              e.stopPropagation();
                              handleOpenLink(url);
                            }}
                            style={styles.miniDeliveryIcon}
                          >
                            <Icon size={10} color={theme.colors.textSecondary} />
                          </TouchableOpacity>
                        );
                      })}
                      {(item.link || (item.links && item.links.length > 0)) && (
                        <View style={styles.miniDeliveryIcon}>
                          <MoreHorizontal size={10} color={theme.colors.textSecondary} />
                        </View>
                      )}
                    </View>
                </View>
                {item.address ? (
                  <View style={styles.locRowSmall}>
                    <MapPin size={10} color={theme.colors.textSecondary} />
                    <Text style={[styles.locTextSmall, { color: theme.colors.textSecondary }]} numberOfLines={1}>{item.address}</Text>
                  </View>
                ) : null}
              </View>
          </TouchableOpacity>
        );
      };

  const renderMapView = () => {
    if (Platform.OS === 'web' || !MapView) {
      return (
        <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', padding: 40 }}>
          <MapPin size={48} color={theme.colors.textSecondary} />
          <Text style={{ color: theme.colors.textSecondary, marginTop: 16, fontSize: 16, textAlign: 'center' }}>
            Map view is only available on the mobile app.
          </Text>
        </View>
      );
    }
    return (
      <MapView
        style={{ flex: 1 }}
        initialRegion={{
          latitude: 52.3082,
          longitude: -1.9427,
          latitudeDelta: 0.0922,
          longitudeDelta: 0.0421,
        }}
        userInterfaceStyle={isLight ? "light" : "dark"}
      >
        {filteredBusinesses.map((b) => (
          <Marker
            key={b.id}
            coordinate={{
              latitude: b.latitude || 52.3082 + (Math.random() - 0.5) * 0.01,
              longitude: b.longitude || -1.9427 + (Math.random() - 0.5) * 0.01,
            }}
            title={b.name}
            description={b.category}
          >
            <View style={{ backgroundColor: theme.colors.primary, padding: 5, borderRadius: 20, borderWidth: 2, borderColor: theme.colors.background }}>
               <Briefcase size={16} color={isLight ? '#FFF' : '#000'} />
            </View>
            <Callout onPress={() => handleOpenLink(b.link)}>
              <View style={{ padding: 10, width: 200 }}>
                <Text style={{ fontWeight: 'bold' }}>{b.name}</Text>
                <Text style={{ fontSize: 12 }}>{b.category}</Text>
                <Text style={{ fontSize: 10, marginTop: 5, color: '#666' }}>Tap to view on Google Maps</Text>
              </View>
            </Callout>
          </Marker>
        ))}
      </MapView>
    );
  };

  return (
    <View style={[styles.container, { backgroundColor: theme.colors.background }]}>
      <View style={{ paddingTop: insets.top, flex: 1 }}>
        <View style={styles.header}>
          <TouchableOpacity onPress={() => goBack(router)} style={styles.backButton}>
            <ChevronLeft color={theme.colors.text} size={24} strokeWidth={2} />
          </TouchableOpacity>
          <Text style={dynamicStyles.headerTitle}>LOCAL BIZ</Text>
          <View style={styles.headerRight}>
            <TouchableOpacity 
              onPress={() => {
                Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                setViewMode(v => v === 'list' ? 'map' : 'list');
              }}
              style={styles.backButton}
            >
              <MapPin color={viewMode === 'map' ? theme.colors.primary : theme.colors.text} size={22} />
            </TouchableOpacity>
            <TouchableOpacity 
              onPress={() => {
                Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                setShowModal(true);
              }}
              style={[styles.headerCreateButton, { backgroundColor: theme.colors.primary }]}
            >
              <Plus color={isLight ? "#FFF" : "#000"} size={16} strokeWidth={3} />
              <Text style={[styles.headerCreateText, { color: isLight ? "#FFF" : "#000" }]}>£3.99</Text>
            </TouchableOpacity>
          </View>
        </View>

        <View style={styles.searchSection}>
          <View style={[styles.searchBar, { backgroundColor: theme.colors.surface }]}>
            <Search size={18} color={theme.colors.textSecondary} />
            <TextInput
              style={[styles.searchInput, { color: theme.colors.text }]}
              placeholder="Search local businesses..."
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
        </View>

        {loading ? (
          <View style={styles.centered}>
            <ActivityIndicator color={theme.colors.primary} />
          </View>
        ) : (
            viewMode === 'list' ? (
              <FlatList
                        data={filteredBusinesses}
                        renderItem={renderItem}
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
                                  setSelectedBusiness(item);
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
                                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                                    <Text style={[styles.myShowcaseCategory, { color: theme.colors.textSecondary }]}>{item.category}</Text>
                                      <View style={styles.deliveryIconsRow}>
                                        {item.delivery_links && Object.entries(item.delivery_links).map(([platformId, url]) => {
                                          if (!url) return null;
                                          const platform = DELIVERY_PLATFORMS.find(p => p.id === platformId);
                                          if (!platform) return null;
                                          const Icon = platform.icon;
                                          return (
                                            <View key={platformId} style={styles.miniDeliveryIcon}>
                                              <Icon size={12} color={theme.colors.textSecondary} />
                                            </View>
                                          );
                                        })}
                                        {(item.link || (item.links && item.links.length > 0)) && (
                                          <View style={styles.miniDeliveryIcon}>
                                            <MoreHorizontal size={12} color={theme.colors.textSecondary} />
                                          </View>
                                        )}
                                      </View>
                                  </View>
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
                                {item.status === 'approved' && currentUser?.business_showcase_id !== item.id && (
                                  <TouchableOpacity
                                    onPress={() => handleClaimBusiness(item)}
                                    style={[styles.editButton, { backgroundColor: '#8B5CF6' }]}
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
                      ListFooterComponent={null}
                    ListEmptyComponent={

                  <View style={styles.emptyState}>
                    <Briefcase size={48} color={theme.colors.border} />
                    <Text style={dynamicStyles.emptyText}>No businesses found.</Text>
                    <Text style={dynamicStyles.emptySubtext}>Try a different search term.</Text>
                  </View>
                }
              />
          ) : renderMapView()
          )}
  
          </View>
  
        <LinksDisplayModal />

        <Modal visible={showModal} animationType="slide" transparent>
        <BlurView intensity={100} tint={isLight ? "light" : "dark"} style={styles.modalOverlay}>
          <View style={[styles.modalContent, { backgroundColor: theme.colors.background, paddingBottom: insets.bottom + 20 }]}>
            <View style={styles.modalHeader}>
              <Text style={dynamicStyles.modalTitle}>List Your Business</Text>
              <TouchableOpacity onPress={() => setShowModal(false)}>
                <Text style={[styles.closeText, { color: theme.colors.textSecondary }]}>Close</Text>
              </TouchableOpacity>
            </View>

            <ScrollView showsVerticalScrollIndicator={false}>
              <View style={[styles.priceTag, { backgroundColor: theme.colors.surface }]}>
                <ShieldCheck size={16} color={theme.colors.success} />
                <Text style={[styles.priceText, { color: theme.colors.textSecondary }]}>Promote your business for £3.99</Text>
              </View>

              <Text style={dynamicStyles.label}>BUSINESS LOGO</Text>
              <TouchableOpacity style={[styles.imagePicker, { backgroundColor: theme.colors.surface, borderColor: theme.colors.border }]} onPress={pickImage}>
                {form.avatar ? (
                  <Image source={{ uri: form.avatar.uri }} style={styles.pickedImage} />
                ) : (
                  <View style={styles.imagePlaceholder}>
                    <Camera size={24} color={theme.colors.textSecondary} />
                    <Text style={[styles.imagePlaceholderText, { color: theme.colors.textSecondary }]}>Upload Logo</Text>
                  </View>
                )}
              </TouchableOpacity>

              <Text style={dynamicStyles.label}>GOOGLE MAPS LINK</Text>
              <View style={styles.linkInputContainer}>
                <TextInput
                  style={[styles.input, { flex: 1, marginBottom: 0, color: theme.colors.text, borderBottomColor: theme.colors.border }]}
                  placeholder="Paste Google Maps URL..."
                  placeholderTextColor={theme.colors.textSecondary}
                  autoCapitalize="none"
                  value={form.link}
                  onChangeText={(t) => setForm({ ...form, link: t })}
                />
                <TouchableOpacity 
                  style={[styles.processButton, { backgroundColor: theme.colors.primary }]} 
                  onPress={processGoogleLink}
                  disabled={processingLink}
                >
                  {processingLink ? (
                    <ActivityIndicator size="small" color={isLight ? "#FFF" : "#000"} />
                  ) : (
                    <Globe size={18} color={isLight ? "#FFF" : "#000"} />
                  )}
                </TouchableOpacity>
              </View>
              <Text style={[styles.hintText, { color: theme.colors.textSecondary }]}>We'll try to fetch details from the link</Text>

              <Text style={dynamicStyles.label}>BUSINESS NAME</Text>
              <TextInput
                style={dynamicStyles.input}
                placeholder="Redditch Coffee Co."
                placeholderTextColor={theme.colors.textSecondary}
                value={form.name}
                onChangeText={(t) => setForm({ ...form, name: t })}
              />

              <Text style={dynamicStyles.label}>CATEGORY</Text>
              <View style={styles.tagRow}>
                {['Cafe', 'Restaurant', 'Retail', 'Service', 'Health', 'Other'].map((c) => (
                  <TouchableOpacity
                    key={c}
                    onPress={() => setForm({ ...form, category: c })}
                    style={[styles.tag, { backgroundColor: theme.colors.surface, borderColor: theme.colors.border }, form.category === c && { backgroundColor: theme.colors.primary, borderColor: theme.colors.primary }]}
                  >
                    <Text style={[dynamicStyles.tagText, form.category === c && dynamicStyles.activeTagText]}>
                      {c}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>

              <Text style={dynamicStyles.label}>ADDRESS (OPTIONAL)</Text>
              <TextInput
                style={dynamicStyles.input}
                placeholder="123 High Street, Redditch"
                placeholderTextColor={theme.colors.textSecondary}
                value={form.address}
                onChangeText={(t) => setForm({ ...form, address: t })}
              />

              <Text style={dynamicStyles.label}>PHONE (OPTIONAL)</Text>
              <TextInput
                style={dynamicStyles.input}
                placeholder="01234 567890"
                placeholderTextColor={theme.colors.textSecondary}
                keyboardType="phone-pad"
                value={form.phone}
                onChangeText={(t) => setForm({ ...form, phone: t })}
              />

                <Text style={dynamicStyles.label}>DESCRIPTION</Text>
                <TextInput
                  style={[dynamicStyles.input, styles.textArea]}
                  placeholder="What makes your business special?"
                  placeholderTextColor={theme.colors.textSecondary}
                  multiline
                  numberOfLines={4}
                  value={form.description}
                  onChangeText={(t) => setForm({ ...form, description: t })}
                />

                <Text style={dynamicStyles.label}>DELIVERY PLATFORMS</Text>
                <View style={styles.deliveryPlatformsGrid}>
                  {DELIVERY_PLATFORMS.map((platform) => {
                    const Icon = platform.icon;
                    const isSelected = !!form.delivery_links[platform.id];
                    return (
                      <View key={platform.id} style={styles.deliveryPlatformItem}>
                        <TouchableOpacity
                          onPress={() => {
                            const newLinks = { ...form.delivery_links };
                            if (isSelected) {
                              delete newLinks[platform.id];
                            } else {
                              newLinks[platform.id] = '';
                            }
                            setForm({ ...form, delivery_links: newLinks });
                          }}
                          style={[
                            styles.platformSelectButton,
                            { backgroundColor: theme.colors.surface, borderColor: theme.colors.border },
                            isSelected && { backgroundColor: theme.colors.primary, borderColor: theme.colors.primary }
                          ]}
                        >
                          <Icon size={16} color={isSelected ? (isLight ? '#FFF' : '#000') : theme.colors.textSecondary} />
                          <Text style={[styles.platformSelectText, { color: isSelected ? (isLight ? '#FFF' : '#000') : theme.colors.textSecondary }]}>
                            {platform.name}
                          </Text>
                        </TouchableOpacity>
                        
                        {isSelected && (
                          <TextInput
                            style={[styles.platformUrlInput, { color: theme.colors.text, borderBottomColor: theme.colors.primary }]}
                            placeholder={`Link to ${platform.name}...`}
                            placeholderTextColor={theme.colors.textSecondary}
                            value={form.delivery_links[platform.id]}
                            onChangeText={(t) => {
                              const newLinks = { ...form.delivery_links };
                              newLinks[platform.id] = t;
                              setForm({ ...form, delivery_links: newLinks });
                            }}
                            autoCapitalize="none"
                          />
                        )}
                      </View>
                    );
                    })}
                  </View>

                  <LinksManager links={form.links} isEdit={false} />
  
                  <TouchableOpacity 
                    style={[styles.submitButton, { backgroundColor: theme.colors.primary }]} 
                    onPress={handlePurchaseAndSubmit}
                  disabled={submitting}
                >
                  {submitting ? (
                    <ActivityIndicator color={isLight ? "#FFF" : "#000"} />
                  ) : (
                    <Text style={dynamicStyles.submitButtonText}>PAY £3.99 & SUBMIT</Text>
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
              <Text style={dynamicStyles.modalTitle}>Edit Your Business</Text>
              <TouchableOpacity onPress={() => setShowEditModal(false)}>
                <Text style={[styles.closeText, { color: theme.colors.textSecondary }]}>Close</Text>
              </TouchableOpacity>
            </View>

            <ScrollView showsVerticalScrollIndicator={false}>
              <View style={[styles.priceTag, { backgroundColor: theme.colors.surface }]}>
                <Info size={16} color={theme.colors.primary} />
                <Text style={[styles.priceText, { color: theme.colors.textSecondary }]}>Changes will be reviewed before going live</Text>
              </View>

              <Text style={dynamicStyles.label}>BUSINESS LOGO</Text>
              <TouchableOpacity style={[styles.imagePicker, { backgroundColor: theme.colors.surface, borderColor: theme.colors.border }]} onPress={pickEditImage}>
                {editForm?.avatar ? (
                  <Image source={{ uri: editForm.avatar.uri }} style={styles.pickedImage} />
                ) : editForm?.originalData?.avatar_url ? (
                  <Image source={{ uri: editForm.originalData.avatar_url }} style={styles.pickedImage} />
                ) : (
                  <View style={styles.imagePlaceholder}>
                    <Camera size={24} color={theme.colors.textSecondary} />
                    <Text style={[styles.imagePlaceholderText, { color: theme.colors.textSecondary }]}>Upload Logo</Text>
                  </View>
                )}
              </TouchableOpacity>

              <Text style={dynamicStyles.label}>BUSINESS NAME</Text>
              <TextInput
                style={dynamicStyles.input}
                placeholder="Redditch Coffee Co."
                placeholderTextColor={theme.colors.textSecondary}
                value={editForm?.name || ''}
                onChangeText={(t) => setEditForm({ ...editForm, name: t })}
              />

              <Text style={dynamicStyles.label}>CATEGORY</Text>
              <View style={styles.tagRow}>
                {['Cafe', 'Restaurant', 'Retail', 'Service', 'Health', 'Other'].map((c) => (
                  <TouchableOpacity
                    key={c}
                    onPress={() => setEditForm({ ...editForm, category: c })}
                    style={[styles.tag, { backgroundColor: theme.colors.surface, borderColor: theme.colors.border }, editForm?.category === c && { backgroundColor: theme.colors.primary, borderColor: theme.colors.primary }]}
                  >
                    <Text style={[dynamicStyles.tagText, editForm?.category === c && dynamicStyles.activeTagText]}>
                      {c}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>

              <Text style={dynamicStyles.label}>GOOGLE MAPS LINK</Text>
              <TextInput
                style={dynamicStyles.input}
                placeholder="Paste Google Maps URL..."
                placeholderTextColor={theme.colors.textSecondary}
                autoCapitalize="none"
                value={editForm?.link || ''}
                onChangeText={(t) => setEditForm({ ...editForm, link: t })}
              />

              <Text style={dynamicStyles.label}>ADDRESS (OPTIONAL)</Text>
              <TextInput
                style={dynamicStyles.input}
                placeholder="123 High Street, Redditch"
                placeholderTextColor={theme.colors.textSecondary}
                value={editForm?.address || ''}
                onChangeText={(t) => setEditForm({ ...editForm, address: t })}
              />

              <Text style={dynamicStyles.label}>PHONE (OPTIONAL)</Text>
              <TextInput
                style={dynamicStyles.input}
                placeholder="01234 567890"
                placeholderTextColor={theme.colors.textSecondary}
                keyboardType="phone-pad"
                value={editForm?.phone || ''}
                onChangeText={(t) => setEditForm({ ...editForm, phone: t })}
              />

              <Text style={dynamicStyles.label}>DESCRIPTION</Text>
              <TextInput
                style={[dynamicStyles.input, styles.textArea]}
                placeholder="What makes your business special?"
                placeholderTextColor={theme.colors.textSecondary}
                multiline
                numberOfLines={4}
                value={editForm?.description || ''}
                onChangeText={(t) => setEditForm({ ...editForm, description: t })}
              />

              <Text style={dynamicStyles.label}>DELIVERY PLATFORMS</Text>
              <View style={styles.deliveryPlatformsGrid}>
                {DELIVERY_PLATFORMS.map((platform) => {
                  const Icon = platform.icon;
                  const isSelected = !!editForm?.delivery_links?.[platform.id];
                  return (
                    <View key={platform.id} style={styles.deliveryPlatformItem}>
                      <TouchableOpacity
                        onPress={() => {
                          const newLinks = { ...editForm?.delivery_links };
                          if (isSelected) {
                            delete newLinks[platform.id];
                          } else {
                            newLinks[platform.id] = '';
                          }
                          setEditForm({ ...editForm, delivery_links: newLinks });
                        }}
                        style={[
                          styles.platformSelectButton,
                          { backgroundColor: theme.colors.surface, borderColor: theme.colors.border },
                          isSelected && { backgroundColor: theme.colors.primary, borderColor: theme.colors.primary }
                        ]}
                      >
                        <Icon size={16} color={isSelected ? (isLight ? '#FFF' : '#000') : theme.colors.textSecondary} />
                        <Text style={[styles.platformSelectText, { color: isSelected ? (isLight ? '#FFF' : '#000') : theme.colors.textSecondary }]}>
                          {platform.name}
                        </Text>
                      </TouchableOpacity>
                      
                      {isSelected && (
                        <TextInput
                          style={[styles.platformUrlInput, { color: theme.colors.text, borderBottomColor: theme.colors.primary }]}
                          placeholder={`Link to ${platform.name}...`}
                          placeholderTextColor={theme.colors.textSecondary}
                          value={editForm?.delivery_links?.[platform.id] || ''}
                          onChangeText={(t) => {
                            const newLinks = { ...editForm?.delivery_links };
                            newLinks[platform.id] = t;
                            setEditForm({ ...editForm, delivery_links: newLinks });
                          }}
                          autoCapitalize="none"
                        />
                      )}
                    </View>
                  );
                  })}
                </View>

                <LinksManager links={editForm?.links} isEdit={true} />

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
  container: { flex: 1 },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 20, paddingVertical: 15 },
  headerTitle: { fontSize: 18, fontWeight: '900', letterSpacing: 2 },
  headerRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
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
  searchSection: { paddingHorizontal: 20, paddingVertical: 10 },
  searchBar: { flexDirection: 'row', alignItems: 'center', borderRadius: 12, paddingHorizontal: 12, height: 44, gap: 10 },
  searchInput: { flex: 1, fontSize: 14 },
  listContent: { paddingHorizontal: 12, paddingBottom: 120 },
  columnWrapper: { justifyContent: 'space-between' },
  businessCard: { flex: 1, height: 220, margin: 6, borderRadius: 24, overflow: 'hidden', borderWidth: 1 },
  cardImageContainer: { flex: 1, width: '100%' },
  cardImage: { width: '100%', height: '100%' },
  cardOverlayTop: { position: 'absolute', top: 10, left: 10, right: 10, flexDirection: 'row', justifyContent: 'flex-end' },
  ratingPill: { backgroundColor: 'rgba(0,0,0,0.5)', flexDirection: 'row', alignItems: 'center', gap: 3, paddingHorizontal: 8, paddingVertical: 4, borderRadius: 10, borderWidth: 1, borderColor: 'rgba(255,255,255,0.1)' },
  ratingPillText: { color: '#FFF', fontSize: 10, fontWeight: '900' },
  cardInfo: { padding: 12 },
  bizNameSmall: { fontSize: 14, fontWeight: '800' },
  bizCategorySmall: { fontSize: 9, fontWeight: '800', letterSpacing: 0.5, marginTop: 2 },
  locRowSmall: { flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 4 },
  locTextSmall: { fontSize: 10, fontWeight: '500' },
  backButton: { padding: 5 },
  centered: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  fab: { position: 'absolute', right: 20, width: 56, height: 56, borderRadius: 28, justifyContent: 'center', alignItems: 'center', elevation: 10 },
  emptyState: { alignItems: 'center', marginTop: 100 },
  emptyText: { fontSize: 18, fontWeight: '800', marginTop: 20 },
  emptySubtext: { fontSize: 14, marginTop: 5 },
  modalOverlay: { flex: 1, justifyContent: 'flex-end', ...(Platform.OS === 'web' ? { justifyContent: 'center', alignItems: 'center', backgroundColor: 'rgba(0,0,0,0.7)' } : {}) },
  modalContent: { borderTopLeftRadius: 40, borderTopRightRadius: 40, padding: 30, maxHeight: '92%', borderTopWidth: 1, ...(Platform.OS === 'web' ? { maxWidth: 520, width: '95%', maxHeight: '85vh', borderRadius: 24, borderTopWidth: 0 } : {}) },
  modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 32 },
  modalTitle: { fontSize: 24, fontWeight: '300', letterSpacing: -0.5 },
  closeText: { fontSize: 14, fontWeight: '500' },
  priceTag: { flexDirection: 'row', alignItems: 'center', padding: 16, borderRadius: 16, marginBottom: 32, gap: 10 },
  priceText: { fontSize: 13, fontWeight: '400' },
  label: { fontSize: 10, fontWeight: '800', letterSpacing: 2, marginBottom: 12, marginTop: 20 },
  hintText: { fontSize: 10, marginTop: 4 },
  input: { borderBottomWidth: 1, paddingVertical: 12, fontSize: 17, marginBottom: 10 },
  linkInputContainer: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  processButton: { width: 40, height: 40, borderRadius: 20, justifyContent: 'center', alignItems: 'center' },
  tagRow: { flexDirection: 'row', gap: 10, marginBottom: 10, flexWrap: 'wrap' },
  tag: { paddingHorizontal: 16, paddingVertical: 10, borderRadius: 100, borderWidth: 1 },
  tagText: { fontSize: 13, fontWeight: '600' },
  textArea: { minHeight: 80, textAlignVertical: 'top' },
  submitButton: { borderRadius: 100, padding: 20, alignItems: 'center', marginTop: 40 },
  submitButtonText: { fontSize: 15, fontWeight: '700', letterSpacing: 1 },
  imagePicker: { width: 80, height: 80, borderRadius: 16, borderWidth: 1, borderStyle: 'dashed', justifyContent: 'center', alignItems: 'center', overflow: 'hidden', marginBottom: 10 },
  pickedImage: { width: '100%', height: '100%' },
  imagePlaceholder: { alignItems: 'center', gap: 4 },
    imagePlaceholderText: { fontSize: 9, fontWeight: '600' },
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
      deliveryPlatformsGrid: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        gap: 10,
        marginBottom: 10,
      },
      deliveryPlatformItem: {
        width: '48%',
        marginBottom: 10,
      },
      platformSelectButton: {
        flexDirection: 'row',
        alignItems: 'center',
        padding: 10,
        borderRadius: 12,
        borderWidth: 1,
        gap: 8,
      },
      platformSelectText: {
        fontSize: 12,
        fontWeight: '600',
      },
      platformUrlInput: {
        borderBottomWidth: 1,
        fontSize: 12,
        paddingVertical: 4,
        marginTop: 4,
      },
      cardHeaderRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginTop: 2,
      },
      deliveryIconsRow: {
        flexDirection: 'row',
        gap: 4,
      },
        miniDeliveryIcon: {
          padding: 2,
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
        deliveryPill: {
          flexDirection: 'row',
          alignItems: 'center',
          paddingHorizontal: 12,
          paddingVertical: 8,
          borderRadius: 100,
          borderWidth: 1,
          gap: 6,
        },
      });

