import React, { useEffect, useState, useCallback, useRef } from 'react';
import { 
  StyleSheet, Text, View, Image, FlatList, TouchableOpacity, Alert, 
  ScrollView, RefreshControl, TextInput, Modal, KeyboardAvoidingView, 
  Platform, Keyboard, TouchableWithoutFeedback 
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useNavigation, useFocusEffect } from '@react-navigation/native';
import * as ImagePicker from 'expo-image-picker';
import { apiClient, ENDPOINTS, API_URL } from '../../config/api';
import { PetHubColors } from '../../constants/Colors';

// Types for user, comment, reply and post
interface User {
  id: number;
  fullName: string;
  profilePicture?: string;
}

interface Reply {
  id: number;
  user: User;
  content: string;
  createdAt: string;
}

interface Comment {
  id: number;
  user: User;
  content: string;
  createdAt: string;
  replies: Reply[];
}

interface Post {
  id: number;
  user: User;
  content: string; // image path
  caption?: string; // post caption
  createdAt: string;
  likes: number;
  comments: Comment[];
}

const Home = () => {
  const [posts, setPosts] = useState<Post[]>([]);
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [userLikes, setUserLikes] = useState<Set<number>>(new Set());
  const [refreshing, setRefreshing] = useState(false);
  const [loading, setLoading] = useState(true);
  const [isPosting, setIsPosting] = useState(false);
  const [likingPosts, setLikingPosts] = useState<Set<number>>(new Set());

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
  
  // Post creation modal states
  const [showPostModal, setShowPostModal] = useState(false);
  const [selectedImage, setSelectedImage] = useState<string | null>(null);
  const [postCaption, setPostCaption] = useState('');
  
  // Comment modal states
  const [showCommentModal, setShowCommentModal] = useState(false);
  const [selectedPostId, setSelectedPostId] = useState<number | null>(null);
  const [commentText, setCommentText] = useState('');
  const [replyText, setReplyText] = useState('');
  const [replyingToComment, setReplyingToComment] = useState<number | null>(null);
  
  const navigation = useNavigation();

  // Get authentication token from AsyncStorage
  const getToken = async () => {
    try {
      const token = await AsyncStorage.getItem('token');
      return token;
    } catch (err) {
      console.error('Error getting token:', err);
      return null;
    }
  };

  // Fetch the logged-in user's profile
  const fetchCurrentUser = useCallback(async (token: string) => {
    try {
      const response = await apiClient.get(ENDPOINTS.USER.PROFILE, {
        headers: { Authorization: `Bearer ${token}` },
        validateStatus: (status) => status === 200 || status === 404
      });
      
      if (response.status === 404) {
        Alert.alert('Error', 'User not found. Please log in again.');
        navigation.reset({ index: 0, routes: [{ name: 'auth/login' as never }] });
        return;
      }
      
      setCurrentUser(response.data);
    } catch (error: any) {
      console.error('Error fetching user profile:', error);
      Alert.alert('Error', 'Failed to fetch user profile. Please log in again.');
      navigation.reset({ index: 0, routes: [{ name: 'auth/login' as never }] });
    }
  }, [navigation]);

  // Fetch posts from the API with comments and replies
  const fetchPosts = useCallback(async (token: string) => {
    try {
      const response = await apiClient.get(ENDPOINTS.POST.LIST, {
        headers: { Authorization: `Bearer ${token}` },
      });
      
      const sortedPosts: Post[] = response.data.sort((a: Post, b: Post) => 
        new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
      );
      
      setPosts(sortedPosts);
    } catch (error: any) {
      console.error('Error fetching posts:', error);
      Alert.alert('Error', 'Failed to fetch posts. Please log in again.');
      navigation.reset({ index: 0, routes: [{ name: 'auth/login' as never }] });
    }
  }, [navigation]);

  // Like/unlike a post - handles both liking and unliking
  const handleLike = async (postId: number) => {
    if (!currentUser || likingPosts.has(postId)) return;
    
    const isCurrentlyLiked = userLikes.has(postId);
    
    // Mark this post as being liked to prevent multiple clicks
    setLikingPosts(prev => new Set(prev).add(postId));
    
    // Prevent multiple rapid clicks by temporarily updating UI
    const newUserLikes = new Set(userLikes);
    if (isCurrentlyLiked) {
      newUserLikes.delete(postId);
    } else {
      newUserLikes.add(postId);
    }
    setUserLikes(newUserLikes);
    
    // Also update the posts array immediately for better UX
    setPosts(prevPosts => 
      prevPosts.map(post => 
        post.id === postId 
          ? { 
              ...post, 
              likes: isCurrentlyLiked ? post.likes - 1 : post.likes + 1 
            }
          : post
      )
    );
    
    try {
      const token = await getToken();
      if (!token) throw new Error('No token');
      
      // Send like or unlike request based on current state
      await apiClient.put(ENDPOINTS.POST.LIKE(postId.toString()), { 
        likes: isCurrentlyLiked ? -1 : 1 
      }, {
        headers: { Authorization: `Bearer ${token}` },
      });
      
      // Only refresh posts if there was an error to get the correct count
      // The optimistic update above should handle the UI correctly
      
    } catch (error: any) {
      console.error('Error toggling like:', error);
      
      // Revert the optimistic update on error
      setUserLikes(userLikes);
      setPosts(prevPosts => 
        prevPosts.map(post => 
          post.id === postId 
            ? { 
                ...post, 
                likes: isCurrentlyLiked ? post.likes + 1 : post.likes - 1 
              }
            : post
        )
      );
      
      Alert.alert('Error', 'Failed to update like. Please try again.');
    } finally {
      // Remove from loading state
      setLikingPosts(prev => {
        const newSet = new Set(prev);
        newSet.delete(postId);
        return newSet;
      });
    }
  };

  // Open image picker and show post modal
  const handleCreatePost = async () => {
    if (isPosting) return;
    
    try {
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        quality: 0.8,
        allowsEditing: true,
        aspect: [4, 3],
      });
      
      if (!result.canceled && result.assets[0]) {
        setSelectedImage(result.assets[0].uri);
        setShowPostModal(true);
      }
    } catch (error) {
      console.error('Image picker error:', error);
      Alert.alert('Error', 'Failed to select image.');
    }
  };

  // Submit new post with caption
  const handleSubmitPost = async () => {
    if (!selectedImage || isPosting) return;
    
    setIsPosting(true);
    
    try {
      const token = await getToken();
      if (!token) {
        Alert.alert('Session expired', 'Please log in again.');
        navigation.reset({ index: 0, routes: [{ name: 'auth/login' as never }] });
        return;
      }

      console.log('📝 Creating post...');
      console.log('Selected image:', selectedImage);
      console.log('Caption:', postCaption);

      // Convert image to base64
      const response_fetch = await fetch(selectedImage);
      const blob = await response_fetch.blob();
      
      // Convert blob to base64
      const reader = new FileReader();
      const base64Promise = new Promise<string>((resolve, reject) => {
        reader.onload = () => {
          const result = reader.result as string;
          resolve(result);
        };
        reader.onerror = reject;
        reader.readAsDataURL(blob);
      });
      
      const imageBase64 = await base64Promise;
      
      console.log('Base64 image created:', {
        hasImage: !!imageBase64,
        base64Length: imageBase64.length,
        caption: postCaption.trim()
      });

      const response = await apiClient.post('/post/create-base64', {
        imageBase64: imageBase64,
        caption: postCaption.trim()
      }, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
        timeout: 90000, // 90 seconds for large base64 payloads
      });

      console.log('Post created successfully:', response.data);
      Alert.alert('Success', 'Your post has been shared!');
      setShowPostModal(false);
      setSelectedImage(null);
      setPostCaption('');
      fetchPosts(token);
    } catch (error: any) {
      console.error('Post submission error:', error);
      console.error('Post error details:', {
        message: error.message,
        code: error.code,
        status: error.response?.status,
        statusText: error.response?.statusText,
        data: error.response?.data,
        config: error.config
      });
      Alert.alert('Error', 'Failed to share post.');
    } finally {
      setIsPosting(false);
    }
  };

  // Add comment to post
  const handleAddComment = async () => {
    if (!selectedPostId || !commentText.trim()) return;
    
    try {
      const token = await getToken();
      if (!token) throw new Error('No token');

      await apiClient.post(ENDPOINTS.COMMENT.CREATE, {
        postId: selectedPostId,
        content: commentText.trim()
      }, {
        headers: { Authorization: `Bearer ${token}` },
      });

      setCommentText('');
      fetchPosts(token);
    } catch (error: any) {
      console.error('Error adding comment:', error);
      Alert.alert('Error', 'Failed to add comment.');
    }
  };

  // Add reply to comment
  const handleAddReply = async (commentId: number) => {
    if (!replyText.trim()) return;
    
    try {
      const token = await getToken();
      if (!token) throw new Error('No token');

      await apiClient.post(ENDPOINTS.REPLY.CREATE, {
        commentId: commentId,
        content: replyText.trim()
      }, {
        headers: { Authorization: `Bearer ${token}` },
      });

      setReplyText('');
      setReplyingToComment(null);
      fetchPosts(token);
    } catch (error: any) {
      console.error('Error adding reply:', error);
      Alert.alert('Error', 'Failed to add reply.');
    }
  };



  // Pull to refresh functionality
  const onRefresh = async () => {
    setRefreshing(true);
    const token = await getToken();
    if (token) await fetchPosts(token);
    setRefreshing(false);
  };

  // Format time ago display
  const formatTimeAgo = (dateString: string) => {
    const now = new Date();
    const postDate = new Date(dateString);
    const diffInHours = Math.floor((now.getTime() - postDate.getTime()) / (1000 * 60 * 60));
    
    if (diffInHours < 1) return 'Just now';
    if (diffInHours < 24) return `${diffInHours}h ago`;
    return postDate.toLocaleDateString();
  };

  // Use refs to store functions to avoid dependency issues
  const fetchPostsRef = useRef(fetchPosts);
  const fetchCurrentUserRef = useRef(fetchCurrentUser);
  fetchPostsRef.current = fetchPosts;
  fetchCurrentUserRef.current = fetchCurrentUser;

  // Refresh posts when screen is focused - but not on every focus
  useFocusEffect(
    useCallback(() => {
      // Only refresh if posts are empty or it's been more than 30 seconds
      const lastRefresh = Date.now() - (posts.length > 0 ? 30000 : 0);
      if (posts.length === 0 || Date.now() - lastRefresh > 30000) {
        (async () => {
          const token = await getToken();
          if (token) await fetchPostsRef.current(token);
        })();
      }
    }, [posts.length]) // Only depend on posts length, not the entire function
  );

  // Initialize user and posts on mount - only run once
  useEffect(() => {
    let isMounted = true;
    
    (async () => {
      setLoading(true);
      const token = await getToken();
      if (!token) {
        if (isMounted) {
          Alert.alert('Session expired', 'Please log in again.');
          navigation.reset({ index: 0, routes: [{ name: 'auth/login' as never }] });
        }
        setLoading(false);
        return;
      }
      
      if (isMounted) {
        await fetchCurrentUserRef.current(token);
        await fetchPostsRef.current(token);
        setLoading(false);
      }
    })();

    return () => {
      isMounted = false;
    };
  }, [navigation]); // Include navigation dependency

  // Render individual reply component
  const renderReply = (reply: Reply) => (
    <View key={reply.id} style={styles.replyContainer}>
      <Image
        source={getImageUrl(reply.user.profilePicture)}
        style={styles.replyAvatar}
      />
      <View style={styles.replyContent}>
        <Text style={styles.replyAuthor}>{reply.user.fullName}</Text>
        <Text style={styles.replyText}>{reply.content}</Text>
        <Text style={styles.replyTime}>{formatTimeAgo(reply.createdAt)}</Text>
      </View>
    </View>
  );

  // Render individual comment component
  const renderComment = (comment: Comment) => (
    <View key={comment.id} style={styles.commentContainer}>
      <Image
        source={getImageUrl(comment.user.profilePicture)}
        style={styles.commentAvatar}
      />
      <View style={styles.commentContent}>
        <Text style={styles.commentAuthor}>{comment.user.fullName}</Text>
        <Text style={styles.commentText}>{comment.content}</Text>
        <View style={styles.commentActions}>
          <Text style={styles.commentTime}>{formatTimeAgo(comment.createdAt)}</Text>
          <TouchableOpacity 
            onPress={() => setReplyingToComment(comment.id)}
            style={styles.replyButton}
          >
            <Text style={styles.replyButtonText}>Reply</Text>
          </TouchableOpacity>
        </View>
        
        {/* Render replies */}
        {comment.replies.map(renderReply)}
        
        {/* Reply input for this comment */}
        {replyingToComment === comment.id && (
          <View style={styles.replyInputContainer}>
            <TextInput
              style={styles.replyInput}
              placeholder="Write a reply..."
              placeholderTextColor={PetHubColors.textTertiary}
              value={replyText}
              onChangeText={setReplyText}
              multiline
            />
            <View style={styles.replyInputActions}>
              <TouchableOpacity 
                onPress={() => setReplyingToComment(null)}
                style={styles.cancelReplyButton}
              >
                <Text style={styles.cancelReplyText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity 
                onPress={() => handleAddReply(comment.id)}
                style={styles.submitReplyButton}
              >
                <Text style={styles.submitReplyText}>Reply</Text>
              </TouchableOpacity>
            </View>
          </View>
        )}
      </View>
    </View>
  );

  // Render individual post component
  const renderPost = ({ item }: { item: Post }) => (
    <View style={styles.postCard}>
      {/* Post header */}
      <View>
        <View style={styles.postHeader}>
          <Image
            source={getImageUrl(item.user.profilePicture)}
            style={styles.profilePic}
          />
          <View style={styles.postHeaderInfo}>
            <Text style={styles.postAuthor}>{item.user.fullName}</Text>
            <Text style={styles.postTime}>{formatTimeAgo(item.createdAt)}</Text>
          </View>
        </View>

        {/* Post caption */}
        {item.caption && (
          <Text style={styles.postCaption}>{item.caption}</Text>
        )}

        {/* Post image */}
        <Image
          source={getImageUrl(item.content)}
          style={styles.postImage}
        />

        {/* Post actions */}
        <View style={styles.postActions}>
          <TouchableOpacity 
            onPress={() => handleLike(item.id)} 
            style={[styles.likeButton, likingPosts.has(item.id) && styles.disabledButton]}
            disabled={likingPosts.has(item.id)}
          >
            <Text style={[styles.likeIcon, userLikes.has(item.id) && styles.likedIcon]}>
              {userLikes.has(item.id) ? '❤️' : '🤍'}
            </Text>
            <Text style={styles.likeCount}>{item.likes} likes</Text>
          </TouchableOpacity>
          
          <TouchableOpacity 
            onPress={() => {
              setSelectedPostId(item.id);
              setShowCommentModal(true);
            }}
            style={styles.commentButton}
          >
            <Text style={styles.commentIcon}>💬</Text>
            <Text style={styles.commentCount}>{item.comments.length} comments</Text>
          </TouchableOpacity>

        </View>

        {/* Show recent comments */}
        {item.comments.slice(0, 2).map(renderComment)}
        
        {item.comments.length > 2 && (
          <TouchableOpacity 
            onPress={() => {
              setSelectedPostId(item.id);
              setShowCommentModal(true);
            }}
            style={styles.viewAllCommentsButton}
          >
            <Text style={styles.viewAllCommentsText}>
              View all {item.comments.length} comments
            </Text>
          </TouchableOpacity>
        )}
      </View>

    </View>
  );

  // Main render
  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.headerTitle}>PetHub</Text>
        <TouchableOpacity
          style={styles.createPostButton}
          onPress={handleCreatePost}
          disabled={loading || isPosting}
        >
          <Text style={styles.createPostText}>📷 Share</Text>
        </TouchableOpacity>
      </View>

      {/* Posts list */}
      {loading ? (
        <View style={styles.loadingContainer}>
          <Text style={styles.loadingText}>Loading posts...</Text>
        </View>
      ) : (
        <FlatList
          data={posts}
          renderItem={renderPost}
          keyExtractor={(item) => item.id.toString()}
          contentContainerStyle={styles.postsList}
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
          }
        />
      )}

      {/* Post Creation Modal */}
      <Modal
        visible={showPostModal}
        animationType="slide"
        onRequestClose={() => setShowPostModal(false)}
      >
        <KeyboardAvoidingView 
          style={styles.modalContainer}
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        >
          <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
            <View style={styles.postModalContent}>
              <View style={styles.modalHeader}>
                <TouchableOpacity 
                  onPress={() => setShowPostModal(false)}
                  style={styles.modalCloseButton}
                >
                  <Text style={styles.modalCloseText}>Cancel</Text>
                </TouchableOpacity>
                <Text style={styles.modalTitle}>Create Post</Text>
                <TouchableOpacity 
                  onPress={handleSubmitPost}
                  style={[styles.modalSubmitButton, isPosting && styles.disabledButton]}
                  disabled={isPosting}
                >
                  <Text style={styles.modalSubmitText}>
                    {isPosting ? 'Sharing...' : 'Share'}
                  </Text>
                </TouchableOpacity>
              </View>

              {selectedImage && (
                <Image source={{ uri: selectedImage }} style={styles.selectedImage} />
              )}

              <TextInput
                style={styles.captionInput}
                placeholder="Write a caption..."
                placeholderTextColor={PetHubColors.textTertiary}
                value={postCaption}
                onChangeText={setPostCaption}
                multiline
                maxLength={500}
              />
            </View>
          </TouchableWithoutFeedback>
        </KeyboardAvoidingView>
      </Modal>

      {/* Comments Modal */}
      <Modal
        visible={showCommentModal}
        animationType="slide"
        onRequestClose={() => setShowCommentModal(false)}
      >
        <KeyboardAvoidingView 
          style={styles.modalContainer}
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        >
          <View style={styles.commentModalContent}>
            <View style={styles.modalHeader}>
              <TouchableOpacity 
                onPress={() => setShowCommentModal(false)}
                style={styles.modalCloseButton}
              >
                <Text style={styles.modalCloseText}>Close</Text>
              </TouchableOpacity>
              <Text style={styles.modalTitle}>Comments</Text>
              <View style={styles.placeholder} />
            </View>

            <ScrollView style={styles.commentsScrollView}>
              {selectedPostId && posts.find(p => p.id === selectedPostId)?.comments.map(renderComment)}
            </ScrollView>

            <View style={styles.commentInputContainer}>
              <TextInput
                style={styles.commentInput}
                placeholder="Add a comment..."
                placeholderTextColor={PetHubColors.textTertiary}
                value={commentText}
                onChangeText={setCommentText}
                multiline
              />
              <TouchableOpacity 
                onPress={handleAddComment}
                style={styles.commentSubmitButton}
              >
                <Text style={styles.commentSubmitText}>Post</Text>
              </TouchableOpacity>
            </View>
          </View>
        </KeyboardAvoidingView>
      </Modal>
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
    paddingBottom: 15,
    backgroundColor: PetHubColors.white,
    borderBottomWidth: 1,
    borderBottomColor: PetHubColors.mediumGray,
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: PetHubColors.darkGray,
  },
  createPostButton: {
    backgroundColor: PetHubColors.darkGray,
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
  },
  createPostText: {
    color: PetHubColors.white,
    fontSize: 14,
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
  postsList: {
    paddingVertical: 10,
  },
  postCard: {
    backgroundColor: PetHubColors.white,
    marginHorizontal: 15,
    marginVertical: 8,
    borderRadius: 16,
    padding: 16,
    shadowColor: PetHubColors.darkGray,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 3,
  },
  postHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  profilePic: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: PetHubColors.lightGray,
  },
  postHeaderInfo: {
    marginLeft: 12,
    flex: 1,
  },
  postAuthor: {
    fontSize: 16,
    fontWeight: 'bold',
    color: PetHubColors.darkGray,
  },
  postTime: {
    fontSize: 12,
    color: PetHubColors.textSecondary,
    marginTop: 2,
  },
  postCaption: {
    fontSize: 15,
    color: PetHubColors.darkGray,
    lineHeight: 20,
    marginBottom: 12,
  },
  postImage: {
    width: '100%',
    height: 300,
    borderRadius: 12,
    backgroundColor: PetHubColors.lightGray,
    marginBottom: 12,
  },
  postActions: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  likeButton: {
    flexDirection: 'row',
    alignItems: 'center',
    marginRight: 20,
  },
  likeIcon: {
    fontSize: 20,
    marginRight: 6,
  },
  likedIcon: {
    color: '#FF4444',
  },
  likeCount: {
    fontSize: 14,
    color: PetHubColors.textSecondary,
    fontWeight: '500',
  },
  commentButton: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  commentIcon: {
    fontSize: 18,
    marginRight: 6,
  },
  commentCount: {
    fontSize: 14,
    color: PetHubColors.textSecondary,
    fontWeight: '500',
  },
  commentContainer: {
    flexDirection: 'row',
    marginBottom: 12,
  },
  commentAvatar: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: PetHubColors.lightGray,
    marginRight: 8,
  },
  commentContent: {
    flex: 1,
  },
  commentAuthor: {
    fontSize: 14,
    fontWeight: '600',
    color: PetHubColors.darkGray,
  },
  commentText: {
    fontSize: 14,
    color: PetHubColors.darkGray,
    marginTop: 2,
    lineHeight: 18,
  },
  commentActions: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 4,
  },
  commentTime: {
    fontSize: 12,
    color: PetHubColors.textTertiary,
    marginRight: 12,
  },
  replyButton: {
    paddingVertical: 2,
  },
  replyButtonText: {
    fontSize: 12,
    color: PetHubColors.darkGray,
    fontWeight: '600',
  },
  replyContainer: {
    flexDirection: 'row',
    marginTop: 8,
    marginLeft: 20,
  },
  replyAvatar: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: PetHubColors.lightGray,
    marginRight: 8,
  },
  replyContent: {
    flex: 1,
  },
  replyAuthor: {
    fontSize: 12,
    fontWeight: '600',
    color: PetHubColors.darkGray,
  },
  replyText: {
    fontSize: 12,
    color: PetHubColors.darkGray,
    marginTop: 1,
    lineHeight: 16,
  },
  replyTime: {
    fontSize: 10,
    color: PetHubColors.textTertiary,
    marginTop: 2,
  },
  replyInputContainer: {
    marginTop: 8,
    marginLeft: 20,
  },
  replyInput: {
    backgroundColor: PetHubColors.lightGray,
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 8,
    fontSize: 14,
    color: PetHubColors.darkGray,
    maxHeight: 80,
  },
  replyInputActions: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    marginTop: 8,
  },
  cancelReplyButton: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    marginRight: 8,
  },
  cancelReplyText: {
    fontSize: 14,
    color: PetHubColors.textSecondary,
  },
  submitReplyButton: {
    backgroundColor: PetHubColors.darkGray,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 6,
  },
  submitReplyText: {
    fontSize: 14,
    color: PetHubColors.white,
    fontWeight: '600',
  },
  viewAllCommentsButton: {
    marginTop: 8,
  },
  viewAllCommentsText: {
    fontSize: 14,
    color: PetHubColors.textSecondary,
    fontWeight: '500',
  },
  modalContainer: {
    flex: 1,
    backgroundColor: PetHubColors.white,
  },
  postModalContent: {
    flex: 1,
    paddingHorizontal: 20,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingTop: 50,
    paddingBottom: 20,
    borderBottomWidth: 1,
    borderBottomColor: PetHubColors.mediumGray,
  },
  modalCloseButton: {
    paddingVertical: 8,
  },
  modalCloseText: {
    fontSize: 16,
    color: PetHubColors.textSecondary,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: PetHubColors.darkGray,
  },
  modalSubmitButton: {
    backgroundColor: PetHubColors.darkGray,
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 8,
  },
  modalSubmitText: {
    fontSize: 16,
    color: PetHubColors.white,
    fontWeight: '600',
  },
  disabledButton: {
    opacity: 0.6,
  },
  selectedImage: {
    width: '100%',
    height: 300,
    borderRadius: 12,
    marginTop: 20,
    backgroundColor: PetHubColors.lightGray,
  },
  captionInput: {
    marginTop: 20,
    padding: 16,
    backgroundColor: PetHubColors.lightGray,
    borderRadius: 12,
    fontSize: 16,
    color: PetHubColors.darkGray,
    textAlignVertical: 'top',
    minHeight: 100,
  },
  commentModalContent: {
    flex: 1,
  },
  placeholder: {
    width: 60,
  },
  commentsScrollView: {
    flex: 1,
    paddingHorizontal: 20,
  },
  commentInputContainer: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    paddingHorizontal: 20,
    paddingVertical: 15,
    backgroundColor: PetHubColors.white,
    borderTopWidth: 1,
    borderTopColor: PetHubColors.mediumGray,
  },
  commentInput: {
    flex: 1,
    backgroundColor: PetHubColors.lightGray,
    borderRadius: 20,
    paddingHorizontal: 16,
    paddingVertical: 10,
    fontSize: 16,
    color: PetHubColors.darkGray,
    maxHeight: 100,
    marginRight: 10,
  },
  commentSubmitButton: {
    backgroundColor: PetHubColors.darkGray,
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 20,
  },
  commentSubmitText: {
    fontSize: 16,
    color: PetHubColors.white,
    fontWeight: '600',
  },
});

export default Home;
