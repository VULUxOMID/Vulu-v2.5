/**
 * Simplified Unified Stream Service
 * Replaces: streamingService, streamLifecycleService, ActiveStreamTracker complexity
 * 
 * Simple, direct approach:
 * - Create stream: Firebase + Agora
 * - Join stream: Firebase + Agora
 * - Leave stream: Firebase + Agora
 * - No complex retries, validations, or abstractions
 */

import { db, auth } from './firebase';
import { doc, setDoc, updateDoc, getDoc, collection, query, where, getDocs, serverTimestamp, increment, arrayUnion, arrayRemove, Timestamp } from 'firebase/firestore';
import { agoraService } from './agoraService';
import { isAgoraConfigured } from '../config/agoraConfig';

export interface StreamParticipant {
  id: string;
  name: string;
  avatar: string | null;
  role: 'host' | 'viewer';
  isHost: boolean;
  joinedAt: Timestamp;
  lastSeen: Timestamp;
  isMuted: boolean;
  isBanned: boolean;
  isActive: boolean;
}

export interface Stream {
  id: string;
  hostId: string;
  hostName: string;
  hostAvatar: string | null;
  title: string;
  description?: string;
  category: string;
  tags: string[];
  isActive: boolean;
  isPublic: boolean;
  startedAt: Timestamp;
  endedAt?: Timestamp;
  viewerCount: number;
  maxViewers: number;
  totalViewers: number;
  participants: StreamParticipant[];
  allowChat: boolean;
  allowReactions: boolean;
  isRecording: boolean;
  quality: string;
  moderatorIds: string[];
  bannedUserIds: string[];
  chatSettings: {
    slowMode: number;
    subscribersOnly: boolean;
    moderatorsOnly: boolean;
    profanityFilter: boolean;
    linkFilter: boolean;
    maxMessageLength: number;
  };
  totalMessages: number;
  totalReactions: number;
  totalGifts: number;
  revenue: number;
  createdAt: Timestamp;
  updatedAt: Timestamp;
  lastActivity: Timestamp;
}

class StreamService {
  private static instance: StreamService;
  private currentStreamId: string | null = null;

  static getInstance(): StreamService {
    if (!StreamService.instance) {
      StreamService.instance = new StreamService();
    }
    return StreamService.instance;
  }

  /**
   * Create a new live stream
   * Simple: Create Firebase doc + Join Agora channel
   */
  async createStream(
    title: string,
    userId: string,
    userName: string,
    userAvatar: string | null,
    options?: {
      description?: string;
      category?: string;
      tags?: string[];
    }
  ): Promise<string> {
    if (!auth.currentUser || auth.currentUser.uid !== userId) {
      throw new Error('Authentication required');
    }

    const streamId = `stream_${Date.now()}_${userId}`;
    const now = Timestamp.now();

    // Sanitize optional fields (Firestore rejects undefined)
    const sanitizedTitle = title?.trim() || 'Live Stream';
    const sanitizedDescription = options?.description ?? '';
    const sanitizedCategory = options?.category || 'just-chatting';
    const sanitizedTags = options?.tags ?? [];
    const sanitizedHostName = userName || 'Host';
    const sanitizedHostAvatar = userAvatar || null;

    // Create stream document
    const streamData: Partial<Stream> = {
      id: streamId,
      hostId: userId,
      hostName: sanitizedHostName,
      hostAvatar: sanitizedHostAvatar,
      title: sanitizedTitle,
      description: sanitizedDescription,
      category: sanitizedCategory,
      tags: sanitizedTags,
      isActive: true,
      isPublic: true,
      startedAt: now,
      viewerCount: 1,
      maxViewers: 1,
      totalViewers: 1,
      participants: [{
        id: userId,
        name: sanitizedHostName,
        avatar: sanitizedHostAvatar,
        role: 'host',
        isHost: true,
        joinedAt: now,
        lastSeen: now,
        isMuted: false,
        isBanned: false,
        isActive: true
      }],
      allowChat: true,
      allowReactions: true,
      isRecording: false,
      quality: 'auto',
      moderatorIds: [],
      bannedUserIds: [],
      chatSettings: {
        slowMode: 0,
        subscribersOnly: false,
        moderatorsOnly: false,
        profanityFilter: true,
        linkFilter: false,
        maxMessageLength: 500
      },
      totalMessages: 0,
      totalReactions: 0,
      totalGifts: 0,
      revenue: 0,
      createdAt: now,
      updatedAt: now,
      lastActivity: now
    };

    // Write to Firebase
    await setDoc(doc(db, 'streams', streamId), streamData);
    console.log(`✅ Stream created in Firebase: ${streamId}`);

    // Join Agora channel (if configured)
    if (isAgoraConfigured()) {
      try {
        await agoraService.initialize();
        await agoraService.joinChannel(streamId, userId, true); // isHost = true
        console.log(`✅ Host joined Agora channel: ${streamId}`);
      } catch (error) {
        console.error('⚠️ Agora join failed, continuing with Firebase-only:', error);
        // Continue even if Agora fails
      }
    }

    this.currentStreamId = streamId;
    return streamId;
  }

