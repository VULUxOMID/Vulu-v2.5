import React, { createContext, useContext, useState, useEffect, ReactNode, useRef } from 'react';
import { useAuthSafe } from './AuthContext';
import notificationService, { NotificationCounts as FirebaseNotificationCounts, NotificationData } from '../services/notificationService';
import { messagingService } from '../services/messagingService';

// Define interfaces for notification counts
export interface NotificationCounts {
  announcements: number;
  friendRequests: number;
  profileViews: number;
  allNotifications: number;
  total: number;
}

interface NotificationContextType {
  counts: NotificationCounts;
  notifications: NotificationData[];
  isLoading: boolean;
  updateAnnouncementCount: (count: number) => void;
  updateFriendRequestCount: (count: number) => void;
  updateProfileViewCount: (count: number) => void;
  updateAllNotificationsCount: (count: number) => void;
  clearNotificationsByType: (type: keyof Omit<NotificationCounts, 'total'>) => void;
  markAllAsRead: () => Promise<void>;
  refreshNotifications: () => Promise<void>;
  markNotificationAsRead: (notificationId: string) => Promise<void>;
}

const NotificationContext = createContext<NotificationContextType | undefined>(undefined);

// Initial state - will be replaced with Firebase data
const initialState: NotificationCounts = {
  announcements: 0,
  friendRequests: 0,
  profileViews: 0,
  allNotifications: 0,
  total: 0
};

// Helper function to calculate total
const calculateTotal = (counts: Omit<NotificationCounts, 'total'>): number => {
  return counts.announcements +
         counts.friendRequests +
         counts.profileViews +
         counts.allNotifications;
};

// Convert Firebase notification counts to our format
const convertFirebaseCountsToLocal = (firebaseCounts: FirebaseNotificationCounts): NotificationCounts => {
  return {
    announcements: firebaseCounts.announcements,
    friendRequests: firebaseCounts.friendRequests,
    profileViews: firebaseCounts.profileViews,
    allNotifications: firebaseCounts.activities, // Map activities to allNotifications
    total: firebaseCounts.total
  };
};

