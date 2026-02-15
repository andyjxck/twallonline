import React, { useState } from "react";
import { View, Text, TouchableOpacity, StyleSheet, ScrollView } from "react-native";
import { StatusBar } from "expo-status-bar";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useRouter } from "expo-router";
import { Shield, Check, ChevronRight } from "lucide-react-native";
import * as Haptics from "expo-haptics";
import { useTheme } from "@/utils/ThemeContext";
import BackgroundPattern from "@/components/BackgroundPattern";
import { LinearGradient } from "expo-linear-gradient";

export default function TermsScreen() {
  const { isHippie, isLight, theme } = useTheme();
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const [agreed, setAgreed] = useState(false);
  const [over18, setOver18] = useState(false);

  const handleContinue = () => {
    if (!agreed || !over18) {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      return;
    }
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    router.push("/onboarding/uk-check");
  };

  const toggleAgree = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setAgreed(!agreed);
  };

  const toggleOver18 = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setOver18(!over18);
  };

  const isContinueEnabled = agreed && over18;

  return (
    <View style={{ flex: 1, backgroundColor: isHippie ? 'transparent' : theme.colors.background }}>
      <BackgroundPattern />
      {!isHippie && !isLight && (
        <LinearGradient
          colors={['#0F172A', '#000000']}
          style={StyleSheet.absoluteFill}
        />
      )}
      <StatusBar style={isLight ? "dark" : "light"} />

      <View style={{ flex: 1, paddingTop: insets.top + 40, paddingHorizontal: 24 }}>
        <View style={{ marginBottom: 32 }}>
          <View
            style={{
              width: 56,
              height: 56,
              borderRadius: 28,
              backgroundColor: "rgba(74, 222, 128, 0.1)",
              justifyContent: "center",
              alignItems: "center",
              marginBottom: 20,
            }}
          >
            <Shield size={28} color="#4ADE80" />
          </View>
          <Text
            style={{
              color: theme.colors.text,
              fontSize: 32,
              fontWeight: "900",
              letterSpacing: -1,
              marginBottom: 8,
            }}
          >
            Terms of Service
          </Text>
          <Text
            style={{
              color: theme.colors.textSecondary,
              fontSize: 16,
              fontWeight: "500",
            }}
          >
            Please review our community rules
          </Text>
        </View>

        <View style={{ 
          flex: 1, 
          backgroundColor: isLight ? "rgba(0,0,0,0.03)" : "rgba(255,255,255,0.03)",
          borderRadius: 20,
          borderWidth: 1,
          borderColor: theme.colors.border,
          overflow: "hidden"
        }}>
          <ScrollView 
            contentContainerStyle={{ padding: 20 }}
            showsVerticalScrollIndicator={true}
          >
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

            <Text style={[styles.mainTitle, { color: theme.colors.text }]}>Community Guidelines</Text>
            
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

            <View style={{ height: 1, backgroundColor: theme.colors.border, marginVertical: 32 }} />

            <Text style={[styles.mainTitle, { color: theme.colors.text }]}>Privacy Policy & Terms of Service</Text>

            <Section title="1. Overview">
              This Privacy Policy ("Policy") describes how our application ("we," "us," or "the Service") handles information. By using the Service, you agree to the terms outlined herein. We prioritize user pseudonymity and data minimization.
            </Section>

            <Section title="2. Data Minimization & Collection">
              We are committed to absolute privacy. The Service does NOT collect or store:
              {"\n"}• Legal Names or Physical Addresses
              {"\n"}• Email Addresses or Phone Numbers
              {"\n"}• Biometric Data or Government IDs
              {"\n"}• Precise Geolocation Data
              {"\n\n"}
              The only data required for account creation is a unique Username and a hashed Password. This information is used solely for authentication purposes.
            </Section>

            <Section title="3. User-Generated Content">
              Any content you voluntarily share—including posts, comments, images, or profile metadata—is public by design. While we offer "anonymous" posting options, this merely removes the public link to your username; it does not change the nature of the data stored in our database. You are solely responsible for the content you upload and any consequences resulting from its publication.
            </Section>

            <Section title="4. Third-Party Infrastructure">
              We utilize industry-leading third-party providers to facilitate the Service:
              {"\n"}• Database & Auth: Powered by Supabase. Your credentials and content reside on their secure infrastructure.
              {"\n"}• Payments: Managed via RevenueCat. We do not process or store your credit card information directly.
              {"\n\n"}
              While we choose partners with high security standards, we are not responsible for the privacy practices or security of these third-party entities.
            </Section>

            <Section title="5. Data Security & 'Recovery Codes'">
              Passwords are cryptographically hashed using standard protocols. We cannot recover forgotten passwords. It is your exclusive responsibility to manage your credentials and secure your Recovery Codes. Loss of these credentials may result in permanent loss of access to your account and associated data.
            </Section>

            <Section title="6. Service Provision 'As-Is'">
              The Service is provided on an "AS IS" and "AS AVAILABLE" basis. We make no warranties, express or implied, regarding the reliability, availability, or accuracy of the Service. We reserve the right to modify, suspend, or terminate any aspect of the Service at any time without prior notice or liability.
            </Section>

            <Section title="7. Limitation of Liability">
              To the maximum extent permitted by law, the developer(s) and operator(s) of this Service shall not be liable for any direct, indirect, incidental, special, or consequential damages, including but not limited to loss of profits, data, or goodwill, arising out of your use or inability to use the Service, even if advised of the possibility of such damages.
            </Section>

            <Section title="8. Indemnification">
              You agree to indemnify and hold harmless the developer(s) and affiliates from any claims, losses, or demands (including legal fees) made by any third party due to or arising out of your breach of this Policy or your violation of any law or the rights of a third party.
            </Section>

            <Section title="9. Modifications to this Policy">
              We may update this Policy periodically. Continued use of the Service following any changes constitutes your acceptance of the revised terms.
            </Section>
          </ScrollView>
        </View>

        <View style={{ paddingVertical: 24, gap: 12 }}>
          <TouchableOpacity 
            onPress={toggleOver18}
            activeOpacity={0.7}
            style={styles.checkboxContainer}
          >
            <View style={[styles.checkbox, {
              borderColor: over18 ? "#4ADE80" : theme.colors.textSecondary,
              backgroundColor: over18 ? "#4ADE80" : "transparent",
            }]}>
              {over18 && <Check size={16} color="#000000" strokeWidth={3} />}
            </View>
            <Text style={[styles.checkboxLabel, { color: theme.colors.text }]}>
              I am over the age of 18
            </Text>
          </TouchableOpacity>

          <TouchableOpacity 
            onPress={toggleAgree}
            activeOpacity={0.7}
            style={styles.checkboxContainer}
          >
            <View style={[styles.checkbox, {
              borderColor: agreed ? "#4ADE80" : theme.colors.textSecondary,
              backgroundColor: agreed ? "#4ADE80" : "transparent",
            }]}>
              {agreed && <Check size={16} color="#000000" strokeWidth={3} />}
            </View>
            <Text style={[styles.checkboxLabel, { color: theme.colors.text }]}>
              I agree to the Terms of Service and Community Guidelines
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            onPress={handleContinue}
            disabled={!isContinueEnabled}
            style={[styles.continueButton, {
              backgroundColor: isContinueEnabled ? (isLight ? "#000000" : "#FFFFFF") : (isLight ? "rgba(0,0,0,0.1)" : "rgba(255,255,255,0.1)"),
            }]}
          >
            <Text
              style={{
                color: isContinueEnabled ? (isLight ? "#FFFFFF" : "#000000") : theme.colors.textSecondary,
                fontSize: 17,
                fontWeight: "700",
              }}
            >
              Continue
            </Text>
            <ChevronRight size={20} color={isContinueEnabled ? (isLight ? "#FFFFFF" : "#000000") : theme.colors.textSecondary} />
          </TouchableOpacity>
        </View>
      </View>
    </View>
  );
}

function Section({ title, children }) {
  const { theme } = useTheme();
  return (
    <View style={styles.section}>
      <Text style={[styles.sectionTitle, { color: theme.colors.text }]}>{title}</Text>
      <Text style={[styles.sectionText, { color: theme.colors.textSecondary }]}>{children}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  mainTitle: {
    fontSize: 22,
    fontWeight: "800",
    marginBottom: 20,
    marginTop: 10,
  },
  section: {
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: "700",
    marginBottom: 8,
  },
  sectionText: {
    fontSize: 14,
    lineHeight: 22,
  },
  checkboxContainer: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    paddingVertical: 4,
  },
  checkbox: {
    width: 24,
    height: 24,
    borderRadius: 6,
    borderWidth: 2,
    justifyContent: "center",
    alignItems: "center",
  },
  checkboxLabel: {
    fontSize: 15,
    fontWeight: "600",
    flex: 1,
  },
  continueButton: {
    marginTop: 8,
    paddingVertical: 18,
    borderRadius: 16,
    alignItems: "center",
    flexDirection: "row",
    justifyContent: "center",
    gap: 8,
  }
});
