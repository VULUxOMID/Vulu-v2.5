# Profile Screen - Testing Guide

## 🧪 Complete Testing Checklist

### Prerequisites
- [ ] Firebase project configured
- [ ] Firebase Storage enabled
- [ ] Firestore database set up
- [ ] User authenticated (not guest)
- [ ] Internet connection active

---

## 1. Photo Upload Testing

### Test 1.1: Camera Photo Upload
**Steps:**
1. Navigate to Profile Screen
2. Tap the [+] Add Photo button
3. Select "Take Photo"
4. Grant camera permission if prompted
5. Take a photo
6. Crop/edit if needed
7. Confirm

**Expected Results:**
- ✅ Camera permission prompt appears
- ✅ Camera opens with 1:1 aspect ratio guide
- ✅ Upload progress overlay appears
- ✅ Progress bar animates from 0% to 100%
- ✅ Photo appears in grid
- ✅ Photo is uploaded to Firebase Storage
- ✅ Firestore user document updated with photo URL
- ✅ If first photo, becomes profile image

**Verify in Firebase Console:**
```
Storage: /users/{userId}/photos/photo_{timestamp}.jpg
Firestore: users/{userId}/photos array updated
```

---

### Test 1.2: Gallery Photo Upload
**Steps:**
1. Navigate to Profile Screen
2. Tap the [+] Add Photo button
3. Select "Choose from Library"
4. Grant photo library permission if prompted
5. Select a photo
6. Crop/edit if needed
7. Confirm

**Expected Results:**
- ✅ Photo library permission prompt appears
- ✅ Photo picker opens
- ✅ Upload progress overlay appears
- ✅ Progress bar animates smoothly
- ✅ Photo appears in grid
- ✅ Photo uploaded to Firebase Storage
- ✅ Firestore updated

---

### Test 1.3: Permission Denial
**Steps:**
1. Deny camera/library permission
2. Try to upload photo

**Expected Results:**
- ✅ Alert appears: "Permission Required"
- ✅ Clear message explaining why permission is needed
- ✅ No crash or error
- ✅ User can try again

---

### Test 1.4: Upload Failure
**Steps:**
1. Turn off internet
2. Try to upload photo

**Expected Results:**
- ✅ Upload progress starts
- ✅ Error alert appears: "Failed to upload photo"
- ✅ Progress overlay dismisses
- ✅ Photo not added to grid
- ✅ No partial data in Firestore

---

### Test 1.5: Photo Reordering
**Steps:**
1. Upload multiple photos (3-5)
2. Long press on a photo
3. Drag to new position
4. Release

**Expected Results:**
- ✅ Haptic feedback on long press
- ✅ Photo lifts with shadow
- ✅ Other photos shift to make space
- ✅ Photo drops in new position
- ✅ After 1 second, Firestore updated with new order
- ✅ First photo remains profile image

---

## 2. Status Update Testing

### Test 2.1: Change Status
**Steps:**
1. Navigate to Profile Screen
2. Tap current status button (e.g., "😊 Happy")
3. Select a different status (e.g., "🎉 Excited")

**Expected Results:**
- ✅ Status selector modal opens
- ✅ Current status highlighted
- ✅ Tap new status
- ✅ Modal closes
- ✅ Toast appears: "Status updated to Excited"
- ✅ Toast auto-dismisses after 2.5 seconds
- ✅ Status button shows new emoji and text
- ✅ Firestore updated with customStatus
- ✅ Presence service updated

**Verify in Firebase Console:**
```
Firestore: users/{userId}
  - customStatus: "excited"
  - statusVisibility: "everyone" or "close_friends"
  - lastStatusUpdate: Timestamp
```

---

### Test 2.2: Close Friends Only Status
**Steps:**
1. Toggle "Close Friends Only" switch ON
2. Change status to a mood (e.g., "😢 Sad")

**Expected Results:**
- ✅ Status updates
- ✅ Toast appears
- ✅ Firestore statusVisibility: "close_friends"

---

### Test 2.3: Guest User Restriction
**Steps:**
1. Sign in as guest
2. Try to change status

**Expected Results:**
- ✅ Status button disabled or shows upgrade prompt
- ✅ Cannot open status selector
- ✅ Clear message about guest limitations

---

## 3. Notification Badge Testing

### Test 3.1: Badge Display
**Steps:**
1. Have unread notifications (friend requests, messages, etc.)
2. Navigate to Profile Screen
3. Look at Account button

