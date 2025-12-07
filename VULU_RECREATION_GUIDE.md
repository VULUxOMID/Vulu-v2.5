# 🚀 VULU Recreation Guide

## 🎯 First Step: Project Foundation Setup

The **first thing to do** when recreating Vulu is to set up the project foundation with Expo and Firebase. This creates the base infrastructure that everything else builds upon.

### Step 1: Initialize Expo Project (5 minutes)

```bash
# Create new Expo project with TypeScript
npx create-expo-app@latest vulu --template blank-typescript

# Navigate to project
cd vulu

# Install core dependencies
npm install expo-router react-native-safe-area-context react-native-screens
npm install @react-navigation/native @react-navigation/stack
npm install firebase
npm install @react-native-async-storage/async-storage
```

### Step 2: Configure Firebase Project (10 minutes)

1. **Create Firebase Project**
   - Go to [Firebase Console](https://console.firebase.google.com/)
   - Create new project: "vulu" (or your project name)
   - Enable Google Analytics (optional)

2. **Enable Firebase Services**
   - **Authentication**: Enable Email/Password, Google Sign-In, Apple Sign-In (iOS)
   - **Firestore Database**: Create database in production mode
   - **Storage**: Enable Cloud Storage
   - **Functions**: Enable Cloud Functions (for Agora tokens later)

3. **Get Firebase Config**
   - Project Settings → General → Your apps → Web app
   - Copy config object

4. **Create Firebase Config File**
   ```typescript
   // src/services/firebase.ts
   import { initializeApp } from 'firebase/app';
   import { getAuth, initializeAuth, getReactNativePersistence } from 'firebase/auth';
   import { getFirestore } from 'firebase/firestore';
   import { getStorage } from 'firebase/storage';
   import AsyncStorage from '@react-native-async-storage/async-storage';
   import { Platform } from 'react-native';

   const firebaseConfig = {
     apiKey: "YOUR_API_KEY",
     authDomain: "YOUR_AUTH_DOMAIN",
     projectId: "YOUR_PROJECT_ID",
     storageBucket: "YOUR_STORAGE_BUCKET",
     messagingSenderId: "YOUR_MESSAGING_SENDER_ID",
     appId: "YOUR_APP_ID"
   };

   const app = initializeApp(firebaseConfig);
   export const auth = Platform.OS === 'web' 
     ? getAuth(app)
     : initializeAuth(app, {
         persistence: getReactNativePersistence(AsyncStorage)
       });
   export const db = getFirestore(app);
   export const storage = getStorage(app);
   ```

### Step 3: Set Up Basic App Structure (5 minutes)

```bash
# Create folder structure
mkdir -p src/{screens,components,services,context,navigation,constants}
mkdir -p app/\(main\)
```

### Step 4: Configure app.json (3 minutes)

```json
{
  "expo": {
    "name": "VULU",
    "slug": "vulu",
    "version": "1.0.0",
    "orientation": "portrait",
    "userInterfaceStyle": "dark",
    "splash": {
      "backgroundColor": "#0F1115"
    },
    "ios": {
      "bundleIdentifier": "com.vulu.app",
      "usesAppleSignIn": true
    },
    "android": {
      "package": "com.vulu.app",
      "permissions": [
        "android.permission.CAMERA",
        "android.permission.RECORD_AUDIO"
      ]
    },
    "scheme": "vulu"
  }
}
```

### Step 5: Test Basic Setup (2 minutes)

```bash
# Start Expo
npx expo start

# Test in Expo Go app on your phone
```

**✅ You now have:**
- Expo project initialized
- Firebase connected
- Basic folder structure
- Dark mode configured

**🎯 Next Steps:**
1. Build authentication system
2. Create design system (colors, components)
3. Build navigation structure
4. Implement chat system
5. Add live streaming (Agora)

---

## 📋 Complete Recreation Prompt

Use this prompt with an AI coding assistant to recreate Vulu:

---

# VULU App Recreation Prompt

Create a complete social streaming mobile app called **VULU** using React Native, Expo, and Firebase. Follow this comprehensive specification:

## 🎯 App Overview

**VULU** is a social streaming app with real-time chat, direct messages, live audio rooms, and a Discord-style dark UI. Think of it as a combination of Discord + Clubhouse + Instagram Stories.

## 🏗️ Tech Stack

- **Frontend**: React Native with Expo (SDK 54+)
- **Backend**: Firebase (Auth, Firestore, Storage, Functions)
- **Streaming**: Agora.io for live audio/video
- **Navigation**: Expo Router with file-based routing
- **State Management**: React Context API
- **Styling**: React Native StyleSheet with custom design system

## 🎨 Design System

### Color Palette

**Backgrounds:**
- Primary Background: `#0F1115` (Eerie Black)
- Surface/Cards: `#1C1D23` (Charcoal)
- Elevated Surfaces: `#2D2E38` (Gunmetal)
- Alternative Surface: `#181A20` (Raisin Black)

**Brand Colors:**
- Primary Purple: `#6E69F4` (Medium Slate Blue) - CTAs, buttons, highlights
- Royal Blue: `#5865F2` - Live indicators, active states
- Gold: `#FFD700` - Premium badges
- Red: `#FF4B4B` - Errors, destructive actions
- Green: `#4CAF50` - Success messages
- Amber: `#FFC107` - Warnings

**Text:**
- Primary: `#FFFFFF` (White)
- Secondary: `#9BA3AF` (Silver Sand)
- Muted: `rgba(255,255,255,0.5)`

**Borders:**
- Subtle: `rgba(255,255,255,0.06)`
- Medium: `rgba(255,255,255,0.10)`
- Strong: `rgba(255,255,255,0.15)`

### Typography
- Headings: Bold, 16-24px
- Body: Regular, 14-16px
- Captions: Regular, 12-14px

### UI Patterns
- Discord-style rounded corners (8-12px)
- Subtle shadows and depth
- Smooth animations (200-300ms)
- Bottom sheet modals
- Swipe gestures

## 📱 Core Features

### 1. Authentication System
- **Email/Password** registration and login
- **Google Sign-In** (iOS & Android)
- **Apple Sign-In** (iOS only)
- **Guest Mode** (limited features)
- **Phone Number** verification (optional, via Twilio)
- Multi-step onboarding flow:
  1. Welcome landing screen
  2. Contact method selection
  3. Display name entry
  4. Account creation
  5. Date of birth

### 2. User Profiles
- Display name, avatar, bio
- Profile photos (upload to Firebase Storage)
- Customizable status
- Friend count, follower count
- Activity feed
- Settings screen

### 3. Real-Time Chat System
- **Global Chat**: Public channel for all users
- **Direct Messages**: One-on-one conversations
- **Message Features**:
  - Text messages with timestamps
  - Image attachments
  - Emoji reactions
  - Message replies/threads
  - Message editing (within time limit)
  - Message deletion (for me / for everyone)
  - Read receipts
  - Typing indicators
  - Message search
  - Pagination for message history

### 4. Friends System
- Send/receive friend requests
- Accept/decline requests
- Friend list with online status
- Unfriend functionality
- Friend activity feed
- Friend suggestions

### 5. Live Streaming (Agora Integration)
- **Audio Rooms**: Host or join live audio streams
- **Features**:
  - Create public/private rooms
  - Invite friends
  - Mute/unmute participants
  - Leave room
  - Participant list
  - Room discovery
  - Stream quality optimization
  - Network error handling

### 6. Home Feed
- Friend activity widgets
- Spotlight pills (featured content)
- Quick actions (start stream, join room)
- Global chat preview
- Friend status updates
- Music listening status
- Gaming status

### 7. Events System
- Create events (parties, meetups, streams)
- Event discovery
- RSVP functionality
- Event notifications
- Event chat

### 8. Notifications
- Push notifications (Expo Notifications)
- In-app notification center
- Friend request notifications
- Message notifications
- Stream invitations
- Event reminders

### 9. Admin Panel (Optional)
- User management
- Content moderation
- Analytics dashboard
- Admin logs
- User suspension/banning

## 🗂️ Project Structure

```
vulu/
├── app/
│   ├── (auth)/
│   │   ├── login.tsx
│   │   └── register.tsx
│   ├── (main)/
│   │   ├── index.tsx (Home)
│   │   ├── chat.tsx
│   │   ├── friends.tsx
│   │   ├── profile.tsx
│   │   └── admin.tsx
│   └── _layout.tsx
├── src/
│   ├── components/
│   │   ├── auth/
│   │   ├── chat/
│   │   ├── stream/
│   │   └── common/
│   ├── screens/
│   │   ├── auth/
│   │   ├── chat/
│   │   ├── stream/
│   │   └── profile/
│   ├── services/
│   │   ├── firebase.ts
│   │   ├── authService.ts
│   │   ├── messagingService.ts
│   │   ├── streamService.ts
│   │   └── agoraService.ts
│   ├── context/
│   │   ├── AuthContext.tsx
│   │   ├── ChatContext.tsx
│   │   └── StreamContext.tsx
│   ├── navigation/
│   │   └── AppNavigator.tsx
│   ├── constants/
│   │   ├── colors.ts
│   │   └── config.ts
│   └── types/
│       └── index.ts
├── firebase.json
├── firestore.rules
├── storage.rules
└── app.json
```

## 🔥 Firebase Setup

### Firestore Collections

**users/{userId}**
```typescript
{
  uid: string;
  email: string;
  displayName: string;
  photoURL?: string;
  bio?: string;
  createdAt: Timestamp;
  lastSeen: Timestamp;
  isOnline: boolean;
  friends: string[]; // Array of user IDs
  friendRequests: {
    sent: string[];
    received: string[];
  };
}
```

**conversations/{conversationId}**
```typescript
{
  id: string;
  participants: string[]; // User IDs
  lastMessage?: {
    text: string;
    timestamp: Timestamp;
    senderId: string;
  };
  lastMessageTime: Timestamp;
  createdAt: Timestamp;
  type: 'direct' | 'group';
}
```

**conversations/{conversationId}/messages/{messageId}**
```typescript
{
  id: string;
  text: string;
  senderId: string;
  timestamp: Timestamp;
  type: 'text' | 'image' | 'system';
  attachments?: string[]; // Storage URLs
  reactions?: { [emoji: string]: string[] }; // Emoji -> user IDs
  replyTo?: string; // Message ID
  editedAt?: Timestamp;
  isDeleted: boolean;
  deletedFor?: string[]; // User IDs
}
```

**streams/{streamId}**
```typescript
{
  id: string;
  hostId: string;
  title: string;
  isActive: boolean;
  startedAt: Timestamp;
  endedAt?: Timestamp;
  participants: string[]; // User IDs
  agoraChannelName: string;
  agoraToken?: string;
  isPrivate: boolean;
}
```

**globalChat/{messageId}**
```typescript
{
  id: string;
  text: string;
  senderId: string;
  senderName: string;
  senderAvatar?: string;
  timestamp: Timestamp;
  type: 'text' | 'image';
}
```

### Security Rules

```javascript
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    // Users can read their own data, others can read public fields
    match /users/{userId} {
      allow read: if request.auth != null;
      allow write: if request.auth != null && request.auth.uid == userId;
    }
    
    // Conversations
    match /conversations/{conversationId} {
      allow read, write: if request.auth != null && 
        request.auth.uid in resource.data.participants;
      
      match /messages/{messageId} {
        allow read: if request.auth != null && 
          request.auth.uid in get(/databases/$(database)/documents/conversations/$(conversationId)).data.participants;
        allow create: if request.auth != null && 
          request.auth.uid == request.resource.data.senderId;
        allow update, delete: if request.auth != null && 
          request.auth.uid == resource.data.senderId;
      }
    }
    
    // Streams
    match /streams/{streamId} {
      allow read: if request.auth != null;
      allow create: if request.auth != null && 
        request.auth.uid == request.resource.data.hostId;
      allow update: if request.auth != null && 
        (request.auth.uid == resource.data.hostId || 
         request.auth.uid in resource.data.participants);
    }
  }
}
```

## 🎯 Implementation Priority

### Phase 1: Foundation (Week 1)
1. ✅ Project setup (Expo + Firebase)
2. ✅ Authentication system
3. ✅ Basic navigation
4. ✅ Design system implementation
5. ✅ User profile creation/editing

### Phase 2: Core Features (Week 2-3)
1. ✅ Direct messaging system
2. ✅ Global chat
3. ✅ Friends system
4. ✅ Home feed
5. ✅ Notifications

### Phase 3: Advanced Features (Week 4-5)
1. ✅ Live streaming (Agora)
2. ✅ Events system
3. ✅ Message reactions/replies
4. ✅ Search functionality
5. ✅ Admin panel

### Phase 4: Polish (Week 6)
1. ✅ Performance optimization
2. ✅ Error handling
3. ✅ Offline support
4. ✅ Testing
5. ✅ App store preparation

## 📦 Required Dependencies

```json
{
  "dependencies": {
    "expo": "~54.0.0",
    "expo-router": "~6.0.0",
    "react": "19.1.0",
    "react-native": "0.81.5",
    "firebase": "^12.0.0",
    "@react-native-async-storage/async-storage": "^2.2.0",
    "react-native-agora": "^4.5.3",
    "@react-navigation/native": "^7.0.0",
    "expo-notifications": "~0.32.0",
    "expo-image-picker": "~17.0.0",
    "expo-av": "~16.0.0",
    "date-fns": "^4.1.0"
  }
}
```

## 🚀 Key Implementation Details

### Authentication Flow
- Use Firebase Auth with custom claims for admin roles
- Implement persistent auth state with AsyncStorage
- Handle token refresh automatically
- Support guest mode with limited features

### Real-Time Updates
- Use Firestore real-time listeners for messages
- Implement optimistic UI updates
- Handle offline/online state
- Cache messages locally

### Streaming
- Use Agora SDK for audio/video
- Generate tokens via Firebase Functions
- Handle network interruptions gracefully
- Optimize for mobile bandwidth

### Performance
- Implement message pagination
- Use FlatList virtualization
- Optimize image loading
- Cache user profiles
- Lazy load screens

## ✅ Success Criteria

The app is complete when:
- ✅ Users can register/login with multiple methods
- ✅ Users can send/receive messages in real-time
- ✅ Users can host/join live audio streams
- ✅ Friends system works end-to-end
- ✅ Notifications work reliably
- ✅ App handles errors gracefully
- ✅ UI matches Discord-style dark theme
- ✅ App performs well on iOS and Android

## 🎨 Design Inspiration

- **Discord**: Dark theme, chat UI, user profiles
- **Clubhouse**: Audio rooms, participant management
- **Instagram**: Stories, activity feed
- **Twitter**: Real-time updates, notifications

---

**Start with Phase 1 and build incrementally. Focus on getting authentication and basic chat working first, then add streaming and advanced features.**




