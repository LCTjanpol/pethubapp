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

interface Post {
  id: number;
  image: string;
  likes: number;
  user: {
    id: number;
    fullName: string;
    profilePicture?: string;
  };
  createdAt: string;
}

const AdminPostsScreen = () => {
  const [posts, setPosts] = useState<Post[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  // Fetch all posts
  const fetchPosts = useCallback(async () => {
    try {
      const token = await AsyncStorage.getItem('token');
      if (!token) {
        router.replace('/auth/login');
        return;
      }

      const response = await apiClient.get(ENDPOINTS.POST.LIST, {
        headers: { Authorization: `Bearer ${token}` },
      });

      setPosts(response.data);
    } catch (error) {
      console.error('Error fetching posts:', error);
      Alert.alert('Error', 'Failed to fetch posts. Please try again.');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  // Delete post function
  const handleDeletePost = async (postId: number, authorName: string) => {
    Alert.alert(
      'Delete Post',
      `Are you sure you want to delete this post by ${authorName}? This action cannot be undone.`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              const token = await AsyncStorage.getItem('token');
              if (!token) return;

              await apiClient.delete(ENDPOINTS.ADMIN.DELETE_POST(postId.toString()), {
                headers: { Authorization: `Bearer ${token}` },
              });

              // Remove post from local state
              setPosts(prevPosts => prevPosts.filter(post => post.id !== postId));
              Alert.alert('Success', 'Post deleted successfully.');
            } catch (error) {
              console.error('Error deleting post:', error);
              Alert.alert('Error', 'Failed to delete post. Please try again.');
            }
          },
        },
      ]
    );
  };

  // Pull to refresh
  const onRefresh = useCallback(() => {
    setRefreshing(true);
    fetchPosts();
  }, [fetchPosts]);

  useEffect(() => {
    fetchPosts();
  }, [fetchPosts]);

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
  const navigateToUsers = () => router.replace('/admin/users');
  const navigateToPets = () => router.replace('/admin/pets');
  const navigateToShops = () => router.replace('/admin/shops');

  // Helper function to get image URL
  const getImageUrl = (imagePath?: string) => {
    if (!imagePath || imagePath.trim() === '') {
      return null;
    }
    
    // Handle different image path formats
    if (imagePath.startsWith('http')) {
      return imagePath; // Full URL
    } else if (imagePath.startsWith('/uploads/')) {
      return `http://10.40.0.230:3000${imagePath}`;
    } else {
      return `http://10.40.0.230:3000/uploads/${imagePath}`;
    }
  };

  // Format date helper
  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  // Calculate total likes
  const totalLikes = posts.reduce((sum, post) => sum + post.likes, 0);

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={PetHubColors.darkGray} />
        <Text style={styles.loadingText}>Loading posts...</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <View>
          <Text style={styles.headerTitle}>Post Management</Text>
          <Text style={styles.headerSubtitle}>{posts.length} total posts</Text>
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
        <TouchableOpacity style={styles.navButton} onPress={navigateToUsers}>
          <Text style={styles.navButtonText}>Users</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.navButton} onPress={navigateToPets}>
          <Text style={styles.navButtonText}>Pets</Text>
        </TouchableOpacity>
        <TouchableOpacity style={[styles.navButton, styles.navButtonActive]}>
          <Text style={[styles.navButtonText, styles.navButtonTextActive]}>Posts</Text>
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
            <FontAwesome name="file-text-o" size={24} color={PetHubColors.darkGray} />
            <Text style={styles.statNumber}>{posts.length}</Text>
            <Text style={styles.statLabel}>Total Posts</Text>
          </View>
        </View>

        {/* Posts List */}
        <View style={styles.postsContainer}>
          <Text style={styles.sectionTitle}>All Posts</Text>
          {posts.length === 0 ? (
            <View style={styles.emptyState}>
              <FontAwesome name="file-text-o" size={48} color={PetHubColors.textSecondary} />
              <Text style={styles.emptyStateText}>No posts found</Text>
            </View>
          ) : (
            posts.map((post) => (
              <View key={post.id} style={styles.postCard}>
                <View style={styles.postHeader}>
                  <Image
                    source={
                      post.user.profilePicture
                        ? { uri: getImageUrl(post.user.profilePicture) || '' }
                        : require('../../assets/images/icon.png')
                    }
                    style={styles.userAvatar}
                    defaultSource={require('../../assets/images/icon.png')}
                  />
                  <View style={styles.postAuthorInfo}>
                    <Text style={styles.authorName}>{post.user.fullName}</Text>
                    <Text style={styles.postDate}>{formatDate(post.createdAt)}</Text>
                  </View>
                </View>

                <View style={styles.postImageContainer}>
                  {post.content && getImageUrl(post.content) ? (
                    <Image
                      source={{ uri: getImageUrl(post.content) }}
                      style={styles.postImage}
                      resizeMode="cover"
                      onError={(error) => {
                        console.log('Image load error for post:', post.id);
                      }}
                      onLoad={() => {
                        console.log('Image loaded successfully for post:', post.id);
                      }}
                    />
                  ) : (
                    <View style={[styles.postImage, { backgroundColor: PetHubColors.lightGray, justifyContent: 'center', alignItems: 'center' }]}>
                      <FontAwesome name="image" size={48} color={PetHubColors.textSecondary} />
                      <Text style={{ color: PetHubColors.textSecondary, marginTop: 8 }}>No Image</Text>
                    </View>
                  )}
                </View>


                {post.caption && (
                  <View style={styles.postCaption}>
                    <Text style={styles.captionText}>{post.caption}</Text>
                  </View>
                )}

                <View style={styles.postStats}>
                  <View style={styles.likeContainer}>
                    <FontAwesome name="heart" size={16} color="#FF6B6B" />
                    <Text style={styles.likeCount}>{post.likes}</Text>
                  </View>
                </View>
                
                <TouchableOpacity
                  style={styles.deleteButton}
                  onPress={() => handleDeletePost(post.id, post.user.fullName)}
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
  postsContainer: {
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
  postCard: {
    backgroundColor: PetHubColors.white,
    borderRadius: 16,
    marginBottom: 16,
    shadowColor: PetHubColors.darkGray,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4,
    borderWidth: 1,
    borderColor: 'rgba(32, 32, 33, 0.05)',
  },
  postHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    paddingBottom: 12,
  },
  userAvatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    marginRight: 12,
    backgroundColor: PetHubColors.mediumGray,
  },
  postAuthorInfo: {
    flex: 1,
  },
  authorName: {
    fontSize: 16,
    fontWeight: '600',
    color: PetHubColors.darkGray,
    marginBottom: 2,
  },
  postDate: {
    fontSize: 12,
    color: PetHubColors.textSecondary,
  },
  postImageContainer: {
    marginHorizontal: 16,
    marginBottom: 12,
    borderRadius: 12,
    overflow: 'hidden',
  },
  postImage: {
    width: '100%',
    height: 200,
    backgroundColor: PetHubColors.mediumGray,
  },
  postCaption: {
    paddingHorizontal: 16,
    paddingBottom: 8,
  },
  captionText: {
    fontSize: 14,
    color: PetHubColors.darkGray,
    lineHeight: 20,
  },
  postStats: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingBottom: 16,
  },
  likeContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 107, 107, 0.1)',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    gap: 6,
  },
  likeCount: {
    fontSize: 14,
    fontWeight: '600',
    color: '#FF6B6B',
  },
  deleteButton: {
    backgroundColor: '#FF6B6B',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    alignSelf: 'flex-end',
    marginRight: 16,
    marginBottom: 16,
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

export default AdminPostsScreen;
