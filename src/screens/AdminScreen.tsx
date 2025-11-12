import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
  RefreshControl,
  Animated,
  Dimensions,
  Image,
  Modal,
  Platform,
  TextInput,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons, MaterialCommunityIcons, MaterialIcons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';
import { adminService, AdminStats, AdminLog, AdminUserDetail, UserSearchFilters, PaginatedUsers } from '../services/adminService';
import { useAuth } from '../context/AuthContext';
import { AuthColors, AuthTypography, AuthSpacing } from '../components/auth/AuthDesignSystem';

const { width, height } = Dimensions.get('window');

const AdminScreen: React.FC = () => {
  const router = useRouter();
  const { user } = useAuth();
  const [isAdmin, setIsAdmin] = useState(false);
  const [adminLevel, setAdminLevel] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [stats, setStats] = useState<AdminStats | null>(null);
  const [logs, setLogs] = useState<AdminLog[]>([]);
  const [activeTab, setActiveTab] = useState<'dashboard' | 'users' | 'content' | 'logs'>('dashboard');

  // Modal states for detail views
  const [selectedStat, setSelectedStat] = useState<{ title: string; value: number; subtitle?: string; description: string } | null>(null);
  const [selectedLog, setSelectedLog] = useState<AdminLog | null>(null);
  const [showStatModal, setShowStatModal] = useState(false);
  const [showLogModal, setShowLogModal] = useState(false);

  // Users tab state
  const [users, setUsers] = useState<AdminUserDetail[]>([]);
  const [usersLoading, setUsersLoading] = useState(false);
  const [usersHasMore, setUsersHasMore] = useState(true);
  const [usersLastDoc, setUsersLastDoc] = useState<any>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [searchDebounce, setSearchDebounce] = useState('');
  const [filters, setFilters] = useState<UserSearchFilters>({
    role: 'all',
    status: 'all',
    subscription: 'all',
  });
  const [showFilters, setShowFilters] = useState(false);
  const [selectedUser, setSelectedUser] = useState<AdminUserDetail | null>(null);
  const [showUserModal, setShowUserModal] = useState(false);
  const [userActionLoading, setUserActionLoading] = useState(false);

  // Currency management modal
  const [showCurrencyModal, setShowCurrencyModal] = useState(false);
  const [currencyModalType, setCurrencyModalType] = useState<'gems' | 'gold'>('gems');
  const [currencyAmount, setCurrencyAmount] = useState('');
  const [currencyReason, setCurrencyReason] = useState('');
  const [currencyAction, setCurrencyAction] = useState<'add' | 'remove'>('add');

  // Reports modal
  const [showReportsModal, setShowReportsModal] = useState(false);
  const [userReports, setUserReports] = useState<any[]>([]);
  const [loadingReports, setLoadingReports] = useState(false);

  // Friends modal
  const [showFriendsModal, setShowFriendsModal] = useState(false);
  const [userFriends, setUserFriends] = useState<any[]>([]);
  const [loadingFriends, setLoadingFriends] = useState(false);

  // Animation values
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(50)).current;

  useEffect(() => {
    checkAdminAccess();
  }, []);

  useEffect(() => {
    // Animate tab change
    Animated.parallel([
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 300,
        useNativeDriver: true,
      }),
      Animated.spring(slideAnim, {
        toValue: 0,
        tension: 50,
        friction: 7,
        useNativeDriver: true,
      }),
    ]).start();

    return () => {
      fadeAnim.setValue(0);
      slideAnim.setValue(50);
    };
  }, [activeTab]);

  // Load users when switching to users tab
  useEffect(() => {
    if (activeTab === 'users' && users.length === 0) {
      loadUsers(true);
    }
  }, [activeTab]);

  // Debounce search input
  useEffect(() => {
    const timer = setTimeout(() => {
      setSearchDebounce(searchTerm);
    }, 500);

    return () => clearTimeout(timer);
  }, [searchTerm]);

  // Reload users when search or filters change
  useEffect(() => {
    if (activeTab === 'users') {
      loadUsers(true);
    }
  }, [searchDebounce, filters]);

  const checkAdminAccess = async () => {
    try {
      setLoading(true);
      const adminStatus = await adminService.isAdmin();
      const level = await adminService.getAdminLevel();

      if (!adminStatus) {
        Alert.alert(
          'Access Denied',
          'You do not have admin privileges.',
          [
            {
              text: 'OK',
              onPress: () => router.back(),
            },
          ]
        );
        return;
      }

      setIsAdmin(adminStatus);
      setAdminLevel(level);
      await loadData();
    } catch (error) {
      console.error('Error checking admin access:', error);
      Alert.alert('Error', 'Failed to verify admin access');
      router.back();
    } finally {
      setLoading(false);
    }
  };

  const loadData = async () => {
    try {
      const [statsData, logsData] = await Promise.all([
        adminService.getAdminStats(),
        adminService.getAdminLogs(20),
      ]);

      setStats(statsData);
      setLogs(logsData);
    } catch (error) {
      console.error('Error loading admin data:', error);
      Alert.alert('Error', 'Failed to load admin data');
    }
  };

  const handleRefresh = async () => {
    setRefreshing(true);
    await loadData();
    if (activeTab === 'users') {
      await loadUsers(true);
    }
    setRefreshing(false);
  };

  const loadUsers = async (reset: boolean = false) => {
    try {
      if (reset) {
        setUsersLoading(true);
        setUsers([]);
        setUsersLastDoc(null);
      }

      const result = await adminService.getUsers(
        20,
        reset ? null : usersLastDoc,
        {
          searchTerm: searchDebounce,
          ...filters,
        }
      );

      if (reset) {
        setUsers(result.users);
      } else {
        setUsers([...users, ...result.users]);
      }

      setUsersLastDoc(result.lastDoc);
      setUsersHasMore(result.hasMore);
    } catch (error) {
      console.error('Error loading users:', error);
      Alert.alert('Error', 'Failed to load users');
    } finally {
      setUsersLoading(false);
    }
  };

  const handleSuspendUser = async (userId: string, reason: string) => {
    try {
      setUserActionLoading(true);
      await adminService.suspendUser(userId, reason);
      Alert.alert('Success', 'User suspended successfully');
      await loadUsers(true);
      setShowUserModal(false);
    } catch (error: any) {
      console.error('Error suspending user:', error);
      Alert.alert('Error', error.message || 'Failed to suspend user');
    } finally {
      setUserActionLoading(false);
    }
  };

  const handleUnsuspendUser = async (userId: string) => {
    try {
      setUserActionLoading(true);
      await adminService.unsuspendUser(userId);
      Alert.alert('Success', 'User unsuspended successfully');
      await loadUsers(true);
      setShowUserModal(false);
    } catch (error: any) {
      console.error('Error unsuspending user:', error);
      Alert.alert('Error', error.message || 'Failed to unsuspend user');
    } finally {
      setUserActionLoading(false);
    }
  };

  const handleUpdateUserRole = async (userId: string, role: 'super' | 'moderator' | 'support' | 'regular') => {
    try {
      setUserActionLoading(true);
      await adminService.updateUserRole(userId, role);
      Alert.alert('Success', `User role updated to ${role}`);
      await loadUsers(true);
      setShowUserModal(false);
    } catch (error: any) {
      console.error('Error updating user role:', error);
      Alert.alert('Error', error.message || 'Failed to update user role');
    } finally {
      setUserActionLoading(false);
    }
  };

  const handleResetPassword = async (email: string) => {
    try {
      setUserActionLoading(true);
      await adminService.resetUserPassword(email);
      Alert.alert('Success', 'Password reset email sent');
    } catch (error: any) {
      console.error('Error resetting password:', error);
      Alert.alert('Error', error.message || 'Failed to send password reset email');
    } finally {
      setUserActionLoading(false);
    }
  };

  const handleForceSignOut = async (userId: string) => {
    try {
      setUserActionLoading(true);
      await adminService.forceSignOut(userId);
      Alert.alert('Success', 'User signed out successfully');
      await loadUsers(true);
      setShowUserModal(false);
    } catch (error: any) {
      console.error('Error forcing sign out:', error);
      Alert.alert('Error', error.message || 'Failed to sign out user');
    } finally {
      setUserActionLoading(false);
    }
  };

  // Currency management handlers
  const handleOpenCurrencyModal = (type: 'gems' | 'gold', action: 'add' | 'remove') => {
    setCurrencyModalType(type);
    setCurrencyAction(action);
    setCurrencyAmount('');
    setCurrencyReason('');
    setShowCurrencyModal(true);
  };

  const handleCurrencySubmit = async () => {
    if (!selectedUser) return;

    const amount = parseInt(currencyAmount);
    if (isNaN(amount) || amount <= 0) {
      Alert.alert('Error', 'Please enter a valid amount');
      return;
    }

    if (!currencyReason.trim()) {
      Alert.alert('Error', 'Please enter a reason');
      return;
    }

    try {
      setUserActionLoading(true);

      if (currencyAction === 'add') {
        await adminService.addCurrencyToUser(
          selectedUser.uid,
          currencyModalType,
          amount,
          currencyReason
        );
        Alert.alert('Success', `Added ${amount} ${currencyModalType} to user`);
      } else {
        await adminService.removeCurrencyFromUser(
          selectedUser.uid,
          currencyModalType,
          amount,
          currencyReason
        );
        Alert.alert('Success', `Removed ${amount} ${currencyModalType} from user`);
      }

      setShowCurrencyModal(false);

      // Refresh user data
      await loadUsers(true);

      // Reopen user modal after a short delay
      setTimeout(() => {
        setShowUserModal(true);
      }, 300);
    } catch (error: any) {
      console.error('Error managing currency:', error);
      Alert.alert('Error', error.message || 'Failed to update currency');
    } finally {
      setUserActionLoading(false);
    }
  };

  // Reports handlers
  const handleOpenReportsModal = async () => {
    if (!selectedUser) return;

    setShowReportsModal(true);
    setLoadingReports(true);

    try {
      const reports = await adminService.getUserReports(selectedUser.uid);
      setUserReports(reports);
    } catch (error) {
      console.error('Error loading reports:', error);
      Alert.alert('Error', 'Failed to load reports');
    } finally {
      setLoadingReports(false);
    }
  };

  // Friends handlers
  const handleOpenFriendsModal = async () => {
    if (!selectedUser) return;

    setShowFriendsModal(true);
    setLoadingFriends(true);

    try {
      const friends = await adminService.getUserFriends(selectedUser.uid);
      setUserFriends(friends);
    } catch (error) {
      console.error('Error loading friends:', error);
      Alert.alert('Error', 'Failed to load friends');
    } finally {
      setLoadingFriends(false);
    }
  };

  const formatNumber = (num: number): string => {
    if (num >= 1000000) {
      return `${(num / 1000000).toFixed(1)}M`;
    }
    if (num >= 1000) {
      return `${(num / 1000).toFixed(1)}K`;
    }
    return num.toString();
  };

  const getCategoryColor = (category: string): string => {
    switch (category) {
      case 'spam':
        return '#FFA500';
      case 'harassment':
        return '#F04747';
      case 'inappropriate':
        return '#E91E63';
      default:
        return '#72767D';
    }
  };

  const getSubscriptionBadgeStyle = (plan: string) => {
    switch (plan) {
      case 'vip':
        return { backgroundColor: 'rgba(255, 215, 0, 0.15)', borderColor: '#FFD700' };
      case 'premium':
        return { backgroundColor: 'rgba(138, 43, 226, 0.15)', borderColor: '#8A2BE2' };
      case 'gem_plus':
        return { backgroundColor: 'rgba(88, 101, 242, 0.15)', borderColor: '#5865F2' };
      default:
        return { backgroundColor: 'rgba(114, 118, 125, 0.15)', borderColor: '#72767D' };
    }
  };

  const formatDate = (date: Date | undefined): string => {
    if (!date) return 'Unknown';

    // Convert to Date object if it's a Firestore timestamp
    const dateObj = date instanceof Date ? date : new Date(date);

    // Check if valid date
    if (isNaN(dateObj.getTime())) return 'Invalid date';

    const now = new Date();
    const diff = now.getTime() - dateObj.getTime();
    const minutes = Math.floor(diff / 60000);
    const hours = Math.floor(diff / 3600000);
    const days = Math.floor(diff / 86400000);

    if (minutes < 1) return 'Just now';
    if (minutes < 60) return `${minutes}m ago`;
    if (hours < 24) return `${hours}h ago`;
    if (days < 7) return `${days}d ago`;
    return dateObj.toLocaleDateString();
  };

  const getStatDescription = (title: string): string => {
    switch (title) {
      case 'Total Users':
        return 'Total number of registered users on the platform. This includes all active, inactive, and suspended accounts.';
      case 'Active Users':
        return 'Users who have been active in the last 24 hours. This includes users who logged in, sent messages, or interacted with content.';
      case 'Total Streams':
        return 'Total number of streams created on the platform since launch. This includes both completed and ongoing streams.';
      case 'Active Streams':
        return 'Number of live streams currently broadcasting. Users can join these streams in real-time.';
      case 'Messages':
        return 'Total number of messages sent across all conversations. This includes direct messages and group chats.';
      case 'Flagged Content':
        return 'Content that has been reported by users and is pending moderator review. Requires immediate attention.';
      default:
        return 'Detailed statistics for this metric.';
    }
  };

  const renderStatCard = (
    title: string,
    value: number,
    iconName: string,
    iconFamily: 'ionicons' | 'material' | 'community',
    gradientColors: readonly [string, string, ...string[]],
    subtitle?: string
  ) => {
    const IconComponent = iconFamily === 'ionicons' ? Ionicons : iconFamily === 'material' ? MaterialIcons : MaterialCommunityIcons;

    return (
      <TouchableOpacity
        style={styles.statCard}
        activeOpacity={0.7}
        onPress={() => {
          setSelectedStat({
            title,
            value,
            subtitle,
            description: getStatDescription(title),
          });
          setShowStatModal(true);
        }}
      >
        <LinearGradient
          colors={['rgba(255, 255, 255, 0.05)', 'rgba(255, 255, 255, 0.02)']}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={styles.statCardGradient}
        >
          <View style={styles.statCardContent}>
            <View style={styles.statIconContainer}>
              <LinearGradient
                colors={gradientColors}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
                style={styles.statIconGradient}
              >
                <IconComponent name={iconName as any} size={24} color="#FFFFFF" />
              </LinearGradient>
            </View>

            <View style={styles.statInfo}>
              <Text style={styles.statTitle}>{title}</Text>
              <Text style={styles.statValue}>{formatNumber(value)}</Text>
              {subtitle && <Text style={styles.statSubtitle}>{subtitle}</Text>}
            </View>
          </View>
        </LinearGradient>
      </TouchableOpacity>
    );
  };

  const renderDashboard = () => (
    <Animated.View
      style={[
        styles.tabContent,
        {
          opacity: fadeAnim,
          transform: [{ translateY: slideAnim }],
        },
      ]}
    >
      <ScrollView
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={handleRefresh} tintColor="#5865F2" />
        }
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
      >
        <View style={styles.statsGrid}>
          {renderStatCard('Total Users', stats?.totalUsers || 0, 'account-group', 'community', ['#7C62F4', '#5B4BD6'])}
          {renderStatCard('Active Users', stats?.activeUsers || 0, 'account-check', 'community', ['#43B581', '#2D7D5A'], '24h')}
          {renderStatCard('Total Streams', stats?.totalStreams || 0, 'video', 'community', ['#F59E0B', '#D97706'])}
          {renderStatCard('Active Streams', stats?.activeStreams || 0, 'broadcast', 'community', ['#F04747', '#C73636'], 'Live now')}
          {renderStatCard('Messages', stats?.totalMessages || 0, 'message-text', 'community', ['#5865F2', '#4752C4'])}
          {renderStatCard('Flagged Content', stats?.flaggedContent || 0, 'alert-circle', 'community', ['#F04747', '#C73636'], 'Pending review')}
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Quick Actions</Text>
          <View style={styles.actionGrid}>
            <TouchableOpacity style={styles.actionButton}>
              <LinearGradient
                colors={['rgba(88, 101, 242, 0.15)', 'rgba(88, 101, 242, 0.05)']}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
                style={styles.actionButtonGradient}
              >
                <MaterialCommunityIcons name="account-group" size={20} color="#5865F2" />
                <Text style={styles.actionText}>Manage Users</Text>
              </LinearGradient>
            </TouchableOpacity>

            <TouchableOpacity style={styles.actionButton}>
              <LinearGradient
                colors={['rgba(240, 71, 71, 0.15)', 'rgba(240, 71, 71, 0.05)']}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
                style={styles.actionButtonGradient}
              >
                <MaterialCommunityIcons name="flag" size={20} color="#F04747" />
                <Text style={styles.actionText}>Review Reports</Text>
              </LinearGradient>
            </TouchableOpacity>

            <TouchableOpacity style={styles.actionButton}>
              <LinearGradient
                colors={['rgba(67, 181, 129, 0.15)', 'rgba(67, 181, 129, 0.05)']}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
                style={styles.actionButtonGradient}
              >
                <MaterialCommunityIcons name="chart-line" size={20} color="#43B581" />
                <Text style={styles.actionText}>Analytics</Text>
              </LinearGradient>
            </TouchableOpacity>

            <TouchableOpacity style={styles.actionButton}>
              <LinearGradient
                colors={['rgba(245, 158, 11, 0.15)', 'rgba(245, 158, 11, 0.05)']}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
                style={styles.actionButtonGradient}
              >
                <MaterialCommunityIcons name="cog" size={20} color="#F59E0B" />
                <Text style={styles.actionText}>Settings</Text>
              </LinearGradient>
            </TouchableOpacity>
          </View>
        </View>
      </ScrollView>
    </Animated.View>
  );

  const getActionIcon = (action: string) => {
    if (action.includes('suspend')) return { name: 'account-cancel', color: '#F04747' };
    if (action.includes('unsuspend')) return { name: 'account-check', color: '#43B581' };
    if (action.includes('delete')) return { name: 'delete', color: '#F04747' };
    if (action.includes('update')) return { name: 'pencil', color: '#F59E0B' };
    if (action.includes('create')) return { name: 'plus-circle', color: '#43B581' };
    return { name: 'information', color: '#5865F2' };
  };

  const getActionBadgeColor = (action: string) => {
    if (action.includes('suspend') || action.includes('delete')) return 'rgba(240, 71, 71, 0.15)';
    if (action.includes('unsuspend') || action.includes('create')) return 'rgba(67, 181, 129, 0.15)';
    if (action.includes('update')) return 'rgba(245, 158, 11, 0.15)';
    return 'rgba(88, 101, 242, 0.15)';
  };

  const renderLogs = () => (
    <Animated.View
      style={[
        styles.tabContent,
        {
          opacity: fadeAnim,
          transform: [{ translateY: slideAnim }],
        },
      ]}
    >
      <ScrollView
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={handleRefresh} tintColor="#5865F2" />
        }
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
      >
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Recent Admin Actions</Text>
          {logs.length === 0 ? (
            <View style={styles.emptyState}>
              <MaterialCommunityIcons name="clipboard-text-outline" size={64} color="#72767D" />
              <Text style={styles.emptyText}>No admin logs yet</Text>
              <Text style={styles.emptySubtext}>Admin actions will appear here</Text>
            </View>
          ) : (
            logs.map((log, index) => {
              const iconData = getActionIcon(log.action);
              return (
                <TouchableOpacity
                  key={log.id}
                  style={[styles.logItem, index === logs.length - 1 && { marginBottom: 0 }]}
                  activeOpacity={0.7}
                  onPress={() => {
                    setSelectedLog(log);
                    setShowLogModal(true);
                  }}
                >
                  <View style={styles.logAvatarContainer}>
                    <LinearGradient
                      colors={['#7C62F4', '#5B4BD6']}
                      start={{ x: 0, y: 0 }}
                      end={{ x: 1, y: 1 }}
                      style={styles.logAvatar}
                    >
                      <MaterialCommunityIcons name={iconData.name as any} size={20} color="#FFFFFF" />
                    </LinearGradient>
                  </View>

                  <View style={styles.logContent}>
                    <View style={styles.logTopRow}>
                      <View style={[styles.logActionBadge, { backgroundColor: getActionBadgeColor(log.action) }]}>
                        <Text style={styles.logActionText}>{log.action}</Text>
                      </View>
                      <Text style={styles.logTime}>{formatDate(log.timestamp)}</Text>
                    </View>

                    <Text style={styles.logDetails} numberOfLines={2}>{log.details}</Text>

                    <View style={styles.logBottomRow}>
                      <View style={styles.logAdminBadge}>
                        <MaterialCommunityIcons name="shield-account" size={12} color="#9AA3B2" />
                        <Text style={styles.logAdminText}>{log.adminEmail}</Text>
                      </View>
                      {log.targetEmail && (
                        <View style={styles.logTargetBadge}>
                          <MaterialCommunityIcons name="account" size={12} color="#9AA3B2" />
                          <Text style={styles.logTargetText}>{log.targetEmail}</Text>
                        </View>
                      )}
                    </View>
                  </View>
                </TouchableOpacity>
              );
            })
          )}
        </View>
      </ScrollView>
    </Animated.View>
  );

  const renderUsers = () => (
    <Animated.View
      style={[
        styles.tabContent,
        {
          opacity: fadeAnim,
          transform: [{ translateY: slideAnim }],
        },
      ]}
    >
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={handleRefresh}
            tintColor="#5865F2"
          />
        }
      >
        {/* Search Bar */}
        <View style={styles.searchContainer}>
          <View style={styles.searchInputWrapper}>
            <Ionicons name="search" size={20} color="#72767D" style={styles.searchIcon} />
            <TextInput
              style={styles.searchInput}
              placeholder="Search by email, username, or name..."
              placeholderTextColor="#72767D"
              value={searchTerm}
              onChangeText={setSearchTerm}
            />
            {searchTerm.length > 0 && (
              <TouchableOpacity onPress={() => setSearchTerm('')}>
                <Ionicons name="close-circle" size={20} color="#72767D" />
              </TouchableOpacity>
            )}
          </View>
          <TouchableOpacity
            style={styles.filterButton}
            onPress={() => setShowFilters(!showFilters)}
          >
            <MaterialCommunityIcons
              name={showFilters ? "filter" : "filter-outline"}
              size={20}
              color={showFilters ? "#5865F2" : "#FFFFFF"}
            />
          </TouchableOpacity>
        </View>

        {/* Filters */}
        {showFilters && (
          <View style={styles.filtersContainer}>
            <View style={styles.filterRow}>
              <Text style={styles.filterLabel}>Role:</Text>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.filterOptions}>
                {['all', 'admin', 'moderator', 'support', 'regular'].map((role) => (
                  <TouchableOpacity
                    key={role}
                    style={[
                      styles.filterChip,
                      filters.role === role && styles.filterChipActive,
                    ]}
                    onPress={() => setFilters({ ...filters, role: role as any })}
                  >
                    <Text
                      style={[
                        styles.filterChipText,
                        filters.role === role && styles.filterChipTextActive,
                      ]}
                    >
                      {role.charAt(0).toUpperCase() + role.slice(1)}
                    </Text>
                  </TouchableOpacity>
                ))}
              </ScrollView>
            </View>

            <View style={styles.filterRow}>
              <Text style={styles.filterLabel}>Status:</Text>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.filterOptions}>
                {['all', 'active', 'suspended'].map((status) => (
                  <TouchableOpacity
                    key={status}
                    style={[
                      styles.filterChip,
                      filters.status === status && styles.filterChipActive,
                    ]}
                    onPress={() => setFilters({ ...filters, status: status as any })}
                  >
                    <Text
                      style={[
                        styles.filterChipText,
                        filters.status === status && styles.filterChipTextActive,
                      ]}
                    >
                      {status.charAt(0).toUpperCase() + status.slice(1)}
                    </Text>
                  </TouchableOpacity>
                ))}
              </ScrollView>
            </View>

            <View style={styles.filterRow}>
              <Text style={styles.filterLabel}>Plan:</Text>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.filterOptions}>
                {['all', 'free', 'gem_plus', 'premium', 'vip'].map((plan) => (
                  <TouchableOpacity
                    key={plan}
                    style={[
                      styles.filterChip,
                      filters.subscription === plan && styles.filterChipActive,
                    ]}
                    onPress={() => setFilters({ ...filters, subscription: plan as any })}
                  >
                    <Text
                      style={[
                        styles.filterChipText,
                        filters.subscription === plan && styles.filterChipTextActive,
                      ]}
                    >
                      {plan === 'gem_plus' ? 'Gem+' : plan.charAt(0).toUpperCase() + plan.slice(1)}
                    </Text>
                  </TouchableOpacity>
                ))}
              </ScrollView>
            </View>
          </View>
        )}

        {/* Active Filters Summary */}
        {(filters.role !== 'all' || filters.status !== 'all' || filters.subscription !== 'all' || searchDebounce) && (
          <View style={styles.activeFiltersContainer}>
            <Text style={styles.activeFiltersLabel}>Active filters:</Text>
            <View style={styles.activeFiltersList}>
              {searchDebounce && (
                <View style={styles.activeFilterBadge}>
                  <Text style={styles.activeFilterText}>Search: "{searchDebounce}"</Text>
                  <TouchableOpacity onPress={() => setSearchTerm('')}>
                    <Ionicons name="close" size={14} color="#FFFFFF" />
                  </TouchableOpacity>
                </View>
              )}
              {filters.role !== 'all' && (
                <View style={styles.activeFilterBadge}>
                  <Text style={styles.activeFilterText}>Role: {filters.role}</Text>
                  <TouchableOpacity onPress={() => setFilters({ ...filters, role: 'all' })}>
                    <Ionicons name="close" size={14} color="#FFFFFF" />
                  </TouchableOpacity>
                </View>
              )}
              {filters.status !== 'all' && (
                <View style={styles.activeFilterBadge}>
                  <Text style={styles.activeFilterText}>Status: {filters.status}</Text>
                  <TouchableOpacity onPress={() => setFilters({ ...filters, status: 'all' })}>
                    <Ionicons name="close" size={14} color="#FFFFFF" />
                  </TouchableOpacity>
                </View>
              )}
              {filters.subscription !== 'all' && (
                <View style={styles.activeFilterBadge}>
                  <Text style={styles.activeFilterText}>Plan: {filters.subscription}</Text>
                  <TouchableOpacity onPress={() => setFilters({ ...filters, subscription: 'all' })}>
                    <Ionicons name="close" size={14} color="#FFFFFF" />
                  </TouchableOpacity>
                </View>
              )}
            </View>
          </View>
        )}

        {/* User List */}
        <View style={styles.section}>
          {usersLoading && users.length === 0 ? (
            <View style={styles.loadingContainer}>
              <ActivityIndicator size="large" color="#5865F2" />
              <Text style={styles.loadingText}>Loading users...</Text>
            </View>
          ) : users.length === 0 ? (
            <View style={styles.emptyState}>
              <MaterialCommunityIcons name="account-search-outline" size={64} color="#72767D" />
              <Text style={styles.emptyText}>No users found</Text>
              <Text style={styles.emptySubtext}>Try adjusting your search or filters</Text>
            </View>
          ) : (
            <>
              {users.map((user, index) => (
                <TouchableOpacity
                  key={user.uid}
                  style={[styles.userCard, index === users.length - 1 && { marginBottom: 0 }]}
                  activeOpacity={0.7}
                  onPress={() => {
                    setSelectedUser(user);
                    setShowUserModal(true);
                  }}
                >
                  <View style={styles.userCardLeft}>
                    {user.photoURL ? (
                      <Image source={{ uri: user.photoURL }} style={styles.userAvatar} />
                    ) : (
                      <View style={[styles.userAvatar, styles.userAvatarPlaceholder]}>
                        <Text style={styles.userAvatarText}>
                          {user.displayName.charAt(0).toUpperCase()}
                        </Text>
                      </View>
                    )}
                    <View style={[styles.userStatusDot, { backgroundColor: user.isOnline ? '#43B581' : '#72767D' }]} />
                  </View>

                  <View style={styles.userCardContent}>
                    <View style={styles.userCardHeader}>
                      <Text style={styles.userName} numberOfLines={1}>
                        {user.displayName}
                      </Text>
                      {user.isAdmin && (
                        <View style={[styles.userBadge, styles.adminBadge]}>
                          <MaterialCommunityIcons name="shield-crown" size={12} color="#FFD700" />
                          <Text style={styles.adminBadgeText}>{user.adminLevel?.toUpperCase()}</Text>
                        </View>
                      )}
                      {user.suspended && (
                        <View style={[styles.userBadge, styles.suspendedBadge]}>
                          <MaterialCommunityIcons name="cancel" size={12} color="#F04747" />
                          <Text style={styles.suspendedBadgeText}>SUSPENDED</Text>
                        </View>
                      )}
                    </View>

                    <Text style={styles.userEmail} numberOfLines={1}>
                      {user.email}
                    </Text>

                    <View style={styles.userCardFooter}>
                      <View style={styles.userStats}>
                        <MaterialCommunityIcons name="diamond-stone" size={14} color="#5865F2" />
                        <Text style={styles.userStatText}>{user.gems || 0}</Text>
                        <MaterialCommunityIcons name="gold" size={14} color="#FFD700" style={{ marginLeft: 8 }} />
                        <Text style={styles.userStatText}>{user.gold || 0}</Text>
                        <MaterialCommunityIcons name="alert-circle" size={14} color="#F04747" style={{ marginLeft: 8 }} />
                        <Text style={styles.userStatText}>{user.reportCount || 0} {user.reportCount === 1 ? 'Report' : 'Reports'}</Text>
                      </View>
                      {user.subscriptionPlan && user.subscriptionPlan !== 'free' && (
                        <View style={[styles.subscriptionBadge, getSubscriptionBadgeStyle(user.subscriptionPlan)]}>
                          <Text style={styles.subscriptionBadgeText}>
                            {user.subscriptionPlan === 'gem_plus' ? 'GEM+' : user.subscriptionPlan.toUpperCase()}
                          </Text>
                        </View>
                      )}
                    </View>
                  </View>

                  <Ionicons name="chevron-forward" size={20} color="#72767D" />
                </TouchableOpacity>
              ))}

              {/* Load More Button */}
              {usersHasMore && (
                <TouchableOpacity
                  style={styles.loadMoreButton}
                  onPress={() => loadUsers(false)}
                  disabled={usersLoading}
                >
                  {usersLoading ? (
                    <ActivityIndicator size="small" color="#FFFFFF" />
                  ) : (
                    <>
                      <Text style={styles.loadMoreText}>Load More</Text>
                      <Ionicons name="chevron-down" size={20} color="#FFFFFF" />
                    </>
                  )}
                </TouchableOpacity>
              )}
            </>
          )}
        </View>
      </ScrollView>
    </Animated.View>
  );

  const renderContent = () => (
    <Animated.View
      style={[
        styles.tabContent,
        {
          opacity: fadeAnim,
          transform: [{ translateY: slideAnim }],
        },
      ]}
    >
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scrollContent}>
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Content Moderation</Text>
          <View style={styles.emptyState}>
            <MaterialCommunityIcons name="shield-check-outline" size={64} color="#72767D" />
            <Text style={styles.emptyText}>Content moderation coming soon</Text>
            <Text style={styles.emptySubtext}>Review flagged content and reports</Text>
          </View>
        </View>
      </ScrollView>
    </Animated.View>
  );

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#5865F2" />
        <Text style={styles.loadingText}>Verifying admin access...</Text>
      </View>
    );
  }

  if (!isAdmin) {
    return null;
  }

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      {/* Header with Gradient */}
      <LinearGradient
        colors={['#7C62F4', '#5B4BD6']}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={styles.header}
      >
        <View style={styles.headerContainer}>
          <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
            <Ionicons name="arrow-back" size={24} color="#FFFFFF" />
          </TouchableOpacity>

          <View style={styles.headerContent}>
            <View style={styles.headerTitleRow}>
              <MaterialCommunityIcons name="shield-crown" size={24} color="#FFFFFF" />
              <Text style={styles.headerTitle}>Admin Panel</Text>
            </View>
            <View style={styles.adminLevelBadge}>
              <MaterialCommunityIcons name="shield-check" size={12} color="#43B581" />
              <Text style={styles.adminLevelText}>{adminLevel?.toUpperCase() || 'ADMIN'}</Text>
            </View>
          </View>

          <TouchableOpacity onPress={handleRefresh} style={styles.refreshButton}>
            <Ionicons name="refresh" size={24} color="#FFFFFF" />
          </TouchableOpacity>
        </View>
      </LinearGradient>

      {/* Tab Navigation */}
      <View style={styles.tabBar}>
        <TouchableOpacity
          style={[styles.tab, activeTab === 'dashboard' && styles.activeTab]}
          onPress={() => setActiveTab('dashboard')}
        >
          <MaterialCommunityIcons
            name="view-dashboard"
            size={18}
            color={activeTab === 'dashboard' ? '#5865F2' : '#72767D'}
          />
          <Text style={[styles.tabText, activeTab === 'dashboard' && styles.activeTabText]}>
            Dashboard
          </Text>
          {activeTab === 'dashboard' && <View style={styles.activeTabIndicator} />}
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.tab, activeTab === 'users' && styles.activeTab]}
          onPress={() => setActiveTab('users')}
        >
          <MaterialCommunityIcons
            name="account-group"
            size={18}
            color={activeTab === 'users' ? '#5865F2' : '#72767D'}
          />
          <Text style={[styles.tabText, activeTab === 'users' && styles.activeTabText]}>
            Users
          </Text>
          {activeTab === 'users' && <View style={styles.activeTabIndicator} />}
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.tab, activeTab === 'content' && styles.activeTab]}
          onPress={() => setActiveTab('content')}
        >
          <MaterialCommunityIcons
            name="shield-check"
            size={18}
            color={activeTab === 'content' ? '#5865F2' : '#72767D'}
          />
          <Text style={[styles.tabText, activeTab === 'content' && styles.activeTabText]}>
            Content
          </Text>
          {activeTab === 'content' && <View style={styles.activeTabIndicator} />}
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.tab, activeTab === 'logs' && styles.activeTab]}
          onPress={() => setActiveTab('logs')}
        >
          <MaterialCommunityIcons
            name="clipboard-text"
            size={18}
            color={activeTab === 'logs' ? '#5865F2' : '#72767D'}
          />
          <Text style={[styles.tabText, activeTab === 'logs' && styles.activeTabText]}>
            Logs
          </Text>
          {activeTab === 'logs' && <View style={styles.activeTabIndicator} />}
        </TouchableOpacity>
      </View>

      {/* Content */}
      {activeTab === 'dashboard' && renderDashboard()}
      {activeTab === 'users' && renderUsers()}
      {activeTab === 'content' && renderContent()}
      {activeTab === 'logs' && renderLogs()}

      {/* Stat Detail Modal */}
      <Modal
        visible={showStatModal}
        transparent
        animationType="fade"
        onRequestClose={() => setShowStatModal(false)}
      >
        <View style={styles.modalOverlay}>
          <TouchableOpacity
            style={styles.modalOverlayTouchable}
            activeOpacity={1}
            onPress={() => setShowStatModal(false)}
          />
          <View style={styles.modalContent}>
            <LinearGradient
              colors={['#1C1D23', '#151924']}
              start={{ x: 0, y: 0 }}
              end={{ x: 0, y: 1 }}
              style={styles.modalGradient}
            >
              <View style={styles.modalHeader}>
                <MaterialCommunityIcons name="chart-box" size={24} color="#5865F2" />
                <Text style={styles.modalTitle}>{selectedStat?.title}</Text>
                <TouchableOpacity onPress={() => setShowStatModal(false)} style={styles.modalCloseButton}>
                  <Ionicons name="close" size={24} color="#FFFFFF" />
                </TouchableOpacity>
              </View>

              <View style={styles.modalBody}>
                <View style={styles.modalStatValue}>
                  <Text style={styles.modalStatNumber}>{formatNumber(selectedStat?.value || 0)}</Text>
                  {selectedStat?.subtitle && (
                    <View style={styles.modalStatBadge}>
                      <Text style={styles.modalStatBadgeText}>{selectedStat.subtitle}</Text>
                    </View>
                  )}
                </View>

                <View style={styles.modalDivider} />

                <Text style={styles.modalDescription}>{selectedStat?.description}</Text>

                <TouchableOpacity
                  style={styles.modalButton}
                  onPress={() => setShowStatModal(false)}
                >
                  <LinearGradient
                    colors={['#5865F2', '#4752C4']}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 1 }}
                    style={styles.modalButtonGradient}
                  >
                    <Text style={styles.modalButtonText}>Got it</Text>
                  </LinearGradient>
                </TouchableOpacity>
              </View>
            </LinearGradient>
          </View>
        </View>
      </Modal>

      {/* Log Detail Modal */}
      <Modal
        visible={showLogModal}
        transparent
        animationType="fade"
        onRequestClose={() => setShowLogModal(false)}
      >
        <View style={styles.modalOverlay}>
          <TouchableOpacity
            style={styles.modalOverlayTouchable}
            activeOpacity={1}
            onPress={() => setShowLogModal(false)}
          />
          <View style={styles.modalContent}>
            <LinearGradient
              colors={['#1C1D23', '#151924']}
              start={{ x: 0, y: 0 }}
              end={{ x: 0, y: 1 }}
              style={styles.modalGradient}
            >
              <View style={styles.modalHeader}>
                <MaterialCommunityIcons name="clipboard-text" size={24} color="#5865F2" />
                <Text style={styles.modalTitle}>Admin Action Details</Text>
                <TouchableOpacity onPress={() => setShowLogModal(false)} style={styles.modalCloseButton}>
                  <Ionicons name="close" size={24} color="#FFFFFF" />
                </TouchableOpacity>
              </View>

              <View style={styles.modalBody}>
                <View style={[styles.logActionBadge, { backgroundColor: getActionBadgeColor(selectedLog?.action || ''), alignSelf: 'flex-start' }]}>
                  <Text style={styles.logActionText}>{selectedLog?.action}</Text>
                </View>

                <View style={styles.modalDivider} />

                <View style={styles.modalLogRow}>
                  <MaterialCommunityIcons name="shield-account" size={18} color="#9AA3B2" />
                  <View style={styles.modalLogInfo}>
                    <Text style={styles.modalLogLabel}>Admin</Text>
                    <Text style={styles.modalLogValue}>{selectedLog?.adminEmail}</Text>
                  </View>
                </View>

                {selectedLog?.targetEmail && (
                  <View style={styles.modalLogRow}>
                    <MaterialCommunityIcons name="account" size={18} color="#9AA3B2" />
                    <View style={styles.modalLogInfo}>
                      <Text style={styles.modalLogLabel}>Target User</Text>
                      <Text style={styles.modalLogValue}>{selectedLog.targetEmail}</Text>
                    </View>
                  </View>
                )}

                <View style={styles.modalLogRow}>
                  <MaterialCommunityIcons name="clock-outline" size={18} color="#9AA3B2" />
                  <View style={styles.modalLogInfo}>
                    <Text style={styles.modalLogLabel}>Timestamp</Text>
                    <Text style={styles.modalLogValue}>{formatDate(selectedLog?.timestamp)}</Text>
                  </View>
                </View>

                <View style={styles.modalDivider} />

                <Text style={styles.modalLogDetailsLabel}>Details</Text>
                <Text style={styles.modalLogDetailsText}>{selectedLog?.details}</Text>

                <TouchableOpacity
                  style={styles.modalButton}
                  onPress={() => setShowLogModal(false)}
                >
                  <LinearGradient
                    colors={['#5865F2', '#4752C4']}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 1 }}
                    style={styles.modalButtonGradient}
                  >
                    <Text style={styles.modalButtonText}>Close</Text>
                  </LinearGradient>
                </TouchableOpacity>
              </View>
            </LinearGradient>
          </View>
        </View>
      </Modal>

      {/* User Detail Modal */}
      <Modal
        visible={showUserModal}
        transparent
        animationType="slide"
        onRequestClose={() => setShowUserModal(false)}
      >
        <View style={styles.userModalOverlay}>
          <View style={styles.userModalContent}>
            <LinearGradient
              colors={['#1C1D23', '#151924']}
              start={{ x: 0, y: 0 }}
              end={{ x: 0, y: 1 }}
              style={styles.userModalGradient}
            >
              {/* Header */}
              <View style={styles.userModalHeader}>
                <Text style={styles.userModalTitle}>User Details</Text>
                <TouchableOpacity onPress={() => setShowUserModal(false)} style={styles.modalCloseButton}>
                  <Ionicons name="close" size={24} color="#FFFFFF" />
                </TouchableOpacity>
              </View>

              <ScrollView style={styles.userModalScroll} showsVerticalScrollIndicator={false}>
                {selectedUser && (
                  <>
                    {/* User Profile Section */}
                    <View style={styles.userModalProfile}>
                      {selectedUser.photoURL ? (
                        <Image source={{ uri: selectedUser.photoURL }} style={styles.userModalAvatar} />
                      ) : (
                        <View style={[styles.userModalAvatar, styles.userAvatarPlaceholder]}>
                          <Text style={styles.userModalAvatarText}>
                            {selectedUser.displayName.charAt(0).toUpperCase()}
                          </Text>
                        </View>
                      )}
                      <View style={[styles.userModalStatusDot, { backgroundColor: selectedUser.isOnline ? '#43B581' : '#72767D' }]} />

                      <Text style={styles.userModalName}>{selectedUser.displayName}</Text>
                      <Text style={styles.userModalEmail}>{selectedUser.email}</Text>

                      {selectedUser.username && (
                        <Text style={styles.userModalUsername}>@{selectedUser.username}</Text>
                      )}

                      <View style={styles.userModalBadges}>
                        {selectedUser.isAdmin && (
                          <View style={[styles.userBadge, styles.adminBadge]}>
                            <MaterialCommunityIcons name="shield-crown" size={14} color="#FFD700" />
                            <Text style={styles.adminBadgeText}>{selectedUser.adminLevel?.toUpperCase()}</Text>
                          </View>
                        )}
                        {selectedUser.suspended && (
                          <View style={[styles.userBadge, styles.suspendedBadge]}>
                            <MaterialCommunityIcons name="cancel" size={14} color="#F04747" />
                            <Text style={styles.suspendedBadgeText}>SUSPENDED</Text>
                          </View>
                        )}
                        {selectedUser.subscriptionPlan && selectedUser.subscriptionPlan !== 'free' && (
                          <View style={[styles.subscriptionBadge, getSubscriptionBadgeStyle(selectedUser.subscriptionPlan)]}>
                            <Text style={styles.subscriptionBadgeText}>
                              {selectedUser.subscriptionPlan === 'gem_plus' ? 'GEM+' : selectedUser.subscriptionPlan.toUpperCase()}
                            </Text>
                          </View>
                        )}
                      </View>
                    </View>

                    <View style={styles.modalDivider} />

                    {/* Stats Section */}
                    <View style={styles.userModalSection}>
                      <Text style={styles.userModalSectionTitle}>Account Stats</Text>
                      <View style={styles.userModalStatsGrid}>
                        {/* Gems - Clickable */}
                        <TouchableOpacity
                          style={styles.userModalStatItem}
                          onPress={() => {
                            Alert.alert(
                              'Manage Gems',
                              `Current: ${selectedUser.gems ?? 0} gems`,
                              [
                                { text: 'Cancel', style: 'cancel' },
                                {
                                  text: 'Add Gems',
                                  onPress: () => {
                                    setShowUserModal(false);
                                    setTimeout(() => handleOpenCurrencyModal('gems', 'add'), 300);
                                  }
                                },
                                {
                                  text: 'Remove Gems',
                                  onPress: () => {
                                    setShowUserModal(false);
                                    setTimeout(() => handleOpenCurrencyModal('gems', 'remove'), 300);
                                  },
                                  style: 'destructive'
                                },
                              ]
                            );
                          }}
                          activeOpacity={0.7}
                        >
                          <MaterialCommunityIcons name="diamond-stone" size={24} color="#5865F2" />
                          <Text style={styles.userModalStatValue}>{selectedUser.gems ?? '—'}</Text>
                          <Text style={styles.userModalStatLabel}>Gems</Text>
                        </TouchableOpacity>

                        {/* Gold - Clickable */}
                        <TouchableOpacity
                          style={styles.userModalStatItem}
                          onPress={() => {
                            Alert.alert(
                              'Manage Gold',
                              `Current: ${selectedUser.gold ?? 0} gold`,
                              [
                                { text: 'Cancel', style: 'cancel' },
                                {
                                  text: 'Add Gold',
                                  onPress: () => {
                                    setShowUserModal(false);
                                    setTimeout(() => handleOpenCurrencyModal('gold', 'add'), 300);
                                  }
                                },
                                {
                                  text: 'Remove Gold',
                                  onPress: () => {
                                    setShowUserModal(false);
                                    setTimeout(() => handleOpenCurrencyModal('gold', 'remove'), 300);
                                  },
                                  style: 'destructive'
                                },
                              ]
                            );
                          }}
                          activeOpacity={0.7}
                        >
                          <MaterialCommunityIcons name="gold" size={24} color="#FFD700" />
                          <Text style={styles.userModalStatValue}>{selectedUser.gold ?? '—'}</Text>
                          <Text style={styles.userModalStatLabel}>Gold</Text>
                        </TouchableOpacity>

                        {/* Reports - Clickable */}
                        <TouchableOpacity
                          style={styles.userModalStatItem}
                          onPress={handleOpenReportsModal}
                          activeOpacity={0.7}
                        >
                          <MaterialCommunityIcons name="alert-circle" size={24} color="#F04747" />
                          <Text style={styles.userModalStatValue}>{selectedUser.reportCount ?? '—'}</Text>
                          <Text style={styles.userModalStatLabel}>Reports</Text>
                        </TouchableOpacity>

                        {/* Friends - Clickable */}
                        <TouchableOpacity
                          style={styles.userModalStatItem}
                          onPress={handleOpenFriendsModal}
                          activeOpacity={0.7}
                        >
                          <MaterialCommunityIcons name="account-group" size={24} color="#43B581" />
                          <Text style={styles.userModalStatValue}>{selectedUser.friendCount ?? '—'}</Text>
                          <Text style={styles.userModalStatLabel}>Friends</Text>
                        </TouchableOpacity>
                      </View>
                    </View>

                    <View style={styles.modalDivider} />

                    {/* Account Info Section */}
                    <View style={styles.userModalSection}>
                      <Text style={styles.userModalSectionTitle}>Account Information</Text>
                      <View style={styles.userModalInfoRow}>
                        <Text style={styles.userModalInfoLabel}>Created:</Text>
                        <Text style={styles.userModalInfoValue}>
                          {selectedUser.createdAt.toLocaleDateString()}
                        </Text>
                      </View>
                      <View style={styles.userModalInfoRow}>
                        <Text style={styles.userModalInfoLabel}>Last Active:</Text>
                        <Text style={styles.userModalInfoValue}>
                          {selectedUser.lastActive ? formatDate(selectedUser.lastActive) : 'Never'}
                        </Text>
                      </View>
                      <View style={styles.userModalInfoRow}>
                        <Text style={styles.userModalInfoLabel}>Status:</Text>
                        <Text style={[styles.userModalInfoValue, { color: selectedUser.isOnline ? '#43B581' : '#72767D' }]}>
                          {selectedUser.status}
                        </Text>
                      </View>
                      {selectedUser.suspended && (
                        <>
                          <View style={styles.userModalInfoRow}>
                            <Text style={styles.userModalInfoLabel}>Suspended:</Text>
                            <Text style={[styles.userModalInfoValue, { color: '#F04747' }]}>Yes</Text>
                          </View>
                          {selectedUser.suspensionReason && (
                            <View style={styles.userModalInfoRow}>
                              <Text style={styles.userModalInfoLabel}>Reason:</Text>
                              <Text style={[styles.userModalInfoValue, { color: '#F04747' }]}>
                                {selectedUser.suspensionReason}
                              </Text>
                            </View>
                          )}
                        </>
                      )}
                    </View>

                    <View style={styles.modalDivider} />

                    {/* Admin Actions */}
                    <View style={styles.userModalSection}>
                      <Text style={styles.userModalSectionTitle}>Admin Actions</Text>

                      {/* Suspend/Unsuspend */}
                      {selectedUser.suspended ? (
                        <TouchableOpacity
                          style={[styles.userModalActionButton, styles.successButton]}
                          onPress={() => {
                            Alert.alert(
                              'Unsuspend User',
                              `Are you sure you want to unsuspend ${selectedUser.displayName}?`,
                              [
                                { text: 'Cancel', style: 'cancel' },
                                {
                                  text: 'Unsuspend',
                                  onPress: () => handleUnsuspendUser(selectedUser.uid),
                                },
                              ]
                            );
                          }}
                          disabled={userActionLoading}
                        >
                          <MaterialCommunityIcons name="check-circle" size={20} color="#43B581" />
                          <Text style={[styles.userModalActionText, { color: '#43B581' }]}>
                            Unsuspend User
                          </Text>
                        </TouchableOpacity>
                      ) : (
                        <TouchableOpacity
                          style={[styles.userModalActionButton, styles.dangerButton]}
                          onPress={() => {
                            Alert.prompt(
                              'Suspend User',
                              `Enter reason for suspending ${selectedUser.displayName}:`,
                              [
                                { text: 'Cancel', style: 'cancel' },
                                {
                                  text: 'Suspend',
                                  onPress: (reason?: string) => {
                                    if (reason) {
                                      handleSuspendUser(selectedUser.uid, reason);
                                    }
                                  },
                                },
                              ],
                              'plain-text'
                            );
                          }}
                          disabled={userActionLoading}
                        >
                          <MaterialCommunityIcons name="cancel" size={20} color="#F04747" />
                          <Text style={[styles.userModalActionText, { color: '#F04747' }]}>
                            Suspend User
                          </Text>
                        </TouchableOpacity>
                      )}

                      {/* Reset Password */}
                      <TouchableOpacity
                        style={styles.userModalActionButton}
                        onPress={() => {
                          Alert.alert(
                            'Reset Password',
                            `Send password reset email to ${selectedUser.email}?`,
                            [
                              { text: 'Cancel', style: 'cancel' },
                              {
                                text: 'Send',
                                onPress: () => handleResetPassword(selectedUser.email),
                              },
                            ]
                          );
                        }}
                        disabled={userActionLoading}
                      >
                        <MaterialCommunityIcons name="lock-reset" size={20} color="#5865F2" />
                        <Text style={styles.userModalActionText}>Reset Password</Text>
                      </TouchableOpacity>

                      {/* Force Sign Out */}
                      <TouchableOpacity
                        style={styles.userModalActionButton}
                        onPress={() => {
                          Alert.alert(
                            'Force Sign Out',
                            `Force ${selectedUser.displayName} to sign out?`,
                            [
                              { text: 'Cancel', style: 'cancel' },
                              {
                                text: 'Sign Out',
                                onPress: () => handleForceSignOut(selectedUser.uid),
                              },
                            ]
                          );
                        }}
                        disabled={userActionLoading}
                      >
                        <MaterialCommunityIcons name="logout" size={20} color="#FFA500" />
                        <Text style={styles.userModalActionText}>Force Sign Out</Text>
                      </TouchableOpacity>

                      {/* Update Role (Super Admin Only) */}
                      {adminLevel === 'super' && (
                        <View style={styles.userModalRoleSection}>
                          <Text style={styles.userModalRoleTitle}>Change Role:</Text>
                          <View style={styles.userModalRoleButtons}>
                            {['regular', 'support', 'moderator', 'super'].map((role) => (
                              <TouchableOpacity
                                key={role}
                                style={[
                                  styles.userModalRoleButton,
                                  (selectedUser.isAdmin ? selectedUser.adminLevel : 'regular') === role && styles.userModalRoleButtonActive,
                                ]}
                                onPress={() => {
                                  Alert.alert(
                                    'Change Role',
                                    `Change ${selectedUser.displayName}'s role to ${role}?`,
                                    [
                                      { text: 'Cancel', style: 'cancel' },
                                      {
                                        text: 'Change',
                                        onPress: () => handleUpdateUserRole(selectedUser.uid, role as any),
                                      },
                                    ]
                                  );
                                }}
                                disabled={userActionLoading}
                              >
                                <Text
                                  style={[
                                    styles.userModalRoleButtonText,
                                    (selectedUser.isAdmin ? selectedUser.adminLevel : 'regular') === role && styles.userModalRoleButtonTextActive,
                                  ]}
                                >
                                  {role.charAt(0).toUpperCase() + role.slice(1)}
                                </Text>
                              </TouchableOpacity>
                            ))}
                          </View>
                        </View>
                      )}
                    </View>
                  </>
                )}
              </ScrollView>

              {userActionLoading && (
                <View style={styles.userModalLoadingOverlay}>
                  <ActivityIndicator size="large" color="#5865F2" />
                </View>
              )}
            </LinearGradient>
          </View>
        </View>
      </Modal>

      {/* Currency Management Modal */}
      <Modal
        visible={showCurrencyModal}
        transparent
        animationType="fade"
        onRequestClose={() => {
          setShowCurrencyModal(false);
          setTimeout(() => setShowUserModal(true), 300);
        }}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.currencyModalContainer}>
            <LinearGradient
              colors={['#2C2F33', '#23272A'] as readonly [string, string, ...string[]]}
              style={styles.currencyModalContent}
            >
              <View style={styles.currencyModalHeader}>
                <Text style={styles.currencyModalTitle}>
                  {currencyAction === 'add' ? 'Add' : 'Remove'} {currencyModalType === 'gems' ? 'Gems' : 'Gold'}
                </Text>
                <TouchableOpacity onPress={() => {
                  setShowCurrencyModal(false);
                  setTimeout(() => setShowUserModal(true), 300);
                }}>
                  <Ionicons name="close" size={24} color="#FFFFFF" />
                </TouchableOpacity>
              </View>

              <View style={styles.currencyModalBody}>
                <Text style={styles.currencyModalLabel}>Amount:</Text>
                <TextInput
                  style={styles.currencyModalInput}
                  placeholder="Enter amount"
                  placeholderTextColor="#72767D"
                  keyboardType="numeric"
                  value={currencyAmount}
                  onChangeText={setCurrencyAmount}
                />

                <Text style={styles.currencyModalLabel}>Reason:</Text>
                <TextInput
                  style={[styles.currencyModalInput, styles.currencyModalTextArea]}
                  placeholder="Enter reason for this action"
                  placeholderTextColor="#72767D"
                  multiline
                  numberOfLines={3}
                  value={currencyReason}
                  onChangeText={setCurrencyReason}
                />

                <TouchableOpacity
                  style={[styles.currencyModalButton, currencyAction === 'remove' && styles.currencyModalButtonDanger]}
                  onPress={handleCurrencySubmit}
                  disabled={userActionLoading}
                >
                  {userActionLoading ? (
                    <ActivityIndicator color="#FFFFFF" />
                  ) : (
                    <Text style={styles.currencyModalButtonText}>
                      {currencyAction === 'add' ? 'Add' : 'Remove'} {currencyModalType === 'gems' ? 'Gems' : 'Gold'}
                    </Text>
                  )}
                </TouchableOpacity>
              </View>
            </LinearGradient>
          </View>
        </View>
      </Modal>

      {/* Reports Modal */}
      <Modal
        visible={showReportsModal}
        transparent
        animationType="fade"
        onRequestClose={() => setShowReportsModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.reportsModalContainer}>
            <LinearGradient
              colors={['#2C2F33', '#23272A'] as readonly [string, string, ...string[]]}
              style={styles.reportsModalContent}
            >
              <View style={styles.reportsModalHeader}>
                <Text style={styles.reportsModalTitle}>User Reports</Text>
                <TouchableOpacity onPress={() => setShowReportsModal(false)}>
                  <Ionicons name="close" size={24} color="#FFFFFF" />
                </TouchableOpacity>
              </View>

              <ScrollView style={styles.reportsModalScroll}>
                {loadingReports ? (
                  <View style={styles.reportsModalLoading}>
                    <ActivityIndicator size="large" color="#5865F2" />
                    <Text style={styles.reportsModalLoadingText}>Loading reports...</Text>
                  </View>
                ) : userReports.length === 0 ? (
                  <View style={styles.reportsModalEmpty}>
                    <MaterialCommunityIcons name="check-circle" size={48} color="#43B581" />
                    <Text style={styles.reportsModalEmptyText}>No reports found</Text>
                    <Text style={styles.reportsModalEmptySubtext}>This user has not been reported</Text>
                  </View>
                ) : (
                  userReports.map((report, index) => (
                    <View key={report.id || index} style={styles.reportCard}>
                      <View style={styles.reportCardHeader}>
                        <View style={[styles.reportCategoryBadge, { backgroundColor: getCategoryColor(report.category) }]}>
                          <Text style={styles.reportCategoryText}>{report.category.toUpperCase()}</Text>
                        </View>
                        <Text style={styles.reportDate}>
                          {report.createdAt?.toLocaleDateString()}
                        </Text>
                      </View>
                      <Text style={styles.reportReason}>{report.reason}</Text>
                      {report.description && (
                        <Text style={styles.reportDescription}>{report.description}</Text>
                      )}
                      <View style={styles.reportFooter}>
                        <Text style={styles.reportStatus}>Status: {report.status}</Text>
                        {report.reporterName && (
                          <Text style={styles.reportReporter}>By: {report.reporterName}</Text>
                        )}
                      </View>
                    </View>
                  ))
                )}
              </ScrollView>
            </LinearGradient>
          </View>
        </View>
      </Modal>

      {/* Friends Modal */}
      <Modal
        visible={showFriendsModal}
        transparent
        animationType="fade"
        onRequestClose={() => setShowFriendsModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.friendsModalContainer}>
            <LinearGradient
              colors={['#2C2F33', '#23272A'] as readonly [string, string, ...string[]]}
              style={styles.friendsModalContent}
            >
              <View style={styles.friendsModalHeader}>
                <Text style={styles.friendsModalTitle}>Friends List</Text>
                <TouchableOpacity onPress={() => setShowFriendsModal(false)}>
                  <Ionicons name="close" size={24} color="#FFFFFF" />
                </TouchableOpacity>
              </View>

              <ScrollView style={styles.friendsModalScroll}>
                {loadingFriends ? (
                  <View style={styles.friendsModalLoading}>
                    <ActivityIndicator size="large" color="#5865F2" />
                    <Text style={styles.friendsModalLoadingText}>Loading friends...</Text>
                  </View>
                ) : userFriends.length === 0 ? (
                  <View style={styles.friendsModalEmpty}>
                    <MaterialCommunityIcons name="account-off" size={48} color="#72767D" />
                    <Text style={styles.friendsModalEmptyText}>No friends</Text>
                    <Text style={styles.friendsModalEmptySubtext}>This user has no friends yet</Text>
                  </View>
                ) : (
                  userFriends.map((friend, index) => (
                    <View key={friend.uid || index} style={styles.friendCard}>
                      <View style={styles.friendCardLeft}>
                        {friend.photoURL ? (
                          <Image source={{ uri: friend.photoURL }} style={styles.friendAvatar} />
                        ) : (
                          <View style={[styles.friendAvatar, styles.friendAvatarPlaceholder]}>
                            <Text style={styles.friendAvatarText}>
                              {friend.displayName.charAt(0).toUpperCase()}
                            </Text>
                          </View>
                        )}
                        <View style={[styles.friendStatusDot, { backgroundColor: friend.isOnline ? '#43B581' : '#72767D' }]} />
                      </View>
                      <View style={styles.friendCardRight}>
                        <Text style={styles.friendName}>{friend.displayName}</Text>
                        {friend.username && (
                          <Text style={styles.friendUsername}>@{friend.username}</Text>
                        )}
                        <Text style={[styles.friendStatus, { color: friend.isOnline ? '#43B581' : '#72767D' }]}>
                          {friend.status}
                        </Text>
                      </View>
                    </View>
                  ))
                )}
              </ScrollView>
            </LinearGradient>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: AuthColors.background,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: AuthColors.background,
  },
  loadingText: {
    marginTop: AuthSpacing.md,
    fontSize: 16,
    color: AuthColors.secondaryText,
    fontWeight: '500',
  },
  // Header Styles
  header: {
    paddingBottom: AuthSpacing.md,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
  },
  headerContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: AuthSpacing.md,
    paddingTop: AuthSpacing.sm,
  },
  backButton: {
    padding: AuthSpacing.sm,
    marginRight: AuthSpacing.xs,
  },
  headerContent: {
    flex: 1,
  },
  headerTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: AuthSpacing.sm,
  },
  headerTitle: {
    fontSize: 22,
    fontWeight: '700',
    color: '#FFFFFF',
    letterSpacing: 0.5,
  },
  adminLevelBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(67, 181, 129, 0.15)',
    paddingHorizontal: AuthSpacing.sm,
    paddingVertical: 4,
    borderRadius: 12,
    marginTop: AuthSpacing.xs,
    alignSelf: 'flex-start',
    gap: 4,
  },
  adminLevelText: {
    fontSize: 10,
    color: '#43B581',
    fontWeight: '700',
    letterSpacing: 0.8,
  },
  refreshButton: {
    padding: AuthSpacing.sm,
  },
  // Tab Bar Styles
  tabBar: {
    flexDirection: 'row',
    backgroundColor: AuthColors.cardBackground,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255, 255, 255, 0.06)',
    paddingHorizontal: AuthSpacing.xs,
  },
  tab: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: AuthSpacing.md,
    gap: 6,
    position: 'relative',
  },
  activeTab: {
    // Active state handled by indicator
  },
  activeTabIndicator: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    height: 3,
    backgroundColor: '#5865F2',
    borderTopLeftRadius: 3,
    borderTopRightRadius: 3,
  },
  tabText: {
    fontSize: 13,
    color: AuthColors.mutedText,
    fontWeight: '500',
  },
  activeTabText: {
    color: '#5865F2',
    fontWeight: '700',
  },
  // Content Styles
  tabContent: {
    flex: 1,
  },
  section: {
    padding: AuthSpacing.md,
  },
  sectionTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: AuthColors.mutedText,
    textTransform: 'uppercase',
    letterSpacing: 1,
    marginBottom: AuthSpacing.md,
  },
  // Stats Grid
  statsGrid: {
    padding: AuthSpacing.md,
    gap: AuthSpacing.md,
  },
  statCard: {
    marginBottom: AuthSpacing.sm,
  },
  statCardGradient: {
    borderRadius: 16,
    padding: AuthSpacing.md,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.06)',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 4,
  },
  statCardContent: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  statIconContainer: {
    marginRight: AuthSpacing.md,
  },
  statIconGradient: {
    width: 56,
    height: 56,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 3,
  },
  statInfo: {
    flex: 1,
  },
  statTitle: {
    fontSize: 13,
    color: AuthColors.mutedText,
    fontWeight: '600',
    marginBottom: 4,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  statValue: {
    fontSize: 28,
    fontWeight: '700',
    color: '#FFFFFF',
    marginBottom: 2,
  },
  statSubtitle: {
    fontSize: 11,
    color: AuthColors.mutedText,
    fontWeight: '500',
  },
  // Action Buttons
  actionGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: AuthSpacing.sm,
  },
  actionButton: {
    flex: 1,
    minWidth: '47%',
    borderRadius: 12,
    overflow: 'hidden',
  },
  actionButtonGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: AuthSpacing.md,
    gap: AuthSpacing.sm,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.06)',
    borderRadius: 12,
  },
  actionText: {
    fontSize: 13,
    color: AuthColors.primaryText,
    fontWeight: '600',
  },
  // Log Items (Discord-style list)
  logItem: {
    flexDirection: 'row',
    backgroundColor: '#14161B',
    borderRadius: 14,
    padding: AuthSpacing.md,
    marginBottom: AuthSpacing.md,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.06)',
  },
  logAvatarContainer: {
    marginRight: AuthSpacing.md,
  },
  logAvatar: {
    width: 48,
    height: 48,
    borderRadius: 24,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 3,
  },
  logContent: {
    flex: 1,
  },
  logTopRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: AuthSpacing.sm,
  },
  logActionBadge: {
    paddingHorizontal: AuthSpacing.sm,
    paddingVertical: 4,
    borderRadius: 10,
  },
  logActionText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#FFFFFF',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  logTime: {
    fontSize: 11,
    color: AuthColors.mutedText,
    fontWeight: '500',
  },
  logDetails: {
    fontSize: 14,
    color: AuthColors.secondaryText,
    marginBottom: AuthSpacing.sm,
    lineHeight: 20,
  },
  logBottomRow: {
    flexDirection: 'row',
    gap: AuthSpacing.md,
    flexWrap: 'wrap',
  },
  logAdminBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  logAdminText: {
    fontSize: 11,
    color: AuthColors.mutedText,
    fontWeight: '500',
  },
  logTargetBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  logTargetText: {
    fontSize: 11,
    color: AuthColors.mutedText,
    fontWeight: '500',
  },
  // Empty State
  emptyState: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: AuthSpacing.xxxl,
  },
  emptyText: {
    fontSize: 16,
    color: AuthColors.mutedText,
    fontWeight: '600',
    marginTop: AuthSpacing.md,
  },
  emptySubtext: {
    fontSize: 13,
    color: AuthColors.mutedText,
    marginTop: AuthSpacing.xs,
    opacity: 0.7,
  },
  // ScrollView Content
  scrollContent: {
    paddingBottom: Platform.OS === 'ios' ? 120 : 100,
  },
  // Modal Styles
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.85)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalOverlayTouchable: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
  },
  modalContent: {
    width: width * 0.9,
    maxWidth: 400,
    borderRadius: 16,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.5,
    shadowRadius: 16,
    elevation: 16,
  },
  modalGradient: {
    padding: 0,
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: AuthSpacing.lg,
    paddingTop: AuthSpacing.lg,
    paddingBottom: AuthSpacing.md,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255, 255, 255, 0.1)',
  },
  modalTitle: {
    flex: 1,
    fontSize: 20,
    fontWeight: '700',
    color: '#FFFFFF',
    marginLeft: AuthSpacing.sm,
  },
  modalCloseButton: {
    padding: AuthSpacing.xs,
  },
  modalBody: {
    padding: AuthSpacing.lg,
  },
  modalStatValue: {
    alignItems: 'center',
    marginBottom: AuthSpacing.md,
  },
  modalStatNumber: {
    fontSize: 48,
    fontWeight: '800',
    color: '#5865F2',
    marginBottom: AuthSpacing.xs,
  },
  modalStatBadge: {
    backgroundColor: 'rgba(88, 101, 242, 0.15)',
    paddingHorizontal: AuthSpacing.md,
    paddingVertical: AuthSpacing.xs,
    borderRadius: 12,
  },
  modalStatBadgeText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#5865F2',
  },
  modalDivider: {
    height: 1,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    marginVertical: AuthSpacing.md,
  },
  modalDescription: {
    fontSize: 15,
    lineHeight: 22,
    color: AuthColors.secondaryText,
    marginBottom: AuthSpacing.lg,
  },
  modalButton: {
    borderRadius: 12,
    overflow: 'hidden',
  },
  modalButtonGradient: {
    paddingVertical: AuthSpacing.md,
    alignItems: 'center',
  },
  modalButtonText: {
    fontSize: 16,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  modalLogRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: AuthSpacing.md,
  },
  modalLogInfo: {
    flex: 1,
    marginLeft: AuthSpacing.sm,
  },
  modalLogLabel: {
    fontSize: 12,
    color: AuthColors.mutedText,
    marginBottom: 2,
    textTransform: 'uppercase',
    fontWeight: '600',
  },
  modalLogValue: {
    fontSize: 15,
    color: '#FFFFFF',
    fontWeight: '500',
  },
  modalLogDetailsLabel: {
    fontSize: 12,
    color: AuthColors.mutedText,
    marginBottom: AuthSpacing.xs,
    textTransform: 'uppercase',
    fontWeight: '600',
  },
  modalLogDetailsText: {
    fontSize: 15,
    lineHeight: 22,
    color: AuthColors.secondaryText,
    marginBottom: AuthSpacing.lg,
  },
  // Users Tab Styles
  searchContainer: {
    flexDirection: 'row',
    paddingHorizontal: AuthSpacing.lg,
    paddingVertical: AuthSpacing.md,
    gap: AuthSpacing.sm,
  },
  searchInputWrapper: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#1C1D23',
    borderRadius: 12,
    paddingHorizontal: AuthSpacing.md,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.06)',
  },
  searchIcon: {
    marginRight: AuthSpacing.sm,
  },
  searchInput: {
    flex: 1,
    color: '#FFFFFF',
    fontSize: 15,
    paddingVertical: AuthSpacing.md,
  },
  filterButton: {
    width: 48,
    height: 48,
    backgroundColor: '#1C1D23',
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.06)',
  },
  filtersContainer: {
    paddingHorizontal: AuthSpacing.lg,
    paddingBottom: AuthSpacing.md,
    gap: AuthSpacing.sm,
  },
  filterRow: {
    gap: AuthSpacing.xs,
  },
  filterLabel: {
    fontSize: 13,
    fontWeight: '600',
    color: AuthColors.mutedText,
    marginBottom: 4,
  },
  filterOptions: {
    flexDirection: 'row',
  },
  filterChip: {
    paddingHorizontal: AuthSpacing.md,
    paddingVertical: AuthSpacing.xs,
    backgroundColor: '#1C1D23',
    borderRadius: 8,
    marginRight: AuthSpacing.xs,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.06)',
  },
  filterChipActive: {
    backgroundColor: 'rgba(88, 101, 242, 0.15)',
    borderColor: '#5865F2',
  },
  filterChipText: {
    fontSize: 13,
    color: AuthColors.secondaryText,
    fontWeight: '500',
  },
  filterChipTextActive: {
    color: '#5865F2',
    fontWeight: '600',
  },
  activeFiltersContainer: {
    paddingHorizontal: AuthSpacing.lg,
    paddingBottom: AuthSpacing.md,
  },
  activeFiltersLabel: {
    fontSize: 12,
    color: AuthColors.mutedText,
    marginBottom: AuthSpacing.xs,
    fontWeight: '600',
  },
  activeFiltersList: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: AuthSpacing.xs,
  },
  activeFilterBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(88, 101, 242, 0.15)',
    paddingHorizontal: AuthSpacing.sm,
    paddingVertical: 4,
    borderRadius: 6,
    gap: 4,
  },
  activeFilterText: {
    fontSize: 12,
    color: '#5865F2',
    fontWeight: '500',
  },
  userCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#1C1D23',
    borderRadius: 12,
    padding: AuthSpacing.md,
    marginBottom: AuthSpacing.sm,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.06)',
  },
  userCardLeft: {
    position: 'relative',
    marginRight: AuthSpacing.md,
  },
  userAvatar: {
    width: 56,
    height: 56,
    borderRadius: 28,
  },
  userAvatarPlaceholder: {
    backgroundColor: '#5865F2',
    justifyContent: 'center',
    alignItems: 'center',
  },
  userAvatarText: {
    fontSize: 24,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  userStatusDot: {
    position: 'absolute',
    bottom: 2,
    right: 2,
    width: 14,
    height: 14,
    borderRadius: 7,
    borderWidth: 2,
    borderColor: '#1C1D23',
  },
  userCardContent: {
    flex: 1,
  },
  userCardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 4,
    gap: AuthSpacing.xs,
  },
  userName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#FFFFFF',
    flex: 1,
  },
  userBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 6,
    gap: 2,
  },
  adminBadge: {
    backgroundColor: 'rgba(255, 215, 0, 0.15)',
  },
  adminBadgeText: {
    fontSize: 10,
    fontWeight: '700',
    color: '#FFD700',
  },
  suspendedBadge: {
    backgroundColor: 'rgba(240, 71, 71, 0.15)',
  },
  suspendedBadgeText: {
    fontSize: 10,
    fontWeight: '700',
    color: '#F04747',
  },
  userEmail: {
    fontSize: 13,
    color: AuthColors.mutedText,
    marginBottom: AuthSpacing.xs,
  },
  userCardFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  userStats: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  userStatText: {
    fontSize: 12,
    color: AuthColors.secondaryText,
    fontWeight: '500',
  },
  subscriptionBadge: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
    borderWidth: 1,
  },
  subscriptionBadgeText: {
    fontSize: 10,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  loadMoreButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#5865F2',
    borderRadius: 12,
    paddingVertical: AuthSpacing.md,
    marginTop: AuthSpacing.md,
    gap: AuthSpacing.xs,
  },
  loadMoreText: {
    fontSize: 15,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  // User Modal Styles
  userModalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.85)',
    justifyContent: 'flex-end',
  },
  userModalContent: {
    height: height * 0.85,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    overflow: 'hidden',
  },
  userModalGradient: {
    flex: 1,
  },
  userModalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: AuthSpacing.lg,
    paddingTop: AuthSpacing.lg,
    paddingBottom: AuthSpacing.md,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255, 255, 255, 0.1)',
  },
  userModalTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  userModalScroll: {
    flex: 1,
  },
  userModalProfile: {
    alignItems: 'center',
    paddingVertical: AuthSpacing.xl,
  },
  userModalAvatar: {
    width: 96,
    height: 96,
    borderRadius: 48,
    marginBottom: AuthSpacing.md,
  },
  userModalAvatarText: {
    fontSize: 40,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  userModalStatusDot: {
    position: 'absolute',
    top: 70,
    left: '50%',
    marginLeft: 30,
    width: 20,
    height: 20,
    borderRadius: 10,
    borderWidth: 3,
    borderColor: '#1C1D23',
  },
  userModalName: {
    fontSize: 24,
    fontWeight: '700',
    color: '#FFFFFF',
    marginBottom: 4,
  },
  userModalEmail: {
    fontSize: 15,
    color: AuthColors.mutedText,
    marginBottom: 4,
  },
  userModalUsername: {
    fontSize: 14,
    color: AuthColors.secondaryText,
    marginBottom: AuthSpacing.sm,
  },
  userModalBadges: {
    flexDirection: 'row',
    gap: AuthSpacing.xs,
    marginTop: AuthSpacing.sm,
  },
  userModalSection: {
    paddingHorizontal: AuthSpacing.lg,
    paddingVertical: AuthSpacing.md,
  },
  userModalSectionTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#FFFFFF',
    marginBottom: AuthSpacing.md,
  },
  userModalStatsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: AuthSpacing.md,
  },
  userModalStatItem: {
    flex: 1,
    minWidth: '45%',
    backgroundColor: 'rgba(88, 101, 242, 0.1)',
    borderRadius: 12,
    padding: AuthSpacing.md,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(88, 101, 242, 0.2)',
  },
  userModalStatValue: {
    fontSize: 24,
    fontWeight: '700',
    color: '#FFFFFF',
    marginTop: AuthSpacing.xs,
  },
  userModalStatLabel: {
    fontSize: 12,
    color: AuthColors.mutedText,
    marginTop: 2,
  },
  userModalInfoRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: AuthSpacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255, 255, 255, 0.05)',
  },
  userModalInfoLabel: {
    fontSize: 14,
    color: AuthColors.mutedText,
    fontWeight: '600',
  },
  userModalInfoValue: {
    fontSize: 14,
    color: '#FFFFFF',
    fontWeight: '500',
  },
  userModalActionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(88, 101, 242, 0.1)',
    borderRadius: 12,
    paddingVertical: AuthSpacing.md,
    paddingHorizontal: AuthSpacing.lg,
    marginBottom: AuthSpacing.sm,
    borderWidth: 1,
    borderColor: 'rgba(88, 101, 242, 0.2)',
    gap: AuthSpacing.sm,
  },
  dangerButton: {
    backgroundColor: 'rgba(240, 71, 71, 0.1)',
    borderColor: 'rgba(240, 71, 71, 0.2)',
  },
  successButton: {
    backgroundColor: 'rgba(67, 181, 129, 0.1)',
    borderColor: 'rgba(67, 181, 129, 0.2)',
  },
  userModalActionText: {
    fontSize: 15,
    fontWeight: '600',
    color: '#5865F2',
  },
  userModalRoleSection: {
    marginTop: AuthSpacing.md,
  },
  userModalRoleTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: AuthColors.mutedText,
    marginBottom: AuthSpacing.sm,
  },
  userModalRoleButtons: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: AuthSpacing.xs,
  },
  userModalRoleButton: {
    flex: 1,
    minWidth: '45%',
    backgroundColor: 'rgba(114, 118, 125, 0.1)',
    borderRadius: 8,
    paddingVertical: AuthSpacing.sm,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(114, 118, 125, 0.2)',
  },
  userModalRoleButtonActive: {
    backgroundColor: 'rgba(88, 101, 242, 0.15)',
    borderColor: '#5865F2',
  },
  userModalRoleButtonText: {
    fontSize: 13,
    fontWeight: '600',
    color: AuthColors.secondaryText,
  },
  userModalRoleButtonTextActive: {
    color: '#5865F2',
  },
  userModalLoadingOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    justifyContent: 'center',
    alignItems: 'center',
  },

  // Currency Modal Styles
  currencyModalContainer: {
    width: '90%',
    maxWidth: 400,
    borderRadius: 16,
    overflow: 'hidden',
  },
  currencyModalContent: {
    padding: AuthSpacing.xl,
  },
  currencyModalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: AuthSpacing.lg,
  },
  currencyModalTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: AuthColors.primaryText,
  },
  currencyModalBody: {
    gap: AuthSpacing.md,
  },
  currencyModalLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: AuthColors.primaryText,
    marginBottom: 4,
  },
  currencyModalInput: {
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    borderRadius: 8,
    padding: AuthSpacing.md,
    fontSize: 16,
    color: AuthColors.primaryText,
    borderWidth: 1,
    borderColor: 'rgba(114, 118, 125, 0.3)',
  },
  currencyModalTextArea: {
    height: 80,
    textAlignVertical: 'top',
  },
  currencyModalButton: {
    backgroundColor: '#5865F2',
    borderRadius: 8,
    padding: AuthSpacing.md,
    alignItems: 'center',
    marginTop: AuthSpacing.md,
  },
  currencyModalButtonDanger: {
    backgroundColor: '#F04747',
  },
  currencyModalButtonText: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#FFFFFF',
  },

  // Reports Modal Styles
  reportsModalContainer: {
    width: '90%',
    maxWidth: 500,
    maxHeight: '80%',
    borderRadius: 16,
    overflow: 'hidden',
  },
  reportsModalContent: {
    flex: 1,
  },
  reportsModalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: AuthSpacing.lg,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(114, 118, 125, 0.2)',
  },
  reportsModalTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: AuthColors.primaryText,
  },
  reportsModalScroll: {
    flex: 1,
    padding: AuthSpacing.lg,
  },
  reportsModalLoading: {
    padding: AuthSpacing.xl,
    alignItems: 'center',
    gap: AuthSpacing.md,
  },
  reportsModalLoadingText: {
    fontSize: 14,
    color: AuthColors.secondaryText,
  },
  reportsModalEmpty: {
    padding: AuthSpacing.xl,
    alignItems: 'center',
    gap: AuthSpacing.sm,
  },
  reportsModalEmptyText: {
    fontSize: 18,
    fontWeight: '600',
    color: AuthColors.primaryText,
  },
  reportsModalEmptySubtext: {
    fontSize: 14,
    color: AuthColors.secondaryText,
  },
  reportCard: {
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    borderRadius: 12,
    padding: AuthSpacing.md,
    marginBottom: AuthSpacing.md,
    borderWidth: 1,
    borderColor: 'rgba(114, 118, 125, 0.2)',
  },
  reportCardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: AuthSpacing.sm,
  },
  reportCategoryBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
  },
  reportCategoryText: {
    fontSize: 11,
    fontWeight: 'bold',
    color: '#FFFFFF',
  },
  reportDate: {
    fontSize: 12,
    color: AuthColors.secondaryText,
  },
  reportReason: {
    fontSize: 15,
    fontWeight: '600',
    color: AuthColors.primaryText,
    marginBottom: AuthSpacing.xs,
  },
  reportDescription: {
    fontSize: 13,
    color: AuthColors.secondaryText,
    marginBottom: AuthSpacing.sm,
  },
  reportFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: AuthSpacing.xs,
  },
  reportStatus: {
    fontSize: 12,
    color: '#43B581',
    fontWeight: '500',
  },
  reportReporter: {
    fontSize: 12,
    color: AuthColors.secondaryText,
  },

  // Friends Modal Styles
  friendsModalContainer: {
    width: '90%',
    maxWidth: 500,
    maxHeight: '80%',
    borderRadius: 16,
    overflow: 'hidden',
  },
  friendsModalContent: {
    flex: 1,
  },
  friendsModalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: AuthSpacing.lg,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(114, 118, 125, 0.2)',
  },
  friendsModalTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: AuthColors.primaryText,
  },
  friendsModalScroll: {
    flex: 1,
    padding: AuthSpacing.lg,
  },
  friendsModalLoading: {
    padding: AuthSpacing.xl,
    alignItems: 'center',
    gap: AuthSpacing.md,
  },
  friendsModalLoadingText: {
    fontSize: 14,
    color: AuthColors.secondaryText,
  },
  friendsModalEmpty: {
    padding: AuthSpacing.xl,
    alignItems: 'center',
    gap: AuthSpacing.sm,
  },
  friendsModalEmptyText: {
    fontSize: 18,
    fontWeight: '600',
    color: AuthColors.primaryText,
  },
  friendsModalEmptySubtext: {
    fontSize: 14,
    color: AuthColors.secondaryText,
  },
  friendCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    borderRadius: 12,
    padding: AuthSpacing.md,
    marginBottom: AuthSpacing.md,
    borderWidth: 1,
    borderColor: 'rgba(114, 118, 125, 0.2)',
  },
  friendCardLeft: {
    position: 'relative',
    marginRight: AuthSpacing.md,
  },
  friendAvatar: {
    width: 48,
    height: 48,
    borderRadius: 24,
  },
  friendAvatarPlaceholder: {
    backgroundColor: '#5865F2',
    justifyContent: 'center',
    alignItems: 'center',
  },
  friendAvatarText: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#FFFFFF',
  },
  friendStatusDot: {
    position: 'absolute',
    bottom: 0,
    right: 0,
    width: 14,
    height: 14,
    borderRadius: 7,
    borderWidth: 2,
    borderColor: '#2C2F33',
  },
  friendCardRight: {
    flex: 1,
  },
  friendName: {
    fontSize: 16,
    fontWeight: '600',
    color: AuthColors.primaryText,
    marginBottom: 2,
  },
  friendUsername: {
    fontSize: 13,
    color: AuthColors.secondaryText,
    marginBottom: 2,
  },
  friendStatus: {
    fontSize: 12,
    fontWeight: '500',
  },
});

export default AdminScreen;

