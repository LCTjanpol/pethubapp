import React, { useEffect, useState, useCallback, useRef, useMemo } from 'react';
import { 
  View, Text, FlatList, StyleSheet, TouchableOpacity, 
  RefreshControl, Alert
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useFocusEffect } from '@react-navigation/native';
import { apiClient, ENDPOINTS } from '../../config/api';
import { PetHubColors } from '../../constants/Colors';

// Types for notifications and related data
interface PetMap { 
  [id: number]: string; 
}

interface Task {
  id: number;
  type: string;
  description: string;
  time: string;
  frequency?: string;
  petId: number;
  createdAt?: string;
}

interface User {
  id: number;
  fullName: string;
  profilePicture?: string;
}

interface Post {
  id: number;
  user: User;
  content: string;
  caption?: string;
  likes: number;
  createdAt: string;
}

// Comment interface removed as it's not used in the current implementation

interface Notification {
  id: string;
  type: 'task_reminder' | 'scheduled_task' | 'like' | 'comment' | 'system';
  title: string;
  message: string;
  timestamp: string;
  icon: string;
  data?: any; // Additional data for navigation or context
}

const NotificationsScreen = () => {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const petsRef = useRef<PetMap>({});
  const [clearedNotificationIds, setClearedNotificationIds] = useState<Set<string>>(new Set());

  // Fetch current user profile
  const fetchCurrentUser = useCallback(async (token: string) => {
    try {
      const response = await apiClient.get(ENDPOINTS.USER.PROFILE, {
        headers: { Authorization: `Bearer ${token}` },
      });
      setCurrentUser(response.data);
    } catch (error) {
      console.error('Error fetching user profile:', error);
    }
  }, []);

  // Fetch pets and create pet name mapping
  const fetchPets = useCallback(async (token: string) => {
    try {
      const petsResponse = await apiClient.get(ENDPOINTS.PET.LIST, {
        headers: { Authorization: `Bearer ${token}` },
      });
      
      const petMap: PetMap = {};
      petsResponse.data.forEach((pet: any) => {
        petMap[pet.id] = pet.name;
      });
      petsRef.current = petMap;
      
      return petMap;
    } catch (error) {
      console.error('Error fetching pets:', error);
      return {};
    }
  }, []);

  // Generate task notifications - only show when tasks are actually due
  const generateTaskNotifications = useCallback((tasks: Task[], petMap: PetMap): Notification[] => {
    const now = new Date();
    const taskNotifications: Notification[] = [];

    console.log('🔔 Generating task notifications for', tasks.length, 'tasks');
    console.log('📅 Current time:', now.toISOString());

    tasks.forEach((task) => {
      const petName = petMap[task.petId] || 'Unknown Pet';
      const taskTime = new Date(task.time);
      const timeDiff = taskTime.getTime() - now.getTime();
      const minutesDiff = Math.floor(timeDiff / (1000 * 60));

      console.log(`📋 Task: ${task.type} for ${petName}`);
      console.log(`⏰ Task time: ${taskTime.toISOString()}`);
      console.log(`🕐 Minutes until task: ${minutesDiff}`);
      console.log(`📊 Frequency: ${task.frequency || 'undefined'}`);

      // For daily tasks - show notification when it's time to do the task
      if (task.frequency === 'daily') {
        // Check if the task time is within the next 15 minutes (due soon)
        if (minutesDiff >= 0 && minutesDiff <= 15) {
          console.log(`✅ Adding daily task notification for ${task.type} - due now!`);
          taskNotifications.push({
            id: `due-${task.id}`,
            type: 'task_reminder',
            title: `Task Due Now`,
            message: `${task.type} (${task.description}) for ${petName} is due now`,
            timestamp: now.toISOString(),
            icon: getTaskIcon(task.type),
            data: { taskId: task.id, petId: task.petId }
          });
        }
        // Show reminder 30 minutes before daily task
        else if (minutesDiff > 15 && minutesDiff <= 30) {
          console.log(`✅ Adding reminder notification for ${task.type} - due in ${minutesDiff} minutes`);
          taskNotifications.push({
            id: `reminder-${task.id}`,
            type: 'task_reminder',
            title: `Task Reminder`,
            message: `${task.type} (${task.description}) for ${petName} in ${minutesDiff} minutes`,
            timestamp: now.toISOString(),
            icon: getTaskIcon(task.type),
            data: { taskId: task.id, petId: task.petId }
          });
        }
      }

      // For scheduled tasks - show notification on the scheduled date
      else if (task.frequency === 'scheduled') {
        const isToday = taskTime.toDateString() === now.toDateString();
        const isPastDue = taskTime.getTime() < now.getTime();
        
        if (isToday && !isPastDue) {
          // Task is scheduled for today and not yet past due
          console.log(`✅ Adding scheduled task notification for ${task.type} - scheduled for today`);
          taskNotifications.push({
            id: `scheduled-${task.id}`,
            type: 'scheduled_task',
            title: `Scheduled Task Today`,
            message: `${task.type}: ${task.description} for ${petName} is scheduled for today`,
            timestamp: now.toISOString(),
            icon: '📅',
            data: { taskId: task.id, petId: task.petId }
          });
        } else if (isToday && isPastDue) {
          // Task was scheduled for today but is now past due
          console.log(`✅ Adding overdue task notification for ${task.type} - overdue`);
          taskNotifications.push({
            id: `overdue-${task.id}`,
            type: 'task_reminder',
            title: `Overdue Task`,
            message: `${task.type}: ${task.description} for ${petName} is overdue`,
            timestamp: now.toISOString(),
            icon: '⚠️',
            data: { taskId: task.id, petId: task.petId }
          });
        }
      }

      // For weekly tasks - show notification on the scheduled day
      else if (task.frequency === 'weekly') {
        const isToday = taskTime.toDateString() === now.toDateString();
        const isPastDue = taskTime.getTime() < now.getTime();
        
        if (isToday && !isPastDue) {
          console.log(`✅ Adding weekly task notification for ${task.type} - scheduled for today`);
          taskNotifications.push({
            id: `weekly-${task.id}`,
            type: 'scheduled_task',
            title: `Weekly Task Today`,
            message: `${task.type}: ${task.description} for ${petName} is scheduled for today`,
            timestamp: now.toISOString(),
            icon: '📅',
            data: { taskId: task.id, petId: task.petId }
          });
        } else if (isToday && isPastDue) {
          console.log(`✅ Adding overdue weekly task notification for ${task.type} - overdue`);
          taskNotifications.push({
            id: `overdue-weekly-${task.id}`,
            type: 'task_reminder',
            title: `Overdue Weekly Task`,
            message: `${task.type}: ${task.description} for ${petName} is overdue`,
            timestamp: now.toISOString(),
            icon: '⚠️',
            data: { taskId: task.id, petId: task.petId }
          });
        }
      }
    });

    console.log(`🔔 Generated ${taskNotifications.length} task notifications`);
    return taskNotifications;
  }, []);

  // Get icon for task type
  const getTaskIcon = (taskType: string): string => {
    // Handle common task types
    switch (taskType.toLowerCase()) {
      case 'feeding': return '🍽️';
      case 'drinking': return '💧';
      case 'walking': return '🚶';
      case 'grooming': return '🧼';
      case 'playing': return '🎾';
      case 'custom': return '📋';
      default: return '📝'; // Default icon for any custom task
    }
  };

  // Generate social notifications (likes and comments)
  const generateSocialNotifications = useCallback(async (token: string): Promise<Notification[]> => {
    if (!currentUser) return [];

    try {
      // Fetch posts to check for likes and comments
      const postsResponse = await apiClient.get(ENDPOINTS.POST.LIST, {
        headers: { Authorization: `Bearer ${token}` },
      });

      const socialNotifications: Notification[] = [];
      const posts: Post[] = postsResponse.data;

      // Find posts by current user and check for interactions
      const userPosts = posts.filter(post => post.user.id === currentUser.id);

      userPosts.forEach(post => {
        // Like notifications (simplified - in real app, track individual likes)
        if (post.likes > 0) {
          socialNotifications.push({
            id: `likes-${post.id}`,
            type: 'like',
            title: `Your post got ${post.likes} like${post.likes > 1 ? 's' : ''}`,
            message: post.caption ? `"${post.caption.substring(0, 50)}..."` : 'Your pet photo',
            timestamp: post.createdAt,
            icon: '❤️',
            data: { postId: post.id }
          });
        }

        // Comment notifications - simplified for now since comments aren't included in post data
        // In a real implementation, you would fetch comments separately or include them in the post query
      });

      return socialNotifications;
    } catch (error) {
      console.error('Error generating social notifications:', error);
      return [];
    }
  }, [currentUser]);

  // Fetch all notifications - memoized to prevent unnecessary re-renders
  const fetchNotifications = useCallback(async (showLoading = true) => {
    try {
      if (showLoading) setLoading(true);

      console.log('🔔 Starting notification fetch...');

      const token = await AsyncStorage.getItem('token');
      if (!token) {
        console.error('❌ No token found');
        Alert.alert('Error', 'Please log in again.');
        return;
      }

      console.log('✅ Token found, fetching data...');

      // Fetch user profile
      await fetchCurrentUser(token);
      console.log('✅ User profile fetched');

      // Fetch pets
      const petMap = await fetchPets(token);
      console.log('✅ Pets fetched:', Object.keys(petMap).length, 'pets');

      // Fetch tasks
      const tasksResponse = await apiClient.get(ENDPOINTS.TASK.LIST, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const tasks: Task[] = tasksResponse.data;
      console.log('✅ Tasks fetched:', tasks.length, 'tasks');
      console.log('📋 Task details:', tasks.map(t => ({ 
        id: t.id, 
        type: t.type, 
        time: t.time, 
        frequency: t.frequency,
        petId: t.petId 
      })));

      // Generate task notifications
      const taskNotifications = generateTaskNotifications(tasks, petMap);

      // Generate social notifications
      const socialNotifications = await generateSocialNotifications(token);
      console.log('✅ Social notifications generated:', socialNotifications.length);

      // Combine all notifications
      const allNotifications = [...taskNotifications, ...socialNotifications];
      console.log('✅ Total notifications before deduplication:', allNotifications.length);

      // Sort by timestamp (newest first)
      allNotifications.sort((a, b) => 
        new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
      );

      // Remove duplicates, filter out cleared notifications, and limit to 50 notifications
      const uniqueNotifications = allNotifications
        .filter((notification, index, self) => 
          index === self.findIndex(n => n.id === notification.id)
        )
        .filter(notification => !clearedNotificationIds.has(notification.id))
        .slice(0, 50);

      console.log('✅ Final notifications count:', uniqueNotifications.length);
      console.log('📱 Notifications to display:', uniqueNotifications.map(n => ({ 
        id: n.id, 
        type: n.type, 
        title: n.title, 
        message: n.message 
      })));

      // Only update state if notifications actually changed to prevent flickering
      setNotifications(prevNotifications => {
        const hasChanged = JSON.stringify(prevNotifications) !== JSON.stringify(uniqueNotifications);
        if (hasChanged) {
          console.log('🔄 Notifications changed, updating state');
          return uniqueNotifications;
        }
        console.log('✅ Notifications unchanged, skipping state update');
        return prevNotifications;
      });
    } catch (error) {
      console.error('❌ Error fetching notifications:', error);
      Alert.alert('Error', 'Failed to load notifications');
    } finally {
      setLoading(false);
    }
  }, [fetchCurrentUser, fetchPets, generateTaskNotifications, generateSocialNotifications, clearedNotificationIds]);

  // Pull to refresh
  const onRefresh = async () => {
    setRefreshing(true);
    await fetchNotifications(false);
    setRefreshing(false);
  };

  // Format time display
  const formatTime = (timestamp: string): string => {
    const now = new Date();
    const time = new Date(timestamp);
    const diffInHours = Math.floor((now.getTime() - time.getTime()) / (1000 * 60 * 60));
    
    if (diffInHours < 1) return 'Just now';
    if (diffInHours < 24) return `${diffInHours}h ago`;
    if (diffInHours < 168) return `${Math.floor(diffInHours / 24)}d ago`;
    return time.toLocaleDateString();
  };

  // Get notification style based on type
  const getNotificationStyle = (type: string) => {
    switch (type) {
      case 'task_reminder':
        return { backgroundColor: PetHubColors.lightGray, borderLeftColor: '#4CAF50' };
      case 'scheduled_task':
        return { backgroundColor: PetHubColors.lightGray, borderLeftColor: '#2196F3' };
      case 'like':
        return { backgroundColor: PetHubColors.lightGray, borderLeftColor: '#FF4444' };
      case 'comment':
        return { backgroundColor: PetHubColors.lightGray, borderLeftColor: '#FF9800' };
      default:
        return { backgroundColor: PetHubColors.lightGray, borderLeftColor: PetHubColors.mediumGray };
    }
  };

  // Handle notification tap
  const handleNotificationPress = (notification: Notification) => {
    console.log('📱 Notification pressed:', notification);
    
    // Add to cleared notifications set to prevent it from reappearing
    setClearedNotificationIds(prev => new Set([...prev, notification.id]));
    
    // Remove the notification from the list when tapped
    setNotifications(prev => prev.filter(n => n.id !== notification.id));
    
    // In a real app, you would navigate to the relevant screen based on notification type
    // For now, just show an alert with the notification details
    Alert.alert(
      notification.title,
      notification.message,
      [{ text: 'OK' }]
    );
  };

  // Clear all notifications
  const clearAllNotifications = () => {
    if (notifications.length === 0) {
      Alert.alert('No Notifications', 'There are no notifications to clear.');
      return;
    }

    Alert.alert(
      'Clear Notifications',
      `Are you sure you want to clear all ${notifications.length} notifications?`,
      [
        { text: 'Cancel', style: 'cancel' },
        { 
          text: 'Clear All', 
          style: 'destructive',
          onPress: () => {
            console.log('🗑️ Clearing all notifications');
            
            // Add all current notification IDs to cleared set
            const currentNotificationIds = notifications.map(n => n.id);
            setClearedNotificationIds(prev => new Set([...prev, ...currentNotificationIds]));
            
            // Clear the notifications list
            setNotifications([]);
          }
        }
      ]
    );
  };

  // Use ref to store the fetch function to avoid dependency issues
  const fetchNotificationsRef = useRef(fetchNotifications);
  fetchNotificationsRef.current = fetchNotifications;

  // Initialize notifications - only run once on mount
  useEffect(() => {
    fetchNotificationsRef.current();
  }, []); // Empty dependency array to run only once

  // Refresh notifications when screen is focused - but not on every focus
  useFocusEffect(
    useCallback(() => {
      // Only refresh if notifications are empty or it's been more than 30 seconds
      const lastRefresh = Date.now() - (notifications.length > 0 ? 30000 : 0);
      if (notifications.length === 0 || Date.now() - lastRefresh > 30000) {
        fetchNotificationsRef.current(false);
      }
    }, [notifications.length]) // Only depend on notifications length, not the entire function
  );

  // Auto-refresh every 5 minutes for task reminders (reduced frequency)
  useEffect(() => {
    const interval = setInterval(() => {
      fetchNotificationsRef.current(false);
    }, 300000); // 5 minutes instead of 1 minute

    return () => clearInterval(interval);
  }, []); // Empty dependency array to prevent recreation

  // Memoized render function to prevent unnecessary re-renders
  const renderNotification = useCallback(({ item }: { item: Notification }) => {
    const notificationStyle = getNotificationStyle(item.type);
    
    return (
      <TouchableOpacity
        style={[styles.notificationCard, notificationStyle]}
        onPress={() => handleNotificationPress(item)}
        activeOpacity={0.7}
      >
        <View style={styles.notificationIcon}>
          <Text style={styles.iconText}>{item.icon}</Text>
        </View>
        
        <View style={styles.notificationContent}>
          <Text style={styles.notificationTitle}>{item.title}</Text>
          <Text style={styles.notificationMessage}>{item.message}</Text>
          <Text style={styles.notificationTime}>{formatTime(item.timestamp)}</Text>
        </View>
      </TouchableOpacity>
    );
  }, []); // Empty dependency array since the function doesn't depend on any props/state

  // Memoized empty component to prevent re-creation
  const emptyComponent = useMemo(() => (
    <View style={styles.emptyContainer}>
      <Text style={styles.emptyIcon}>🔔</Text>
      <Text style={styles.emptyTitle}>No Notifications</Text>
      <Text style={styles.emptyMessage}>
        You&apos;re all caught up! Notifications for tasks, likes, and comments will appear here.
      </Text>
    </View>
  ), []);

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Notifications</Text>
        {notifications.length > 0 && (
          <TouchableOpacity onPress={clearAllNotifications}>
            <Text style={styles.clearAllText}>Clear All</Text>
          </TouchableOpacity>
        )}
      </View>

      {/* Notifications List */}
      {loading ? (
        <View style={styles.loadingContainer}>
          <Text style={styles.loadingText}>Loading notifications...</Text>
        </View>
      ) : (
        <FlatList
          data={notifications}
          renderItem={renderNotification}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.notificationsList}
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
          }
          ListEmptyComponent={emptyComponent}
          // Performance optimizations
          removeClippedSubviews={true}
          maxToRenderPerBatch={10}
          windowSize={10}
          initialNumToRender={10}
          getItemLayout={(data, index) => ({
            length: 80, // Approximate height of notification item
            offset: 80 * index,
            index,
          })}
        />
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: PetHubColors.white,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingTop: 50,
    paddingBottom: 20,
    backgroundColor: PetHubColors.white,
    borderBottomWidth: 1,
    borderBottomColor: PetHubColors.mediumGray,
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: PetHubColors.darkGray,
  },
  clearAllText: {
    fontSize: 16,
    color: PetHubColors.darkGray,
    fontWeight: '600',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    fontSize: 16,
    color: PetHubColors.textSecondary,
  },
  notificationsList: {
    paddingHorizontal: 20,
    paddingVertical: 10,
  },
  notificationCard: {
    flexDirection: 'row',
    backgroundColor: PetHubColors.white,
    borderRadius: 12,
    padding: 16,
    marginVertical: 6,
    borderLeftWidth: 4,
    shadowColor: PetHubColors.darkGray,
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  notificationIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: PetHubColors.lightGray,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  iconText: {
    fontSize: 20,
  },
  notificationContent: {
    flex: 1,
  },
  notificationTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: PetHubColors.darkGray,
    marginBottom: 4,
  },
  notificationMessage: {
    fontSize: 14,
    color: PetHubColors.textSecondary,
    lineHeight: 20,
    marginBottom: 4,
  },
  notificationTime: {
    fontSize: 12,
    color: PetHubColors.textTertiary,
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 100,
    paddingHorizontal: 40,
  },
  emptyIcon: {
    fontSize: 64,
    marginBottom: 20,
  },
  emptyTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: PetHubColors.darkGray,
    marginBottom: 12,
    textAlign: 'center',
  },
  emptyMessage: {
    fontSize: 16,
    color: PetHubColors.textSecondary,
    textAlign: 'center',
    lineHeight: 24,
  },
});

export default NotificationsScreen; 