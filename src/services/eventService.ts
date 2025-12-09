/**
 * Event Service
 * Client-side service for synchronized event management
 * Follows existing service patterns with Firebase v9 modular API
 */

import {
  doc,
  getDoc,
  onSnapshot,
  collection,
  query,
  where,
  Timestamp
} from 'firebase/firestore';
import { httpsCallable } from 'firebase/functions';
import { db, functions, auth } from './firebase';
import FirebaseErrorHandler from '../utils/firebaseErrorHandler';
import {
  Event,
  EventEntry,
  EventEntryResult,
  ServerTimeResponse
} from '../types/event';

class EventService {
  private serverTimeOffsetMs: number = 0;
  private offsetCalculated: boolean = false;

  /**
   * Get current user ID
   */
  private getCurrentUserId(): string | null {
    return auth?.currentUser?.uid || null;
  }

  /**
   * Check if user is authenticated
   */
  private isAuthenticated(): boolean {
    return auth?.currentUser !== null;
  }

  /**
   * Calculate server time offset for accurate countdown
   * Should be called on app start and resume
   */
  async calculateServerTimeOffset(): Promise<number> {
    try {
      const before = Date.now();
      const getServerTimeFn = httpsCallable<{}, ServerTimeResponse>(functions, 'getServerTime');
      const result = await getServerTimeFn();
      const after = Date.now();

      const serverTime = result.data.serverTime;
      const latency = (after - before) / 2;
      this.serverTimeOffsetMs = serverTime - (before + latency);
      this.offsetCalculated = true;

      console.log('Server time offset calculated:', this.serverTimeOffsetMs, 'ms');

      return this.serverTimeOffsetMs;
    } catch (error: any) {
      console.error('Failed to calculate server time offset:', error);
      FirebaseErrorHandler.logError('calculateServerTimeOffset', error);
      
      // Return 0 offset on error (fallback to local time)
      this.serverTimeOffsetMs = 0;
      return 0;
    }
  }

  /**
   * Get server time offset (cached)
   */
  getServerTimeOffset(): number {
    return this.serverTimeOffsetMs;
  }

  /**
   * Check if server time offset has been calculated
   */
  isOffsetCalculated(): boolean {
    return this.offsetCalculated;
  }

  /**
   * Get current server time (local time + offset)
   */
  getServerTime(): number {
    return Date.now() + this.serverTimeOffsetMs;
  }

  /**
   * Get current event data
   */
  async getCurrentEvent(): Promise<Event | null> {
    try {
      console.log(`[EVENT] Getting current event from Firestore...`);
      const eventRef = doc(db, 'globalEvents', 'current');
      const eventDoc = await getDoc(eventRef);

      if (!eventDoc.exists()) {
        console.warn(`[EVENT] ⚠️ No current event document found in Firestore`);
        return null;
      }

      const eventData = eventDoc.data() as Event;
      console.log(`[EVENT] ✅ Current event loaded:`, {
        eventId: eventData.eventId,
        status: eventData.status,
        cycleNumber: eventData.cycleNumber,
        totalEntries: eventData.totalEntries,
        endTime: eventData.endTime?.toDate?.()
      });
      return eventData;
    } catch (error: any) {
      console.error(`[EVENT] ❌ Failed to get current event:`, {
        error: error.message,
        code: error.code,
        stack: error.stack
      });
      FirebaseErrorHandler.logError('getCurrentEvent', error);
      return null;
    }
  }

  /**
   * Subscribe to current event updates
   * Returns unsubscribe function
   */
  onEventSnapshot(callback: (event: Event | null) => void): () => void {
    try {
      console.log(`[EVENT] Setting up real-time event listener...`);
      const eventRef = doc(db, 'globalEvents', 'current');

      return onSnapshot(
        eventRef,
        (snapshot) => {
          if (snapshot.exists()) {
            const event = snapshot.data() as Event;
            console.log(`[EVENT] ✅ Event snapshot received:`, {
              eventId: event.eventId,
              status: event.status,
              cycleNumber: event.cycleNumber,
              totalEntries: event.totalEntries,
              endTime: event.endTime?.toDate?.()
            });
            callback(event);
          } else {
            console.warn(`[EVENT] ⚠️ Event snapshot empty - document does not exist`);
            console.warn(`[EVENT] 💡 Run manageEventCycles Cloud Function to create first event`);
            callback(null);
          }
        },
        (error) => {
          console.error(`[EVENT] ❌ Event snapshot listener error:`, {
            error: error.message,
            code: error.code,
            stack: error.stack
          });

          if (error.code === 'permission-denied') {
            console.error(`[EVENT] 🔒 Firestore security rules may be blocking read access to globalEvents/current`);
            console.error(`[EVENT] 🔒 Check that user is authenticated and rules allow read access`);
          }

          FirebaseErrorHandler.logError('onEventSnapshot', error);

          // Provide null on error
          callback(null);
        }
      );
    } catch (error: any) {
      console.error(`[EVENT] ❌ Failed to set up event listener:`, {
        error: error.message,
        code: error.code,
        stack: error.stack
      });
      FirebaseErrorHandler.logError('onEventSnapshot', error);

      // Return no-op unsubscribe function
      return () => {};
    }
  }

