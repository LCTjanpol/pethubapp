@echo off
echo 🚀 PetHub Capstone - Quick Deploy Script
echo ========================================

echo.
echo 📝 Step 1: Setting up environment...
node setup-env.js

echo.
echo 📦 Step 2: Installing dependencies...
npm install

echo.
echo 🔧 Step 3: Generating Prisma client...
npx prisma generate

echo.
echo 🗄️ Step 4: Pushing database schema...
npx prisma db push

echo.
echo 🔍 Step 5: Testing database connection...
node test-db-connection.js

echo.
echo 🚀 Step 6: Deploying to Vercel...
vercel --prod

echo.
echo ✅ Deployment completed!
echo 📱 Don't forget to update frontend/config/api.ts with your Vercel domain
pause
