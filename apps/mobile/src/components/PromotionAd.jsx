import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Dimensions, Linking, Alert } from 'react-native';
import { Image } from 'expo-image';
import { LinearGradient } from 'expo-linear-gradient';
import { Star, Briefcase, MapPin, Music, Youtube, Globe, Instagram, ExternalLink, ShoppingBag, Truck, MoreHorizontal } from 'lucide-react-native';

const DELIVERY_PLATFORMS = [
  { id: 'amazon', name: 'Amazon', icon: ShoppingBag },
  { id: 'justeat', name: 'Just Eat', icon: Truck },
  { id: 'deliveroo', name: 'Deliveroo', icon: Truck },
  { id: 'ubereats', name: 'Uber Eats', icon: Truck },
];

export default function PromotionAd({ item }) {
  const { theme, isLight } = useTheme();
  const router = useRouter();

  if (!item) return null;

  const isBusiness = !!item.category && !item.platform;
  const isTalent = !!item.platform || (!!item.category && !isBusiness);

  const handleOpen = () => {
    if (item.link) {
      Linking.openURL(item.link).catch(() => {
        Alert.alert("Error", "Could not open link");
      });
    }
  };

  const handleAdvertise = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    Alert.alert(
      "Promote Your Work",
      "What would you like to list on Town Wall?",
      [
        {
          text: "Local Business",
          onPress: () => router.push("/businesses?create=true"),
        },
        {
          text: "Local Talent",
          onPress: () => router.push("/talent?create=true"),
        },
        {
          text: "Cancel",
          style: "cancel",
        },
      ]
    );
  };

  const getPlatformIcon = (platform) => {
    const p = platform?.toLowerCase() || '';
    if (p.includes('youtube')) return <Youtube size={12} color="#FFF" />;
    if (p.includes('spotify') || p.includes('music') || p.includes('tiktok')) return <Music size={12} color="#FFF" />;
    if (p.includes('instagram')) return <Instagram size={12} color="#FFF" />;
    return <Globe size={12} color="#FFF" />;
  };

  return (
    <View style={[styles.container, { backgroundColor: theme.colors.surface, borderColor: theme.colors.border }]}>
      <View style={styles.headerContainer}>
        <Text style={[styles.header, { color: theme.colors.text }]}>Check out Local Talent & Businesses</Text>
        <TouchableOpacity onPress={handleAdvertise} style={styles.advertiseBtn}>
          <Text style={[styles.advertiseText, { color: theme.colors.textSecondary }]}>advertise here</Text>
        </TouchableOpacity>
      </View>
      
      <TouchableOpacity 
        activeOpacity={0.9} 
        onPress={handleOpen}
        style={[styles.card, { backgroundColor: theme.colors.background, borderColor: theme.colors.border }]}
      >
        <View style={styles.imageContainer}>
          <Image 
            source={{ uri: item.avatar_url || `https://avatar.vercel.sh/${item.name}.png` }} 
            style={styles.image}
            contentFit="cover"
          />
          <LinearGradient
            colors={['transparent', 'rgba(0,0,0,0.7)']}
            style={StyleSheet.absoluteFill}
          />
          <View style={styles.badge}>
            {isBusiness ? <Briefcase size={12} color="#FFF" /> : getPlatformIcon(item.platform)}
            <Text style={styles.badgeText}>{isBusiness ? 'BUSINESS' : 'TALENT'}</Text>
          </View>
        </View>

        <View style={styles.info}>
            <View style={styles.nameRow}>
              <Text style={[styles.name, { color: theme.colors.text }]} numberOfLines={1}>{item.name}</Text>
              {isBusiness && (
                <View style={{ flexDirection: 'row', gap: 4, alignItems: 'center' }}>
                  {item.delivery_links && Object.entries(item.delivery_links).map(([platformId, url]) => {
                    if (!url) return null;
                    const platform = DELIVERY_PLATFORMS.find(p => p.id === platformId);
                    if (!platform) return null;
                    const Icon = platform.icon;
                    return <Icon key={platformId} size={10} color={theme.colors.textSecondary} />;
                  })}
                  {(item.link || (item.links && item.links.length > 0)) && (
                    <MoreHorizontal size={10} color={theme.colors.textSecondary} />
                  )}
                </View>
              )}
              <ExternalLink size={14} color={theme.colors.textSecondary} />
            </View>
          <Text style={[styles.subtext, { color: theme.colors.primary }]}>
            {item.category?.toUpperCase() || (isTalent ? 'LOCAL TALENT' : 'LOCAL BUSINESS')}
          </Text>
          {isBusiness && item.address && (
            <View style={styles.locRow}>
              <MapPin size={10} color={theme.colors.textSecondary} />
              <Text style={[styles.locText, { color: theme.colors.textSecondary }]} numberOfLines={1}>{item.address}</Text>
            </View>
          )}
        </View>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    margin: 10,
    borderRadius: 20,
    padding: 16,
    borderWidth: 1,
    gap: 12,
  },
  headerContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4,
  },
  header: {
    fontSize: 16,
    fontWeight: '800',
  },
  card: {
    flexDirection: 'row',
    borderRadius: 16,
    overflow: 'hidden',
    borderWidth: 1,
    height: 100,
  },
  imageContainer: {
    width: 100,
    height: 100,
    position: 'relative',
  },
  image: {
    width: '100%',
    height: '100%',
  },
  badge: {
    position: 'absolute',
    top: 8,
    left: 8,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: 'rgba(0,0,0,0.6)',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
  },
  badgeText: {
    color: '#FFF',
    fontSize: 9,
    fontWeight: '900',
  },
  info: {
    flex: 1,
    padding: 12,
    justifyContent: 'center',
  },
  nameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 8,
  },
  name: {
    fontSize: 16,
    fontWeight: '800',
    flex: 1,
  },
  subtext: {
    fontSize: 11,
    fontWeight: '700',
    marginTop: 2,
    letterSpacing: 0.5,
  },
  locRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginTop: 6,
  },
  locText: {
    fontSize: 11,
  },
  advertiseBtn: {
    alignSelf: 'center',
  },
  advertiseText: {
    fontSize: 12,
    textDecorationLine: 'underline',
  },
});