  /**
   * Enter current event
   * @param idempotencyKey - Unique key to prevent double-charging (should be a UUID)
   */
  async enterEvent(idempotencyKey: string): Promise<EventEntryResult> {
    try {
      if (!this.isAuthenticated()) {
        throw new Error('User must be authenticated to enter event');
      }

      const enterEventFn = httpsCallable<
        { eventId: string; idempotencyKey: string },
        EventEntryResult
      >(functions, 'enterEvent');

      const result = await enterEventFn({
        eventId: 'current',
        idempotencyKey
      });

      return result.data;
    } catch (error: any) {
      console.error(`[EVENT] ❌ Failed to enter event:`, {
        error: error.message,
        code: error.code,
        stack: error.stack
      });
      FirebaseErrorHandler.logError('enterEvent', error);

      // Extract error message from Firebase error with better handling
      let errorMessage = 'Failed to enter event';
      let isExpired = false;
      
      if (error.code === 'functions/unauthenticated') {
        errorMessage = 'You must be signed in to enter';
      } else if (error.code === 'functions/failed-precondition') {
        // Check if it's an expired event
        const errorMsg = error.message || '';
        if (errorMsg.toLowerCase().includes('expired') || errorMsg.toLowerCase().includes('ended')) {
          errorMessage = 'This event has ended. Please wait for the next one.';
          isExpired = true;
          console.log(`[EVENT] ⚠️ Event has expired - gracefully handling`);
        } else {
          errorMessage = errorMsg || 'Event requirements not met';
        }
      } else if (error.code === 'functions/already-exists') {
        errorMessage = 'You have already entered this event';
      } else if (error.message) {
        errorMessage = error.message;
      }

      return {
        success: false,
        error: errorMessage,
        isExpired // Add flag to indicate expired event
      };
    }
  }

  /**
   * Get user's entry for current event
   */
  async getUserEntry(userId?: string): Promise<EventEntry | null> {
    try {
      const uid = userId || this.getCurrentUserId();
      
      if (!uid) {
        return null;
      }

      const entryRef = doc(db, 'globalEvents', 'current', 'entries', uid);
      const entryDoc = await getDoc(entryRef);

      if (!entryDoc.exists()) {
        return null;
      }

      return entryDoc.data() as EventEntry;
    } catch (error: any) {
      console.error('Failed to get user entry:', error);
      FirebaseErrorHandler.logError('getUserEntry', error);
      return null;
    }
  }

  /**
   * Check if user has entered current event
   */
  async hasUserEntered(userId?: string): Promise<boolean> {
    const entry = await this.getUserEntry(userId);
    return entry !== null;
  }

  /**
   * Calculate time left in seconds from event end time
   * Uses server time offset for accuracy
   */
  calculateTimeLeft(endTime: Timestamp): number {
    const endMs = endTime.toMillis();
    const serverNow = this.getServerTime();
    return Math.max(0, Math.floor((endMs - serverNow) / 1000));
  }

  /**
   * Format time in MM:SS format
   */
  formatTime(seconds: number): string {
    const minutes = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${minutes}:${secs.toString().padStart(2, '0')}`;
  }

  /**
   * Calculate prize pool based on entries and entry cost
   * 70% of total goes to prize pool
   */
  calculatePrizePool(totalEntries: number, entryCost: number): number {
    if (totalEntries === 0) return 0;
    if (totalEntries === 1) return entryCost; // Full refund for single entry
    return Math.floor(totalEntries * entryCost * 0.7);
  }
}

// Export singleton instance
export default new EventService();

