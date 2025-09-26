// API Configuration
import axios from 'axios';

// Update this URL to match your backend server address
export const API_URL = "http://localhost:3000/api"; // <-- Local development (port 3000)

// Debug logging
console.log('🔧 API Configuration loaded:', {
  API_URL,
  timestamp: new Date().toISOString()
});

// Create axios instance with timeout and retry logic
const apiClient = axios.create({
  baseURL: API_URL, // Use API_URL as base
  timeout: 15000, // 15 second timeout
  headers: {
    'Content-Type': 'application/json',
  },
  // Add retry configuration
  maxRedirects: 5,
  validateStatus: function (status) {
    return status >= 200 && status < 300; // Accept all 2xx status codes
  },
});

// Add request interceptor for logging and FormData handling
apiClient.interceptors.request.use(
  (config) => {
    console.log(`API Request: ${config.method?.toUpperCase()} ${config.url}`);
    
    // Handle FormData requests - remove Content-Type header to let axios set it automatically
    if (config.data instanceof FormData) {
      console.log('📤 FormData request detected, removing Content-Type header and increasing timeout');
      delete config.headers['Content-Type'];
      // Increase timeout for file uploads
      config.timeout = 60000; // 60 seconds for file uploads
    }
    
    return config;
  },
  (error) => {
    console.error('API Request Error:', error);
    return Promise.reject(error);
  }
);

// Add response interceptor for error handling
apiClient.interceptors.response.use(
  (response) => {
    console.log(`API Response: ${response.status} ${response.config.url}`);
    return response;
  },
  (error) => {
    console.error('API Response Error:', error);
    console.error('Error details:', {
      message: error.message,
      code: error.code,
      status: error.response?.status,
      statusText: error.response?.statusText,
      data: error.response?.data,
      config: {
        url: error.config?.url,
        method: error.config?.method,
        baseURL: error.config?.baseURL,
        timeout: error.config?.timeout
      }
    });
    
    // Handle specific error types
    if (error.code === 'ECONNABORTED') {
      console.error('Request timeout - server may be down or network issue');
    } else if (error.code === 'NETWORK_ERROR') {
      console.error('Network error - check connection and server status');
    } else if (error.code === 'ENOTFOUND') {
      console.error('DNS resolution failed - check the IP address');
    } else if (error.code === 'ECONNREFUSED') {
      console.error('Connection refused - server not running or wrong port');
    }
    
    return Promise.reject(error);
  }
);

// Common API headers
export const getAuthHeaders = async () => {
  const AsyncStorage = await import('@react-native-async-storage/async-storage');
  const token = await AsyncStorage.default.getItem('token');
  
  return {
    'Content-Type': 'application/json',
    ...(token && { Authorization: `Bearer ${token}` }),
  };
};

// API endpoints (without /api prefix since apiClient uses API_URL as baseURL)
export const ENDPOINTS = {
  AUTH: {
    LOGIN: '/auth/login',
    REGISTER: '/auth/register',
    REGISTER_SIMPLE: '/auth/register-simple',
  },
  USER: {
    PROFILE: '/user/profile',
  },
  POST: {
    LIST: '/post',
    DETAIL: (id: string) => `/post/${id}`,
    LIKE: (id: string) => `/post/${id}`,
    DELETE: (id: string) => `/post/${id}`,
  },
  COMMENT: {
    LIST: '/comment',
    CREATE: '/comment',
    BY_POST: (postId: string) => `/comment?postId=${postId}`,
  },
  REPLY: {
    LIST: '/reply',
    CREATE: '/reply',
    BY_COMMENT: (commentId: string) => `/reply?commentId=${commentId}`,
  },
  PET: {
    LIST: '/pet',
    DETAIL: (id: string) => `/pet/${id}`,
    UPDATE: (id: string) => `/pet/${id}`,
    DELETE: (id: string) => `/pet/${id}`,
  },
  TASK: {
    LIST: '/task',
    DETAIL: (id: string) => `/task/${id}`,
    CREATE: '/task',
    UPDATE: (id: string) => `/task/${id}`,
    DELETE: (id: string) => `/task/${id}`,
  },
  MEDICAL_RECORD: {
    LIST: '/medical-record',
    DETAIL: (id: string) => `/medical-record/${id}`,
    CREATE: '/medical-record',
    UPDATE: (id: string) => `/medical-record/${id}`,
    DELETE: (id: string) => `/medical-record/${id}`,
  },
  SHOP: {
    LIST: '/shop',
    UPDATE: (id: string) => `/shop/${id}`,
    DELETE: (id: string) => `/shop?id=${id}`,
  },
  ADMIN: {
    USERS: '/admin/users',
    PETS: '/admin/pets',
    STATS: '/admin/stats',
    DELETE_USER: (id: string) => `/admin/users/${id}`,
    DELETE_PET: (id: string) => `/admin/pets/${id}`,
    DELETE_POST: (id: string) => `/admin/posts/${id}`,
  },
} as const;

export { apiClient }; 
