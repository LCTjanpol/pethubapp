import React, { useEffect, useState, useCallback } from 'react';
import { 
  StyleSheet, Text, View, TouchableOpacity, Alert, Image, 
  ScrollView, RefreshControl, Modal, ActivityIndicator
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useFocusEffect } from '@react-navigation/native';
import { apiClient, ENDPOINTS, API_URL } from '../../config/api';
import { router } from 'expo-router';
import { PetHubColors } from '../../constants/Colors';
import { useAuth } from '../../contexts/AuthContext';

// Screen dimensions available for future responsive design enhancements
// const { width: screenWidth, height: screenHeight } = Dimensions.get('window');

// Types for user data
interface User {
  id: number;
  fullName: string;
  email: string;
  profilePicture?: string;
  birthdate: string;
  gender: string;
}

interface Pet {
  id: number;
  name: string;
  type: string;
  breed: string;
  age: number;
}

interface Comment {
  id: number;
  user: {
    id: number;
    fullName: string;
  };
  content: string;
  createdAt: string;
}

interface Post {
  id: number;
  content: string;
  caption?: string;
  likes: number;
  createdAt: string;
  comments: Comment[];
}

interface UserStats {
  petCount: number;
  postCount: number;
  totalLikes: number;
  joinDate: string;
}

