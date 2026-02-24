import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { prisma } from '../config/database';

export interface AuthenticatedUserRequest extends Request {
  user: { id: string; phone: string; name: string | null };
}

export interface AuthenticatedMerchantRequest extends Request {
  merchant: { id: string; name: string; apiKey: string };
}

interface JwtPayload {
  sub: string;
  type: 'user' | 'merchant';
}

export function signToken(sub: string, type: 'user' | 'merchant'): string {
  return jwt.sign({ sub, type }, process.env.JWT_SECRET!, { expiresIn: '30d' });
}

export async function requireUser(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  const header = req.headers.authorization;
  if (!header?.startsWith('Bearer ')) {
    res.status(401).json({ error: 'Missing or invalid authorization header' });
    return;
  }

  try {
    const token = header.slice(7);
    const payload = jwt.verify(token, process.env.JWT_SECRET!) as JwtPayload;

    if (payload.type !== 'user') {
      res.status(401).json({ error: 'Invalid token type' });
      return;
    }

    const user = await prisma.user.findUnique({ where: { id: payload.sub } });
    if (!user) {
      res.status(401).json({ error: 'User not found' });
      return;
    }

    (req as AuthenticatedUserRequest).user = {
      id: user.id,
      phone: user.phone,
      name: user.name,
    };
    next();
  } catch {
    res.status(401).json({ error: 'Invalid or expired token' });
  }
}

export async function requireMerchant(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  // Merchants can auth via API key (for POS integration) or JWT (for dashboard)
  const apiKey = req.headers['x-api-key'] as string | undefined;
  const authHeader = req.headers.authorization;

  if (apiKey) {
    const merchant = await prisma.merchant.findUnique({ where: { apiKey } });
    if (!merchant) {
      res.status(401).json({ error: 'Invalid API key' });
      return;
    }
    (req as AuthenticatedMerchantRequest).merchant = {
      id: merchant.id,
      name: merchant.name,
      apiKey: merchant.apiKey,
    };
    next();
    return;
  }

  if (authHeader?.startsWith('Bearer ')) {
    try {
      const token = authHeader.slice(7);
      const payload = jwt.verify(token, process.env.JWT_SECRET!) as JwtPayload;

      if (payload.type !== 'merchant') {
        res.status(401).json({ error: 'Invalid token type' });
        return;
      }

      const merchant = await prisma.merchant.findUnique({ where: { id: payload.sub } });
      if (!merchant) {
        res.status(401).json({ error: 'Merchant not found' });
        return;
      }

      (req as AuthenticatedMerchantRequest).merchant = {
        id: merchant.id,
        name: merchant.name,
        apiKey: merchant.apiKey,
      };
      next();
      return;
    } catch {
      res.status(401).json({ error: 'Invalid or expired token' });
      return;
    }
  }

  res.status(401).json({ error: 'Authentication required (API key or Bearer token)' });
}
