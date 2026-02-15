import React from 'react';
import { View, Text, ScrollView, StyleSheet, TouchableOpacity } from 'react-native';
import { useRouter } from 'expo-router';
import { ChevronLeft, FileText } from 'lucide-react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { theme } from '@/utils/theme';
import { goBack } from '@/utils/navigation';
import { useTheme } from "@/utils/ThemeContext";
import BackgroundPattern from "@/components/BackgroundPattern";

export default function TermsOfService() {
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
        <Text style={[styles.headerTitle, { color: theme.colors.text }]}>Terms of Service</Text>
        <View style={{ width: 44 }} />
      </View>

      <ScrollView contentContainerStyle={styles.content}>
        <View style={styles.iconContainer}>
          <FileText size={64} color={theme.colors.primary} />
        </View>
        
        <Text style={[styles.title, { color: theme.colors.text }]}>Terms of Service</Text>
        
        <Text style={[styles.effectiveDate, { color: theme.colors.textSecondary }]}>
          Effective Date: January 30, 2026{"\n"}
          Last Updated: February 11, 2026
        </Text>

        <View style={styles.importantBox}>
          <Text style={styles.importantTitle}>
            IMPORTANT LEGAL AGREEMENT
          </Text>
          <Text style={[styles.importantText, { color: theme.colors.text }]}>
            Please read these Terms of Service ("Terms," "Agreement") carefully before using Town Wall. By accessing or using the Service, you agree to be bound by these Terms. If you do not agree, do not use the Service.
          </Text>
        </View>

        <Section title="1. ACCEPTANCE OF TERMS">
          <SectionText>
            1.1. <Bold>Agreement to Terms.</Bold> By creating an account, accessing, or using Town Wall (the "Service," "App," "Platform," or "Town Wall"), you ("User," "you," or "your") agree to be legally bound by these Terms of Service, our Privacy Policy, and our Community Guidelines, all of which are incorporated herein by reference.
            {"\n\n"}
            1.2. <Bold>Capacity to Contract.</Bold> You represent and warrant that you have the legal capacity to enter into this Agreement. If you are entering into this Agreement on behalf of an organization, you represent that you have the authority to bind that organization.
            {"\n\n"}
            1.3. <Bold>Modifications.</Bold> We reserve the right to modify these Terms at any time. Material changes will be notified via in-app notification or email (if provided). Your continued use of the Service after such modifications constitutes acceptance of the updated Terms. If you do not agree to the modified Terms, you must discontinue use of the Service.
          </SectionText>
        </Section>

        <Section title="2. ELIGIBILITY REQUIREMENTS">
          <SectionText>
            2.1. <Bold>Age Requirement.</Bold> You must be at least eighteen (18) years of age to use Town Wall. By using the Service, you represent and warrant that you are at least 18 years old. We do not knowingly collect information from individuals under 18.
            {"\n\n"}
            2.2. <Bold>Geographic Restriction.</Bold> Town Wall is currently available only to users located in the United Kingdom. By using the Service, you represent that you are physically located in the UK or have a legitimate connection to a UK community.
            {"\n\n"}
            2.3. <Bold>Account Restrictions.</Bold> You may not use the Service if:
            {"\n"}• You have been previously banned or suspended from Town Wall
            {"\n"}• You are prohibited by law from receiving or using the Service
            {"\n"}• You are a competitor using the Service for competitive analysis
            {"\n"}• You intend to use the Service for any unlawful purpose
            {"\n\n"}
            2.4. <Bold>One Account Per Person.</Bold> Each individual may maintain only one (1) active account. Creating multiple accounts to evade bans, manipulate content, or deceive other users is strictly prohibited and grounds for permanent termination.
          </SectionText>
        </Section>

        <Section title="3. ACCOUNT REGISTRATION & SECURITY">
          <SectionText>
            3.1. <Bold>Account Creation.</Bold> To access certain features, you must create an account by providing a unique username and password. You agree to provide accurate information and to keep this information current.
            {"\n\n"}
            3.2. <Bold>Username Requirements.</Bold> Your username must not:
            {"\n"}• Impersonate any person, business, or entity
            {"\n"}• Contain profanity, slurs, or offensive language
            {"\n"}• Violate any trademark or intellectual property rights
            {"\n"}• Be misleading or deceptive
            {"\n"}• Contain personal information of others
            {"\n\n"}
            3.3. <Bold>Password Security.</Bold> You are solely responsible for maintaining the confidentiality of your password and for all activities that occur under your account. Passwords are cryptographically hashed; we cannot recover them. You must immediately notify us of any unauthorized use.
            {"\n\n"}
            3.4. <Bold>Recovery Codes.</Bold> Upon account creation, you may generate Recovery Codes. These codes are the ONLY method to recover your account if you forget your password. We cannot reset passwords or recover accounts without valid Recovery Codes. Loss of these codes may result in permanent loss of account access.
            {"\n\n"}
            3.5. <Bold>Account Responsibility.</Bold> You are fully responsible for all activity conducted through your account, whether or not authorized by you. Town Wall shall not be liable for any loss or damage arising from your failure to secure your account credentials.
          </SectionText>
        </Section>

        <Section title="4. USER CONDUCT & PROHIBITED ACTIVITIES">
          <SectionText>
            4.1. <Bold>General Conduct.</Bold> You agree to use the Service in compliance with all applicable laws and regulations and in accordance with these Terms and our Community Guidelines.
            {"\n\n"}
            4.2. <Bold>Prohibited Content.</Bold> You may NOT post, upload, share, or transmit any content that:
            {"\n"}• Is sexually explicit, pornographic, or obscene
            {"\n"}• Depicts or promotes violence, gore, or self-harm
            {"\n"}• Contains hate speech, discrimination, or harassment
            {"\n"}• Bullies, threatens, intimidates, or stalks any person
            {"\n"}• Is defamatory, libelous, or invades privacy
            {"\n"}• Contains personal information of others without consent
            {"\n"}• Promotes illegal activities or substances
            {"\n"}• Constitutes spam, phishing, or fraudulent schemes
            {"\n"}• Contains malware, viruses, or harmful code
            {"\n"}• Infringes intellectual property rights
            {"\n"}• Impersonates any person or entity
            {"\n"}• Spreads misinformation or disinformation
            {"\n"}• Exploits minors in any way
            {"\n\n"}
            4.3. <Bold>Prohibited Activities.</Bold> You may NOT:
            {"\n"}• Use automated systems, bots, or scripts to access the Service
            {"\n"}• Scrape, harvest, or collect user data
            {"\n"}• Interfere with or disrupt the Service or servers
            {"\n"}• Attempt to gain unauthorized access to any systems
            {"\n"}• Circumvent any security or access controls
            {"\n"}• Use the Service for commercial solicitation without authorization
            {"\n"}• Manipulate engagement metrics (likes, shares, etc.)
            {"\n"}• Create fake accounts or engage in coordinated inauthentic behavior
            {"\n"}• Reverse engineer, decompile, or disassemble the Service
            {"\n"}• Use the Service to compete with Town Wall
            {"\n\n"}
            4.4. <Bold>Zero Tolerance Policy.</Bold> Town Wall maintains a ZERO TOLERANCE policy for objectionable content and abusive behavior. Violations may result in immediate content removal, account suspension, or permanent ban without prior warning.
          </SectionText>
        </Section>

        <Section title="5. USER-GENERATED CONTENT">
          <SectionText>
            5.1. <Bold>Ownership.</Bold> You retain ownership of the content you create and post on Town Wall ("User Content"). However, by posting User Content, you grant us certain rights as described below.
            {"\n\n"}
            5.2. <Bold>License Grant.</Bold> By posting User Content, you grant Town Wall a worldwide, non-exclusive, royalty-free, sublicensable, and transferable license to use, reproduce, modify, adapt, publish, translate, distribute, and display such content in connection with operating and promoting the Service. This license continues even if you stop using the Service, but only for content that remains on the platform.
            {"\n\n"}
            5.3. <Bold>Representations.</Bold> You represent and warrant that:
            {"\n"}• You own or have the necessary rights to post the User Content
            {"\n"}• The User Content does not violate any third-party rights
            {"\n"}• The User Content complies with these Terms and all applicable laws
            {"\n"}• You have obtained all necessary consents from individuals depicted
            {"\n\n"}
            5.4. <Bold>Content Removal.</Bold> We reserve the right, but not the obligation, to remove any User Content at our sole discretion, with or without notice, for any reason including violation of these Terms.
            {"\n\n"}
            5.5. <Bold>Anonymous Posting.</Bold> The "anonymous" posting feature removes the public association between your username and the post. However, this content is still stored in our database and linked to your account internally. Anonymous posts are subject to the same rules and may be traced for moderation purposes.
            {"\n\n"}
            5.6. <Bold>No Endorsement.</Bold> User Content does not represent the views of Town Wall. We do not endorse, verify, or guarantee the accuracy of any User Content.
          </SectionText>
        </Section>

        <Section title="6. CONTENT MODERATION">
          <SectionText>
            6.1. <Bold>AI Moderation.</Bold> All posts are subject to automated AI moderation before publication. Content may be:
            {"\n"}• <Bold>Approved:</Bold> Published immediately
            {"\n"}• <Bold>Held:</Bold> Queued for manual human review
            {"\n"}• <Bold>Rejected:</Bold> Blocked with reason provided
            {"\n\n"}
            6.2. <Bold>Human Moderation.</Bold> Our moderation team reviews flagged content, user reports, and held posts. Moderators may take actions including but not limited to: content removal, content blurring, comment disabling, user warnings, temporary mutes, and permanent bans.
            {"\n\n"}
            6.3. <Bold>Reporting.</Bold> Users can report objectionable content via the report function. All reports are reviewed within 24 hours. False or malicious reporting may result in action against the reporter.
            {"\n\n"}
            6.4. <Bold>Appeals.</Bold> If you believe moderation action was taken in error, you may contact us at andyblewett991@gmail.com. Appeals are reviewed but decisions are final at our discretion.
            {"\n\n"}
            6.5. <Bold>No Guarantee.</Bold> While we strive to maintain a safe environment, we cannot guarantee that all objectionable content will be identified or removed. You may encounter content you find offensive; please use the report function.
          </SectionText>
        </Section>

        <Section title="7. MESSAGING & COMMUNICATIONS">
          <SectionText>
            7.1. <Bold>Direct Messages.</Bold> Town Wall provides messaging features including direct messages, group chats, and voice/video calls. All communications are subject to these Terms.
            {"\n\n"}
            7.2. <Bold>End-to-End Encryption.</Bold> Messages may be encrypted using end-to-end encryption. This means we cannot read the content of encrypted messages. However, metadata (sender, recipient, timestamp) is stored.
            {"\n\n"}
            7.3. <Bold>Message Retention.</Bold> Messages are automatically hidden from view after 24 hours and permanently deleted after 7 days, unless "kept" by participants. Users can choose to "keep" messages, which prevents automatic deletion until all participants "unkeep" the message.
            {"\n\n"}
            7.4. <Bold>Reporting Messages.</Bold> Users can report messages for policy violations. When reporting, users may optionally include decrypted message content to assist moderators.
            {"\n\n"}
            7.5. <Bold>Chat Requests.</Bold> Messages from non-friends appear as "chat requests" that must be accepted before a conversation begins. You can decline requests from users you don't wish to communicate with.
            {"\n\n"}
            7.6. <Bold>Blocking.</Bold> You may block any user at any time. Blocked users cannot message you, see your content, or interact with you on the platform.
          </SectionText>
        </Section>

        <Section title="8. VOICE & VIDEO CALLS">
          <SectionText>
            8.1. <Bold>Call Services.</Bold> Town Wall provides voice and video calling features powered by third-party services (Agora). Use of these features is subject to the third party's terms of service.
            {"\n\n"}
            8.2. <Bold>Recording Prohibition.</Bold> You may NOT record calls without the explicit consent of all participants. Unauthorized recording may violate applicable laws and these Terms.
            {"\n\n"}
            8.3. <Bold>Conduct During Calls.</Bold> All conduct rules apply during voice and video calls. Harassment, abuse, or inappropriate behavior during calls is prohibited.
            {"\n\n"}
            8.4. <Bold>No Emergency Services.</Bold> Town Wall is NOT a replacement for emergency services. Do not use Town Wall to contact emergency services. In an emergency, call 999 (UK) or your local emergency number.
          </SectionText>
        </Section>

        <Section title="9. BUSINESSES & TALENT LISTINGS">
          <SectionText>
            9.1. <Bold>Business Listings.</Bold> Local businesses may create listings on Town Wall. All business listings are subject to approval and must comply with these Terms.
            {"\n\n"}
            9.2. <Bold>Accuracy.</Bold> Business owners are responsible for ensuring their listing information is accurate and current. Misleading business information is prohibited.
            {"\n\n"}
            9.3. <Bold>Talent Profiles.</Bold> Local talent and creators may create profiles to showcase their work. Talent profiles are subject to approval and these Terms.
            {"\n\n"}
            9.4. <Bold>No Endorsement.</Bold> Listing a business or talent on Town Wall does not constitute endorsement, verification, or recommendation by Town Wall. Users interact with businesses and talent at their own risk.
            {"\n\n"}
            9.5. <Bold>Disputes.</Bold> Any disputes between users and listed businesses or talent are solely between those parties. Town Wall is not responsible for the quality, safety, or legality of goods or services offered.
          </SectionText>
        </Section>

        <Section title="10. INTELLECTUAL PROPERTY">
          <SectionText>
            10.1. <Bold>Town Wall IP.</Bold> The Service, including its design, features, functionality, graphics, logos, and trademarks ("Town Wall IP"), is owned by Town Wall and protected by copyright, trademark, and other intellectual property laws. You may not use Town Wall IP without our prior written consent.
            {"\n\n"}
            10.2. <Bold>Limited License.</Bold> Subject to these Terms, we grant you a limited, non-exclusive, non-transferable, revocable license to access and use the Service for personal, non-commercial purposes.
            {"\n\n"}
            10.3. <Bold>Restrictions.</Bold> You may not:
            {"\n"}• Copy, modify, or distribute Town Wall IP
            {"\n"}• Create derivative works based on the Service
            {"\n"}• Use the Service for commercial purposes without authorization
            {"\n"}• Remove any copyright or proprietary notices
            {"\n\n"}
            10.4. <Bold>Copyright Infringement.</Bold> We respect intellectual property rights. If you believe content on Town Wall infringes your copyright, contact us at andyblewett991@gmail.com with:
            {"\n"}• Identification of the copyrighted work
            {"\n"}• Identification of the infringing material
            {"\n"}• Your contact information
            {"\n"}• A statement of good faith belief
            {"\n"}• A statement of accuracy under penalty of perjury
            {"\n"}• Your physical or electronic signature
          </SectionText>
        </Section>

        <Section title="11. THIRD-PARTY SERVICES">
          <SectionText>
            11.1. <Bold>Third-Party Integrations.</Bold> The Service integrates with third-party services including but not limited to:
            {"\n"}• Supabase (database, authentication, storage)
            {"\n"}• OpenAI (AI moderation, Towny assistant)
            {"\n"}• Agora (voice/video calls)
            {"\n"}• Giphy (GIF content)
            {"\n"}• RevenueCat (payments)
            {"\n"}• Google AdMob (advertising)
            {"\n"}• Uploadcare (file uploads)
            {"\n"}• Expo (notifications, device services)
            {"\n\n"}
            11.2. <Bold>Third-Party Terms.</Bold> Your use of third-party services is subject to their respective terms of service and privacy policies. We are not responsible for third-party services.
            {"\n\n"}
            11.3. <Bold>External Links.</Bold> The Service may contain links to external websites. We are not responsible for the content, accuracy, or practices of external sites.
            {"\n\n"}
            11.4. <Bold>Advertisements.</Bold> The Service displays advertisements from Google AdMob. Ad content is provided by third parties and does not represent endorsement by Town Wall. You may report inappropriate ads using the flag icon.
          </SectionText>
        </Section>

        <Section title="12. PAYMENTS & SUBSCRIPTIONS">
          <SectionText>
            12.1. <Bold>Free Service.</Bold> Town Wall is currently free to use with advertisements. Premium features may be offered in the future.
            {"\n\n"}
            12.2. <Bold>Future Subscriptions.</Bold> If we introduce paid subscriptions, payment will be processed through RevenueCat and the applicable app store (Apple App Store, Google Play). Subscription terms will be disclosed at the time of purchase.
            {"\n\n"}
            12.3. <Bold>Refunds.</Bold> Refund policies are governed by the applicable app store's policies. Contact Apple or Google for refund requests.
            {"\n\n"}
            12.4. <Bold>Price Changes.</Bold> We reserve the right to change pricing at any time. Existing subscribers will be notified of price changes before their next billing cycle.
          </SectionText>
        </Section>

        <Section title="13. DISCLAIMERS">
          <SectionText>
            13.1. <Bold>"AS IS" Basis.</Bold> THE SERVICE IS PROVIDED ON AN "AS IS" AND "AS AVAILABLE" BASIS WITHOUT WARRANTIES OF ANY KIND, EITHER EXPRESS OR IMPLIED, INCLUDING BUT NOT LIMITED TO IMPLIED WARRANTIES OF MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE, TITLE, AND NON-INFRINGEMENT.
            {"\n\n"}
            13.2. <Bold>No Guarantees.</Bold> We do not warrant that:
            {"\n"}• The Service will be uninterrupted, secure, or error-free
            {"\n"}• Results obtained will be accurate or reliable
            {"\n"}• Any errors will be corrected
            {"\n"}• The Service will meet your requirements
            {"\n\n"}
            13.3. <Bold>User Content Disclaimer.</Bold> We do not control, endorse, or guarantee the accuracy, integrity, or quality of User Content. You may be exposed to content that is offensive, inaccurate, or objectionable.
            {"\n\n"}
            13.4. <Bold>Third-Party Disclaimer.</Bold> We are not responsible for the actions, content, or data of third parties. You release us from any claims related to third parties.
            {"\n\n"}
            13.5. <Bold>Local Information.</Bold> Information about local businesses, events, or services is provided by users and third parties. We do not verify this information and make no representations about its accuracy.
          </SectionText>
        </Section>

        <Section title="14. LIMITATION OF LIABILITY">
          <SectionText>
            14.1. <Bold>Exclusion of Damages.</Bold> TO THE MAXIMUM EXTENT PERMITTED BY APPLICABLE LAW, IN NO EVENT SHALL TOWN WALL, ITS DIRECTORS, EMPLOYEES, PARTNERS, AGENTS, SUPPLIERS, OR AFFILIATES BE LIABLE FOR ANY INDIRECT, INCIDENTAL, SPECIAL, CONSEQUENTIAL, OR PUNITIVE DAMAGES, INCLUDING WITHOUT LIMITATION:
            {"\n"}• Loss of profits, data, use, or goodwill
            {"\n"}• Service interruption or computer damage
            {"\n"}• Cost of substitute services
            {"\n"}• Any damages arising from User Content
            {"\n"}• Any damages arising from third-party conduct
            {"\n\n"}
            14.2. <Bold>Liability Cap.</Bold> IN NO EVENT SHALL OUR TOTAL LIABILITY EXCEED THE GREATER OF: (A) THE AMOUNT YOU PAID US IN THE TWELVE (12) MONTHS PRIOR TO THE CLAIM, OR (B) ONE HUNDRED POUNDS STERLING (£100).
            {"\n\n"}
            14.3. <Bold>Basis of Bargain.</Bold> THE LIMITATIONS IN THIS SECTION APPLY REGARDLESS OF THE THEORY OF LIABILITY (CONTRACT, TORT, STRICT LIABILITY, OR OTHERWISE) AND EVEN IF WE HAVE BEEN ADVISED OF THE POSSIBILITY OF SUCH DAMAGES.
            {"\n\n"}
            14.4. <Bold>Jurisdictional Limitations.</Bold> Some jurisdictions do not allow the exclusion of certain warranties or limitation of liability. In such jurisdictions, our liability shall be limited to the maximum extent permitted by law.
          </SectionText>
        </Section>

        <Section title="15. INDEMNIFICATION">
          <SectionText>
            15.1. <Bold>Your Indemnification.</Bold> You agree to indemnify, defend, and hold harmless Town Wall and its officers, directors, employees, agents, licensors, and suppliers from and against any claims, liabilities, damages, judgments, awards, losses, costs, expenses, or fees (including reasonable legal fees) arising out of or relating to:
            {"\n"}• Your violation of these Terms
            {"\n"}• Your User Content
            {"\n"}• Your use of the Service
            {"\n"}• Your violation of any third-party rights
            {"\n"}• Your violation of any applicable law
            {"\n"}• Any dispute between you and another user
            {"\n\n"}
            15.2. <Bold>Cooperation.</Bold> We reserve the right to assume exclusive defense and control of any matter subject to indemnification by you, in which case you agree to cooperate with our defense.
          </SectionText>
        </Section>

        <Section title="16. DISPUTE RESOLUTION">
          <SectionText>
            16.1. <Bold>Informal Resolution.</Bold> Before initiating any formal dispute resolution, you agree to first contact us at andyblewett991@gmail.com and attempt to resolve the dispute informally for at least thirty (30) days.
            {"\n\n"}
            16.2. <Bold>Governing Law.</Bold> These Terms shall be governed by and construed in accordance with the laws of England and Wales, without regard to conflict of law principles.
            {"\n\n"}
            16.3. <Bold>Jurisdiction.</Bold> You agree to submit to the exclusive jurisdiction of the courts of England and Wales for any dispute arising out of or relating to these Terms or the Service.
            {"\n\n"}
            16.4. <Bold>Class Action Waiver.</Bold> TO THE EXTENT PERMITTED BY LAW, YOU AGREE THAT ANY DISPUTE RESOLUTION PROCEEDINGS WILL BE CONDUCTED ONLY ON AN INDIVIDUAL BASIS AND NOT IN A CLASS, CONSOLIDATED, OR REPRESENTATIVE ACTION.
            {"\n\n"}
            16.5. <Bold>Time Limitation.</Bold> Any claim or cause of action arising out of or related to the Service or these Terms must be filed within one (1) year after such claim or cause of action arose, or be forever barred.
          </SectionText>
        </Section>

        <Section title="17. TERMINATION">
          <SectionText>
            17.1. <Bold>Termination by You.</Bold> You may terminate your account at any time through Settings → Delete Account. Upon deletion request, your account enters a 30-day grace period. After 30 days, your account and data are permanently deleted.
            {"\n\n"}
            17.2. <Bold>Termination by Us.</Bold> We may suspend or terminate your account immediately, without prior notice or liability, for any reason, including but not limited to:
            {"\n"}• Violation of these Terms
            {"\n"}• Violation of Community Guidelines
            {"\n"}• Fraudulent, abusive, or illegal activity
            {"\n"}• Extended periods of inactivity
            {"\n"}• Request by law enforcement
            {"\n"}• Discontinuation of the Service
            {"\n\n"}
            17.3. <Bold>Effect of Termination.</Bold> Upon termination:
            {"\n"}• Your right to use the Service ceases immediately
            {"\n"}• We may delete your account and all associated data
            {"\n"}• Provisions that by their nature should survive will survive (including IP rights, disclaimers, limitations of liability, and dispute resolution)
            {"\n\n"}
            17.4. <Bold>No Refunds.</Bold> Termination does not entitle you to any refund of fees paid, if applicable.
          </SectionText>
        </Section>

        <Section title="18. CHANGES TO SERVICE">
          <SectionText>
            18.1. <Bold>Modifications.</Bold> We reserve the right to modify, suspend, or discontinue any aspect of the Service at any time, with or without notice. This includes adding or removing features, changing pricing, or discontinuing the Service entirely.
            {"\n\n"}
            18.2. <Bold>No Liability.</Bold> We shall not be liable to you or any third party for any modification, suspension, or discontinuation of the Service.
          </SectionText>
        </Section>

        <Section title="19. PRIVACY">
          <SectionText>
            19.1. <Bold>Privacy Policy.</Bold> Your use of the Service is also governed by our Privacy Policy, which is incorporated into these Terms by reference. Please review our Privacy Policy to understand our data practices.
            {"\n\n"}
            19.2. <Bold>Data Collection.</Bold> We collect minimal data. We do not collect names, emails, phone numbers, or precise location. See our Privacy Policy for complete details.
          </SectionText>
        </Section>

        <Section title="20. GENERAL PROVISIONS">
          <SectionText>
            20.1. <Bold>Entire Agreement.</Bold> These Terms, together with the Privacy Policy and Community Guidelines, constitute the entire agreement between you and Town Wall regarding the Service and supersede all prior agreements.
            {"\n\n"}
            20.2. <Bold>Severability.</Bold> If any provision of these Terms is found to be unenforceable, the remaining provisions will continue in full force and effect.
            {"\n\n"}
            20.3. <Bold>Waiver.</Bold> Our failure to enforce any right or provision of these Terms shall not constitute a waiver of such right or provision.
            {"\n\n"}
            20.4. <Bold>Assignment.</Bold> You may not assign or transfer these Terms or your rights hereunder without our prior written consent. We may assign these Terms without restriction.
            {"\n\n"}
            20.5. <Bold>Force Majeure.</Bold> We shall not be liable for any failure or delay in performance due to circumstances beyond our reasonable control, including natural disasters, war, terrorism, riots, embargoes, acts of civil or military authorities, fire, floods, accidents, strikes, or shortages.
            {"\n\n"}
            20.6. <Bold>Headings.</Bold> Section headings are for convenience only and have no legal effect.
            {"\n\n"}
            20.7. <Bold>No Third-Party Beneficiaries.</Bold> These Terms do not create any third-party beneficiary rights.
            {"\n\n"}
            20.8. <Bold>Notices.</Bold> We may provide notices to you via in-app notifications, email (if provided), or by posting on the Service. You may contact us at andyblewett991@gmail.com.
          </SectionText>
        </Section>

        <Section title="21. CONTACT INFORMATION">
          <SectionText>
            For questions, concerns, or feedback regarding these Terms of Service:
            {"\n\n"}
            <Bold>Email:</Bold> andyblewett991@gmail.com
            {"\n"}
            <Bold>Website:</Bold> townwall.co.uk
            {"\n\n"}
            We aim to respond to all inquiries within 48 hours.
          </SectionText>
        </Section>

        <View style={styles.acknowledgmentBox}>
          <Text style={[styles.acknowledgmentText, { color: theme.colors.text }]}>
            BY USING TOWN WALL, YOU ACKNOWLEDGE THAT YOU HAVE READ, UNDERSTOOD, AND AGREE TO BE BOUND BY THESE TERMS OF SERVICE.
          </Text>
        </View>

        <Text style={[styles.footer, { color: theme.colors.textSecondary }]}>
            Last updated: February 11, 2026
          </Text>
        </ScrollView>
    </View>
  );
}

