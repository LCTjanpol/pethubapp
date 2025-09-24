/**
 * PetHub Color Scheme
 * Primary colors: white (#FFFFFF) and dark gray (#202021)
 * Supporting colors: light gray variants for UI elements
 */

// Primary color palette for PetHub
export const PetHubColors = {
  // Primary colors
  white: '#FFFFFF',
  darkGray: '#202021',
  
  // Supporting colors
  lightGray: '#F5F5F5',
  mediumGray: '#E0E0E0',
  borderGray: '#CCCCCC',
  textSecondary: '#666666',
  textTertiary: '#999999',
  
  // Status colors (minimal usage)
  success: '#4CAF50',
  error: '#F44336',
  warning: '#FF9800',
  
  // Transparent overlays
  overlay: 'rgba(32, 32, 33, 0.8)',
  lightOverlay: 'rgba(255, 255, 255, 0.9)',
};

// Legacy color support for existing components
const tintColorLight = '#202021';
const tintColorDark = '#FFFFFF';

export const Colors = {
  light: {
    text: PetHubColors.darkGray,
    background: PetHubColors.white,
    tint: tintColorLight,
    icon: PetHubColors.textSecondary,
    tabIconDefault: PetHubColors.textSecondary,
    tabIconSelected: tintColorLight,
  },
  dark: {
    text: PetHubColors.white,
    background: PetHubColors.darkGray,
    tint: tintColorDark,
    icon: PetHubColors.textTertiary,
    tabIconDefault: PetHubColors.textTertiary,
    tabIconSelected: tintColorDark,
  },
};
