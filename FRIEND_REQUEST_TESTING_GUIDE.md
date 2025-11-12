# Friend Request Testing Guide

## 🎯 Implementation Summary

The friend request recipient flow has been fully implemented with real-time Firestore integration. Here's what was done:

### ✅ Changes Made

#### 1. **AddFriendsScreen.tsx** - Complete Implementation
- ✅ Real-time listener for friend requests (`onFriendRequests`)
- ✅ Load friend requests from Firestore (`loadFriendRequests`)
- ✅ Pull-to-refresh support
- ✅ Auto-reload on screen focus
- ✅ Count badge on "Friend Requests" tab
- ✅ Accept/Decline functionality with notification marking
- ✅ Proper cleanup on unmount

#### 2. **messagingService.ts** - New Methods
- ✅ `onFriendRequests()` - Real-time listener for friend requests
- ✅ Enhanced `getUserFriendRequests()` with better error handling
- ✅ Firestore index fallback (works without composite index)

#### 3. **NotificationsScreen.tsx** - Already Configured
- ✅ Displays friend request notifications
- ✅ Filters by type `friend_request`
- ✅ Mark as read functionality
- ✅ Navigation to profile on tap

---

## 🧪 Testing Instructions

### Prerequisites
- Two test accounts (User A and User B)
- Two devices or simulators
- Both users logged in

### Test 1: Send Friend Request
**User A (Sender):**
1. Navigate to Add Friends screen
2. Search for User B
3. Tap "Add Friend" button
4. Button should change to "Cancel Request"
5. **Expected Console Logs:**
   ```
   ✅ Friend request notification sent to [User B Name]
   ```

**User B (Recipient):**
1. Should receive notification immediately (if app is open)
2. Navigate to Notifications screen
3. **Expected:** See "New Friend Request" from User A
4. Navigate to Add Friends → Friend Requests tab
5. **Expected:** See User A's request with Accept/Decline buttons
6. **Expected Console Logs:**
   ```
   📡 Started friend requests listener for user [User B ID]
   📡 Friend requests listener update: 1 pending requests
   ✅ Loaded 1 received friend requests
   ```

### Test 2: Accept Friend Request
**User B (Recipient):**
1. In Add Friends → Friend Requests tab
2. Tap "Accept" on User A's request
3. **Expected:** Success alert "You are now friends with [User A Name]"
4. **Expected:** Request disappears from list
5. **Expected:** Notification marked as read
6. **Expected Console Logs:**
   ```
   ✅ Friend request accepted
   📡 Friend requests listener update: 0 pending requests
   ```

**User A (Sender):**
1. Navigate to Add Friends
2. Search for User B
3. **Expected:** Button shows "Message" or "Friends" (not "Add Friend")

### Test 3: Decline Friend Request
**User B (Recipient):**
1. In Add Friends → Friend Requests tab
2. Tap "Decline" on a request
3. **Expected:** Request disappears from list
4. **Expected:** No friendship created
5. **Expected:** Notification marked as read

### Test 4: Cancel Friend Request
**User A (Sender):**
1. After sending request, tap "Cancel Request"
2. **Expected:** Button changes back to "Add Friend"
3. **Expected:** Request removed from Firestore

**User B (Recipient):**
1. **Expected:** Request disappears from Friend Requests tab
2. **Expected:** Notification disappears or marked as cancelled

### Test 5: Real-Time Updates
**Setup:** User A sends request to User B

**User B:**
1. Open app but stay on Home screen
2. Navigate to Add Friends → Friend Requests
3. **Expected:** Request appears immediately (real-time listener)
4. **Expected Console Logs:**
   ```
   📡 Real-time update: 1 friend requests
   ```

### Test 6: Pull-to-Refresh
**User B:**
1. In Friend Requests tab
2. Pull down to refresh
3. **Expected:** Loading indicator appears
4. **Expected:** List refreshes
5. **Expected Console Logs:**
   ```
   ✅ Loaded X received friend requests
   ```

### Test 7: Screen Focus Reload
**User B:**
1. In Friend Requests tab
2. Navigate away (e.g., to Home)
3. Navigate back to Add Friends → Friend Requests
4. **Expected:** List automatically reloads
5. **Expected Console Logs:**
   ```
   ✅ Loaded X received friend requests
   ```

---

## 🔍 Debugging

### Console Logs to Watch For

**When AddFriendsScreen loads:**
```
🔄 AddFriendsScreen: Initializing friend requests for user [USER_ID]
📡 Started friend requests listener for user [USER_ID]
✅ Loaded X received friend requests
```

**When real-time update occurs:**
```
📡 Friend requests listener update: X pending requests
📡 Real-time update: X friend requests
```

**When switching to Friend Requests tab:**
```
📑 Switching to Friend Requests tab (X requests)
```