const Profile = () => {
  const [user, setUser] = useState<User | null>(null);
  const { logout: authLogout } = useAuth();

  // Helper function to generate proper image URLs
  const getImageUrl = (imagePath: string | undefined): { uri: string } | number => {
    if (!imagePath) {
      return require('../../assets/images/image.png');
    }
    
    // If it's already a full URL, return as is
    if (imagePath.startsWith('http')) {
      return { uri: imagePath };
    }
    
    // If it starts with /uploads, construct the full URL using API base URL
    if (imagePath.startsWith('/uploads')) {
      const baseUrl = API_URL.replace('/api', ''); // Remove /api suffix to get base URL
      return { uri: `${baseUrl}${imagePath}` };
    }
    
    // Fallback to default image
    return require('../../assets/images/image.png');
  };
  const [stats, setStats] = useState<UserStats>({
    petCount: 0,
    postCount: 0,
    totalLikes: 0,
    joinDate: ''
  });
  const [pets, setPets] = useState<Pet[]>([]);
  const [posts, setPosts] = useState<Post[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [showLogoutModal, setShowLogoutModal] = useState(false);

  // Fetch user profile data
  const fetchUserData = useCallback(async () => {
    try {
      const token = await AsyncStorage.getItem('token');
      if (!token) {
        Alert.alert('Error', 'Please log in again.');
        router.replace('/auth/login');
        return;
      }

      const response = await apiClient.get(ENDPOINTS.USER.PROFILE, {
        headers: { Authorization: `Bearer ${token}` },
      });
      
      setUser(response.data);
    } catch (error: any) {
      console.error('Error fetching user data:', error);
      Alert.alert('Error', 'Failed to fetch profile data');
    }
  }, []);

  // Fetch user's pets
  const fetchPets = useCallback(async () => {
    try {
      const token = await AsyncStorage.getItem('token');
      if (!token) return;

      const response = await apiClient.get(ENDPOINTS.PET.LIST, {
        headers: { Authorization: `Bearer ${token}` },
      });
      
      setPets(response.data);
    } catch (error: any) {
      console.error('Error fetching pets:', error);
    }
  }, []);

  // Fetch user's posts
  const fetchPosts = useCallback(async () => {
    try {
      const token = await AsyncStorage.getItem('token');
      if (!token || !user) return;

      const response = await apiClient.get(ENDPOINTS.POST.LIST, {
        headers: { Authorization: `Bearer ${token}` },
      });
      
      // Filter posts by current user
      const userPosts = response.data.filter((post: any) => post.user.id === user.id);
      setPosts(userPosts);
    } catch (error: any) {
      console.error('Error fetching posts:', error);
    }
  }, [user]);

  // Calculate user statistics
  const calculateStats = useCallback(() => {
    const totalLikes = posts.reduce((sum, post) => sum + post.likes, 0);
    const joinDate = user ? new Date(user.birthdate).toLocaleDateString() : '';

    setStats({
      petCount: pets.length,
      postCount: posts.length,
      totalLikes,
      joinDate
    });
  }, [pets, posts, user]);

  // Calculate age from birthdate
  const calculateAge = (birthdate: string): string => {
    if (!birthdate) return 'N/A';
    
    const birth = new Date(birthdate);
    const today = new Date();
    let age = today.getFullYear() - birth.getFullYear();
    const monthDiff = today.getMonth() - birth.getMonth();
    
    if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birth.getDate())) {
      age--;
    }
    
    return `${age} years old`;
  };

  // Handle logout with confirmation
  const handleLogout = () => {
    setShowLogoutModal(true);
  };

  const confirmLogout = async () => {
    try {
      setShowLogoutModal(false);
      Alert.alert('Success', 'You have been logged out successfully.');
      await authLogout(); // Use auth context logout function
    } catch (error) {
      console.error('Logout error:', error);
      Alert.alert('Error', 'Failed to log out. Please try again.');
    }
  };

  // Handle edit profile navigation
  const handleEditProfile = () => {
    router.push('/editandaddscreens/editprofile');
  };

  // Delete post functionality
  const handleDeletePost = async (postId: number) => {
    // Show confirmation dialog first
    Alert.alert(
      'Delete Post',
      'Are you sure you want to delete this post? This action cannot be undone.',
      [
        {
          text: 'Cancel',
          style: 'cancel',
        },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              const token = await AsyncStorage.getItem('token');
              if (!token) {
                Alert.alert('Error', 'Please log in again.');
                router.replace('/auth/login');
                return;
              }
              
              const response = await apiClient.delete(ENDPOINTS.POST.DELETE(postId.toString()), {
                headers: { Authorization: `Bearer ${token}` },
              });
              
              // Check if deletion was successful
              if (response.data?.success !== false) {
                // Remove the post from local state immediately for better UX
                setPosts(prevPosts => prevPosts.filter(post => post.id !== postId));
                Alert.alert('Success', 'Post deleted successfully!');
              } else {
                Alert.alert('Error', response.data?.message || 'Failed to delete post.');
              }
            } catch (error: any) {
              console.error('Error deleting post:', error);
              
              // Handle specific error cases
              if (error.response?.status === 404) {
                Alert.alert('Error', 'Post not found or you do not have permission to delete it.');
              } else if (error.response?.status === 401) {
                Alert.alert('Error', 'Please log in again.');
                router.replace('/auth/login');
              } else {
                Alert.alert('Error', error.response?.data?.message || 'Failed to delete post. Please try again.');
              }
            }
          }
        }
      ]
    );
  };


  // Pull to refresh functionality
  const onRefresh = async () => {
    setRefreshing(true);
    await Promise.all([
      fetchUserData(),
      fetchPets(),
      fetchPosts()
    ]);
    setRefreshing(false);
  };

  // Fetch all data
  const fetchAllData = useCallback(async () => {
    setLoading(true);
    await Promise.all([
      fetchUserData(),
      fetchPets()
    ]);
    setLoading(false);
  }, [fetchUserData, fetchPets]);

  // Initialize profile data
  useEffect(() => {
    fetchAllData();
  }, [fetchAllData]);

  // Fetch posts when user is available
  useEffect(() => {
    if (user) {
      fetchPosts();
    }
  }, [user, fetchPosts]);

  // Calculate stats when data changes
  useEffect(() => {
    calculateStats();
  }, [calculateStats]);

  // Refresh data when screen is focused (including returning from edit profile)
  useFocusEffect(
    useCallback(() => {
      fetchAllData();
    }, [fetchAllData])
  );

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={PetHubColors.darkGray} />
        <Text style={styles.loadingText}>Loading profile...</Text>
      </View>
    );
  }

  if (!user) {
    return (
      <View style={styles.errorContainer}>
        <Text style={styles.errorText}>Failed to load profile</Text>
        <TouchableOpacity style={styles.retryButton} onPress={fetchAllData}>
          <Text style={styles.retryButtonText}>Retry</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <ScrollView 
        style={styles.scrollContainer}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
      >
        {/* Modern Gradient Profile Header Section - Now part of scrollable content */}
        <View style={styles.profileHeaderSection}>
          {/* Decorative background elements */}
          <View style={styles.headerBackground}>
            <View style={styles.circle1} />
            <View style={styles.circle2} />
            <View style={styles.circle3} />
          </View>
          
          {/* Top Bar with Modern Logout */}
          <View style={styles.topBar}>
            <View style={styles.headerSpacer} />
            <TouchableOpacity onPress={handleLogout} style={styles.logoutButton}>
              <Text style={styles.logoutButtonText}>Log Out</Text>
            </TouchableOpacity>
          </View>

          {/* Modern Profile Info */}
          <View style={styles.profileInfoSection}>
            <View style={styles.profileImageContainer}>
              <Image
                source={getImageUrl(user.profilePicture)}
                style={styles.profileImage}
              />
              <View style={styles.profileImageRing} />
            </View>
            
            <View style={styles.profileDetails}>
              <Text style={styles.userName}>{user.fullName}</Text>
              <Text style={styles.userEmail}>{user.email}</Text>
              <View style={styles.userMetaInfo}>
                <View style={styles.metaItem}>
                  <Text style={styles.metaIcon}>🎂</Text>
                  <Text style={styles.metaText}>{new Date(user.birthdate).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}</Text>
                </View>
                <View style={styles.metaItem}>
                  <Text style={styles.metaIcon}>👤</Text>
                  <Text style={styles.metaText}>{user.gender}</Text>
                </View>
              </View>
              <TouchableOpacity style={styles.editButton} onPress={handleEditProfile}>
                <Text style={styles.editButtonText}>✏️ Edit Profile</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>

        {/* Modern Statistics Cards */}
        <View style={styles.statsContainer}>
          <View style={styles.statCard}>
            <View style={styles.statIconContainer}>
              <Text style={styles.statIcon}>🐾</Text>
            </View>
            <Text style={styles.statNumber}>{stats.petCount}</Text>
            <Text style={styles.statLabel}>Pets</Text>
          </View>
          
          <View style={styles.statCard}>
            <View style={styles.statIconContainer}>
              <Text style={styles.statIcon}>📸</Text>
            </View>
            <Text style={styles.statNumber}>{stats.postCount}</Text>
            <Text style={styles.statLabel}>Posts</Text>
          </View>
          
          <View style={styles.statCard}>
            <View style={styles.statIconContainer}>
              <Text style={styles.statIcon}>❤️</Text>
            </View>
            <Text style={styles.statNumber}>{stats.totalLikes}</Text>
            <Text style={styles.statLabel}>Likes</Text>
          </View>
        </View>

        {/* Modern My Pets Section */}
        {pets.length > 0 && (
          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <Text style={styles.sectionTitle}>My Pets</Text>
              <View style={styles.sectionBadge}>
                <Text style={styles.sectionBadgeText}>{pets.length}</Text>
              </View>
            </View>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.petsScrollContainer}>
              {pets.map((pet) => (
                <View key={pet.id} style={styles.petCard}>
                  <View style={styles.petCardHeader}>
                    <Text style={styles.petEmoji}>🐾</Text>
                  </View>
                  <Text style={styles.petName}>{pet.name}</Text>
                  <Text style={styles.petDetails}>{pet.type}</Text>
                  <Text style={styles.petAge}>{pet.age} years old</Text>
                </View>
              ))}
            </ScrollView>
          </View>
        )}

        {/* Modern My Posts Section */}
        {posts.length > 0 && (
          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <Text style={styles.sectionTitle}>My Posts</Text>
              <View style={styles.sectionBadge}>
                <Text style={styles.sectionBadgeText}>{posts.length}</Text>
              </View>
            </View>
            {posts.map((post) => (
              <View key={post.id} style={styles.postCard}>
                {/* Modern Post Header */}
                <View style={styles.postHeader}>
                  <View style={styles.postAuthorInfo}>
                    <Image
                      source={getImageUrl(user?.profilePicture)}
                      style={styles.postProfilePic}
                    />
                    <View style={styles.postHeaderInfo}>
                      <Text style={styles.postAuthor}>{user?.fullName}</Text>
                      <Text style={styles.postTime}>{new Date(post.createdAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}</Text>
                    </View>
                  </View>
                  <TouchableOpacity
                    onPress={() => handleDeletePost(post.id)}
                    style={styles.deleteButton}
                  >
                    <Text style={styles.deleteIcon}>🗑️</Text>
                  </TouchableOpacity>
                </View>

                {/* Post Caption */}
                {post.caption && (
                  <Text style={styles.postCaption}>{post.caption}</Text>
                )}

                {/* Post Image with modern styling */}
                <View style={styles.postImageContainer}>
                  <Image
                    source={getImageUrl(post.content)}
                    style={styles.postImage}
                  />
                </View>

                {/* Modern Post Stats */}
                <View style={styles.postStats}>
                  <View style={styles.likeContainer}>
                    <Text style={styles.likeIcon}>❤️</Text>
                    <Text style={styles.postLikes}>{post.likes} Likes</Text>
                  </View>
                </View>
              </View>
            ))}
          </View>
        )}

        {/* Modern Account Information */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Account Information</Text>
          </View>
          <View style={styles.infoCard}>
            <View style={styles.infoRow}>
              <View style={styles.infoIconContainer}>
                <Text style={styles.infoIcon}>📧</Text>
              </View>
              <View style={styles.infoContent}>
                <Text style={styles.infoLabel}>Email</Text>
                <Text style={styles.infoValue}>{user.email}</Text>
              </View>
            </View>
            <View style={styles.infoDivider} />
            <View style={styles.infoRow}>
              <View style={styles.infoIconContainer}>
                <Text style={styles.infoIcon}>👤</Text>
              </View>
              <View style={styles.infoContent}>
                <Text style={styles.infoLabel}>Gender</Text>
                <Text style={styles.infoValue}>{user.gender}</Text>
              </View>
            </View>
            <View style={styles.infoDivider} />
            <View style={styles.infoRow}>
              <View style={styles.infoIconContainer}>
                <Text style={styles.infoIcon}>🎂</Text>
              </View>
              <View style={styles.infoContent}>
                <Text style={styles.infoLabel}>Age</Text>
                <Text style={styles.infoValue}>{calculateAge(user.birthdate)}</Text>
              </View>
            </View>
          </View>
        </View>
      </ScrollView>

      {/* Logout Confirmation Modal */}
      <Modal
        visible={showLogoutModal}
        transparent={true}
        animationType="fade"
        onRequestClose={() => setShowLogoutModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContainer}>
            <Text style={styles.modalTitle}>Confirm Logout</Text>
            <Text style={styles.modalMessage}>
              Are you sure you want to log out of your account?
            </Text>
            
            <View style={styles.modalButtons}>
              <TouchableOpacity 
                style={styles.modalCancelButton}
                onPress={() => setShowLogoutModal(false)}
              >
                <Text style={styles.modalCancelText}>Cancel</Text>
              </TouchableOpacity>
              
              <TouchableOpacity 
                style={styles.modalLogoutButton}
                onPress={confirmLogout}
              >
                <Text style={styles.modalLogoutText}>Logout</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: PetHubColors.lightGray,
  },
  // Modern header background elements
  headerBackground: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    overflow: 'hidden',
  },
  circle1: {
    position: 'absolute',
    top: -50,
    right: -50,
    width: 150,
    height: 150,
    borderRadius: 75,
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
  },
  circle2: {
    position: 'absolute',
    top: 100,
    left: -30,
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: 'rgba(255, 255, 255, 0.03)',
  },
  circle3: {
    position: 'absolute',
    bottom: -40,
    right: 80,
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: 'rgba(255, 255, 255, 0.04)',
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
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: PetHubColors.lightGray,
    paddingHorizontal: 40,
  },
  errorText: {
    fontSize: 18,
    color: PetHubColors.textSecondary,
    textAlign: 'center',
    marginBottom: 20,
  },
  retryButton: {
    backgroundColor: PetHubColors.darkGray,
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 8,
  },
  retryButtonText: {
    color: PetHubColors.white,
    fontSize: 16,
    fontWeight: '600',
  },
  // Modern profile header section with gradient effect
  profileHeaderSection: {
    backgroundColor: PetHubColors.darkGray,
    paddingTop: 60,
    paddingBottom: 40,
    paddingHorizontal: 20,
    position: 'relative',
    marginBottom: 20,
  },
  topBar: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    alignItems: 'center',
    marginBottom: 30,
  },
  headerSpacer: {
    flex: 1,
  },
  logoutButton: {
    backgroundColor: 'rgba(255, 255, 255, 0.15)',
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 25,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.2)',
  },
  logoutButtonText: {
    color: PetHubColors.white,
    fontSize: 14,
    fontWeight: '600',
    letterSpacing: 0.5,
  },
  profileInfoSection: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    zIndex: 1,
    minHeight: 140,
  },
  profileImageContainer: {
    position: 'relative',
    marginRight: 20,
  },
  profileImage: {
    width: 110,
    height: 110,
    borderRadius: 55,
    backgroundColor: PetHubColors.lightGray,
    borderWidth: 4,
    borderColor: PetHubColors.white,
  },
  profileImageRing: {
    position: 'absolute',
    top: -6,
    left: -6,
    right: -6,
    bottom: -6,
    borderRadius: 61,
    borderWidth: 2,
    borderColor: 'rgba(255, 255, 255, 0.3)',
  },
  profileDetails: {
    flex: 1,
    paddingTop: 15,
    justifyContent: 'space-between',
    minHeight: 120,
  },
  userName: {
    fontSize: 26,
    fontWeight: 'bold',
    color: PetHubColors.white,
    marginBottom: 8,
    letterSpacing: 0.5,
  },
  userEmail: {
    fontSize: 16,
    color: 'rgba(255, 255, 255, 0.8)',
    marginBottom: 12,
    fontWeight: '500',
  },
  userMetaInfo: {
    flexDirection: 'row',
    marginBottom: 20,
    gap: 12,
    flexWrap: 'wrap',
  },
  metaItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 20,
    marginBottom: 4,
  },
  metaIcon: {
    fontSize: 14,
    marginRight: 6,
  },
  metaText: {
    fontSize: 14,
    color: 'rgba(255, 255, 255, 0.9)',
    fontWeight: '500',
  },
  editButton: {
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 25,
    alignSelf: 'flex-start',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.3)',
  },
  editButtonText: {
    color: PetHubColors.white,
    fontSize: 14,
    fontWeight: '600',
    letterSpacing: 0.3,
  },
  scrollContainer: {
    flex: 1,
    backgroundColor: PetHubColors.lightGray,
  },
  scrollContent: {
    flexGrow: 1,
    paddingBottom: 30,
  },
  statsContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    marginTop: 10,
    marginBottom: 30,
    gap: 12,
  },
  statCard: {
    flex: 1,
    backgroundColor: PetHubColors.white,
    borderRadius: 20,
    paddingVertical: 20,
    paddingHorizontal: 16,
    alignItems: 'center',
    shadowColor: PetHubColors.darkGray,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 12,
    elevation: 5,
    borderWidth: 1,
    borderColor: 'rgba(32, 32, 33, 0.05)',
  },
  statIconContainer: {
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: PetHubColors.lightGray,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 12,
  },
  statIcon: {
    fontSize: 24,
  },
  statNumber: {
    fontSize: 24,
    fontWeight: 'bold',
    color: PetHubColors.darkGray,
    marginBottom: 4,
  },
  statLabel: {
    fontSize: 12,
    color: PetHubColors.textSecondary,
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  section: {
    marginBottom: 35,
    paddingHorizontal: 20,
    paddingTop: 10,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 20,
  },
  sectionTitle: {
    fontSize: 22,
    fontWeight: 'bold',
    color: PetHubColors.darkGray,
    letterSpacing: 0.3,
  },
  sectionBadge: {
    backgroundColor: PetHubColors.darkGray,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
  },
  sectionBadgeText: {
    color: PetHubColors.white,
    fontSize: 12,
    fontWeight: 'bold',
  },
  petsScrollContainer: {
    paddingHorizontal: 4,
  },
  petCard: {
    backgroundColor: PetHubColors.white,
    borderRadius: 20,
    padding: 20,
    marginRight: 16,
    alignItems: 'center',
    minWidth: 140,
    shadowColor: PetHubColors.darkGray,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 12,
    elevation: 5,
    borderWidth: 1,
    borderColor: 'rgba(32, 32, 33, 0.05)',
  },
  petCardHeader: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: PetHubColors.lightGray,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 12,
  },
  petEmoji: {
    fontSize: 28,
  },
  petName: {
    fontSize: 16,
    fontWeight: 'bold',
    color: PetHubColors.darkGray,
    marginBottom: 6,
    textAlign: 'center',
  },
  petDetails: {
    fontSize: 14,
    color: PetHubColors.textSecondary,
    marginBottom: 4,
    textAlign: 'center',
    fontWeight: '500',
  },
  petAge: {
    fontSize: 12,
    color: PetHubColors.textTertiary,
    textAlign: 'center',
    fontWeight: '500',
  },
  postCard: {
    backgroundColor: PetHubColors.white,
    borderRadius: 24,
    marginBottom: 20,
    padding: 20,
    shadowColor: PetHubColors.darkGray,
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.12,
    shadowRadius: 16,
    elevation: 8,
    borderWidth: 1,
    borderColor: 'rgba(32, 32, 33, 0.05)',
  },
  postHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 16,
  },
  postAuthorInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  postProfilePic: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: PetHubColors.lightGray,
    borderWidth: 2,
    borderColor: 'rgba(32, 32, 33, 0.1)',
  },
  postHeaderInfo: {
    marginLeft: 12,
    flex: 1,
  },
  postAuthor: {
    fontSize: 16,
    fontWeight: 'bold',
    color: PetHubColors.darkGray,
    marginBottom: 2,
  },
  postTime: {
    fontSize: 13,
    color: PetHubColors.textSecondary,
    fontWeight: '500',
  },
  deleteButton: {
    padding: 10,
    borderRadius: 25,
    backgroundColor: 'rgba(220, 53, 69, 0.1)',
    borderWidth: 1,
    borderColor: 'rgba(220, 53, 69, 0.2)',
  },
  deleteIcon: {
    fontSize: 16,
  },
  postCaption: {
    fontSize: 15,
    color: PetHubColors.darkGray,
    lineHeight: 22,
    marginBottom: 16,
    fontWeight: '500',
  },
  postImageContainer: {
    borderRadius: 16,
    overflow: 'hidden',
    marginBottom: 16,
    backgroundColor: PetHubColors.lightGray,
  },
  postImage: {
    width: '100%',
    height: 280,
  },
  postStats: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'flex-end',
  },
  likeContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 59, 48, 0.1)',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: 'rgba(255, 59, 48, 0.2)',
  },
  likeIcon: {
    fontSize: 16,
    marginRight: 6,
  },
  postLikes: {
    fontSize: 14,
    color: '#FF3B30',
    fontWeight: '600',
  },
  infoCard: {
    backgroundColor: PetHubColors.white,
    borderRadius: 20,
    padding: 20,
    shadowColor: PetHubColors.darkGray,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 12,
    elevation: 5,
    borderWidth: 1,
    borderColor: 'rgba(32, 32, 33, 0.05)',
  },
  infoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
  },
  infoIconContainer: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: PetHubColors.lightGray,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 16,
  },
  infoIcon: {
    fontSize: 18,
  },
  infoContent: {
    flex: 1,
  },
  infoLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: PetHubColors.textSecondary,
    marginBottom: 2,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  infoValue: {
    fontSize: 16,
    color: PetHubColors.darkGray,
    fontWeight: '500',
  },
  infoDivider: {
    height: 1,
    backgroundColor: 'rgba(32, 32, 33, 0.1)',
    marginVertical: 4,
    marginLeft: 56,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 40,
  },
  modalContainer: {
    backgroundColor: PetHubColors.white,
    borderRadius: 24,
    padding: 32,
    width: '100%',
    alignItems: 'center',
    shadowColor: PetHubColors.darkGray,
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.3,
    shadowRadius: 20,
    elevation: 15,
  },
  modalTitle: {
    fontSize: 22,
    fontWeight: 'bold',
    color: PetHubColors.darkGray,
    marginBottom: 16,
    textAlign: 'center',
  },
  modalMessage: {
    fontSize: 16,
    color: PetHubColors.textSecondary,
    textAlign: 'center',
    marginBottom: 32,
    lineHeight: 24,
    fontWeight: '500',
  },
  modalButtons: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    width: '100%',
    gap: 12,
  },
  modalCancelButton: {
    backgroundColor: PetHubColors.lightGray,
    paddingVertical: 16,
    paddingHorizontal: 24,
    borderRadius: 25,
    flex: 1,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(32, 32, 33, 0.1)',
  },
  modalCancelText: {
    fontSize: 16,
    fontWeight: '600',
    color: PetHubColors.darkGray,
    letterSpacing: 0.3,
  },
  modalLogoutButton: {
    backgroundColor: '#FF3B30',
    paddingVertical: 16,
    paddingHorizontal: 24,
    borderRadius: 25,
    flex: 1,
    alignItems: 'center',
    shadowColor: '#FF3B30',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 5,
  },
  modalLogoutText: {
    fontSize: 16,
    fontWeight: '600',
    color: PetHubColors.white,
    letterSpacing: 0.3,
  },
});

export default Profile;