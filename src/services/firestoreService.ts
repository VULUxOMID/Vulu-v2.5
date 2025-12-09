import {
  collection,
  doc,
  getDoc,
  getDocs,
  addDoc,
  updateDoc,
  setDoc,
  deleteDoc,
  query,
  where,
  orderBy,
  limit,
  onSnapshot,
  serverTimestamp,
  Timestamp,
  increment,
  runTransaction,
  arrayUnion,
  arrayRemove
} from 'firebase/firestore';
import { db, auth, isFirebaseInitialized } from './firebase';
import type { AppUser, ChatMessage, DirectMessage, Conversation } from './types';
import FirebaseErrorHandler from '../utils/firebaseErrorHandler';
import UserDataSanitizer from '../utils/userDataSanitizer';

// Re-export types for backward compatibility
export type { AppUser as User, ChatMessage, DirectMessage, Conversation };

// Enhanced streaming interfaces
export interface Stream {
  // Core identifiers
  id: string;
  hostId: string;
  hostName: string;
  hostAvatar?: string;

  // Stream metadata
  title: string;
  description?: string;
  category: StreamCategory;
  tags: string[];
  thumbnailUrl?: string;

  // Status and timing
  isActive: boolean;
  isPublic: boolean;
  startedAt: Timestamp;
  endedAt?: Timestamp;
  scheduledFor?: Timestamp;

  // Participant tracking
  viewerCount: number;
  maxViewers: number;
  totalViewers: number;
  participants: StreamParticipant[];

  // Stream settings
  allowChat: boolean;
  allowReactions: boolean;
  isRecording: boolean;
  quality: StreamQuality;

  // Moderation
  moderatorIds: string[];
  bannedUserIds: string[];
  chatSettings: ChatSettings;

  // Analytics
  totalMessages: number;
  totalReactions: number;
  totalGifts: number;
  revenue: number;

  // Metadata
  createdAt: Timestamp;
  updatedAt: Timestamp;
  lastActivity: Timestamp;
}

export interface StreamParticipant {
  id: string;
  name: string;
  avatar?: string;
  role: 'host' | 'moderator' | 'viewer';
  joinedAt: Timestamp;
  lastSeen: Timestamp;
  isMuted: boolean;
  isBanned: boolean;
  isActive: boolean;
}

export interface ChatSettings {
  slowMode: number;
  subscribersOnly: boolean;
  moderatorsOnly: boolean;
  profanityFilter: boolean;
  linkFilter: boolean;
  maxMessageLength: number;
}

export type StreamCategory = 'gaming' | 'music' | 'talk' | 'education' | 'entertainment' | 'other';
export type StreamQuality = 'low' | 'medium' | 'high' | 'auto';

// Legacy interface for backward compatibility
export interface LiveStream {
  id: string;
  userId: string;
  userName: string;
  userPhoto?: string;
  title: string;
  description?: string;
  isLive: boolean;
  viewerCount: number;
  startedAt: Timestamp;
  endedAt?: Timestamp;
}

// Enhanced chat message interface
export interface StreamChatMessage {
  id: string;
  streamId: string;
  senderId: string;
  senderName: string;
  senderAvatar?: string;
  senderRole: 'host' | 'moderator' | 'viewer';

  // Message content
  message: string;
  type: MessageType;
  mentions: string[];

  // Reactions and engagement
  reactions: MessageReaction[];
  reactionCount: number;

  // Moderation
  isDeleted: boolean;
  deletedBy?: string;
  deleteReason?: string;
  isFiltered: boolean;

  // Metadata
  timestamp: Timestamp;
  editedAt?: Timestamp;
  clientTimestamp: number;
}

export interface MessageReaction {
  emoji: string;
  userIds: string[];
  count: number;
}

export type MessageType = 'text' | 'emoji' | 'system' | 'gift' | 'announcement';

// Legacy interface for backward compatibility
export interface GlobalChatMessage {
  id: string;
  senderId: string;
  senderName: string;
  senderAvatar?: string;
  text: string;
  timestamp: Timestamp;
  type: 'text' | 'system';
}

class FirestoreService {
  // Firebase readiness check
  private ensureFirebaseReady(): void {
    if (!isFirebaseInitialized()) {
      throw new Error('Firebase services not initialized');
    }
    if (!db) {
      throw new Error('Firestore not available');
    }
  }

  // Authentication helper methods
  private isAuthenticated(): boolean {
    return auth?.currentUser !== null;
  }

  private getCurrentUserId(): string | null {
    return auth?.currentUser?.uid || null;
  }

  private requireAuth(): void {
    if (!this.isAuthenticated()) {
      throw new Error('Authentication required for this operation');
    }
  }

  // Check if username is already taken
  async isUsernameTaken(username: string): Promise<boolean> {
    try {
      this.ensureFirebaseReady();

      // Use circuit breaker protection for username checks
      return await FirebaseErrorHandler.executeWithProtection(async () => {
        const usersRef = collection(db, 'users');
        const q = query(
          usersRef,
          where('usernameLower', '==', username.toLowerCase()),
          limit(1)
        );

        const querySnapshot = await getDocs(q);
        return !querySnapshot.empty;
      }, 'username-check');
    } catch (error: any) {
      // Don't log if we should suppress it
      if (!FirebaseErrorHandler.shouldSuppressErrorLogging(error, 'username-check')) {
        console.error('Failed to check username availability:', error);
      }

      // Handle permission errors specifically
      if (FirebaseErrorHandler.isPermissionError(error)) {
        // For permission errors during registration, throw an error instead of returning false
        // This will force proper error handling in the UI
        console.warn('Permission error during username check - cannot verify availability');
        throw new Error('Unable to verify username availability due to permissions. Please try again.');
      }

      // For other errors, assume username is taken to be safe
      throw new Error('Unable to check username availability. Please try again.');
    }
  }