  /**
   * Join an existing stream
   * Simple: Update Firebase + Join Agora channel
   */
  async joinStream(
    streamId: string,
    userId: string,
    userName: string,
    userAvatar: string | null
  ): Promise<void> {
    if (!auth.currentUser) {
      throw new Error('Authentication required');
    }

    // Check if stream exists
    const streamRef = doc(db, 'streams', streamId);
    const streamSnap = await getDoc(streamRef);
    
    if (!streamSnap.exists()) {
      throw new Error('Stream not found');
    }

    const streamData = streamSnap.data() as Stream;
    
    if (!streamData.isActive) {
      throw new Error('Stream is not active');
    }

    // Check if user is banned
    if (streamData.bannedUserIds?.includes(userId)) {
      throw new Error('You are banned from this stream');
    }

    // Check if already a participant
    const isAlreadyParticipant = streamData.participants?.some(p => p.id === userId);
    
    if (!isAlreadyParticipant) {
      // Add participant
      const now = Timestamp.now();
      const newParticipant: StreamParticipant = {
        id: userId,
        name: userName || 'Viewer',
        avatar: userAvatar || null,
        role: 'viewer',
        isHost: false,
        joinedAt: now,
        lastSeen: now,
        isMuted: false,
        isBanned: false,
        isActive: true
      };

      await updateDoc(streamRef, {
        participants: arrayUnion(newParticipant),
        viewerCount: increment(1),
        totalViewers: increment(1),
        maxViewers: streamData.viewerCount + 1 > (streamData.maxViewers || 0) 
          ? streamData.viewerCount + 1 
          : streamData.maxViewers,
        updatedAt: serverTimestamp(),
        lastActivity: serverTimestamp()
      });
    }

    // Join Agora channel (if configured)
    if (isAgoraConfigured()) {
      try {
        await agoraService.initialize();
        await agoraService.joinChannel(streamId, userId, false); // isHost = false
        console.log(`✅ Viewer joined Agora channel: ${streamId}`);
      } catch (error) {
        console.error('⚠️ Agora join failed, continuing with Firebase-only:', error);
        // Continue even if Agora fails
      }
    }

    this.currentStreamId = streamId;
  }

  /**
   * Leave a stream
   * Simple: Update Firebase + Leave Agora channel
   */
  async leaveStream(streamId: string, userId: string): Promise<void> {
    const streamRef = doc(db, 'streams', streamId);
    const streamSnap = await getDoc(streamRef);
    
    if (!streamSnap.exists()) {
      console.warn(`Stream ${streamId} not found, skipping leave`);
      return;
    }

    const streamData = streamSnap.data() as Stream;
    const participant = streamData.participants?.find(p => p.id === userId);

    if (participant) {
      // Remove participant
      await updateDoc(streamRef, {
        participants: arrayRemove(participant),
        viewerCount: increment(-1),
        updatedAt: serverTimestamp(),
        lastActivity: serverTimestamp()
      });

      // If host left, end the stream
      if (participant.isHost) {
        await updateDoc(streamRef, {
          isActive: false,
          endedAt: serverTimestamp(),
          updatedAt: serverTimestamp()
        });
      }
    }

    // Leave Agora channel
    if (isAgoraConfigured()) {
      try {
        await agoraService.leaveChannel();
        console.log(`✅ Left Agora channel: ${streamId}`);
      } catch (error) {
        console.error('⚠️ Agora leave failed:', error);
      }
    }

    if (this.currentStreamId === streamId) {
      this.currentStreamId = null;
    }
  }

  /**
   * Get active streams
   */
  async getActiveStreams(): Promise<Stream[]> {
    const streamsRef = collection(db, 'streams');
    const q = query(streamsRef, where('isActive', '==', true));
    const snapshot = await getDocs(q);
    
    return snapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    } as Stream));
  }

  /**
   * Get stream by ID
   */
  async getStream(streamId: string): Promise<Stream | null> {
    const streamRef = doc(db, 'streams', streamId);
    const streamSnap = await getDoc(streamRef);
    
    if (!streamSnap.exists()) {
      return null;
    }

    return {
      id: streamSnap.id,
      ...streamSnap.data()
    } as Stream;
  }

  /**
   * Get current stream ID
   */
  getCurrentStreamId(): string | null {
    return this.currentStreamId;
  }
}

export const streamService = StreamService.getInstance();

