# Backend Setup Guide

## Prerequisites
- Node.js (v16 or higher)
- PostgreSQL database
- npm or yarn

## Environment Configuration

1. Create a `.env` file in the backend directory with the following variables:

```env
# Database URL - Update with your actual PostgreSQL connection string
DATABASE_URL="postgresql://username:password@localhost:5432/pethub_db"

# JWT Secret for token generation (change this in production)
JWT_SECRET="your-super-secret-jwt-key-change-this-in-production"

# Optional: Node environment
NODE_ENV="development"
```

## Database Setup

1. Create a PostgreSQL database named `pethub_db`
2. Run the database migrations:
```bash
npx prisma migrate dev
```

3. Generate Prisma client:
```bash
npx prisma generate
```

## Installation and Running

1. Install dependencies:
```bash
npm install
```

2. Start the development server:
```bash
npm run dev
```

The server will start on `http://localhost:3000`

## API Endpoints

### Authentication
- `POST /api/auth/register` - User registration
- `POST /api/auth/login` - User login

### Required Fields for Registration
- `fullName` (string)
- `email` (string, valid email format)
- `password` (string, minimum 6 characters)
- `gender` (string)
- `birthdate` (string, valid date)
- `profileImage` (optional, file upload)

### Required Fields for Login
- `email` (string)
- `password` (string)

## Troubleshooting

### Common Issues

1. **Database Connection Error**
   - Ensure PostgreSQL is running
   - Check DATABASE_URL in .env file
   - Verify database exists

2. **JWT Secret Error**
   - Ensure JWT_SECRET is set in .env file

3. **CORS Issues**
   - Check that the frontend is using the correct API URL
   - Verify CORS headers in next.config.js

4. **File Upload Issues**
   - Ensure the uploads directory exists in public folder
   - Check file size limits (15MB max)

## Development Notes

- The backend uses Next.js API routes
- Authentication uses JWT tokens
- File uploads are handled with formidable
- Database operations use Prisma ORM
- Password hashing uses bcrypt 