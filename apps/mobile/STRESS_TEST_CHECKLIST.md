# Town Wall - Comprehensive Stress Test Checklist

> **Purpose:** Test every feature of the app thoroughly before release  
> **Time Estimate:** 2-3 hours for complete testing  
> **Devices Needed:** iOS device, Android device (ideally), second account for chat/call testing

---

## Pre-Test Setup

### Accounts Needed
- [ ] **Primary Test Account** - Your main testing account
- [ ] **Secondary Test Account** - For testing chat, calls, friend requests
- [ ] **Mod/Admin Account** - For testing moderation features
- [ ] **Fresh Account** - For testing onboarding (delete app data or use new device)

### Environment
- [ ] Stable internet connection
- [ ] Notifications enabled on device
- [ ] Location services enabled
- [ ] Camera & microphone permissions ready to grant
- [ ] Database migration run (comment likes/replies)

---

## 1. ONBOARDING FLOW

### 1.1 Welcome Screen
- [ ] App launches without crash
- [ ] Logo animation plays smoothly
- [ ] "Get Started" button is tappable
- [ ] Transitions to next screen

### 1.2 UK Check
- [ ] Screen loads correctly
- [ ] "Yes, I'm in the UK" proceeds to next screen
- [ ] "No" shows appropriate message/blocks access

### 1.3 Terms & Age Verification
- [ ] Terms text is readable and scrollable
- [ ] Age 18+ checkbox works
- [ ] Terms acceptance checkbox works
- [ ] Cannot proceed without both checked
- [ ] "Continue" button works when both checked

### 1.4 City Selection
- [ ] City list loads
- [ ] Search/filter works (if implemented)
- [ ] Can select a city
- [ ] Selected city is highlighted
- [ ] "Continue" proceeds to zones

### 1.5 Zone Selection
- [ ] Zones load for selected city
- [ ] Can select a zone
- [ ] "Continue" proceeds to auth

### 1.6 Authentication
- [ ] **Sign Up Flow:**
  - [ ] Username field accepts input
  - [ ] Password field accepts input (masked)
  - [ ] Username validation (unique, no special chars)
  - [ ] Password validation (minimum length)
  - [ ] Account creates successfully
  - [ ] Redirects to main feed
- [ ] **Login Flow:**
  - [ ] Can switch to login mode
  - [ ] Existing credentials work
  - [ ] Wrong password shows error
  - [ ] Wrong username shows error

---

## 2. MAIN FEED

### 2.1 Feed Loading
- [ ] Feed loads without crash
- [ ] Posts display correctly
- [ ] Pull-to-refresh works
- [ ] Infinite scroll loads more posts
- [ ] Loading indicator shows while fetching

### 2.2 Feed Header
- [ ] Logo displays
- [ ] Tapping logo 15 times unlocks hippie mode (easter egg)
- [ ] Notification bell icon shows
- [ ] Notification count badge updates
- [ ] Menu button opens side menu

### 2.3 Feed Filters
- [ ] **Scope Filters:**
  - [ ] "Global" shows all posts
  - [ ] "City" shows city-only posts
  - [ ] "Zone" shows zone-only posts
- [ ] **Sort Options:**
  - [ ] "Newest" sorts by date descending
  - [ ] "Oldest" sorts by date ascending
  - [ ] "Popular" sorts by reactions

### 2.4 Dropdown Menu (Top Right)
- [ ] Menu button (hamburger icon) opens dropdown
- [ ] Dropdown appears with animation
- [ ] All menu items are tappable:
  - [ ] Profile
  - [ ] Settings
  - [ ] Businesses
  - [ ] Talent
  - [ ] Polls
  - [ ] Help (Towny)
- [ ] Tapping outside closes dropdown
- [ ] Note: Guide, Guidelines, Sign Out are in Settings screen

---

## 3. POSTS

### 3.1 Post Display
- [ ] Title displays correctly
- [ ] Body text displays (with rich text formatting)
- [ ] Images load and display
- [ ] Multiple images carousel works
- [ ] Videos play
- [ ] GIFs animate
- [ ] Zone tag shows
- [ ] Category tag shows
- [ ] Timestamp shows
- [ ] Author info shows (or "Anonymous")

### 3.2 Post Creation
- [ ] "+" button opens composer
- [ ] **Title:**
  - [ ] Required field validation
  - [ ] Character limit works
