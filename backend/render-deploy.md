# 🚀 Render Deployment Guide for PetHub Backend

## Prerequisites
- GitHub repository with backend code
- Supabase database already set up
- Render account (free tier available)

## Step-by-Step Deployment

### 1. Create Render Account
1. Go to [render.com](https://render.com)
2. Sign up with GitHub
3. Authorize Render to access your repositories

### 2. Create New Web Service
1. Click "New +" → "Web Service"
2. Connect your GitHub repository
3. Select the repository containing your backend

### 3. Configure Service Settings
- **Name**: `pethub-backend`
- **Environment**: `Node`
- **Branch**: `main` (or your default branch)
- **Root Directory**: `backend`
- **Build Command**: `npm install && npx prisma generate && npm run build`
- **Start Command**: `npm start`

### 4. Environment Variables
Add these environment variables in Render dashboard:

```
DATABASE_URL=postgres://postgres.kjwbsldbaepwwqsxanok:jdXcUx85kYvbl4XJ@aws-1-ap-southeast-2.pooler.supabase.com:6543/postgres?sslmode=require&pgbouncer=true
POSTGRES_URL=postgres://postgres.kjwbsldbaepwwqsxanok:jdXcUx85kYvbl4XJ@aws-1-ap-southeast-2.pooler.supabase.com:6543/postgres?sslmode=require&supa=base-pooler.x
POSTGRES_USER=postgres
POSTGRES_HOST=db.kjwbsldbaepwwqsxanok.supabase.co
POSTGRES_PASSWORD=jdXcUx85kYvbl4XJ
POSTGRES_DATABASE=postgres
POSTGRES_PRISMA_URL=postgres://postgres.kjwbsldbaepwwqsxanok:jdXcUx85kYvbl4XJ@aws-1-ap-southeast-2.pooler.supabase.com:6543/postgres?sslmode=require&pgbouncer=true
POSTGRES_URL_NON_POOLING=postgres://postgres.kjwbsldbaepwwqsxanok:jdXcUx85kYvbl4XJ@aws-1-ap-southeast-2.pooler.supabase.com:5432/postgres?sslmode=require
SUPABASE_URL=https://kjwbsldbaepwwqsxanok.supabase.co
NEXT_PUBLIC_SUPABASE_URL=https://kjwbsldbaepwwqsxanok.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imtqd2JzbGRiYWVwd3dxc3hhbm9rIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTg3NTA1MjUsImV4cCI6MjA3NDMyNjUyNX0.puz00qJ1SlZdnj_nsGd9hzU61EV8b2FPaZgFCgz9x9E
SUPABASE_SERVICE_ROLE_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imtqd2JzbGRiYWVwd3dxc3hhbm9rIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1ODc1MDUyNSwiZXhwIjoyMDc0MzI2NTI1fQ.yddgRiC5Y0hKVnZV5DhR7A6SZX1nxY4zt37_8wdABj0
SUPABASE_JWT_SECRET=yQbpaR8EIYdGzhMZ/v38CHrvd2QNnolC2Q0Uf9jyrIZcST+d1vWGZzHCZv6uMWghyc20LD+IMTM2yfWnDmeWrg==
JWT_SECRET=yQbpaR8EIYdGzhMZ/v38CHrvd2QNnolC2Q0Uf9jyrIZcST+d1vWGZzHCZv6uMWghyc20LD+IMTM2yfWnDmeWrg==
NODE_ENV=production
NEXTAUTH_URL=https://your-render-app.onrender.com
NEXTAUTH_SECRET=yQbpaR8EIYdGzhMZ/v38CHrvd2QNnolC2Q0Uf9jyrIZcST+d1vWGZzHCZv6uMWghyc20LD+IMTM2yfWnDmeWrg==
```

### 5. Deploy
1. Click "Create Web Service"
2. Wait for deployment (5-10 minutes)
3. Note your app URL (e.g., `https://pethub-backend.onrender.com`)

### 6. Update Frontend
Update `frontend/config/api.ts`:
```typescript
export const API_URL = "https://your-render-app.onrender.com/api";
```

### 7. Test Deployment
1. Visit your Render app URL
2. Test API endpoints: `https://your-app.onrender.com/api/health`
3. Check logs in Render dashboard

## Troubleshooting

### Common Issues:
1. **Build Fails**: Check Node version compatibility
2. **Database Connection**: Verify environment variables
3. **Prisma Issues**: Ensure `prisma generate` runs in build
4. **CORS Errors**: Check Next.js config

### Useful Commands:
- Check logs: Render dashboard → Logs tab
- Restart service: Render dashboard → Manual Deploy
- Environment variables: Render dashboard → Environment tab

## Cost
- **Free Tier**: 750 hours/month (enough for development)
- **Starter Plan**: $7/month (recommended for production)
- **No function limits** (unlike Vercel Hobby plan)
