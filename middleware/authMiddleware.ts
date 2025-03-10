import { Request, Response, NextFunction } from 'express';

// Auth library
import { JwtAuthenticator } from '../libraries/authenticator/jwtAuthenticator';

declare global {
  namespace Express {
    interface Request {
      user?: { userId: string; email: string };
    }
  }
};

export const authenticateJWT = (req: Request, res: Response, next: NextFunction) => {
  const authHeader = req.headers.authorization;

  if (!authHeader) {
    return res.status(401).json({ error: 'Authentication required' });
  }

  const token = authHeader.split(' ')[1];

  try {
    const decoded = JwtAuthenticator.verifyToken(token);
    
    console.log("decoded token: ", decoded);

    req.user = decoded;

    next();
  } catch (error) {
    next(error);
  }
};