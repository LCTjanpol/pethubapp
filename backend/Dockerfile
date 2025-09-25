# Use the official Node.js 18 image as base
FROM node:18-alpine

# Set working directory
WORKDIR /app

# Copy package files
COPY package*.json ./

# Copy Prisma schema first
COPY prisma ./prisma/

# Install dependencies (including dev dependencies for build)
RUN npm ci --no-cache

# Ensure Supabase package is available
RUN npm list @supabase/supabase-js || npm install @supabase/supabase-js

# Generate Prisma client
RUN npx prisma generate

# Copy source code
COPY . .

# Build the application
RUN npm run build

# Expose port (Render will set PORT environment variable)
EXPOSE 3000

# Start the application
CMD ["npm", "start"]
