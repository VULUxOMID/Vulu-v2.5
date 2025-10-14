## VULU

A social streaming app with real-time chat, direct messages, and Discord-style dark UI. Built with React Native + Expo and Firebase.

### What you can do
- Create an account or continue as guest
- Join or host live audio rooms (dev build required for real audio)
- Chat in global channels and send direct messages
- Manage profiles; messaging shows consistent names/avatars

---

## Quick Start

### Prerequisites
- Node.js 18+
- npm or yarn


- Expo CLI

Install & run
1. Clone this repo
2. Install dependencies
   - npm install
3. Start the app (Expo Go)
   - npx expo start

For real audio streaming (dev client)
- Build dev clients (includes native SDKs)
  - eas build --profile development --platform ios
  - eas build --profile development --platform android
- Run with dev client
  - npx expo start --dev-client

---

## Firebase Setup (required)
- Create a Firebase project (Auth, Firestore, Storage)
- **Enable Auth providers**: Email/Password, Google, Apple (iOS)
- **Enable App Check**: Use reCAPTCHA v3 for production or Debug provider for development
- **Add config**: Place Firebase config in `src/services/firebase.ts` (avoid public/unsafe defaults)
- **Publish Security Rules**: Deploy rules from `firestore.rules` file before seeding test data
- **Create indexes**: Create necessary indexes when console prompts appear

Recommended indexes
- conversations/{conversationId}/messages: isDeleted (ASC), timestamp (DESC)
- conversations: participants (ARRAY), lastMessageTime (DESC)
- friendRequests: recipientId (ASC), status (ASC), createdAt (DESC)
- friendRequests: senderId (ASC), status (ASC), createdAt (DESC)
- streams: isActive (ASC), startedAt (ASC)
- streams: isActive (ASC), endedAt (ASC)

---

## Scripts
- npm start: start Expo
- npm run ios: iOS simulator
- npm run android: Android emulator
- npm run web: web preview

---

## Notes
- Expo Go uses mock audio; build a dev client for live audio
- Profile changes (name/avatar) sync across chats and conversations
- Input is sanitized; very long messages are limited

---

## Design System

### Color Palette

Our app uses a carefully curated dark theme with specific color roles for consistency across all components.

#### Brand & Primary Actions
<div align="left">
  <table>
    <tr>
      <td><div style="width: 20px; height: 20px; background-color: #6E69F4; border-radius: 3px; border: 1px solid #333;"></div></td>
      <td><code>#6E69F4</code></td>
      <td>Medium Slate Blue</td>
      <td>Add Friends, CTAs, FABs, pills, primary buttons</td>
    </tr>
  </table>
</div>

#### Status & Interactive Colors
<div align="left">
  <table>
    <tr>
      <td><div style="width: 20px; height: 20px; background-color: #5865F2; border-radius: 3px; border: 1px solid #333;"></div></td>
      <td><code>#5865F2</code></td>
      <td>Royal Blue</td>
      <td>Live "watching/active" highlight, info alerts</td>
    </tr>
    <tr>
      <td><div style="width: 20px; height: 20px; background-color: #FFD700; border-radius: 3px; border: 1px solid #333;"></div></td>
      <td><code>#FFD700</code></td>
      <td>Gold</td>
      <td>Premium/Gem+ badges, highlights</td>
    </tr>
    <tr>
      <td><div style="width: 20px; height: 20px; background-color: #FF4B4B; border-radius: 3px; border: 1px solid #333;"></div></td>
      <td><code>#FF4B4B</code></td>
      <td>Red Orange</td>
      <td>Error messages, destructive actions</td>
    </tr>
    <tr>
      <td><div style="width: 20px; height: 20px; background-color: #4CAF50; border-radius: 3px; border: 1px solid #333;"></div></td>
      <td><code>#4CAF50</code></td>
      <td>Emerald Green</td>
      <td>Success messages, confirmations</td>
    </tr>
    <tr>
      <td><div style="width: 20px; height: 20px; background-color: #FFC107; border-radius: 3px; border: 1px solid #333;"></div></td>
      <td><code>#FFC107</code></td>
      <td>Amber</td>
      <td>Warning messages, cautionary actions</td>
    </tr>
  </table>
</div>

