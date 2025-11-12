# Admin System Setup Guide

This guide will help you set up the admin system for your VuluGO app.

## 🎯 Overview

The admin system allows you to grant special privileges to specific users, giving them access to:
- Admin dashboard with app statistics
- User management tools
- Content moderation
- Admin activity logs
- System analytics

## 📋 Prerequisites

1. **Firebase Admin SDK Service Account Key**
   - Go to [Firebase Console](https://console.firebase.google.com/)
   - Select your project
   - Go to **Project Settings** > **Service Accounts**
   - Click **Generate New Private Key**
   - Save the downloaded JSON file as `serviceAccountKey.json` in your project root

2. **Node.js installed** (v14 or higher)

3. **Firebase Admin SDK package**
   ```bash
   npm install firebase-admin
   ```

## 🚀 Quick Start

### Step 1: Set Up Service Account Key

1. Download your service account key from Firebase Console (see Prerequisites)
2. Save it as `serviceAccountKey.json` in your project root
3. **IMPORTANT**: Add this file to `.gitignore` to keep it secure:
   ```bash
   echo "serviceAccountKey.json" >> .gitignore
   ```

### Step 2: Grant Admin Access to a User

Run the admin script to grant admin privileges to a user:

```bash
# Grant admin access to amin99@live.no
node scripts/setAdminClaim.js amin99@live.no

# Grant admin access with specific level
node scripts/setAdminClaim.js amin99@live.no super
```

**Admin Levels:**
- `super` - Full admin access (default)
- `moderator` - Content moderation access
- `support` - User support access

### Step 3: User Must Sign Out and Back In

**IMPORTANT**: After granting admin privileges, the user MUST:
1. Sign out of the app completely
2. Sign back in

This is required because Firebase custom claims are only loaded when the user's ID token is refreshed.

### Step 4: Access Admin Panel

Once the user signs back in:
1. Open the sidebar menu (hamburger icon)
2. Look for the **Admin** menu item (shield icon)
3. Tap to access the admin panel

## 📱 Admin Panel Features

### Dashboard Tab
- **Total Users**: Count of all registered users
- **Active Users**: Users active in the last 24 hours
- **Total Streams**: All streams created
- **Active Streams**: Currently live streams
- **Messages**: Total message count
- **Flagged Content**: Pending moderation items

### Users Tab
- User management (coming soon)
- Suspend/unsuspend users
- View user details

### Content Tab
- Content moderation (coming soon)
- Review flagged content
- Manage reports

### Logs Tab
- View all admin actions
- Track who did what and when
- Audit trail for security

## 🛠️ Admin Script Commands

### Grant Admin Access
```bash
node scripts/setAdminClaim.js <email> [adminLevel]
```

Examples:
```bash
node scripts/setAdminClaim.js amin99@live.no
node scripts/setAdminClaim.js user@example.com super
node scripts/setAdminClaim.js mod@example.com moderator
```

### Remove Admin Access
```bash
node scripts/setAdminClaim.js remove <email>
```

Example:
```bash
node scripts/setAdminClaim.js remove user@example.com
```

### List All Admins
```bash
node scripts/setAdminClaim.js list
```

## 🔒 Security Best Practices

### 1. Protect Service Account Key
- **NEVER** commit `serviceAccountKey.json` to version control
- Store it securely (use environment variables in production)
- Rotate keys periodically

### 2. Firestore Security Rules
The admin system uses custom claims for authorization. Update your Firestore rules:

```javascript
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    // Helper function to check if user is admin
    function isAdmin() {
      return request.auth != null && request.auth.token.admin == true;
    }
    
    // Admin-only collections
    match /adminLogs/{logId} {
      allow read, write: if isAdmin();
    }
    
    match /moderationReports/{reportId} {
      allow read, write: if isAdmin();
    }
    
    // Users collection - admins can read all
    match /users/{userId} {
      allow read: if isAdmin();
      allow write: if isOwner(userId) || isAdmin();
    }
  }
}
```

### 3. Admin Action Logging
All admin actions are automatically logged to Firestore:
- Who performed the action
- What action was performed
- When it happened
- Target user (if applicable)

### 4. Rate Limiting
Consider implementing rate limiting for admin actions in production.

## 🧪 Testing Admin Access

### Test if User is Admin
```typescript
import { adminService } from './src/services/adminService';

// Check if current user is admin
const isAdmin = await adminService.isAdmin();
console.log('Is admin:', isAdmin);

// Get admin level
const level = await adminService.getAdminLevel();
console.log('Admin level:', level);
```

### Test Admin Stats
```typescript
import { adminService } from './src/services/adminService';

const stats = await adminService.getAdminStats();
console.log('Admin stats:', stats);
```

## 🐛 Troubleshooting

### Admin Menu Not Showing
1. **Check if user signed out and back in** after granting admin access
2. Verify admin claim was set:
   ```bash
   node scripts/setAdminClaim.js list
   ```
3. Check console logs for admin status:
   ```
   👑 Admin user detected: user@example.com (super)
   ```

### "Access Denied" Error
1. User doesn't have admin privileges
2. User hasn't signed out and back in after being granted admin
3. Custom claims not properly set

### Service Account Key Error
```
Error: ENOENT: no such file or directory, open 'serviceAccountKey.json'
```
**Solution**: Download service account key from Firebase Console and save as `serviceAccountKey.json` in project root.

### Permission Denied in Firestore
**Solution**: Update Firestore security rules to allow admin access (see Security Best Practices section).

## 📚 API Reference

### adminService

#### `isAdmin(): Promise<boolean>`
Check if current user has admin privileges.

#### `getAdminLevel(): Promise<string | null>`
Get admin level (super, moderator, support).

#### `getAdminStats(): Promise<AdminStats>`
Get app statistics (requires admin access).

#### `logAdminAction(action, details, targetUid?, targetEmail?): Promise<void>`
Log an admin action.

#### `getAdminLogs(limit?): Promise<AdminLog[]>`
Get recent admin logs.

#### `suspendUser(userId, reason, duration?): Promise<void>`
Suspend a user account.

#### `unsuspendUser(userId): Promise<void>`
Unsuspend a user account.

#### `clearCache(): void`
Clear admin status cache (force refresh).

### AuthContext

#### `isAdmin: boolean`
True if current user has admin privileges.

#### `adminLevel: string | null`
Admin level (super, moderator, support) or null.

#### `refreshAdminStatus(): Promise<void>`
Force refresh admin status from Firebase.

## 🎨 Customization

### Add Custom Admin Actions
Edit `src/screens/AdminScreen.tsx` to add custom admin features.

### Modify Admin Levels
Edit `scripts/setAdminClaim.js` to add or modify admin levels.

### Customize Admin UI
The admin panel uses Discord-style theming. Modify colors in `src/screens/AdminScreen.tsx`.

## 📝 Next Steps

1. ✅ Set up service account key
2. ✅ Grant admin access to your account
3. ✅ Sign out and back in
4. ✅ Access admin panel
5. 🔄 Customize admin features for your needs
6. 🔄 Implement user management
7. 🔄 Add content moderation tools
8. 🔄 Set up admin notifications

## 🆘 Support

If you encounter issues:
1. Check the troubleshooting section
2. Review Firebase Console for errors
3. Check app console logs
4. Verify Firestore security rules

---

**Security Note**: Keep your service account key secure and never share it publicly!

