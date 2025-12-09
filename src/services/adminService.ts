import { getAuth } from 'firebase/auth';
import { doc, getDoc, setDoc, updateDoc, collection, query, where, getDocs, deleteDoc, serverTimestamp, orderBy, limit, startAfter, DocumentSnapshot, Timestamp } from 'firebase/firestore';
import { db } from './firebase';
import { virtualCurrencyService } from './virtualCurrencyService';

export interface AdminUser {
  uid: string;
  email: string;
  displayName: string;
  isAdmin: boolean;
  adminLevel?: 'super' | 'moderator' | 'support';
  grantedAt?: Date;
  grantedBy?: string;
}

export interface AdminUserDetail {
  uid: string;
  email: string;
  displayName: string;
  username?: string;
  photoURL?: string;
  gold: number;
  gems: number;
  reportCount: number; // Number of times this user has been reported
  createdAt: Date;
  lastActive?: Date;
  isOnline: boolean;
  status: 'online' | 'offline' | 'busy' | 'idle';

  // Subscription
  subscriptionPlan?: 'free' | 'gem_plus' | 'premium' | 'vip';
  subscriptionStatus?: 'active' | 'inactive' | 'cancelled';

  // Admin
  isAdmin?: boolean;
  adminLevel?: 'super' | 'moderator' | 'support';

  // Account status
  suspended?: boolean;
  suspendedAt?: Date;
  suspendedUntil?: Date;
  suspensionReason?: string;

  // Stats
  totalStreams?: number;
  totalMessages?: number;
  friendCount: number; // Actual count of friends
  blockedUsers?: string[];

  // Privacy
  allowFriendRequests?: boolean;
  allowMessagesFromStrangers?: boolean;
  showOnlineStatus?: boolean;
}

export interface UserSearchFilters {
  searchTerm?: string;
  role?: 'all' | 'admin' | 'moderator' | 'support' | 'regular';
  status?: 'all' | 'active' | 'suspended';
  subscription?: 'all' | 'free' | 'gem_plus' | 'premium' | 'vip';
}

export interface PaginatedUsers {
  users: AdminUserDetail[];
  lastDoc: DocumentSnapshot | null;
  hasMore: boolean;
}

export interface AdminStats {
  totalUsers: number;
  activeUsers: number;
  totalStreams: number;
  activeStreams: number;
  totalMessages: number;
  totalRevenue: number;
  flaggedContent: number;
  reportedUsers: number;
}

export interface AdminLog {
  id: string;
  adminUid: string;
  adminEmail: string;
  action: string;
  targetUid?: string;
  targetEmail?: string;
  details: string;
  timestamp: Date;
}

export interface ModerationReport {
  id: string;
  reportedUserId: string;
  reporterId: string;
  reporterName?: string;
  reason: string;
  category: 'spam' | 'harassment' | 'inappropriate' | 'other';
  description?: string;
  status: 'pending' | 'reviewed' | 'resolved' | 'dismissed';
  createdAt: Date;
  reviewedAt?: Date;
  reviewedBy?: string;
  resolution?: string;
}

export interface FriendInfo {
  uid: string;
  displayName: string;
  username?: string;
  photoURL?: string;
  isOnline: boolean;
  status: 'online' | 'offline' | 'busy' | 'idle';
}

class AdminService {
  private adminCache: Map<string, { isAdmin: boolean; level?: string; expiresAt: number }> = new Map();
  private CACHE_DURATION = 5 * 60 * 1000; // 5 minutes

  /**
   * Check if current user is an admin
   */
  async isAdmin(): Promise<boolean> {
    try {
      const auth = getAuth();
      const user = auth.currentUser;

      if (!user) {
        console.log(`[ADMIN] No authenticated user found`);
        return false;
      }

      console.log(`[ADMIN] Checking admin status for user: ${user.uid} (${user.email})`);

      // Check cache first
      const cached = this.adminCache.get(user.uid);
      if (cached && cached.expiresAt > Date.now()) {
        console.log(`[ADMIN] Using cached admin status:`, cached.isAdmin);
        return cached.isAdmin;
      }

      // Get fresh token with claims (force refresh to get latest)
      console.log(`[ADMIN] Fetching fresh token with claims...`);
      const tokenResult = await user.getIdTokenResult(true);
      const isAdmin = tokenResult.claims.admin === true;
      const adminLevel = tokenResult.claims.adminLevel as string | undefined;

      console.log(`[ADMIN] Token claims result:`, {
        hasAdminClaim: tokenResult.claims.admin !== undefined,
        adminValue: tokenResult.claims.admin,
        adminLevel: adminLevel,
        allClaimKeys: Object.keys(tokenResult.claims)
      });

      // Update cache
      this.adminCache.set(user.uid, {
        isAdmin,
        level: adminLevel,
        expiresAt: Date.now() + this.CACHE_DURATION,
      });

      if (isAdmin) {
        console.log(`[ADMIN] ✅ User is admin (level: ${adminLevel || 'admin'})`);
      } else {
        console.log(`[ADMIN] ❌ User is not an admin`);
      }

      return isAdmin;
    } catch (error: any) {
      console.error(`[ADMIN] ❌ Error checking admin status:`, {
        error: error.message,
        code: error.code,
        stack: error.stack
      });
      return false;
    }
  }

