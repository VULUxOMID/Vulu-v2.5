# Admin Users Tab - Testing Guide

## 🧪 Testing Checklist

### ✅ Basic Functionality

#### 1. Tab Navigation
- [ ] Open Admin Panel
- [ ] Switch to Users tab
- [ ] Verify users load automatically
- [ ] Check loading spinner appears
- [ ] Verify users display after loading

#### 2. Search Functionality
- [ ] Type in search bar
- [ ] Verify debounce (500ms delay)
- [ ] Search by email
- [ ] Search by username
- [ ] Search by display name
- [ ] Clear search with ✕ button
- [ ] Verify results update correctly

#### 3. Filter Functionality
- [ ] Tap filter button to show filters
- [ ] Select different roles (All, Admin, Moderator, Support, Regular)
- [ ] Select different statuses (All, Active, Suspended)
- [ ] Select different plans (All, Free, Gem+, Premium, VIP)
- [ ] Verify active filters summary appears
- [ ] Remove filters using ✕ badges
- [ ] Combine multiple filters
- [ ] Verify results match filters

#### 4. User List Display
- [ ] Verify user cards show correctly
- [ ] Check avatar displays (photo or placeholder)
- [ ] Verify online status dot (green/gray)
- [ ] Check display name and email
- [ ] Verify admin badges show for admins
- [ ] Check suspended badges for suspended users
- [ ] Verify subscription badges (Gem+, Premium, VIP)
- [ ] Check stats row (gems, gold, level)

#### 5. Pagination
- [ ] Scroll to bottom of list
- [ ] Tap "Load More" button
- [ ] Verify loading spinner appears
- [ ] Check more users load
- [ ] Verify "Load More" disappears when no more users

#### 6. Pull to Refresh
- [ ] Pull down on user list
- [ ] Verify refresh spinner appears
- [ ] Check users reload
- [ ] Verify list updates

---

### ✅ User Detail Modal

#### 1. Opening Modal
- [ ] Tap any user card
- [ ] Verify modal slides up from bottom
- [ ] Check modal height (85% of screen)
- [ ] Verify gradient background

#### 2. Profile Section
- [ ] Check large avatar displays
- [ ] Verify online status dot
- [ ] Check display name
- [ ] Verify email
- [ ] Check username (if exists)
- [ ] Verify badges (admin, suspended, subscription)

#### 3. Stats Grid
- [ ] Check gems count
- [ ] Verify gold count
- [ ] Check level
- [ ] Verify friends count
- [ ] Check icons display correctly

#### 4. Account Information
- [ ] Verify created date
- [ ] Check last active time
- [ ] Verify status (online/offline/busy/idle)
- [ ] For suspended users:
  - [ ] Check "Suspended: Yes"
  - [ ] Verify suspension reason displays

#### 5. Closing Modal
- [ ] Tap ✕ button to close
- [ ] Tap outside modal to close
- [ ] Verify modal slides down smoothly

---

### ✅ Admin Actions

#### 1. Suspend User
- [ ] Open non-suspended user modal
- [ ] Tap "Suspend User" button
- [ ] Verify prompt appears for reason
- [ ] Enter suspension reason
- [ ] Tap "Suspend"
- [ ] Check loading overlay appears
- [ ] Verify success alert
- [ ] Check modal closes
- [ ] Verify user list reloads
- [ ] Open same user again
- [ ] Verify "SUSPENDED" badge appears
- [ ] Check suspension reason in account info

#### 2. Unsuspend User
- [ ] Open suspended user modal
- [ ] Tap "Unsuspend User" button
- [ ] Verify confirmation dialog
- [ ] Tap "Unsuspend"
- [ ] Check loading overlay appears
- [ ] Verify success alert
- [ ] Check modal closes
- [ ] Verify user list reloads
- [ ] Open same user again
- [ ] Verify "SUSPENDED" badge removed

