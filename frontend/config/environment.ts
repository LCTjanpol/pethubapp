// Environment Configuration
// This file manages different environment settings for development and production

export interface EnvironmentConfig {
  API_URL: string;
  DEBUG: boolean;
  ENV: 'development' | 'production';
}

// Development configuration (default)
const developmentConfig: EnvironmentConfig = {
  API_URL: "https://pethub-backend-8dfs.onrender.com/api", // Render backend
  DEBUG: true,
  ENV: 'development'
};

// Production configuration
const productionConfig: EnvironmentConfig = {
  API_URL: "https://pethub-backend-8dfs.onrender.com/api", // Same backend for now
  DEBUG: false,
  ENV: 'production'
};

// Get current environment (you can change this to 'production' when needed)
const currentEnv: 'development' | 'production' = 'development';

// Export the appropriate configuration
export const config: EnvironmentConfig = currentEnv === 'development' 
  ? developmentConfig 
  : productionConfig;

// Log current configuration
console.log('🔧 Environment Config:', {
  env: config.ENV,
  apiUrl: config.API_URL,
  debug: config.DEBUG
});
