import { Router, Request, Response } from 'express';
import { z } from 'zod';
import { prisma } from '../config/database';
import {
  requireMerchant,
  AuthenticatedMerchantRequest,
} from '../middleware/auth';
import {
  generateSyncCode,
  expiresInMinutes,
  SYNC_CODE_TTL,
} from '../services/codeGenerator';
import {
  encodeSyncPayload,
  decodeQRPayload,
  generateQRDataURL,
} from '../services/qrService';

const router = Router();

// All routes require merchant auth (API key or JWT)
router.use(requireMerchant);

// ─── Profile ─────────────────────────────────────────────────────────────────

router.get('/profile', (req: Request, res: Response) => {
  const { merchant } = req as AuthenticatedMerchantRequest;
  res.json({ merchant });
});

// ─── Transactions ─────────────────────────────────────────────────────────────

/**
 * POST /api/merchant/transactions
 * Merchant submits a completed purchase. Returns a sync code + QR that the
 * user (or merchant) can use to claim the receipt.
 */
const createTransactionSchema = z.object({
  total: z.number().positive(),
  currency: z.string().length(3).default('USD'),
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
  metadata: z.record(z.unknown()).optional(),
});

router.post('/transactions', async (req: Request, res: Response) => {
  const { merchant } = req as AuthenticatedMerchantRequest;
  const body = createTransactionSchema.parse(req.body);

  const code = generateSyncCode();
  const expiresAt = expiresInMinutes(SYNC_CODE_TTL);
  const qrPayload = encodeSyncPayload(code);
  const qrDataUrl = await generateQRDataURL(qrPayload);

  const transaction = await prisma.transaction.create({
    data: {
      merchantId: merchant.id,
      total: body.total,
      currency: body.currency,
      items: body.items,
      metadata: body.metadata ?? null,
      syncCode: {
        create: { code, expiresAt },
      },
    },
    include: { syncCode: true },
  });

  res.status(201).json({
    transaction: {
      id: transaction.id,
      total: transaction.total,
      currency: transaction.currency,
      items: transaction.items,
      createdAt: transaction.createdAt,
    },
    sync: {
      code,
      expiresAt,
      qrDataUrl,
      // Plain text payload — merchant's POS can render its own QR
      qrPayload,
    },
  });
});

router.get('/transactions', async (req: Request, res: Response) => {
  const { merchant } = req as AuthenticatedMerchantRequest;

  const transactions = await prisma.transaction.findMany({
    where: { merchantId: merchant.id },
    include: { user: { select: { id: true, name: true, phone: true } } },
    orderBy: { createdAt: 'desc' },
  });

  res.json({ transactions });
});

router.get('/transactions/:id', async (req: Request, res: Response) => {
  const { merchant } = req as AuthenticatedMerchantRequest;

  const transaction = await prisma.transaction.findFirst({
    where: { id: req.params.id, merchantId: merchant.id },
    include: { user: { select: { id: true, name: true, phone: true } } },
  });

  if (!transaction) {
    res.status(404).json({ error: 'Transaction not found' });
    return;
  }

  res.json({ transaction });
});

// ─── Order Scanning ───────────────────────────────────────────────────────────

/**
 * POST /api/merchant/orders/scan
 * Merchant scans the QR code the user presents at checkout.
 * Returns the pre-selected items so the POS can auto-populate.
 */
const scanOrderSchema = z.object({
  qrPayload: z.string(),
});

router.post('/orders/scan', async (req: Request, res: Response) => {
  const { merchant } = req as AuthenticatedMerchantRequest;
  const { qrPayload } = scanOrderSchema.parse(req.body);

  const decoded = decodeQRPayload(qrPayload);
  if (!decoded || decoded.type !== 'order') {
    res.status(400).json({ error: 'Invalid or unrecognized QR payload' });
    return;
  }

  if (decoded.merchantId !== merchant.id) {
    res.status(403).json({ error: 'This order code is for a different merchant' });
    return;
  }

  const orderCode = await prisma.orderCode.findUnique({
    where: { code: decoded.code },
    include: { user: { select: { id: true, name: true, phone: true } } },
  });

  if (!orderCode) {
    res.status(404).json({ error: 'Order code not found' });
    return;
  }

  if (orderCode.usedAt) {
    res.status(410).json({ error: 'Order code already used' });
    return;
  }

  if (orderCode.expiresAt < new Date()) {
    res.status(410).json({ error: 'Order code has expired' });
    return;
  }

  if (orderCode.merchantId !== merchant.id) {
    res.status(403).json({ error: 'This order code is for a different merchant' });
    return;
  }

  // Mark as used
  await prisma.orderCode.update({
    where: { id: orderCode.id },
    data: { usedAt: new Date() },
  });

  res.json({
    order: {
      id: orderCode.id,
      user: orderCode.user,
      items: orderCode.items,
      createdAt: orderCode.createdAt,
    },
  });
});

export default router;