- [ ] **Body:**
  - [ ] Rich text editor works
  - [ ] Bold formatting (select text, tap B)
  - [ ] Italic formatting
  - [ ] Underline formatting
- [ ] **Media:**
  - [ ] Image picker opens
  - [ ] Can select from gallery
  - [ ] Can take new photo
  - [ ] Multiple images work
  - [ ] Video selection works
  - [ ] Can remove selected media
- [ ] **GIF:**
  - [ ] Giphy picker opens
  - [ ] Search works
  - [ ] Can select GIF
  - [ ] GIF preview shows
  - [ ] Can remove GIF
- [ ] **Zone Selection:**
  - [ ] Defaults to user's zone
  - [ ] Can change zone
- [ ] **Anonymous Toggle:**
  - [ ] Toggle works
  - [ ] Shows nickname field when on
- [ ] **Post Button:**
  - [ ] Disabled when title empty
  - [ ] Shows loading state
  - [ ] Post appears in feed after success
  - [ ] AI moderation processes post

### 3.3 Post Actions
- [ ] **Like (Heart):**
  - [ ] Tap to like
  - [ ] Heart fills/animates
  - [ ] Count updates
  - [ ] Tap again to unlike
- [ ] **Superlike (Star):**
  - [ ] Tap to superlike
  - [ ] Star fills/animates
  - [ ] Count updates
- [ ] **Comment:**
  - [ ] Tap expands comments section
  - [ ] Comment count shows
- [ ] **Share:**
  - [ ] Share button works
  - [ ] Share card generates
  - [ ] Can share to other apps
- [ ] **3-Dot Menu:**
  - [ ] Menu opens
  - [ ] "Report Post" option works
  - [ ] "Block User" option works
  - [ ] "Save Post" option works (if implemented)

### 3.4 Post Editing (Own Posts)
- [ ] Edit option shows for own posts
- [ ] Can edit title
- [ ] Can edit body
- [ ] Changes save correctly

### 3.5 Post Deletion (Own Posts)
- [ ] Delete option shows for own posts
- [ ] Confirmation dialog appears
- [ ] Post removes from feed after delete

---

## 4. COMMENTS

### 4.1 Comment Display
- [ ] Comments load when expanded
- [ ] Avatar shows (or anonymous icon)
- [ ] Username shows (or "Anonymous")
- [ ] Role badges show (Admin, Mod, Councillor)
- [ ] Comment text displays
- [ ] GIFs display in comments
- [ ] Timestamp shows
- [ ] Like button shows
- [ ] Reply button shows

### 4.2 Comment Creation
- [ ] Text input works
- [ ] Can type comment
- [ ] GIF button opens Giphy
- [ ] Can add GIF to comment
- [ ] Anonymous toggle works
- [ ] Send button posts comment
- [ ] Comment appears in list

### 4.3 Comment Likes
- [ ] Tap heart to like comment
- [ ] Heart fills when liked
- [ ] Like count updates
- [ ] Tap again to unlike

### 4.4 Comment Replies
- [ ] Tap "Reply" button
- [ ] "Replying to @username" indicator shows
- [ ] Can cancel reply (X button)
- [ ] Reply posts successfully
- [ ] Reply appears nested under parent
- [ ] Reply has indent/border styling

### 4.5 Comment Reporting
- [ ] Long-press comment (not your own)
- [ ] Report modal opens
- [ ] Can select reason
- [ ] Report submits

---

## 5. USER PROFILES

### 5.1 Own Profile
- [ ] Profile loads
- [ ] Avatar displays
- [ ] Username displays
- [ ] Bio displays
- [ ] City/Zone shows
- [ ] Join date shows
- [ ] **Posts Tab:**
  - [ ] Own posts load
  - [ ] Can tap to view post
- [ ] **Saved Tab:**
  - [ ] Saved posts load
- [ ] **Friends Tab:**
  - [ ] Friend list loads
  - [ ] Can tap friend to view profile

### 5.2 Other User Profile
- [ ] Profile loads when tapping username
- [ ] Avatar displays
- [ ] Username displays
- [ ] Bio displays
- [ ] Online status indicator
- [ ] **Action Buttons:**
  - [ ] "Add Friend" / "Friends" / "Pending" status
  - [ ] "Message" button starts chat
  - [ ] "Block" button works
  - [ ] "Report" button works

### 5.3 Profile Editing
- [ ] Edit button on own profile
- [ ] Can change avatar (image or emoji)
- [ ] Can edit bio
- [ ] Changes save correctly

