# Event System Deployment Checklist

## Pre-Deployment

- [ ] Review all code changes in:
  - `src/types/event.ts`
  - `src/services/eventService.ts`
  - `functions/src/events/enterEvent.ts`
  - `functions/src/events/manageEventCycles.ts`
  - `functions/src/events/getServerTime.ts`
  - `functions/src/events/index.ts`
  - `functions/src/index.ts`
  - `src/screens/HomeScreen.tsx`
  - `firestore.rules`

- [ ] Verify Firebase project is on **Blaze plan** (required for Pub/Sub scheduled functions)

- [ ] Ensure `expo-crypto` is installed (already in package.json)

## Deployment Steps

### 1. Build and Deploy Cloud Functions

```bash
cd functions
npm install
npm run build
firebase deploy --only functions:enterEvent,manageEventCycles,getServerTime
```

**Expected output:**
```
✔  functions[enterEvent(us-central1)] Successful create operation.
✔  functions[manageEventCycles(us-central1)] Successful create operation.
✔  functions[getServerTime(us-central1)] Successful create operation.
```

- [ ] Cloud Functions deployed successfully
- [ ] No errors in deployment logs

### 2. Deploy Firestore Security Rules

```bash
firebase deploy --only firestore:rules
```

**Expected output:**
```
✔  firestore: released rules firestore.rules to cloud.firestore
```

- [ ] Security rules deployed successfully
- [ ] Verify rules in Firebase Console

### 3. Verify Cloud Scheduler

```bash
firebase functions:list
```

**Check for:**
- `manageEventCycles` with schedule: `every 3 minutes`

- [ ] Scheduler is configured
- [ ] Scheduler is enabled in Cloud Scheduler console

### 4. Initialize First Event (Optional)

The scheduler will create the first event automatically on its first run. To manually initialize:

**Firestore Console:**
1. Go to `globalEvents` collection
2. Create document with ID: `current`
3. Add fields:
   ```
   eventId: "event_initial_cycle_0"
   cycleNumber: 0
   startTime: <current timestamp>
   endTime: <current timestamp + 3 minutes>
   entryCost: 100
   totalEntries: 0
   prizePool: 0
   status: "active"
   ```

- [ ] First event created (manually or automatically)

## Post-Deployment Testing

### 1. Monitor Cloud Function Logs

```bash
# Watch all event functions
firebase functions:log --only enterEvent,manageEventCycles,getServerTime

# Or watch specific function
firebase functions:log --only manageEventCycles
```

- [ ] Logs show successful function invocations
- [ ] No errors in logs

### 2. Test Event Entry Flow

1. Open app on test device/emulator
2. Navigate to HomeScreen
3. Verify event widget appears with countdown
4. Tap "Enter" button
5. Confirm gold is deducted (100 gold)
6. Check Firestore Console:
   - `globalEvents/current` → `totalEntries` incremented
   - `globalEvents/current/entries/{userId}` → entry document created

- [ ] Event widget displays correctly
- [ ] Countdown timer is accurate
- [ ] Entry button works
- [ ] Gold is deducted
- [ ] Entry document created in Firestore
- [ ] No duplicate entries on double-tap

### 3. Test Event Cycle Completion

Wait for event to expire (3 minutes in staging):

1. Monitor logs for cycle completion
2. Check Firestore:
   - `globalEvents/current` → new event with incremented `cycleNumber`
   - `globalEvents/history/events/{eventId}` → previous event archived
3. If there were entries, verify winner was selected and prize awarded

- [ ] Event cycle completes automatically
- [ ] New event is created
- [ ] Previous event is archived
- [ ] Winner is selected (if entries exist)
- [ ] Prize is awarded to winner

### 4. Test Server Time Synchronization

1. Open app on multiple devices
2. Verify all devices show same countdown time (within 1 second)
3. Check console logs for server time offset calculation

- [ ] Server time offset calculated on app start
- [ ] All devices show synchronized countdown

### 5. Test Error Handling

**Insufficient Gold:**
1. Reduce user's gold balance to < 100
2. Try to enter event
3. Verify error message: "You need 100 gold to enter"

- [ ] Insufficient gold error handled correctly

**Already Entered:**
1. Enter event successfully
2. Try to enter again
3. Verify error message: "You have already entered this event"

- [ ] Duplicate entry prevented

**Event Expired:**
1. Wait for event to expire (countdown = 0)
2. Try to enter
3. Verify error message: "This event has ended"

- [ ] Expired event entry prevented

## Monitoring Setup

### 1. Firebase Console Alerts

Set up alerts for:
- Cloud Function errors (enterEvent, manageEventCycles)
- High latency (>5 seconds)
- Failed invocations

- [ ] Alerts configured in Firebase Console

### 2. Cloud Scheduler Monitoring

1. Go to Cloud Scheduler in GCP Console
2. Verify `manageEventCycles` job is running
3. Check execution history

- [ ] Scheduler job is active
- [ ] Executions are successful

## Production Readiness

Before switching to production (3-hour cycles):

- [ ] All staging tests passed
- [ ] No errors in logs for 24 hours
- [ ] At least 10 successful event cycles completed
- [ ] Winner selection tested with multiple entries
- [ ] Idempotency tested (no double-charging)
- [ ] Server time synchronization verified

### Switch to Production Mode

1. Update `functions/src/events/manageEventCycles.ts`:
   - Line 11: Change to `3 * 60 * 60 * 1000` (3 hours)
   - Line 127: Change to `.schedule('every 3 hours')`

2. Redeploy:
   ```bash
   cd functions
   npm run build
   firebase deploy --only functions:manageEventCycles
   ```

3. Verify in Cloud Scheduler:
   - Schedule should show: `every 3 hours`

- [ ] Production configuration updated
- [ ] Functions redeployed
- [ ] Scheduler updated to 3-hour cycles

## Rollback Plan

If issues occur:

1. **Disable Scheduler:**
   ```bash
   gcloud scheduler jobs pause manageEventCycles --location=us-central1
   ```

2. **Revert Cloud Functions:**
   ```bash
   firebase functions:delete enterEvent
   firebase functions:delete manageEventCycles
   firebase functions:delete getServerTime
   ```

3. **Revert HomeScreen.tsx:**
   - Comment out Firestore listener
   - Re-enable local timer

- [ ] Rollback plan documented
- [ ] Team knows how to execute rollback

## Success Criteria

- ✅ Cloud Functions deployed and running
- ✅ Security rules deployed
- ✅ Event cycles completing automatically
- ✅ Users can enter events
- ✅ Gold is deducted correctly
- ✅ Winners are selected fairly
- ✅ Prizes are awarded
- ✅ No double-charging
- ✅ Countdown synchronized across devices
- ✅ No errors in logs

## Notes

- **Staging:** 3-minute cycles for rapid testing
- **Production:** 3-hour cycles for real users
- **Entry Cost:** 100 gold (configurable in `manageEventCycles.ts`)
- **Prize Pool:** 70% of total entries (configurable)

## Support

If issues arise:
1. Check Cloud Function logs: `firebase functions:log`
2. Check Firestore Console for event data
3. Review `EVENT_SYSTEM_README.md` for troubleshooting
4. Contact development team

---

**Deployment Date:** _____________  
**Deployed By:** _____________  
**Environment:** [ ] Staging [ ] Production  
**Status:** [ ] Success [ ] Failed [ ] Rolled Back

