import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  Image,
  Alert,
  StyleSheet,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
  Keyboard,
  TouchableWithoutFeedback
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { router } from 'expo-router';
import { apiClient, ENDPOINTS } from '../../config/api';
import { PetHubColors } from '../../constants/Colors';
import { useAuth } from '../../contexts/AuthContext';

const Login = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const { login } = useAuth();

  const handleLogin = async () => {
    // Basic validation with user-friendly error messages
    if (!email || !password) {
      Alert.alert('Error', 'Please enter both email and password.');
      return;
    }

    setIsLoading(true);

    try {
      console.log('Attempting login with:', email);
      
      // Test server connection first
      try {
        await apiClient.get('/health');
        console.log('Server connection test successful');
      } catch (healthError) {
        console.error('Server connection test failed:', healthError);
        Alert.alert('Connection Error', 'Cannot connect to server. Please check your network connection and try again.');
        setIsLoading(false);
        return;
      }
      
      // Use auth context login function
      const success = await login(email, password);
      
      if (!success) {
        Alert.alert('Login Failed', 'Invalid email or password. Please check your credentials and try again.');
      }
    } catch (error: any) {
      console.error('Login error details:', {
        message: error.message,
        code: error.code,
        response: error.response?.data,
        status: error.response?.status
      });
      
      // Show user-friendly error messages
      let message = 'Invalid email or password. Please try again.';
      
      if (error.code === 'ECONNABORTED') {
        message = 'Connection timeout. Please check your internet connection and try again.';
      } else if (error.code === 'NETWORK_ERROR') {
        message = 'Network error. Please check your connection and try again.';
      } else if (error.code === 'ENOTFOUND') {
        message = 'Cannot connect to server. Please check your network connection.';
      } else if (error.code === 'ECONNREFUSED') {
        message = 'Server connection refused. Please try again later.';
      } else if (error.response?.status === 401) {
        message = 'Invalid email or password. Please check your credentials.';
      } else if (error.response?.data?.message) {
        message = error.response.data.message;
      }
      
      Alert.alert('Login Failed', message);
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

          {/* Logo */}
          <Image
            source={require('../../assets/images/logo.png')}
            style={styles.logo}
            onError={(e) => console.log('Logo loading error:', e.nativeEvent.error)}
          />

          {/* Title */}
          <Text style={styles.title}>Welcome Back</Text>
          <Text style={styles.subtitle}>Sign in to your PetHub account</Text>

          {/* Email input */}
          <View style={styles.inputContainer}>
            <Text style={styles.label}>Email Address</Text>
            <TextInput
              value={email}
              onChangeText={setEmail}
              style={styles.input}
              placeholder="Enter your email"
              placeholderTextColor={PetHubColors.textTertiary}
              keyboardType="email-address"
              autoCapitalize="none"
              autoComplete="email"
            />
          </View>

          {/* Password input */}
          <View style={styles.inputContainer}>
            <Text style={styles.label}>Password</Text>
            <View style={styles.passwordContainer}>
              <TextInput
                value={password}
                onChangeText={setPassword}
                style={styles.passwordInput}
                secureTextEntry={!showPassword}
                placeholder="Enter your password"
                placeholderTextColor={PetHubColors.textTertiary}
                autoComplete="password"
              />
              <TouchableOpacity 
                onPress={() => setShowPassword(!showPassword)} 
                style={styles.toggleButton}
              >
                <Text style={styles.toggleText}>{showPassword ? 'Hide' : 'Show'}</Text>
              </TouchableOpacity>
            </View>
          </View>

          {/* Login button */}
          <TouchableOpacity 
            style={[styles.loginButton, isLoading && styles.buttonDisabled]} 
            onPress={handleLogin}
            disabled={isLoading}
          >
            <Text style={styles.loginButtonText}>
              {isLoading ? 'Signing In...' : 'Sign In'}
            </Text>
          </TouchableOpacity>

          {/* Register link */}
          <View style={styles.registerContainer}>
            <Text style={styles.registerText}>Don't have an account? </Text>
            <TouchableOpacity onPress={() => router.push('/auth/signup')}>
              <Text style={styles.registerLink}>Register here</Text>
            </TouchableOpacity>
          </View>
        </ScrollView>
      </TouchableWithoutFeedback>
    </KeyboardAvoidingView>
  );
};

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
    justifyContent: 'center',
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
    width: 120,
    height: 120,
    alignSelf: 'center',
    marginBottom: 30,
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
    marginBottom: 40,
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
  },
  passwordContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    height: 50,
    backgroundColor: PetHubColors.white,
    borderWidth: 2,
    borderColor: PetHubColors.mediumGray,
    borderRadius: 12,
    paddingHorizontal: 16,
  },
  passwordInput: {
    flex: 1,
    fontSize: 16,
    color: PetHubColors.darkGray,
  },
  toggleButton: {
    paddingLeft: 10,
  },
  toggleText: {
    color: PetHubColors.darkGray,
    fontSize: 14,
    fontWeight: '600',
  },
  loginButton: {
    height: 50,
    backgroundColor: PetHubColors.darkGray,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 20,
    marginBottom: 30,
  },
  loginButtonText: {
    color: PetHubColors.white,
    fontSize: 18,
    fontWeight: 'bold',
  },
  buttonDisabled: {
    opacity: 0.6,
  },
  registerContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
  },
  registerText: {
    fontSize: 16,
    color: PetHubColors.textSecondary,
  },
  registerLink: {
    fontSize: 16,
    color: PetHubColors.darkGray,
    fontWeight: '600',
    textDecorationLine: 'underline',
  },
});

export default Login;