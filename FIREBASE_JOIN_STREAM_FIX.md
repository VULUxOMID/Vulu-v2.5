# Firebase Join Stream Permission Fix

## Problem
When a viewer tries to join a live stream created by another user, they get a permission error:
```
FirebaseError: Missing or insufficient permissions
code: 'permission-denied'
```

## Root Cause
The Firestore security rules required users to already exist in the `participants` subcollection before they could update the stream document. However, when joining, users need to update the stream document to add themselves to the participants array first - creating a "chicken and egg" problem.

## Solution
Updated the Firestore security rules to allow authenticated users to add themselves to the participants array when joining a stream, with the following restrictions:

1. **User must be adding themselves** - Their user ID must be in the new participants array
2. **Cannot remove other participants** - The new participants array must be the same size or larger
3. **Cannot modify critical fields** - Host ID, isActive status, and title cannot be changed
4. **Stream must be active** - Users can only join active streams

## Updated Rules
The fix is in `firestore.rules` at lines 379-401. The new rule allows authenticated users to update the stream document if they're adding themselves to the participants array.

## Deployment
**IMPORTANT:** You must deploy the updated rules to Firebase for this fix to work.

### Option 1: Firebase Console (Easiest)
1. Open: https://console.firebase.google.com/project/vulugo/firestore/rules
2. Copy the entire contents of `firestore.rules`
3. Paste into the Firebase Console rules editor
4. Click "Publish"

### Option 2: Firebase CLI
```bash
firebase deploy --only firestore:rules
```

## Testing
After deploying:
1. Create a stream on one device/account
2. Join the stream from another device/account
3. Should successfully join without permission errors

## Security
The fix maintains security by:
- Only allowing users to add themselves (not others)
- Preventing removal of other participants
- Preventing modification of critical stream properties
- Requiring authentication
- Only allowing joins to active streams