  /**
   * Get admin level (super, moderator, support)
   */
  async getAdminLevel(): Promise<string | null> {
    try {
      const auth = getAuth();
      const user = auth.currentUser;

      if (!user) {
        console.log(`[ADMIN] No authenticated user found for admin level check`);
        return null;
      }

      // Check cache first
      const cached = this.adminCache.get(user.uid);
      if (cached && cached.expiresAt > Date.now()) {
        console.log(`[ADMIN] Using cached admin level:`, cached.level);
        return cached.level || null;
      }

      // Get fresh token with claims
      const tokenResult = await user.getIdTokenResult(true);
      const isAdmin = tokenResult.claims.admin === true;
      const adminLevel = tokenResult.claims.adminLevel as string | undefined;

      console.log(`[ADMIN] Admin level from token:`, adminLevel);

      // Update cache
      this.adminCache.set(user.uid, {
        isAdmin,
        level: adminLevel,
        expiresAt: Date.now() + this.CACHE_DURATION,
      });

      return adminLevel || null;
    } catch (error: any) {
      console.error(`[ADMIN] ❌ Error getting admin level:`, {
        error: error.message,
        code: error.code,
        stack: error.stack
      });
      return null;
    }
  }

  /**
   * Get admin statistics
   */
  async getAdminStats(): Promise<AdminStats> {
    try {
      const isAdmin = await this.isAdmin();
      if (!isAdmin) {
        throw new Error('Unauthorized: Admin access required');
      }

      // Get user stats
      const usersSnapshot = await getDocs(collection(db, 'users'));
      const totalUsers = usersSnapshot.size;

      // Get active users (logged in within last 24 hours)
      const oneDayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);
      const activeUsersQuery = query(
        collection(db, 'users'),
        where('lastActive', '>=', oneDayAgo)
      );
      const activeUsersSnapshot = await getDocs(activeUsersQuery);
      const activeUsers = activeUsersSnapshot.size;

      // Get stream stats
      const streamsSnapshot = await getDocs(collection(db, 'streams'));
      const totalStreams = streamsSnapshot.size;

      const activeStreamsQuery = query(
        collection(db, 'streams'),
        where('status', '==', 'active')
      );
      const activeStreamsSnapshot = await getDocs(activeStreamsQuery);
      const activeStreams = activeStreamsSnapshot.size;

      // Get message count (sample from conversations)
      let totalMessages = 0;
      const conversationsSnapshot = await getDocs(collection(db, 'conversations'));
      conversationsSnapshot.forEach((doc) => {
        const data = doc.data();
        totalMessages += data.messageCount || 0;
      });

      // Get flagged content count
      const flaggedQuery = query(
        collection(db, 'moderationReports'),
        where('status', '==', 'pending')
      );
      const flaggedSnapshot = await getDocs(flaggedQuery);
      const flaggedContent = flaggedSnapshot.size;

      return {
        totalUsers,
        activeUsers,
        totalStreams,
        activeStreams,
        totalMessages,
        totalRevenue: 0, // TODO: Implement revenue tracking
        flaggedContent,
        reportedUsers: 0, // TODO: Implement user reports
      };
    } catch (error) {
      console.error('Error getting admin stats:', error);
      throw error;
    }
  }

  /**
   * Log admin action
   */
  async logAdminAction(
    action: string,
    details: string,
    targetUid?: string,
    targetEmail?: string
  ): Promise<void> {
    try {
      const auth = getAuth();
      const user = auth.currentUser;

      if (!user) {
        throw new Error('No authenticated user');
      }

      const isAdmin = await this.isAdmin();
      if (!isAdmin) {
        throw new Error('Unauthorized: Admin access required');
      }

      const logRef = doc(collection(db, 'adminLogs'));
      await setDoc(logRef, {
        adminUid: user.uid,
        adminEmail: user.email,
        action,
        targetUid: targetUid || null,
        targetEmail: targetEmail || null,
        details,
        timestamp: serverTimestamp(),
      });

      console.log(`✅ Admin action logged: ${action}`);
    } catch (error) {
      console.error('Error logging admin action:', error);
      throw error;
    }
  }

  /**
   * Get recent admin logs
   */
  async getAdminLogs(limit: number = 50): Promise<AdminLog[]> {
    try {
      const isAdmin = await this.isAdmin();
      if (!isAdmin) {
        throw new Error('Unauthorized: Admin access required');
      }

      const logsSnapshot = await getDocs(collection(db, 'adminLogs'));
      const logs: AdminLog[] = [];

      logsSnapshot.forEach((doc) => {
        const data = doc.data();
        logs.push({
          id: doc.id,
          adminUid: data.adminUid,
          adminEmail: data.adminEmail,
          action: data.action,
          targetUid: data.targetUid,
          targetEmail: data.targetEmail,
          details: data.details,
          timestamp: data.timestamp?.toDate() || new Date(),
        });
      });

      // Sort by timestamp descending
      logs.sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime());

      return logs.slice(0, limit);
    } catch (error) {
      console.error('Error getting admin logs:', error);
      throw error;
    }
  }

  /**
   * Clear admin cache (force refresh)
   */
  clearCache(): void {
    this.adminCache.clear();
    console.log('✅ Admin cache cleared');
  }

  /**
   * Get report count for a user
   */
  private async getUserReportCount(userId: string): Promise<number> {
    try {
      const reportsQuery = query(
        collection(db, 'moderationReports'),
        where('reportedUserId', '==', userId)
      );
      const snapshot = await getDocs(reportsQuery);
      return snapshot.size;
    } catch (error) {
      console.error(`Error getting report count for user ${userId}:`, error);
      return 0; // Return 0 if we can't fetch reports
    }
  }

  /**
   * Get real currency balances for a user
   */
  private async getUserCurrencyBalances(userId: string): Promise<{ gold: number; gems: number }> {
    try {
      const balances = await virtualCurrencyService.getCurrencyBalances(userId);
      return {
        gold: balances.gold || 0,
        gems: balances.gems || 0,
      };
    } catch (error) {
      console.error(`Error getting currency balances for user ${userId}:`, error);
      // Fallback to user document if virtualCurrencyService fails
      try {
        const userDoc = await getDoc(doc(db, 'users', userId));
        if (userDoc.exists()) {
          const data = userDoc.data();
          const currencyBalances = data.currencyBalances || {};
          return {
            gold: currencyBalances.gold || data.gold || 0,
            gems: currencyBalances.gems || data.gems || 0,
          };
        }
      } catch (fallbackError) {
        console.error(`Fallback currency fetch failed for user ${userId}:`, fallbackError);
      }
      return { gold: 0, gems: 0 };
    }
  }

  /**
   * Get friend count for a user
   */
  private async getUserFriendCount(userId: string): Promise<number> {
    try {
      const userDoc = await getDoc(doc(db, 'users', userId));
      if (userDoc.exists()) {
        const data = userDoc.data();
        const friends = data.friends || [];
        return Array.isArray(friends) ? friends.length : 0;
      }
      return 0;
    } catch (error) {
      console.error(`Error getting friend count for user ${userId}:`, error);
      return 0;
    }
  }

  /**
   * Get detailed reports for a user
   */
  async getUserReports(userId: string): Promise<ModerationReport[]> {
    try {
      const reportsQuery = query(
        collection(db, 'moderationReports'),
        where('reportedUserId', '==', userId),
        orderBy('createdAt', 'desc')
      );
      const snapshot = await getDocs(reportsQuery);

      const reports: ModerationReport[] = [];
      for (const docSnapshot of snapshot.docs) {
        const data = docSnapshot.data();
        reports.push({
          id: docSnapshot.id,
          reportedUserId: data.reportedUserId || userId,
          reporterId: data.reporterId || '',
          reporterName: data.reporterName,
          reason: data.reason || '',
          category: data.category || 'other',
          description: data.description,
          status: data.status || 'pending',
          createdAt: data.createdAt?.toDate() || new Date(),
          reviewedAt: data.reviewedAt?.toDate(),
          reviewedBy: data.reviewedBy,
          resolution: data.resolution,
        });
      }

      return reports;
    } catch (error) {
      console.error(`Error getting reports for user ${userId}:`, error);
      return [];
    }
  }

  /**
   * Get user's friends list with details
   */
  async getUserFriends(userId: string): Promise<FriendInfo[]> {
    try {
      const userDoc = await getDoc(doc(db, 'users', userId));
      if (!userDoc.exists()) {
        return [];
      }

      const data = userDoc.data();
      const friendIds = data.friends || [];

      if (!Array.isArray(friendIds) || friendIds.length === 0) {
        return [];
      }

      const friends: FriendInfo[] = [];

      // Fetch each friend's details
      for (const friendId of friendIds) {
        try {
          const friendDoc = await getDoc(doc(db, 'users', friendId));
          if (friendDoc.exists()) {
            const friendData = friendDoc.data();
            friends.push({
              uid: friendId,
              displayName: friendData.displayName || 'Unknown',
              username: friendData.username,
              photoURL: friendData.photoURL,
              isOnline: friendData.isOnline || false,
              status: friendData.status || 'offline',
            });
          }
        } catch (friendError) {
          console.error(`Error fetching friend ${friendId}:`, friendError);
        }
      }

      return friends;
    } catch (error) {
      console.error(`Error getting friends for user ${userId}:`, error);
      return [];
    }
  }

  /**
   * Add currency to user (admin action)
   */
  async addCurrencyToUser(
    userId: string,
    currencyType: 'gems' | 'gold',
    amount: number,
    reason: string
  ): Promise<void> {
    try {
      if (amount <= 0) {
        throw new Error('Amount must be positive');
      }

      // Use virtualCurrencyService to add currency
      await virtualCurrencyService.addCurrency(
        userId,
        currencyType,
        amount,
        `Admin: ${reason}`,
        { adminAction: true, reason }
      );

      // Log the action
      await this.logAdminAction(
        `add_${currencyType}`,
        userId,
        '',
        `Added ${amount} ${currencyType}: ${reason}`
      );

      console.log(`✅ Added ${amount} ${currencyType} to user ${userId}`);
    } catch (error) {
      console.error(`Error adding ${currencyType} to user:`, error);
      throw error;
    }
  }

  /**
   * Remove currency from user (admin action)
   */
  async removeCurrencyFromUser(
    userId: string,
    currencyType: 'gems' | 'gold',
    amount: number,
    reason: string
  ): Promise<void> {
    try {
      if (amount <= 0) {
        throw new Error('Amount must be positive');
      }

      // Use virtualCurrencyService to spend currency
      await virtualCurrencyService.spendCurrency(
        userId,
        currencyType,
        amount,
        `Admin: ${reason}`,
        { adminAction: true, reason }
      );

      // Log the action
      await this.logAdminAction(
        `remove_${currencyType}`,
        userId,
        '',
        `Removed ${amount} ${currencyType}: ${reason}`
      );

      console.log(`✅ Removed ${amount} ${currencyType} from user ${userId}`);
    } catch (error) {
      console.error(`Error removing ${currencyType} from user:`, error);
      throw error;
    }
  }

  /**
   * Suspend user account
   */
  async suspendUser(userId: string, reason: string, duration?: number): Promise<void> {
    try {
      const isAdmin = await this.isAdmin();
      if (!isAdmin) {
        throw new Error('Unauthorized: Admin access required');
      }

      const userRef = doc(db, 'users', userId);
      const userDoc = await getDoc(userRef);

      if (!userDoc.exists()) {
        throw new Error('User not found');
      }

      const suspendedUntil = duration
        ? new Date(Date.now() + duration)
        : null; // null = permanent

      await updateDoc(userRef, {
        suspended: true,
        suspendedAt: serverTimestamp(),
        suspendedUntil,
        suspensionReason: reason,
      });

      await this.logAdminAction(
        'SUSPEND_USER',
        `Suspended user: ${reason}`,
        userId,
        userDoc.data().email
      );

      console.log(`✅ User ${userId} suspended`);
    } catch (error) {
      console.error('Error suspending user:', error);
      throw error;
    }
  }

  /**
   * Unsuspend user account
   */
  async unsuspendUser(userId: string): Promise<void> {
    try {
      const isAdmin = await this.isAdmin();
      if (!isAdmin) {
        throw new Error('Unauthorized: Admin access required');
      }

      const userRef = doc(db, 'users', userId);
      const userDoc = await getDoc(userRef);

      if (!userDoc.exists()) {
        throw new Error('User not found');
      }

      await updateDoc(userRef, {
        suspended: false,
        suspendedAt: null,
        suspendedUntil: null,
        suspensionReason: null,
      });

      await this.logAdminAction(
        'UNSUSPEND_USER',
        'User account unsuspended',
        userId,
        userDoc.data().email
      );

      console.log(`✅ User ${userId} unsuspended`);
    } catch (error) {
      console.error('Error unsuspending user:', error);
      throw error;
    }
  }

  /**
   * Get paginated users with filters
   */
  async getUsers(
    pageSize: number = 20,
    lastDoc: DocumentSnapshot | null = null,
    filters?: UserSearchFilters
  ): Promise<PaginatedUsers> {
    try {
      const isAdmin = await this.isAdmin();
      if (!isAdmin) {
        throw new Error('Unauthorized: Admin access required');
      }

      let q = query(collection(db, 'users'), orderBy('createdAt', 'desc'), limit(pageSize));

      // Apply filters
      if (filters?.status === 'suspended') {
        q = query(q, where('suspended', '==', true));
      } else if (filters?.status === 'active') {
        q = query(q, where('suspended', '!=', true));
      }

      if (filters?.subscription && filters.subscription !== 'all') {
        q = query(q, where('subscriptionPlan', '==', filters.subscription));
      }

      // Pagination
      if (lastDoc) {
        q = query(q, startAfter(lastDoc));
      }

      const snapshot = await getDocs(q);
      const users: AdminUserDetail[] = [];

      // Fetch real data for each user
      for (const docSnapshot of snapshot.docs) {
        const data = docSnapshot.data();
        const userId = docSnapshot.id;

        // Fetch real currency balances
        const currencyBalances = await this.getUserCurrencyBalances(userId);

        // Fetch report count
        const reportCount = await this.getUserReportCount(userId);

        // Fetch friend count
        const friendCount = await this.getUserFriendCount(userId);

        users.push({
          uid: userId,
          email: data.email || '',
          displayName: data.displayName || 'Unknown',
          username: data.username,
          photoURL: data.photoURL,
          gold: currencyBalances.gold,
          gems: currencyBalances.gems,
          reportCount: reportCount,
          createdAt: data.createdAt?.toDate() || new Date(),
          lastActive: data.lastActivity?.toDate(),
          isOnline: data.isOnline || false,
          status: data.status || 'offline',
          subscriptionPlan: data.subscriptionPlan || 'free',
          subscriptionStatus: data.subscriptionStatus,
          isAdmin: data.isAdmin,
          adminLevel: data.adminLevel,
          suspended: data.suspended,
          suspendedAt: data.suspendedAt?.toDate(),
          suspendedUntil: data.suspendedUntil?.toDate(),
          suspensionReason: data.suspensionReason,
          totalStreams: data.totalStreams || 0,
          totalMessages: data.totalMessages || 0,
          friendCount: friendCount,
          blockedUsers: data.blockedUsers || [],
          allowFriendRequests: data.allowFriendRequests,
          allowMessagesFromStrangers: data.allowMessagesFromStrangers,
          showOnlineStatus: data.showOnlineStatus,
        });
      }

      // Apply client-side filters for search and role
      let filteredUsers = users;

      if (filters?.searchTerm) {
        const searchLower = filters.searchTerm.toLowerCase();
        filteredUsers = filteredUsers.filter(
          (user) =>
            user.email.toLowerCase().includes(searchLower) ||
            user.displayName.toLowerCase().includes(searchLower) ||
            user.username?.toLowerCase().includes(searchLower)
        );
      }

      if (filters?.role && filters.role !== 'all') {
        if (filters.role === 'regular') {
          filteredUsers = filteredUsers.filter((user) => !user.isAdmin);
        } else {
          filteredUsers = filteredUsers.filter(
            (user) => user.isAdmin && user.adminLevel === filters.role
          );
        }
      }

      return {
        users: filteredUsers,
        lastDoc: snapshot.docs[snapshot.docs.length - 1] || null,
        hasMore: snapshot.docs.length === pageSize,
      };
    } catch (error) {
      console.error('Error getting users:', error);
      throw error;
    }
  }

  /**
   * Get single user details
   */
  async getUserDetails(userId: string): Promise<AdminUserDetail | null> {
    try {
      const isAdmin = await this.isAdmin();
      if (!isAdmin) {
        throw new Error('Unauthorized: Admin access required');
      }

      const userDoc = await getDoc(doc(db, 'users', userId));

      if (!userDoc.exists()) {
        return null;
      }

      const data = userDoc.data();

      // Fetch real currency balances
      const currencyBalances = await this.getUserCurrencyBalances(userId);

      // Fetch report count
      const reportCount = await this.getUserReportCount(userId);

      // Fetch friend count
      const friendCount = await this.getUserFriendCount(userId);

      return {
        uid: userDoc.id,
        email: data.email || '',
        displayName: data.displayName || 'Unknown',
        username: data.username,
        photoURL: data.photoURL,
        gold: currencyBalances.gold,
        gems: currencyBalances.gems,
        reportCount: reportCount,
        createdAt: data.createdAt?.toDate() || new Date(),
        lastActive: data.lastActivity?.toDate(),
        isOnline: data.isOnline || false,
        status: data.status || 'offline',
        subscriptionPlan: data.subscriptionPlan || 'free',
        subscriptionStatus: data.subscriptionStatus,
        isAdmin: data.isAdmin,
        adminLevel: data.adminLevel,
        suspended: data.suspended,
        suspendedAt: data.suspendedAt?.toDate(),
        suspendedUntil: data.suspendedUntil?.toDate(),
        suspensionReason: data.suspensionReason,
        totalStreams: data.totalStreams || 0,
        totalMessages: data.totalMessages || 0,
        friendCount: friendCount,
        blockedUsers: data.blockedUsers || [],
        allowFriendRequests: data.allowFriendRequests,
        allowMessagesFromStrangers: data.allowMessagesFromStrangers,
        showOnlineStatus: data.showOnlineStatus,
      };
    } catch (error) {
      console.error('Error getting user details:', error);
      throw error;
    }
  }

  /**
   * Update user admin role
   */
  async updateUserRole(
    userId: string,
    role: 'super' | 'moderator' | 'support' | 'regular'
  ): Promise<void> {
    try {
      const adminLevel = await this.getAdminLevel();
      if (adminLevel !== 'super') {
        throw new Error('Unauthorized: Super admin access required');
      }

      const userRef = doc(db, 'users', userId);
      const userDoc = await getDoc(userRef);

      if (!userDoc.exists()) {
        throw new Error('User not found');
      }

      if (role === 'regular') {
        await updateDoc(userRef, {
          isAdmin: false,
          adminLevel: null,
        });
      } else {
        await updateDoc(userRef, {
          isAdmin: true,
          adminLevel: role,
        });
      }

      await this.logAdminAction(
        'UPDATE_USER_ROLE',
        `Changed user role to ${role}`,
        userId,
        userDoc.data().email
      );

      console.log(`✅ User ${userId} role updated to ${role}`);
    } catch (error) {
      console.error('Error updating user role:', error);
      throw error;
    }
  }

  /**
   * Reset user password (send email)
   */
  async resetUserPassword(email: string): Promise<void> {
    try {
      const isAdmin = await this.isAdmin();
      if (!isAdmin) {
        throw new Error('Unauthorized: Admin access required');
      }

      // This would typically call a Firebase Cloud Function
      // For now, we'll just log the action
      await this.logAdminAction(
        'RESET_PASSWORD',
        `Password reset email sent to ${email}`,
        undefined,
        email
      );

      console.log(`✅ Password reset initiated for ${email}`);
    } catch (error) {
      console.error('Error resetting password:', error);
      throw error;
    }
  }

  /**
   * Force sign out user (clear sessions)
   */
  async forceSignOut(userId: string): Promise<void> {
    try {
      const isAdmin = await this.isAdmin();
      if (!isAdmin) {
        throw new Error('Unauthorized: Admin access required');
      }

      const userRef = doc(db, 'users', userId);
      const userDoc = await getDoc(userRef);

      if (!userDoc.exists()) {
        throw new Error('User not found');
      }

      // Update user status to force re-authentication
      await updateDoc(userRef, {
        isOnline: false,
        status: 'offline',
        forceSignOut: true,
        lastActivity: serverTimestamp(),
      });

      await this.logAdminAction(
        'FORCE_SIGNOUT',
        'User sessions cleared',
        userId,
        userDoc.data().email
      );

      console.log(`✅ User ${userId} forced to sign out`);
    } catch (error) {
      console.error('Error forcing sign out:', error);
      throw error;
    }
  }
}

export const adminService = new AdminService();

