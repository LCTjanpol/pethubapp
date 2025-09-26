import React, { useState } from 'react';
import { View, Text, TextInput, Image, StyleSheet, Alert, TouchableOpacity, ScrollView } from 'react-native';
import { Picker } from '@react-native-picker/picker';
import { useNavigation } from '@react-navigation/native';
import * as ImagePicker from 'expo-image-picker';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { apiClient, ENDPOINTS } from '../../config/api';

const AddPetScreen = () => {
  const navigation = useNavigation();
  const [newPet, setNewPet] = useState({ name: '', age: '', type: '', breed: '' });
  const [image, setImage] = useState<any>(null);
  const [imageLabel, setImageLabel] = useState('No file selected');
  const petTypes = ['Dog', 'Cat', 'Fish', 'Hamster', 'Bird'];

  const pickImage = async () => {
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      quality: 1,
    });
    if (!result.canceled && result.assets && result.assets[0]) {
      setImage(result.assets[0]);
      setImageLabel(result.assets[0].fileName || result.assets[0].uri.split('/').pop() || 'Selected');
    }
  };

  const handleAddPet = async () => {
    if (!newPet.name || !newPet.age || !newPet.type || !newPet.breed) {
      Alert.alert('Error', 'All fields are required');
      return;
    }
    try {
      const token = await AsyncStorage.getItem('token');
      if (!token) {
        Alert.alert('Error', 'No token found. Please log in again.');
        return;
      }
      const formData = new FormData();
      formData.append('name', newPet.name);
      formData.append('age', newPet.age);
      formData.append('type', newPet.type);
      formData.append('breed', newPet.breed);
      if (image) {
        formData.append('petPicture', {
          uri: image.uri,
          type: 'image/jpeg',
          name: image.fileName || 'pet.jpg',
        } as any);
      }
      await apiClient.post(ENDPOINTS.PET.LIST, formData, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });
      Alert.alert('Success', 'Pet added!');
      navigation.goBack();
    } catch (error: any) {
      console.error('Pet creation error:', error);
      console.error('Error details:', {
        message: error.message,
        code: error.code,
        status: error.response?.status,
        statusText: error.response?.statusText,
        data: error.response?.data,
        config: {
          url: error.config?.url,
          method: error.config?.method,
          baseURL: error.config?.baseURL
        }
      });
      Alert.alert('Error', 'Failed to add pet: ' + (error?.message || 'Unknown error'));
    }
  };

  return (
    <ScrollView contentContainerStyle={styles.container}>
      <TouchableOpacity style={styles.backButton} onPress={() => navigation.goBack()}>
        <Image source={require('../../assets/images/back-button.png')} style={{ width: 28, height: 28 }} />
      </TouchableOpacity>
      <Text style={styles.headerText}>Add Pet</Text>
      <Image source={require('../../assets/images/pet.png')} style={styles.petImage} />
      <Text style={styles.label}>Pet's Name</Text>
      <TextInput
        style={styles.input}
        placeholder="Pet's Name"
        value={newPet.name}
        onChangeText={(text) => setNewPet({ ...newPet, name: text })}
      />
      <Text style={styles.label}>Type</Text>
      <View style={styles.pickerContainer}>
        <Picker
          selectedValue={newPet.type}
          onValueChange={(itemValue) => setNewPet({ ...newPet, type: itemValue })}
          style={styles.picker}
        >
          <Picker.Item label="Select Type" value="" />
          {petTypes.map((type) => (
            <Picker.Item key={type} label={type} value={type} />
          ))}
        </Picker>
      </View>
      <Text style={styles.label}>Breed</Text>
      <TextInput
        style={styles.input}
        placeholder="Breed"
        value={newPet.breed}
        onChangeText={(text) => setNewPet({ ...newPet, breed: text })}
      />
      <Text style={styles.label}>Age</Text>
      <TextInput
        style={styles.input}
        placeholder="Age"
        value={newPet.age}
        onChangeText={(text) => setNewPet({ ...newPet, age: text })}
        keyboardType="numeric"
      />
      <Text style={styles.label}>Add profile image</Text>
      <View style={styles.imageRow}>
        <TouchableOpacity style={styles.imageButton} onPress={pickImage}>
          <Text style={styles.imageButtonText}>Add Image</Text>
        </TouchableOpacity>
        <Text style={styles.imageLabel}>{imageLabel}</Text>
      </View>
      <View style={styles.buttonRow}>
        <TouchableOpacity style={styles.addButton} onPress={handleAddPet}>
          <Text style={styles.addButtonText}>Add</Text>
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
    flexGrow: 1, 
    backgroundColor: '#fff', 
    padding: 20 
  },
  backButton: { 
    position: 'absolute', 
    left: 10, 
    top: 10, 
    zIndex: 10 
  },
  headerText: {
    fontSize: 36,
    fontWeight: 'bold',
    color: '#111',
    fontFamily: 'serif',
    textAlign: 'center',
    marginTop: 30,
    marginBottom: 10,
    textShadowColor: '#bbb',
    textShadowOffset: { width: 2, height: 2 },
    textShadowRadius: 2,
  },
  petImage: { 
    width: 120, 
    height: 120, 
    alignSelf: 'center', 
    marginBottom: 20 
  },
  label: { 
    fontSize: 16, 
    color: '#222', 
    marginBottom: 4, 
    marginTop: 10, 
    fontWeight: '500' 
  },
  input: {
    backgroundColor: '#e5e5e5',
    borderRadius: 12,
    padding: 12,
    marginBottom: 8,
    fontSize: 16,
    shadowColor: '#bbb',
    shadowOffset: { width: 2, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 2,
  },
  pickerContainer: {
    backgroundColor: '#e5e5e5',
    borderRadius: 12,
    marginBottom: 8,
    shadowColor: '#bbb',
    shadowOffset: { width: 2, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 2,
  },
  picker: { 
    height: 50, 
    width: '100%' 
  },
  imageRow: { 
    flexDirection: 'row', 
    alignItems: 'center', 
    marginBottom: 20 
  },
  imageButton: {
    backgroundColor: '#e5e5e5',
    borderRadius: 10,
    paddingVertical: 10,
    paddingHorizontal: 20,
    marginRight: 10,
    shadowColor: '#bbb',
    shadowOffset: { width: 2, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 2,
  },
  imageButtonText: { 
    color: '#222', 
    fontSize: 16 
  },
  imageLabel: { 
    color: '#666', 
    fontSize: 14 
  },
  buttonRow: { 
    flexDirection: 'row', 
    justifyContent: 'space-between', 
    marginTop: 30 
  },
  addButton: {
    backgroundColor: '#111',
    borderRadius: 20,
    paddingVertical: 14,
    paddingHorizontal: 40,
    alignItems: 'center',
    shadowColor: '#bbb',
    shadowOffset: { width: 2, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 2,
  },
  addButtonText: { 
    color: '#fff', 
    fontSize: 20, 
    fontWeight: 'bold' 
  },
  cancelButton: {
    backgroundColor: '#d6e6e6',
    borderRadius: 20,
    paddingVertical: 14,
    paddingHorizontal: 40,
    alignItems: 'center',
    shadowColor: '#bbb',
    shadowOffset: { width: 2, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 2,
  },
  cancelButtonText: { 
    color: '#222', 
    fontSize: 20, 
    fontWeight: 'bold' 
  },
});

export default AddPetScreen;