  // User operations
  async createUser(userData: Omit<AppUser, 'createdAt' | 'lastSeen'>): Promise<void> {
    try {
      console.log(`[PROFILE] Creating/updating user profile in Firestore: users/${userData.uid}`);
      const userRef = doc(db, 'users', userData.uid);
      
      // Check if document already exists
      const existingDoc = await getDoc(userRef);
      const existingData = existingDoc.exists() ? existingDoc.data() : null;
      
      // Ensure currencyBalances exists if gold/gems are provided
      const profileData: any = {
        ...userData,
        // Add lowercase fields for case-insensitive searching
        displayNameLower: (userData.displayName || '').toLowerCase(),
        usernameLower: (userData.username || '').toLowerCase(),
        emailLower: (userData.email || '').toLowerCase(),
        lastSeen: serverTimestamp()
      };

      // Preserve existing currencyBalances if they exist, otherwise create from gold/gems or defaults
      if (existingData?.currencyBalances) {
        // Preserve existing currency balances - don't overwrite them
        profileData.currencyBalances = existingData.currencyBalances;
        console.log(`[PROFILE] Preserving existing currencyBalances:`, existingData.currencyBalances);
      } else if (userData.currencyBalances) {
        // Use provided currencyBalances
        profileData.currencyBalances = userData.currencyBalances;
        console.log(`[PROFILE] Using provided currencyBalances`);
      } else if ((userData.gold !== undefined || userData.gems !== undefined)) {
        // Create currencyBalances from legacy gold/gems fields
        profileData.currencyBalances = {
          gold: userData.gold || existingData?.gold || 0,
          gems: userData.gems || existingData?.gems || 0,
          tokens: 0,
          lastUpdated: serverTimestamp()
        };
        console.log(`[PROFILE] Created currencyBalances from legacy gold/gems fields`);
      } else if (existingData?.gold !== undefined || existingData?.gems !== undefined) {
        // Preserve legacy gold/gems from existing data
        profileData.currencyBalances = {
          gold: existingData.gold || 0,
          gems: existingData.gems || 0,
          tokens: 0,
          lastUpdated: serverTimestamp()
        };
        console.log(`[PROFILE] Created currencyBalances from existing legacy gold/gems`);
      } else {
        // No currency data at all - create empty balances (only for new profiles)
        if (!existingDoc.exists()) {
          profileData.currencyBalances = {
            gold: 0,
            gems: 0,
            tokens: 0,
            lastUpdated: serverTimestamp()
          };
          console.log(`[PROFILE] Created empty currencyBalances for new profile`);
        }
        // For existing profiles without currency data, don't overwrite - let ensureProfileComplete handle it
      }

      // Only set createdAt if document doesn't exist
      if (!existingDoc.exists()) {
        profileData.createdAt = serverTimestamp();
      }

      // Use setDoc with merge: true to update existing or create new
      await setDoc(userRef, profileData, { merge: true });
      console.log(`[PROFILE] ✅ User profile ${existingDoc.exists() ? 'updated' : 'created'} successfully:`, {
        uid: userData.uid,
        username: userData.username,
        displayName: userData.displayName,
        email: userData.email,
        wasExisting: existingDoc.exists()
      });
    } catch (error: any) {
      console.error(`[PROFILE] ❌ Failed to create/update user in Firestore:`, {
        uid: userData.uid,
        error: error.message,
        code: error.code,
        stack: error.stack
      });
      
      // Check if it's a permission error
      if (error.code === 'permission-denied') {
        console.error(`[PROFILE] 🔒 Permission denied - check Firestore security rules for users collection`);
      }
      
      // Don't throw error, just log it - signup should still succeed
    }
  }

  /**
   * Ensure profile has required fields (username, displayName) - updates if missing
   * This is a self-healing function that fixes incomplete profiles
   */
  async ensureProfileComplete(uid: string, firebaseUser: User): Promise<AppUser | null> {
    try {
      console.log(`[PROFILE] Ensuring profile is complete for user: ${uid}`);
      const userRef = doc(db, 'users', uid);
      const userDoc = await getDoc(userRef);

      if (!userDoc.exists()) {
        console.log(`[PROFILE] Profile does not exist, will be created by createUser`);
        return null;
      }

      const existingData = userDoc.data() as AppUser;
      const needsUpdate = !existingData.username || !existingData.displayName;

      if (!needsUpdate) {
        console.log(`[PROFILE] ✅ Profile is already complete`);
        return existingData;
      }

      console.log(`[PROFILE] ⚠️ Profile is incomplete, updating with missing fields...`);
      
      // Generate defaults from email if missing
      const emailPrefix = firebaseUser.email?.split('@')[0] || 'user';
      const defaultDisplayName = existingData.displayName || firebaseUser.displayName || emailPrefix.charAt(0).toUpperCase() + emailPrefix.slice(1);
      const defaultUsername = existingData.username || emailPrefix.toLowerCase();

      const updates: any = {};
      
      if (!existingData.username) {
        updates.username = defaultUsername;
        updates.usernameLower = defaultUsername.toLowerCase();
        console.log(`[PROFILE] Adding missing username: ${defaultUsername}`);
      }
      
      if (!existingData.displayName) {
        updates.displayName = defaultDisplayName;
        updates.displayNameLower = defaultDisplayName.toLowerCase();
        console.log(`[PROFILE] Adding missing displayName: ${defaultDisplayName}`);
      }

      // Preserve existing currencyBalances when updating
      // Don't include currencyBalances in updates unless we're explicitly setting it
      const updateData: any = {
        ...updates,
        lastSeen: serverTimestamp()
      };

      // Update the document (only updates the fields we specify, preserves everything else)
      await updateDoc(userRef, updateData);

      console.log(`[PROFILE] ✅ Profile updated with missing fields:`, updates);

      // Reload and return the updated profile
      const updatedDoc = await getDoc(userRef);
      if (updatedDoc.exists()) {
        const updatedData = updatedDoc.data() as AppUser;
        console.log(`[PROFILE] ✅ Reloaded updated profile:`, {
          username: updatedData.username,
          displayName: updatedData.displayName,
          hasCurrencyBalances: !!updatedData.currencyBalances
        });
        return updatedData;
      }

      return null;
    } catch (error: any) {
      console.error(`[PROFILE] ❌ Failed to ensure profile complete:`, {
        uid,
        error: error.message,
        code: error.code
      });
      return null;
    }
  }

  async getUser(uid: string): Promise<AppUser | null> {
    try {
      console.log(`[PROFILE] Fetching user document from Firestore: users/${uid}`);
      const userRef = doc(db, 'users', uid);
      const userSnap = await getDoc(userRef);

      if (userSnap.exists()) {
        const userData = userSnap.data() as AppUser;
        const isComplete = !!(userData.username && userData.displayName);
        console.log(`[PROFILE] ✅ User document found:`, {
          uid: userData.uid,
          username: userData.username || '(missing)',
          displayName: userData.displayName || '(missing)',
          email: userData.email,
          isComplete: isComplete,
          hasGold: typeof userData.gold !== 'undefined',
          hasCurrencyBalances: !!userData.currencyBalances
        });
        if (!isComplete) {
          console.log(`[PROFILE] ⚠️ Profile exists but is INCOMPLETE (missing username or displayName)`);
        }
        return userData;
      }
      console.warn(`[PROFILE] ⚠️ User document does not exist: users/${uid}`);
      return null;
    } catch (error: any) {
      console.error(`[PROFILE] ❌ Failed to get user from Firestore (users/${uid}):`, {
        error: error.message,
        code: error.code,
        stack: error.stack
      });
      
      // Check if it's a permission error
      if (error.code === 'permission-denied') {
        console.error(`[PROFILE] 🔒 Permission denied - check Firestore security rules for users collection`);
      }
      
      return null;
    }
  }

  onUserProfileChange(uid: string, callback: (user: AppUser | null) => void): () => void {
    try {
      const userRef = doc(db, 'users', uid);
      const unsubscribe = onSnapshot(userRef, (doc) => {
        if (doc.exists()) {
          callback(doc.data() as AppUser);
        } else {
          callback(null);
        }
      }, (error) => {
        console.error('Error listening to user profile changes:', error);
        callback(null);
      });

      return unsubscribe;
    } catch (error: any) {
      console.error('Failed to set up user profile listener:', error);
      return () => {}; // Return empty function if setup fails
    }
  }