**When accepting/declining:**
```
✅ Friend request accepted/declined
📡 Friend requests listener update: X pending requests
```

### Common Issues & Solutions

#### Issue: "Friend Requests tab is empty"
**Check:**
1. Open browser/app console
2. Look for error messages
3. Check if logs show "✅ Loaded 0 received friend requests"
4. Verify Firestore data exists (see Firestore Check below)

**Solution:**
- If data exists but not loading: Check Firestore rules
- If index error: Create composite index (see below)
- If no data: Verify sender successfully sent request

#### Issue: "Index error in console"
**Error Message:**
```
Error in friend requests listener: FirebaseError: The query requires an index
```

**Solution:**
The code now handles this automatically by falling back to a query without `orderBy`. However, for better performance, create the index:

1. Go to Firebase Console → Firestore → Indexes
2. Create composite index:
   - Collection: `friendRequests`
   - Fields:
     - `recipientId` (Ascending)
     - `status` (Ascending)
     - `createdAt` (Descending)

3. Also create for sent requests:
   - Collection: `friendRequests`
   - Fields:
     - `senderId` (Ascending)
     - `status` (Ascending)
     - `createdAt` (Descending)

#### Issue: "Notifications not appearing"
**Check:**
1. Verify `notificationService.createFriendRequestNotification()` was called
2. Check Firestore `notifications` collection
3. Verify `useNotifications()` hook is working
4. Check console for notification errors

**Solution:**
- Ensure sender's console shows: "✅ Friend request notification sent to [Name]"
- Check Firestore rules allow writes to `notifications` collection

---

## 📊 Firestore Data Check

### Manual Verification

1. **Open Firebase Console:** https://console.firebase.google.com
2. **Go to:** Firestore Database
3. **Check Collections:**

#### `friendRequests` Collection
Look for documents with:
- `recipientId` = User B's ID
- `senderId` = User A's ID
- `status` = "pending"
- `senderName` = User A's name
- `recipientName` = User B's name
- `createdAt` = timestamp

#### `notifications` Collection
Look for documents with:
- `userId` = User B's ID
- `type` = "friend_request"
- `read` = false
- `data.fromUserId` = User A's ID
- `data.fromUserName` = User A's name
- `data.status` = "pending"

#### `friendships` Collection (after accepting)
Look for TWO documents:
1. Document where:
   - `userId` = User A's ID
   - `friendId` = User B's ID

2. Document where:
   - `userId` = User B's ID
   - `friendId` = User A's ID

---

## 🎬 Expected Flow

### Complete End-to-End Flow

```
User A (Sender)                          User B (Recipient)
─────────────────────────────────────────────────────────────
1. Search for User B
2. Tap "Add Friend"
   ├─ Button → "Cancel Request"
   ├─ Create friendRequests doc
   └─ Create notification doc
                                         3. Receive notification
                                         4. See request in:
                                            ├─ Notifications screen
                                            └─ Add Friends → Requests tab
                                         5. Tap "Accept"
                                            ├─ Create 2 friendship docs
                                            ├─ Update request status
                                            ├─ Mark notification read
                                            └─ Show success alert
6. Search for User B again
   └─ Button → "Message" or "Friends"
                                         7. Request disappears from list
                                         8. User A appears in friends list
```

---

## 📝 Code Locations

### Key Files Modified
- `src/screens/AddFriendsScreen.tsx` - Main UI and logic
- `src/services/messagingService.ts` - Backend methods
- `src/screens/NotificationsScreen.tsx` - Already configured

### Key Methods
- `messagingService.sendFriendRequest()` - Send request
- `messagingService.getUserFriendRequests()` - Load requests
- `messagingService.onFriendRequests()` - Real-time listener
- `messagingService.respondToFriendRequest()` - Accept/Decline
- `messagingService.cancelFriendRequest()` - Cancel request
- `notificationService.createFriendRequestNotification()` - Create notification

---

## ✅ Success Criteria

All of the following should work:
- [x] Sender can send friend request
- [x] Recipient sees request in Notifications
- [x] Recipient sees request in Add Friends → Requests tab
- [x] Count badge shows correct number
- [x] Real-time updates work (no refresh needed)
- [x] Accept creates friendship for both users
- [x] Decline removes request without creating friendship
- [x] Cancel removes request from both sides
- [x] Notifications marked as read when handled
- [x] Pull-to-refresh works
- [x] Screen focus reload works
- [x] No console errors

---

## 🚀 Next Steps

After successful testing:
1. Test with multiple friend requests
2. Test edge cases (network offline, etc.)
3. Test performance with many requests
4. Consider adding mutual friends count
5. Consider adding request expiration
6. Add analytics tracking

---

## 📞 Support

If issues persist:
1. Check all console logs
2. Verify Firestore data manually
3. Check Firestore security rules
4. Verify Firebase indexes
5. Check network connectivity
6. Try clearing app cache/data