---

## 6. FRIENDS SYSTEM

### 6.1 Friend Requests
- [ ] Send friend request from profile
- [ ] Request shows as "Pending"
- [ ] **Receiving Account:**
  - [ ] Notification received
  - [ ] Can view request
  - [ ] Can accept request
  - [ ] Can decline request
- [ ] After accept: both show as "Friends"

### 6.2 Friend List
- [ ] Friends tab shows all friends
- [ ] Can tap to view friend profile
- [ ] Can remove friend

---

## 7. CHAT & MESSAGING

### 7.1 Chat List
- [ ] Chat icon/button accessible
- [ ] Chat list loads
- [ ] Shows recent chats
- [ ] Shows last message preview
- [ ] Shows unread indicator
- [ ] Shows chat request section (if any pending)

### 7.2 Direct Messages
- [ ] **Starting Chat (Non-Friend):**
  - [ ] Tap "Message" on profile
  - [ ] Chat request sent
  - [ ] Other user sees request
  - [ ] Accept/decline works
- [ ] **Starting Chat (Friend):**
  - [ ] Chat opens immediately
- [ ] **Messaging:**
  - [ ] Text input works
  - [ ] Send button works
  - [ ] Message appears in chat
  - [ ] Message appears for other user (realtime)
  - [ ] Timestamps show
  - [ ] Read receipts work

### 7.3 Message Types
- [ ] **Text:** Send and receive text
- [ ] **Images:** 
  - [ ] Can send image
  - [ ] Image displays in chat
  - [ ] Can tap to view full size
- [ ] **GIFs:**
  - [ ] Giphy picker works
  - [ ] GIF sends and displays
- [ ] **Voice Notes:**
  - [ ] Record button works
  - [ ] Recording indicator shows
  - [ ] Can send voice note
  - [ ] Voice note plays

### 7.4 Group Chats
- [ ] Can create group chat
- [ ] Can name group
- [ ] Can add members
- [ ] Group icon shows
- [ ] All members receive messages
- [ ] Can leave group

### 7.5 Chat Actions
- [ ] **Block User:** Block from chat menu
- [ ] **Report Chat:** Report option works
- [ ] **Delete Chat:** (if implemented)

---

## 8. VOICE & VIDEO CALLS

### 8.1 Audio Calls
- [ ] Tap phone icon in chat
- [ ] Call initiates
- [ ] Calling UI shows
- [ ] **Receiving Call:**
  - [ ] Notification/ring
  - [ ] Accept button works
  - [ ] Decline button works
- [ ] **During Call:**
  - [ ] Audio works both ways
  - [ ] Mute button works
  - [ ] Speaker button works
  - [ ] End call button works
  - [ ] Call duration timer shows

### 8.2 Video Calls
- [ ] Tap video icon in chat
- [ ] Camera permission prompt (first time)
- [ ] Call initiates
- [ ] **During Call:**
  - [ ] Video displays both ways
  - [ ] Camera toggle works
  - [ ] Flip camera works
  - [ ] Mute audio works
  - [ ] End call works

### 8.3 Call Edge Cases
- [ ] Call when other user offline
- [ ] Call declined
- [ ] Call timeout (no answer)
- [ ] Network interruption during call

---

## 9. BUSINESSES

### 9.1 Business List
- [ ] Businesses screen loads
- [ ] List view shows businesses
- [ ] Map view shows pins
- [ ] Can switch between list/map
- [ ] Search works
- [ ] Category filter works

### 9.2 Business Details
- [ ] Tap business to view details
- [ ] Name displays
- [ ] Logo displays
- [ ] Description displays
- [ ] Address displays
- [ ] Phone number (tap to call)
- [ ] Website (tap to open)
- [ ] Delivery links work:
  - [ ] Uber Eats
  - [ ] Deliveroo
  - [ ] Just Eat
- [ ] "Get Directions" works

### 9.3 Business Submission
- [ ] "Add Business" button (if available)
- [ ] Form fields work
- [ ] Submission goes to pending

---

## 10. TALENT

### 10.1 Talent List
- [ ] Talent screen loads
- [ ] Profiles display
- [ ] Category filter works
- [ ] Search works

### 10.2 Talent Details
- [ ] Tap to view profile
- [ ] Name displays
- [ ] Avatar displays
- [ ] Category displays
- [ ] Bio displays
- [ ] Portfolio images load
- [ ] Social links work:
  - [ ] YouTube
  - [ ] Instagram
  - [ ] Spotify
  - [ ] TikTok

