# PetHub Capstone - Deployment Guide

## 🚀 Quick Setup for New Supabase Database

Your project has been configured with the new Supabase database. Follow these steps to deploy:

### 1. Environment Setup
```bash
# Navigate to backend directory
cd backend

# Create .env file with new database credentials
node setup-env.js

# Install dependencies
npm install

# Generate Prisma client (if permission issues, run as administrator)
npx prisma generate

# Push database schema to Supabase
npx prisma db push
```

### 2. Test Database Connection
```bash
# Test the database connection
node test-db-connection.js
```

### 3. Deploy to Vercel
```bash
# Install Vercel CLI if not already installed
npm i -g vercel

# Deploy to Vercel
vercel --prod
```

### 4. Update Frontend Configuration
After deployment, update the frontend API URL:
1. Go to `frontend/config/api.ts`
2. Replace `https://mypethub-app.vercel.app/api` with your actual Vercel domain
3. The domain will be shown after running `vercel --prod`

## 🔧 Environment Variables

Your `.env` file contains:
- **DATABASE_URL**: Main connection string for Prisma (with connection pooling)
- **POSTGRES_URL_NON_POOLING**: For migrations and direct connections
- **SUPABASE_URL**: Your Supabase project URL
- **SUPABASE_ANON_KEY**: Public anonymous key
- **SUPABASE_SERVICE_ROLE_KEY**: Service role key for admin operations
- **JWT_SECRET**: For authentication tokens

## 📊 Database Schema

The following tables will be created:
- **User**: User accounts and profiles
- **Pet**: Pet profiles and information
- **Post**: Social media posts
- **Comment**: Comments on posts
- **Reply**: Replies to comments
- **Task**: Pet care tasks and reminders
- **MedicalRecord**: Veterinary records
- **Shop**: Pet-related shops and services

## 🐛 Troubleshooting

### Prisma Permission Issues (Windows)
If you get permission errors with Prisma:
1. Run PowerShell as Administrator
2. Delete `node_modules` folder
3. Run `npm install` again
4. Run `npx prisma generate`

### Database Connection Issues
1. Check your `.env` file has correct credentials
2. Verify Supabase project is active
3. Test connection with `node test-db-connection.js`

### Vercel Deployment Issues
1. Make sure all environment variables are set in Vercel dashboard
2. Check build logs in Vercel dashboard
3. Ensure `vercel.json` configuration is correct

## 📱 Frontend Configuration

After backend deployment:
1. Update `frontend/config/api.ts` with your Vercel domain
2. Test API endpoints from the mobile app
3. Verify authentication flow works

## 🔐 Security Notes

- Never commit `.env` files to version control
- Use environment variables in Vercel dashboard for production
- Keep service role keys secure
- Regularly rotate JWT secrets

## 📞 Support

If you encounter issues:
1. Check the console logs for detailed error messages
2. Verify all environment variables are correctly set
3. Test database connection independently
4. Check Vercel deployment logs
