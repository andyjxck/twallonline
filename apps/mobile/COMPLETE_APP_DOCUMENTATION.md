# Town Wall - Complete App Documentation

> **Version:** 1.0.0  
> **Platform:** iOS & Android (React Native / Expo)  
> **Website:** townwall.co.uk  
> **Support:** andyblewett991@gmail.com

---

## Table of Contents

1. [App Overview](#app-overview)
2. [Tech Stack](#tech-stack)
3. [App Screens & Navigation](#app-screens--navigation)
4. [Features](#features)
5. [Database Schema](#database-schema)
6. [UI Components](#ui-components)
7. [Third-Party Integrations](#third-party-integrations)
8. [Design System](#design-system)
9. [User Flows](#user-flows)
10. [Moderation System](#moderation-system)
11. [Monetization](#monetization)

---

## App Overview

**Town Wall** is a hyper-local community app that connects people within their city and neighborhood zones. Think of it as a local social network where users can:

- Share posts, news, and updates with their community
- Discover local businesses and talent
- Chat with neighbors (1-on-1 and group chats)
- Voice and video call other users
- Vote on community polls and feature suggestions
- Get help from an AI assistant called "Towny"

### Core Philosophy
- **Local First**: Content is organized by City → Zone (neighborhood)
- **Privacy Focused**: Anonymous posting option, minimal data collection
- **Community Driven**: Users can report, block, and help moderate
- **Safe for Work**: Strict SFW content moderation (Apple Guidelines compliant)

### Target Audience
- UK residents (currently UK-only, expandable)
- Age 18+ (verified during onboarding)
- People who want to connect with their local community

---

## Tech Stack

### Frontend
| Technology | Purpose |
|------------|---------|
| **React Native 0.81** | Cross-platform mobile framework |
| **Expo SDK 54** | Development platform & native APIs |
| **Expo Router 6** | File-based navigation |
| **Zustand 5** | State management |
| **Moti** | Animations |
| **Lucide React Native** | Icon library |
| **React Native Reanimated** | Advanced animations |

### Backend & Services
| Service | Purpose |
|---------|---------|
| **Supabase** | Database (PostgreSQL), Auth, Realtime, Storage |
| **OpenAI GPT-4o-mini** | AI moderation & Towny assistant |
| **Agora** | Voice & video calls |
| **Giphy SDK** | GIF picker |
| **RevenueCat** | In-app purchases & subscriptions |
| **Google AdMob** | Advertisements |
| **Uploadcare** | Image/video uploads |
| **Expo Notifications** | Push notifications |

### Key Libraries
```json
{
  "@supabase/supabase-js": "^2.89.0",
  "react-native-agora": "^4.5.3",
  "@giphy/react-native-sdk": "^5.0.1",
  "react-native-purchases": "^9.6.0",
  "react-native-google-mobile-ads": "^16.0.1",
  "expo-location": "~19.0.6",
  "expo-notifications": "~0.32.10",
  "expo-image-picker": "~17.0.7",
  "expo-av": "~16.0.6"
}
```

---

## App Screens & Navigation

### Onboarding Flow (First-time users)
```
/onboarding/welcome → /onboarding/uk-check → /onboarding/terms → /onboarding/city → /onboarding/zones → /auth
```

| Screen | File | Purpose |
|--------|------|---------|
| **Welcome** | `onboarding/welcome.jsx` | App introduction with animated logo |
| **UK Check** | `onboarding/uk-check.jsx` | Confirms user is in UK |
| **Terms** | `onboarding/terms.jsx` | Terms of Service + Age 18+ confirmation |
| **City Selection** | `onboarding/city.jsx` | User selects their city |
| **Zone Selection** | `onboarding/zones.jsx` | User selects their neighborhood zone |
| **Auth** | `auth.jsx` | Login / Signup with username + password |

### Main App Screens
| Screen | File | Purpose |
|--------|------|---------|
| **Feed** | `index.tsx` → `UniversalFeed.jsx` | Main feed with posts |
| **Profile** | `profile.jsx` | User profile (own or others) |
| **Settings** | `settings.jsx` | App settings & account management |
| **Businesses** | `businesses.jsx` | Local business directory with map |
| **Talent** | `talent.jsx` | Local talent/creators directory |
| **Polls** | `polls.jsx` | Community polls & feature voting |
| **Help/Towny** | `help.jsx` | AI assistant chat |
| **Admin** | `admin.jsx` | Moderation panel (mods/admins only) |
| **Post Editor** | `post.jsx` | Create/edit posts |
| **Privacy Policy** | `privacy.jsx` | Privacy policy display |
| **Guidelines** | `guidelines.jsx` | Community guidelines |
| **Guide** | `guide.jsx` | How to use the app |
| **Secret Hippie** | `secret-hippie.jsx` | Easter egg theme unlock |
| **Forgot Password** | `forgot-password.jsx` | Password recovery |

### Floating/Modal Components
| Component | Purpose |
|-----------|---------|
| **FloatingChat** | Chat overlay (DMs, groups, calls) |
| **NotificationPanel** | Notifications dropdown |
| **PostComposer** | Create new post modal |
| **ShareManager** | Share post as image |

---

## Features

### 1. Posts & Feed

#### Post Types
- **Regular Posts**: Title + body text + optional media
- **Anonymous Posts**: Posted without username visible
- **Poll Posts**: Posts with embedded polls
- **CTA Posts**: Posts with "Chat" or "Join Group" buttons

#### Post Content
- **Title**: Required, plain text
- **Body**: Rich text with bold, italic, underline support
- **Media**: Up to multiple images or 1 video
- **GIFs**: Via Giphy integration
- **Tags**: Categorization (News, Events, etc.)
- **Zone**: Which neighborhood the post belongs to

#### Post Actions
| Action | Description |
|--------|-------------|
| **Like (❤️)** | Heart reaction |
| **Superlike (⭐)** | Star reaction (extra appreciation) |
| **Flag (🚩)** | Report as inappropriate |
| **Share** | Generate shareable image card |
| **Comment** | Add comments with text/GIFs |
| **Save** | Save to profile |

#### Feed Views
- **Global**: All posts across all cities
- **City**: Posts from user's city only
- **Zone**: Posts from user's specific neighborhood

#### Feed Sorting
- **Newest**: Most recent first
- **Oldest**: Oldest first
- **Popular**: Most reactions first

### 2. Comments System

#### Comment Features
- Text comments
- GIF comments (via Giphy)
- Anonymous comments (with optional nickname)
- **Likes on comments** (heart button)
- **Replies** (nested under parent comment)
- Long-press to report

#### Comment Display
- Avatar (or anonymous icon)
- Username (or "Anonymous")
- Role badges (Admin, Mod, Councillor)
- Comment text/GIF
- Like count + Reply button + Timestamp
- Nested replies with left border indent

### 3. Chat & Messaging

#### Chat Types
| Type | Description |
|------|-------------|
| **Direct Messages** | 1-on-1 private chats |
| **Group Chats** | Multi-user chat rooms |
| **Chat Requests** | Pending chats from non-friends |

#### Message Types
- Text messages
- Image messages
- GIF messages
- Voice notes (audio recording)
- System messages

#### Chat Features
- Real-time messaging (Supabase Realtime)
- Typing indicators
- Recording indicators
- Read receipts
- Message timestamps
- Report chat/user
- Block user from chat

### 4. Voice & Video Calls

#### Call Types
- **Audio Calls**: Voice-only calls
- **Video Calls**: Video + audio calls
- **Group Calls**: Multi-participant calls

#### Call Features (Agora SDK)
- Mute/unmute microphone
- Toggle camera on/off
- Switch front/back camera
- Speaker/earpiece toggle
- Call duration timer
- Incoming call notifications

### 5. Local Businesses

#### Business Listing
- Business name & logo
- Category (Restaurant, Shop, Service, etc.)
- Description
- Location (address + map pin)
- Contact info (phone, website)
- Delivery platform links (Uber Eats, Deliveroo, Just Eat)
- Operating hours
- Verification status

#### Business Discovery
- **Map View**: Interactive map with business pins
- **List View**: Scrollable list of businesses
- **Search**: Search by name or category
- **Filters**: By category, distance, verification status

#### Business Actions
- Call business
- Visit website
- Get directions
- View on delivery platforms
- Report business

### 6. Local Talent

#### Talent Profile
- Name & avatar
- Category (Musician, Artist, Photographer, etc.)
- Bio/description
- Portfolio images
- Social links (YouTube, Instagram, Spotify, TikTok)
- Verification status

#### Talent Discovery
- Browse by category
- Search by name
- View portfolio
- Contact talent

### 7. Polls & Voting

#### Poll Types
- **Community Polls**: General community questions
- **Feature Suggestions**: Vote on app feature ideas

#### Poll Features
- Multiple choice options
- Vote counts (visible after voting)
- One vote per user
- Poll expiration dates

### 8. Towny AI Assistant

#### Capabilities
- Answer questions about the app
- Help navigate features
- Generate images (DALL-E integration)
- General friendly conversation
- Knows about Town Wall features

#### Personality
- Friendly and helpful
- Knowledgeable about local community
- Strictly SFW responses
- Contains mysterious hints about "hippie" theme

### 9. User Profiles

#### Profile Information
- Username (unique)
- Avatar (image or emoji)
- Bio
- City & Zone
- Join date
- Role badges (Admin, Mod, Councillor)
- Online status indicator

#### Profile Sections
- **Posts**: User's posts
- **Saved**: Saved posts (own profile only)
- **Friends**: Friend list

#### Profile Actions
- **Add Friend**: Send friend request
- **Message**: Start chat
- **Block**: Block user
- **Report**: Report user

### 10. Friends System

#### Friend Features
- Send friend requests
- Accept/decline requests
- View friend list
- Remove friends
- Friends can message without chat requests

### 11. Notifications

#### Notification Types
| Type | Trigger |
|------|---------|
| **Like** | Someone likes your post |
| **Superlike** | Someone superlikes your post |
| **Comment** | Someone comments on your post |
| **Reply** | Someone replies to your comment |
| **Friend Request** | Someone sends friend request |
| **Friend Accepted** | Friend request accepted |
| **Chat Message** | New message received |
| **Moderation** | Moderation action on your content |
| **Report Update** | Your report was reviewed |

#### Notification Settings
- **Do Not Disturb**: Silence all notifications
- Push notifications (device level)

### 12. Settings

#### Account Settings
| Setting | Description |
|---------|-------------|
| **Do Not Disturb** | Toggle notification silence |
| **Location** | Update city/zone |
| **Change Password** | Update account password |
| **Recovery Codes** | Generate backup codes for account access |
| **Blocked Users** | Manage blocked users list |

#### Legal & Support
- Privacy Policy
- Community Guidelines
- How to Use Town Wall (Guide)
- Send us an email (Support)

#### Danger Zone
- **Delete Account**: Schedule account deletion (30-day grace period)
- **Sign Out**: Log out of account

### 13. Reporting & Blocking

#### Reportable Content
| Content | How to Report |
|---------|---------------|
| **Post** | 3-dot menu → Report Post |
| **Comment** | Long-press → Select reason |
| **User** | Profile → Report button |
| **Chat** | Chat menu → Report Chat/User |
| **Ad** | Flag icon on ad |

#### Report Reasons
- Harassment or bullying
- Spam or scam
- Hate speech or discrimination
- Inappropriate or explicit content
- Violence or threats
- Misinformation
- Impersonation
- Other

#### Blocking
- Block from post (3-dot menu)
- Block from profile
- Block from chat
- Manage blocked users in Settings

### 14. Moderation System

#### User Roles
| Role | Level | Permissions |
|------|-------|-------------|
| **User** | 0 | Basic features |
| **Councillor** | 2 | City-specific badge, trusted user |
| **Moderator** | 3 | Delete posts, blur content, mute users |
| **Admin** | 4 | All mod powers + user management |
| **Super Admin** | 5 | Full access + analytics |

#### Mod Actions
- Delete post
- Blur post (with reason)
- Disable comments
- Mute user
- Ban user
- Warn user
- Promote/demote users

#### AI Moderation
All posts go through AI moderation before publishing:
- **Approved**: Post goes live immediately
- **Held**: Post queued for manual review
- **Rejected**: Post blocked with reason

#### Moderation Logs
- All mod actions are logged
- Logs show: action, moderator, target, reason, timestamp
- Super admins can undo actions

### 15. Themes

#### Default Theme (Dark)
- Black background (#000000)
- White text (#FFFFFF)
- White primary buttons
- Dark grey surfaces (#121212)

#### Light Theme
- White background
- Dark text
- Inverted colors

#### Hippie Theme (Secret Easter Egg)
- Unlocked by tapping logo 15 times
- Psychedelic animated background
- Rainbow colors
- Trippy visual effects

---

## Database Schema

### Core Tables

#### `rusers` - Users
```sql
id BIGSERIAL PRIMARY KEY
supabase_uid UUID (auth reference)
username TEXT UNIQUE
password TEXT (bcrypt hashed)
email TEXT
avatar_url TEXT
emoji_icon TEXT
bio TEXT
city_id BIGINT
zone_id BIGINT
is_admin BOOLEAN
is_moderator BOOLEAN
is_councillor BOOLEAN
councillor_city_id BIGINT
is_muted BOOLEAN
is_banned BOOLEAN
is_verified BOOLEAN
warning_count INTEGER
do_not_disturb BOOLEAN
last_seen TIMESTAMPTZ
created_at TIMESTAMPTZ
```

#### `rposts` - Posts
```sql
id BIGSERIAL PRIMARY KEY
user_id BIGINT REFERENCES rusers
title TEXT
text TEXT
image_url TEXT
image_urls TEXT[]
media_type TEXT (image/video)
zone_id BIGINT
city_id BIGINT
tag_id BIGINT
is_anonymous BOOLEAN
is_deleted BOOLEAN
is_blurred BOOLEAN
blur_reason TEXT
comments_disabled BOOLEAN
moderation_status TEXT (approved/held/rejected/flagged)
moderation_reason TEXT
poll_id BIGINT
cta_type TEXT (chat/group)
cta_group_id BIGINT
share_count INTEGER
created_at TIMESTAMPTZ
```

#### `rcomments` - Comments
```sql
id BIGSERIAL PRIMARY KEY
post_id BIGINT REFERENCES rposts
user_id BIGINT REFERENCES rusers
text TEXT
gif_url TEXT
is_anonymous BOOLEAN
nickname TEXT
parent_comment_id BIGINT (for replies)
device_id TEXT
created_at TIMESTAMPTZ
```

#### `rcomment_likes` - Comment Likes
```sql
id BIGSERIAL PRIMARY KEY
comment_id BIGINT REFERENCES rcomments
user_id BIGINT REFERENCES rusers
device_id TEXT
created_at TIMESTAMPTZ
```

#### `rreactions` - Post Reactions
```sql
id BIGSERIAL PRIMARY KEY
post_id BIGINT REFERENCES rposts
user_id BIGINT REFERENCES rusers
device_id TEXT
reaction_type TEXT (helpful/superlike/fake)
created_at TIMESTAMPTZ
```

#### `rchats` - Chats
```sql
id BIGSERIAL PRIMARY KEY
user1_id BIGINT
user2_id BIGINT
is_group BOOLEAN
group_name TEXT
group_icon TEXT
initiated_by BIGINT
status TEXT (pending/accepted)
last_message TEXT
last_message_at TIMESTAMPTZ
created_at TIMESTAMPTZ
```

#### `rchat_members` - Group Chat Members
```sql
id BIGSERIAL PRIMARY KEY
chat_id BIGINT REFERENCES rchats
user_id BIGINT REFERENCES rusers
role TEXT (admin/member)
joined_at TIMESTAMPTZ
```

#### `rmessages` - Chat Messages
```sql
id BIGSERIAL PRIMARY KEY
chat_id BIGINT REFERENCES rchats
sender_id BIGINT REFERENCES rusers
content TEXT
image_url TEXT
gif_url TEXT
audio_url TEXT
is_read BOOLEAN
created_at TIMESTAMPTZ
```

#### `rbusinesses` - Businesses
```sql
id BIGSERIAL PRIMARY KEY
user_id BIGINT REFERENCES rusers
name TEXT
description TEXT
category TEXT
logo_url TEXT
address TEXT
latitude FLOAT
longitude FLOAT
phone TEXT
website TEXT
delivery_links JSONB
status TEXT (pending/approved/rejected)
created_at TIMESTAMPTZ
```

#### `rtalent` - Talent Profiles
```sql
id BIGSERIAL PRIMARY KEY
user_id BIGINT REFERENCES rusers
name TEXT
category TEXT
description TEXT
avatar_url TEXT
portfolio_urls TEXT[]
social_links JSONB
platform TEXT
status TEXT (pending/approved/rejected)
created_at TIMESTAMPTZ
```

#### `rreports` - Reports
```sql
id BIGSERIAL PRIMARY KEY
reporter_id BIGINT REFERENCES rusers
post_id BIGINT
comment_id BIGINT
target_id BIGINT (user being reported)
chat_id BIGINT
report_type TEXT (post/comment/user/chat)
reason TEXT
status TEXT (pending/resolved/dismissed)
created_at TIMESTAMPTZ
```

#### `rblocks` - Blocks
```sql
id BIGSERIAL PRIMARY KEY
blocker_user_id BIGINT REFERENCES rusers
blocked_user_id BIGINT REFERENCES rusers
source TEXT (post/profile/chat)
reason TEXT
post_id BIGINT
created_at TIMESTAMPTZ
```

#### `rmoderation_logs` - Mod Logs
```sql
id BIGSERIAL PRIMARY KEY
moderator_id BIGINT REFERENCES rusers
target_id BIGINT
target_type TEXT (post/user/business/talent)
action TEXT
reason TEXT
previous_state JSONB
post_title TEXT
post_user_id BIGINT
is_undone BOOLEAN
undone_by BIGINT
undone_at TIMESTAMPTZ
created_at TIMESTAMPTZ
```

#### `friends` - Friendships
```sql
id BIGSERIAL PRIMARY KEY
user_id BIGINT REFERENCES rusers
friend_id BIGINT REFERENCES rusers
status TEXT (pending/accepted)
created_at TIMESTAMPTZ
```

#### `rnotifications` - Notifications
```sql
id BIGSERIAL PRIMARY KEY
user_id BIGINT REFERENCES rusers
title TEXT
message TEXT
type TEXT
link TEXT
is_read BOOLEAN
created_at TIMESTAMPTZ
```

#### `rpolls` - Polls
```sql
id BIGSERIAL PRIMARY KEY
question TEXT
is_active BOOLEAN
created_at TIMESTAMPTZ
```

#### `rpoll_options` - Poll Options
```sql
id BIGSERIAL PRIMARY KEY
poll_id BIGINT REFERENCES rpolls
option_text TEXT
```

#### `rpoll_votes` - Poll Votes
```sql
id BIGSERIAL PRIMARY KEY
poll_id BIGINT REFERENCES rpolls
option_id BIGINT REFERENCES rpoll_options
user_id BIGINT REFERENCES rusers
created_at TIMESTAMPTZ
```

#### `rcities` - Cities
```sql
id BIGSERIAL PRIMARY KEY
name TEXT
country TEXT
latitude FLOAT
longitude FLOAT
```

#### `rzones` - Zones (Neighborhoods)
```sql
id BIGSERIAL PRIMARY KEY
city_id BIGINT REFERENCES rcities
name TEXT
description TEXT
```

#### `rtags` - Post Tags
```sql
id BIGSERIAL PRIMARY KEY
name TEXT
color TEXT
```

#### `rsaved_posts` - Saved Posts
```sql
id BIGSERIAL PRIMARY KEY
user_id BIGINT REFERENCES rusers
post_id BIGINT REFERENCES rposts
created_at TIMESTAMPTZ
```

#### `rshares` - Share Tracking
```sql
id BIGSERIAL PRIMARY KEY
post_id BIGINT REFERENCES rposts
user_id BIGINT REFERENCES rusers
created_at TIMESTAMPTZ
```

#### `rhelp_messages` - Towny Chat
```sql
id BIGSERIAL PRIMARY KEY
sender_id BIGINT
receiver_id BIGINT
content TEXT
is_from_admin BOOLEAN
status TEXT
created_at TIMESTAMPTZ
```

#### `rrecovery_codes` - Account Recovery
```sql
id BIGSERIAL PRIMARY KEY
user_id BIGINT REFERENCES rusers
code_hash TEXT
is_used BOOLEAN
created_at TIMESTAMPTZ
```

---

## UI Components

### Core Components

| Component | File | Purpose |
|-----------|------|---------|
| **UniversalFeed** | `UniversalFeed.jsx` | Main feed with posts, header, menu |
| **PostItem** | `PostItem.jsx` | Individual post card |
| **PostComposer** | `PostComposer.jsx` | Create/edit post modal |
| **FloatingChat** | `FloatingChat.jsx` | Chat overlay with messages, calls |
| **NotificationPanel** | `NotificationPanel.jsx` | Notifications dropdown |
| **PollComponent** | `PollComponent.jsx` | Embedded poll in posts |
| **ShareCard** | `ShareCard.jsx` | Shareable post image |
| **ShareManager** | `ShareManager.jsx` | Share functionality |
| **RichTextEditor** | `RichTextEditor.jsx` | Bold/italic/underline editor |

### Ad Components
| Component | Purpose |
|-----------|---------|
| **BannerAd** | Bottom banner advertisements |
| **FeedNativeAd** | Native ads in feed |
| **BusinessNativeAd** | Native ads in business list |
| **NativeAd** | Base native ad component |
| **PromotionAd** | Promotional ad cards |

### Utility Components
| Component | Purpose |
|-----------|---------|
| **HippieBackground** | Animated psychedelic background |
| **WelcomeModal** | First-time user welcome |
| **DeletionPendingOverlay** | Account deletion countdown |
| **UserWarningOverlay** | Warning display for muted users |
| **InAppNotification** | Toast notifications |
| **RecoveryCodesDisplay** | Show recovery codes |
| **RecoveryCodesCard** | Recovery code card |

### Settings Components
| Component | Purpose |
|-----------|---------|
| **SettingsHeader** | Settings page header |
| **NotificationSettings** | Notification preferences |
| **BiometricsSettings** | Biometric auth settings |
| **DataSettings** | Data management |
| **MoonNameSettings** | Anonymous nickname |
| **AboutSection** | App info |

---

## Third-Party Integrations

### Supabase
- **Database**: PostgreSQL with Row Level Security
- **Auth**: Email/password authentication
- **Realtime**: Live chat messages, typing indicators
- **Storage**: Image and video uploads

### OpenAI
- **GPT-4o-mini**: Content moderation
- **GPT-4o-mini**: Towny AI assistant
- **DALL-E**: Image generation (via Towny)

### Agora
- **Voice Calls**: Audio-only calls
- **Video Calls**: Video + audio calls
- **Group Calls**: Multi-participant

### Giphy
- **GIF Picker**: Search and select GIFs
- **GIF Display**: Render GIFs in posts/comments/chat

### RevenueCat
- **Subscriptions**: Premium features (future)
- **In-App Purchases**: One-time purchases (future)

### Google AdMob
- **Banner Ads**: Bottom of screen
- **Native Ads**: In-feed advertisements
- **Interstitial Ads**: Full-screen ads (future)

### Uploadcare
- **Image Upload**: Compress and upload images
- **Video Upload**: Upload video content

### Expo Services
- **Push Notifications**: Remote notifications
- **Location**: GPS and geocoding
- **Camera**: Photo/video capture
- **Image Picker**: Gallery selection
- **Haptics**: Vibration feedback
- **Secure Store**: Encrypted local storage

---

## Design System

### Colors

#### Dark Theme (Default)
```javascript
{
  primary: '#FFFFFF',      // White buttons
  secondary: '#64748B',    // Slate grey
  accent: '#4ADE80',       // Green highlights
  background: '#000000',   // Pure black
  surface: '#121212',      // Dark grey cards
  text: '#FFFFFF',         // White text
  textSecondary: 'rgba(255, 255, 255, 0.5)',
  border: 'rgba(255, 255, 255, 0.1)',
  error: '#EF4444',        // Red
  success: '#4ADE80',      // Green
}
```

#### Light Theme
```javascript
{
  primary: '#000000',      // Black buttons
  background: '#FFFFFF',   // White
  surface: '#F1F5F9',      // Light grey
  text: '#000000',         // Black text
  textSecondary: 'rgba(0, 0, 0, 0.5)',
  border: 'rgba(0, 0, 0, 0.1)',
}
```

#### Hippie Theme
- Animated rainbow gradients
- Psychedelic color cycling
- Trippy visual effects

### Typography
```javascript
{
  fontFamily: 'Inter',
  h1: { fontSize: 32, fontWeight: '900', letterSpacing: -1 },
  h2: { fontSize: 24, fontWeight: '700', letterSpacing: -0.5 },
  h3: { fontSize: 20, fontWeight: '600', letterSpacing: -0.2 },
  body: { fontSize: 16, fontWeight: '400', lineHeight: 24 },
  bodySmall: { fontSize: 14, fontWeight: '400', lineHeight: 20 },
  meta: { fontSize: 12, fontWeight: '500', letterSpacing: 0.2 },
  button: { fontSize: 16, fontWeight: '700' },
}
```

### Spacing
```javascript
{
  xs: 4,
  sm: 8,
  md: 16,
  lg: 24,
  xl: 32,
  xxl: 48,
}
```

### Border Radius
- Default: 16px
- Buttons: 12px
- Avatars: 50% (circular)
- Cards: 16px
- Inputs: 12px

### Shadows
```javascript
{
  small: { shadowOpacity: 0.2, shadowRadius: 4, elevation: 2 },
  medium: { shadowOpacity: 0.3, shadowRadius: 12, elevation: 5 },
  large: { shadowOpacity: 0.4, shadowRadius: 24, elevation: 8 },
}
```

### Icons
- **Library**: Lucide React Native
- **Size**: 16-28px depending on context
- **Color**: Matches text color or semantic color

---

## User Flows

### New User Onboarding
```
1. Welcome Screen (animated logo, "Get Started" button)
2. UK Check (confirm user is in UK)
3. Terms & Age (accept terms, confirm 18+)
4. City Selection (pick city from list)
5. Zone Selection (pick neighborhood)
6. Auth (create account with username/password)
7. Main Feed (start using app)
```

### Creating a Post
```
1. Tap "+" button on feed
2. Post Composer opens
3. Enter title (required)
4. Enter body text (optional, rich text)
5. Add images/video (optional)
6. Add GIF (optional)
7. Select zone (defaults to user's zone)
8. Toggle anonymous (optional)
9. Tap "Post"
10. AI moderation checks content
11. If approved → Post appears in feed
12. If held → Post queued for review
13. If rejected → User sees rejection reason
```

### Reporting Content
```
1. Find objectionable content
2. For posts: Tap 3-dot menu → "Report Post"
3. For comments: Long-press → Select reason
4. For users: Profile → "Report" button
5. Select reason from list
6. Confirm report
7. See confirmation message
8. Moderators review within 24 hours
```

### Starting a Chat
```
1. Visit user's profile
2. Tap "Message" button
3. If friends: Chat opens immediately
4. If not friends: Chat request sent
5. Other user sees request in chat list
6. They accept or decline
7. If accepted: Chat becomes active
```

### Making a Call
```
1. Open chat with user
2. Tap phone icon (audio) or video icon (video)
3. Call initiates
4. Other user receives notification
5. They accept or decline
6. If accepted: Call connects
7. Use controls: mute, camera, speaker
8. Tap end call to hang up
```

---

## Moderation System

### Content Moderation Flow
```
User creates post
    ↓
AI Moderation (GPT-4o-mini)
    ↓
├── APPROVED → Post goes live
├── HELD → Queued for manual review
└── REJECTED → User notified with reason
```

### AI Moderation Rules
**Automatic Reject:**
- NSFW/Sexual content
- Violence/Gore
- Hate speech
- Harassment/Bullying
- Profanity/Slurs
- Illegal activity
- Spam
- Misinformation
- Personal information
- Impersonation

**Hold for Review:**
- Heated political discussion
- Ambiguous complaints
- Non-English content
- Unclear context

**Approve:**
- Friendly community discussion
- Local news/events
- Questions and answers
- Business promotion (non-spam)
- Constructive feedback
- Clean humor

### Manual Moderation (Admin Panel)
**Tabs:**
- Talent (pending talent applications)
- Business (pending business applications)
- Help (support chat transcripts)
- Polls (feature suggestions)
- Edits (showcase edit requests)
- AI Logs (AI moderation decisions)
- Reports (user reports)
- Blocks (block logs)
- Users (user management)
- Logs (moderation action logs)
- Analytics (app statistics)

**Actions:**
- Approve/Reject content
- Delete posts
- Blur posts
- Mute/Unmute users
- Ban users
- Warn users
- Promote/Demote users
- Undo previous actions

---

## Monetization

### Current Revenue Streams

#### Advertising (Google AdMob)
- Banner ads at bottom of feed
- Native ads in feed (every ~10 posts)
- Native ads in business listings

### Future Revenue Streams (Planned)

#### Premium Subscription
- Ad-free experience
- Exclusive features
- Priority support

#### Business Listings
- Featured placement
- Verified badge
- Analytics

#### Talent Promotion
- Featured profiles
- Portfolio highlights

---

## Permissions

### iOS Permissions
| Permission | Usage |
|------------|-------|
| **Camera** | Video calls, taking photos for posts/profile |
| **Microphone** | Voice/video calls, voice messages |
| **Location** | Find local city, nearby businesses/talent |
| **Notifications** | Push notifications |
| **Tracking** | Ad personalization (ATT prompt) |

### Android Permissions
| Permission | Usage |
|------------|-------|
| **CAMERA** | Video calls, photos |
| **RECORD_AUDIO** | Voice/video calls, voice notes |
| **ACCESS_FINE_LOCATION** | Local content |
| **ACCESS_COARSE_LOCATION** | City detection |
| **POST_NOTIFICATIONS** | Push notifications |

---

## Easter Eggs

### Hippie Theme
- **Unlock**: Tap the Town Wall logo 15 times on the feed
- **Effect**: Psychedelic animated background, rainbow colors
- **Toggle**: Can be turned on/off after unlock

### Towny's Secret
- The AI assistant Towny contains mysterious hints about the hippie theme
- Asking certain questions reveals cryptic clues

---

## API Endpoints

### Supabase Tables (RLS Protected)
All data access goes through Supabase client with Row Level Security policies.

### External APIs
| API | Endpoint | Purpose |
|-----|----------|---------|
| OpenAI | `api.openai.com/v1/chat/completions` | AI moderation & chat |
| Agora | Agora SDK | Voice/video calls |
| Giphy | Giphy SDK | GIF search |
| Uploadcare | `upload.uploadcare.com` | File uploads |

---

## Environment Variables

```env
EXPO_PUBLIC_SUPABASE_URL=https://xxx.supabase.co
EXPO_PUBLIC_SUPABASE_ANON_KEY=xxx
EXPO_PUBLIC_OPENAI_API_KEY=xxx
EXPO_PUBLIC_AGORA_APP_ID=xxx
EXPO_PUBLIC_GIPHY_API_KEY=xxx
EXPO_PUBLIC_UPLOADCARE_PUBLIC_KEY=xxx
EXPO_PUBLIC_REVENUECAT_API_KEY=xxx
EXPO_PUBLIC_ADMOB_BANNER_ID=xxx
EXPO_PUBLIC_ADMOB_NATIVE_ID=xxx
```

---

## File Structure

```
/src
├── /app                    # Screens (Expo Router)
│   ├── _layout.tsx         # Root layout
│   ├── index.tsx           # Entry point → Feed
│   ├── auth.jsx            # Login/Signup
│   ├── profile.jsx         # User profiles
│   ├── settings.jsx        # Settings
│   ├── businesses.jsx      # Business directory
│   ├── talent.jsx          # Talent directory
│   ├── polls.jsx           # Polls & voting
│   ├── help.jsx            # Towny AI
│   ├── admin.jsx           # Admin panel
│   ├── post.jsx            # Post editor
│   ├── privacy.jsx         # Privacy policy
│   ├── guidelines.jsx      # Community guidelines
│   ├── guide.jsx           # How to use
│   ├── secret-hippie.jsx   # Easter egg
│   ├── forgot-password.jsx # Password recovery
│   └── /onboarding         # Onboarding screens
│       ├── welcome.jsx
│       ├── uk-check.jsx
│       ├── terms.jsx
│       ├── city.jsx
│       └── zones.jsx
├── /components             # Reusable components
│   ├── UniversalFeed.jsx
│   ├── PostItem.jsx
│   ├── PostComposer.jsx
│   ├── FloatingChat.jsx
│   ├── NotificationPanel.jsx
│   ├── PollComponent.jsx
│   ├── ShareCard.jsx
│   ├── ShareManager.jsx
│   ├── RichTextEditor.jsx
│   ├── BannerAd.jsx
│   ├── FeedNativeAd.jsx
│   ├── HippieBackground.jsx
│   └── /settings           # Settings components
└── /utils                  # Utilities & services
    ├── supabase.js         # Supabase client
    ├── ai.js               # OpenAI integration
    ├── notifications.js    # Push notifications
    ├── blocking.js         # Block functionality
    ├── reporting.js        # Report functionality
    ├── friends.js          # Friends system
    ├── location.js         # Location services
    ├── locationStore.js    # Location state
    ├── theme.js            # Theme constants
    ├── ThemeContext.js     # Theme provider
    ├── deviceId.js         # Device identification
    ├── encryption.js       # Encryption utilities
    ├── recoveryCode.js     # Recovery codes
    ├── user.js             # User utilities
    ├── offline.js          # Offline support
    ├── onboarding.js       # Onboarding state
    └── /auth               # Auth utilities
        ├── index.js
        ├── store.js
        └── useAuth.js
```

---

## Summary

Town Wall is a comprehensive local community app with:

- **21 screens** covering all user journeys
- **27 components** for UI building blocks
- **22 utility files** for business logic
- **20+ database tables** for data storage
- **10+ third-party integrations** for features
- **3 themes** (dark, light, hippie)
- **5 user roles** with granular permissions
- **Full moderation system** with AI + manual review
- **Real-time features** (chat, calls, notifications)
- **Offline support** for posts
- **Monetization** via ads (with premium planned)

The app is designed to be:
- **Safe**: Strict SFW moderation, Apple compliant
- **Local**: City and zone-based content
- **Social**: Friends, chat, calls, reactions
- **Discoverable**: Businesses, talent, polls
- **Fun**: Easter eggs, AI assistant, themes
