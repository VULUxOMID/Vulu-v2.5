/**
 * Debug script to check friend requests in Firestore
 * Run this in the browser console or as a Node script
 */

// Instructions for use:
// 1. Open Firebase Console: https://console.firebase.google.com
// 2. Go to your project > Firestore Database
// 3. Check the following collections:
//    - friendRequests
//    - notifications
//    - friendships
//
// Or run this in the app's debug console:

const debugFriendRequests = async () => {
  console.log('🔍 Debugging Friend Requests...\n');
  
  // Get current user
  const currentUser = auth.currentUser;
  if (!currentUser) {
    console.error('❌ No user logged in');
    return;
  }
  
  console.log(`👤 Current User: ${currentUser.displayName} (${currentUser.uid})\n`);
  
  // Check friend requests collection
  console.log('📋 Checking friendRequests collection...');
  const friendRequestsRef = collection(db, 'friendRequests');
  
  // Check received requests
  const receivedQuery = query(
    friendRequestsRef,
    where('recipientId', '==', currentUser.uid),
    where('status', '==', 'pending')
  );
  
  const receivedSnapshot = await getDocs(receivedQuery);
  console.log(`📥 Received Requests: ${receivedSnapshot.size}`);
  receivedSnapshot.forEach(doc => {
    const data = doc.data();
    console.log(`  - From: ${data.senderName} (${data.senderId})`);
    console.log(`    Status: ${data.status}`);
    console.log(`    Created: ${data.createdAt?.toDate?.()}`);
  });
  
  // Check sent requests
  const sentQuery = query(
    friendRequestsRef,
    where('senderId', '==', currentUser.uid),
    where('status', '==', 'pending')
  );
  
  const sentSnapshot = await getDocs(sentQuery);
  console.log(`\n📤 Sent Requests: ${sentSnapshot.size}`);
  sentSnapshot.forEach(doc => {
    const data = doc.data();
    console.log(`  - To: ${data.recipientName} (${data.recipientId})`);
    console.log(`    Status: ${data.status}`);
    console.log(`    Created: ${data.createdAt?.toDate?.()}`);
  });
  
  // Check notifications
  console.log('\n🔔 Checking notifications collection...');
  const notificationsRef = collection(db, 'notifications');
  const notifQuery = query(
    notificationsRef,
    where('userId', '==', currentUser.uid),
    where('type', '==', 'friend_request')
  );
  
  const notifSnapshot = await getDocs(notifQuery);
  console.log(`📬 Friend Request Notifications: ${notifSnapshot.size}`);
  notifSnapshot.forEach(doc => {
    const data = doc.data();
    console.log(`  - From: ${data.data?.fromUserName}`);
    console.log(`    Read: ${data.read}`);
    console.log(`    Status: ${data.data?.status}`);
    console.log(`    Created: ${data.timestamp?.toDate?.()}`);
  });
  
  // Check friendships
  console.log('\n👥 Checking friendships collection...');
  const friendshipsRef = collection(db, 'friendships');
  const friendshipsQuery = query(
    friendshipsRef,
    where('userId', '==', currentUser.uid)
  );
  
  const friendshipsSnapshot = await getDocs(friendshipsQuery);
  console.log(`🤝 Friendships: ${friendshipsSnapshot.size}`);
  friendshipsSnapshot.forEach(doc => {
    const data = doc.data();
    console.log(`  - Friend: ${data.friendName} (${data.friendId})`);
    console.log(`    Created: ${data.createdAt?.toDate?.()}`);
  });
  
  console.log('\n✅ Debug complete!');
};

// Export for use in app
if (typeof window !== 'undefined') {
  window.debugFriendRequests = debugFriendRequests;
  console.log('💡 Run debugFriendRequests() in console to check friend requests');
}

// Manual check instructions
console.log(`
📝 MANUAL FIRESTORE CHECK INSTRUCTIONS:

1. Open Firebase Console: https://console.firebase.google.com
2. Select your project
3. Go to Firestore Database
4. Check these collections:

   📁 friendRequests
   ├─ Look for documents where:
   │  ├─ recipientId == YOUR_USER_ID
   │  └─ status == "pending"
   │
   └─ Expected fields:
      ├─ senderId: string
      ├─ senderName: string
      ├─ senderAvatar: string (optional)
      ├─ recipientId: string
      ├─ recipientName: string
      ├─ recipientAvatar: string (optional)
      ├─ status: "pending" | "accepted" | "declined" | "cancelled"
      ├─ createdAt: timestamp
      └─ message: string (optional)

   📁 notifications
   ├─ Look for documents where:
   │  ├─ userId == YOUR_USER_ID
   │  ├─ type == "friend_request"
   │  └─ read == false
   │
   └─ Expected fields:
      ├─ userId: string
      ├─ type: "friend_request"
      ├─ title: "New Friend Request"
      ├─ message: "{senderName} sent you a friend request"
      ├─ read: boolean
      ├─ timestamp: timestamp
      └─ data:
         ├─ fromUserId: string
         ├─ fromUserName: string
         ├─ fromUserAvatar: string (optional)
         ├─ mutualFriends: number
         └─ status: "pending"

   📁 friendships
   └─ Look for documents where:
      ├─ userId == YOUR_USER_ID
      └─ friendId == OTHER_USER_ID

5. If data exists but UI doesn't show it:
   - Check browser/app console for errors
   - Look for Firestore index errors
   - Verify user is logged in
   - Check that AddFriendsScreen is calling loadFriendRequests()

6. If data doesn't exist:
   - Verify sendFriendRequest() was called
   - Check for errors in sender's console
   - Verify Firebase rules allow writes to friendRequests and notifications

🔧 FIRESTORE INDEX REQUIREMENT:
If you see "index" errors in console, create this composite index:

Collection: friendRequests
Fields:
  - recipientId (Ascending)
  - status (Ascending)  
  - createdAt (Descending)

Also create:
Collection: friendRequests
Fields:
  - senderId (Ascending)
  - status (Ascending)
  - createdAt (Descending)

🔗 Quick link to create indexes:
https://console.firebase.google.com/project/YOUR_PROJECT_ID/firestore/indexes

`);

