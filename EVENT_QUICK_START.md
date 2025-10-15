# Event System - Quick Start Guide

## 🚀 Deploy in 5 Minutes

### Prerequisites
- Firebase project on **Blaze plan** (required for scheduled functions)
- Firebase CLI installed: `npm install -g firebase-tools`
- Logged in: `firebase login`

### Step 1: Deploy Cloud Functions (2 min)

```bash
cd functions
npm install
npm run build
firebase deploy --only functions:enterEvent,manageEventCycles,getServerTime
```

Wait for deployment to complete. You should see:
```
✔  functions[enterEvent] Successful create operation.
✔  functions[manageEventCycles] Successful create operation.
✔  functions[getServerTime] Successful create operation.
```

### Step 2: Deploy Security Rules (1 min)

```bash
firebase deploy --only firestore:rules
```

You should see:
```
✔  firestore: released rules firestore.rules to cloud.firestore
```

### Step 3: Verify Deployment (1 min)

```bash
firebase functions:list
```

Check that you see:
- `enterEvent (us-central1)`
- `manageEventCycles (us-central1)` with schedule: `every 3 minutes`
- `getServerTime (us-central1)`

### Step 4: Test in App (1 min)

1. Open the Vulu app
2. Navigate to HomeScreen
3. You should see the event widget with a countdown
4. Tap "Enter" to join the event
5. Verify gold is deducted (100 gold)

**Done! 🎉**

---

## 📱 How It Works (User Perspective)

1. **Event Widget Appears** on HomeScreen with:
   - Countdown timer (3 minutes in staging)
   - Number of entries
   - Prize pool amount

2. **User Taps "Enter"**:
   - 100 gold is deducted
   - User receives a ticket number
   - Entry count and prize pool update in real-time

3. **Event Ends** (after 3 minutes):
   - Winner is selected randomly
   - Prize is awarded automatically
   - New event starts immediately

4. **Winner Notification**:
   - Winner sees prize added to gold balance
   - Transaction logged in Firestore

---

## 🔧 Configuration

### Change Cycle Duration

**File:** `functions/src/events/manageEventCycles.ts`

**Line 11:**
```typescript
// Staging (3 minutes)
const CYCLE_DURATION_MS = 3 * 60 * 1000;

// Production (3 hours)
const CYCLE_DURATION_MS = 3 * 60 * 60 * 1000;
```

**Line 127:**
```typescript
// Staging
.schedule('every 3 minutes')

// Production
.schedule('every 3 hours')
```

After changing, redeploy:
```bash
cd functions
npm run build
firebase deploy --only functions:manageEventCycles
```

### Change Entry Cost

**File:** `functions/src/events/manageEventCycles.ts`

**Line 13:**
```typescript
const ENTRY_COST = 100; // Change to desired amount
```

Redeploy after changing.

### Change Prize Pool Percentage

**File:** `functions/src/events/manageEventCycles.ts`

**Line 14:**
```typescript
const PRIZE_POOL_PERCENTAGE = 0.7; // 70% to winner, 30% to platform
```

Redeploy after changing.

---

## 🐛 Troubleshooting

### Event widget not showing
```bash
# Check if event exists in Firestore
firebase firestore:get globalEvents/current

# If not, wait 3 minutes for scheduler to create it
# Or manually create in Firestore Console
```

### Entry fails
```bash
# Check Cloud Function logs
firebase functions:log --only enterEvent

# Common issues:
# - Insufficient gold (need 100)
# - Already entered this cycle
# - Event expired
```

### Winner not selected
```bash
# Check scheduler logs
firebase functions:log --only manageEventCycles

# Verify scheduler is running
gcloud scheduler jobs list --location=us-central1
```

---

## 📊 Monitor Events

### View Current Event
```bash
firebase firestore:get globalEvents/current
```

### View Event Entries
```bash
firebase firestore:get globalEvents/current/entries
```

### View Event History
```bash
firebase firestore:get globalEvents/history
```

### Watch Cloud Function Logs
```bash
firebase functions:log --only manageEventCycles --follow
```

---

## 🔒 Security

All event operations are server-side:
- ✅ Clients can only **read** events
- ✅ Clients can only **enter** via Cloud Function
- ✅ Only Cloud Functions can **modify** events
- ✅ Idempotency prevents double-charging

---

## 📈 Key Metrics

Monitor these in Firebase Console:
- **Event entries per cycle** (avg: 10-50)
- **Cloud Function execution time** (avg: <1s)
- **Error rate** (target: <1%)
- **Winner distribution** (should be random)

---

## 🎯 Next Steps

1. ✅ Deploy to staging (3-minute cycles)
2. ✅ Test with team
3. ✅ Monitor for 24 hours
4. ✅ Switch to production (3-hour cycles)
5. ✅ Monitor user engagement

---

## 📚 Full Documentation

- **Complete Guide:** `EVENT_SYSTEM_README.md`
- **Deployment Checklist:** `EVENT_DEPLOYMENT_CHECKLIST.md`
- **Implementation Summary:** `EVENT_IMPLEMENTATION_SUMMARY.md`

---

## 🆘 Need Help?

1. Check logs: `firebase functions:log`
2. Review Firestore data in console
3. See troubleshooting in `EVENT_SYSTEM_README.md`
4. Contact development team

---

**That's it! You're ready to go! 🚀**