  async updateUser(uid: string, updates: Partial<AppUser>): Promise<void> {
    const userEmail = auth?.currentUser?.email || 'unknown';
    const userRef = doc(db, 'users', uid);
    const firestorePath = `users/${uid}`;
    
    console.log(`[PROFILE_SAVE] 🚀 Starting updateUser:`, {
      uid,
      userEmail,
      firestorePath,
      updates: {
        ...updates,
        // Don't log sensitive data, but show which fields are being updated
        fieldsBeingUpdated: Object.keys(updates)
      }
    });

    try {
      const updateData: any = {
        ...updates,
        lastSeen: serverTimestamp()
      };

      // Update lowercase fields if the corresponding fields are being updated
      if (updates.displayName !== undefined) {
        updateData.displayNameLower = updates.displayName.toLowerCase();
      }
      if (updates.username !== undefined) {
        updateData.usernameLower = updates.username.toLowerCase();
      }
      if (updates.email !== undefined) {
        updateData.emailLower = updates.email.toLowerCase();
      }

      console.log(`[PROFILE_SAVE] ✏️ Preparing Firestore update:`, {
        uid,
        userEmail,
        firestorePath,
        updatePayload: {
          ...updateData,
          lastSeen: '[serverTimestamp]'
        }
      });

      try {
        await updateDoc(userRef, updateData);
        console.log(`[PROFILE_SAVE] ✅ Firestore update successful:`, {
          uid,
          userEmail,
          firestorePath,
          fieldsUpdated: Object.keys(updates)
        });
      } catch (updateError: any) {
        if (updateError?.code === 'permission-denied') {
          console.error(`[PROFILE_SAVE] 🔒 Permission denied writing to Firestore:`, {
            uid,
            userEmail,
            firestorePath,
            errorCode: updateError.code,
            errorMessage: updateError.message,
            fieldsAttempted: Object.keys(updates)
          });
          throw new Error(`Permission denied: You don't have permission to update your profile. Please contact support.`);
        }
        throw updateError;
      }
    } catch (error: any) {
      const isPermissionError = error?.code === 'permission-denied' || error?.message?.includes('Permission denied');
      const logPrefix = isPermissionError ? '🔒' : '❌';
      
      console.error(`[PROFILE_SAVE] ${logPrefix} updateUser failed:`, {
        uid,
        userEmail,
        firestorePath,
        fieldsAttempted: Object.keys(updates),
        errorCode: error?.code,
        errorMessage: error?.message,
        errorName: error?.name
      });
      
      // Re-throw permission errors with user-friendly message
      if (isPermissionError) {
        throw error; // Already has user-friendly message
      }
      
      throw new Error(`Failed to update user: ${error.message}`);
    }
  }

  async deleteUser(uid: string): Promise<void> {
    try {
      const userRef = doc(db, 'users', uid);
      await deleteDoc(userRef);
    } catch (error: any) {
      throw new Error(`Failed to delete user: ${error.message}`);
    }
  }

  // Enhanced chat operations
  async sendStreamMessage(streamId: string, messageText: string, mentions: string[] = []): Promise<string> {
    try {
      this.requireAuth();
      const currentUser = auth.currentUser;
      if (!currentUser) throw new Error('User not authenticated');

      // Get stream data to check permissions and settings
      const streamRef = doc(db, 'streams', streamId);
      const streamDoc = await getDoc(streamRef);

      if (!streamDoc.exists()) {
        throw new Error('Stream not found');
      }

      const streamData = streamDoc.data() as Stream;
      if (!streamData.isActive) {
        throw new Error('Stream is not active');
      }

      // Check if user is banned (guard against undefined)
      const bannedUserIds = Array.isArray(streamData.bannedUserIds) ? streamData.bannedUserIds : [];
      if (currentUser?.uid && bannedUserIds.includes(currentUser.uid)) {
        throw new Error('You are banned from this stream');
      }

      // Check chat settings
      if (!streamData.allowChat) {
        throw new Error('Chat is disabled for this stream');
      }

      // Get user role in stream (guard participants)
      const participants = Array.isArray(streamData.participants) ? streamData.participants : [];
      const participant = participants.find(p => p.id === currentUser.uid);
      const userRole = participant?.role || 'viewer';

      // Check moderators only setting (guard chatSettings)
      if (streamData.chatSettings?.moderatorsOnly && !['host', 'moderator'].includes(userRole)) {
        throw new Error('Only moderators can chat in this stream');
      }

      // Validate message length (guard chatSettings)
      if (streamData.chatSettings && messageText.length > streamData.chatSettings.maxMessageLength) {
        throw new Error(`Message too long. Maximum ${streamData.chatSettings.maxMessageLength} characters.`);
      }

      // Create chat message
      const chatMessage: Omit<StreamChatMessage, 'id'> = {
        streamId,
        senderId: currentUser.uid,
        senderName: currentUser.displayName || 'User',
        senderAvatar: currentUser.photoURL || undefined,
        senderRole: userRole,
        message: messageText,
        type: 'text',
        mentions,
        reactions: [],
        reactionCount: 0,
        isDeleted: false,
        isFiltered: false,
        timestamp: serverTimestamp() as Timestamp,
        clientTimestamp: Date.now()
      };

      // Add message to chat subcollection
      const chatRef = collection(db, `streams/${streamId}/chat`);
      const messageRef = await addDoc(chatRef, chatMessage);

      // Update stream message count
      await updateDoc(streamRef, {
        totalMessages: increment(1),
        lastActivity: serverTimestamp()
      });

      // Update participant message count
      const participantRef = doc(db, `streams/${streamId}/participants`, currentUser.uid);
      await updateDoc(participantRef, {
        messagesSent: increment(1),
        lastSeen: serverTimestamp(),
        updatedAt: serverTimestamp()
      });

      console.log(`✅ Message sent to stream ${streamId}: ${messageRef.id}`);
      return messageRef.id;
    } catch (error: any) {
      console.error('Failed to send stream message:', error.message);
      throw error;
    }
  }

  async addMessageReaction(streamId: string, messageId: string, emoji: string): Promise<void> {
    try {
      this.requireAuth();
      const currentUser = auth.currentUser;
      if (!currentUser) throw new Error('User not authenticated');

      await runTransaction(db, async (transaction) => {
        const messageRef = doc(db, `streams/${streamId}/chat`, messageId);
        const messageDoc = await transaction.get(messageRef);

        if (!messageDoc.exists()) {
          throw new Error('Message not found');
        }

        const messageData = messageDoc.data() as StreamChatMessage;
        const reactions = Array.isArray(messageData.reactions) ? messageData.reactions : [];
        const existingReaction = reactions.find(r => r.emoji === emoji);

        if (existingReaction) {
          // Toggle reaction
          if (existingReaction.userIds.includes(currentUser.uid)) {
            // Remove reaction
            existingReaction.userIds = existingReaction.userIds.filter(id => id !== currentUser.uid);
            existingReaction.count = existingReaction.userIds.length;
          } else {
            // Add reaction
            existingReaction.userIds.push(currentUser.uid);
            existingReaction.count = existingReaction.userIds.length;
          }
        } else {
          // Add new reaction
          reactions.push({
            emoji,
            userIds: [currentUser.uid],
            count: 1
          });
        }

        // Remove empty reactions
        const filteredReactions = reactions.filter(r => r.count > 0);
        const reactionCount = filteredReactions.reduce((sum, r) => sum + r.count, 0);

        transaction.update(messageRef, {
          reactions: filteredReactions,
          reactionCount
        });
      });

      console.log(`✅ Reaction ${emoji} toggled on message ${messageId}`);
    } catch (error: any) {
      console.error('Failed to add message reaction:', error.message);
      throw error;
    }
  }

