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

interface Pet {
  id: number;
  name: string;
  species: string;
  breed?: string;
  age?: number;
  weight?: number;
  color?: string;
  profilePicture?: string;
  ownerId: number;
  owner?: {
    fullName: string;
    email: string;
  };
  createdAt: string;
}

const AdminPetsScreen = () => {
  const [pets, setPets] = useState<Pet[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  // Fetch all pets
  const fetchPets = useCallback(async () => {
    try {
      const token = await AsyncStorage.getItem('token');
      if (!token) {
        router.replace('/auth/login');
        return;
      }

      const response = await apiClient.get(ENDPOINTS.ADMIN.PETS, {
        headers: { Authorization: `Bearer ${token}` },
      });

      setPets(response.data);
    } catch (error) {
      console.error('Error fetching pets:', error);
      Alert.alert('Error', 'Failed to fetch pets. Please try again.');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  // Delete pet function
  const handleDeletePet = async (petId: number, petName: string) => {
    Alert.alert(
      'Delete Pet',
      `Are you sure you want to delete ${petName}? This action cannot be undone.`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              const token = await AsyncStorage.getItem('token');
              if (!token) return;

              await apiClient.delete(`${ENDPOINTS.ADMIN.PETS}/${petId}`, {
                headers: { Authorization: `Bearer ${token}` },
              });

              // Remove pet from local state
              setPets(prevPets => prevPets.filter(pet => pet.id !== petId));
              Alert.alert('Success', 'Pet deleted successfully.');
            } catch (error) {
              console.error('Error deleting pet:', error);
              Alert.alert('Error', 'Failed to delete pet. Please try again.');
            }
          },
        },
      ]
    );
  };

  // Pull to refresh
  const onRefresh = useCallback(() => {
    setRefreshing(true);
    fetchPets();
  }, [fetchPets]);

  useEffect(() => {
    fetchPets();
  }, [fetchPets]);

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
  const navigateToPosts = () => router.replace('/admin/posts');
  const navigateToShops = () => router.replace('/admin/shops');

  // Helper function to get image URL
  const getImageUrl = (imagePath?: string) => {
    if (!imagePath) return null;
    
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
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
  };

  // Get pet type emoji
  const getPetTypeEmoji = (type?: string) => {
    if (!type || type === 'undefined' || type.trim() === '') return '🐾';
    
    const normalizedType = type.toLowerCase().trim();
    switch (normalizedType) {
      case 'dog': return '🐕';
      case 'cat': return '🐱';
      case 'bird': return '🐦';
      case 'fish': return '🐠';
      case 'rabbit': return '🐰';
      case 'hamster': return '🐹';
      case 'guinea pig': return '🐹';
      case 'turtle': return '🐢';
      case 'snake': return '🐍';
      case 'lizard': return '🦎';
      default: return '🐾';
    }
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={PetHubColors.darkGray} />
        <Text style={styles.loadingText}>Loading pets...</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <View>
          <Text style={styles.headerTitle}>Pet Management</Text>
          <Text style={styles.headerSubtitle}>{pets.length} registered pets</Text>
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
        <TouchableOpacity style={[styles.navButton, styles.navButtonActive]}>
          <Text style={[styles.navButtonText, styles.navButtonTextActive]}>Pets</Text>
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
            <FontAwesome name="paw" size={24} color={PetHubColors.darkGray} />
            <Text style={styles.statNumber}>{pets.length}</Text>
            <Text style={styles.statLabel}>Total Pets</Text>
          </View>
        </View>

        {/* Pets List */}
        <View style={styles.petsContainer}>
          <Text style={styles.sectionTitle}>All Pets</Text>
          {pets.length === 0 ? (
            <View style={styles.emptyState}>
              <FontAwesome name="paw" size={48} color={PetHubColors.textSecondary} />
              <Text style={styles.emptyStateText}>No pets found</Text>
            </View>
          ) : (
            pets.map((pet) => (
              <View key={pet.id} style={styles.petCard}>
                <View style={styles.petInfo}>
                  <Image
                    source={
                      pet.profilePicture
                        ? { uri: getImageUrl(pet.profilePicture) || '' }
                        : require('../../assets/images/pet.png')
                    }
                    style={styles.petAvatar}
                    defaultSource={require('../../assets/images/pet.png')}
                  />
                  <View style={styles.petDetails}>
                    <View style={styles.petNameRow}>
                      <Text style={styles.petName}>{pet.name}</Text>
                      <Text style={styles.speciesEmoji}>
                        {getPetTypeEmoji(pet.type)}
                      </Text>
                    </View>
                    <Text style={styles.petSpecies}>
                      {pet.type && pet.type !== 'undefined' ? pet.type : 'Unknown Species'} {pet.breed && `• ${pet.breed}`}
                    </Text>
                    {pet.age && (
                      <Text style={styles.petDetail}>
                        🎂 {pet.age} years old
                      </Text>
                    )}
                    {pet.weight && (
                      <Text style={styles.petDetail}>
                        ⚖️ {pet.weight} kg
                      </Text>
                    )}
                    {pet.color && (
                      <Text style={styles.petDetail}>
                        🎨 {pet.color}
                      </Text>
                    )}
                    {pet.owner && (
                      <Text style={styles.petDetail}>
                        👤 Owner: {pet.owner.fullName}
                      </Text>
                    )}
                    <Text style={styles.petDetail}>
                      🕒 Added {formatDate(pet.createdAt)}
                    </Text>
                  </View>
                </View>
                
                <TouchableOpacity
                  style={styles.deleteButton}
                  onPress={() => handleDeletePet(pet.id, pet.name)}
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
  petsContainer: {
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
  petCard: {
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
  petInfo: {
    flexDirection: 'row',
    flex: 1,
  },
  petAvatar: {
    width: 50,
    height: 50,
    borderRadius: 25,
    marginRight: 12,
    backgroundColor: PetHubColors.mediumGray,
  },
  petDetails: {
    flex: 1,
  },
  petNameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 4,
  },
  petName: {
    fontSize: 16,
    fontWeight: '600',
    color: PetHubColors.darkGray,
    marginRight: 8,
  },
  speciesEmoji: {
    fontSize: 16,
  },
  petSpecies: {
    fontSize: 14,
    color: PetHubColors.textSecondary,
    marginBottom: 4,
  },
  petDetail: {
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

export default AdminPetsScreen;
