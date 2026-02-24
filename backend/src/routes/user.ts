import { Router, Request, Response } from 'express';
import { z } from 'zod';
import { prisma } from '../config/database';
import { requireUser, AuthenticatedUserRequest } from '../middleware/auth';
import {
  generateOrderCode,
  expiresInMinutes,
  ORDER_CODE_TTL,
} from '../services/codeGenerator';
import {
  decodeQRPayload,
  encodeOrderPayload,
  generateQRDataURL,
} from '../services/qrService';

const router = Router();

router.use(requireUser);

// ─── Profile ─────────────────────────────────────────────────────────────────

router.get('/profile', (req: Request, res: Response) => {
  const { user } = req as AuthenticatedUserRequest;
  res.json({ user });
});

// ─── Sync a receipt ───────────────────────────────────────────────────────────

/**
 * POST /api/user/sync
 * User claims a transaction using the sync code shown after purchase.
 * Accepts either a raw 6-char code or a JSON QR payload.
 */
const syncSchema = z.object({
  // Either a raw code "ABC123" or the full JSON payload from the QR
  code: z.string(),
});

router.post('/sync', async (req: Request, res: Response) => {
  const { user } = req as AuthenticatedUserRequest;
  const { code } = syncSchema.parse(req.body);

  // Accept both raw code and QR JSON payload
  let resolvedCode = code.trim().toUpperCase();
  const decoded = decodeQRPayload(code);
  if (decoded?.type === 'sync') {
    resolvedCode = decoded.code;
  }

  const syncCode = await prisma.syncCode.findUnique({
    where: { code: resolvedCode },
    include: { transaction: true },
  });

  if (!syncCode) {
    res.status(404).json({ error: 'Sync code not found' });
    return;
  }

  if (syncCode.usedAt) {
    res.status(410).json({ error: 'This code has already been used' });
    return;
  }

  if (syncCode.expiresAt < new Date()) {
    res.status(410).json({ error: 'Sync code has expired' });
    return;
  }

  if (syncCode.transaction.userId && syncCode.transaction.userId !== user.id) {
    res.status(409).json({ error: 'This transaction is already linked to another account' });
    return;
  }

  // Link transaction to user and mark code as used
  const [transaction] = await prisma.$transaction([
    prisma.transaction.update({
      where: { id: syncCode.transactionId },
      data: { userId: user.id, syncedAt: new Date() },
      include: { merchant: { select: { id: true, name: true, category: true } } },
    }),
    prisma.syncCode.update({
      where: { id: syncCode.id },
      data: { usedAt: new Date() },
    }),
  ]);

  res.json({ message: 'Receipt synced successfully', transaction });
});

// ─── Transaction History ──────────────────────────────────────────────────────

router.get('/transactions', async (req: Request, res: Response) => {
  const { user } = req as AuthenticatedUserRequest;
  const { merchantId } = req.query as { merchantId?: string };

  const transactions = await prisma.transaction.findMany({
    where: {
      userId: user.id,
      ...(merchantId ? { merchantId } : {}),
    },
    include: {
      merchant: { select: { id: true, name: true, category: true } },
    },
    orderBy: { createdAt: 'desc' },
  });

  res.json({ transactions });
});

/**
 * GET /api/user/transactions/merchants
 * Returns a deduplicated list of merchants the user has visited,
 * with their last visit date — useful for the "go back" flow.
 */
router.get('/transactions/merchants', async (req: Request, res: Response) => {
  const { user } = req as AuthenticatedUserRequest;

  // Get most recent transaction per merchant
  const rows = await prisma.transaction.groupBy({
    by: ['merchantId'],
    where: { userId: user.id },
    _max: { createdAt: true },
    _count: { id: true },
  });

  const merchantIds = rows.map((r) => r.merchantId);
  const merchants = await prisma.merchant.findMany({
    where: { id: { in: merchantIds } },
    select: { id: true, name: true, category: true },
  });

  const merchantMap = Object.fromEntries(merchants.map((m) => [m.id, m]));

  const result = rows.map((r) => ({
    merchant: merchantMap[r.merchantId],
    visitCount: r._count.id,
    lastVisit: r._max.createdAt,
  }));

  result.sort((a, b) => (b.lastVisit?.getTime() ?? 0) - (a.lastVisit?.getTime() ?? 0));

  res.json({ merchants: result });
});

/**
 * GET /api/user/transactions/frequent
 * Returns items the user orders most often, optionally filtered by merchant.
 */
router.get('/transactions/frequent', async (req: Request, res: Response) => {
  const { user } = req as AuthenticatedUserRequest;
  const { merchantId } = req.query as { merchantId?: string };

  const transactions = await prisma.transaction.findMany({
    where: {
      userId: user.id,
      ...(merchantId ? { merchantId } : {}),
    },
    select: { items: true },
  });

  // Aggregate item frequencies
  const freq: Record<string, { name: string; count: number; lastPrice: number }> = {};

  for (const tx of transactions) {
    const items = tx.items as Array<{ name: string; price: number; quantity: number; sku?: string }>;
    for (const item of items) {
      const key = item.sku ?? item.name.toLowerCase();
      if (!freq[key]) {
        freq[key] = { name: item.name, count: 0, lastPrice: item.price };
      }
      freq[key].count += item.quantity;
      freq[key].lastPrice = item.price;
    }
  }

  const sorted = Object.entries(freq)
    .map(([sku, data]) => ({ sku, ...data }))
    .sort((a, b) => b.count - a.count);

  res.json({ items: sorted });
});

// ─── Generate Repeat-Order QR ─────────────────────────────────────────────────

/**
 * POST /api/user/orders/generate
 * User selects items from their history. Returns a QR code to show the merchant.
 */
const generateOrderSchema = z.object({
  merchantId: z.string(),
  items: z
    .array(
      z.object({
        name: z.string(),
        price: z.number().nonnegative(),
        quantity: z.number().int().positive(),
        sku: z.string().optional(),
      }),
    )
    .min(1),
});

router.post('/orders/generate', async (req: Request, res: Response) => {
  const { user } = req as AuthenticatedUserRequest;
  const body = generateOrderSchema.parse(req.body);

  // Verify the merchant exists
  const merchant = await prisma.merchant.findUnique({ where: { id: body.merchantId } });
  if (!merchant) {
    res.status(404).json({ error: 'Merchant not found' });
    return;
  }

  const code = generateOrderCode();
  const expiresAt = expiresInMinutes(ORDER_CODE_TTL);
  const qrPayload = encodeOrderPayload(code, merchant.id);
  const qrDataUrl = await generateQRDataURL(qrPayload);

  await prisma.orderCode.create({
    data: {
      userId: user.id,
      merchantId: merchant.id,
      items: body.items,
      code,
      expiresAt,
    },
  });

  res.status(201).json({
    order: {
      code,
      merchantName: merchant.name,
      items: body.items,
      expiresAt,
      qrDataUrl,
      qrPayload,
    },
  });
});

export default router;
