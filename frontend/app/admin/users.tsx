import React, { useEffect, useState, useCallback } from 'react';
import { 
  View, Text, StyleSheet, ScrollView, RefreshControl, 
  ActivityIndicator, Alert, TouchableOpacity, Image
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { router } from 'expo-router';
import { FontAwesome } from '@expo/vector-icons';
import { apiClient, ENDPOINTS } from '../../config/api';
import { PetHubColors } from '../../constants/Colors';

interface User {
  id: number;
  email: string;
  fullName: string;
  profilePicture?: string;
  birthdate?: string;
  gender?: string;
  createdAt: string;
  isAdmin?: boolean;
}

const AdminUsersScreen = () => {
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  // Fetch all users
  const fetchUsers = useCallback(async () => {
    try {
      const token = await AsyncStorage.getItem('token');
      if (!token) {
        router.replace('/auth/login');
        return;
      }

      const response = await apiClient.get(ENDPOINTS.ADMIN.USERS, {
        headers: { Authorization: `Bearer ${token}` },
      });

      setUsers(response.data);
    } catch (error) {
      console.error('Error fetching users:', error);
      Alert.alert('Error', 'Failed to fetch users. Please try again.');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  // Delete user function
  const handleDeleteUser = async (userId: number, userName: string) => {
    Alert.alert(
      'Delete User',
      `Are you sure you want to delete ${userName}? This action cannot be undone.`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              const token = await AsyncStorage.getItem('token');
              if (!token) return;

              await apiClient.delete(`${ENDPOINTS.ADMIN.USERS}/${userId}`, {
                headers: { Authorization: `Bearer ${token}` },
              });

              // Remove user from local state
              setUsers(prevUsers => prevUsers.filter(user => user.id !== userId));
              Alert.alert('Success', 'User deleted successfully.');
            } catch (error) {
              console.error('Error deleting user:', error);
              Alert.alert('Error', 'Failed to delete user. Please try again.');
            }
          },
        },
      ]
    );
  };

  // Pull to refresh
  const onRefresh = useCallback(() => {
    setRefreshing(true);
    fetchUsers();
  }, [fetchUsers]);

  useEffect(() => {
    fetchUsers();
  }, [fetchUsers]);

  const handleLogout = async () => {
    try {
      await AsyncStorage.removeItem('token');
      await AsyncStorage.removeItem('user');
      router.replace('/auth/login');
    } catch (error) {
      console.error('Logout error:', error);
    }
  };

  // Navigation handlers
  const navigateToDashboard = () => router.replace('/admin/dashboard');
  const navigateToPets = () => router.replace('/admin/pets');
  const navigateToPosts = () => router.replace('/admin/posts');
  const navigateToShops = () => router.replace('/admin/shops');

  // Helper function to get image URL
  const getImageUrl = (imagePath?: string) => {
    if (!imagePath || imagePath.trim() === '') {
      return null;
    }
    
    // Handle different image path formats
    if (imagePath.startsWith('http')) {
      return imagePath; // Full URL (Supabase Storage)
    } else if (imagePath.startsWith('/uploads/')) {
      const baseUrl = API_URL.replace('/api', ''); // Remove /api suffix to get base URL
      return `${baseUrl}${imagePath}`;
    } else {
      const baseUrl = API_URL.replace('/api', ''); // Remove /api suffix to get base URL
      return `${baseUrl}/uploads/${imagePath}`;
    }
  };

  // Format date helper
  const formatDate = (dateString: string) => {
    if (!dateString) return 'Unknown date';
    try {
      return new Date(dateString).toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
      });
    } catch (error) {
      console.log('Date formatting error:', error, 'for date:', dateString);
      return 'Invalid date';
    }
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={PetHubColors.darkGray} />
        <Text style={styles.loadingText}>Loading users...</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <View>
          <Text style={styles.headerTitle}>User Management</Text>
          <Text style={styles.headerSubtitle}>{users.length} registered users</Text>
        </View>
        <TouchableOpacity style={styles.logoutButton} onPress={handleLogout}>
          <Text style={styles.logoutButtonText}>Logout</Text>
        </TouchableOpacity>
      </View>

      {/* Navigation Bar */}
      <View style={styles.navBar}>
        <TouchableOpacity style={styles.navButton} onPress={navigateToDashboard}>
          <Text style={styles.navButtonText}>Dashboard</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.navButton} onPress={navigateToPets}>
          <Text style={styles.navButtonText}>Pets</Text>
        </TouchableOpacity>
        <TouchableOpacity style={[styles.navButton, styles.navButtonActive]}>
          <Text style={[styles.navButtonText, styles.navButtonTextActive]}>Users</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.navButton} onPress={navigateToPosts}>
          <Text style={styles.navButtonText}>Posts</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.navButton} onPress={navigateToShops}>
          <Text style={styles.navButtonText}>Shops</Text>
        </TouchableOpacity>
      </View>

      <ScrollView 
        style={styles.content}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
        showsVerticalScrollIndicator={false}
      >
        {/* Stats Card */}
        <View style={styles.statsCard}>
          <View style={styles.statItem}>
            <FontAwesome name="users" size={24} color={PetHubColors.darkGray} />
            <Text style={styles.statNumber}>{users.length}</Text>
            <Text style={styles.statLabel}>Total Users</Text>
          </View>
          <View style={styles.statItem}>
            <FontAwesome name="user-secret" size={24} color={PetHubColors.darkGray} />
            <Text style={styles.statNumber}>
              {users.filter(user => user.isAdmin).length}
            </Text>
            <Text style={styles.statLabel}>Admins</Text>
          </View>
          <View style={styles.statItem}>
            <FontAwesome name="user" size={24} color={PetHubColors.darkGray} />
            <Text style={styles.statNumber}>
              {users.filter(user => !user.isAdmin).length}
            </Text>
            <Text style={styles.statLabel}>Regular Users</Text>
          </View>
        </View>

        {/* Users List */}
        <View style={styles.usersContainer}>
          <Text style={styles.sectionTitle}>All Users</Text>
          {users.length === 0 ? (
            <View style={styles.emptyState}>
              <FontAwesome name="users" size={48} color={PetHubColors.textSecondary} />
              <Text style={styles.emptyStateText}>No users found</Text>
            </View>
          ) : (
            users.map((user) => (
              <View key={user.id} style={styles.userCard}>
                <View style={styles.userInfo}>
                  <View style={styles.userAvatar}>
                    {user.profilePicture && user.profilePicture.trim() !== '' && getImageUrl(user.profilePicture) ? (
                      <Image
                        source={{ uri: getImageUrl(user.profilePicture) }}
                        style={styles.userAvatar}
                        defaultSource={require('../../assets/images/icon.png')}
                        resizeMode="cover"
                        onError={(error) => {
                          console.log('Image load error for user:', user.fullName);
                        }}
                        onLoad={() => {
                          console.log('Image loaded successfully for user:', user.fullName);
                        }}
                      />
                    ) : (
                      <View style={[styles.userAvatar, { backgroundColor: '#4ECDC4', justifyContent: 'center', alignItems: 'center' }]}>
                        <Text style={{ color: 'white', fontSize: 20, fontWeight: 'bold' }}>
                          {user.fullName ? user.fullName.charAt(0).toUpperCase() : '?'}
                        </Text>
                      </View>
                    )}
                  </View>
                  <View style={styles.userDetails}>
                    <View style={styles.userNameRow}>
                      <Text style={styles.userName}>{user.fullName || 'No Name'}</Text>
                      {user.isAdmin && (
                        <View style={styles.adminBadge}>
                          <Text style={styles.adminBadgeText}>ADMIN</Text>
                        </View>
                      )}
                    </View>
                    <Text style={styles.userEmail}>{user.email}</Text>
                    {user.birthdate && (
                      <Text style={styles.userDetail}>
                        📅 {formatDate(user.birthdate)}
                      </Text>
                    )}
                    {user.gender && (
                      <Text style={styles.userDetail}>
                        {user.gender === 'male' ? '👨' : '👩'} {user.gender}
                      </Text>
                    )}
                  </View>
                </View>
                
                <TouchableOpacity
                  style={styles.deleteButton}
                  onPress={() => handleDeleteUser(user.id, user.fullName || user.email)}
                >
                  <FontAwesome name="trash" size={16} color={PetHubColors.white} />
                  <Text style={styles.deleteButtonText}>Delete</Text>
                </TouchableOpacity>
              </View>
            ))
          )}
        </View>
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: PetHubColors.lightGray,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: PetHubColors.lightGray,
  },
  loadingText: {
    marginTop: 16,
    fontSize: 16,
    color: PetHubColors.textSecondary,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingTop: 60,
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
  headerSubtitle: {
    fontSize: 14,
    color: PetHubColors.textSecondary,
    marginTop: 2,
  },
  logoutButton: {
    backgroundColor: PetHubColors.darkGray,
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
  },
  logoutButtonText: {
    color: PetHubColors.white,
    fontSize: 14,
    fontWeight: '600',
  },
  content: {
    flex: 1,
  },
  statsCard: {
    backgroundColor: PetHubColors.white,
    margin: 20,
    padding: 20,
    borderRadius: 16,
    flexDirection: 'row',
    justifyContent: 'space-around',
    shadowColor: PetHubColors.darkGray,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 3,
  },
  statItem: {
    alignItems: 'center',
  },
  statNumber: {
    fontSize: 24,
    fontWeight: 'bold',
    color: PetHubColors.darkGray,
    marginTop: 8,
  },
  statLabel: {
    fontSize: 12,
    color: PetHubColors.textSecondary,
    marginTop: 4,
    textAlign: 'center',
  },
  usersContainer: {
    padding: 20,
    paddingTop: 0,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: PetHubColors.darkGray,
    marginBottom: 16,
  },
  emptyState: {
    alignItems: 'center',
    paddingVertical: 40,
  },
  emptyStateText: {
    fontSize: 16,
    color: PetHubColors.textSecondary,
    marginTop: 16,
  },
  userCard: {
    backgroundColor: PetHubColors.white,
    padding: 16,
    borderRadius: 12,
    marginBottom: 12,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    shadowColor: PetHubColors.darkGray,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  userInfo: {
    flexDirection: 'row',
    flex: 1,
  },
  userAvatar: {
    width: 50,
    height: 50,
    borderRadius: 25,
    marginRight: 12,
    backgroundColor: PetHubColors.mediumGray,
  },
  userDetails: {
    flex: 1,
  },
  userNameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 4,
  },
  userName: {
    fontSize: 16,
    fontWeight: '600',
    color: PetHubColors.darkGray,
    marginRight: 8,
  },
  adminBadge: {
    backgroundColor: '#FF6B6B',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 8,
  },
  adminBadgeText: {
    fontSize: 10,
    fontWeight: 'bold',
    color: PetHubColors.white,
  },
  userEmail: {
    fontSize: 14,
    color: PetHubColors.textSecondary,
    marginBottom: 4,
  },
  userDetail: {
    fontSize: 12,
    color: PetHubColors.textSecondary,
    marginBottom: 2,
  },
  deleteButton: {
    backgroundColor: '#FF6B6B',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  deleteButtonText: {
    color: PetHubColors.white,
    fontSize: 12,
    fontWeight: '600',
  },
  // Navigation Bar Styles
  navBar: {
    flexDirection: 'row',
    backgroundColor: PetHubColors.white,
    paddingHorizontal: 10,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: PetHubColors.mediumGray,
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  navButton: {
    paddingHorizontal: 8,
    paddingVertical: 8,
    borderRadius: 16,
    backgroundColor: PetHubColors.lightGray,
    minWidth: 60,
    alignItems: 'center',
  },
  navButtonActive: {
    backgroundColor: PetHubColors.darkGray,
  },
  navButtonText: {
    fontSize: 12,
    fontWeight: '600',
    color: PetHubColors.textSecondary,
  },
  navButtonTextActive: {
    color: PetHubColors.white,
  },
});

export default AdminUsersScreen;