function Section({ title, children }) {
  return (
    <View style={styles.section}>
      <Text style={[styles.sectionTitle, { color: theme.colors.text }]}>{title}</Text>
      {children}
    </View>
  );
}

function SectionText({ children }) {
  return (
    <Text style={[styles.sectionText, { color: theme.colors.textSecondary }]}>
      {children}
    </Text>
  );
}

function Bold({ children }) {
  return <Text style={{ fontWeight: '700', color: theme.colors.text }}>{children}</Text>;
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: { 
    flexDirection: 'row', 
    alignItems: 'center', 
    justifyContent: 'space-between', 
    paddingHorizontal: 16, 
    paddingBottom: 16 
  },
  headerTitle: { fontSize: 20, fontWeight: 'bold' },
  backBtn: { padding: 8 },
  content: { padding: 20 },
  iconContainer: { alignItems: 'center', marginVertical: 30 },
  title: { fontSize: 28, fontWeight: 'bold', textAlign: 'center', marginBottom: 10 },
  effectiveDate: { textAlign: 'center', marginBottom: 30, fontSize: 14 },
  importantBox: {
    backgroundColor: "rgba(59, 130, 246, 0.1)",
    padding: 16,
    borderRadius: 12,
    marginBottom: 30,
    borderWidth: 1,
    borderColor: "rgba(59, 130, 246, 0.3)"
  },
  importantTitle: {
    color: "#3B82F6",
    fontWeight: "700",
    marginBottom: 8,
    fontSize: 15,
    textAlign: 'center'
  },
  importantText: {
    fontSize: 14,
    lineHeight: 20
  },
  section: { marginBottom: 30 },
  sectionTitle: { fontSize: 18, fontWeight: 'bold', marginBottom: 12 },
  sectionText: { fontSize: 15, lineHeight: 24 },
  acknowledgmentBox: {
    backgroundColor: "rgba(255, 255, 255, 0.05)",
    padding: 20,
    borderRadius: 12,
    marginTop: 20,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.1)"
  },
  acknowledgmentText: {
    fontSize: 14,
    fontWeight: '600',
    textAlign: 'center',
    lineHeight: 22
  },
  footer: { 
    textAlign: 'center', 
    marginTop: 20, 
    marginBottom: 40, 
    fontSize: 12 
  },
});
