# Admin System - Quick Start Guide

## 🚀 Get Admin Access in 5 Minutes

### Step 1: Download Service Account Key (2 minutes)

1. Open [Firebase Console](https://console.firebase.google.com/)
2. Select your VuluGO project
3. Click the gear icon ⚙️ → **Project Settings**
4. Go to **Service Accounts** tab
5. Click **Generate New Private Key** button
6. Click **Generate Key** in the confirmation dialog
7. Save the downloaded JSON file as `serviceAccountKey.json` in your project root folder

**Important**: Keep this file secure! Never commit it to Git.

### Step 2: Install Dependencies (1 minute)

```bash
npm install firebase-admin
```

### Step 3: Grant Admin Access (1 minute)

```bash
# Grant yourself admin access
node scripts/setAdminClaim.js amin99@live.no super
```

You should see:
```
✅ Admin claim set successfully for amin99@live.no
   Admin Level: super
   User must sign out and sign back in for changes to take effect.
```

### Step 4: Sign Out and Back In (30 seconds)

**CRITICAL**: You MUST sign out and sign back in for the admin privileges to take effect!

1. Open your app
2. Go to Account/Settings
3. Tap **Sign Out**
4. Sign back in with `amin99@live.no`

### Step 5: Access Admin Panel (30 seconds)

1. Open the sidebar menu (hamburger icon)
2. Look for the **Admin** menu item with shield icon 🛡️
3. Tap it to open the admin panel
4. You're now an admin! 👑

## 🎯 What You'll See

### Admin Menu Item
When you open the sidebar, you'll see a new menu item at the bottom:
```
┌─────────────────┐
│  🏠  Home       │
│  📺  Streams    │
│  💬  Messages   │
│  👤  Account    │
│  🏆  Leaderboard│
│  🛍️  Shop       │
│  🛡️  Admin      │ ← NEW!
└─────────────────┘
```

### Admin Panel Tabs
The admin panel has 4 tabs:

#### 📊 Dashboard
- Total Users: 1,234
- Active Users: 567
- Total Streams: 890
- Active Streams: 12
- Messages: 45,678
- Flagged Content: 3

Quick Actions:
- Manage Users
- Review Reports
- Analytics
- Settings

#### 👥 Users
(Coming soon - user management interface)

#### 🚨 Content
(Coming soon - content moderation interface)

#### 📝 Logs
Recent admin actions:
```
USER_SUSPENDED
By: admin@example.com
Target: baduser@example.com
2 hours ago

CONTENT_FLAGGED
By: moderator@example.com
Target: post_12345
5 hours ago
```

## 🔧 Common Commands

### Grant Admin Access
```bash
# Super admin (full access)
node scripts/setAdminClaim.js user@example.com super

# Moderator (content moderation)
node scripts/setAdminClaim.js user@example.com moderator

# Support (user support)
node scripts/setAdminClaim.js user@example.com support
```

### Remove Admin Access
```bash
node scripts/setAdminClaim.js remove user@example.com
```

### List All Admins
```bash
node scripts/setAdminClaim.js list
```

## 🐛 Troubleshooting

### "Admin menu item not showing"
**Solution**: Sign out and sign back in. Admin privileges are stored in your auth token, which only refreshes when you sign in.

### "Access Denied" when opening admin panel
**Solution**: 
1. Verify you granted admin access: `node scripts/setAdminClaim.js list`
2. Make sure you signed out and back in
3. Check console logs for `👑 Admin user detected`

### "Cannot find module 'firebase-admin'"
**Solution**: Install it: `npm install firebase-admin`

### "ENOENT: no such file or directory, open 'serviceAccountKey.json'"
**Solution**: Download the service account key from Firebase Console (see Step 1)

### "Permission denied" in Firestore
**Solution**: Deploy the updated security rules:
```bash
firebase deploy --only firestore:rules
```

## 📱 Using the Admin Panel

### View Statistics
1. Open Admin panel
2. Tap **Dashboard** tab
3. View real-time app statistics

### View Admin Logs
1. Open Admin panel
2. Tap **Logs** tab
3. Scroll through recent admin actions

### Quick Actions
1. Open Admin panel
2. Tap **Dashboard** tab
3. Tap any quick action button:
   - **Manage Users** → User management (coming soon)
   - **Review Reports** → Content moderation (coming soon)
   - **Analytics** → Advanced analytics (coming soon)
   - **Settings** → Admin settings (coming soon)

## 🎨 Admin Levels Explained

### 🔴 Super Admin
- **Full access** to everything
- Can manage other admins
- Can suspend users
- Access to all statistics
- Can modify system settings

**Use for**: App owners, lead developers

### 🟡 Moderator
- Content moderation access
- Can review flagged content
- Can suspend users temporarily
- Limited statistics access

**Use for**: Community moderators, content reviewers

### 🟢 Support
- User support access
- Can view user details
- Can assist with issues
- Read-only statistics

**Use for**: Customer support team

## 🔒 Security Notes

1. **Never commit `serviceAccountKey.json`** to Git
2. **Keep admin credentials secure** - don't share them
3. **All admin actions are logged** - there's an audit trail
4. **Admin access can be revoked** anytime with the remove command
5. **Firestore rules enforce** admin permissions server-side

## 📚 Next Steps

After getting admin access:

1. ✅ Explore the admin dashboard
2. ✅ Check the admin logs
3. ✅ Deploy Firestore rules: `firebase deploy --only firestore:rules`
4. 📖 Read `ADMIN_SETUP.md` for detailed documentation
5. 🛠️ Customize admin features in `src/screens/AdminScreen.tsx`

## 🆘 Need More Help?

- **Detailed Setup**: See `ADMIN_SETUP.md`
- **Implementation Details**: See `ADMIN_IMPLEMENTATION_SUMMARY.md`
- **Code Reference**: Check `src/services/adminService.ts`

---

**That's it!** You should now have full admin access to your VuluGO app. 🎉

**Quick recap:**
1. ✅ Download service account key
2. ✅ Run: `node scripts/setAdminClaim.js amin99@live.no super`
3. ✅ Sign out and back in
4. ✅ Open sidebar → Tap Admin
5. ✅ Enjoy your admin powers! 👑