  // Legacy method for backward compatibility
  async sendMessage(streamId: string, message: Omit<ChatMessage, 'id' | 'timestamp'>): Promise<string> {
    try {
      const messageRef = await addDoc(collection(db, `streams/${streamId}/messages`), {
        ...message,
        timestamp: serverTimestamp()
      });
      return messageRef.id;
    } catch (error: any) {
      throw new Error(`Failed to send message: ${error.message}`);
    }
  }

  // Global Chat operations
  async sendGlobalChatMessage(message: Omit<GlobalChatMessage, 'id' | 'timestamp'>): Promise<string> {
    try {
      // Debug: Log authentication state
      const currentUser = auth?.currentUser;
      const isAuth = this.isAuthenticated();
      console.log('🔐 sendGlobalChatMessage - Auth Debug:', {
        hasAuth: !!auth,
        hasCurrentUser: !!currentUser,
        isAuthenticated: isAuth,
        userId: currentUser?.uid,
        userEmail: currentUser?.email,
        authState: currentUser ? 'authenticated' : 'not authenticated'
      });

      // Authentication check
      if (!this.isAuthenticated()) {
        console.warn('❌ Guest user attempted to send global chat message');
        throw new Error('Authentication required to send messages');
      }

      // Debug: Log message data before validation
      console.log('📝 sendGlobalChatMessage - Message Data:', {
        senderId: message.senderId,
        senderName: message.senderName,
        hasAvatar: !!message.senderAvatar,
        textLength: message.text?.length,
        messageType: message.type
      });

      // Validate required fields
      if (!message.senderId?.trim()) {
        throw new Error('Sender ID is required');
      }

      if (!message.text?.trim()) {
        throw new Error('Message text is required');
      }

      if (!message.senderName?.trim()) {
        throw new Error('Sender name is required');
      }

      // Sanitize and prepare message data
      const sanitizedMessage: any = {
        senderId: message.senderId.trim(),
        senderName: message.senderName.trim(),
        text: message.text.trim(),
        type: message.type || 'text',
        timestamp: serverTimestamp()
      };

      // Only include senderAvatar if it's provided and not empty
      if (message.senderAvatar && message.senderAvatar.trim()) {
        sanitizedMessage.senderAvatar = message.senderAvatar.trim();
      }

      // Debug: Log sanitized message before sending
      console.log('✅ sendGlobalChatMessage - Sanitized Data:', {
        ...sanitizedMessage,
        timestamp: '[ServerTimestamp]'
      });

      // Attempt to send message
      console.log('🚀 sendGlobalChatMessage - Attempting to send to Firestore...');
      const messageRef = await addDoc(collection(db, 'globalChat'), sanitizedMessage);
      console.log('✅ sendGlobalChatMessage - Success! Message ID:', messageRef.id);

      return messageRef.id;
    } catch (error: any) {
      // Enhanced error logging
      console.error('❌ sendGlobalChatMessage - Error occurred:', {
        errorCode: error?.code,
        errorMessage: error?.message,
        errorName: error?.name,
        fullError: error
      });

      // Don't log validation errors as they are user input issues
      if (error.message.includes('is required') || error.message.includes('Authentication required')) {
        throw error; // Re-throw validation errors without additional logging
      }

      FirebaseErrorHandler.logError('sendGlobalChatMessage', error);
      throw new Error(`Failed to send global chat message: ${error.message}`);
    }
  }

