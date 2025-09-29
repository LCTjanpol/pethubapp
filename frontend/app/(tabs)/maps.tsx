import React, { useEffect, useState, useCallback, useRef } from 'react';
import { 
  View, Text, StyleSheet, TouchableOpacity, Image, Alert, 
  Modal, ScrollView
} from 'react-native';
import MapView, { Marker, Region } from 'react-native-maps';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useFocusEffect } from '@react-navigation/native';
import * as Location from 'expo-location';
import { apiClient, ENDPOINTS, API_URL } from '../../config/api';
import { PetHubColors } from '../../constants/Colors';

// Removed unused screenWidth variable

// Types for shop data
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

const MapsScreen = () => {
  const [shops, setShops] = useState<Shop[]>([]);
  const [selectedShop, setSelectedShop] = useState<Shop | null>(null);
  const [showShopModal, setShowShopModal] = useState(false);
  const [loading, setLoading] = useState(true);
  const [locationPermission, setLocationPermission] = useState<boolean>(false);
  const [shopAddresses, setShopAddresses] = useState<{[key: number]: string}>({});
  const mapRef = useRef<MapView>(null);

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

  // Helper function to get address from coordinates using reverse geocoding
  const getAddressFromCoordinates = async (latitude: number, longitude: number): Promise<string> => {
    try {
      // Using a free reverse geocoding service (you can replace with Google Maps API if needed)
      const response = await fetch(
        `https://api.bigdatacloud.net/data/reverse-geocode-client?latitude=${latitude}&longitude=${longitude}&localityLanguage=en`
      );
      const data = await response.json();
      
      if (data.locality && data.principalSubdivision) {
        return `${data.locality}, ${data.principalSubdivision}`;
      } else if (data.locality) {
        return data.locality;
      } else if (data.principalSubdivision) {
        return data.principalSubdivision;
      } else {
        return `${latitude.toFixed(4)}, ${longitude.toFixed(4)}`;
      }
    } catch (error) {
      console.error('Error getting address:', error);
      return `${latitude.toFixed(4)}, ${longitude.toFixed(4)}`;
    }
  };
  const [mapRegion] = useState<Region>({
    latitude: 10.3769, // Centered on Toledo City, Cebu, Philippines
    longitude: 123.6407,
    latitudeDelta: 0.1, // Closer zoom level for city view
    longitudeDelta: 0.1,
  });

  // Request location permission
  const requestLocationPermission = async () => {
    try {
      console.log('📍 Requesting location permission...');
      
      // Check if permission is already granted
      const { status: existingStatus } = await Location.getForegroundPermissionsAsync();
      if (existingStatus === 'granted') {
        console.log('✅ Location permission already granted');
        setLocationPermission(true);
        return true;
      }

      // Request permission
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status === 'granted') {
        console.log('✅ Location permission granted');
        setLocationPermission(true);
        return true;
      } else {
        console.log('❌ Location permission denied');
        setLocationPermission(false);
        Alert.alert(
          'Location Permission Required',
          'This app needs location permission to show nearby pet shops. Please enable location access in your device settings.',
          [{ text: 'OK' }]
        );
        return false;
      }
    } catch (error) {
      console.error('❌ Error requesting location permission:', error);
      setLocationPermission(false);
      return false;
    }
  };

  // Fetch shops from API
  const fetchShops = useCallback(async () => {
    try {
      const token = await AsyncStorage.getItem('token');
      if (!token) {
        Alert.alert('Error', 'Please log in again.');
        return;
      }

      const response = await apiClient.get(ENDPOINTS.SHOP.LIST, {
        headers: { Authorization: `Bearer ${token}` },
      });

      setShops(response.data);
      
      // Get addresses for all shops
      const addressPromises = response.data.map(async (shop: Shop) => {
        const address = await getAddressFromCoordinates(shop.latitude, shop.longitude);
        return { shopId: shop.id, address };
      });
      
      const addressResults = await Promise.all(addressPromises);
      const addressMap: {[key: number]: string} = {};
      addressResults.forEach(({ shopId, address }) => {
        addressMap[shopId] = address;
      });
      setShopAddresses(addressMap);
      
      // Only auto-fit map if user hasn't manually moved the map
      // This prevents the map from jumping around when shops are loaded
      console.log('📍 Shops loaded:', response.data.length);
      
      // Optional: Add a button to "Show All Shops" instead of auto-fitting
      // This gives users control over when to auto-fit the map
    } catch (error) {
      console.error('Failed to fetch shops:', error);
      Alert.alert('Error', 'Failed to fetch shop locations');
    } finally {
      setLoading(false);
    }
  }, []);

  // Handle marker press to show shop details
  const handleMarkerPress = (shop: Shop) => {
    setSelectedShop(shop);
    setShowShopModal(true);
  };

  // Get shop type icon
  const getShopTypeIcon = (type: string): string => {
    switch (type) {
      case 'Veterinary Clinic': return '🏥';
      case 'Pet Grooming': return '✂️';
      case 'Pet Supply Shop': return '🛒';
      case 'Pet Boarding': return '🏠';
      case 'Pet Training': return '🎓';
      default: return '🏪';
    }
  };

  // Get shop type color
  const getShopTypeColor = (type: string): string => {
    switch (type) {
      case 'Veterinary Clinic': return '#FF6B6B';
      case 'Pet Grooming': return '#4ECDC4';
      case 'Pet Supply Shop': return '#45B7D1';
      case 'Pet Boarding': return '#96CEB4';
      case 'Pet Training': return '#FECA57';
      default: return PetHubColors.darkGray;
    }
  };

  // Function to show all shops on map
  const handleShowAllShops = () => {
    if (shops.length === 0) return;
    
    const latitudes = shops.map((shop: Shop) => shop.latitude);
    const longitudes = shops.map((shop: Shop) => shop.longitude);
    
    const minLat = Math.min(...latitudes);
    const maxLat = Math.max(...latitudes);
    const minLng = Math.min(...longitudes);
    const maxLng = Math.max(...longitudes);
    
    const centerLat = (minLat + maxLat) / 2;
    const centerLng = (minLng + maxLng) / 2;
    const deltaLat = Math.max(maxLat - minLat, 0.01) * 1.5; // Add padding
    const deltaLng = Math.max(maxLng - minLng, 0.01) * 1.5;
    
    // Animate to the new region without updating state
    mapRef.current?.animateToRegion({
      latitude: centerLat,
      longitude: centerLng,
      latitudeDelta: deltaLat,
      longitudeDelta: deltaLng,
    }, 1000);
  };

  // Function to reset map to Toledo City
  const resetMapToToledo = () => {
    // Animate to Toledo City without updating state
    mapRef.current?.animateToRegion({
      latitude: 10.3769, // Toledo City, Cebu, Philippines
      longitude: 123.6407,
      latitudeDelta: 0.1,
      longitudeDelta: 0.1,
    }, 1000);
  };

  // Removed unused onRefresh function

  // Initialize shops and request location permission
  useEffect(() => {
    const initializeMaps = async () => {
      try {
        console.log('🗺️ Initializing maps...');
        
        // Request location permission first
        const hasPermission = await requestLocationPermission();
        console.log('📍 Location permission result:', hasPermission);
        
        // Fetch shops regardless of permission (shops can be shown without user location)
        await fetchShops();
        console.log('✅ Maps initialization completed');
      } catch (error) {
        console.error('❌ Error initializing maps:', error);
        Alert.alert(
          'Map Error', 
          'Failed to initialize maps. This might be due to network issues or location permissions. Please check your connection and try again.',
          [{ text: 'OK' }]
        );
      }
    };

    initializeMaps();
  }, [fetchShops]);

  // Refresh shops when screen is focused
  useFocusEffect(
    React.useCallback(() => {
      fetchShops();
    }, [fetchShops])
  );

  // Show loading state while initializing
  if (loading) {
    return (
      <View style={styles.container}>
        <View style={styles.header}>
          <Text style={styles.headerTitle}>Pet Shops Near You</Text>
          <Text style={styles.headerSubtitle}>Loading...</Text>
        </View>
        <View style={styles.loadingOverlay}>
          <Text style={styles.loadingText}>Loading map...</Text>
        </View>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <View style={styles.headerContent}>
          <View>
            <Text style={styles.headerTitle}>Pet Shops Near You</Text>
            <Text style={styles.headerSubtitle}>{shops.length} shops found</Text>
          </View>
          
        </View>
      </View>

      {/* Map */}
      <MapView
        ref={mapRef}
        style={styles.map}
        initialRegion={mapRegion}
        showsUserLocation={locationPermission}
        showsMyLocationButton={locationPermission}
        onMapReady={() => {
          console.log('🗺️ Map is ready');
        }}
      >
        {shops.map((shop) => (
          <Marker
            key={shop.id}
            coordinate={{
              latitude: shop.latitude,
              longitude: shop.longitude,
            }}
            title={shop.name}
            description={shop.type}
            onPress={() => handleMarkerPress(shop)}
          >
            <View style={[styles.customMarker, { backgroundColor: getShopTypeColor(shop.type) }]}>
              <Text style={styles.markerIcon}>{getShopTypeIcon(shop.type)}</Text>
            </View>
          </Marker>
        ))}
      </MapView>


      {/* Shop Details Modal */}
      <Modal
        visible={showShopModal}
        animationType="slide"
        onRequestClose={() => setShowShopModal(false)}
      >
        <View style={styles.modalContainer}>
          <View style={styles.modalHeader}>
            <TouchableOpacity onPress={() => setShowShopModal(false)}>
              <Text style={styles.modalCloseText}>Close</Text>
            </TouchableOpacity>
            <Text style={styles.modalTitle}>Shop Details</Text>
            <View style={styles.placeholder} />
          </View>

          {selectedShop && (
            <ScrollView style={styles.modalContent}>
              {/* Shop Image */}
              {selectedShop.image && (
                <Image
                  source={getImageUrl(selectedShop.image)}
                  style={styles.shopDetailImage}
                />
              )}

              {/* Shop Info */}
              <View style={styles.shopDetailHeader}>
                <View style={styles.shopTypeIconContainer}>
                  <Text style={styles.shopTypeIconLarge}>{getShopTypeIcon(selectedShop.type)}</Text>
                </View>
                <View style={styles.shopDetailInfo}>
                  <Text style={styles.shopDetailName}>{selectedShop.name}</Text>
                  <Text style={styles.shopDetailType}>{selectedShop.type}</Text>
                </View>
              </View>

              {/* Contact Information */}
              {selectedShop.contactNumber && (
                <View style={styles.detailSection}>
                  <Text style={styles.sectionTitle}>Contact Information</Text>
                  <View style={styles.detailRow}>
                    <Text style={styles.detailIcon}>📞</Text>
                    <Text style={styles.detailText}>{selectedShop.contactNumber}</Text>
                  </View>
                </View>
              )}

              {/* Working Hours and Days */}
              <View style={styles.detailSection}>
                <Text style={styles.sectionTitle}>Operating Hours</Text>
                
                {selectedShop.workingHours ? (
                  <View style={styles.detailRow}>
                    <Text style={styles.detailIcon}>🕒</Text>
                    <Text style={styles.detailText}>{selectedShop.workingHours}</Text>
                  </View>
                ) : (
                  <Text style={styles.noInfoText}>Hours not specified</Text>
                )}

                {selectedShop.workingDays ? (
                  <View style={styles.detailRow}>
                    <Text style={styles.detailIcon}>📅</Text>
                    <Text style={styles.detailText}>{selectedShop.workingDays}</Text>
                  </View>
                ) : (
                  <Text style={styles.noInfoText}>Working days not specified</Text>
                )}
              </View>

              {/* Location */}
              <View style={styles.detailSection}>
                <Text style={styles.sectionTitle}>Location</Text>
                <View style={styles.detailRow}>
                  <Text style={styles.detailIcon}>📍</Text>
                  <Text style={styles.detailText}>
                    {shopAddresses[selectedShop.id] || `${selectedShop.latitude.toFixed(4)}, ${selectedShop.longitude.toFixed(4)}`}
                  </Text>
                </View>
              </View>

            </ScrollView>
          )}
        </View>
      </Modal>

      {/* Loading Overlay */}
      {loading && (
        <View style={styles.loadingOverlay}>
          <Text style={styles.loadingText}>Loading shops...</Text>
        </View>
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
    paddingHorizontal: 20,
    paddingTop: 50,
    paddingBottom: 15,
    backgroundColor: PetHubColors.white,
    borderBottomWidth: 1,
    borderBottomColor: PetHubColors.mediumGray,
  },
  headerContent: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: PetHubColors.darkGray,
  },
  headerSubtitle: {
    fontSize: 14,
    color: PetHubColors.textSecondary,
    marginTop: 4,
  },
  headerButtons: {
    flexDirection: 'row',
    gap: 8,
  },
  resetButton: {
    backgroundColor: PetHubColors.lightGray,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: PetHubColors.mediumGray,
  },
  resetButtonText: {
    color: PetHubColors.darkGray,
    fontSize: 14,
    fontWeight: '600',
  },
  showAllButton: {
    backgroundColor: PetHubColors.darkGray,
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
  },
  showAllButtonText: {
    color: PetHubColors.white,
    fontSize: 14,
    fontWeight: '600',
  },
  map: {
    flex: 1,
  },
  customMarker: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 3,
    borderColor: PetHubColors.white,
  },
  markerIcon: {
    fontSize: 20,
  },
  modalContainer: {
    flex: 1,
    backgroundColor: PetHubColors.white,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingTop: 50,
    paddingBottom: 20,
    borderBottomWidth: 1,
    borderBottomColor: PetHubColors.mediumGray,
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
  placeholder: {
    width: 60,
  },
  modalContent: {
    flex: 1,
    paddingHorizontal: 20,
  },
  shopDetailImage: {
    width: '100%',
    height: 200,
    borderRadius: 12,
    backgroundColor: PetHubColors.lightGray,
    marginVertical: 20,
  },
  shopDetailHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 30,
  },
  shopTypeIconContainer: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: PetHubColors.lightGray,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 15,
  },
  shopTypeIconLarge: {
    fontSize: 30,
  },
  shopDetailInfo: {
    flex: 1,
  },
  shopDetailName: {
    fontSize: 24,
    fontWeight: 'bold',
    color: PetHubColors.darkGray,
    marginBottom: 4,
  },
  shopDetailType: {
    fontSize: 16,
    color: PetHubColors.textSecondary,
  },
  detailSection: {
    marginBottom: 30,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: PetHubColors.darkGray,
    marginBottom: 15,
  },
  detailRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 8,
  },
  detailIcon: {
    fontSize: 20,
    marginRight: 12,
    width: 30,
  },
  detailText: {
    fontSize: 16,
    color: PetHubColors.darkGray,
    flex: 1,
  },
  noInfoText: {
    fontSize: 14,
    color: PetHubColors.textTertiary,
    fontStyle: 'italic',
  },
  loadingOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(255, 255, 255, 0.8)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    fontSize: 16,
    color: PetHubColors.textSecondary,
  },
});

export default MapsScreen;