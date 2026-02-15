import React from 'react';
import { View, Text, ScrollView, StyleSheet, TouchableOpacity } from 'react-native';
import { useRouter } from 'expo-router';
import { ChevronLeft, Shield } from 'lucide-react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { theme } from '@/utils/theme';
import { goBack } from '@/utils/navigation';
import { useTheme } from "@/utils/ThemeContext";
import BackgroundPattern from "@/components/BackgroundPattern";

export default function PrivacyPolicy() {
  const { isHippie } = useTheme();
  const router = useRouter();
  const insets = useSafeAreaInsets();

  return (
    <View style={[styles.container, { backgroundColor: isHippie ? 'transparent' : theme.colors.background }]}>
      <BackgroundPattern />
      <View style={[styles.header, { paddingTop: insets.top + 10 }]}>
        <TouchableOpacity onPress={() => goBack(router)} style={styles.backBtn}>
          <ChevronLeft size={28} color={theme.colors.text} />
        </TouchableOpacity>
        <Text style={[styles.headerTitle, { color: theme.colors.text }]}>Privacy Policy</Text>
        <View style={{ width: 44 }} />
      </View>

        <ScrollView contentContainerStyle={styles.content}>
          <View style={styles.iconContainer}>
            <Shield size={64} color={theme.colors.primary} />
          </View>
          
            <Text style={[styles.title, { color: theme.colors.text }]}>Privacy Policy</Text>

            <Text style={[styles.footer, { color: theme.colors.textSecondary, marginBottom: 24, textAlign: 'center' }]}>
              Last updated: February 11, 2026
            </Text>

            <Section title="1. Data Controller">
              The Data Controller responsible for your personal data is:{"\n\n"}Andrew Blewett{"\n"}101 High Trees Close, Redditch, Worcestershire, B98 7XL{"\n"}Email: andyblewett991@gmail.com{"\n\n"}As the Data Controller, we determine the purposes and means of processing your personal data in connection with Town Wall (the "App" or "Service").
            </Section>

            <Section title="2. Data Minimisation">
              We are committed to collecting only the minimum amount of personal data necessary to provide and operate the App. We do NOT collect or store:{"\n\n"}{"\u2022"} Real names or physical addresses{"\n"}{"\u2022"} Email addresses or phone numbers{"\n"}{"\u2022"} Biometric data or government IDs{"\n"}{"\u2022"} Precise geolocation coordinates{"\n\n"}The only data required for account creation is a unique username and a password. Your password is cryptographically hashed using bcrypt before storage; we cannot recover or view your original password.{"\n\n"}Location data: The App uses your approximate location (city-level only) to connect you with your local community. We do not store precise GPS coordinates. You select your city during onboarding, and this selection is stored as a city name, not as coordinates.
            </Section>

            <Section title="3. Information We Collect">
              3.1 Information You Provide{"\n\n"}{"\u2022"} Account Information: Username and hashed password, used solely for authentication.{"\n"}{"\u2022"} City Selection: The city and zone you select during onboarding, used to show you relevant local content.{"\n"}{"\u2022"} User-Generated Content: Posts, comments, images, polls, and profile metadata you voluntarily share. Content posted publicly is visible to other users. "Anonymous" posts remove the public link to your username but remain linked to your account internally for moderation purposes.{"\n"}{"\u2022"} Messages: Direct messages, group chat messages, and voice/video call metadata. Messages may be encrypted using end-to-end encryption.{"\n"}{"\u2022"} Business and Talent Listings: If you create a business or talent listing, the information you provide is publicly visible.{"\n"}{"\u2022"} Reports: If you report content or users, we store the report details for moderation.{"\n\n"}3.2 Information Collected Automatically{"\n\n"}{"\u2022"} Device Information: Device type, operating system version, and device identifiers for push notifications and ad delivery.{"\n"}{"\u2022"} Push Notification Tokens: If you grant notification permissions, we collect your Expo push notification token.{"\n"}{"\u2022"} Advertising Data: Google AdMob may collect device advertising identifiers (IDFA on iOS, Advertising ID on Android) to serve personalised or non-personalised ads. See Section 8.{"\n"}{"\u2022"} App Tracking: On iOS, we request your permission via the App Tracking Transparency framework before accessing your advertising identifier.{"\n"}{"\u2022"} Photos and Camera: If you grant camera or photo library permissions, images you capture or select are uploaded to our storage provider (Uploadcare) for use in posts or your profile. We only access your camera or photos when you explicitly choose to take or select an image.{"\n"}{"\u2022"} Microphone: If you grant microphone permissions, audio is used for voice and video calls via Agora. We do not record or store call audio.
            </Section>

            <Section title="4. Lawful Basis for Processing">
              Under the UK GDPR and EU GDPR, we process your personal data on the following lawful bases:{"\n\n"}{"\u2022"} Account information (username, hashed password) — Contract: Necessary to create and maintain your account.{"\n"}{"\u2022"} City selection — Contract: Necessary to provide location-relevant community content.{"\n"}{"\u2022"} User-generated content (posts, comments, images, polls) — Contract: Necessary to provide the social features you have chosen to use.{"\n"}{"\u2022"} Messages — Contract: Necessary to provide the messaging features you have chosen to use.{"\n"}{"\u2022"} Push notification tokens — Consent: Collected only after you grant notification permissions.{"\n"}{"\u2022"} Personalised advertising (IDFA / Advertising ID) — Consent: On iOS, explicit consent via ATT. On Android, opt-out via device settings.{"\n"}{"\u2022"} Non-personalised advertising — Legitimate Interests: To fund the free availability of the App.{"\n"}{"\u2022"} Content moderation (AI and human review) — Legitimate Interests: To maintain a safe community and comply with legal obligations.{"\n"}{"\u2022"} Server logs — Legitimate Interests: To maintain system security and diagnose issues.{"\n\n"}Where we rely on legitimate interests, we have assessed that our interests do not override your fundamental rights and freedoms.
            </Section>

            <Section title="5. How We Use Your Information">
              We use the information we collect to:{"\n\n"}{"\u2022"} Provide and maintain the App, including account creation, authentication, and community features.{"\n"}{"\u2022"} Display local community content (posts, polls, businesses, talent) relevant to your selected city.{"\n"}{"\u2022"} Enable messaging, voice calls, and video calls between users.{"\n"}{"\u2022"} Moderate content using AI moderation and human review to enforce our Community Guidelines.{"\n"}{"\u2022"} Send push notifications (only if you have granted permission).{"\n"}{"\u2022"} Display advertisements to support the free availability of the App.{"\n"}{"\u2022"} Improve the App, including analysing usage patterns and fixing bugs.{"\n"}{"\u2022"} Respond to user reports and enforce our Terms of Service.
            </Section>

            <Section title="6. Content Moderation">
              All posts are subject to automated AI moderation (powered by OpenAI) before publication. Content may be approved, held for human review, or rejected. User reports are reviewed within 24 hours. When AI moderation processes your content, the text of your post is sent to OpenAI for analysis. OpenAI processes this data under a data processing agreement and does not use it to train its models.
            </Section>

            <Section title="7. Data Retention">
              {"\u2022"} Account information — Retained until you delete your account.{"\n"}{"\u2022"} Posts, comments, and polls — Retained until you delete them or delete your account.{"\n"}{"\u2022"} Direct messages — Automatically hidden after 24 hours and permanently deleted after 7 days, unless "kept" by participants.{"\n"}{"\u2022"} Images — Retained until the associated post is deleted or your account is deleted.{"\n"}{"\u2022"} Business and talent listings — Retained until you remove them or delete your account.{"\n"}{"\u2022"} Push notification tokens — Retained until you revoke permissions or delete your account.{"\n"}{"\u2022"} Server logs — Retained for 3 months, then automatically purged.{"\n"}{"\u2022"} Encrypted database backups — Retained for 30 days on a rolling basis.{"\n\n"}Account Deletion: You may request account deletion via Settings → Delete Account. Your account enters a 30-day grace period during which you can cancel by logging back in. After 30 days, your account and all associated data are permanently and irreversibly deleted. Encrypted backups may retain residual data for up to 30 additional days before being overwritten.
            </Section>

            <Section title="8. Advertising">
              The App uses Google AdMob to serve advertisements.{"\n\n"}{"\u2022"} iOS Users: We request consent via Apple's App Tracking Transparency (ATT) framework before accessing your IDFA. If you decline, you receive non-personalised ads.{"\n"}{"\u2022"} Android Users: Google may use your Advertising ID. You can opt out in device settings.{"\n\n"}Learn more: https://policies.google.com/privacy
            </Section>

            <Section title="9. Categories of Recipients">
              We do not sell your personal data. We may share data with:{"\n\n"}{"\u2022"} Other Users — Your public content (posts, comments, business listings, talent profiles) is visible to other users. Messages are visible only to participants.{"\n"}{"\u2022"} Supabase (database and backend): https://supabase.com/privacy{"\n"}{"\u2022"} Google AdMob (advertising): https://policies.google.com/privacy{"\n"}{"\u2022"} OpenAI (AI content moderation): https://openai.com/privacy{"\n"}{"\u2022"} Agora (voice/video calls): https://www.agora.io/en/privacy-policy{"\n"}{"\u2022"} Uploadcare (image hosting): https://uploadcare.com/about/privacy-policy/{"\n"}{"\u2022"} RevenueCat (payments): https://www.revenuecat.com/privacy{"\n"}{"\u2022"} Expo / EAS (push notifications): https://expo.dev/privacy{"\n"}{"\u2022"} Giphy (GIF content): https://giphy.com/privacy{"\n"}{"\u2022"} Law enforcement or regulators — Any data required by law or valid legal requests.
            </Section>

            <Section title="10. International Data Transfers">
              Our third-party service providers may process your personal data outside the United Kingdom and EEA, including in the United States. Where your data is transferred outside the UK/EEA, we ensure appropriate safeguards are in place, including:{"\n\n"}{"\u2022"} Standard Contractual Clauses (SCCs) approved by the European Commission and/or the UK ICO.{"\n"}{"\u2022"} Adequacy decisions where applicable.{"\n"}{"\u2022"} The service provider's compliance with recognised data protection frameworks.{"\n\n"}Contact us at andyblewett991@gmail.com for further details.
            </Section>

            <Section title="11. Your Rights">
              Under the UK GDPR, EU GDPR, and other applicable data protection laws, you have the following rights:{"\n\n"}{"\u2022"} Right of Access: View your data via your profile and settings, or request a full copy.{"\n"}{"\u2022"} Right to Rectification: Update your username and profile within the App.{"\n"}{"\u2022"} Right to Erasure: Delete your account and all associated data via Settings → Delete Account, or contact us.{"\n"}{"\u2022"} Right to Data Portability: Request a copy of your data in JSON or CSV format by contacting us.{"\n"}{"\u2022"} Right to Restrict Processing: Request restriction in certain circumstances.{"\n"}{"\u2022"} Right to Object: Object to processing based on legitimate interests.{"\n"}{"\u2022"} Right to Withdraw Consent: Withdraw consent for push notifications (via device settings), personalised advertising (via ATT/device settings), or by deleting your account.{"\n\n"}To exercise any of these rights, contact us at andyblewett991@gmail.com. We will respond within one month.
            </Section>

            <Section title="12. Data Security">
              We implement appropriate technical and organisational measures:{"\n\n"}{"\u2022"} Encryption in transit: All data is encrypted using HTTPS/TLS.{"\n"}{"\u2022"} Encryption at rest: Database backups are encrypted.{"\n"}{"\u2022"} Credential security: Passwords are hashed using bcrypt. We cannot recover your password. Recovery Codes are your only method of account recovery if you forget your password.{"\n"}{"\u2022"} Message encryption: Messages may use end-to-end encryption.{"\n"}{"\u2022"} Database security: Row-level security (RLS) policies are enforced.{"\n"}{"\u2022"} Access control: Administrative access is restricted and protected.{"\n\n"}No method of electronic storage is 100% secure. We cannot guarantee absolute security but are committed to industry-standard practices.
            </Section>

            <Section title="13. Automated Decision-Making and Profiling">
              AI content moderation automatically reviews posts before publication. Posts may be approved, held for human review, or rejected. This automated processing is necessary for our legitimate interest in maintaining a safe community. You may appeal moderation decisions by contacting andyblewett991@gmail.com. No other automated decision-making or profiling that produces legal effects is used.
            </Section>

            <Section title="14. Children's Privacy">
              Town Wall is restricted to users aged 18 and over. We do not knowingly collect personal information from anyone under 18. If you believe a minor has created an account, please contact us at andyblewett991@gmail.com so we can delete the account.
            </Section>

            <View style={{ 
                backgroundColor: "rgba(239, 68, 68, 0.1)", 
                padding: 16, 
                borderRadius: 12, 
                marginBottom: 24,
                borderWidth: 1,
                borderColor: "rgba(239, 68, 68, 0.2)"
              }}>
                <Text style={{ color: "#EF4444", fontWeight: "700", marginBottom: 8, fontSize: 15 }}>
                  CONTENT RULES:
                </Text>
                <Text style={{ color: theme.colors.text, fontSize: 14, lineHeight: 20, fontWeight: "600" }}>
                  Users may not post, upload, or share content that is abusive, harassing, hateful, sexually explicit, or otherwise objectionable. There is zero tolerance for abusive behaviour or objectionable content.
                </Text>
                  <Text style={{ color: theme.colors.text, fontSize: 13, lineHeight: 18, fontWeight: "500", marginTop: 12, opacity: 0.8 }}>
                    All reports of objectionable content are reviewed within 24 hours. Content that violates our policies will be removed and the offending user may be suspended or permanently banned.
                  </Text>
                </View>

            <Section title="15. Complaints">
              If you are not satisfied with how we handle your personal data, you have the right to lodge a complaint with a supervisory authority.{"\n\n"}For UK residents:{"\n"}Information Commissioner's Office (ICO){"\n"}Website: https://ico.org.uk{"\n"}Helpline: 0303 123 1113{"\n\n"}For EEA residents:{"\n"}You may contact your local Data Protection Authority:{"\n"}https://edpb.europa.eu/about-edpb/about-edpb/members_en
            </Section>

            <Section title="16. Changes to This Privacy Policy">
              We may update this Privacy Policy from time to time. We will notify you of material changes by updating the "Last Updated" date at the top and via in-app notification where appropriate. Your continued use of the App after any changes constitutes your acceptance of the updated policy.
            </Section>

            <Section title="17. Contact Us">
              If you have any questions or concerns about this Privacy Policy, your personal data, or wish to exercise any of your rights, please contact us at:{"\n\n"}Andrew Blewett{"\n"}101 High Trees Close, Redditch, Worcestershire, B98 7XL{"\n"}Email: andyblewett991@gmail.com{"\n\n"}We aim to respond to all inquiries within one month.
            </Section>

          <Text style={[styles.footer, { color: theme.colors.textSecondary }]}>
            This Privacy Policy is effective as of the date listed above.
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
  footer: { textAlign: 'center', marginTop: 20, marginBottom: 40, fontSize: 12 },
});