**Expected Results:**
- ✅ Red badge appears on Account button
- ✅ Badge shows correct count (e.g., "5")
- ✅ If count > 99, shows "99+"
- ✅ Badge positioned top-right of icon

---

### Test 3.2: Badge Updates
**Steps:**
1. Note current badge count
2. Mark a notification as read
3. Return to Profile Screen

**Expected Results:**
- ✅ Badge count decreases
- ✅ If count reaches 0, badge disappears

---

## 4. Subscription Card Testing

### Test 4.1: Free Plan Display
**Steps:**
1. Have a free plan account
2. Navigate to Profile Screen
3. View subscription card

**Expected Results:**
- ✅ Shows "Free Plan"
- ✅ Shows current gem count
- ✅ Shows "Upgrade for gems"
- ✅ Button says "Upgrade Now"

---

### Test 4.2: Active Subscription Display
**Steps:**
1. Have an active subscription (Gem+, Premium, or VIP)
2. Navigate to Profile Screen
3. View subscription card

**Expected Results:**
- ✅ Shows correct plan name
- ✅ Shows active badge
- ✅ Shows daily gems (e.g., "10/day")
- ✅ Shows days until renewal (e.g., "30d")
- ✅ Button says "Manage Subscription"

---

### Test 4.3: Manage Button Navigation
**Steps:**
1. Tap "Manage Subscription" button

**Expected Results:**
- ✅ Navigates to /(main)/subscription
- ✅ Subscription screen opens
- ✅ Can navigate back to profile

---

## 5. Friends Modal Testing

### Test 5.1: Open Friends List
**Steps:**
1. Navigate to Profile Screen
2. Tap "Your Friends" section

**Expected Results:**
- ✅ Friends modal slides up
- ✅ Shows all friends from Firebase
- ✅ Each friend shows:
  - Avatar image
  - Display name
  - Online/offline status dot
  - Message button

---

### Test 5.2: Search Friends
**Steps:**
1. Open friends modal
2. Type in search bar (e.g., "John")

**Expected Results:**
- ✅ List filters in real-time
- ✅ Shows matching friends only
- ✅ Case-insensitive search
- ✅ If no matches, shows "No friends found"

---

### Test 5.3: Message Friend
**Steps:**
1. Open friends modal
2. Tap message button on a friend

**Expected Results:**
- ✅ Friends modal closes
- ✅ Navigates to chat screen
- ✅ Chat opens with selected friend
- ✅ Friend's name and avatar passed correctly

---

## 6. Performance Testing

### Test 6.1: Upload Performance
**Steps:**
1. Upload a large photo (5-10 MB)
2. Monitor progress

**Expected Results:**
- ✅ Upload completes within 10 seconds (on good connection)
- ✅ Progress bar updates smoothly
- ✅ No UI freezing
- ✅ No memory leaks

---

### Test 6.2: Scroll Performance
**Steps:**
1. Upload 10+ photos
2. Scroll through profile screen

**Expected Results:**
- ✅ Smooth 60 FPS scrolling
- ✅ Images load quickly
- ✅ No lag or stuttering

---

### Test 6.3: Friends List Performance
**Steps:**
1. Have 50+ friends
2. Open friends modal
3. Scroll through list
4. Search for friends

**Expected Results:**
- ✅ List loads quickly (< 1 second)
- ✅ Smooth scrolling
- ✅ Search filters instantly
- ✅ No performance degradation

---

## 7. Edge Cases Testing

### Test 7.1: No Internet Connection
**Steps:**
1. Turn off WiFi and cellular data
2. Try to upload photo
3. Try to change status

**Expected Results:**
- ✅ Clear error messages
- ✅ No crashes
- ✅ Graceful degradation

---

### Test 7.2: Slow Connection
**Steps:**
1. Enable network throttling (slow 3G)
2. Upload photo

**Expected Results:**
- ✅ Upload takes longer but completes
- ✅ Progress bar shows accurate progress
- ✅ User can cancel if needed

---

### Test 7.3: Maximum Photos
**Steps:**
1. Upload 10 photos (or app limit)
2. Try to upload another

**Expected Results:**
- ✅ Alert: "Maximum photos reached"
- ✅ Cannot add more photos
- ✅ Can delete existing photos to add new ones

---

### Test 7.4: Empty States
**Steps:**
1. New user with no photos
2. No friends
3. Free plan

