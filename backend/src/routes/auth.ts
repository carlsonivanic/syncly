import { Router, Request, Response } from 'express';
import bcrypt from 'bcryptjs';
import { z } from 'zod';
import { prisma } from '../config/database';
import { signToken } from '../middleware/auth';

const router = Router();

// ─── User Auth ───────────────────────────────────────────────────────────────

const registerUserSchema = z.object({
  phone: z.string().min(7).max(20),
  name: z.string().min(1).max(100).optional(),
  email: z.string().email().optional(),
  password: z.string().min(6),
});

router.post('/user/register', async (req: Request, res: Response) => {
  const body = registerUserSchema.parse(req.body);

  const existing = await prisma.user.findUnique({ where: { phone: body.phone } });
  if (existing) {
    res.status(409).json({ error: 'Phone number already registered' });
    return;
  }

  const passwordHash = await bcrypt.hash(body.password, 10);
  const user = await prisma.user.create({
    data: {
      phone: body.phone,
      name: body.name ?? null,
      email: body.email ?? null,
      passwordHash,
    },
    select: { id: true, phone: true, name: true, email: true, createdAt: true },
  });

  const token = signToken(user.id, 'user');
  res.status(201).json({ token, user });
});

const loginUserSchema = z.object({
  phone: z.string(),
  password: z.string(),
});

router.post('/user/login', async (req: Request, res: Response) => {
  const body = loginUserSchema.parse(req.body);

  const user = await prisma.user.findUnique({ where: { phone: body.phone } });
  if (!user) {
    res.status(401).json({ error: 'Invalid phone or password' });
    return;
  }

  const valid = await bcrypt.compare(body.password, user.passwordHash);
  if (!valid) {
    res.status(401).json({ error: 'Invalid phone or password' });
    return;
  }

  const token = signToken(user.id, 'user');
  res.json({
    token,
    user: { id: user.id, phone: user.phone, name: user.name, email: user.email },
  });
});

// ─── Merchant Auth ───────────────────────────────────────────────────────────

const registerMerchantSchema = z.object({
  name: z.string().min(1).max(100),
  email: z.string().email(),
  category: z.string().max(60).optional(),
  password: z.string().min(6),
});

router.post('/merchant/register', async (req: Request, res: Response) => {
  const body = registerMerchantSchema.parse(req.body);

  const existing = await prisma.merchant.findUnique({ where: { email: body.email } });
  if (existing) {
    res.status(409).json({ error: 'Email already registered' });
    return;
  }

  const passwordHash = await bcrypt.hash(body.password, 10);
  const merchant = await prisma.merchant.create({
    data: {
      name: body.name,
      email: body.email,
      category: body.category ?? null,
      passwordHash,
    },
    select: { id: true, name: true, email: true, category: true, apiKey: true, createdAt: true },
  });

  const token = signToken(merchant.id, 'merchant');
  res.status(201).json({ token, merchant });
});

const loginMerchantSchema = z.object({
  email: z.string().email(),
  password: z.string(),
});

router.post('/merchant/login', async (req: Request, res: Response) => {
  const body = loginMerchantSchema.parse(req.body);

  const merchant = await prisma.merchant.findUnique({ where: { email: body.email } });
  if (!merchant) {
    res.status(401).json({ error: 'Invalid email or password' });
    return;
  }

  const valid = await bcrypt.compare(body.password, merchant.passwordHash);
  if (!valid) {
    res.status(401).json({ error: 'Invalid email or password' });
    return;
  }

  const token = signToken(merchant.id, 'merchant');
  res.json({
    token,
    merchant: {
      id: merchant.id,
      name: merchant.name,
      email: merchant.email,
      category: merchant.category,
      apiKey: merchant.apiKey,
    },
  });
});

export default router;
