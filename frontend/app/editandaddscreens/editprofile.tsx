import React, { useEffect, useState } from 'react';
import { View, Text, TextInput, Image, StyleSheet, Alert, TouchableOpacity, ScrollView, ActivityIndicator } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as ImagePicker from 'expo-image-picker';
import { router } from 'expo-router';
import DateTimePicker from '@react-native-community/datetimepicker';
import { apiClient, ENDPOINTS, API_URL } from '../../config/api';
import { PetHubColors } from '../../constants/Colors';

const genderOptions = ['Male', 'Female', 'Other'];

const EditProfileScreen = () => {
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
    
    // If it's a local file path, return as is
    if (imagePath.startsWith('file://')) {
      return { uri: imagePath };
    }
    
    // Fallback to default image
    return require('../../assets/images/image.png');
  };
  const [originalUser, setOriginalUser] = useState<any>(null);
  const [user, setUser] = useState<any>({ fullName: '', profilePicture: '', birthdate: '', gender: '' });
  const [loading, setLoading] = useState(true);
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [profileImage, setProfileImage] = useState<string | null>(null);
  const [updating, setUpdating] = useState(false);

  useEffect(() => {
    fetchUserData();
  }, []);

  const fetchUserData = async () => {
    try {
      setLoading(true);
      const token = await AsyncStorage.getItem('token');
      const response = await apiClient.get(ENDPOINTS.USER.PROFILE, {
        headers: { Authorization: `Bearer ${token || ''}` },
      });
      setUser({
        fullName: response.data.fullName || '',
        profilePicture: response.data.profilePicture || '',
        birthdate: response.data.birthdate ? response.data.birthdate.substring(0, 10) : '',
        gender: response.data.gender || '',
      });
      setOriginalUser({
        fullName: response.data.fullName || '',
        profilePicture: response.data.profilePicture || '',
        birthdate: response.data.birthdate ? response.data.birthdate.substring(0, 10) : '',
        gender: response.data.gender || '',
      });
    } catch (error: any) {
      Alert.alert('Error', 'Failed to fetch user data: ' + (error?.message || error));
    } finally {
      setLoading(false);
    }
  };

  const pickImage = async () => {
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      aspect: [1, 1],
      quality: 1,
    });
    if (!result.canceled && result.assets && result.assets[0]) {
      setProfileImage(result.assets[0].uri);
      setUser({ ...user, profilePicture: result.assets[0].uri });
    }
  };

  const handleSave = async () => {
    // Only require full name, allow other fields to be optional
    if (!user.fullName || user.fullName.trim().length === 0) {
      Alert.alert('Error', 'Full name is required.');
      return;
    }
    setUpdating(true);
    try {
      const token = await AsyncStorage.getItem('token');
      
      // Convert image to base64 if present
      let imageBase64 = null;
      if (profileImage && profileImage !== originalUser.profilePicture) {
        try {
          console.log('📸 Converting profile image to base64...');
          const response = await fetch(profileImage);
          const arrayBuffer = await response.arrayBuffer();
          
          // Use chunked conversion to avoid stack overflow with large images
          const uint8Array = new Uint8Array(arrayBuffer);
          let binary = '';
          const chunkSize = 8192; // Process in chunks of 8KB
          
          for (let i = 0; i < uint8Array.length; i += chunkSize) {
            const chunk = uint8Array.slice(i, i + chunkSize);
            binary += String.fromCharCode(...chunk);
          }
          
          const base64 = btoa(binary);
          imageBase64 = `data:image/jpeg;base64,${base64}`;
          console.log('✅ Profile image converted to base64');
        } catch (imgError) {
          console.error('❌ Error converting profile image to base64:', imgError);
          Alert.alert('Error', 'Failed to process image. Please try again.');
          return;
        }
      }

      // Prepare request data
      const requestData: any = {
        fullName: user.fullName.trim(),
      };
      
      // Include birthdate if provided
      if (user.birthdate) {
        requestData.birthdate = user.birthdate;
      }
      
      // Include gender if provided
      if (user.gender) {
        requestData.gender = user.gender;
      }
      
      // Include profile image if selected
      if (imageBase64) {
        requestData.imageBase64 = imageBase64;
      }

      await apiClient.put('/user/update-profile-base64', requestData, {
        headers: {
          Authorization: `Bearer ${token || ''}`,
          'Content-Type': 'application/json',
        },
        timeout: 90000, // 90 seconds for large base64 payloads
      });
      Alert.alert('Success', 'Profile updated!');
      router.back();
    } catch (error: any) {
      console.error('❌ Profile update error:', error);
      Alert.alert('Error', 'Failed to update profile: ' + (error?.message || error));
    } finally {
      setUpdating(false);
    }
  };

  const handleCancel = () => {
    router.back();
  };

  if (loading) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
        <ActivityIndicator size="large" color="#007AFF" />
      </View>
    );
  }

  return (
    <ScrollView style={styles.container} contentContainerStyle={{ alignItems: 'center' }}>
      <TouchableOpacity style={styles.backButton} onPress={handleCancel}>
        <Image source={require('../../assets/images/back-button.png')} style={styles.backIcon} />
      </TouchableOpacity>
      <Text style={styles.headerText}>Edit Profile</Text>
      <View style={styles.profileContainer}>
        <Image
          source={profileImage ? { uri: profileImage } : getImageUrl(user.profilePicture)}
          style={styles.profilePicture}
        />
        <View style={styles.labelRow}>
          <Text style={styles.label}>Full Name *</Text>
        </View>
        <TextInput
          style={styles.input}
          placeholder="Enter your full name"
          value={user.fullName}
          onChangeText={(text) => setUser({ ...user, fullName: text })}
          placeholderTextColor={PetHubColors.textSecondary}
        />
        
        <View style={styles.labelRow}>
          <Text style={styles.label}>Birthdate</Text>
        </View>
        <TouchableOpacity style={styles.input} onPress={() => setShowDatePicker(true)}>
          <Text style={{ color: user.birthdate ? PetHubColors.darkGray : PetHubColors.textSecondary }}>
            {user.birthdate ? user.birthdate : 'Select your birthdate (optional)'}
          </Text>
        </TouchableOpacity>
        {showDatePicker && (
          <DateTimePicker
            value={user.birthdate ? new Date(user.birthdate) : new Date()}
            mode="date"
            display="default"
            onChange={(_, date) => {
              setShowDatePicker(false);
              if (date) setUser({ ...user, birthdate: date.toISOString().substring(0, 10) });
            }}
            maximumDate={new Date()}
          />
        )}
        <View style={styles.labelRow}>
          <Text style={styles.label}>Profile Picture</Text>
        </View>
        <View style={styles.imageRow}>
          <TouchableOpacity style={styles.addImageButton} onPress={pickImage}>
            <Text style={styles.addImageButtonText}>
              {profileImage ? 'Change Image' : 'Select Image'}
            </Text>
          </TouchableOpacity>
          <Text style={styles.fileNameText}>
            {profileImage ? profileImage.split('/').pop() : user.profilePicture ? 'Current image' : 'No image selected'}
          </Text>
        </View>
        
        <View style={styles.labelRow}>
          <Text style={styles.label}>Gender</Text>
        </View>
        <View style={styles.genderContainer}>
          {genderOptions.map((g: any) => (
            <TouchableOpacity
              key={g}
              style={styles.radioButton}
              onPress={() => setUser({ ...user, gender: g })}
            >
              <View style={[styles.radioOuter, user.gender === g && styles.radioOuterSelected]}>
                {user.gender === g && <View style={styles.radioInner} />}
              </View>
              <Text style={styles.radioLabel}>{g}</Text>
            </TouchableOpacity>
          ))}
        </View>
        

        <View style={styles.buttonRow}>
          <TouchableOpacity style={styles.confirmButton} onPress={handleSave} disabled={updating}>
            <Text style={styles.confirmButtonText}>{updating ? 'Saving...' : 'Confirm'}</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.cancelButton} onPress={handleCancel} disabled={updating}>
            <Text style={styles.cancelButtonText}>Cancel</Text>
          </TouchableOpacity>
        </View>
      </View>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: { 
    flex: 1, 
    backgroundColor: PetHubColors.lightGray 
},
  backButton: { 
    position: 'absolute', 
    left: 10, 
    top: 30, 
    zIndex: 10 
},
  backIcon: { 
    width: 28, 
    height: 28, 
    tintColor: PetHubColors.darkGray 
},
  headerText: { 
    fontSize: 32, 
    fontWeight: 'bold', 
    color: PetHubColors.darkGray, 
    alignSelf: 'center', 
    marginTop: 40, 
    marginBottom: 10, 
    letterSpacing: 1, 
    textShadowColor: 'rgba(32, 32, 33, 0.1)', 
    textShadowOffset: { width: 1, height: 2 }, 
    textShadowRadius: 2 
},
  profileContainer: { 
    width: '90%', 
    alignSelf: 'center', 
    backgroundColor: PetHubColors.white, 
    borderRadius: 24, 
    padding: 24, 
    alignItems: 'center', 
    marginTop: 10, 
    shadowColor: PetHubColors.darkGray, 
    shadowOffset: { width: 0, height: 4 }, 
    shadowOpacity: 0.1, 
    shadowRadius: 12, 
    elevation: 5,
    borderWidth: 1,
    borderColor: 'rgba(32, 32, 33, 0.05)'
},
  profilePicture: { 
    width: 120, 
    height: 120, 
    borderRadius: 60, 
    marginBottom: 24, 
    borderWidth: 4, 
    borderColor: PetHubColors.lightGray, 
    resizeMode: 'cover' 
},
  labelRow: {
    width: '100%', 
    marginTop: 8,
    marginBottom: 8 
},
  label: { 
    fontWeight: '600', 
    fontSize: 16, 
    color: PetHubColors.darkGray, 
    marginLeft: 4, 
    marginBottom: 2 
},
  input: { 
    width: '100%', 
    backgroundColor: PetHubColors.lightGray, 
    borderRadius: 16, 
    padding: 16, 
    fontSize: 16, 
    marginBottom: 16, 
    borderWidth: 1, 
    borderColor: 'rgba(32, 32, 33, 0.1)', 
    shadowColor: PetHubColors.darkGray, 
    shadowOffset: { width: 0, height: 2 }, 
    shadowOpacity: 0.05,
    shadowRadius: 4,
    color: PetHubColors.darkGray
},
  imageRow: { 
    flexDirection: 'row', 
    alignItems: 'center', 
    width: '100%', 
    marginBottom: 16 
},
  genderContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'flex-start',
    alignItems: 'center',
    width: '100%',
    marginBottom: 20,
    gap: 16,
  },
  addImageButton: { 
    backgroundColor: PetHubColors.darkGray, 
    borderRadius: 16, 
    paddingVertical: 12, 
    paddingHorizontal: 20, 
    marginRight: 10, 
    shadowColor: PetHubColors.darkGray, 
    shadowOffset: { width: 0, height: 2 }, 
    shadowOpacity: 0.1, 
    shadowRadius: 4,
    elevation: 2
},
  addImageButtonText: { 
    color: PetHubColors.white, 
    fontWeight: '600', 
    fontSize: 15 
},
  fileNameText: { 
    color: PetHubColors.textSecondary, 
    fontSize: 14, 
    flex: 1 
},
  radioButton: { 
    flexDirection: 'row', 
    alignItems: 'center', 
    marginBottom: 8,
    minWidth: 120,
  },
  radioOuter: { 
    width: 22, 
    height: 22, 
    borderRadius: 11, 
    borderWidth: 2, 
    borderColor: PetHubColors.mediumGray, 
    alignItems: 'center', 
    justifyContent: 'center', 
    marginRight: 6,
    backgroundColor: PetHubColors.white 
},
  radioOuterSelected: { 
    borderColor: PetHubColors.darkGray 
},
  radioInner: { 
    width: 12, 
    height: 12, 
    borderRadius: 6, 
    backgroundColor: PetHubColors.darkGray 
},
  radioLabel: { 
    fontSize: 16, 
    color: PetHubColors.darkGray, 
    fontWeight: '500', 
    marginRight: 2 
},
  buttonRow: { 
    flexDirection: 'row', 
    justifyContent: 'space-between', 
    width: '100%',
    marginTop: 24,
    marginBottom: 20
},
  confirmButton: { 
    flex: 1, 
    backgroundColor: PetHubColors.darkGray, 
    borderRadius: 16, 
    paddingVertical: 16, 
    alignItems: 'center', 
    marginRight: 12, 
    shadowColor: PetHubColors.darkGray, 
    shadowOffset: { width: 0, height: 4 }, 
    shadowOpacity: 0.1, 
    shadowRadius: 8,
    elevation: 3
},
  confirmButtonText: { 
    color: PetHubColors.white, 
    fontWeight: 'bold', 
    fontSize: 18, 
    letterSpacing: 1 
},
  cancelButton: { 
    flex: 1, 
    backgroundColor: PetHubColors.lightGray, 
    borderRadius: 16, 
    paddingVertical: 16, 
    alignItems: 'center', 
    marginLeft: 12, 
    shadowColor: PetHubColors.darkGray, 
    shadowOffset: { width: 0, height: 4 }, 
    shadowOpacity: 0.1, 
    shadowRadius: 8,
    elevation: 3,
    borderWidth: 1,
    borderColor: 'rgba(32, 32, 33, 0.1)'
},
  cancelButtonText: { 
    color: PetHubColors.darkGray, 
    fontWeight: 'bold', 
    fontSize: 18, 
    letterSpacing: 1 
},
});


export default EditProfileScreen;