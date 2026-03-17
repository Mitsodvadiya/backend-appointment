import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { env } from '../../config/env';

export interface AuthRequest extends Request {
  user?: any; // You can type this properly based on your JWT payload
}

export const authenticateJWT = (req: AuthRequest, res: Response, next: NextFunction): void => {
  const authHeader = req.headers.authorization;

  if (authHeader) {
    const token = authHeader.split(' ')[1];
    jwt.verify(token, env.jwtSecret, (err, user) => {
      if (err) {
        res.status(403).json({ error: 'Token is invalid or expired' });
        return;
      }

      req.user = user;
      next();
    });
  } else {
    res.status(401).json({ error: 'Authorization header is missing' });
    return;
  }
};
