/**
 * TypeScript types for synchronized event system
 */

import { Timestamp } from 'firebase/firestore';

/**
 * Event status enum
 */
export type EventStatus = 'active' | 'ended';

/**
 * Main event document structure (globalEvents/current)
 */
export interface Event {
  eventId: string;
  cycleNumber: number;
  startTime: Timestamp;
  endTime: Timestamp;
  entryCost: number;
  totalEntries: number;
  prizePool: number;
  status: EventStatus;
  winnerId?: string;
  winnerTicket?: number;
  processedAt?: Timestamp;
  rngSeed?: string;
}

/**
 * Event entry document structure (globalEvents/current/entries/{userId})
 */
export interface EventEntry {
  userId: string;
  ticketNumber: number;
  entryTime: Timestamp;
  goldPaid: number;
  idempotencyKey: string;
}

/**
 * Client-side event data (with computed fields)
 */
export interface EventData extends Event {
  timeLeft: number; // Computed on client
  prizePoolDisplay: number; // Formatted for display
}

/**
 * Event entry result from Cloud Function
 */
export interface EventEntryResult {
  success: boolean;
  ticketNumber?: number;
  alreadyEntered?: boolean;
  error?: string;
  isExpired?: boolean; // Flag to indicate if event has expired
}

/**
 * Server time response for offset calculation
 */
export interface ServerTimeResponse {
  serverTime: number;
}

/**
 * Event configuration (for staging vs production)
 */
export interface EventConfig {
  cycleDurationMs: number; // 3 minutes for staging, 3 hours for production
  entryCost: number;
  prizePoolPercentage: number; // 0.7 for 70%
}

/**
 * Default event configuration
 */
export const DEFAULT_EVENT_CONFIG: EventConfig = {
  cycleDurationMs: 3 * 60 * 1000, // 3 minutes for testing
  entryCost: 100,
  prizePoolPercentage: 0.7
};

/**
 * Production event configuration
 */
export const PRODUCTION_EVENT_CONFIG: EventConfig = {
  cycleDurationMs: 3 * 60 * 60 * 1000, // 3 hours
  entryCost: 100,
  prizePoolPercentage: 0.7
};

