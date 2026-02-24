import { customAlphabet } from 'nanoid';

// Alphanumeric, uppercase only — easy for users to type manually
const ALPHABET = '0123456789ABCDEFGHJKLMNPQRSTUVWXYZ'; // excludes I and O to avoid confusion
const generate6 = customAlphabet(ALPHABET, 6);
const generate8 = customAlphabet(ALPHABET, 8);

/** 6-character code shown to users after a purchase to sync the receipt */
export function generateSyncCode(): string {
  return generate6();
}

/** 8-character code embedded in the QR code users show for repeat orders */
export function generateOrderCode(): string {
  return generate8();
}

/** Returns an expiry date N minutes from now */
export function expiresInMinutes(minutes: number): Date {
  return new Date(Date.now() + minutes * 60 * 1000);
}

export const SYNC_CODE_TTL =
  parseInt(process.env.SYNC_CODE_TTL_MINUTES ?? '10', 10);

export const ORDER_CODE_TTL =
  parseInt(process.env.ORDER_CODE_TTL_MINUTES ?? '30', 10);
