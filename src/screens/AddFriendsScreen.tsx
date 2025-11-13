import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  TextInput,
  TouchableOpacity,
  FlatList,
  Image,
  Alert,
  ActivityIndicator,
  RefreshControl,
} from 'react-native';
import { router, useLocalSearchParams, useFocusEffect } from 'expo-router';
import { MaterialIcons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import CommonHeader from '../components/CommonHeader';
import PillButton from '../components/PillButton';
import { PURPLE } from '../constants/colors';
import { useAuth } from '../context/AuthContext';
import { firestoreService } from '../services/firestoreService';
import { notificationService } from '../services/notificationService';
import { messagingService } from '../services/messagingService';
import { LoadingState, ErrorState, EmptyState } from '../components/ErrorHandling';
import { FriendRequest as FriendRequestType } from '../services/types';

interface User {
  id: string;
  displayName: string;
  username?: string;
  email?: string;
  photoURL?: string;
  isFriend?: boolean;
  requestSent?: boolean;
}

interface FriendRequest {
  id: string;
  senderId: string;
  senderName: string;
  senderAvatar?: string;
  recipientId: string;
  recipientName: string;
  status: 'pending' | 'accepted' | 'declined';
  createdAt: Date;
  mutualFriends?: number;
}

const AddFriendsScreen = () => {
  const { user: currentUser } = useAuth();
  const params = useLocalSearchParams();
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<User[]>([]);
  const [friendRequests, setFriendRequests] = useState<FriendRequest[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [isLoadingRequests, setIsLoadingRequests] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'search' | 'requests'>('search');
  const searchTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [lastSearchQuery, setLastSearchQuery] = useState('');
  const friendRequestsListenerRef = useRef<(() => void) | null>(null);
  const [sendingRequests, setSendingRequests] = useState<Set<string>>(new Set());

  // Smart navigation back function
  const handleGoBack = useCallback(() => {
    const source = typeof params.source === 'string' ? params.source : '';

    if (source === 'messages' || source === 'directmessages') {
      router.push('/(main)/directmessages');
    } else if (source === 'notifications') {
      router.push('/(main)/notifications');
    } else if (source === 'home') {
      router.push('/(main)');
    } else {
      // Default fallback - try router.back() first, then fallback to directmessages
      try {
        router.back();
      } catch (error) {
        console.log('router.back() failed, falling back to directmessages');
        router.push('/(main)/directmessages');
      }
    }
  }, [params.source]);

  // Load friend requests on component mount and set up real-time listener
  useEffect(() => {
    if (!currentUser?.uid) {
      console.log('⚠️ AddFriendsScreen: No current user, skipping friend requests load');
      return;
    }

    console.log(`🔄 AddFriendsScreen: Initializing friend requests for user ${currentUser.uid}`);
    loadFriendRequests();
    setupFriendRequestsListener();

    // Cleanup listener on unmount
    return () => {
      console.log('🧹 AddFriendsScreen: Cleaning up friend requests listener');
      if (friendRequestsListenerRef.current) {
        friendRequestsListenerRef.current();
        friendRequestsListenerRef.current = null;
      }
    };
  }, [currentUser?.uid]);

  // Reload friend requests when screen comes into focus
  useFocusEffect(
    useCallback(() => {
      if (currentUser?.uid && activeTab === 'requests') {
        loadFriendRequests();
      }
    }, [currentUser?.uid, activeTab])
  );

  const loadFriendRequests = async () => {
    if (!currentUser?.uid) return;

    setIsLoadingRequests(true);
    setError(null);
    try {
      // Query Firebase for pending friend requests where current user is the recipient
      const requests = await messagingService.getUserFriendRequests(currentUser.uid, 'received');

      // Transform the data to match our UI interface
      const transformedRequests: FriendRequest[] = requests.map(req => ({
        id: req.id,
        senderId: req.senderId,
        senderName: req.senderName,
        senderAvatar: req.senderAvatar,
        recipientId: req.recipientId,
        recipientName: req.recipientName,
        status: req.status,
        createdAt: req.createdAt?.toDate ? req.createdAt.toDate() : new Date(),
        mutualFriends: 0, // Could be calculated if needed
      }));

      setFriendRequests(transformedRequests);
      console.log(`✅ Loaded ${transformedRequests.length} friend requests`);
    } catch (error: any) {
      console.error('Error loading friend requests:', error);
      setError('Failed to load friend requests');
    } finally {
      setIsLoadingRequests(false);
    }
  };

  const setupFriendRequestsListener = () => {
    if (!currentUser?.uid) return;

    // Clean up existing listener if any
    if (friendRequestsListenerRef.current) {
      friendRequestsListenerRef.current();
    }

    // Set up real-time listener using onFriendRequests
    const unsubscribe = messagingService.onFriendRequests(currentUser.uid, (requests) => {
      // Transform the data to match our UI interface
      const transformedRequests: FriendRequest[] = requests.map(req => ({
        id: req.id,
        senderId: req.senderId,
        senderName: req.senderName,
        senderAvatar: req.senderAvatar,
        recipientId: req.recipientId,
        recipientName: req.recipientName,
        status: req.status,
        createdAt: req.createdAt?.toDate ? req.createdAt.toDate() : new Date(),
        mutualFriends: 0, // Could be calculated if needed
      }));

      setFriendRequests(transformedRequests);
      console.log(`📡 Real-time update: ${transformedRequests.length} friend requests`);
    });

    friendRequestsListenerRef.current = unsubscribe;
  };

  const handleRefresh = async () => {
    setIsRefreshing(true);
    await loadFriendRequests();
    setIsRefreshing(false);
  };

  // Debounced search function for real-time autocomplete
  const debouncedSearch = useCallback(
    (query: string) => {
      // Clear existing timeout
      if (searchTimeoutRef.current) {
        clearTimeout(searchTimeoutRef.current);
      }

      // Set new timeout for debounced search
      const timeout = setTimeout(() => {
        performSearch(query);
      }, 150); // 150ms debounce delay

      searchTimeoutRef.current = timeout;
    },
    [] // Empty dependency array to prevent stale closures
  );

  const performSearch = async (query: string) => {
    const trimmedQuery = query.trim().toLowerCase();

    if (!trimmedQuery || !currentUser?.uid) {
      setSearchResults([]);
      setIsSearching(false);
      setLastSearchQuery('');
      return;
    }

    // Skip search if query hasn't changed
    if (trimmedQuery === lastSearchQuery) {
      setIsSearching(false);
      return;
    }

    setIsSearching(true);
    setError(null);
    setLastSearchQuery(trimmedQuery);

    try {
      // Search users by username only with progressive matching
      const users = await firestoreService.searchUsersByUsername(trimmedQuery, currentUser.uid);

      // Get current user's friends to check friendship status
      const currentUserFriends = await firestoreService.getUserFriends(currentUser.uid);
      const friendIds = new Set(currentUserFriends.map(friend => friend.id));

      // Check friend request status for each user
      const usersWithStatus = await Promise.all(
        users.map(async (user) => {
          const requestStatus = await messagingService.getFriendRequestStatus(currentUser.uid, user.uid);
          return {
            id: user.uid,
            displayName: user.displayName || 'Unknown User',
            username: user.username || '',
            email: user.email,
            photoURL: user.photoURL,
            isFriend: friendIds.has(user.uid) || requestStatus.status === 'friends',
            requestSent: requestStatus.status === 'sent'
          };
        })
      );

      setSearchResults(usersWithStatus);
    } catch (error: any) {
      console.error('Error searching users:', error);
      setError('Failed to search users');
    } finally {
      setIsSearching(false);
    }
  };

  // Handle search input changes with real-time search
  const handleSearchChange = (text: string) => {
    setSearchQuery(text);

    if (text.trim()) {
      setIsSearching(true);
      debouncedSearch(text);
    } else {
      // Clear results immediately if search is empty
      if (searchTimeoutRef.current) {
        clearTimeout(searchTimeoutRef.current);
        searchTimeoutRef.current = null;
      }
      setSearchResults([]);
      setIsSearching(false);
    }
  };

  // Cleanup timeout on unmount
  useEffect(() => {
    return () => {
      if (searchTimeoutRef.current) {
        clearTimeout(searchTimeoutRef.current);
        searchTimeoutRef.current = null;
      }
    };
  }, []); // Empty dependency array - cleanup only on unmount

  const sendFriendRequest = async (targetUser: User) => {
    if (!currentUser?.uid || sendingRequests.has(targetUser.id)) return;

    // Add to sending requests set to prevent duplicate sends
    setSendingRequests(prev => new Set(prev).add(targetUser.id));

    try {
      // Use the proper friend request system instead of direct add
      await messagingService.sendFriendRequest(
        currentUser.uid,
        currentUser.displayName || 'Someone',
        targetUser.id,
        targetUser.displayName || 'User',
        undefined, // message
        currentUser.photoURL || null, // Use null instead of undefined
        targetUser.photoURL || null // Use null instead of undefined
      );

      // Update search results to show request sent
      setSearchResults(prev =>
        prev.map(user =>
          user.id === targetUser.id
            ? { ...user, requestSent: true }
            : user
        )
      );

      // Success - no popup needed, UI already updated
    } catch (error: any) {
      console.error('Error sending friend request:', error);
      Alert.alert('Error', 'Failed to send friend request. Please try again.');
    } finally {
      // Remove from sending requests set
      setSendingRequests(prev => {
        const newSet = new Set(prev);
        newSet.delete(targetUser.id);
        return newSet;
      });
    }
  };

  const cancelFriendRequest = async (targetUser: User) => {
    if (!currentUser?.uid || sendingRequests.has(targetUser.id)) return;

    // Add to sending requests set to prevent duplicate actions
    setSendingRequests(prev => new Set(prev).add(targetUser.id));

    try {
      // Cancel the friend request
      await messagingService.cancelFriendRequest(currentUser.uid, targetUser.id);

      // Update search results to show request cancelled
      setSearchResults(prev =>
        prev.map(user =>
          user.id === targetUser.id
            ? { ...user, requestSent: false }
            : user
        )
      );

      // Success - no popup needed, UI already updated
    } catch (error: any) {
      console.error('Error cancelling friend request:', error);
      Alert.alert('Error', 'Failed to cancel friend request. Please try again.');
    } finally {
      // Remove from sending requests set
      setSendingRequests(prev => {
        const newSet = new Set(prev);
        newSet.delete(targetUser.id);
        return newSet;
      });
    }
  };

  const handleFriendRequestToggle = async (targetUser: User) => {
    if (targetUser.requestSent) {
      await cancelFriendRequest(targetUser);
    } else {
      await sendFriendRequest(targetUser);
    }
  };

  const handleFriendRequest = async (request: FriendRequest, action: 'accept' | 'decline') => {
    if (!currentUser?.uid) return;

    try {
      if (action === 'accept') {
        // Use the proper messaging service to respond to friend requests
        await messagingService.respondToFriendRequest(request.id, 'accepted');

        // Mark related notification as read
        try {
          const notifications = await notificationService.getUserNotifications(currentUser.uid, 50);
          const relatedNotification = notifications.find(
            n => n.type === 'friend_request' &&
            n.data?.fromUserId === request.senderId &&
            n.data?.status === 'pending'
          );
          if (relatedNotification) {
            await notificationService.markAsRead(relatedNotification.id);
          }
        } catch (notifError) {
          console.warn('Failed to mark notification as read:', notifError);
        }

        Alert.alert('Success', `You are now friends with ${request.senderName}`);
      } else {
        // Decline the request
        await messagingService.respondToFriendRequest(request.id, 'declined');

        // Mark related notification as read
        try {
          const notifications = await notificationService.getUserNotifications(currentUser.uid, 50);
          const relatedNotification = notifications.find(
            n => n.type === 'friend_request' &&
            n.data?.fromUserId === request.senderId &&
            n.data?.status === 'pending'
          );
          if (relatedNotification) {
            await notificationService.markAsRead(relatedNotification.id);
          }
        } catch (notifError) {
          console.warn('Failed to mark notification as read:', notifError);
        }
      }

      // Remove request from list (will also be removed by real-time listener)
      setFriendRequests(prev => prev.filter(req => req.id !== request.id));
    } catch (error: any) {
      console.error(`Error ${action}ing friend request:`, error);
      Alert.alert('Error', `Failed to ${action} friend request. Please try again.`);
    }
  };

  const renderSearchResult = ({ item }: { item: User }) => (
    <View style={styles.userItem}>
      <Image
        source={{ uri: item.photoURL || 'https://ui-avatars.com/api/?name=' + encodeURIComponent(item.displayName || item.username || 'User') + '&background=6E69F4&color=FFFFFF&size=150' }}
        style={styles.avatar}
      />
      <View style={styles.userInfo}>
        <Text style={styles.userName}>@{item.username}</Text>
        {item.displayName && item.displayName !== item.username && (
          <Text style={styles.userDisplayName}>{item.displayName}</Text>
        )}
      </View>
      {item.isFriend ? (
        <PillButton
          title="Friends"
          variant="outline"
          size="sm"
          onPress={() => {}}
          disabled={true}
        />
      ) : sendingRequests.has(item.id) ? (
        <PillButton
          title="..."
          variant="ghost"
          size="sm"
          onPress={() => {}}
          disabled={true}
        />
      ) : item.requestSent ? (
        <PillButton
          title="Cancel"
          variant="ghost"
          size="sm"
          onPress={() => handleFriendRequestToggle(item)}
        />
      ) : (
        <PillButton
          title="Add"
          leftIcon="person-add"
          size="sm"
          onPress={() => handleFriendRequestToggle(item)}
        />
      )}
    </View>
  );

  const renderFriendRequest = ({ item }: { item: FriendRequest }) => (
    <View style={styles.requestItem}>
      <Image
        source={{ uri: item.senderAvatar || 'https://ui-avatars.com/api/?name=' + encodeURIComponent(item.senderName || 'User') + '&background=6E69F4&color=FFFFFF&size=150' }}
        style={styles.avatar}
      />
      <View style={styles.requestInfo}>
        <Text style={styles.requestName}>{item.senderName}</Text>
        <Text style={styles.requestTime}>
          {item.createdAt.toLocaleDateString()}
        </Text>
        {item.mutualFriends && item.mutualFriends > 0 && (
          <Text style={styles.mutualFriends}>
            {item.mutualFriends} mutual friend{item.mutualFriends > 1 ? 's' : ''}
          </Text>
        )}
      </View>
      <View style={styles.requestActions}>
        <PillButton
          title="Accept"
          leftIcon="check"
          size="sm"
          onPress={() => handleFriendRequest(item, 'accept')}
          style={{ marginRight: 8 }}
        />
        <PillButton
          title="Decline"
          variant="ghost"
          size="sm"
          onPress={() => handleFriendRequest(item, 'decline')}
        />
      </View>
    </View>
  );

  return (
    <SafeAreaView style={styles.container}>
      <LinearGradient
        colors={['#131318', '#1C1D23']}
        style={styles.gradient}
      >
        {/* Header */}
        <CommonHeader
          title="Add Friends"
          leftIcon={{
            name: "arrow-back",
            onPress: handleGoBack,
            color: "#FFFFFF"
          }}
        />

        {/* Tab Selector */}
        <View style={styles.tabContainer}>
          <TouchableOpacity
            style={[styles.tabBtn, activeTab === 'search' && styles.tabBtnActive]}
            onPress={() => setActiveTab('search')}
          >
            <Text style={[styles.tabText, activeTab === 'search' && styles.tabTextActive]}>
              Search Users
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.tabBtn, activeTab === 'requests' && styles.tabBtnActive]}
            onPress={() => {
              console.log(`📑 Switching to Friend Requests tab (${friendRequests.length} requests)`);
              setActiveTab('requests');
            }}
          >
            <View style={styles.tabWithBadge}>
              <Text style={[styles.tabText, activeTab === 'requests' && styles.tabTextActive]}>
                Friend Requests
              </Text>
              {friendRequests.length > 0 && (
                <View style={styles.badge}>
                  <Text style={styles.badgeText}>{friendRequests.length}</Text>
                </View>
              )}
            </View>
          </TouchableOpacity>
        </View>

        {/* Content */}
        {activeTab === 'search' ? (
          <View style={styles.searchContainer}>
            {/* Search Input */}
            <View style={styles.searchInputContainer}>
              <MaterialIcons name="search" size={20} color="#9BA1A6" />
              <TextInput
                style={styles.searchInput}
                placeholder="Search by username..."
                placeholderTextColor="#9BA1A6"
                value={searchQuery}
                onChangeText={handleSearchChange}
                autoCapitalize="none"
                autoCorrect={false}
                autoComplete="off"
              />
              {isSearching && searchQuery.trim() && (
                <ActivityIndicator size="small" color={PURPLE.base} style={styles.searchLoader} />
              )}
            </View>

            {/* Search Results */}
            {isSearching ? (
              <LoadingState message="Searching usernames..." />
            ) : error ? (
              <ErrorState error={error} onRetry={() => handleSearchChange(searchQuery)} />
            ) : searchResults.length > 0 ? (
              <FlatList
                data={searchResults}
                renderItem={renderSearchResult}
                keyExtractor={(item) => item.id}
                style={styles.resultsList}
                showsVerticalScrollIndicator={false}
              />
            ) : searchQuery.trim() ? (
              <EmptyState message="No usernames found matching your search" />
            ) : (
              <EmptyState message="Start typing a username to search" />
            )}
          </View>
        ) : (
          <View style={styles.requestsContainer}>
            {isLoadingRequests ? (
              <LoadingState message="Loading friend requests..." />
            ) : friendRequests.length > 0 ? (
              <FlatList
                data={friendRequests}
                renderItem={renderFriendRequest}
                keyExtractor={(item) => item.id}
                style={styles.resultsList}
                showsVerticalScrollIndicator={false}
                refreshControl={
                  <RefreshControl
                    refreshing={isRefreshing}
                    onRefresh={handleRefresh}
                    tintColor={PURPLE.base}
                    colors={[PURPLE.base]}
                  />
                }
              />
            ) : (
              <EmptyState message="No pending friend requests" />
            )}
          </View>
        )}
      </LinearGradient>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0F1115',
  },
  screen: {
    flex: 1,
    backgroundColor: '#0F1115'
  },
  gradient: {
    flex: 1,
  },
  tabContainer: {
    flexDirection: 'row',
    marginHorizontal: 16,
    marginBottom: 16,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    borderRadius: 8,
    padding: 4,
  },
  tabsRow: {
    flexDirection: 'row',
    gap: 8,
    paddingHorizontal: 16,
    paddingTop: 8,
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255,255,255,0.06)',
  },
  tabBtn: {
    flex: 1,
    height: 36,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#181A20',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.06)',
  },
  tabBtnActive: {
    backgroundColor: PURPLE.tintBg,
    borderColor: PURPLE.tintBorder,
  },
  tabText: {
    color: '#9BA3AF',
    fontSize: 13,
    fontWeight: '700',
  },
  tabTextActive: {
    color: '#E5E7EB',
  },
  tabWithBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  badge: {
    backgroundColor: PURPLE.base,
    borderRadius: 10,
    minWidth: 20,
    height: 20,
    paddingHorizontal: 6,
    alignItems: 'center',
    justifyContent: 'center',
  },
  badgeText: {
    color: '#0F1115',
    fontSize: 11,
    fontWeight: '800',
  },
  searchContainer: {
    flex: 1,
    paddingHorizontal: 16,
  },
  requestsContainer: {
    flex: 1,
    paddingHorizontal: 16,
  },
  searchInputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#181A20',
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 12,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.06)',
  },
  searchBox: {
    marginHorizontal: 16,
    marginTop: 10,
    height: 40,
    borderRadius: 10,
    paddingHorizontal: 12,
    backgroundColor: '#181A20',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.06)',
    color: '#FFFFFF',
  },
  searchInput: {
    flex: 1,
    color: '#FFFFFF',
    fontSize: 16,
    marginLeft: 12,
  },
  searchLoader: {
    marginLeft: 8,
  },
  resultsList: {
    flex: 1,
  },
  userItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
  },
  requestItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
  },
  userRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255,255,255,0.06)',
  },
  avatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#2A2D3A',
    marginRight: 12,
  },
  emptyWrap: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24
  },
  emptyIcon: {
    width: 52,
    height: 52,
    borderRadius: 26,
    backgroundColor: '#181A20',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.06)',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12,
  },
  emptyCaption: {
    color: '#9BA3AF',
    fontSize: 14
  },
  userInfo: {
    flex: 1,
  },
  requestInfo: {
    flex: 1,
  },
  userName: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: '700',
  },
  userSub: {
    color: '#9BA3AF',
    fontSize: 12,
    marginTop: 2
  },
  userDisplayName: {
    color: '#FFFFFF',
    fontSize: 14,
    marginBottom: 2,
  },
  requestName: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 2,
  },
  userHandle: {
    color: '#9BA1A6',
    fontSize: 14,
  },
  requestTime: {
    color: '#9BA1A6',
    fontSize: 12,
    marginBottom: 2,
  },
  mutualFriends: {
    color: PURPLE.base,
    fontSize: 12,
  },
  actionButton: {
    backgroundColor: PURPLE.base,
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    marginLeft: 8,
    borderWidth: 1,
    borderColor: PURPLE.tintBorder,
  },
  actionButtonDisabled: {
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
  },
  actionButtonText: {
    color: '#0F1115',
    fontSize: 12,
    fontWeight: '800',
  },
  actionButtonTextDisabled: {
    color: '#9BA1A6',
  },
  pillBtn: {
    paddingHorizontal: 12,
    height: 30,
    borderRadius: 15,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
  },
  pillPrimary: {
    backgroundColor: PURPLE.base,
    borderColor: PURPLE.tintBorder,
  },
  pillPrimaryText: {
    color: '#0F1115',
    fontSize: 12,
    fontWeight: '800'
  },
  pillGhost: {
    backgroundColor: 'transparent',
    borderColor: 'rgba(255,255,255,0.12)'
  },
  pillGhostText: {
    color: '#E5E7EB',
    fontSize: 12,
    fontWeight: '700'
  },
  cancelButton: {
    backgroundColor: 'transparent',
    borderWidth: 1,
    borderColor: '#FF9800',
  },
  cancelButtonText: {
    color: '#FF9800',
  },
  requestActions: {
    flexDirection: 'row',
  },
  acceptButton: {
    backgroundColor: '#4CAF50',
  },
  declineButton: {
    backgroundColor: 'transparent',
    borderWidth: 1,
    borderColor: '#FF6B6B',
  },
  declineButtonText: {
    color: '#FF6B6B',
  },
});

export default AddFriendsScreen;
