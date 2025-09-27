import React, { useState } from 'react';
import {
  View, Text, TextInput, StyleSheet, TouchableOpacity,
  Image, Alert, ScrollView, KeyboardAvoidingView, Platform,
  Keyboard, TouchableWithoutFeedback
} from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import DateTimePicker from '@react-native-community/datetimepicker';
import { router } from 'expo-router';
import axios from 'axios';
import { apiClient, ENDPOINTS, API_URL } from '../../config/api';
import { PetHubColors } from '../../constants/Colors';

export default function RegisterScreen() {
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [birthdate, setBirthdate] = useState('');
  const [showPicker, setShowPicker] = useState(false);
  const [gender, setGender] = useState('');
  const [profileImage, setProfileImage] = useState<string | null>(null);
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [confirmBorderColor, setConfirmBorderColor] = useState(PetHubColors.mediumGray);
  const [isLoading, setIsLoading] = useState(false);

  // Handle date selection for birthdate picker
  const handleDateChange = (event: any, selectedDate?: Date) => {
    setShowPicker(false);
    if (selectedDate) {
      const date = selectedDate.toISOString().split('T')[0];
      setBirthdate(date);
    }
  };

  // Handle profile image selection with size validation
  const handleImagePick = async () => {
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      quality: 0.8, // Reduce quality to help with file size
      allowsEditing: true,
      aspect: [1, 1], // Square crop for profile pictures
    });
    if (!result.canceled) {
      const asset = result.assets[0];
      // Check file size (15MB limit)
      if (asset.fileSize && asset.fileSize > 15 * 1024 * 1024) {
        Alert.alert('Error', 'Profile image exceeds 15MB. Please choose a smaller image.');
        return;
      }
      setProfileImage(asset.uri);
    }
  };

  // Handle user registration with comprehensive validation
  const handleRegister = async () => {
    console.log('Register button pressed'); 

    // Validate all required fields
    if (!fullName || !email || !birthdate || !gender || !password || !confirmPassword) {
      Alert.alert("Error", "Please fill in all fields");
      return;
    }

    // Password validation
    if (password !== confirmPassword) {
      Alert.alert("Error", "Passwords do not match");
      setConfirmBorderColor(PetHubColors.error);
      return;
    }

    if (password.length < 6) {
      Alert.alert("Error", "Password must be at least 6 characters long");
      return;
    }

    setIsLoading(true); 

    try {
      console.log('Starting registration...'); 
      console.log('API_URL:', API_URL);
      console.log('ENDPOINTS.AUTH.REGISTER:', ENDPOINTS.AUTH.REGISTER);
      console.log('Full URL:', `${API_URL}${ENDPOINTS.AUTH.REGISTER}`);
      
      let response;
      
      // Always use simple registration endpoint for now (FormData endpoint has issues on Render)
      console.log('Sending registration request...');
      console.log('Request URL:', `${API_URL}${ENDPOINTS.AUTH.REGISTER_SIMPLE}`);
      console.log('Request data:', {
        fullName: fullName.trim(),
        email: email.trim().toLowerCase(),
        birthdate,
        gender: gender.trim(),
        password: '***hidden***'
      });
      
      response = await apiClient.post(ENDPOINTS.AUTH.REGISTER_SIMPLE, {
        fullName: fullName.trim(),
        email: email.trim().toLowerCase(),
        birthdate,
        gender: gender.trim(),
        password,
      });
      
      console.log('Response received:', response.status, response.data);
      
      // Handle profile image upload after user creation
      if (profileImage && response.data?.userId) {
        console.log('Uploading profile image...');
        try {
          const formData = new FormData();
          formData.append('userId', response.data.userId.toString());
          
          // Create proper FormData file object for React Native
          const imageFile = {
            uri: profileImage,
            type: 'image/jpeg',
            name: 'profile.jpg',
          };
          
          formData.append('profileImage', imageFile as any);
          
          console.log('FormData created:', {
            userId: response.data.userId.toString(),
            hasImage: !!imageFile.uri,
            imageType: imageFile.type,
            imageName: imageFile.name
          });

          const imageResponse = await apiClient.post('/user/upload-profile-image', formData, {
            timeout: 90000, // Increase timeout to 90 seconds
          });
          
          console.log('Profile image uploaded successfully:', imageResponse.data);
        } catch (imageError) {
          console.error('Profile image upload failed:', imageError);
          console.error('Upload error details:', {
            message: imageError.message,
            code: imageError.code,
            status: imageError.response?.status,
            statusText: imageError.response?.statusText,
            data: imageError.response?.data,
            config: imageError.config
          });
          // Don't fail registration if image upload fails
          console.log('Continuing with registration - image upload failed but user created');
        }
      }

      console.log('Registration successful:', response.data);
      
      Alert.alert(
        "Registration Successful", 
        "Your account has been created successfully! You can now log in.",
        [
          {
            text: "OK",
            onPress: () => router.push('/auth/login')
          }
        ]
      );
    } catch (error: any) {
      console.error('Registration error:', error);
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
      
      // Handle different error types with user-friendly messages
      let message = 'Registration failed. Please try again.';
      
      if (error.code === 'ECONNABORTED') {
        message = 'Request timeout. Please check your internet connection and try again.';
      } else if (error.response?.status === 409) {
        message = 'An account with this email already exists. Please use a different email or try logging in.';
      } else if (error.response?.status === 400) {
        message = error.response.data?.message || 'Invalid registration data. Please check your inputs.';
      } else if (error.response?.data?.message) {
        message = error.response.data.message;
      } else if (error.message) {
        message = `Network error: ${error.message}`;
      }
      
      Alert.alert("Registration Failed", message);
    } finally {
      setIsLoading(false); 
    }
  };

  return (
    <KeyboardAvoidingView 
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      keyboardVerticalOffset={Platform.OS === 'ios' ? 0 : 20}
    >
      <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
        <ScrollView 
          contentContainerStyle={styles.scrollContainer}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        >
          {/* Back button */}
          <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
            <Text style={styles.backButtonText}>←</Text>
          </TouchableOpacity>

          {/* Logo and title */}
          <Image
            source={require('../../assets/images/logo.png')}
            style={styles.logo}
          />
          <Text style={styles.title}>Create Account</Text>
          <Text style={styles.subtitle}>Join the PetHub community</Text>

          {/* Registration form */}
          <View style={styles.form}>
            {/* Full Name */}
            <View style={styles.inputContainer}>
              <Text style={styles.label}>Full Name</Text>
              <TextInput
                style={styles.input}
                value={fullName}
                onChangeText={setFullName}
                placeholder="Enter your full name"
                placeholderTextColor={PetHubColors.textTertiary}
              />
            </View>

            {/* Email */}
            <View style={styles.inputContainer}>
              <Text style={styles.label}>Email Address</Text>
              <TextInput
                style={styles.input}
                value={email}
                onChangeText={setEmail}
                keyboardType="email-address"
                placeholder="Enter your email"
                placeholderTextColor={PetHubColors.textTertiary}
                autoCapitalize="none"
                autoComplete="email"
              />
            </View>

            {/* Birthdate */}
            <View style={styles.inputContainer}>
              <Text style={styles.label}>Birthdate</Text>
              <TouchableOpacity onPress={() => setShowPicker(true)} style={styles.input}>
                <Text style={[styles.inputText, !birthdate && styles.placeholderText]}>
                  {birthdate || 'Select your birthdate'}
                </Text>
              </TouchableOpacity>
              {showPicker && (
                <DateTimePicker
                  value={birthdate ? new Date(birthdate) : new Date()}
                  mode="date"
                  display="default"
                  onChange={handleDateChange}
                  maximumDate={new Date()}
                />
              )}
            </View>

            {/* Profile Image */}
            <View style={styles.inputContainer}>
              <Text style={styles.label}>Profile Image (Optional)</Text>
              <View style={styles.imagePicker}>
                <TouchableOpacity onPress={handleImagePick} style={styles.imageButton}>
                  <Text style={styles.imageButtonText}>Choose Image</Text>
                </TouchableOpacity>
                <Text style={styles.imageStatus}>
                  {profileImage ? '✓ Image selected' : 'No image selected'}
                </Text>
              </View>
            </View>

            {/* Gender */}
            <View style={styles.inputContainer}>
              <Text style={styles.label}>Gender</Text>
              <View style={styles.radioGroup}>
                {['Male', 'Female', 'Others'].map(option => (
                  <TouchableOpacity
                    key={option}
                    onPress={() => setGender(option)}
                    style={styles.radioOption}
                  >
                    <View style={styles.radioCircle}>
                      {gender === option && <View style={styles.radioSelected} />}
                    </View>
                    <Text style={styles.radioText}>{option}</Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>

            {/* Password */}
            <View style={styles.inputContainer}>
              <Text style={styles.label}>Password</Text>
              <TextInput
                style={styles.input}
                value={password}
                onChangeText={setPassword}
                secureTextEntry={!showPassword}
                placeholder="Enter your password (min. 6 characters)"
                placeholderTextColor={PetHubColors.textTertiary}
                autoComplete="password"
              />
            </View>

            {/* Confirm Password */}
            <View style={styles.inputContainer}>
              <Text style={styles.label}>Confirm Password</Text>
              <TextInput
                style={[styles.input, { borderColor: confirmBorderColor }]}
                value={confirmPassword}
                onChangeText={(text) => {
                  setConfirmPassword(text);
                  setConfirmBorderColor(PetHubColors.mediumGray);
                }}
                secureTextEntry={!showPassword}
                placeholder="Confirm your password"
                placeholderTextColor={PetHubColors.textTertiary}
              />
            </View>

            {/* Show/Hide Password toggle */}
            <TouchableOpacity 
              onPress={() => setShowPassword(!showPassword)} 
              style={styles.toggleContainer}
            >
              <Text style={styles.toggleText}>
                {showPassword ? '👁️ Hide Password' : '👁️ Show Password'}
              </Text>
            </TouchableOpacity>

            {/* Register button */}
            <TouchableOpacity 
              style={[styles.registerButton, isLoading && styles.buttonDisabled]} 
              onPress={handleRegister}
              disabled={isLoading}
            >
              <Text style={styles.registerButtonText}>
                {isLoading ? 'Creating Account...' : 'Create Account'}
              </Text>
            </TouchableOpacity>

            {/* Login link */}
            <View style={styles.loginContainer}>
              <Text style={styles.loginText}>Already have an account? </Text>
              <TouchableOpacity onPress={() => router.push('/auth/login')}>
                <Text style={styles.loginLink}>Sign in here</Text>
              </TouchableOpacity>
            </View>
          </View>
        </ScrollView>
      </TouchableWithoutFeedback>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: PetHubColors.white,
  },
  scrollContainer: {
    flexGrow: 1,
    paddingHorizontal: 20,
    paddingTop: 60,
    paddingBottom: 40,
  },
  backButton: {
    position: 'absolute',
    top: 20,
    left: 20,
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: PetHubColors.lightGray,
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 1,
  },
  backButtonText: {
    fontSize: 20,
    color: PetHubColors.darkGray,
    fontWeight: 'bold',
  },
  logo: {
    width: 100,
    height: 100,
    alignSelf: 'center',
    marginBottom: 20,
    marginTop: 20,
    resizeMode: 'contain',
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    color: PetHubColors.darkGray,
    textAlign: 'center',
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 16,
    color: PetHubColors.textSecondary,
    textAlign: 'center',
    marginBottom: 30,
  },
  form: {
    width: '100%',
  },
  inputContainer: {
    marginBottom: 20,
  },
  label: {
    fontSize: 16,
    fontWeight: '600',
    color: PetHubColors.darkGray,
    marginBottom: 8,
  },
  input: {
    height: 50,
    backgroundColor: PetHubColors.white,
    borderWidth: 2,
    borderColor: PetHubColors.mediumGray,
    borderRadius: 12,
    paddingHorizontal: 16,
    fontSize: 16,
    color: PetHubColors.darkGray,
    justifyContent: 'center',
  },
  inputText: {
    fontSize: 16,
    color: PetHubColors.darkGray,
  },
  placeholderText: {
    color: PetHubColors.textTertiary,
  },
  imagePicker: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  imageButton: {
    backgroundColor: PetHubColors.darkGray,
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 8,
  },
  imageButtonText: {
    color: PetHubColors.white,
    fontSize: 14,
    fontWeight: '600',
  },
  imageStatus: {
    fontSize: 14,
    color: PetHubColors.textSecondary,
    flex: 1,
    textAlign: 'right',
  },
  radioGroup: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  radioOption: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  radioCircle: {
    width: 20,
    height: 20,
    borderRadius: 10,
    borderWidth: 2,
    borderColor: PetHubColors.darkGray,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 8,
  },
  radioSelected: {
    width: 10,
    height: 10,
    backgroundColor: PetHubColors.darkGray,
    borderRadius: 5,
  },
  radioText: {
    fontSize: 16,
    color: PetHubColors.darkGray,
  },
  toggleContainer: {
    alignItems: 'flex-end',
    marginBottom: 30,
  },
  toggleText: {
    fontSize: 14,
    color: PetHubColors.darkGray,
    fontWeight: '600',
  },
  registerButton: {
    height: 50,
    backgroundColor: PetHubColors.darkGray,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 20,
  },
  registerButtonText: {
    color: PetHubColors.white,
    fontSize: 18,
    fontWeight: 'bold',
  },
  buttonDisabled: {
    opacity: 0.6,
  },
  loginContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
  },
  loginText: {
    fontSize: 16,
    color: PetHubColors.textSecondary,
  },
  loginLink: {
    fontSize: 16,
    color: PetHubColors.darkGray,
    fontWeight: '600',
    textDecorationLine: 'underline',
  },
});
