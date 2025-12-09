/**
 * Firebase Admin SDK Script to Set Admin Custom Claims
 * 
 * This script grants admin privileges to a user by setting custom claims.
 * 
 * Usage:
 *   node scripts/setAdminClaim.js <email> [adminLevel]
 * 
 * Examples:
 *   node scripts/setAdminClaim.js amin99@live.no
 *   node scripts/setAdminClaim.js amin99@live.no super
 *   node scripts/setAdminClaim.js user@example.com moderator
 * 
 * Admin Levels:
 *   - super: Full admin access (default)
 *   - moderator: Content moderation access
 *   - support: User support access
 */

const admin = require('firebase-admin');
const path = require('path');

// Initialize Firebase Admin SDK
// You need to download your service account key from Firebase Console:
// Project Settings > Service Accounts > Generate New Private Key
const serviceAccountPath = path.join(__dirname, '../serviceAccountKey.json');

try {
  const serviceAccount = require(serviceAccountPath);
  
  admin.initializeApp({
    credential: admin.credential.cert(serviceAccount),
  });
  
  console.log('✅ Firebase Admin SDK initialized');
} catch (error) {
  console.error('❌ Error initializing Firebase Admin SDK');
  console.error('Make sure you have downloaded your service account key to:');
  console.error(`   ${serviceAccountPath}`);
  console.error('\nTo get your service account key:');
  console.error('1. Go to Firebase Console');
  console.error('2. Project Settings > Service Accounts');
  console.error('3. Click "Generate New Private Key"');
  console.error('4. Save the file as "serviceAccountKey.json" in the project root');
  process.exit(1);
}

/**
 * Set admin custom claim for a user
 */
async function setAdminClaim(email, adminLevel = 'super') {
  try {
    console.log(`\n🔍 Looking up user: ${email}`);
    
    // Get user by email
    const user = await admin.auth().getUserByEmail(email);
    console.log(`✅ Found user: ${user.uid}`);
    
    // Validate admin level
    const validLevels = ['super', 'moderator', 'support'];
    if (!validLevels.includes(adminLevel)) {
      console.warn(`⚠️  Invalid admin level "${adminLevel}". Using "super" instead.`);
      adminLevel = 'super';
    }
    
    // Set custom claims
    await admin.auth().setCustomUserClaims(user.uid, {
      admin: true,
      adminLevel: adminLevel,
    });
    
    console.log(`✅ Admin claim set successfully!`);
    console.log(`   User: ${email}`);
    console.log(`   UID: ${user.uid}`);
    console.log(`   Admin Level: ${adminLevel}`);
    console.log(`\n⚠️  IMPORTANT: The user must sign out and sign back in for the changes to take effect.`);
    
    // Update Firestore user document - ensure profile exists and is complete
    const db = admin.firestore();
    const userRef = db.collection('users').doc(user.uid);
    const existingDoc = await userRef.get();
    
    // Check if profile exists and has required fields (username and displayName)
    const existingData = existingDoc.exists ? existingDoc.data() : null;
    const hasCompleteProfile = existingData && existingData.username && existingData.displayName;
    
    if (!hasCompleteProfile) {
      console.log(`\n⚠️  Profile is missing or incomplete - creating/updating profile...`);
      
      // Generate username and displayName from email if missing
      const emailPrefix = email.split('@')[0];
      const defaultDisplayName = existingData?.displayName || user.displayName || emailPrefix.charAt(0).toUpperCase() + emailPrefix.slice(1);
      const defaultUsername = existingData?.username || emailPrefix.toLowerCase();
      
      // Create or update profile with required fields
      const profileData = {
        uid: user.uid,
        email: user.email || email,
        displayName: defaultDisplayName,
        username: defaultUsername,
        photoURL: user.photoURL || existingData?.photoURL,
        
        // Ensure required fields for app to load profile
        displayNameLower: defaultDisplayName.toLowerCase(),
        usernameLower: defaultUsername.toLowerCase(),
        emailLower: (user.email || email).toLowerCase(),
        
        // Currency balances
        gold: existingData?.gold || existingData?.currencyBalances?.gold || 0,
        gems: existingData?.gems || existingData?.currencyBalances?.gems || 0,
        currencyBalances: existingData?.currencyBalances || {
          gold: existingData?.gold || 0,
          gems: existingData?.gems || 0,
          lastUpdated: admin.firestore.FieldValue.serverTimestamp()
        },
        
        // Basic profile fields
        level: existingData?.level || 1,
        status: existingData?.status || 'online',
        isOnline: existingData?.isOnline !== undefined ? existingData.isOnline : true,
        lastActivity: existingData?.lastActivity || admin.firestore.FieldValue.serverTimestamp(),
        
        // Privacy settings
        allowFriendRequests: existingData?.allowFriendRequests !== undefined ? existingData.allowFriendRequests : true,
        allowMessagesFromStrangers: existingData?.allowMessagesFromStrangers !== undefined ? existingData.allowMessagesFromStrangers : false,
        showOnlineStatus: existingData?.showOnlineStatus !== undefined ? existingData.showOnlineStatus : true,
        
        // Friend system
        friends: existingData?.friends || [],
        blockedUsers: existingData?.blockedUsers || [],
        
        // Profile customization
        bio: existingData?.bio || '',
        customStatus: existingData?.customStatus || '',
        
        // Subscription
        subscriptionPlan: existingData?.subscriptionPlan || 'free',
        subscriptionStatus: existingData?.subscriptionStatus || 'expired',
        
        // Admin fields
        isAdmin: true,
        adminLevel: adminLevel,
        adminGrantedAt: admin.firestore.FieldValue.serverTimestamp(),
        
        // Timestamps
        createdAt: existingData?.createdAt || admin.firestore.FieldValue.serverTimestamp(),
        lastSeen: admin.firestore.FieldValue.serverTimestamp(),
      };
      
      await userRef.set(profileData, { merge: true });
      console.log(`✅ Profile created/updated with required fields:`);
      console.log(`   Username: ${defaultUsername}`);
      console.log(`   Display Name: ${defaultDisplayName}`);
    } else {
      // Profile exists, just update admin fields
      await userRef.set({
        isAdmin: true,
        adminLevel: adminLevel,
        adminGrantedAt: admin.firestore.FieldValue.serverTimestamp(),
      }, { merge: true });
      console.log(`✅ Firestore user document updated (profile already complete)`);
      console.log(`   Username: ${existingData.username}`);
      console.log(`   Display Name: ${existingData.displayName}`);
    }
    
  } catch (error) {
    console.error('❌ Error setting admin claim:', error.message);
    
    if (error.code === 'auth/user-not-found') {
      console.error(`\nUser with email "${email}" not found.`);
      console.error('Make sure the user has registered in your app first.');
    }
    
    throw error;
  }
}

