import React, { createContext, useContext, useEffect, useState, ReactNode, useCallback } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { router } from 'expo-router';
import { apiClient, ENDPOINTS } from '../config/api';

// Define the user type
interface User {
  id: number;
  fullName: string;
  email: string;
  profilePicture?: string;
  birthdate: string;
  gender: string;
  isAdmin?: boolean;
}

// Define the auth context type
interface AuthContextType {
  user: User | null;
  isAdmin: boolean;
  isLoading: boolean;
  isAuthenticated: boolean;
  login: (email: string, password: string) => Promise<boolean>;
  logout: () => Promise<void>;
  checkAuthStatus: () => Promise<void>;
}

// Create the auth context
const AuthContext = createContext<AuthContextType | undefined>(undefined);

// Auth provider component
interface AuthProviderProps {
  children: ReactNode;
}

export const AuthProvider: React.FC<AuthProviderProps> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [isAdmin, setIsAdmin] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [isAuthenticated, setIsAuthenticated] = useState(false);

  // Check authentication status on app startup
  const checkAuthStatus = useCallback(async () => {
    try {
      setIsLoading(true);
      
      // Check if token exists in AsyncStorage
      const token = await AsyncStorage.getItem('token');
      const storedUser = await AsyncStorage.getItem('user');
      
      if (!token || !storedUser) {
        // No stored credentials, user needs to login
        setIsAuthenticated(false);
        setUser(null);
        setIsAdmin(false);
        return;
      }

      // Verify token with server
      try {
        const response = await apiClient.get(ENDPOINTS.USER.PROFILE, {
          headers: { Authorization: `Bearer ${token}` },
        });

        // Token is valid, restore user session
        const userData = JSON.parse(storedUser);
        setUser(userData);
        setIsAdmin(userData.isAdmin || false);
        setIsAuthenticated(true);
        
        console.log('User session restored:', userData.fullName);
        
        // Don't navigate immediately - let the app handle routing
        // The index screen will check isAuthenticated and redirect appropriately
        
      } catch (error) {
        console.error('Token validation failed:', error);
        
        // Token is invalid, clear stored data
        await AsyncStorage.removeItem('token');
        await AsyncStorage.removeItem('user');
        setIsAuthenticated(false);
        setUser(null);
        setIsAdmin(false);
      }
      
    } catch (error) {
      console.error('Auth check error:', error);
      setIsAuthenticated(false);
      setUser(null);
      setIsAdmin(false);
    } finally {
      setIsLoading(false);
    }
  }, []); // Empty dependency array since this function doesn't depend on any props or state

  // Login function
  const login = async (email: string, password: string): Promise<boolean> => {
    try {
      const response = await apiClient.post(ENDPOINTS.AUTH.LOGIN, {
        email: email.trim().toLowerCase(),
        password,
      });

      const { token, isAdmin: adminStatus, user: userData } = response.data;

      // Store authentication data persistently
      await AsyncStorage.setItem('token', token);
      await AsyncStorage.setItem('user', JSON.stringify({ ...userData, isAdmin: adminStatus }));

      // Update state with complete user data including isAdmin
      const completeUserData = { ...userData, isAdmin: adminStatus };
      setUser(completeUserData);
      setIsAdmin(adminStatus);
      setIsAuthenticated(true);

      console.log('Login successful:', userData.fullName);
      console.log('Admin status:', adminStatus);
      console.log('Complete user data:', completeUserData);

      // Don't navigate here - let the index screen handle routing
      // This prevents routing conflicts and ensures proper navigation flow

      return true;
    } catch (error) {
      console.error('Login failed:', error);
      return false;
    }
  };

  // Logout function
  const logout = async () => {
    try {
      // Clear stored authentication data
      await AsyncStorage.removeItem('token');
      await AsyncStorage.removeItem('user');

      // Reset state
      setUser(null);
      setIsAdmin(false);
      setIsAuthenticated(false);

      console.log('User logged out successfully');

      // Navigate to login screen
      router.replace('/auth/login');
    } catch (error) {
      console.error('Logout error:', error);
    }
  };

  // Check auth status on mount
  useEffect(() => {
    checkAuthStatus();
  }, []);

  const value: AuthContextType = {
    user,
    isAdmin,
    isLoading,
    isAuthenticated,
    login,
    logout,
    checkAuthStatus,
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
};

// Custom hook to use auth context
export const useAuth = (): AuthContextType => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

export default AuthContext;