### 10.3 Talent Submission
- [ ] "Add Talent" button (if available)
- [ ] Form fields work
- [ ] Submission goes to pending

---

## 11. POLLS

### 11.1 Poll Display
- [ ] Polls screen loads
- [ ] Poll questions display
- [ ] Options display
- [ ] Vote counts show (after voting)

### 11.2 Voting
- [ ] Tap option to vote
- [ ] Vote registers
- [ ] Results update
- [ ] Cannot vote twice

### 11.3 Feature Suggestions
- [ ] Suggestion section loads
- [ ] Can upvote suggestions
- [ ] Can submit new suggestion (if available)

---

## 12. TOWNY AI (HELP)

### 12.1 Chat Interface
- [ ] Help screen loads
- [ ] Chat history displays
- [ ] Input field works

### 12.2 AI Responses
- [ ] Send message to Towny
- [ ] Response received
- [ ] Response is helpful/relevant
- [ ] Response is SFW (test with edge cases)

### 12.3 AI Features
- [ ] Ask about app features
- [ ] Ask for help navigating
- [ ] Request image generation (if enabled)
- [ ] Test inappropriate request (should be declined)

---

## 13. SETTINGS

### 13.1 Account Settings
- [ ] **Do Not Disturb:**
  - [ ] Toggle works
  - [ ] Notifications silenced when on
- [ ] **Change Location:**
  - [ ] Can change city
  - [ ] Can change zone
- [ ] **Change Password:**
  - [ ] Current password required
  - [ ] New password validation
  - [ ] Password changes successfully
- [ ] **Recovery Codes:**
  - [ ] Generate codes button
  - [ ] Codes display
  - [ ] Can copy codes
- [ ] **Blocked Users:**
  - [ ] List loads
  - [ ] Can unblock users

### 13.2 Legal & Support
- [ ] Privacy Policy opens
- [ ] Community Guidelines opens
- [ ] Guide opens
- [ ] "Send us an email" opens email client

### 13.3 Danger Zone
- [ ] **Delete Account:**
  - [ ] Confirmation required
  - [ ] 30-day grace period explained
  - [ ] Account scheduled for deletion
  - [ ] Deletion pending overlay shows
  - [ ] Can cancel deletion
- [ ] **Sign Out:**
  - [ ] Confirmation dialog
  - [ ] Signs out successfully
  - [ ] Returns to auth screen

---

## 14. NOTIFICATIONS

### 14.1 In-App Notifications
- [ ] Notification panel opens
- [ ] Notifications load
- [ ] Different types display correctly:
  - [ ] Like notification
  - [ ] Comment notification
  - [ ] Reply notification
  - [ ] Friend request
  - [ ] Chat message
- [ ] Tap notification navigates correctly
- [ ] Mark as read works

### 14.2 Push Notifications
- [ ] **When App Closed:**
  - [ ] Receive push for new message
  - [ ] Receive push for like
  - [ ] Receive push for comment
  - [ ] Tap opens correct screen
- [ ] **When App in Background:**
  - [ ] Same tests as above
- [ ] **Do Not Disturb:**
  - [ ] No notifications when enabled

---

## 15. MODERATION (Admin/Mod Only)

### 15.1 Admin Panel Access
- [ ] Admin panel accessible (admin/mod accounts)
- [ ] Not accessible for regular users

### 15.2 Tabs
- [ ] **Talent:** Pending talent applications
- [ ] **Business:** Pending business applications
- [ ] **Help:** Support chat transcripts
- [ ] **Polls:** Feature suggestions
- [ ] **Edits:** Showcase edit requests
- [ ] **AI Logs:** AI moderation decisions
- [ ] **Reports:** User reports
- [ ] **Blocks:** Block logs
- [ ] **Users:** User management
- [ ] **Logs:** Moderation action logs
- [ ] **Analytics:** App statistics

### 15.3 Moderation Actions
- [ ] **Delete Post:** Works, logged
- [ ] **Blur Post:** Works with reason, logged
- [ ] **Unblur Post:** Works, logged
- [ ] **Disable Comments:** Works, logged
- [ ] **Mute User:** Works, logged
- [ ] **Ban User:** Works, logged
- [ ] **Warn User:** Works, logged
- [ ] **Undo Action:** Reverts action, logged

