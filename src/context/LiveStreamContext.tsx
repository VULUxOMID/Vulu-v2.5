import React, { createContext, useContext, useState, useEffect, ReactNode, useRef } from 'react';
import { Alert, AppState } from 'react-native';
import { streamService } from '../services/streamService';
import { useAuthSafe } from './AuthContext';

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
  const [isOperationInProgress, setIsOperationInProgress] = useState<boolean>(false);
  const [lastOperationTime, setLastOperationTime] = useState<number>(0);
  const [isRefreshing, setIsRefreshing] = useState<boolean>(false);
  const [lastRefreshTime, setLastRefreshTime] = useState<Date | null>(null);
  const authContext = useAuthSafe();
  const { user, loading: authLoading } = authContext || { user: null, loading: false };

  // Debounce delay for stream operations (500ms)
  const OPERATION_DEBOUNCE_DELAY = 500;

  // Initialize sync validation and cleanup when user changes
  useEffect(() => {
    if (user && !authLoading) {
      console.log(`🔄 Initializing sync validation for user ${user.uid}`);

      // Simplified: No complex sync validation needed
      console.log('✅ User authenticated, ready for streaming');
    }
  }, [user, authLoading]);

  // Simplified: No sync validation needed

  // Fetch streams from Firebase - wait for auth to complete
  useEffect(() => {
    // Don't start fetching until auth loading is complete
    if (authLoading) {
      return;
    }

    const fetchStreams = async () => {
      try {
        const activeStreams = await streamService.getActiveStreams();
        // Convert Stream[] to LiveStream[] format
        const liveStreams: LiveStream[] = activeStreams.map(stream => ({
          id: stream.id,
          title: stream.title,
          hosts: stream.participants
            .filter(p => p.isHost)
            .map(p => ({
              name: p.name,
              avatar: p.avatar || '',
              joinOrder: 0,
              isSpeaking: false,
              isMuted: p.isMuted
            })),
          viewers: stream.participants
            .filter(p => !p.isHost)
            .map(p => ({
              name: p.name,
              avatar: p.avatar || '',
              isMuted: p.isMuted,
              isBanned: p.isBanned
            })),
          views: stream.viewerCount,
          isActive: stream.isActive,
          startedAt: stream.startedAt.toMillis()
        }));
        setStreams(liveStreams);
      } catch (error) {
        console.error('Error fetching streams:', error);
        setStreams([]);
      }
    };

    fetchStreams();

    // Simple polling for updates (can be replaced with Firestore listener later)
    const interval = setInterval(fetchStreams, 5000); // Poll every 5 seconds

    return () => clearInterval(interval);
  }, [authLoading]); // Depend on authLoading to wait for auth completion

  // Handle app state changes for cleanup and Firestore error recovery
  useEffect(() => {
    const handleAppStateChange = (nextAppState: string) => {
      // Only treat 'background' as background, not 'inactive'
      // 'inactive' can happen during transitions (like navigation) and shouldn't trigger cleanup
      if (nextAppState === 'background') {
        console.log('📱 App going to background - cleaning up resources');

        // Simplified: No special cleanup needed
      }
    };

    const subscription = AppState.addEventListener('change', handleAppStateChange);
    return () => subscription?.remove();
  }, [currentlyWatching, user?.uid, authLoading]);

  // Categorize streams for easier access
  const featuredStreams = streams.filter(stream => stream.rank !== undefined)
                                .sort((a, b) => (a.rank || 0) - (b.rank || 0));

  // TODO: Replace with real friend relationship logic from user context
  // For now, return empty arrays since we don't have real friend data
  const friendStreams = {
    hosting: [], // streams.filter(stream => stream.hosts.some(host => userFriends.includes(host.id))),
    watching: [] // streams.filter(stream => stream.friends?.some(friend => userFriends.includes(friend.id)))
  };

  const getStreamById = (id: string) => {
    return streams.find(stream => stream.id === id);
  };

  // Helper function to check if user has an active stream (including minimized)
  const hasActiveStream = () => {
    return currentlyWatching !== null;
  };

  // Atomic operation wrapper to prevent race conditions
  const executeAtomicOperation = async <T,>(
    operationName: string,
    operation: () => Promise<T>
  ): Promise<T> => {
    const now = Date.now();

    // Check if operation is already in progress
    if (isOperationInProgress) {
      console.warn(`🚫 ${operationName} blocked - operation already in progress`);
      throw new Error('Another stream operation is already in progress. Please wait.');
    }

    // Check debounce delay
    if (now - lastOperationTime < OPERATION_DEBOUNCE_DELAY) {
      console.warn(`🚫 ${operationName} blocked - debounce delay not met`);
      throw new Error('Please wait before performing another stream operation.');
    }

    setIsOperationInProgress(true);
    setLastOperationTime(now);

    try {
      console.log(`🔄 Starting atomic operation: ${operationName}`);
      const result = await operation();
      console.log(`✅ Completed atomic operation: ${operationName}`);
      return result;
    } catch (error) {
      console.error(`❌ Failed atomic operation: ${operationName}`, error);
      throw error;
    } finally {
      setIsOperationInProgress(false);
    }
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
  const joinStream = async (streamId: string, skipConfirmation: boolean = false) => {
    if (!user) {
      throw new Error('User must be authenticated to join a stream');
    }

    // Check if already in this stream
    if (currentlyWatching === streamId) {
      console.log('Already in this stream');
      return;
    }

    // Check if in another stream - ask for confirmation
    if (hasActiveStream() && currentlyWatching !== streamId && !skipConfirmation) {
      const shouldProceed = await showJoinStreamConfirmation(streamId);
      if (!shouldProceed) {
        throw new Error('User cancelled stream join');
      }

      // Leave current stream
      if (currentlyWatching) {
        try {
          await streamService.leaveStream(currentlyWatching, user.uid);
        } catch (error) {
          console.warn('Error leaving previous stream:', error);
        }
      }
    }

    try {
      // Join the stream
      await streamService.joinStream(
        streamId,
        user.uid,
        user.displayName || user.username || 'User',
        user.photoURL || user.profileImage || null
      );

      // Update UI state
      setCurrentlyWatching(streamId);
      setIsMinimized(false);
      console.log(`✅ Joined stream: ${streamId}`);
    } catch (error) {
      console.error('Failed to join stream:', error);
      setCurrentlyWatching(null);
      throw error;
    }
  };

  // Add this new function to handle minimizing streams
  const setStreamMinimized = (streamId: string, minimized: boolean) => {
    if (streamId) {
      setCurrentlyWatching(streamId);
      setIsMinimized(minimized);
    }
  };

  // Simplified: Create a new stream
  const createNewStream = async (title: string, hostId: string, hostName: string, hostAvatar: string, skipConfirmation: boolean = false): Promise<string> => {
    if (!user || user.uid !== hostId) {
      throw new Error('User must be authenticated to create a stream');
    }

    // Check if already in a stream - ask for confirmation
    if (hasActiveStream() && !skipConfirmation) {
      const shouldProceed = await showCreateStreamConfirmation();
      if (!shouldProceed) {
        throw new Error('User cancelled stream creation');
      }

      // Leave current stream
      if (currentlyWatching) {
        try {
          await streamService.leaveStream(currentlyWatching, hostId);
        } catch (error) {
          console.warn('Error leaving previous stream:', error);
        }
      }
    }

    try {
      // Create the stream
      const streamId = await streamService.createStream(
        title || 'Live Stream',
        hostId,
        hostName || 'Host',
        hostAvatar || null
      );

      // Update UI state
      setCurrentlyWatching(streamId);
      setIsMinimized(false);
      console.log(`✅ Created stream: ${streamId}`);

      return streamId;
    } catch (error) {
      console.error('Failed to create stream:', error);
      setCurrentlyWatching(null);
      throw error;
    }
  };

  // New functions for enhanced live stream features
  const joinAsHost = async (streamId: string, userName: string, userAvatar: string) => {
    try {
      let actualStreamId = streamId;
      const streamExists = streams.some(s => s.id === streamId);

      // Create a new stream if it doesn't exist
      if (!streamExists) {
        actualStreamId = await streamingService.createStream(
          `Live Stream by ${userName}`,
          'currentUser', // Use actual user ID
          userName,
          userAvatar
        );
        console.log(`Created new stream: ${actualStreamId}`);

        // After creating the stream, fetch the latest streams to ensure we have the complete stream data
        try {
          const activeStreams = await streamingService.getActiveStreams();
          setStreams(activeStreams);
        } catch (error) {
          console.error('Error refreshing streams after creation:', error);
        }
      }

      // Find the stream to update (using actualStreamId in case it changed)
      const targetStream = streams.find(s => s.id === actualStreamId);
      if (!targetStream) {
        console.error(`Stream with id ${actualStreamId} not found after creation`);
        return;
      }

      setStreams(prevStreams =>
        prevStreams.map(stream => {
          if (stream.id === actualStreamId) {
            const nextJoinOrder = stream.hosts.length + 1;
            const newHost: StreamHost = {
              name: userName,
              avatar: userAvatar,
              joinOrder: nextJoinOrder,
              isSpeaking: false,
              isMuted: false
            };
            return {
              ...stream,
              hosts: [...stream.hosts, newHost]
            };
          }
          return stream;
        })
      );
    } catch (error) {
      console.error('Error joining as host:', error);
    }
  };

  const kickHost = async (streamId: string, hostName: string, kickedBy: string) => {
    try {
      // Find the user ID of the host to kick
      const stream = streams.find(s => s.id === streamId);
      if (!stream) return;

      // For now, we'll use the host name as user ID (TODO: Use actual user IDs)
      const userId = hostName; // This should be the actual user ID
      const kickedById = kickedBy; // This should be the actual user ID

      await streamingService.kickParticipant(streamId, userId, kickedById);

      // Update local state
      setStreams(prevStreams =>
        prevStreams.map(stream => {
          if (stream.id === streamId) {
            const kickedByHost = stream.hosts.find(h => h.name === kickedBy);
            const hostToKick = stream.hosts.find(h => h.name === hostName);

            // Check if the kicker has higher power (lower join order)
            if (kickedByHost && hostToKick && kickedByHost.joinOrder < hostToKick.joinOrder) {
              return {
                ...stream,
                hosts: stream.hosts.filter(h => h.name !== hostName)
              };
            }
          }
          return stream;
        })
      );
    } catch (error) {
      console.error('Error kicking host:', error);
    }
  };

  const muteViewer = async (streamId: string, viewerName: string, mutedBy: string) => {
    try {
      // Find the user ID of the viewer to mute
      const stream = streams.find(s => s.id === streamId);
      if (!stream) return;

      // For now, we'll use the viewer name as user ID (TODO: Use actual user IDs)
      const userId = viewerName; // This should be the actual user ID

      await streamingService.toggleParticipantMute(streamId, userId);

      // Update local state
      setStreams(prevStreams =>
        prevStreams.map(stream => {
          if (stream.id === streamId) {
            return {
              ...stream,
              viewers: stream.viewers.map(viewer =>
                viewer.name === viewerName
                  ? { ...viewer, isMuted: !viewer.isMuted }
                  : viewer
              )
            };
          }
          return stream;
        })
      );
    } catch (error) {
      console.error('Error muting viewer:', error);
    }
  };

  const banViewer = async (streamId: string, viewerName: string, bannedBy: string) => {
    try {
      // Find the user ID of the viewer to ban
      const stream = streams.find(s => s.id === streamId);
      if (!stream) return;

      // For now, we'll use the viewer name as user ID (TODO: Use actual user IDs)
      const userId = viewerName; // This should be the actual user ID
      const bannedById = bannedBy; // This should be the actual user ID

      await streamingService.banParticipant(streamId, userId, bannedById);

      // Update local state
      setStreams(prevStreams =>
        prevStreams.map(stream => {
          if (stream.id === streamId) {
            return {
              ...stream,
              viewers: stream.viewers.map(viewer =>
                viewer.name === viewerName
                  ? { ...viewer, isBanned: !viewer.isBanned }
                  : viewer
              )
            };
          }
          return stream;
        })
      );
    } catch (error) {
      console.error('Error banning viewer:', error);
    }
  };

  // Simplified: Leave a stream
  const leaveStream = async (streamId: string) => {
    if (!user) {
      throw new Error('User must be authenticated');
    }

    try {
      // Clear UI state
      setCurrentlyWatching(null);
      setIsMinimized(false);

      // Leave the stream
      await streamService.leaveStream(streamId, user.uid);
      console.log(`✅ Left stream: ${streamId}`);
    } catch (error) {
      console.error('Failed to leave stream:', error);
      throw error;
    }
  };

  // Simplified: Leave with confirmation
  const leaveStreamWithConfirmation = async (streamId: string): Promise<void> => {
    if (!user) {
      throw new Error('User must be authenticated');
    }

    // Get stream to check if user is host
    const stream = await streamService.getStream(streamId);
    const isHost = stream?.hostId === user.uid;

    if (isHost) {
      // Show confirmation for hosts
      return new Promise((resolve, reject) => {
        Alert.alert(
          'Leave Live Stream',
          'Are you sure you want to leave this live?',
          [
            {
              text: 'Cancel',
              style: 'cancel',
              onPress: () => reject(new Error('User cancelled'))
            },
            {
              text: 'Leave',
              style: 'destructive',
              onPress: async () => {
                try {
                  await leaveStream(streamId);
                  resolve();
                } catch (error) {
                  reject(error);
                }
              }
            }
          ]
        );
      });
    } else {
      // Viewers leave immediately
      await leaveStream(streamId);
    }
  };

  // Simplified: Refresh streams
  const refreshStreams = async (): Promise<void> => {
    if (isRefreshing) return;

    try {
      setIsRefreshing(true);
      const activeStreams = await streamService.getActiveStreams();
      
      // Convert to LiveStream format
      const liveStreams: LiveStream[] = activeStreams.map(stream => ({
        id: stream.id,
        title: stream.title,
        hosts: stream.participants
          .filter(p => p.isHost)
          .map(p => ({
            name: p.name,
            avatar: p.avatar || '',
            joinOrder: 0,
            isSpeaking: false,
            isMuted: p.isMuted
          })),
        viewers: stream.participants
          .filter(p => !p.isHost)
          .map(p => ({
            name: p.name,
            avatar: p.avatar || '',
            isMuted: p.isMuted,
            isBanned: p.isBanned
          })),
        views: stream.viewerCount,
        isActive: stream.isActive,
        startedAt: stream.startedAt.toMillis()
      }));
      
      setStreams(liveStreams);
      setLastRefreshTime(new Date());
      
      // Check if current stream still exists
      if (currentlyWatching) {
        const currentStreamExists = liveStreams.some(s => s.id === currentlyWatching);
        if (!currentStreamExists) {
          setCurrentlyWatching(null);
          setIsMinimized(false);
        }
      }

    } catch (error) {
      console.error('❌ [REFRESH] Error refreshing streams:', error);
      throw error; // Re-throw to allow caller to handle
    } finally {
      setIsRefreshing(false);
    }
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
        isOperationInProgress,
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