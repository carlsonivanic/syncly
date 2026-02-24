import QRCode from 'qrcode';

export interface SyncQRPayload {
  type: 'sync';
  code: string;
}

export interface OrderQRPayload {
  type: 'order';
  code: string;
  merchantId: string;
}

export type QRPayload = SyncQRPayload | OrderQRPayload;

/** Serialize a sync payload (embedded into QR or displayed as plain code) */
export function encodeSyncPayload(code: string): string {
  const payload: SyncQRPayload = { type: 'sync', code };
  return JSON.stringify(payload);
}

/** Serialize an order payload (user presents this QR to the merchant) */
export function encodeOrderPayload(code: string, merchantId: string): string {
  const payload: OrderQRPayload = { type: 'order', code, merchantId };
  return JSON.stringify(payload);
}

/** Parse a raw QR string back to a typed payload, or null if invalid */
export function decodeQRPayload(raw: string): QRPayload | null {
  try {
    const parsed = JSON.parse(raw) as QRPayload;
    if (parsed.type === 'sync' && parsed.code) return parsed;
    if (parsed.type === 'order' && parsed.code && parsed.merchantId) return parsed;
    return null;
  } catch {
    return null;
  }
}

/** Generate a base64 PNG data-URI for a QR code (used by dashboard/API responses) */
export async function generateQRDataURL(payload: string): Promise<string> {
  return QRCode.toDataURL(payload, {
    errorCorrectionLevel: 'M',
    margin: 2,
    width: 300,
  });
}
