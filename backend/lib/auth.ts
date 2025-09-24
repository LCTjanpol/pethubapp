import jwt from 'jsonwebtoken';
import bcrypt from 'bcrypt';

const JWT_SECRET = process.env.JWT_SECRET || 'your_jwt_secret_key';

export const hashPassword = async (password: string): Promise<string> => {
  try {
    if (!password || password.length < 6) {
      throw new Error('Password must be at least 6 characters long');
    }
    return await bcrypt.hash(password, 10);
  } catch (error) {
    console.error('Password hashing error:', error);
    throw new Error('Failed to hash password');
  }
};

export const comparePassword = async (password: string, hashedPassword: string): Promise<boolean> => {
  try {
    if (!password || !hashedPassword) {
      return false;
    }
    return await bcrypt.compare(password, hashedPassword);
  } catch (error) {
    console.error('Password comparison error:', error);
    return false;
  }
};

export const generateToken = (userId: number, isAdmin: boolean): string => {
  try {
    if (!userId) {
      throw new Error('User ID is required for token generation');
    }
    return jwt.sign({ userId, isAdmin }, JWT_SECRET, { expiresIn: '24h' });
  } catch (error) {
    console.error('Token generation error:', error);
    throw new Error('Failed to generate token');
  }
};

export const verifyToken = (token: string): { userId: number; isAdmin: boolean } => {
  try {
    if (!token) {
      throw new Error('Token is required');
    }
    return jwt.verify(token, JWT_SECRET) as { userId: number; isAdmin: boolean };
  } catch (error) {
    console.error('Token verification error:', error);
    throw new Error('Invalid token');
  }
};