**Expected Results:**
- ✅ Profile shows default avatar
- ✅ Friends section shows 0 friends
- ✅ Subscription shows "Free Plan"
- ✅ All empty states have helpful messages

---

## 8. Cross-Platform Testing

### iOS Testing
- [ ] iPhone SE (small screen)
- [ ] iPhone 14 Pro (medium screen)
- [ ] iPhone 14 Pro Max (large screen)
- [ ] iPad (tablet)

### Android Testing
- [ ] Small phone (< 5.5")
- [ ] Medium phone (5.5" - 6.5")
- [ ] Large phone (> 6.5")
- [ ] Tablet

### Orientation Testing
- [ ] Portrait mode
- [ ] Landscape mode
- [ ] Rotation during upload
- [ ] Rotation during modal open

---

## 9. Accessibility Testing

### Test 9.1: Touch Targets
**Steps:**
1. Tap all buttons with finger
2. Verify minimum 44x44 points

**Expected Results:**
- ✅ All buttons easily tappable
- ✅ No accidental taps
- ✅ Comfortable spacing

---

### Test 9.2: Color Contrast
**Steps:**
1. Check all text against backgrounds
2. Use contrast checker tool

**Expected Results:**
- ✅ All text meets WCAG AA standards
- ✅ Icons clearly visible
- ✅ Status indicators distinguishable

---

## 10. Security Testing

### Test 10.1: Guest User Restrictions
**Steps:**
1. Sign in as guest
2. Try to upload photos
3. Try to change status
4. Try to view friends

**Expected Results:**
- ✅ Photo upload blocked
- ✅ Status change blocked
- ✅ Friends section hidden
- ✅ Clear upgrade prompts

---

### Test 10.2: Firebase Rules
**Steps:**
1. Try to upload to another user's folder
2. Try to modify another user's photos

**Expected Results:**
- ✅ Blocked by Firebase Security Rules
- ✅ Error handled gracefully
- ✅ No data leakage

---

## ✅ Final Checklist

Before marking as complete, verify:

- [ ] All photo upload methods work
- [ ] Status updates persist to Firestore
- [ ] Toast notifications appear and dismiss
- [ ] Notification badges show correct counts
- [ ] Subscription card displays correctly
- [ ] Manage button navigates properly
- [ ] Friends modal shows real data
- [ ] Search filters friends correctly
- [ ] Message button navigates to chat
- [ ] Upload progress displays accurately
- [ ] All permissions handled correctly
- [ ] All errors handled gracefully
- [ ] Guest restrictions enforced
- [ ] No TypeScript errors
- [ ] No console errors
- [ ] Performance is smooth (60 FPS)
- [ ] Works on iOS and Android
- [ ] Works in portrait and landscape
- [ ] Accessibility standards met
- [ ] Firebase Security Rules enforced

---

## 🐛 Bug Reporting Template

If you find a bug, report it with:

```
**Bug Title:** [Brief description]

**Steps to Reproduce:**
1. 
2. 
3. 

**Expected Behavior:**
[What should happen]

**Actual Behavior:**
[What actually happens]

**Device Info:**
- Device: [iPhone 14 Pro, etc.]
- OS: [iOS 17.0, etc.]
- App Version: [2.6, etc.]

**Screenshots/Videos:**
[Attach if available]

**Console Logs:**
[Paste relevant logs]
```

---

## 📊 Test Results Summary

After completing all tests, fill out:

| Test Category | Pass | Fail | Notes |
|--------------|------|------|-------|
| Photo Upload | ☐ | ☐ | |
| Status Updates | ☐ | ☐ | |
| Notifications | ☐ | ☐ | |
| Subscription | ☐ | ☐ | |
| Friends Modal | ☐ | ☐ | |
| Performance | ☐ | ☐ | |
| Edge Cases | ☐ | ☐ | |
| Cross-Platform | ☐ | ☐ | |
| Accessibility | ☐ | ☐ | |
| Security | ☐ | ☐ | |

**Overall Status:** ☐ PASS ☐ FAIL

**Tester:** _______________
**Date:** _______________
**Signature:** _______________

---

## 🚀 Ready for Production?

Once all tests pass:
- [ ] Code reviewed
- [ ] All tests passing
- [ ] Performance benchmarks met
- [ ] Security audit complete
- [ ] Documentation updated
- [ ] Changelog updated
- [ ] Version bumped
- [ ] Ready to deploy! 🎉

