import React, { useEffect, useState, useCallback } from 'react';
import { 
  View, Text, TextInput, StyleSheet, TouchableOpacity, Alert, ScrollView, 
  Image, Modal, KeyboardAvoidingView, Platform, RefreshControl,
  ActivityIndicator
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { router } from 'expo-router';
import MapView, { Marker } from 'react-native-maps';
import * as ImagePicker from 'expo-image-picker';
import { Picker } from '@react-native-picker/picker';
import DateTimePicker from '@react-native-community/datetimepicker';
import { FontAwesome } from '@expo/vector-icons';
import { apiClient, ENDPOINTS, API_URL } from '../../config/api';
import { PetHubColors } from '../../constants/Colors';

// Removed unused screenWidth variable

// Types for data structures
interface Shop {
  id: number;
  name: string;
  type: string;
  latitude: number;
  longitude: number;
  contactNumber?: string;
  workingHours?: string;
  workingDays?: string;
  image?: string;
  createdAt: string;
}

interface ShopFormData {
  name: string;
  type: string;
  latitude: number;
  longitude: number;
  contactNumber: string;
  workingHours: string;
  workingDays: string;
  image: string | null;
}

const AdminShopsScreen = () => {
  // Data states
  const [shops, setShops] = useState<Shop[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  
  // Shop form states
  const [showShopModal, setShowShopModal] = useState(false);
  const [showMapModal, setShowMapModal] = useState(false);
  const [selectedLocation, setSelectedLocation] = useState<{ latitude: number; longitude: number } | null>(null);
  const [selectedImage, setSelectedImage] = useState<string | null>(null);
  
  // Edit states
  const [editingShop, setEditingShop] = useState<Shop | null>(null);
  const [isEditing, setIsEditing] = useState(false);
  
  // Custom working hours and days states
  const [showCustomHours, setShowCustomHours] = useState(false);
  const [showCustomDays, setShowCustomDays] = useState(false);
  
  // Time picker states
  const [showStartTimePicker, setShowStartTimePicker] = useState(false);
  const [showEndTimePicker, setShowEndTimePicker] = useState(false);
  const [startTime, setStartTime] = useState(new Date());
  const [endTime, setEndTime] = useState(new Date());
  
  // Day selection states
  const [selectedDays, setSelectedDays] = useState({
    monday: false,
    tuesday: false,
    wednesday: false,
    thursday: false,
    friday: false,
    saturday: false,
    sunday: false,
  });
  
  const [shopFormData, setShopFormData] = useState<ShopFormData>({
    name: '',
    type: '',
    latitude: 0,
    longitude: 0,
    contactNumber: '',
    workingHours: '',
    workingDays: '',
    image: null,
  });

  // Shop types and working options
  const shopTypes = [
    'Pet Store', 'Veterinary Clinic', 'Pet Grooming', 'Pet Training',
    'Pet Boarding', 'Pet Supplies', 'Pet Food', 'Pet Accessories'
  ];

  const workingDaysOptions = [
    'Monday-Friday',
    'Monday-Saturday', 
    'Monday-Sunday (Daily)',
    'Saturday-Sunday (Weekends Only)',
    'Monday-Wednesday-Friday',
    'Tuesday-Thursday',
    'Custom Days'
  ];

  const workingHoursOptions = [
    '8:00 AM - 6:00 PM',
    '9:00 AM - 7:00 PM',
    '10:00 AM - 8:00 PM',
    '7:00 AM - 9:00 PM',
    '24/7',
    'Custom Hours'
  ];

  // Helper function to format time for display
  const formatTime = (date: Date): string => {
    return date.toLocaleTimeString('en-US', {
      hour: 'numeric',
      minute: '2-digit',
      hour12: true,
    });
  };

  // Helper function to get selected days as string
  const getSelectedDaysString = (): string => {
    const days: string[] = [];
    const dayNames = {
      monday: 'Monday',
      tuesday: 'Tuesday', 
      wednesday: 'Wednesday',
      thursday: 'Thursday',
      friday: 'Friday',
      saturday: 'Saturday',
      sunday: 'Sunday',
    };

    Object.entries(selectedDays).forEach(([day, selected]) => {
      if (selected) {
        days.push(dayNames[day as keyof typeof dayNames]);
      }
    });

    return days.length > 0 ? days.join(', ') : '';
  };

  // Helper function to toggle day selection
  const toggleDay = (day: keyof typeof selectedDays) => {
    setSelectedDays(prev => ({
      ...prev,
      [day]: !prev[day]
    }));
  };

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

  // Fetch all shops
  const fetchShops = useCallback(async () => {
    try {
      const token = await AsyncStorage.getItem('token');
      if (!token) {
        router.replace('/auth/login');
        return;
      }

      const response = await apiClient.get(ENDPOINTS.SHOP.LIST, {
        headers: { Authorization: `Bearer ${token}` },
      });

      setShops(response.data);
    } catch (error) {
      console.error('Error fetching shops:', error);
      Alert.alert('Error', 'Failed to fetch shops. Please try again.');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  // Edit shop function
  const handleEditShop = (shop: Shop) => {
    setEditingShop(shop);
    setIsEditing(true);
    
    // Populate form with existing shop data
    setShopFormData({
      name: shop.name,
      type: shop.type,
      latitude: shop.latitude,
      longitude: shop.longitude,
      contactNumber: shop.contactNumber ?? '',
      workingHours: shop.workingHours || '',
      workingDays: shop.workingDays || '',
      image: shop.image || null,
    });
    
    // Set location
    setSelectedLocation({
      latitude: shop.latitude,
      longitude: shop.longitude,
    });
    
    // Set image if exists
    if (shop.image) {
      setSelectedImage(`${API_URL.replace('/api', '')}${shop.image}`);
    } else {
      setSelectedImage(null);
    }
    
    // Show modal
    setShowShopModal(true);
  };

  // Delete shop function
  const handleDeleteShop = async (shopId: number, shopName: string) => {
    Alert.alert(
      'Delete Shop',
      `Are you sure you want to delete ${shopName}? This action cannot be undone.`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              const token = await AsyncStorage.getItem('token');
              if (!token) return;

              await apiClient.delete(ENDPOINTS.SHOP.DELETE(shopId.toString()), {
                headers: { Authorization: `Bearer ${token}` },
              });

              // Remove shop from local state
              setShops(prevShops => prevShops.filter(shop => shop.id !== shopId));
              Alert.alert('Success', 'Shop deleted successfully.');
            } catch (error) {
              console.error('Error deleting shop:', error);
              Alert.alert('Error', 'Failed to delete shop. Please try again.');
            }
          },
        },
      ]
    );
  };

  // Pull to refresh
  const onRefresh = useCallback(() => {
    setRefreshing(true);
    fetchShops();
  }, [fetchShops]);

  useEffect(() => {
    fetchShops();
  }, [fetchShops]);

  // Removed unused handleLogout function

  // Navigation handlers
  const navigateToDashboard = () => router.replace('/admin/dashboard');
  const navigateToUsers = () => router.replace('/admin/users');
  const navigateToPets = () => router.replace('/admin/pets');
  const navigateToPosts = () => router.replace('/admin/posts');

  // Map selection handler
  const handleMapPress = (event: any) => {
    const { latitude, longitude } = event.nativeEvent.coordinate;
    setSelectedLocation({ latitude, longitude });
    setShopFormData(prev => ({
      ...prev,
      latitude,
      longitude,
    }));
  };

  // Image picker handler
  const pickImage = async () => {
    try {
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        aspect: [4, 3],
        quality: 0.8,
      });

      if (!result.canceled && result.assets[0]) {
        const imageUri = result.assets[0].uri;
        setSelectedImage(imageUri);
        setShopFormData(prev => ({ ...prev, image: imageUri }));
      }
    } catch (error) {
      console.error('Error picking image:', error);
      Alert.alert('Error', 'Failed to pick image. Please try again.');
    }
  };

  // Submit shop form
  // Reset form when modal is closed
  const resetForm = () => {
    setShopFormData({
      name: '',
      type: '',
      latitude: 0,
      longitude: 0,
      contactNumber: '',
      workingHours: '',
      workingDays: '',
      image: null,
    });
    setSelectedLocation(null);
    setSelectedImage(null);
    setShowCustomHours(false);
    setShowCustomDays(false);
    setShowStartTimePicker(false);
    setShowEndTimePicker(false);
    setStartTime(new Date());
    setEndTime(new Date());
    setSelectedDays({
      monday: false,
      tuesday: false,
      wednesday: false,
      thursday: false,
      friday: false,
      saturday: false,
      sunday: false,
    });
    setIsEditing(false);
    setEditingShop(null);
  };

  const handleSubmitShop = async () => {
    try {
      if (!shopFormData.name || !shopFormData.type || !shopFormData.latitude || !shopFormData.longitude) {
        Alert.alert('Error', 'Please fill in all required fields and select a location.');
        return;
      }

      const token = await AsyncStorage.getItem('token');
      if (!token) return;

      const formData = new FormData();
      formData.append('name', shopFormData.name);
      formData.append('type', shopFormData.type);
      formData.append('latitude', shopFormData.latitude.toString());
      formData.append('longitude', shopFormData.longitude.toString());
      formData.append('contactNumber', shopFormData.contactNumber);
      
      // Handle working hours - use time picker if custom, otherwise use preset
      let finalWorkingHours;
      if (shopFormData.workingHours === 'Custom Hours') {
        finalWorkingHours = `${formatTime(startTime)} - ${formatTime(endTime)}`;
      } else {
        finalWorkingHours = shopFormData.workingHours;
      }
      formData.append('workingHours', finalWorkingHours);
      
      // Handle working days - use day selection if custom, otherwise use preset
      let finalWorkingDays;
      if (shopFormData.workingDays === 'Custom Days') {
        finalWorkingDays = getSelectedDaysString();
      } else {
        finalWorkingDays = shopFormData.workingDays;
      }
      formData.append('workingDays', finalWorkingDays);

      if (selectedImage) {
        formData.append('image', {
          uri: selectedImage,
          type: 'image/jpeg',
          name: 'shop-image.jpg',
        } as any);
      }

      let response;
      if (isEditing && editingShop) {
        // Update existing shop
        response = await apiClient.put(ENDPOINTS.SHOP.UPDATE(editingShop.id.toString()), formData, {
          headers: {
            Authorization: `Bearer ${token}`,
            'Content-Type': 'multipart/form-data',
          },
        });
      } else {
        // Create new shop
        response = await apiClient.post(ENDPOINTS.SHOP.LIST, formData, {
          headers: {
            Authorization: `Bearer ${token}`,
            'Content-Type': 'multipart/form-data',
          },
        });
      }

      if (response.data) {
        // Show success message
        const action = isEditing ? 'updated' : 'created';
        Alert.alert(
          'Success!',
          `Shop ${action} successfully!`,
          [
            {
              text: 'OK',
              onPress: () => {
                // Close modal and refresh shops list
                setShowShopModal(false);
                resetForm();
                setIsEditing(false);
                setEditingShop(null);
                fetchShops(); // Refresh the shops list
              }
            }
          ]
        );
      }
    } catch (error) {
      console.error('Error saving shop:', error);
      const action = isEditing ? 'updating' : 'adding';
      Alert.alert('Error', `Failed to ${action} shop. Please try again.`);
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

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={PetHubColors.darkGray} />
        <Text style={styles.loadingText}>Loading shops...</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <View>
          <Text style={styles.headerTitle}>Shop Management</Text>
          <Text style={styles.headerSubtitle}>{shops.length} registered shops</Text>
        </View>
        <View style={styles.headerButtons}>
          <TouchableOpacity 
            style={styles.addButton} 
            onPress={() => setShowShopModal(true)}
          >
            
            <Text style={styles.addButtonText}>Add Shop</Text>
          </TouchableOpacity>
          
        </View>
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
        <TouchableOpacity style={styles.navButton} onPress={navigateToPosts}>
          <Text style={styles.navButtonText}>Posts</Text>
        </TouchableOpacity>
        <TouchableOpacity style={[styles.navButton, styles.navButtonActive]}>
          <Text style={[styles.navButtonText, styles.navButtonTextActive]}>Shops</Text>
        </TouchableOpacity>
      </View>

      <ScrollView 
        style={styles.content}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
        showsVerticalScrollIndicator={false}
      >
        {/* Shop Counter */}
        <View style={styles.statsCard}>
          <View style={styles.statItem}>
            <Image 
              source={require('../../assets/images/shops.png')} 
              style={styles.statIcon}
              resizeMode="contain"
            />
            <Text style={styles.statNumber}>{shops.length}</Text>
            <Text style={styles.statLabel}>Total Shops</Text>
          </View>
        </View>

        {/* Shops List */}
        <View style={styles.shopsContainer}>
          <Text style={styles.sectionTitle}>All Shops</Text>
          {shops.length === 0 ? (
            <View style={styles.emptyState}>
              <FontAwesome name="shopping-bag" size={48} color={PetHubColors.textSecondary} />
              <Text style={styles.emptyStateText}>No shops found</Text>
              <TouchableOpacity 
                style={styles.addFirstShopButton}
                onPress={() => setShowShopModal(true)}
              >
                <Text style={styles.addFirstShopButtonText}>Add Your First Shop</Text>
              </TouchableOpacity>
            </View>
          ) : (
            shops.map((shop) => (
              <View key={shop.id} style={styles.shopCard}>
                <View style={styles.shopImageContainer}>
                  <Image
                    source={getImageUrl(shop.image)}
                    style={styles.shopImage}
                    resizeMode="cover"
                  />
                </View>
                
                <View style={styles.shopInfo}>
                  <Text style={styles.shopName}>{shop.name}</Text>
                  <Text style={styles.shopType}>{shop.type}</Text>
                  
                  {shop.contactNumber && (
                    <Text style={styles.shopDetail}>
                      📞 {shop.contactNumber}
                    </Text>
                  )}
                  {shop.workingHours && (
                    <Text style={styles.shopDetail}>
                      🕒 {shop.workingHours}
                    </Text>
                  )}
                  {shop.workingDays && (
                    <Text style={styles.shopDetail}>
                      📅 {shop.workingDays}
                    </Text>
                  )}
                  <Text style={styles.shopDetail}>
                    📍 Lat: {shop.latitude.toFixed(4)}, Lng: {shop.longitude.toFixed(4)}
                  </Text>
                  <Text style={styles.shopDetail}>
                    🕒 Added {formatDate(shop.createdAt)}
                  </Text>
                </View>
                
                <View style={styles.actionButtonsContainer}>
                  <TouchableOpacity
                    style={styles.editButton}
                    onPress={() => handleEditShop(shop)}
                  >
                    <FontAwesome name="edit" size={16} color={PetHubColors.white} />
                    <Text style={styles.editButtonText}>Edit</Text>
                  </TouchableOpacity>
                  
                  <TouchableOpacity
                    style={styles.deleteButton}
                    onPress={() => handleDeleteShop(shop.id, shop.name)}
                  >
                    <FontAwesome name="trash" size={16} color={PetHubColors.white} />
                    <Text style={styles.deleteButtonText}>Delete</Text>
                  </TouchableOpacity>
                </View>
              </View>
            ))
          )}
        </View>
      </ScrollView>

      {/* Add Shop Modal */}
      <Modal
        visible={showShopModal}
        animationType="slide"
        presentationStyle="pageSheet"
      >
        <KeyboardAvoidingView 
          style={styles.modalContainer}
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        >
          <View style={styles.modalHeader}>
            <TouchableOpacity 
              onPress={() => {
                setShowShopModal(false);
                resetForm();
              }}
              style={styles.closeButton}
            >
              <FontAwesome name="times" size={24} color={PetHubColors.darkGray} />
            </TouchableOpacity>
            <Text style={styles.modalTitle}>{isEditing ? 'Edit Shop' : 'Add New Shop'}</Text>
            <TouchableOpacity 
              onPress={handleSubmitShop}
              style={styles.saveButton}
            >
              <Text style={styles.saveButtonText}>Save</Text>
            </TouchableOpacity>
          </View>

          <ScrollView style={styles.modalContent} showsVerticalScrollIndicator={false}>
            {/* Shop Image */}
            <View style={styles.formGroup}>
              <Text style={styles.label}>Shop Image</Text>
              <TouchableOpacity style={styles.imagePickerButton} onPress={pickImage}>
                <FontAwesome name="camera" size={24} color={PetHubColors.darkGray} />
                <Text style={styles.imagePickerText}>
                  {selectedImage ? 'Change Image' : 'Select Image'}
                </Text>
              </TouchableOpacity>
              {selectedImage && (
                <Image source={{ uri: selectedImage }} style={styles.selectedImage} />
              )}
            </View>

            {/* Shop Name */}
            <View style={styles.formGroup}>
              <Text style={styles.label}>Shop Name *</Text>
              <TextInput
                style={styles.input}
                value={shopFormData.name}
                onChangeText={(text) => setShopFormData(prev => ({ ...prev, name: text }))}
                placeholder="Enter shop name"
                placeholderTextColor={PetHubColors.textSecondary}
              />
            </View>

            {/* Contact Number */}
            <View style={styles.formGroup}>
              <Text style={styles.label}>Contact Number</Text>
              <TextInput
                style={styles.input}
                value={shopFormData.contactNumber}
                onChangeText={(text) => setShopFormData(prev => ({ ...prev, contactNumber: text }))}
                placeholder="Enter contact number (optional)"
                placeholderTextColor={PetHubColors.textSecondary}
                keyboardType="phone-pad"
              />
            </View>

            {/* Shop Type */}
            <View style={styles.formGroup}>
              <Text style={styles.label}>Shop Type *</Text>
              <View style={styles.pickerContainer}>
                <Picker
                  selectedValue={shopFormData.type}
                  onValueChange={(value) => setShopFormData(prev => ({ ...prev, type: value }))}
                  style={styles.picker}
                >
                  <Picker.Item label="Select shop type" value="" />
                  {shopTypes.map((type) => (
                    <Picker.Item key={type} label={type} value={type} />
                  ))}
                </Picker>
              </View>
            </View>

            {/* Location Selection */}
            <View style={styles.formGroup}>
              <Text style={styles.label}>Location *</Text>
              <TouchableOpacity 
                style={styles.mapButton}
                onPress={() => setShowMapModal(true)}
              >
                <FontAwesome name="map-marker" size={20} color={PetHubColors.darkGray} />
                <Text style={styles.mapButtonText}>
                  {selectedLocation 
                    ? `Lat: ${selectedLocation.latitude.toFixed(4)}, Lng: ${selectedLocation.longitude.toFixed(4)}`
                    : 'Select Location on Map'
                  }
                </Text>
              </TouchableOpacity>
            </View>

            {/* Working Hours */}
            <View style={styles.formGroup}>
              <Text style={styles.label}>Working Hours</Text>
              <View style={styles.pickerContainer}>
                <Picker
                  selectedValue={shopFormData.workingHours}
                  onValueChange={(value) => {
                    setShopFormData(prev => ({ ...prev, workingHours: value }));
                    setShowCustomHours(value === 'Custom Hours');
                  }}
                  style={styles.picker}
                >
                  <Picker.Item label="Select working hours" value="" />
                  {workingHoursOptions.map((hours) => (
                    <Picker.Item key={hours} label={hours} value={hours} />
                  ))}
                </Picker>
              </View>
              
              {showCustomHours && (
                <View style={styles.timePickerContainer}>
                  <View style={styles.timeRow}>
                    <Text style={styles.timeLabel}>Start Time:</Text>
                    <TouchableOpacity
                      style={styles.timeButton}
                      onPress={() => setShowStartTimePicker(true)}
                    >
                      <Text style={styles.timeButtonText}>{formatTime(startTime)}</Text>
                      <FontAwesome name="clock-o" size={16} color={PetHubColors.darkGray} />
                    </TouchableOpacity>
                  </View>
                  
                  <View style={styles.timeRow}>
                    <Text style={styles.timeLabel}>End Time:</Text>
                    <TouchableOpacity
                      style={styles.timeButton}
                      onPress={() => setShowEndTimePicker(true)}
                    >
                      <Text style={styles.timeButtonText}>{formatTime(endTime)}</Text>
                      <FontAwesome name="clock-o" size={16} color={PetHubColors.darkGray} />
                    </TouchableOpacity>
                  </View>
                  
                  {showStartTimePicker && (
                    <DateTimePicker
                      value={startTime}
                      mode="time"
                      display="default"
                      onChange={(event, selectedTime) => {
                        setShowStartTimePicker(false);
                        if (selectedTime) {
                          setStartTime(selectedTime);
                        }
                      }}
                    />
                  )}
                  
                  {showEndTimePicker && (
                    <DateTimePicker
                      value={endTime}
                      mode="time"
                      display="default"
                      onChange={(event, selectedTime) => {
                        setShowEndTimePicker(false);
                        if (selectedTime) {
                          setEndTime(selectedTime);
                        }
                      }}
                    />
                  )}
                </View>
              )}
            </View>

            {/* Working Days */}
            <View style={styles.formGroup}>
              <Text style={styles.label}>Working Days</Text>
              <View style={styles.pickerContainer}>
                <Picker
                  selectedValue={shopFormData.workingDays}
                  onValueChange={(value) => {
                    setShopFormData(prev => ({ ...prev, workingDays: value }));
                    setShowCustomDays(value === 'Custom Days');
                  }}
                  style={styles.picker}
                >
                  <Picker.Item label="Select working days" value="" />
                  {workingDaysOptions.map((days) => (
                    <Picker.Item key={days} label={days} value={days} />
                  ))}
                </Picker>
              </View>
              
              {showCustomDays && (
                <View style={styles.daysContainer}>
                  <Text style={styles.daysLabel}>Select working days:</Text>
                  <View style={styles.daysGrid}>
                    {Object.entries(selectedDays).map(([day, selected]) => (
                      <TouchableOpacity
                        key={day}
                        style={[
                          styles.dayButton,
                          selected && styles.dayButtonSelected
                        ]}
                        onPress={() => toggleDay(day as keyof typeof selectedDays)}
                      >
                        <Text style={[
                          styles.dayButtonText,
                          selected && styles.dayButtonTextSelected
                        ]}>
                          {day.charAt(0).toUpperCase() + day.slice(1, 3)}
                        </Text>
                      </TouchableOpacity>
                    ))}
                  </View>
                  {getSelectedDaysString() && (
                    <Text style={styles.selectedDaysText}>
                      Selected: {getSelectedDaysString()}
                    </Text>
                  )}
                </View>
              )}
            </View>
          </ScrollView>
        </KeyboardAvoidingView>
      </Modal>

      {/* Map Modal */}
      <Modal
        visible={showMapModal}
        animationType="slide"
        presentationStyle="fullScreen"
      >
        <View style={styles.mapContainer}>
          <View style={styles.mapHeader}>
            <TouchableOpacity 
              onPress={() => setShowMapModal(false)}
              style={styles.mapCloseButton}
            >
              <FontAwesome name="times" size={24} color={PetHubColors.darkGray} />
            </TouchableOpacity>
            <Text style={styles.mapTitle}>Select Shop Location</Text>
            <TouchableOpacity 
              onPress={() => setShowMapModal(false)}
              style={styles.mapConfirmButton}
            >
              <Text style={styles.mapConfirmButtonText}>Confirm</Text>
            </TouchableOpacity>
          </View>
          
          <MapView
            style={styles.map}
            initialRegion={{
              latitude: 37.78825,
              longitude: -122.4324,
              latitudeDelta: 0.0922,
              longitudeDelta: 0.0421,
            }}
            onPress={handleMapPress}
          >
            {selectedLocation && (
              <Marker
                coordinate={selectedLocation}
                title="Shop Location"
                description="Tap to confirm this location"
              />
            )}
          </MapView>
          
          <View style={styles.mapInstructions}>
            <Text style={styles.mapInstructionsText}>
              Tap on the map to select your shop location
            </Text>
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
  headerButtons: {
    flexDirection: 'row',
    gap: 12,
  },
  addButton: {
    backgroundColor: PetHubColors.darkGray,
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  addButtonText: {
    color: PetHubColors.white,
    fontSize: 14,
    fontWeight: '600',
  },
  logoutButton: {
    backgroundColor: '#FF6B6B',
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
  statIcon: {
    width: 24,
    height: 24,
    tintColor: PetHubColors.darkGray,
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
  shopsContainer: {
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
    marginBottom: 20,
  },
  addFirstShopButton: {
    backgroundColor: PetHubColors.darkGray,
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 20,
  },
  addFirstShopButtonText: {
    color: PetHubColors.white,
    fontSize: 16,
    fontWeight: '600',
  },
  shopCard: {
    backgroundColor: PetHubColors.white,
    borderRadius: 16,
    marginBottom: 16,
    overflow: 'hidden',
    shadowColor: PetHubColors.darkGray,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4,
  },
  shopImageContainer: {
    height: 150,
  },
  shopImage: {
    width: '100%',
    height: '100%',
    backgroundColor: PetHubColors.mediumGray,
  },
  shopInfo: {
    padding: 16,
    flex: 1,
  },
  shopName: {
    fontSize: 18,
    fontWeight: 'bold',
    color: PetHubColors.darkGray,
    marginBottom: 4,
  },
  shopType: {
    fontSize: 14,
    color: PetHubColors.textSecondary,
    marginBottom: 8,
  },
  shopDetail: {
    fontSize: 12,
    color: PetHubColors.textSecondary,
    marginBottom: 4,
  },
  actionButtonsContainer: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: 8,
    margin: 16,
    marginTop: 0,
  },
  editButton: {
    backgroundColor: '#4CAF50',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  editButtonText: {
    color: PetHubColors.white,
    fontSize: 12,
    fontWeight: '600',
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
  // Modal Styles
  modalContainer: {
    flex: 1,
    backgroundColor: PetHubColors.white,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingTop: 60,
    paddingBottom: 20,
    borderBottomWidth: 1,
    borderBottomColor: PetHubColors.mediumGray,
  },
  closeButton: {
    padding: 8,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: PetHubColors.darkGray,
  },
  saveButton: {
    backgroundColor: PetHubColors.darkGray,
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
  },
  saveButtonText: {
    color: PetHubColors.white,
    fontSize: 14,
    fontWeight: '600',
  },
  modalContent: {
    flex: 1,
    padding: 20,
  },
  formGroup: {
    marginBottom: 20,
  },
  label: {
    fontSize: 16,
    fontWeight: '600',
    color: PetHubColors.darkGray,
    marginBottom: 8,
  },
  input: {
    borderWidth: 1,
    borderColor: PetHubColors.mediumGray,
    borderRadius: 12,
    padding: 16,
    fontSize: 16,
    color: PetHubColors.darkGray,
    backgroundColor: PetHubColors.white,
  },
  pickerContainer: {
    borderWidth: 1,
    borderColor: PetHubColors.mediumGray,
    borderRadius: 12,
    backgroundColor: PetHubColors.white,
  },
  picker: {
    height: 50,
  },
  imagePickerButton: {
    borderWidth: 2,
    borderColor: PetHubColors.mediumGray,
    borderStyle: 'dashed',
    borderRadius: 12,
    padding: 20,
    alignItems: 'center',
    backgroundColor: PetHubColors.lightGray,
  },
  imagePickerText: {
    marginTop: 8,
    fontSize: 16,
    color: PetHubColors.darkGray,
    fontWeight: '500',
  },
  selectedImage: {
    width: '100%',
    height: 200,
    borderRadius: 12,
    marginTop: 12,
  },
  mapButton: {
    borderWidth: 1,
    borderColor: PetHubColors.mediumGray,
    borderRadius: 12,
    padding: 16,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    backgroundColor: PetHubColors.white,
  },
  mapButtonText: {
    fontSize: 16,
    color: PetHubColors.darkGray,
    flex: 1,
  },
  // Map Modal Styles
  mapContainer: {
    flex: 1,
    backgroundColor: PetHubColors.white,
  },
  mapHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingTop: 60,
    paddingBottom: 20,
    borderBottomWidth: 1,
    borderBottomColor: PetHubColors.mediumGray,
  },
  mapCloseButton: {
    padding: 8,
  },
  mapTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: PetHubColors.darkGray,
  },
  mapConfirmButton: {
    backgroundColor: PetHubColors.darkGray,
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
  },
  mapConfirmButtonText: {
    color: PetHubColors.white,
    fontSize: 14,
    fontWeight: '600',
  },
  map: {
    flex: 1,
  },
  mapInstructions: {
    padding: 20,
    backgroundColor: PetHubColors.white,
    borderTopWidth: 1,
    borderTopColor: PetHubColors.mediumGray,
  },
  mapInstructionsText: {
    fontSize: 16,
    color: PetHubColors.textSecondary,
    textAlign: 'center',
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
  // Time Picker Styles
  timePickerContainer: {
    marginTop: 12,
    padding: 16,
    backgroundColor: PetHubColors.lightGray,
    borderRadius: 12,
  },
  timeRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  timeLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: PetHubColors.darkGray,
  },
  timeButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: PetHubColors.white,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: PetHubColors.mediumGray,
    gap: 8,
  },
  timeButtonText: {
    fontSize: 14,
    color: PetHubColors.darkGray,
    fontWeight: '500',
  },
  // Day Selection Styles
  daysContainer: {
    marginTop: 12,
    padding: 16,
    backgroundColor: PetHubColors.lightGray,
    borderRadius: 12,
  },
  daysLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: PetHubColors.darkGray,
    marginBottom: 12,
  },
  daysGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: 12,
  },
  dayButton: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: PetHubColors.mediumGray,
    backgroundColor: PetHubColors.white,
    minWidth: 50,
    alignItems: 'center',
  },
  dayButtonSelected: {
    backgroundColor: PetHubColors.darkGray,
    borderColor: PetHubColors.darkGray,
  },
  dayButtonText: {
    fontSize: 12,
    fontWeight: '600',
    color: PetHubColors.darkGray,
  },
  dayButtonTextSelected: {
    color: PetHubColors.white,
  },
  selectedDaysText: {
    fontSize: 12,
    color: PetHubColors.textSecondary,
    fontStyle: 'italic',
  },
});

export default AdminShopsScreen;
