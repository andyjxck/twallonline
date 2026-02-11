import React from 'react';
import { View, Text, ScrollView, StyleSheet, TouchableOpacity } from 'react-native';
import { useRouter } from 'expo-router';
import { ChevronLeft, Info } from 'lucide-react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { theme } from '@/utils/theme';
import { useTheme } from "@/utils/ThemeContext";

export default function Guidelines() {
  const { isHippie } = useTheme();
  const router = useRouter();
  const insets = useSafeAreaInsets();

  return (
    <View style={[styles.container, { backgroundColor: isHippie ? 'transparent' : theme.colors.background }]}>
      <View style={[styles.header, { paddingTop: insets.top + 10 }]}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
          <ChevronLeft size={28} color={theme.colors.text} />
        </TouchableOpacity>
        <Text style={[styles.headerTitle, { color: theme.colors.text }]}>Community Guidelines</Text>
        <View style={{ width: 44 }} />
      </View>

        <ScrollView contentContainerStyle={styles.content}>
          <View style={styles.iconContainer}>
            <Info size={64} color={theme.colors.primary} />
          </View>
          
            <Text style={[styles.title, { color: theme.colors.text }]}>The Rules of the Wall</Text>
            
            <View style={{ 
                backgroundColor: "rgba(239, 68, 68, 0.1)", 
                padding: 16, 
                borderRadius: 12, 
                marginBottom: 24,
                borderWidth: 1,
                borderColor: "rgba(239, 68, 68, 0.2)"
              }}>
                <Text style={{ color: "#EF4444", fontWeight: "700", marginBottom: 8, fontSize: 15 }}>
                  CRITICAL RULES:
                </Text>
                <Text style={{ color: theme.colors.text, fontSize: 14, lineHeight: 20, fontWeight: "600" }}>
                  Users may not post, upload, or share content that is abusive, harassing, hateful, sexually explicit, or otherwise objectionable.
                </Text>
                  <Text style={{ color: theme.colors.text, fontSize: 14, lineHeight: 20, fontWeight: "600", marginTop: 8 }}>
                    There is zero tolerance for abusive behavior or objectionable content.
                  </Text>
                  <Text style={{ color: theme.colors.text, fontSize: 13, lineHeight: 18, fontWeight: "500", marginTop: 12, opacity: 0.8 }}>
                    All reports of objectionable content are reviewed within 24 hours. Content that violates our policies will be removed and the offending user may be suspended or permanently banned.
                  </Text>
                </View>

            <Section title="🌟 The Heart of the Wall">
            TownWall is built on the idea that local communities are stronger when we talk to each other. We're here to celebrate local talent, support neighborhood businesses, and keep everyone informed. Our goal is to be the digital equivalent of a friendly neighborhood chat over a garden fence.
          </Section>

          <Section title="🤝 Be Neighborly & Kind">
            This is a space for everyone. Treat others with the same respect you'd give a neighbor in person. We have zero tolerance for bullying, harassment, hate speech, or any form of discrimination. If you wouldn't say it at a town hall meeting, it probably doesn't belong here.
          </Section>

          <Section title="💎 Quality over Quantity">
            We love a good update, but let's keep the Wall valuable! Aim to provide context, share useful advice, or offer genuine support. High-quality posts help your local zone thrive and make the experience better for everyone.
          </Section>

          <Section title="📍 Keep it Local">
            The magic of TownWall is in the "Local." Please keep your posts relevant to your community zones. Global news is great, but how does it affect our streets? The more local and specific, the better!
          </Section>

          <Section title="🛡️ Respect Privacy">
            Protect your neighbors' privacy as much as your own. Never post private contact information, addresses, or sensitive personal details without explicit permission. Let's keep the Wall a safe space for everyone to participate.
          </Section>

          <Section title="📢 Promotions & Hustles">
            We LOVE local businesses and talent! If you're a local pro, feel free to share what you do. However, please avoid "spammy" behavior. Engage with the community first, and let your promotions be a natural part of the conversation. Repetitive or purely automated ads will be removed.
          </Section>

          <Section title="🚫 No Misinformation">
            Trust is everything. Deliberately posting false news or misleading information hurts the community. If you're sharing news, try to verify it first. Content flagged as significantly inaccurate may be blurred or removed to prevent confusion.
          </Section>

          <Section title="🤖 Fair Moderation">
            Our MOD team and AI filters work together to keep the Wall clean and friendly. If your content is flagged, don't take it personally—it might just need a quick review. You can always appeal a decision if you think we got it wrong.
          </Section>

            <Section title="🚨 See Something? Say Something!">
              You are the guardians of your community wall. If you see something that breaks these rules or just feels "off," please use the report button. Your flags help our team keep the environment positive for everyone.
            </Section>

            <Section title="🛡️ Rapid Review Policy">
              All reports of objectionable content are reviewed within 24 hours. Content that violates our policies will be removed and the offending user may be suspended or permanently banned.
            </Section>

            <Section title="✨ Have Fun!">
              At the end of the day, TownWall is your space. Share your wins, ask for help, find a local gig, or just say hello. We're glad you're here!
            </Section>

          <Text style={[styles.footer, { color: theme.colors.textSecondary }]}>
            Together, let's make the Wall the best place on the internet.
          </Text>
        </ScrollView>
    </View>
  );
}

function Section({ title, children }) {
  return (
    <View style={styles.section}>
      <Text style={[styles.sectionTitle, { color: theme.colors.text }]}>{title}</Text>
      <Text style={[styles.sectionText, { color: theme.colors.textSecondary }]}>{children}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16, paddingBottom: 16 },
  headerTitle: { fontSize: 20, fontWeight: 'bold' },
  backBtn: { padding: 8 },
  content: { padding: 20 },
  iconContainer: { alignItems: 'center', marginVertical: 30 },
  title: { fontSize: 24, fontWeight: 'bold', textAlign: 'center', marginBottom: 30 },
  section: { marginBottom: 30 },
  sectionTitle: { fontSize: 18, fontWeight: 'bold', marginBottom: 10 },
  sectionText: { fontSize: 16, lineHeight: 24 },
  footer: { textAlign: 'center', marginTop: 20, marginBottom: 40, fontSize: 14, fontStyle: 'italic' },
});