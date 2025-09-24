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
- **Pet Shop Locator**: Find nearby veterinary clinics, grooming services, and pet supply stores
- **User Profile**: Modern profile management with statistics and account settings

### For Administrators
- **Comprehensive Dashboard**: Visual analytics with charts for users, pets, and posts
- **Shop Management**: Add pet-related businesses with map picker, working hours, and images
- **User Management**: View and manage user accounts
- **Content Moderation**: Monitor and manage posts and user-generated content

## 🎨 Design Philosophy

- **Clean & Modern UI**: White (#FFFFFF) and dark gray (#202021) color scheme
- **User-Friendly**: Designed for all ages, including older, non-tech-savvy users
- **Simple Navigation**: Essential buttons only with clear, intuitive interfaces
- **Professional Appearance**: Modern typography and consistent spacing

## 🏗️ Technology Stack

### Frontend (React Native + Expo)
- **Framework**: Expo Router with React Native
- **Navigation**: React Navigation with bottom tabs
- **State Management**: React Hooks (useState, useEffect, useContext)
- **UI Components**: Custom components with consistent styling
- **Maps**: React Native Maps for shop locations
- **Charts**: React Native Chart Kit for analytics
- **Image Handling**: Expo Image Picker for photos
- **Storage**: AsyncStorage for local data persistence

### Backend (Next.js + Prisma + Supabase)
- **Framework**: Next.js API routes
- **Database**: Supabase (PostgreSQL)
- **ORM**: Prisma for type-safe database queries
- **Authentication**: JWT tokens with middleware
- **File Upload**: Formidable for image handling
- **Deployment**: Vercel-ready configuration

## 📱 App Structure

### User Flow
```
Login/Signup → Home (Social Feed) → Pets → Maps → Notifications → Profile
```

### Admin Flow
```
Login → Admin Dashboard → Shop Management → User Management → Analytics
```

## 🚀 Getting Started

### Prerequisites
- Node.js (v16 or higher)
- PostgreSQL database
- Expo CLI
- iOS Simulator or Android Emulator (or physical device)

### Backend Setup

1. **Navigate to backend directory**
   ```bash
   cd backend
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Set up environment variables**
   Create a `.env` file with:
   ```env
   DATABASE_URL="postgresql://username:password@localhost:5432/pethub_db"
   JWT_SECRET="your-super-secret-jwt-key"
   NODE_ENV="development"
   ```

4. **Set up database**
   ```bash
   npx prisma migrate dev
   npx prisma generate
   ```

5. **Start development server**
   ```bash
   npm run dev
   ```

### Frontend Setup

1. **Navigate to frontend directory**
   ```bash
   cd frontend
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Update API configuration**
   Edit `config/api.ts` and update the `API_URL` to match your backend server address.

4. **Start Expo development server**
   ```bash
   npm start
   ```

5. **Run on device/simulator**
   - Press `i` for iOS simulator
   - Press `a` for Android emulator
   - Scan QR code with Expo Go app on physical device

## 📊 Database Schema

### Core Models
- **User**: Profile information, authentication, admin status
- **Pet**: Pet details, owner relationship
- **Post**: Social media posts with images and captions
- **Comment**: Comments on posts with nested replies
- **Task**: Pet care tasks with scheduling
- **VaccinationRecord**: Medical records and vaccination tracking
- **Shop**: Pet service businesses with location and details

## 🔧 API Endpoints

### Authentication
- `POST /api/auth/register` - User registration
- `POST /api/auth/login` - User login

### Posts & Social
- `GET /api/post` - Fetch all posts with comments
- `POST /api/post` - Create new post with image and caption
- `POST /api/comment` - Add comment to post
- `POST /api/reply` - Reply to comment

### Pet Management
- `GET /api/pet` - Fetch user's pets
- `POST /api/pet` - Create new pet profile
- `PUT /api/pet/:id` - Update pet information
- `DELETE /api/pet/:id` - Delete pet

### Tasks & Medical
- `GET /api/task` - Fetch pet tasks
- `POST /api/task` - Create custom task
- `GET /api/vaccination` - Fetch medical records
- `POST /api/vaccination` - Add medical record

### Shop Locations
- `GET /api/shop` - Fetch all shops
- `POST /api/shop` - Add new shop (admin only)

### Admin
- `GET /api/admin/users` - Fetch all users
- `GET /api/admin/pets` - Fetch all pets
- `GET /api/admin/stats` - Get analytics data

## 🎯 Key Features Implemented

### Phase 1: UI/UX Enhancement ✅
- Applied PetHub color scheme across all screens
- Fixed keyboard overlay issues in login/signup
- Consistent typography and button styling

### Phase 2: Home Screen Social Features ✅
- Caption-based posts with image sharing
- Like/unlike functionality with visual feedback
- Comments and replies system
- Modern social media interface

### Phase 3: Enhanced Pet Management ✅
- Custom task creation with name, description, time, frequency
- Comprehensive medical records with vet info and medications
- Modern card-based pet profiles

### Phase 4: Smart Notifications ✅
- Task reminders with countdown timers
- Social notifications for likes and comments
- Scheduled task alerts
- Auto-refresh every minute

### Phase 5: Modern Profile Screen ✅
- User statistics (pets, posts, likes)
- Recent posts grid display
- Clean account information layout
- Logout confirmation modal

### Phase 6: Admin Shop Management ✅
- Map picker for precise location selection
- Working hours and days configuration
- Shop image upload functionality
- Enhanced shop input forms

### Phase 7: Enhanced Maps ✅
- Detailed shop information modals
- Shop type icons and color coding
- Working hours and days display
- Interactive map with custom markers

### Phase 8: Admin Dashboards ✅
- Visual analytics with pie charts
- User, pet, shop, and post management
- Delete functionality for all entities
- Real-time data visualization

### Phase 9: Final Polish ✅
- Removed test files and cleanup scripts
- Updated app icons and splash screen to use logo.png
- Consistent branding throughout
- Production-ready configuration

## 🔒 Security Features

- JWT-based authentication
- Input validation and sanitization
- File upload size limits
- Admin-only routes protection
- SQL injection prevention with Prisma

## 🌟 User Experience Features

- **Accessibility**: Large touch targets, clear typography
- **Performance**: Optimized images and lazy loading
- **Offline Support**: Local storage with AsyncStorage
- **Error Handling**: Graceful error messages and recovery
- **Loading States**: Visual feedback for all async operations

## 🚀 Deployment

### Backend (Vercel)
1. Connect GitHub repository to Vercel
2. Set environment variables in Vercel dashboard
3. Deploy automatically on push to main branch

### Frontend (Expo Build)
1. **Development**: Use Expo Go app
2. **Production**: Build APK/IPA for distribution
   ```bash
   expo build:android
   expo build:ios
   ```

### Database (Supabase)
1. Create Supabase project
2. Update DATABASE_URL in environment variables
3. Run migrations: `npx prisma db push`

## 👥 Team

**Capstone Project Group 2**

## 📄 License

This project is developed as a capstone project for educational purposes.

---

**PetHub** - Making pet care simple, social, and smart! 🐕🐱 