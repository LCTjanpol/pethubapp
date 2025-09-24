import React, { useEffect, useState, useCallback } from 'react';
import { 
  View, Text, StyleSheet, TouchableOpacity, Image, Alert, 
  Modal, ScrollView 
} from 'react-native';
import MapView, { Marker, Region } from 'react-native-maps';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useFocusEffect } from '@react-navigation/native';
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
  // Removed unused refreshing state
  const [shopAddresses, setShopAddresses] = useState<{[key: number]: string}>({});

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
  const [mapRegion, setMapRegion] = useState<Region>({
    latitude: 10.3157, // Centered on Cebu, Philippines
    longitude: 123.8854,
    latitudeDelta: 0.5,
    longitudeDelta: 0.5,
  });

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
      
      // Auto-fit map to show all shops if available
      if (response.data.length > 0) {
        const latitudes = response.data.map((shop: Shop) => shop.latitude);
        const longitudes = response.data.map((shop: Shop) => shop.longitude);
        
        const minLat = Math.min(...latitudes);
        const maxLat = Math.max(...latitudes);
        const minLng = Math.min(...longitudes);
        const maxLng = Math.max(...longitudes);
        
        const centerLat = (minLat + maxLat) / 2;
        const centerLng = (minLng + maxLng) / 2;
        const deltaLat = Math.max(maxLat - minLat, 0.01) * 1.5; // Add padding
        const deltaLng = Math.max(maxLng - minLng, 0.01) * 1.5;
        
        setMapRegion({
          latitude: centerLat,
          longitude: centerLng,
          latitudeDelta: deltaLat,
          longitudeDelta: deltaLng,
        });
      }
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

  // Removed unused onRefresh function

  // Initialize shops
  useEffect(() => {
    fetchShops();
  }, [fetchShops]);

  // Refresh shops when screen is focused
  useFocusEffect(
    React.useCallback(() => {
      fetchShops();
    }, [fetchShops])
  );

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Pet Shops Near You</Text>
        <Text style={styles.headerSubtitle}>{shops.length} shops found</Text>
      </View>

      {/* Map */}
      <MapView
        style={styles.map}
        region={mapRegion}
        onRegionChangeComplete={setMapRegion}
        showsUserLocation={true}
        showsMyLocationButton={true}
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