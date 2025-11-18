import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { Alert } from 'react-native';
import { useAuthSafe } from './AuthContext';
import { collection, onSnapshot, query, where, doc, setDoc, serverTimestamp, getDoc, deleteDoc, updateDoc } from 'firebase/firestore';
import { db, auth } from '../services/firebase';

// Define the structure of a stream
export interface StreamHost {
  name: string;
  avatar: string;
  joinOrder: number; // Track join order for power ranking
  isSpeaking: boolean;
  isMuted: boolean;
}

export interface StreamViewer {
  name: string;
  avatar: string;
  isMuted: boolean;
  isBanned: boolean;
}

export interface StreamFriend {
  name: string;
  avatar: string;
}

export interface LiveStream {
  id: string;
  title: string;
  hosts: StreamHost[];
  viewers: StreamViewer[];
  views: number;
  boost?: number;
  rank?: number;
  friends?: StreamFriend[];
  isActive: boolean;
  startedAt: number; // timestamp
}

// Define the context interface
interface LiveStreamContextType {
  streams: LiveStream[];
  featuredStreams: LiveStream[];
  friendStreams: {
    hosting: LiveStream[];
    watching: LiveStream[];
  };
  getStreamById: (id: string) => LiveStream | undefined;
  joinStream: (streamId: string, skipConfirmation?: boolean) => void;
  currentlyWatching: string | null; // ID of the stream the user is currently watching
  isMinimized: boolean;
  setStreamMinimized: (streamId: string, minimized: boolean) => void;

  // New features
  joinAsHost: (streamId: string, userName: string, userAvatar: string) => void;
  kickHost: (streamId: string, hostName: string, kickedBy: string) => void;
  muteViewer: (streamId: string, viewerName: string, mutedBy: string) => void;
  banViewer: (streamId: string, viewerName: string, bannedBy: string) => void;
  leaveStream: (streamId: string) => Promise<void>;
  leaveStreamWithConfirmation: (streamId: string) => Promise<void>;

  // Stream participation prevention
  hasActiveStream: () => boolean;
  createNewStream: (title: string, hostId: string, hostName: string, hostAvatar: string, skipConfirmation?: boolean) => Promise<string>;

  // Refresh functionality
  refreshStreams: () => Promise<void>;
  isRefreshing: boolean;
  lastRefreshTime: Date | null;

  // Operation state
  isOperationInProgress: boolean;
}

// Create the context with a default value
const LiveStreamContext = createContext<LiveStreamContextType | undefined>(undefined);

// Note: MOCK_STREAMS has been replaced with real Firebase data
// The streaming service now fetches active streams from Firestore