/**
 * Remove admin custom claim from a user
 */
async function removeAdminClaim(email) {
  try {
    console.log(`\n🔍 Looking up user: ${email}`);
    
    // Get user by email
    const user = await admin.auth().getUserByEmail(email);
    console.log(`✅ Found user: ${user.uid}`);
    
    // Remove custom claims
    await admin.auth().setCustomUserClaims(user.uid, {
      admin: false,
      adminLevel: null,
    });
    
    console.log(`✅ Admin claim removed successfully!`);
    console.log(`   User: ${email}`);
    console.log(`   UID: ${user.uid}`);
    console.log(`\n⚠️  IMPORTANT: The user must sign out and sign back in for the changes to take effect.`);
    
    // Update Firestore user document
    const db = admin.firestore();
    const userRef = db.collection('users').doc(user.uid);
    
    await userRef.set({
      isAdmin: false,
      adminLevel: null,
      adminRemovedAt: admin.firestore.FieldValue.serverTimestamp(),
    }, { merge: true });
    
    console.log(`✅ Firestore user document updated`);
    
  } catch (error) {
    console.error('❌ Error removing admin claim:', error.message);
    throw error;
  }
}

/**
 * List all admin users
 */
async function listAdmins() {
  try {
    console.log(`\n🔍 Fetching all admin users...`);
    
    const db = admin.firestore();
    const adminsSnapshot = await db.collection('users')
      .where('isAdmin', '==', true)
      .get();
    
    if (adminsSnapshot.empty) {
      console.log('No admin users found.');
      return;
    }
    
    console.log(`\n✅ Found ${adminsSnapshot.size} admin user(s):\n`);
    
    adminsSnapshot.forEach((doc) => {
      const data = doc.data();
      console.log(`  • ${data.email || 'No email'}`);
      console.log(`    UID: ${doc.id}`);
      console.log(`    Level: ${data.adminLevel || 'Not set'}`);
      console.log(`    Display Name: ${data.displayName || 'Not set'}`);
      console.log('');
    });
    
  } catch (error) {
    console.error('❌ Error listing admins:', error.message);
    throw error;
  }
}

// Main execution
const args = process.argv.slice(2);
const command = args[0];

if (!command) {
  console.log('\n📋 Firebase Admin Claim Manager\n');
  console.log('Usage:');
  console.log('  Set admin:    node scripts/setAdminClaim.js <email> [adminLevel]');
  console.log('  Remove admin: node scripts/setAdminClaim.js remove <email>');
  console.log('  List admins:  node scripts/setAdminClaim.js list');
  console.log('\nExamples:');
  console.log('  node scripts/setAdminClaim.js amin99@live.no');
  console.log('  node scripts/setAdminClaim.js amin99@live.no super');
  console.log('  node scripts/setAdminClaim.js remove user@example.com');
  console.log('  node scripts/setAdminClaim.js list');
  console.log('\nAdmin Levels:');
  console.log('  - super: Full admin access (default)');
  console.log('  - moderator: Content moderation access');
  console.log('  - support: User support access\n');
  process.exit(0);
}

// Handle commands
(async () => {
  try {
    if (command === 'list') {
      await listAdmins();
    } else if (command === 'remove') {
      const email = args[1];
      if (!email) {
        console.error('❌ Error: Email is required');
        console.log('Usage: node scripts/setAdminClaim.js remove <email>');
        process.exit(1);
      }
      await removeAdminClaim(email);
    } else {
      // Assume first argument is email
      const email = command;
      const adminLevel = args[1] || 'super';
      await setAdminClaim(email, adminLevel);
    }
    
    console.log('\n✅ Operation completed successfully!\n');
    process.exit(0);
  } catch (error) {
    console.error('\n❌ Operation failed\n');
    process.exit(1);
  }
})();

