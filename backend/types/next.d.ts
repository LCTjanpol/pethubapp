import type { NextApiRequest } from 'next';

export interface AuthenticatedRequest extends NextApiRequest {
  user?: {
    userId: number;
  };
}
