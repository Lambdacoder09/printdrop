# PrintDrop (Multi-Tenant Document Printing & Transfer Platform)

A cloud-managed document printing and transfer platform engineered for cyber cafes, photocopy centers, and document service counters in India.

Customers scan a counter QR code, upload documents from their phone, and receive an instant 4-digit token. The shopkeeper previews documents on a Windows desktop application, pushes a calculated bill with a direct UPI payment QR code or cash option, and prints directly to installed printers.

---

## Architecture Overview

```
Print-shop/
├── apps/
│   ├── api/             # NestJS Cloud API + Socket.IO Gateway + Prisma + S3/MinIO
│   ├── customer-web/    # Vite + React 19 + Tailwind CSS (Mobile QR Customer Upload & Live Tracking)
│   ├── desktop/         # Electron + React 19 + Tailwind CSS (Shopkeeper Windows Workstation)
│   └── admin-web/       # Vite + React 19 + Tailwind CSS (Central Admin Portal)
├── packages/
│   └── shared/          # Shared TypeScript models, Zod validation schemas, and events
└── docker/              # Docker Compose (PostgreSQL 17, Valkey/Redis, MinIO, Caddy)
```

---

## Applications & Ports

| Application | Port | Description |
| ----------- | ---- | ----------- |
| **Cloud API & WebSockets** | `http://localhost:3000` | REST API, WebSocket gateway, PDF page counter, UPI payment generator |
| **Customer Web** | `http://localhost:5173/shop/:slug` | Mobile-first upload & live order status tracking |
| **Shopkeeper Desktop** | `http://localhost:5175` | Electron Windows application for job queue, billing, and printing |
| **Central Admin Console** | `http://localhost:5174` | Shop accounts, device authorization reset, and system metrics |

---

## Quick Start (Development)

### 1. Install Dependencies
```bash
pnpm install
```

### 2. Run All Applications Simultaneously
```bash
pnpm dev
```

Or run individual applications:
```bash
pnpm --filter @printdrop/api dev           # Start NestJS Cloud API
pnpm --filter @printdrop/customer-web dev  # Start Customer Web
pnpm --filter @printdrop/desktop dev       # Start Desktop App Renderer
pnpm --filter @printdrop/admin-web dev     # Start Admin Portal
```

---

## Docker Infrastructure (Optional / Production)

For local PostgreSQL 17, Redis/Valkey, and MinIO S3 object storage:
```bash
docker compose -f docker/docker-compose.yml up -d
```
*Note: The API includes an automatic resilient local disk fallback in `./uploads` and in-memory mock data so you can develop immediately without running Docker.*

---

## Complete End-to-End Test Walkthrough

1. **Open the Desktop Counter:**
   - Navigate to `http://localhost:5175` (or launch via Electron: `pnpm --filter @printdrop/desktop electron:start`).
   - Notice the shop name, active certificate badge, and counter rate card.
   - Click **Counter QR Stand** to view or print the customer desk stand poster.

2. **Open Customer Upload Page:**
   - In your mobile browser or second browser tab, open:
     `http://localhost:5173/shop/shree-ganesh-xerox`
   - Enter a customer name (e.g. *Amit Sharma*).
   - Select one or more PDF or image files. Choose color/B&W mode and number of copies.
   - Tap **Send Documents to Counter**.

3. **Live Sync to Shopkeeper:**
   - The desktop workstation chimes with an audio alert and displays the new job with its 4-digit token (e.g. `#4821`).
   - The page count is automatically detected from the PDF structure via `pdf-lib`.

4. **Billing & Instant Payment:**
   - The shopkeeper reviews the suggested rate based on counter pricing (₹2/page B&W, ₹10/page Color).
   - Click **Push Bill & UPI QR to Customer**.
   - Customer's screen instantly updates via WebSockets with the bill breakdown and a direct UPI QR code (`upi://pay?...`) for PhonePe, Google Pay, and Paytm, along with a "Pay Cash at Counter" option.

5. **Print & Fulfill:**
   - Shopkeeper marks Cash or UPI Received.
   - Click **Print** to send the document to Windows printer subsystem.
   - Advance job to **Completed**.