### 15.4 Report Handling
- [ ] View report details
- [ ] Take action on report
- [ ] Dismiss report
- [ ] Report status updates

---

## 16. THEMES

### 16.1 Dark Theme (Default)
- [ ] Black background
- [ ] White text readable
- [ ] All elements visible

### 16.2 Light Theme
- [ ] Toggle to light mode (if available)
- [ ] White background
- [ ] Dark text readable
- [ ] All elements visible

### 16.3 Hippie Theme (Easter Egg)
- [ ] Tap logo 15 times
- [ ] Theme unlocks
- [ ] Animated background shows
- [ ] Can toggle on/off
- [ ] App still usable with theme

---

## 17. REPORTING & BLOCKING

### 17.1 Report Post
- [ ] 3-dot menu → Report
- [ ] Reason selection works
- [ ] Report submits
- [ ] Confirmation shown

### 17.2 Report Comment
- [ ] Long-press comment
- [ ] Reason selection works
- [ ] Report submits

### 17.3 Report User
- [ ] Profile → Report
- [ ] Reason selection works
- [ ] Report submits

### 17.4 Block User
- [ ] Block from post menu
- [ ] Block from profile
- [ ] Block from chat
- [ ] Blocked user's content hidden
- [ ] Cannot message blocked user
- [ ] Can unblock from settings

---

## 18. OFFLINE BEHAVIOR

### 18.1 Offline Mode
- [ ] Turn off internet
- [ ] App doesn't crash
- [ ] Cached content displays
- [ ] Offline indicator shows
- [ ] Actions queued (if implemented)

### 18.2 Reconnection
- [ ] Turn internet back on
- [ ] Content refreshes
- [ ] Queued actions complete

---

## 19. EDGE CASES & STRESS

### 19.1 Long Content
- [ ] Very long post title (test limit)
- [ ] Very long post body
- [ ] Very long comment
- [ ] Very long username (during signup)
- [ ] Very long bio

### 19.2 Special Characters
- [ ] Emojis in posts ✨🎉🔥
- [ ] Emojis in comments
- [ ] Emojis in chat
- [ ] Unicode characters
- [ ] HTML/script tags (should be escaped)

### 19.3 Rapid Actions
- [ ] Rapid like/unlike
- [ ] Rapid comment posting
- [ ] Rapid message sending
- [ ] Rapid navigation

### 19.4 Large Data
- [ ] Scroll through 100+ posts
- [ ] Chat with 100+ messages
- [ ] Profile with many posts
- [ ] Many notifications

### 19.5 Memory/Performance
- [ ] App doesn't slow down over time
- [ ] No memory leaks (check device memory)
- [ ] Images don't cause crashes
- [ ] Videos don't cause crashes

---

## 20. PERMISSIONS

### 20.1 Permission Prompts
- [ ] Camera permission prompt (first use)
- [ ] Microphone permission prompt
- [ ] Location permission prompt
- [ ] Notification permission prompt
- [ ] Photo library permission prompt

### 20.2 Permission Denied
- [ ] App handles camera denied gracefully
- [ ] App handles microphone denied gracefully
- [ ] App handles location denied gracefully
- [ ] App handles notifications denied gracefully

---

## 21. ERROR HANDLING

### 21.1 Network Errors
- [ ] Slow network shows loading states
- [ ] Failed requests show error messages
- [ ] Retry options available

### 21.2 Invalid Data
- [ ] Empty post title blocked
- [ ] Invalid password format blocked
- [ ] Duplicate username blocked

### 21.3 Server Errors
- [ ] 500 errors handled gracefully
- [ ] Timeout errors handled
- [ ] User-friendly error messages

---

## Test Results Summary

| Section | Pass | Fail | Notes |
|---------|------|------|-------|
| Onboarding | | | |
| Main Feed | | | |
| Posts | | | |
| Comments | | | |
| Profiles | | | |
| Friends | | | |
| Chat | | | |
| Calls | | | |
| Businesses | | | |
| Talent | | | |
| Polls | | | |
| Towny AI | | | |
| Settings | | | |
| Notifications | | | |
| Moderation | | | |
| Themes | | | |
| Reporting | | | |
| Offline | | | |
| Edge Cases | | | |
| Permissions | | | |
| Errors | | | |

---

## Critical Bugs Found

| Bug | Severity | Steps to Reproduce | Status |
|-----|----------|-------------------|--------|
| | | | |
| | | | |
| | | | |

---

## Notes

_Add any additional observations here_