  async getGlobalChatMessages(limitCount: number = 50): Promise<GlobalChatMessage[]> {
    try {
      // Public read access - no authentication required for viewing messages
      if (!db) {
        console.warn('Firestore not initialized');
        return [];
      }

      const messagesRef = collection(db, 'globalChat');
      const q = query(messagesRef, orderBy('timestamp', 'desc'), limit(limitCount));
      const querySnapshot = await getDocs(q);

      return querySnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      })) as GlobalChatMessage[];
    } catch (error: any) {
      // For permission errors, return empty array silently (expected for guest users)
      if (FirebaseErrorHandler.isPermissionError(error)) {
        // Don't log permission errors as they are expected for guest users
        return [];
      }

      // Only log non-permission errors
      FirebaseErrorHandler.logError('getGlobalChatMessages', error);
      console.error('Failed to get global chat messages:', error.message);
      return [];
    }
  }

  async getStreamMessages(streamId: string, limitCount: number = 50): Promise<ChatMessage[]> {
    try {
      const messagesRef = collection(db, `streams/${streamId}/messages`);
      const q = query(messagesRef, orderBy('timestamp', 'desc'), limit(limitCount));
      const querySnapshot = await getDocs(q);

      return querySnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      })) as ChatMessage[];
    } catch (error: any) {
      throw new Error(`Failed to get messages: ${error.message}`);
    }
  }

  // Direct messaging operations
  async createConversation(participantIds: string[], participantNames: { [userId: string]: string }, participantAvatars: { [userId: string]: string }): Promise<string> {
    try {
      // Check if conversation already exists
      const existingConversation = await this.getConversationByParticipants(participantIds);
      if (existingConversation) {
        return existingConversation.id;
      }

      // Create deterministic conversation ID by sorting participant IDs
      const sortedParticipantIds = [...participantIds].sort();
      const conversationId = sortedParticipantIds.join('|');

      const conversationData: Omit<Conversation, 'id' | 'createdAt' | 'updatedAt'> = {
        participants: participantIds,
        participantNames,
        participantAvatars,
        lastMessageTime: serverTimestamp() as Timestamp,
        unreadCount: participantIds.reduce((acc, userId) => ({ ...acc, [userId]: 0 }), {})
      };

      // Use setDoc with deterministic ID to avoid race conditions
      const conversationRef = doc(db, 'conversations', conversationId);
      await setDoc(conversationRef, {
        ...conversationData,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp()
      });

      return conversationId;
    } catch (error: any) {
      throw new Error(`Failed to create conversation: ${error.message}`);
    }
  }

  async getConversationByParticipants(participantIds: string[]): Promise<Conversation | null> {
    try {
      // Create deterministic conversation ID by sorting participant IDs
      const sortedParticipantIds = [...participantIds].sort();
      const conversationId = sortedParticipantIds.join('|');

      // Direct document lookup using deterministic ID
      const conversationRef = doc(db, 'conversations', conversationId);
      const conversationSnap = await getDoc(conversationRef);

      if (conversationSnap.exists()) {
        return { id: conversationSnap.id, ...conversationSnap.data() } as Conversation;
      }

      return null;
    } catch (error: any) {
      console.error('Failed to get conversation by participants:', error.message);
      return null;
    }
  }

  async getConversationById(conversationId: string): Promise<Conversation | null> {
    try {
      const conversationRef = doc(db, 'conversations', conversationId)
      const conversationSnap = await getDoc(conversationRef)
      if (conversationSnap.exists()) {
        return { id: conversationSnap.id, ...conversationSnap.data() } as Conversation
      }
      return null
    } catch (error: any) {
      console.error('Failed to get conversation by id:', error.message)
      return null
    }
  }

  async sendDirectMessage(conversationId: string, message: Omit<DirectMessage, 'id' | 'timestamp'>): Promise<string> {
    try {
      // Use transaction for atomic message sending and unread count update
      return await runTransaction(db, async (transaction) => {
        // Get conversation document first
        const conversationRef = doc(db, 'conversations', conversationId);
        const conversationSnap = await transaction.get(conversationRef);

        if (!conversationSnap.exists()) {
          throw new Error('Conversation not found');
        }

        const conversation = conversationSnap.data() as Conversation;

        // Validate that recipient is a participant
        if (!conversation.participants.includes(message.recipientId)) {
          throw new Error('Recipient is not a participant in this conversation');
        }

        // Validate that sender is a participant
        if (!conversation.participants.includes(message.senderId)) {
          throw new Error('Sender is not a participant in this conversation');
        }

        // Add the message
        const messageRef = doc(collection(db, `conversations/${conversationId}/messages`));
        transaction.set(messageRef, {
          ...message,
          timestamp: serverTimestamp()
        });

        // Update conversation with last message and conditionally increment unread count
        const updateData: any = {
          lastMessage: {
            text: message.text,
            senderId: message.senderId,
            senderName: message.senderName,
            timestamp: serverTimestamp()
          },
          lastMessageTime: serverTimestamp(),
          updatedAt: serverTimestamp()
        };

        // Only increment unread count if recipient is a valid participant
        updateData[`unreadCount.${message.recipientId}`] = increment(1);

        transaction.update(conversationRef, updateData);

        return messageRef.id;
      });
    } catch (error: any) {
      throw new Error(`Failed to send direct message: ${error.message}`);
    }
  }

  async getConversationMessages(conversationId: string, limitCount: number = 50): Promise<DirectMessage[]> {
    try {
      const messagesRef = collection(db, `conversations/${conversationId}/messages`);
      const q = query(messagesRef, orderBy('timestamp', 'desc'), limit(limitCount));
      const querySnapshot = await getDocs(q);

      return querySnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      })) as DirectMessage[];
    } catch (error: any) {
      throw new Error(`Failed to get conversation messages: ${error.message}`);
    }
  }

  async getUserConversations(userId: string): Promise<Conversation[]> {
    try {
      const conversationsRef = collection(db, 'conversations');
      const q = query(
        conversationsRef,
        where('participants', 'array-contains', userId),
        orderBy('lastMessageTime', 'desc')
      );
      const querySnapshot = await getDocs(q);

      return querySnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      })) as Conversation[];
    } catch (error: any) {
      console.error('Failed to get user conversations:', error.message);
      return [];
    }
  }

  // Enhanced streaming methods
  async createStream(streamId: string, streamData: Partial<Stream>): Promise<void> {
    try {
      this.requireAuth();
      const currentUser = auth.currentUser;
      if (!currentUser) throw new Error('User not authenticated');

      const defaultChatSettings: ChatSettings = {
        slowMode: 0,
        subscribersOnly: false,
        moderatorsOnly: false,
        profanityFilter: true,
        linkFilter: false,
        maxMessageLength: 500
      };

      // Create stream document with sanitized data (no undefined values)
      const streamDoc: Partial<Stream> = {
        ...streamData,
        id: streamId,
        hostId: currentUser.uid,
        hostName: currentUser.displayName || 'Unknown Host',
        hostAvatar: currentUser.photoURL || null, // Use null instead of undefined
        isActive: true,
        isPublic: streamData.isPublic ?? true,
        viewerCount: 1, // Host counts as viewer
        maxViewers: 1,
        totalViewers: 1,
        participants: [{
          id: currentUser.uid,
          name: currentUser.displayName || 'Host',
          avatar: currentUser.photoURL || null, // Use null instead of undefined
          role: 'host',
          isHost: true, // Ensure streaming layer detects host presence
          joinedAt: serverTimestamp() as Timestamp,
          lastSeen: serverTimestamp() as Timestamp,
          isMuted: false,
          isBanned: false,
          isActive: true
        }],
        allowChat: streamData.allowChat ?? true,
        allowReactions: streamData.allowReactions ?? true,
        isRecording: false,
        quality: streamData.quality || 'auto',
        moderatorIds: [],
        bannedUserIds: [],
        chatSettings: defaultChatSettings,
        totalMessages: 0,
        totalReactions: 0,
        totalGifts: 0,
        revenue: 0,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
        lastActivity: serverTimestamp(),
        startedAt: serverTimestamp()
      };

      // Sanitize the stream document to remove any undefined values
      const sanitizedStreamDoc = UserDataSanitizer.removeUndefinedValues(streamDoc);

      const streamsRef = collection(db, 'streams');

      // TEMPORARY WORKAROUND: Handle permission errors gracefully
      try {
        await setDoc(doc(streamsRef, streamId), sanitizedStreamDoc);
        console.log(`✅ Created stream ${streamId} with enhanced schema`);
      } catch (permissionError: any) {
        if (permissionError?.code === 'permission-denied') {
          console.warn('🚨 FIREBASE RULES NOT DEPLOYED - Stream creation blocked by permissions');
          console.warn('📋 To fix: Deploy the updated firestore.rules to Firebase Console');
          console.warn('🔗 Go to: https://console.firebase.google.com/project/vulugo/firestore/rules');

          // Create a more user-friendly error message
          throw new Error('Live streaming is temporarily unavailable. Please contact support or try again later.');
        }
        throw permissionError;
      }
    } catch (error: any) {
      console.error('Failed to create stream:', error.message);
      throw error;
    }
  }

  // Enhanced participant management
  async joinStream(streamId: string): Promise<void> {
    try {
      this.requireAuth();
      const currentUser = auth.currentUser;
      if (!currentUser) throw new Error('User not authenticated');

      await runTransaction(db, async (transaction) => {
        const streamRef = doc(db, 'streams', streamId);
        const streamDoc = await transaction.get(streamRef);

        if (!streamDoc.exists()) {
          throw new Error('Stream not found');
        }

        const streamData = streamDoc.data() as Stream;
        if (!streamData.isActive) {
          throw new Error('Stream is not active');
        }

        // Check if user is already in stream
        const participants = Array.isArray(streamData.participants) ? streamData.participants : [];
        const existingParticipant = participants.find(p => p.id === currentUser.uid);
        if (existingParticipant) {
          // Update existing participant as active
          const updatedParticipants = participants.map(p =>
            p.id === currentUser.uid
              ? { ...p, isActive: true, lastSeen: serverTimestamp() as Timestamp }
              : p
          );

          transaction.update(streamRef, {
            participants: updatedParticipants,
            lastActivity: serverTimestamp()
          });
        } else {
          // Add new participant
          const newParticipant: StreamParticipant = {
            id: currentUser.uid,
            name: currentUser.displayName || 'Viewer',
            avatar: currentUser.photoURL || undefined,
            role: 'viewer',
            joinedAt: serverTimestamp() as Timestamp,
            lastSeen: serverTimestamp() as Timestamp,
            isMuted: false,
            isBanned: false,
            isActive: true
          };

          const updatedParticipants = [...participants, newParticipant];
          const newViewerCount = (streamData.viewerCount ?? 0) + 1;
          const newMaxViewers = Math.max(streamData.maxViewers ?? 0, newViewerCount);

          transaction.update(streamRef, {
            participants: updatedParticipants,
            viewerCount: newViewerCount,
            maxViewers: newMaxViewers,
            totalViewers: streamData.totalViewers + 1,
            lastActivity: serverTimestamp()
          });
        }

        // Create participant detail record with sanitized data
        const participantRef = doc(db, `streams/${streamId}/participants`, currentUser.uid);
        transaction.set(participantRef, {
          userId: currentUser.uid,
          streamId: streamId,
          displayName: currentUser.displayName || 'Viewer',
          username: currentUser.email?.split('@')[0] || 'viewer',
          avatar: currentUser.photoURL || null, // Use null instead of undefined
          role: 'viewer',
          joinedAt: serverTimestamp(),
          isActive: true,
          lastSeen: serverTimestamp(),
          connectionQuality: 'good',
          messagesSent: 0,
          reactionsGiven: 0,
          giftsGiven: 0,
          giftValue: 0,
          isMuted: false,
          isBanned: false,
          warnings: 0,
          createdAt: serverTimestamp(),
          updatedAt: serverTimestamp()
        });
      });

      console.log(`✅ User ${currentUser.uid} joined stream ${streamId}`);
    } catch (error: any) {
      console.error('Failed to join stream:', error.message);
      throw error;
    }
  }

  async leaveStream(streamId: string): Promise<void> {
    try {
      this.requireAuth();
      const currentUser = auth.currentUser;
      if (!currentUser) throw new Error('User not authenticated');

      await runTransaction(db, async (transaction) => {
        const streamRef = doc(db, 'streams', streamId);
        const streamDoc = await transaction.get(streamRef);

        if (!streamDoc.exists()) {
          throw new Error('Stream not found');
        }

        const streamData = streamDoc.data() as Stream;

        // Remove participant from stream
        const participants = Array.isArray(streamData.participants) ? streamData.participants : [];
        const updatedParticipants = participants.filter(p => p.id !== currentUser.uid);
        const newViewerCount = Math.max(0, (streamData.viewerCount ?? 0) - 1);

        transaction.update(streamRef, {
          participants: updatedParticipants,
          viewerCount: newViewerCount,
          lastActivity: serverTimestamp()
        });

        // Update participant detail record
        const participantRef = doc(db, `streams/${streamId}/participants`, currentUser.uid);
        transaction.update(participantRef, {
          isActive: false,
          leftAt: serverTimestamp(),
          updatedAt: serverTimestamp()
        });
      });

      console.log(`✅ User ${currentUser.uid} left stream ${streamId}`);
    } catch (error: any) {
      console.error('Failed to leave stream:', error.message);
      throw error;
    }
  }

  async getActiveStreams(): Promise<any[]> {
    try {
      // Public read access - no authentication required for viewing streams
      if (!db) {
        console.warn('Firestore not initialized');
        return [];
      }

      const streamsRef = collection(db, 'streams');
      const q = query(
        streamsRef,
        where('isActive', '==', true),
        orderBy('startedAt', 'desc')
      );
      const querySnapshot = await getDocs(q);

      return querySnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));
    } catch (error: any) {
      FirebaseErrorHandler.logError('getActiveStreams', error);

      // For permission errors, return empty array silently (expected for guests)
      if (FirebaseErrorHandler.isPermissionError(error)) {
        return [];
      }

      // For other errors, return empty array but log more prominently
      console.error('Failed to get active streams:', error.message);
      return [];
    }
  }

  async getAllStreams(): Promise<any[]> {
    try {
      // Get all streams regardless of status (for cleanup purposes)
      if (!db) {
        console.warn('Firestore not initialized');
        return [];
      }

      const streamsRef = collection(db, 'streams');
      const q = query(streamsRef, orderBy('startedAt', 'desc'));
      const querySnapshot = await getDocs(q);

      return querySnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));
    } catch (error: any) {
      FirebaseErrorHandler.logError('getAllStreams', error);
      console.error('Error getting all streams:', error.message);
      return [];
    }
  }

  async getStreamById(streamId: string): Promise<any | null> {
    try {
      if (!db) {
        console.warn('Firestore not initialized');
        return null;
      }

      const streamRef = doc(db, 'streams', streamId);
      const streamDoc = await getDoc(streamRef);

      if (streamDoc.exists()) {
        return {
          id: streamDoc.id,
          ...streamDoc.data()
        };
      }

      return null;
    } catch (error: any) {
      FirebaseErrorHandler.logError('getStreamById', error);
      console.error('Error getting stream by ID:', error.message);
      return null;
    }
  }

  async updateStreamParticipants(streamId: string, participants: any[]): Promise<void> {
    try {
      const streamRef = doc(db, 'streams', streamId);
      await updateDoc(streamRef, {
        participants,
        updatedAt: serverTimestamp()
      });
    } catch (error: any) {
      console.error('Failed to update stream participants:', error.message);
      throw error;
    }
  }

  async updateStreamViewerCount(streamId: string, viewerCount: number): Promise<void> {
    try {
      const streamRef = doc(db, 'streams', streamId);
      await updateDoc(streamRef, {
        viewerCount,
        updatedAt: serverTimestamp()
      });
    } catch (error: any) {
      console.error('Failed to update stream viewer count:', error.message);
      throw error;
    }
  }

  async updateStreamStatus(streamId: string, isActive: boolean): Promise<void> {
    try {
      const streamRef = doc(db, 'streams', streamId);
      await updateDoc(streamRef, {
        isActive,
        updatedAt: serverTimestamp()
      });
    } catch (error: any) {
      console.error('Failed to update stream status:', error.message);
      throw error;
    }
  }

  onStreamUpdate(streamId: string, callback: (data: any) => void): () => void {
    const streamRef = doc(db, 'streams', streamId);
    return onSnapshot(streamRef, (doc) => {
      if (doc.exists()) {
        callback(doc.data());
      }
    });
  }

  onActiveStreamsUpdate(callback: (streams: any[]) => void): () => void {
    try {
      // Public read access - no authentication required for viewing streams
      if (!db) {
        console.warn('Firestore not initialized');
        callback([]);
        return () => {}; // Return empty unsubscribe function
      }

      const streamsRef = collection(db, 'streams');
      const q = query(
        streamsRef,
        where('isActive', '==', true),
        orderBy('startedAt', 'desc')
      );

      return onSnapshot(q,
        (querySnapshot) => {
          const streams = querySnapshot.docs.map(doc => ({
            id: doc.id,
            ...doc.data()
          }));
          console.log(`🔄 Firebase real-time update: ${streams.length} streams received`);
          callback(streams);
        },
        (error) => {
          FirebaseErrorHandler.logError('onActiveStreamsUpdate', error);

          // For permission errors, silently return empty array (expected for guests)
          if (FirebaseErrorHandler.isPermissionError(error)) {
            callback([]);
            return;
          }

          // For other errors, log and return empty array
          console.error('Error in active streams listener:', error);
          callback([]);
        }
      );
    } catch (error: any) {
      console.error('Failed to set up active streams listener:', error.message);
      callback([]);
      return () => {}; // Return empty unsubscribe function
    }
  }

  async markMessagesAsRead(conversationId: string, userId: string): Promise<void> {
    try {
      const conversationRef = doc(db, 'conversations', conversationId);
      await updateDoc(conversationRef, {
        [`unreadCount.${userId}`]: 0,
        updatedAt: serverTimestamp()
      });
    } catch (error: any) {
      console.error('Failed to mark messages as read:', error.message);
    }
  }



  async getLiveStreams(): Promise<LiveStream[]> {
    try {
      const streamsRef = collection(db, 'streams');
      const q = query(streamsRef, where('isActive', '==', true), orderBy('startedAt', 'desc'));
      const querySnapshot = await getDocs(q);

      return querySnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      })) as LiveStream[];
    } catch (error: any) {
      throw new Error(`Failed to get live streams: ${error.message}`);
    }
  }

  async endStream(streamId: string, endReason: string = 'system_cleanup'): Promise<void> {
    try {
      const streamRef = doc(db, 'streams', streamId);
      await updateDoc(streamRef, {
        isActive: false,
        endedAt: serverTimestamp(),
        endReason: endReason
      });
    } catch (error: any) {
      throw new Error(`Failed to end stream: ${error.message}`);
    }
  }

  // Get all streams (including inactive ones) for cleanup purposes
  async getAllStreams(): Promise<any[]> {
    try {
      const streamsRef = collection(db, 'streams');
      const snapshot = await getDocs(streamsRef);

      const streams = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));

      console.log(`📊 [FIRESTORE] Retrieved ${streams.length} total streams (active and inactive)`);
      return streams;
    } catch (error: any) {
      throw new Error(`Failed to get all streams: ${error.message}`);
    }
  }

  // Real-time listeners
  onStreamMessages(streamId: string, callback: (messages: ChatMessage[]) => void): () => void {
    const messagesRef = collection(db, `streams/${streamId}/messages`);
    const q = query(messagesRef, orderBy('timestamp', 'desc'), limit(50));
    
    return onSnapshot(q, (querySnapshot) => {
      const messages = querySnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      })) as ChatMessage[];
      callback(messages);
    });
  }

  onLiveStreams(callback: (streams: LiveStream[]) => void): () => void {
    try {
      // Public read access - no authentication required for viewing streams
      if (!db) {
        console.warn('Firestore not initialized');
        callback([]);
        return () => {}; // Return empty unsubscribe function
      }

      const streamsRef = collection(db, 'streams');
      const q = query(streamsRef, where('isActive', '==', true), orderBy('startedAt', 'desc'));

      return onSnapshot(q,
        (querySnapshot) => {
          const streams = querySnapshot.docs.map(doc => ({
            id: doc.id,
            ...doc.data()
          })) as LiveStream[];
          callback(streams);
        },
        (error) => {
          console.error('Error in live streams listener:', error);
          // Call callback with empty array on error to prevent app crashes
          callback([]);
        }
      );
    } catch (error: any) {
      console.error('Failed to set up live streams listener:', error.message);
      callback([]);
      return () => {}; // Return empty unsubscribe function
    }
  }

  // Real-time listeners for direct messages
  onConversationMessages(conversationId: string, callback: (messages: DirectMessage[]) => void): () => void {
    const messagesRef = collection(db, `conversations/${conversationId}/messages`);
    const q = query(messagesRef, orderBy('timestamp', 'desc'), limit(50));

    return onSnapshot(q, (querySnapshot) => {
      const messages = querySnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      })) as DirectMessage[];
      callback(messages);
    });
  }

  // Global Chat real-time listener
  onGlobalChatMessages(callback: (messages: GlobalChatMessage[]) => void): () => void {
    try {
      // Public read access - no authentication required for viewing messages
      if (!db) {
        console.warn('Firestore not initialized');
        callback([]);
        return () => {}; // Return empty unsubscribe function
      }

      const messagesRef = collection(db, 'globalChat');
      const q = query(messagesRef, orderBy('timestamp', 'desc'), limit(50));

      return onSnapshot(q,
        (querySnapshot) => {
          const messages = querySnapshot.docs.map(doc => ({
            id: doc.id,
            ...doc.data()
          })) as GlobalChatMessage[];
          callback(messages);
        },
        (error) => {
          // For permission errors, silently return empty array (expected for guest users)
          if (FirebaseErrorHandler.isPermissionError(error)) {
            // Don't log permission errors as they are expected for guest users
            callback([]);
            return;
          }

          // Only log non-permission errors
          FirebaseErrorHandler.logError('onGlobalChatMessages', error);
          console.error('Error in global chat messages listener:', error);
          callback([]);
        }
      );
    } catch (error: any) {
      console.error('Failed to set up global chat messages listener:', error.message);
      callback([]);
      return () => {}; // Return empty unsubscribe function
    }
  }

  onUserConversations(
    userId: string,
    callback: (conversations: Conversation[]) => void,
    onError?: (error: any) => void
  ): () => void {
    const conversationsRef = collection(db, 'conversations');
    const q = query(
      conversationsRef,
      where('participants', 'array-contains', userId),
      orderBy('lastMessageTime', 'desc')
    );

    return onSnapshot(
      q,
      (querySnapshot) => {
        try {
          const conversations = querySnapshot.docs.map(doc => ({
            id: doc.id,
            ...doc.data()
          })) as Conversation[];
          callback(conversations);
        } catch (error) {
          console.error('Error processing conversations snapshot:', error);
          if (onError) {
            onError(error);
          }
        }
      },
      (error) => {
        console.error('Firestore listener error in onUserConversations:', error);
        if (onError) {
          onError(error);
        } else {
          // Fallback: call callback with empty array if no error handler provided
          callback([]);
        }
      }
    );
  }

  // Friend management methods
  async getUserFriends(userId: string): Promise<any[]> {
    try {
      const userRef = doc(db, 'users', userId);
      const userSnap = await getDoc(userRef);

      if (userSnap.exists()) {
        const userData = userSnap.data();
        const friendsIds = userData.friends || [];

        // Get friend details using batched reads
        const friends = await this.getFriendsBatch(friendsIds, userData);
        return friends;
      }

      return [];
    } catch (error: any) {
      // Handle permission errors gracefully
      if (FirebaseErrorHandler.isPermissionError(error)) {
        return []; // Return empty array for permission errors
      }

      console.error('Failed to get user friends:', error.message);
      FirebaseErrorHandler.logError('getUserFriends', error);
      return [];
    }
  }

  private getUserStatus(lastSeen: Timestamp): 'online' | 'offline' | 'busy' | 'idle' {
    if (!lastSeen) return 'offline';

    const now = Timestamp.now();
    const diffMinutes = (now.toMillis() - lastSeen.toMillis()) / (1000 * 60);

    if (diffMinutes < 5) return 'online';
    if (diffMinutes < 30) return 'idle';
    return 'offline';
  }

  async addFriend(userId: string, friendId: string): Promise<void> {
    try {
      await runTransaction(db, async (transaction) => {
        const userRef = doc(db, 'users', userId);
        const friendRef = doc(db, 'users', friendId);

        // Read both user documents to verify they exist
        const userDoc = await transaction.get(userRef);
        const friendDoc = await transaction.get(friendRef);

        if (!userDoc.exists()) {
          throw new Error(`User ${userId} does not exist`);
        }
        if (!friendDoc.exists()) {
          throw new Error(`User ${friendId} does not exist`);
        }

        // Update both documents within the same transaction
        transaction.update(userRef, {
          friends: arrayUnion(friendId),
          updatedAt: serverTimestamp()
        });

        transaction.update(friendRef, {
          friends: arrayUnion(userId),
          updatedAt: serverTimestamp()
        });
      });
    } catch (error: any) {
      console.error('Failed to add friend:', error.message);
      throw error;
    }
  }

  async removeFriend(userId: string, friendId: string): Promise<void> {
    try {
      await runTransaction(db, async (transaction) => {
        const userRef = doc(db, 'users', userId);
        const friendRef = doc(db, 'users', friendId);

        // Read both user documents to verify they exist
        const userDoc = await transaction.get(userRef);
        const friendDoc = await transaction.get(friendRef);

        if (!userDoc.exists()) {
          throw new Error(`User ${userId} does not exist`);
        }
        if (!friendDoc.exists()) {
          throw new Error(`User ${friendId} does not exist`);
        }

        // Update both documents within the same transaction
        transaction.update(userRef, {
          friends: arrayRemove(friendId),
          updatedAt: serverTimestamp()
        });

        transaction.update(friendRef, {
          friends: arrayRemove(userId),
          updatedAt: serverTimestamp()
        });
      });
    } catch (error: any) {
      console.error('Failed to remove friend:', error.message);
      throw error;
    }
  }

  // Helper method for batched friend reads
  private async getFriendsBatch(friendsIds: string[], userData: any): Promise<any[]> {
    if (friendsIds.length === 0) return [];

    // Process friends in chunks to avoid hitting Firestore limits
    const CHUNK_SIZE = 10;
    const chunks = [];
    for (let i = 0; i < friendsIds.length; i += CHUNK_SIZE) {
      chunks.push(friendsIds.slice(i, i + CHUNK_SIZE));
    }

    const allFriends = [];

    // Process each chunk
    for (const chunk of chunks) {
      // Create document references for this chunk
      const friendRefs = chunk.map(friendId => doc(db, 'users', friendId));

      // Batch read all documents in this chunk
      const friendSnaps = await Promise.all(friendRefs.map(ref => getDoc(ref)));

      // Process results
      for (let i = 0; i < friendSnaps.length; i++) {
        const friendSnap = friendSnaps[i];
        const friendId = chunk[i];

        if (friendSnap.exists()) {
          const friendData = friendSnap.data();

          // Compute isCloseFriend from actual data
          const closeFriendsIds = userData.closeFriends || [];
          const isCloseFriend = Array.isArray(closeFriendsIds) && closeFriendsIds.includes(friendId);

          allFriends.push({
            id: friendId,
            name: friendData.displayName,
            avatar: friendData.photoURL || 'https://ui-avatars.com/api/?name=' + encodeURIComponent(friendData.displayName || friendData.username || 'User') + '&background=6E69F4&color=FFFFFF&size=150',
            status: this.getUserStatus(friendData.lastSeen),
            isCloseFriend: isCloseFriend
          });
        }
      }
    }

    return allFriends;
  }

  // Real-time listener for user's friends
  onUserFriends(userId: string, callback: (friends: any[]) => void): () => void {
    const userRef = doc(db, 'users', userId);

    return onSnapshot(userRef, async (userSnap) => {
      if (userSnap.exists()) {
        const userData = userSnap.data();
        const friendsIds = userData.friends || [];

        // Get friend details using batched reads
        const friends = await this.getFriendsBatch(friendsIds, userData);
        callback(friends);
      } else {
        callback([]);
      }
    });
  }

  // Search users by username only with progressive matching
  async searchUsersByUsername(searchQuery: string, currentUserId: string): Promise<AppUser[]> {
    try {
      const searchTerm = searchQuery.toLowerCase().trim();
      if (!searchTerm) return [];

      // Use Firestore range query for progressive prefix matching
      const usersRef = collection(db, 'users');
      const q = query(
        usersRef,
        where('usernameLower', '>=', searchTerm),
        where('usernameLower', '<=', searchTerm + '\uf8ff'),
        orderBy('usernameLower'),
        limit(20)
      );

      const querySnapshot = await getDocs(q);
      const results: AppUser[] = [];

      querySnapshot.forEach((doc) => {
        const userData = doc.data() as AppUser;
        // Exclude current user
        if (userData.uid !== currentUserId) {
          results.push(userData);
        }
      });

      // Sort results by relevance with progressive matching algorithm
      return results.sort((a, b) => {
        const aUsername = (a.username || '').toLowerCase();
        const bUsername = (b.username || '').toLowerCase();

        // Calculate relevance scores
        const aScore = this.calculateUsernameRelevance(aUsername, searchTerm);
        const bScore = this.calculateUsernameRelevance(bUsername, searchTerm);

        // Higher scores first (more relevant)
        if (aScore !== bScore) {
          return bScore - aScore;
        }

        // If same relevance, sort alphabetically
        return aUsername.localeCompare(bUsername);
      });
    } catch (error: any) {
      console.error('Failed to search users by username:', error.message);
      return [];
    }
  }

  // Calculate username relevance score for progressive matching
  private calculateUsernameRelevance(username: string, searchTerm: string): number {
    if (!username || !searchTerm) return 0;

    const lowerUsername = username.toLowerCase();
    const lowerSearchTerm = searchTerm.toLowerCase();

    // Exact match gets highest score
    if (lowerUsername === lowerSearchTerm) return 1000;

    // Starts with search term gets high score
    if (lowerUsername.startsWith(lowerSearchTerm)) {
      // Shorter usernames with same prefix get higher score
      const lengthBonus = Math.max(0, 100 - (lowerUsername.length - lowerSearchTerm.length));
      return 800 + lengthBonus;
    }

    // Contains search term gets medium score
    if (lowerUsername.includes(lowerSearchTerm)) {
      // Earlier position in username gets higher score
      const position = lowerUsername.indexOf(lowerSearchTerm);
      const positionBonus = Math.max(0, 50 - position);
      return 400 + positionBonus;
    }

    // Character similarity for partial matches
    let matchingChars = 0;
    for (let i = 0; i < Math.min(lowerUsername.length, lowerSearchTerm.length); i++) {
      if (lowerUsername[i] === lowerSearchTerm[i]) {
        matchingChars++;
      } else {
        break; // Stop at first non-matching character for prefix similarity
      }
    }

    // Score based on matching prefix characters
    return matchingChars * 10;
  }

  /**
   * Update user photos array
   */
  async updateUserPhotos(userId: string, photos: Array<{ id: string; uri: string; isProfile: boolean; order: number }>): Promise<void> {
    try {
      const userRef = doc(db, 'users', userId);
      await updateDoc(userRef, {
        photos: photos,
        photoURL: photos.find(p => p.isProfile)?.uri || null,
        updatedAt: serverTimestamp()
      });
      console.log(`✅ User photos updated for ${userId}`);
    } catch (error: any) {
      console.error('Failed to update user photos:', error);
      FirebaseErrorHandler.logError('updateUserPhotos', error);
      throw new Error(`Failed to update user photos: ${error.message}`);
    }
  }

  /**
   * Get user photos
   */
  async getUserPhotos(userId: string): Promise<Array<{ id: string; uri: string; isProfile: boolean; order: number }>> {
    try {
      const userRef = doc(db, 'users', userId);
      const userDoc = await getDoc(userRef);

      if (!userDoc.exists()) {
        return [];
      }

      const userData = userDoc.data();
      return userData.photos || [];
    } catch (error: any) {
      console.error('Failed to get user photos:', error);
      FirebaseErrorHandler.logError('getUserPhotos', error);
      return [];
    }
  }
}

export const firestoreService = new FirestoreService();
export default firestoreService;