// Filter out friend request notifications where the friend request no longer exists
const filterValidFriendRequestNotifications = async (
  notifications: NotificationData[],
  userId: string
): Promise<NotificationData[]> => {
  // Separate friend request notifications from others
  const friendRequestNotifications = notifications.filter(n => n.type === 'friend_request');
  const otherNotifications = notifications.filter(n => n.type !== 'friend_request');

  if (friendRequestNotifications.length === 0) {
    return notifications;
  }

  // Get all current friend requests for this user
  try {
    const currentFriendRequests = await messagingService.getUserFriendRequests(userId, 'received');
    const validRequestIds = new Set(currentFriendRequests.map(req => req.id));

    // Filter friend request notifications to only include those with valid friend requests
    const validFriendRequestNotifications = friendRequestNotifications.filter(notification => {
      const friendRequestId = notification.data?.friendRequestId;
      // If notification has friendRequestId, check if request still exists
      if (friendRequestId) {
        const isValid = validRequestIds.has(friendRequestId);
        if (!isValid) {
          console.log(`🗑️ Filtering out notification for cancelled friend request: ${friendRequestId}`);
        }
        return isValid;
      }
      // If no friendRequestId, check by senderId (fallback for older notifications)
      const senderId = notification.data?.fromUserId;
      if (senderId) {
        const matchingRequest = currentFriendRequests.find(req => req.senderId === senderId && req.status === 'pending');
        if (!matchingRequest) {
          console.log(`🗑️ Filtering out notification for cancelled friend request from sender: ${senderId}`);
        }
        return !!matchingRequest;
      }
      // If we can't verify, remove it to be safe (don't show stale notifications)
      console.log(`🗑️ Filtering out notification without friendRequestId or senderId`);
      return false;
    });

    // Delete invalid notifications from Firestore (cleanup)
    const invalidNotifications = friendRequestNotifications.filter(n => {
      const friendRequestId = n.data?.friendRequestId;
      if (friendRequestId) {
        return !validRequestIds.has(friendRequestId);
      }
      return false;
    });

    // Delete invalid notifications in the background (don't block)
    if (invalidNotifications.length > 0) {
      Promise.all(
        invalidNotifications.map(n => notificationService.deleteNotification(n.id).catch(err => {
          console.warn(`Failed to delete stale notification ${n.id}:`, err);
        }))
      ).then(() => {
        console.log(`🧹 Cleaned up ${invalidNotifications.length} stale friend request notification(s)`);
      });
    }

    return [...otherNotifications, ...validFriendRequestNotifications];
  } catch (error) {
    console.error('Error filtering friend request notifications:', error);
    // On error, return all notifications (better to show than hide)
    return notifications;
  }
};
export const NotificationProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const authContext = useAuthSafe();
  const { user, isGuest } = authContext || { user: null, isGuest: false };
  const [counts, setCounts] = useState<NotificationCounts>(initialState);
  const [notifications, setNotifications] = useState<NotificationData[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  // Use ref to track current Firebase counts to avoid stale closure issues
  const firebaseCountsRef = useRef<NotificationCounts | null>(null);

  // Load notifications when user changes
  useEffect(() => {
    if (!user || isGuest) {
      setCounts(initialState);
      setNotifications([]);
      firebaseCountsRef.current = null; // Clear ref when user changes
      return;
    }

    let unsubscribe: (() => void) | undefined;
    let isMounted = true; // Track component mount status

    const loadNotifications = async () => {
      if (!isMounted) return; // Early exit if unmounted

      setIsLoading(true);
      try {
        // Get initial notifications and filter them
        const initialNotifications = await notificationService.getUserNotifications(user.uid, 100);
        const filteredInitialNotifications = await filterValidFriendRequestNotifications(initialNotifications, user.uid);

        // Get initial notification counts
        const firebaseCounts = await notificationService.getNotificationCounts(user.uid);
        const localCounts = convertFirebaseCountsToLocal(firebaseCounts);

        if (isMounted) {
          firebaseCountsRef.current = localCounts; // Keep ref in sync
          setCounts(localCounts);
          setNotifications(filteredInitialNotifications);

          // Set up real-time listener for notifications
          unsubscribe = notificationService.onNotifications(user.uid, async (newNotifications) => {
            if (!isMounted) return; // Prevent updates after unmount

            // Filter out friend request notifications where the friend request no longer exists
            const filteredNotifications = await filterValidFriendRequestNotifications(newNotifications, user.uid);

            if (!isMounted) return; // Check again after async operation

            setNotifications(filteredNotifications);

            // Apply incremental changes based on fresh Firebase counts or previous state
            setCounts(prev => {
              // Calculate counts from current notifications (only unread)
              const currentCounts = calculateCountsFromNotifications(filteredNotifications);

              // Update the ref with the new counts
              firebaseCountsRef.current = currentCounts;

              return currentCounts;
            });
          });
        }
      } catch (error) {
        console.error('Failed to load notifications:', error);
      } finally {
        if (isMounted) {
          setIsLoading(false);
        }
      }
    };

    loadNotifications();

    return () => {
      isMounted = false; // Mark as unmounted
      if (unsubscribe) {
        unsubscribe();
        unsubscribe = undefined; // Clear reference to prevent memory leaks
      }
    };
  }, [user, isGuest]);

  // Calculate counts from notification array - only count unread notifications
  const calculateCountsFromNotifications = (notificationList: NotificationData[]): NotificationCounts => {
    const counts = {
      announcements: 0,
      friendRequests: 0,
      profileViews: 0,
      allNotifications: 0,
      total: 0
    };

    // Filter for unread notifications only
    const unreadNotifications = notificationList.filter(notification => !notification.read);
    counts.total = unreadNotifications.length;

    unreadNotifications.forEach(notification => {
      switch (notification.type) {
        case 'announcement':
          counts.announcements++;
          break;
        case 'friend_request':
          counts.friendRequests++;
          break;
        case 'profile_view':
          counts.profileViews++;
          break;
        case 'activity':
          counts.allNotifications++;
          break;
      }
    });

    return counts;
  };

  const updateAnnouncementCount = (count: number) => {
    setCounts(prev => ({ ...prev, announcements: count, total: calculateTotal({ ...prev, announcements: count }) }));
  };

  const updateFriendRequestCount = (count: number) => {
    setCounts(prev => ({ ...prev, friendRequests: count, total: calculateTotal({ ...prev, friendRequests: count }) }));
  };

  const updateProfileViewCount = (count: number) => {
    setCounts(prev => ({ ...prev, profileViews: count, total: calculateTotal({ ...prev, profileViews: count }) }));
  };

  const updateAllNotificationsCount = (count: number) => {
    setCounts(prev => ({ ...prev, allNotifications: count, total: calculateTotal({ ...prev, allNotifications: count }) }));
  };

  const clearNotificationsByType = (type: keyof Omit<NotificationCounts, 'total'>) => {
    setCounts(prev => ({ ...prev, [type]: 0, total: calculateTotal({ ...prev, [type]: 0 }) }));
  };

  const markAllAsRead = async () => {
    if (!user || isGuest) return;

    try {
      await notificationService.markAllAsRead(user.uid);
      setCounts(initialState);
    } catch (error) {
      console.error('Failed to mark all notifications as read:', error);
    }
  };

  const refreshNotifications = async () => {
    if (!user || isGuest) return;

    setIsLoading(true);
    try {
      const firebaseCounts = await notificationService.getNotificationCounts(user.uid);
      setCounts(convertFirebaseCountsToLocal(firebaseCounts));

      const newNotifications = await notificationService.getUserNotifications(user.uid, 100);
      // Filter out invalid friend request notifications
      const filteredNotifications = await filterValidFriendRequestNotifications(newNotifications, user.uid);
      setNotifications(filteredNotifications);
    } catch (error) {
      console.error('Failed to refresh notifications:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const markNotificationAsRead = async (notificationId: string) => {
    try {
      await notificationService.markAsRead(notificationId);
      // The real-time listener will update the state automatically
    } catch (error) {
      console.error('Failed to mark notification as read:', error);
    }
  };

  return (
    <NotificationContext.Provider value={{
      counts,
      notifications,
      isLoading,
      updateAnnouncementCount,
      updateFriendRequestCount,
      updateProfileViewCount,
      updateAllNotificationsCount,
      clearNotificationsByType,
      markAllAsRead,
      refreshNotifications,
      markNotificationAsRead
    }}>
      {children}
    </NotificationContext.Provider>
  );
};

// Custom hook to use the notification context
export const useNotifications = (): NotificationContextType => {
  const context = useContext(NotificationContext);
  if (!context) {
    throw new Error('useNotifications must be used within a NotificationProvider');
  }
  return context;
};

export default NotificationContext;