#### 3. Reset Password
- [ ] Open any user modal
- [ ] Tap "Reset Password" button
- [ ] Verify confirmation dialog shows email
- [ ] Tap "Send"
- [ ] Check loading state
- [ ] Verify success alert
- [ ] Check Firebase sends email (check user's inbox)

#### 4. Force Sign Out
- [ ] Open any user modal
- [ ] Tap "Force Sign Out" button
- [ ] Verify confirmation dialog
- [ ] Tap "Sign Out"
- [ ] Check loading overlay appears
- [ ] Verify success alert
- [ ] Check modal closes
- [ ] Verify user list reloads
- [ ] Check user's session cleared (user forced to re-login)

#### 5. Change User Role (Super Admin Only)
- [ ] Login as super admin
- [ ] Open any user modal
- [ ] Scroll to "Change Role" section
- [ ] Verify current role highlighted
- [ ] Tap different role button
- [ ] Verify confirmation dialog
- [ ] Tap "Change"
- [ ] Check loading overlay appears
- [ ] Verify success alert
- [ ] Check modal closes
- [ ] Verify user list reloads
- [ ] Open same user again
- [ ] Verify new role badge appears

#### 6. Role Change Restrictions
- [ ] Login as moderator or support admin
- [ ] Open any user modal
- [ ] Verify "Change Role" section NOT visible
- [ ] Attempt to call updateUserRole directly
- [ ] Verify error: "Unauthorized: Super admin access required"

---

### ✅ Error Handling

#### 1. Network Errors
- [ ] Disable internet connection
- [ ] Try to load users
- [ ] Verify error alert appears
- [ ] Re-enable internet
- [ ] Pull to refresh
- [ ] Verify users load

#### 2. Permission Errors
- [ ] Login as non-admin user
- [ ] Try to access Admin Panel
- [ ] Verify "Access Denied" alert
- [ ] Check redirected back

#### 3. Invalid Actions
- [ ] Try to suspend already suspended user
- [ ] Try to unsuspend non-suspended user
- [ ] Try to change role of non-existent user
- [ ] Verify appropriate error messages

---

### ✅ Performance Testing

#### 1. Large User Lists
- [ ] Load users with 100+ results
- [ ] Verify pagination works smoothly
- [ ] Check scroll performance
- [ ] Verify no lag when filtering

#### 2. Search Performance
- [ ] Type rapidly in search bar
- [ ] Verify only one query after debounce
- [ ] Check results appear quickly
- [ ] Verify no duplicate queries

#### 3. Filter Performance
- [ ] Apply multiple filters rapidly
- [ ] Verify results update correctly
- [ ] Check no lag or freezing

---

### ✅ UI/UX Testing

#### 1. Responsive Design
- [ ] Test on small phone (iPhone SE)
- [ ] Test on medium phone (iPhone 14 Pro)
- [ ] Test on large phone (iPhone 14 Pro Max)
- [ ] Test in portrait orientation
- [ ] Test in landscape orientation
- [ ] Verify all elements visible and accessible

#### 2. Dark Theme Consistency
- [ ] Check all colors match Discord dark theme
- [ ] Verify gradients display correctly
- [ ] Check text contrast and readability
- [ ] Verify badges and icons visible

#### 3. Animations
- [ ] Check tab switch animation (fade + slide)
- [ ] Verify modal slide-up animation
- [ ] Check loading spinner animations
- [ ] Verify smooth transitions

#### 4. Touch Targets
- [ ] Verify all buttons ≥ 44x44 points
- [ ] Check tap feedback (opacity change)
- [ ] Verify no accidental taps

---

### ✅ Logging & Audit Trail

#### 1. Action Logging
- [ ] Perform suspend action
- [ ] Switch to Logs tab
- [ ] Verify "SUSPEND_USER" log appears
- [ ] Check log details include:
  - [ ] Admin email
  - [ ] Target user email
  - [ ] Suspension reason
  - [ ] Timestamp
- [ ] Tap log to view details
- [ ] Verify all info displayed

#### 2. All Actions Logged
- [ ] Suspend user → Check log
- [ ] Unsuspend user → Check log
- [ ] Reset password → Check log
- [ ] Force sign out → Check log
- [ ] Change role → Check log

---

### ✅ Edge Cases

#### 1. Empty States
- [ ] Search for non-existent user
- [ ] Verify "No users found" message
- [ ] Check helpful subtext
- [ ] Verify icon displays

#### 2. No Results After Filters
- [ ] Apply filters with no matches
- [ ] Verify empty state
- [ ] Clear filters
- [ ] Verify users reappear

#### 3. User with No Data
- [ ] View user with no avatar
- [ ] Check placeholder with initial
- [ ] View user with no username
- [ ] Verify username field hidden
- [ ] View user with no friends
- [ ] Check "0 Friends" displays

#### 4. Long Text Handling
- [ ] User with very long name
- [ ] Verify text truncates with ellipsis
- [ ] User with long email
- [ ] Check email truncates
- [ ] Long suspension reason
- [ ] Verify wraps correctly in modal

---

### ✅ Security Testing

#### 1. Admin Verification
- [ ] Logout and login as regular user
- [ ] Try to access Admin Panel
- [ ] Verify access denied
- [ ] Login as admin
- [ ] Verify access granted

#### 2. Super Admin Restrictions
- [ ] Login as moderator
- [ ] Open user modal
- [ ] Verify "Change Role" section hidden
- [ ] Login as super admin
- [ ] Verify "Change Role" section visible

#### 3. Confirmation Dialogs
- [ ] All destructive actions show confirmation
- [ ] Verify can cancel actions
- [ ] Check confirmations include user name/email

---

## 🎯 Test Scenarios

### Scenario 1: Find and Suspend Violating User
1. Open Admin Panel → Users tab
2. Search for user by email
3. Tap user card to open modal
4. Review account info and stats
5. Tap "Suspend User"
6. Enter reason: "Violating community guidelines"
7. Confirm suspension
8. Verify success and modal closes
9. Switch to Logs tab
10. Verify suspension logged

### Scenario 2: Promote User to Moderator
1. Login as super admin
2. Open Users tab
3. Filter by role: "Regular"
4. Find user to promote
5. Tap user card
6. Scroll to "Change Role"
7. Tap "Moderator"
8. Confirm change
9. Verify success
10. Check user now has moderator badge

### Scenario 3: Bulk User Review
1. Open Users tab
2. Filter by subscription: "VIP"
3. Review all VIP users
4. Check stats and activity
5. Filter by status: "Suspended"
6. Review suspended users
7. Unsuspend if appropriate
8. Verify all actions logged

---

## 📊 Expected Results

### Performance Benchmarks
- **Initial load**: < 2 seconds
- **Search results**: < 1 second after debounce
- **Filter application**: Instant (client-side)
- **Load more**: < 1 second
- **Modal open**: < 300ms animation
- **Action completion**: < 2 seconds

### Data Accuracy
- **User count**: Matches Firestore
- **Stats**: Accurate gems, gold, level
- **Status**: Real-time online/offline
- **Badges**: Correct admin level and subscription

---

## 🐛 Known Issues / Limitations

1. **Search**: Currently client-side after initial fetch (could be improved with Firestore full-text search)
2. **Real-time Updates**: User list doesn't auto-update when users change (requires manual refresh)
3. **Password Reset**: Uses Firebase email (requires Firebase email templates configured)
4. **Force Sign Out**: Requires user to attempt action to detect forced sign out

---

## ✅ Final Checklist

Before marking as complete:
- [ ] All basic functionality works
- [ ] All admin actions work
- [ ] All filters and search work
- [ ] All modals display correctly
- [ ] All actions are logged
- [ ] All permissions enforced
- [ ] All error cases handled
- [ ] All loading states work
- [ ] All animations smooth
- [ ] All text readable
- [ ] All touch targets adequate
- [ ] Works on all device sizes
- [ ] No console errors
- [ ] No TypeScript errors
- [ ] Documentation complete

---

## 🎉 Success Criteria

**The Admin Users Tab is complete when:**

✅ Admins can search and find any user
✅ Admins can filter users by role, status, and subscription
✅ Admins can view detailed user information
✅ Admins can suspend/unsuspend users
✅ Admins can reset user passwords
✅ Admins can force users to sign out
✅ Super admins can change user roles
✅ All actions are logged for audit trail
✅ All actions have confirmations
✅ All errors are handled gracefully
✅ UI is consistent with Discord dark theme
✅ Performance is smooth and responsive

**Ready for production!** 🚀

