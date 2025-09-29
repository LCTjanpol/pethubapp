# PetHub Frontend - Local Development Setup

This guide will help you run the PetHub frontend locally while keeping the backend on Render.

## Prerequisites

1. **Node.js** (v18 or higher)
2. **Expo CLI** installed globally: `npm install -g @expo/cli`
3. **Expo Go app** on your mobile device (iOS/Android)
4. **Backend running on Render** (already deployed)

## Quick Start

### 1. Install Dependencies
```bash
cd frontend
npm install
```

### 2. Start Development Server
```bash
# Option 1: Standard Expo Go (recommended for testing)
npm start

# Option 2: With tunnel (if local network issues)
npm run start:tunnel

# Option 3: Clear cache if issues
npm run clear
```

### 3. Connect with Expo Go
1. Open **Expo Go** app on your phone
2. Scan the QR code from the terminal
3. The app will load on your device

## Development Commands

```bash
# Start development server
npm start                 # Standard Expo Go
npm run start:dev         # Development client
npm run start:tunnel      # With tunnel (for network issues)
npm run clear            # Clear cache and start

# Platform specific
npm run android          # Start with Android emulator
npm run ios              # Start with iOS simulator
npm run web              # Start web version

# Utilities
npm run lint             # Run ESLint
```

## Configuration

### Backend Connection
The frontend is configured to connect to the Render backend:
- **API URL**: `https://pethub-backend-8dfs.onrender.com/api`
- **Configuration**: `frontend/config/environment.ts`

### Environment Settings
- **Development**: Debug logging enabled, connects to Render backend
- **Production**: Optimized for production builds

## Troubleshooting

### Common Issues

1. **"Metro bundler failed to start"**
   ```bash
   npm run clear
   npm start
   ```

2. **"Network request failed"**
   - Check if backend is running on Render
   - Try `npm run start:tunnel`

3. **"Expo Go can't connect"**
   - Make sure phone and computer are on same network
   - Try tunnel mode: `npm run start:tunnel`

4. **"Module not found" errors**
   ```bash
   rm -rf node_modules
   npm install
   ```

### Debug Mode
The app runs in debug mode by default. Check the console for:
- API request/response logs
- Error details
- Network status

## File Structure

```
frontend/
├── app/                 # App screens (expo-router)
├── components/         # Reusable components
├── config/            # Configuration files
│   ├── api.ts         # API client setup
│   └── environment.ts # Environment settings
├── assets/            # Images, fonts, etc.
├── hooks/             # Custom React hooks
├── contexts/          # React contexts
└── constants/         # App constants
```

## Backend Integration

The frontend connects to the Render backend for:
- User authentication
- Pet management
- Posts and comments
- Shop locations
- Admin functions

All API calls are logged in the console for debugging.

## Next Steps

1. **Test the app** with Expo Go
2. **Check all features** work with Render backend
3. **Report any issues** with specific error messages
4. **Ready for production** when everything works

## Support

If you encounter issues:
1. Check the console logs
2. Verify backend is running on Render
3. Try clearing cache: `npm run clear`
4. Use tunnel mode if network issues: `npm run start:tunnel`
