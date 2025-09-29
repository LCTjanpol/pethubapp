# PetHub - Pet Care Management App

**Caring for Your Pet, Made Simple**

PetHub is a comprehensive pet care management application built with React Native (Expo) and Next.js, designed to help pet owners manage their pets' daily tasks, medical records, and connect with local pet services.

## 🐾 Features

### For Pet Owners
- **Pet Profile Management**: Add and manage multiple pet profiles with photos, details, and medical history
- **Social Feed**: Share pet photos with captions, like and comment on posts from the community
- **Task Management**: Create custom daily tasks with scheduling and reminders
- **Medical Records**: Track vaccinations, vet visits, medications, and health concerns
- **Smart Notifications**: Get reminders for tasks, scheduled activities, and social interactions
- **Pet Shop Locator**: Find nearby veterinary clinics, grooming services, and pet supply stores with address display
- **User Profile**: Modern profile management with statistics and account settings

### For Administrators
- **Comprehensive Dashboard**: Visual analytics with charts for users, pets, and posts
- **Shop Management**: Add pet-related businesses with map picker, working hours, and images
- **User Management**: View and manage user accounts
- **Content Moderation**: Monitor and manage posts and user-generated content

## 🏗️ Technology Stack

### Frontend
- **React Native** with **Expo** framework
- **Expo Router** for navigation
- **React Navigation** with bottom tabs
- **React Native Maps** for shop locations
- **Expo Image Picker** for photo handling
- **AsyncStorage** for local data persistence
- **Axios** for API communication

### Backend
- **Next.js** API routes
- **Prisma** ORM for database operations
- **JWT** authentication
- **Formidable** for file uploads
- **Render** deployment platform

### Database
- **Supabase** (PostgreSQL)
- **Prisma** for type-safe database queries
- **Supabase Storage** for file management

## 📱 App Structure

### User Flow
```
Login/Signup → Home (Social Feed) → Pets → Maps → Notifications → Profile
```

### Admin Flow
```
Login → Admin Dashboard → Shop Management → User Management → Analytics
```

## 📱 Frontend Installation & Usage

### Prerequisites
- **Node.js** (v16 or higher)
- **Expo CLI** (`npm install -g @expo/cli`)
- **Expo Go app** on your mobile device (download from App Store/Google Play)
- **Git** for cloning the repository

### Installation Steps

1. **Clone the repository**
   ```bash
   git clone https://github.com/LCTjanpol/pethubapp.git
   cd pethubapp
   ```

2. **Navigate to frontend directory**
   ```bash
   cd frontend
   ```

3. **Install dependencies**
   ```bash
   npm install
   ```

4. **Start the development server**
   ```bash
   npm start
   ```

5. **Run the app on your device**
   - **Option 1: Expo Go App (Recommended)**
     - Install "Expo Go" from App Store (iOS) or Google Play Store (Android)
     - Scan the QR code displayed in your terminal with the Expo Go app
     - The app will load on your device
   
   - **Option 2: iOS Simulator (Mac only)**
     - Press `i` in the terminal to open iOS Simulator
   
   - **Option 3: Android Emulator**
     - Press `a` in the terminal to open Android Emulator

### Development Commands

```bash
# Start development server
npm start

# Start with tunnel (for external access)
npm run start:tunnel

# Clear cache and restart
npm run clear

# Build for production (requires EAS CLI)
npx eas build --platform android
npx eas build --platform ios
```

### Local Development Setup

The frontend is configured to work with the backend deployed on Render. The API endpoints are automatically configured to connect to the production backend.

**Configuration Files:**
- `config/api.ts` - API client configuration
- `config/environment.ts` - Environment settings
- `app.json` - Expo app configuration
- `package.json` - Dependencies and scripts

### Troubleshooting

**Common Issues:**
1. **Metro bundler issues**: Run `npm run clear` to clear cache
2. **Network connection**: Ensure your device and computer are on the same network
3. **Expo Go not working**: Update to the latest version of Expo Go app
4. **Build errors**: Check that all dependencies are installed with `npm install`

**Need Help?**
- Check the `README-LOCAL-DEVELOPMENT.md` file in the frontend directory for detailed setup instructions
- Ensure your Node.js version is 16 or higher
- Make sure you have a stable internet connection

## 🎨 Design Philosophy

- **Clean & Modern UI**: White (#FFFFFF) and dark gray (#202021) color scheme
- **User-Friendly**: Designed for all ages, including older, non-tech-savvy users
- **Simple Navigation**: Essential buttons only with clear, intuitive interfaces
- **Professional Appearance**: Modern typography and consistent spacing

## 🌟 Key Features

- **Real-time Social Feed**: Share and interact with pet photos
- **Pet Profile Management**: Comprehensive pet information and medical records
- **Interactive Maps**: Find nearby pet shops and services
- **Admin Dashboard**: Analytics and content management
- **Cross-platform**: Works on both iOS and Android devices
- **Offline Support**: Local data storage with AsyncStorage

## 👥 Team

**Capstone Project Group 2**

## 📄 License

This project is developed as a capstone project for educational purposes.

---

**PetHub** - Making pet care simple, social, and smart! 🐕🐱