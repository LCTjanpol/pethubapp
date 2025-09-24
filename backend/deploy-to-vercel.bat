@echo off
echo 🚀 Deploying PetHub Backend to Vercel...
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
echo Please follow the prompts in the terminal...
vercel --prod

echo.
echo ✅ Deployment completed!
echo.
echo 📋 IMPORTANT: Don't forget to add environment variables in Vercel dashboard:
echo    1. Go to https://vercel.com/dashboard
echo    2. Select your project: mypethub-app
echo    3. Go to Settings > Environment Variables
echo    4. Add all the environment variables from the deployment guide
echo.
echo 📱 After deployment, update frontend/config/api.ts with your Vercel domain
pause
