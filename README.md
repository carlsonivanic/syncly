# Syncly

Receipt collection and repeat-order platform. Two sides — merchant and user — connected by QR codes and short sync codes.

## How it works

### Syncing a receipt
1. Customer completes a purchase at a merchant
2. Merchant's POS calls `POST /api/merchant/transactions` → receives a 6-character sync code + QR
3. Merchant shows the code/QR on screen or prints it on the receipt
4. Customer opens the Syncly app → Sync tab → enters code or scans QR
5. Receipt is saved to the customer's history, linked to that merchant

### Repeat ordering
1. Customer returns to a merchant they've visited before
2. Customer opens Syncly → taps the merchant → sees "Frequent" items from past orders
3. Customer selects items → app generates an order QR (30-minute TTL)
4. Merchant scans QR via dashboard or POS integration → order auto-fills
5. No re-explaining, no manual input

---

## Project structure

```
syncly/
├── backend/        Node.js + Express + TypeScript + Prisma + PostgreSQL
├── mobile/         React Native user app (iOS & Android)
├── dashboard/      Vite + React merchant web dashboard
└── docker-compose.yml
```

---

## Quick start (Docker)

```bash
cp backend/.env.example backend/.env
docker-compose up
```

- API:       http://localhost:3000
- Dashboard: http://localhost:5173

---

## Backend

### Setup (local)

```bash
cd backend
npm install
cp .env.example .env          # edit DATABASE_URL etc.
npm run db:migrate            # run Prisma migrations
npm run db:seed               # optional: seed demo data
npm run dev
```

### API reference

#### Auth
| Method | Path | Description |
|--------|------|-------------|
| POST | `/api/auth/user/register` | Register user (`phone`, `password`, optional `name`/`email`) |
| POST | `/api/auth/user/login` | Login user |
| POST | `/api/auth/merchant/register` | Register merchant (`name`, `email`, `password`, optional `category`) |
| POST | `/api/auth/merchant/login` | Login merchant → returns JWT + API key |

#### Merchant routes (auth: `X-Api-Key` header or `Bearer` JWT)
| Method | Path | Description |
|--------|------|-------------|
| GET  | `/api/merchant/profile` | Get merchant profile |
| POST | `/api/merchant/transactions` | Create transaction → returns sync code + QR |
| GET  | `/api/merchant/transactions` | List all transactions |
| GET  | `/api/merchant/transactions/:id` | Get single transaction |
| POST | `/api/merchant/orders/scan` | Scan user's order QR → returns pre-selected items |

**Create transaction payload:**
```json
{
  "total": 15.50,
  "currency": "USD",
  "items": [
    { "name": "Latte", "price": 5.50, "quantity": 2, "sku": "LATTE-L" },
    { "name": "Muffin", "price": 4.50, "quantity": 1 }
  ]
}
```

**Scan order QR payload:**
```json
{ "qrPayload": "{\"type\":\"order\",\"code\":\"ABC12345\",\"merchantId\":\"...\"}" }
```

#### User routes (auth: `Bearer` JWT)
| Method | Path | Description |
|--------|------|-------------|
| GET  | `/api/user/profile` | Get user profile |
| POST | `/api/user/sync` | Sync a receipt by code or QR payload |
| GET  | `/api/user/transactions` | All synced transactions (optional `?merchantId=`) |
| GET  | `/api/user/transactions/merchants` | Merchants visited, with visit count |
| GET  | `/api/user/transactions/frequent` | Frequently ordered items (optional `?merchantId=`) |
| POST | `/api/user/orders/generate` | Generate repeat-order QR |

---

## Mobile (React Native)

### Setup

```bash
cd mobile
npm install

# iOS
cd ios && pod install && cd ..
npx react-native run-ios

# Android
npx react-native run-android
```

Set the API URL in `src/services/api.ts` or via `.env`:
```
API_URL=http://localhost:3000
```

### QR scanning setup

The app uses `react-native-vision-camera` for QR scanning.

**iOS** — add to `Info.plist`:
```xml
<key>NSCameraUsageDescription</key>
<string>Syncly uses the camera to scan receipt and order QR codes.</string>
```

**Android** — add to `AndroidManifest.xml`:
```xml
<uses-permission android:name="android.permission.CAMERA" />
```

Then follow the [vision-camera setup guide](https://react-native-vision-camera.com/docs/guides).

### Screens

| Screen | Description |
|--------|-------------|
| Login / Register | Phone-number auth |
| Home (Merchants) | List of merchants the user has visited |
| Merchant History | Frequent items (selectable) + recent receipts |
| Order QR | QR code to show merchant for repeat order |
| Sync | Enter 6-char code or scan QR to claim a receipt |
| All Receipts | Full transaction history |

---

## Dashboard (Merchant Web)

```bash
cd dashboard
npm install
VITE_API_URL=http://localhost:3000 npm run dev
```

### Pages

| Page | Description |
|------|-------------|
| Login / Register | Merchant auth |
| Dashboard | Stats, API key, recent transactions |
| Transactions | Full list with expandable item details |
| New Transaction | Form to submit a purchase → displays sync code + QR |
| Scan Order QR | Paste/scan customer's order QR → auto-filled order |

---

## POS / external integration

Any POS system can integrate via the REST API using the merchant's API key:

```bash
# 1. Submit a transaction after checkout
curl -X POST https://api.syncly.app/api/merchant/transactions \
  -H "X-Api-Key: YOUR_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{
    "total": 12.50,
    "items": [{ "name": "Americano", "price": 4.50, "quantity": 1 }]
  }'

# Response includes sync.code and sync.qrDataUrl (base64 PNG)
# Display these on your POS screen or receipt printer

# 2. When a customer presents an order QR at the counter
curl -X POST https://api.syncly.app/api/merchant/orders/scan \
  -H "X-Api-Key: YOUR_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{ "qrPayload": "..." }'

# Response includes the customer's selected items
```

---

## Tech stack

| Layer | Stack |
|-------|-------|
| Backend API | Node.js, Express, TypeScript, Prisma ORM |
| Database | PostgreSQL |
| Mobile | React Native, React Navigation, Zustand, Axios |
| Dashboard | Vite, React, TypeScript, TailwindCSS, React Query |
| QR (mobile) | react-native-qrcode-svg (display), react-native-vision-camera (scan) |
| QR (backend) | qrcode (generate data URLs for dashboard/API) |
| Auth | JWT (users + merchants), API key (merchant POS) |
