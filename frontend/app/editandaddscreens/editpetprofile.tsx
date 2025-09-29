import React, { useEffect, useState, useCallback } from 'react';
import { View, Text, TextInput, Image, StyleSheet, Alert, TouchableOpacity, ScrollView, RefreshControl } from 'react-native';
import { Picker } from '@react-native-picker/picker';
import { useNavigation, useRoute } from '@react-navigation/native';
import * as ImagePicker from 'expo-image-picker';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { apiClient, ENDPOINTS } from '../../config/api';

const EditPetProfileScreen = () => {
  const navigation = useNavigation();
  const route = useRoute();
  const { petId } = route.params;
  const [pet, setPet] = useState({ name: '', petPicture: '', age: '', type: '', breed: '' });
  const [refreshing, setRefreshing] = useState(false);
  const [profileImage, setProfileImage] = useState<string | null>(null);
  const petTypes = ['Dog', 'Cat', 'Fish', 'Hamster', 'Bird'];

  const fetchPet = useCallback(async () => {
    try {
      const token = await AsyncStorage.getItem('token');
      if (!token) {
        Alert.alert('Error', 'No token found. Please log in again.');
        return;
      }
      const response = await apiClient.get(ENDPOINTS.PET.DETAIL(petId), {
        headers: { Authorization: `Bearer ${token}` },
      });
      setPet(response.data);
      setProfileImage(response.data.petPicture || null);
    } catch (error: any) {
      Alert.alert('Error', 'Failed to fetch pet: ' + (error?.message || 'Unknown error'));
    } finally {
      setRefreshing(false);
    }
  }, [petId]);

  useEffect(() => {
    fetchPet();
  }, [fetchPet]);

  const onRefresh = async () => {
    setRefreshing(true);
    await fetchPet();
  };

  const pickImage = async () => {
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      aspect: [4, 3],
      quality: 1,
    });
    if (!result.canceled && result.assets && result.assets[0]) {
      const image = result.assets[0];
      setProfileImage(image.uri);
      setPet({ ...pet, petPicture: image.uri });
    }
  };

  const handleSave = async () => {
    if (!pet.name && !pet.age && !pet.type && !pet.breed && !profileImage) {
      Alert.alert('Error', 'Please update at least one field.');
      return;
    }
    try {
      const token = await AsyncStorage.getItem('token');
      if (!token) {
        Alert.alert('Error', 'No token found. Please log in again.');
        return;
      }

      // Convert image to base64 if present
      let imageBase64 = null;
      if (profileImage && profileImage.startsWith('file')) {
        try {
          console.log('📸 Converting pet image to base64...');
          const response = await fetch(profileImage);
          const arrayBuffer = await response.arrayBuffer();
          const base64 = btoa(String.fromCharCode(...new Uint8Array(arrayBuffer)));
          imageBase64 = `data:image/jpeg;base64,${base64}`;
          console.log('✅ Pet image converted to base64');
        } catch (imgError) {
          console.error('❌ Error converting pet image to base64:', imgError);
          Alert.alert('Error', 'Failed to process image. Please try again.');
          return;
        }
      }

      // Prepare request data
      const requestData: any = {};
      if (pet.name) requestData.name = pet.name;
      if (pet.age) requestData.age = pet.age;
      if (pet.type) requestData.type = pet.type;
      if (pet.breed) requestData.breed = pet.breed;
      if (imageBase64) requestData.imageBase64 = imageBase64;

      await apiClient.put('/pet/update-base64', { id: petId, ...requestData }, {
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        timeout: 90000, // 90 seconds for large base64 payloads
      });
      Alert.alert('Success', 'Pet updated!');
      await fetchPet();
      navigation.goBack();
    } catch (error: any) {
      console.error('❌ Pet update error:', error);
      if (error?.response?.data?.message) {
        Alert.alert('Error', error.response.data.message);
      } else {
        Alert.alert('Error', 'Failed to update pet: ' + (error?.message || 'Unknown error'));
      }
    }
  };

  const handleDelete = async () => {
    Alert.alert(
      'Delete Pet',
      'Are you sure you want to delete this pet? This action cannot be undone.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              const token = await AsyncStorage.getItem('token');
              if (!token) {
                Alert.alert('Error', 'No token found. Please log in again.');
                return;
              }
              await apiClient.delete(ENDPOINTS.PET.DELETE(petId), {
                headers: { Authorization: `Bearer ${token}` },
              });
              Alert.alert('Success', 'Pet deleted!');
              navigation.goBack();
            } catch (error: any) {
              if (error?.response?.data?.message) {
                Alert.alert('Error', error.response.data.message);
              } else {
                Alert.alert('Error', 'Failed to delete pet: ' + (error?.message || 'Unknown error'));
              }
            }
          },
        },
      ]
    );
  };

  return (
    <ScrollView
      style={styles.container}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
      contentContainerStyle={{ flexGrow: 1 }}
    >
      <TouchableOpacity style={styles.backButton} onPress={() => navigation.goBack()}>
        <Image source={require('../../assets/images/back-button.png')} style={styles.backIcon} />
      </TouchableOpacity>
      <Text style={styles.headerText}>Edit Pet</Text>
      <Image
        source={require('../../assets/images/pet.png')}
        style={styles.petImage}
      />
      <View style={styles.formSection}>
        <Text style={styles.label}>Edit Pet&apos;s Name</Text>
        <TextInput
          style={styles.input}
          placeholder="Enter name"
          value={pet.name}
          onChangeText={(text) => setPet({ ...pet, name: text })}
          placeholderTextColor="#888"
        />
        <Text style={styles.label}>Edit Type</Text>
        <View style={styles.pickerContainer}>
          <Picker
            selectedValue={pet.type}
            onValueChange={(itemValue) => setPet({ ...pet, type: itemValue })}
            style={styles.picker}
          >
            <Picker.Item label="Select Type" value="" />
            {petTypes.map((type) => (
              <Picker.Item key={type} label={type} value={type} />
            ))}
          </Picker>
        </View>
        <Text style={styles.label}>Edit Breed</Text>
        <TextInput
          style={styles.input}
          placeholder="Enter breed"
          value={pet.breed}
          onChangeText={(text) => setPet({ ...pet, breed: text })}
          placeholderTextColor="#888"
        />
        <Text style={styles.label}>Edit Age</Text>
        <TextInput
          style={styles.input}
          placeholder="Enter age"
          value={pet.age}
          onChangeText={(text) => setPet({ ...pet, age: text })}
          keyboardType="numeric"
          placeholderTextColor="#888"
        />
        <Text style={styles.label}>Edit profile image</Text>
        <View style={styles.imageRow}>
          <TouchableOpacity style={styles.addImageButton} onPress={pickImage}>
            <Text style={styles.addImageButtonText}>Add Image</Text>
          </TouchableOpacity>
          <Text style={styles.fileNameText}>{profileImage ? profileImage.split('/').pop() : 'No file selected'}</Text>
        </View>
      </View>
      <TouchableOpacity style={styles.deleteButton} onPress={handleDelete}>
        <Text style={styles.deleteButtonText}>Delete Pet</Text>
      </TouchableOpacity>
      <View style={styles.buttonRow}>
        <TouchableOpacity style={styles.addButton} onPress={handleSave}>
          <Text style={styles.addButtonText}>Confirm</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.cancelButton} onPress={() => navigation.goBack()}>
          <Text style={styles.cancelButtonText}>Cancel</Text>
        </TouchableOpacity>
      </View>
      
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
  },
  backButton: {
    position: 'absolute',
    top: 30,
    left: 10,
    zIndex: 10,
  },
  backIcon: {
    width: 28,
    height: 28,
    tintColor: '#222',
  },
  headerText: {
    fontSize: 38,
    fontWeight: 'bold',
    color: '#111',
    alignSelf: 'center',
    marginTop: 40,
    marginBottom: 10,
    letterSpacing: 1,
    textShadowColor: '#0002',
    textShadowOffset: { width: 1, height: 2 },
    textShadowRadius: 2,
  },
  petImage: {
    width: 120,
    height: 120,
    alignSelf: 'center',
    marginBottom: 10,
    borderRadius: 60,
    marginTop: 10,
  },
  formSection: {
    marginTop: 10,
    marginBottom: 10,
    paddingHorizontal: 16,
  },
  label: {
    fontWeight: 'bold',
    fontSize: 18,
    color: '#111',
    marginBottom: 4,
    marginTop: 10,
  },
  input: {
    borderWidth: 1,
    borderColor: '#ccc',
    backgroundColor: '#eaeaea',
    padding: 12,
    borderRadius: 8,
    marginBottom: 8,
    fontSize: 16,
  },
  pickerContainer: {
    borderWidth: 1,
    borderColor: '#ccc',
    borderRadius: 8,
    marginBottom: 8,
    backgroundColor: '#eaeaea',
  },
  picker: {
    height: 50,
    width: '100%',
    color: '#222',
  },
  imageRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 10,
  },
  addImageButton: {
    backgroundColor: '#eaeaea',
    padding: 10,
    borderRadius: 8,
    marginRight: 10,
    shadowColor: '#0002',
    shadowOffset: { width: 1, height: 2 },
    shadowRadius: 2,
  },
  addImageButtonText: {
    color: '#222',
    fontWeight: 'bold',
  },
  fileNameText: {
    color: '#222',
    fontSize: 14,
  },
  buttonRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 20,
    marginBottom: 10,
    paddingHorizontal: 16,
  },
  addButton: {
    backgroundColor: '#111',
    borderRadius: 20,
    paddingVertical: 12,
    paddingHorizontal: 32,
    alignItems: 'center',
    marginRight: 10,
    flex: 1,
  },
  addButtonText: {
    color: '#fff',
    fontWeight: 'bold',
    fontSize: 18,
  },
  cancelButton: {
    backgroundColor: '#d6ecec',
    borderRadius: 20,
    paddingVertical: 12,
    paddingHorizontal: 32,
    alignItems: 'center',
    marginLeft: 10,
    flex: 1,
  },
  cancelButtonText: {
    color: '#222',
    fontWeight: 'bold',
    fontSize: 18,
  },
  deleteButton: {
    backgroundColor: '#ff3b30',
    borderRadius: 20,
    paddingVertical: 12,
    paddingHorizontal: 32,
    alignItems: 'center',
    marginTop: 10,
    marginHorizontal: 16,
  },
  deleteButtonText: {
    color: '#fff',
    fontWeight: 'bold',
    fontSize: 18,
  },
});

export default EditPetProfileScreen;