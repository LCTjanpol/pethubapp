import React, { useEffect, useRef } from 'react';
import { View, Text, Image, StyleSheet, TouchableOpacity, ActivityIndicator } from 'react-native';
import { PetHubColors } from '../constants/Colors';
import { useAuth } from '../contexts/AuthContext';
import { router } from 'expo-router';

const IndexScreen = () => {
  const { isLoading, isAuthenticated, checkAuthStatus, user } = useAuth();
  const hasNavigated = useRef(false); // Flag to prevent multiple navigation attempts

  // Check authentication status on component mount
  useEffect(() => {
    checkAuthStatus();
  }, []); // Remove checkAuthStatus from dependencies to prevent infinite loop

  // Handle navigation when authentication status changes
  useEffect(() => {
    if (isAuthenticated && user) {
      // Reset navigation flag when user changes to allow re-navigation
      hasNavigated.current = false;
      
      console.log('=== ROUTING DECISION ===');
      console.log('User:', user.fullName);
      console.log('isAdmin:', user.isAdmin);
      console.log('typeof isAdmin:', typeof user.isAdmin);
      console.log('========================');
      
      // Small delay to ensure routes are fully loaded
      setTimeout(() => {
        if (!hasNavigated.current) {
          hasNavigated.current = true; // Set flag to prevent multiple navigation attempts
          
          try {
            if (user.isAdmin === true) {
              console.log('✅ ADMIN USER - Navigating to admin dashboard');
              router.replace('/admin/dashboard');
            } else {
              console.log('✅ REGULAR USER - Navigating to user tabs');
              // Navigate to tabs layout - default to home tab
              router.replace('/(tabs)/home');
            }
          } catch (error) {
            console.error('❌ Navigation error:', error);
            hasNavigated.current = false; // Reset flag on error
            // Fallback navigation if there's an error
            try {
              router.replace('/auth/login');
            } catch (fallbackError) {
              console.error('❌ Fallback navigation failed:', fallbackError);
            }
          }
        }
      }, 100);
    }
  }, [isAuthenticated, user]);

  // Show loading screen while checking authentication
  if (isLoading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={PetHubColors.darkGray} />
        <Text style={styles.loadingText}>Loading...</Text>
      </View>
    );
  }

  // If user is authenticated, show loading while redirecting
  if (isAuthenticated) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={PetHubColors.darkGray} />
        <Text style={styles.loadingText}>Redirecting...</Text>
      </View>
    );
  }

  return (
    <View style={{ flex: 1 }}>
      <View style={styles.container}>
        <Image
          source={require('../assets/images/logo.png')}
          style={styles.logo}
          onError={(e) => console.log('Image loading error:', e.nativeEvent.error)}
          onLoad={() => console.log('Image loaded successfully')}
        />
        <Text style={styles.welcomeText}>Welcome to PetHub</Text>
        <Text style={styles.tagline}>Caring for Your Pet, Made Simple</Text>

        <TouchableOpacity
          style={styles.getStartedButton}
          onPress={() => router.push('/auth/login')}
        >
          <Text style={styles.buttonText}>Get Started</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.registerButton}
          onPress={() => router.push('/auth/signup')}
        >
          <Text style={styles.buttonText}>Register</Text>
        </TouchableOpacity>
      </View>
      <View style={styles.footer}>
        <Text style={styles.footerText}>Capstone Project Group 2</Text>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: PetHubColors.white,
  },
  loadingText: {
    marginTop: 16,
    fontSize: 16,
    color: PetHubColors.darkGray,
  },
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: PetHubColors.white,
    paddingHorizontal: 20,
  },
  logo: {
    width: 200,
    height: 200,
    marginBottom: 40,
  },
  welcomeText: {
    fontSize: 28,
    fontWeight: 'bold',
    color: PetHubColors.darkGray,
    marginBottom: 10,
  },
  tagline: {
    fontSize: 16,
    color: PetHubColors.textSecondary,
    marginBottom: 60,
    fontStyle: 'italic',
  },
  getStartedButton: {
    backgroundColor: PetHubColors.darkGray,
    borderRadius: 30,
    paddingVertical: 15,
    paddingHorizontal: 80,
    marginBottom: 15,
    width: '80%',
    alignItems: 'center',
  },
  registerButton: {
    backgroundColor: PetHubColors.darkGray,
    borderRadius: 30,
    paddingVertical: 15,
    paddingHorizontal: 80,
    width: '80%',
    alignItems: 'center',
  },
  buttonText: {
    color: PetHubColors.white,
    fontSize: 18,
    fontWeight: 'bold',
  },
  footer: {
    position: 'absolute',
    bottom: 10,
    left: 0,
    right: 0,
    alignItems: 'center',
  },
  footerText: {
    color: PetHubColors.textTertiary,
    fontSize: 14,
    fontWeight: '500',
  },
});

export default IndexScreen;