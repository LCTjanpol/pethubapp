# Vercel Deployment Guide for PetHub Backend

This guide will help you deploy your PetHub Next.js backend to Vercel with Supabase database integration.

## Prerequisites

1. **Vercel Account**: Sign up at [vercel.com](https://vercel.com)
2. **GitHub Repository**: Your code should be pushed to GitHub
3. **Supabase Project**: Database should be set up and running

## Step 1: Connect Repository to Vercel

1. **Login to Vercel Dashboard**
   - Go to [vercel.com/dashboard](https://vercel.com/dashboard)
   - Sign in with your GitHub account

2. **Import Project**
   - Click "New Project"
   - Select your `pethubapp` repository
   - Choose the `backend` folder as the root directory
   - Click "Import"

## Step 2: Configure Environment Variables

In the Vercel dashboard, go to your project settings and add these environment variables:

### Database Configuration
```
DATABASE_URL=postgres://postgres.wurlktzsxityrnpymysa:1R5gc3gpuJlnaZKO@aws-1-ap-southeast-2.pooler.supabase.com:6543/postgres?sslmode=require&supa=base-pooler.x
POSTGRES_URL=postgres://postgres.wurlktzsxityrnpymysa:1R5gc3gpuJlnaZKO@aws-1-ap-southeast-2.pooler.supabase.com:6543/postgres?sslmode=require&supa=base-pooler.x
POSTGRES_USER=postgres
POSTGRES_HOST=db.wurlktzsxityrnpymysa.supabase.co
POSTGRES_PASSWORD=1R5gc3gpuJlnaZKO
POSTGRES_DATABASE=postgres
POSTGRES_PRISMA_URL=postgres://postgres.wurlktzsxityrnpymysa:1R5gc3gpuJlnaZKO@aws-1-ap-southeast-2.pooler.supabase.com:6543/postgres?sslmode=require&pgbouncer=true
POSTGRES_URL_NON_POOLING=postgres://postgres.wurlktzsxityrnpymysa:1R5gc3gpuJlnaZKO@aws-1-ap-southeast-2.pooler.supabase.com:5432/postgres?sslmode=require
```

### Supabase Configuration
```
SUPABASE_URL=https://wurlktzsxityrnpymysa.supabase.co
NEXT_PUBLIC_SUPABASE_URL=https://wurlktzsxityrnpymysa.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Ind1cmxrdHpzeGl0eXJucHlteXNhIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTg3MjA3NTksImV4cCI6MjA3NDI5Njc1OX0.1FRRtxEu5RanrT-_z9l3BN2mxqL3ruiPjrNriqe89nM
SUPABASE_SERVICE_ROLE_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Ind1cmxrdHpzeGl0eXJucHlteXNhIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1ODcyMDc1OSwiZXhwIjoyMDc0Mjk2NzU5fQ.s4GMzS_i2FQb-k4QUbvMZcnKAXLQzKFpUFS2JYjy1uI
SUPABASE_JWT_SECRET=6ue+LH286I1QOKamRsMV8FOe4UqyBAUeQUcmlDpYI1ySBSCKOizu6EBX0QchdJkiTSsAJmGjY+Kd7OWv0zbF6Q==
```

### JWT Configuration
```
JWT_SECRET=your-super-secret-jwt-key-here
```

### Environment
```
NODE_ENV=production
```

## Step 3: Configure Build Settings

1. **Root Directory**: Set to `backend`
2. **Build Command**: `npm run vercel-build`
3. **Output Directory**: `.next` (default)
4. **Install Command**: `npm install`

## Step 4: Deploy

1. **Automatic Deployment**: Vercel will automatically deploy when you push to your main branch
2. **Manual Deployment**: Click "Deploy" in the Vercel dashboard

## Step 5: Database Migration

After deployment, you need to run database migrations:

1. **Install Vercel CLI**:
   ```bash
   npm i -g vercel
   ```

2. **Login to Vercel**:
   ```bash
   vercel login
   ```

3. **Link your project**:
   ```bash
   cd backend
   vercel link
   ```

4. **Run migrations**:
   ```bash
   vercel env pull .env.local
   npx prisma migrate deploy
   ```

## Step 6: Update Frontend API URL

Update your frontend configuration to use the Vercel deployment URL:

1. **Get your Vercel URL**: Found in the Vercel dashboard (e.g., `https://pethub-backend.vercel.app`)

2. **Update frontend config**: In `frontend/config/api.ts`, update the `API_URL`:
   ```typescript
   export const API_URL = 'https://your-vercel-app.vercel.app/api';
   ```

## Step 7: Test Deployment

1. **Health Check**: Visit `https://your-app.vercel.app/api/health`
2. **Test API Endpoints**: Use Postman or curl to test your API endpoints
3. **Database Connection**: Verify that your app can connect to Supabase

## Troubleshooting

### Common Issues

1. **Build Failures**:
   - Check that all dependencies are in `package.json`
   - Ensure TypeScript compilation passes
   - Verify Prisma schema is valid

2. **Database Connection Issues**:
   - Verify environment variables are set correctly
   - Check Supabase connection string format
   - Ensure database is accessible from Vercel

3. **API Route Issues**:
   - Check file structure in `pages/api/`
   - Verify export syntax for API handlers
   - Check Vercel function logs

### Useful Commands

```bash
# Check deployment logs
vercel logs

# Redeploy
vercel --prod

# Check environment variables
vercel env ls
```

## Production Checklist

- [ ] Environment variables configured
- [ ] Database migrations applied
- [ ] API endpoints tested
- [ ] Frontend updated with new API URL
- [ ] Error handling implemented
- [ ] Logging configured
- [ ] Performance monitoring set up

## Support

For issues with Vercel deployment:
- [Vercel Documentation](https://vercel.com/docs)
- [Vercel Community](https://github.com/vercel/vercel/discussions)
- [Supabase Documentation](https://supabase.com/docs)

---
*Last updated: January 2025*