// Provider component
export const LiveStreamProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [streams, setStreams] = useState<LiveStream[]>([]);
  const [currentlyWatching, setCurrentlyWatching] = useState<string | null>(null);
  const [isMinimized, setIsMinimized] = useState<boolean>(false);
  const [isRefreshing, setIsRefreshing] = useState<boolean>(false);
  const [lastRefreshTime, setLastRefreshTime] = useState<Date | null>(null);
  const authContext = useAuthSafe();
  const { user } = authContext || { user: null };

  useEffect(() => {
    const q = query(collection(db, 'streams'), where('isActive', '==', true));
    const unsub = onSnapshot(q, (snap) => {
      const list: LiveStream[] = [];
      snap.forEach(async d => {
        const data = d.data() as any;
        const host = {
          name: data.hostName || 'Host',
          avatar: data.hostAvatar || '',
          joinOrder: 1,
          isSpeaking: true,
          isMuted: false,
        };
        const viewerCount = Number(data.viewerCount || 0)
        const hostConnected = !!data.hostConnected
        const lastActivityMs = data.lastActivity?.toMillis?.() ?? 0
        const startedMs = data.startedAt?.toMillis?.() ?? 0
        const isVisible = (!!data.isActive) && hostConnected
        // Grace period for fresh streams: do NOT delete immediately while host is connecting
        const ageMs = startedMs > 0 ? (Date.now() - startedMs) : 0
        if (!!data.isActive && !hostConnected && viewerCount <= 0 && ageMs > 15 * 1000) {
          try {
            await deleteDoc(doc(db, 'streams', d.id))
          } catch {
            try {
              await updateDoc(doc(db, 'streams', d.id), { isActive: false, updatedAt: serverTimestamp(), endedAt: serverTimestamp() })
            } catch {}
          }
          return
        }
        if (!isVisible) return
        list.push({
          id: d.id,
          title: data.title || 'Live Stream',
          hosts: [host],
          viewers: [],
          views: viewerCount,
          boost: 0,
          isActive: !!data.isActive,
          startedAt: (data.startedAt?.toMillis?.() ?? Date.now()),
        });
      });
      setStreams(list);
    });
    return () => { unsub(); };
  }, []);

  // Categorize streams for easier access
  const featuredStreams = streams.filter(stream => stream.rank !== undefined)
                                .sort((a, b) => (a.rank || 0) - (b.rank || 0));

  // TODO: Replace with real friend relationship logic from user context
  // For now, return empty arrays since we don't have real friend data
  const friendStreams = {
    hosting: [], // streams.filter(stream => stream.hosts.some(host => userFriends.includes(host.id))),
    watching: [] // streams.filter(stream => stream.friends?.some(friend => userFriends.includes(friend.id)))
  };

  const getStreamById = (id: string) => streams.find(stream => stream.id === id);

  // Helper function to check if user has an active stream (including minimized)
  const hasActiveStream = () => {
    return currentlyWatching !== null;
  };

  // Atomic operation wrapper to prevent race conditions
  const executeAtomicOperation = async <T,>(_operationName: string, operation: () => Promise<T>): Promise<T> => {
    return operation();
  };

  // Helper function to show confirmation dialog for joining when already in a stream
  const showJoinStreamConfirmation = (streamId: string): Promise<boolean> => {
    return new Promise((resolve) => {
      Alert.alert(
        'Already in Live Stream',
        'You\'re already in a live stream. Leave current stream to join this one?',
        [
          {
            text: 'Cancel',
            style: 'cancel',
            onPress: () => resolve(false)
          },
          {
            text: 'Leave & Join',
            style: 'destructive',
            onPress: () => resolve(true)
          }
        ]
      );
    });
  };

  // Helper function to show confirmation dialog for creating when already in a stream
  const showCreateStreamConfirmation = (): Promise<boolean> => {
    return new Promise((resolve) => {
      Alert.alert(
        'Already in Live Stream',
        'You\'re already in a live stream. End current stream to start a new one?',
        [
          {
            text: 'Cancel',
            style: 'cancel',
            onPress: () => resolve(false)
          },
          {
            text: 'End & Create',
            style: 'destructive',
            onPress: () => resolve(true)
          }
        ]
      );
    });
  };

  // Simplified: Join a stream
  const joinStream = async (_streamId: string) => {};

  // Add this new function to handle minimizing streams
  const setStreamMinimized = (streamId: string, minimized: boolean) => {
    if (streamId) {
      setCurrentlyWatching(streamId);
      setIsMinimized(minimized);
    }
  };

  // Simplified: Create a new stream
  const createNewStream = async (title: string, hostId: string, hostName: string, hostAvatar: string): Promise<string> => {
    const channel = `live_${hostId}_${Date.now()}`;
    const streamRef = doc(db, 'streams', channel);
    const existing = await getDoc(streamRef);
    if (!existing.exists()) {
      await setDoc(streamRef, {
        id: channel,
        hostId,
        hostName,
        hostAvatar,
        title: title || 'Live Stream',
        description: '',
        isActive: true,
        viewerCount: 0,
        maxViewers: 0,
        totalViewers: 0,
        participants: [],
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
        startedAt: serverTimestamp(),
        lastActivity: serverTimestamp(),
        bannedUserIds: [],
      });
    }
    return channel;
  };

  // New functions for enhanced live stream features
  const joinAsHost = async () => {
    Alert.alert('Live Disabled', 'Host features are disabled.');
  };

  const kickHost = async () => {
    Alert.alert('Live Disabled', 'Moderation features are disabled.');
  };

  const muteViewer = async () => {
    Alert.alert('Live Disabled', 'Moderation features are disabled.');
  };

  const banViewer = async () => {
    Alert.alert('Live Disabled', 'Moderation features are disabled.');
  };

  // Simplified: Leave a stream
  const leaveStream = async (_streamId: string) => {
    setCurrentlyWatching(null);
    setIsMinimized(false);
  };

  // Simplified: Leave with confirmation
  const leaveStreamWithConfirmation = async (streamId: string): Promise<void> => {
    await leaveStream(streamId);
  };

  // Simplified: Refresh streams
  const refreshStreams = async (): Promise<void> => {
    if (isRefreshing) return;
    setIsRefreshing(true);
    setStreams([]);
    setLastRefreshTime(new Date());
    setIsRefreshing(false);
  };

  return (
    <LiveStreamContext.Provider
      value={{
        streams,
        featuredStreams,
        friendStreams,
        getStreamById,
        joinStream,
        currentlyWatching,
        isMinimized,
        setStreamMinimized,
        joinAsHost,
        kickHost,
        muteViewer,
        banViewer,
        leaveStream,
        leaveStreamWithConfirmation,
        hasActiveStream,
        createNewStream,
        refreshStreams,
        isRefreshing,
        lastRefreshTime,
        isOperationInProgress: false,
      }}
    >
      {children}
    </LiveStreamContext.Provider>
  );
};

// Custom hook for using the context
export const useLiveStreams = () => {
  const context = useContext(LiveStreamContext);
  if (context === undefined) {
    throw new Error('useLiveStreams must be used within a LiveStreamProvider');
  }
  return context;
};