#### Background Hierarchy
<div align="left">
  <table>
    <tr>
      <td><div style="width: 20px; height: 20px; background-color: #0F1115; border-radius: 3px; border: 1px solid #333;"></div></td>
      <td><code>#0F1115</code></td>
      <td>Eerie Black</td>
      <td>App background, main canvas</td>
    </tr>
    <tr>
      <td><div style="width: 20px; height: 20px; background-color: #1C1D23; border-radius: 3px; border: 1px solid #333;"></div></td>
      <td><code>#1C1D23</code></td>
      <td>Charcoal</td>
      <td>Surface elements, cards, modals</td>
    </tr>
    <tr>
      <td><div style="width: 20px; height: 20px; background-color: #181A20; border-radius: 3px; border: 1px solid #333;"></div></td>
      <td><code>#181A20</code></td>
      <td>Raisin Black</td>
      <td>Surface alternative, tabs, buttons</td>
    </tr>
    <tr>
      <td><div style="width: 20px; height: 20px; background-color: #2D2E38; border-radius: 3px; border: 1px solid #333;"></div></td>
      <td><code>#2D2E38</code></td>
      <td>Gunmetal</td>
      <td>Raised elements, elevated surfaces</td>
    </tr>
  </table>
</div>

#### Text Colors
<div align="left">
  <table>
    <tr>
      <td><div style="width: 20px; height: 20px; background-color: #FFFFFF; border-radius: 3px; border: 1px solid #333;"></div></td>
      <td><code>#FFFFFF</code></td>
      <td>White</td>
      <td>Primary text, headings, important content</td>
    </tr>
    <tr>
      <td><div style="width: 20px; height: 20px; background-color: #9BA3AF; border-radius: 3px; border: 1px solid #333;"></div></td>
      <td><code>#9BA3AF</code></td>
      <td>Silver Sand</td>
      <td>Secondary text, descriptions, metadata</td>
    </tr>
    <tr>
      <td><div style="width: 20px; height: 20px; background-color: rgba(255,255,255,0.5); border-radius: 3px; border: 1px solid #333;"></div></td>
      <td><code>rgba(255,255,255,0.5)</code></td>
      <td>White (50% opacity)</td>
      <td>Muted text, placeholders, disabled states</td>
    </tr>
    <tr>
      <td><div style="width: 20px; height: 20px; background-color: #0F1115; border-radius: 3px; border: 1px solid #333;"></div></td>
      <td><code>#0F1115</code></td>
      <td>Eerie Black</td>
      <td>Inverted text (on light backgrounds)</td>
    </tr>
  </table>
</div>

#### Border & Divider Colors
<div align="left">
  <table>
    <tr>
      <td><div style="width: 20px; height: 20px; background-color: rgba(255,255,255,0.06); border-radius: 3px; border: 1px solid #333;"></div></td>
      <td><code>rgba(255,255,255,0.06)</code></td>
      <td>White (6% opacity)</td>
      <td>Hairline borders, subtle separators</td>
    </tr>
    <tr>
      <td><div style="width: 20px; height: 20px; background-color: rgba(255,255,255,0.10); border-radius: 3px; border: 1px solid #333;"></div></td>
      <td><code>rgba(255,255,255,0.10)</code></td>
      <td>White (10% opacity)</td>
      <td>Subtle borders, card outlines</td>
    </tr>
    <tr>
      <td><div style="width: 20px; height: 20px; background-color: rgba(255,255,255,0.15); border-radius: 3px; border: 1px solid #333;"></div></td>
      <td><code>rgba(255,255,255,0.15)</code></td>
      <td>White (15% opacity)</td>
      <td>Strong borders, active states</td>
    </tr>
  </table>
</div>

#### Special Elements
<div align="left">
  <table>
    <tr>
      <td><div style="width: 20px; height: 20px; background-color: #6E69F4; border-radius: 3px; border: 1px solid #333;"></div></td>
      <td><code>#6E69F4</code></td>
      <td>Medium Slate Blue</td>
      <td>Avatar fallback (no photo), default avatars</td>
    </tr>
  </table>
</div>

### Usage Guidelines

- **Primary Purple (#6E69F4)**: Use for all primary actions, CTAs, and interactive elements
- **Background Hierarchy**: Maintain proper contrast with the 4-tier background system
- **Text Contrast**: Ensure sufficient contrast ratios for accessibility
- **Status Colors**: Use consistently for their intended purposes (error = red, success = green, etc.)

---

## Tech
- React Native, Expo
- Firebase (Auth, Firestore, Storage)
- Discord-style dark theme

---

## License
Licensed under the MIT License; see [LICENSE](LICENSE) for details.
