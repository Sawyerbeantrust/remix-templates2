# Triton Car Lifts & Automotive Equipment Showroom & Backend Service

Production-ready full-stack web application and REST API service for Triton Car Lifts & Automotive Equipment (Cape Town, South Africa). Built with React 19, Express, TypeScript, Gemini AI integration, and WordPress REST API synchronization.

---

## 🚀 Key Architectural Features

- **Security & Headers**: Hardened with Helmet, rate-limiting, CORS origin restrictions, and request body size validations (10MB maximum, 5MB image upload ceiling).
- **Resilient WordPress Integration**: Jittered exponential backoff retries for transient 5xx/503 HTTP responses, sanitized filenames, and streaming media uploads.
- **AI-Powered Capabilities**: Gemini-powered SEO generation, category audits, sales email drafting, and interactive product assistant with strict Zod schema validation and local matchmaker fallbacks.
- **Observability & Probes**: Structured logging with Pino, Morgan HTTP request logging with header/secret redaction, and `/health` & `/ready` health check endpoints.
- **Clean Architecture**: Decoupled routes, services (`wp.ts`, `ai.ts`, `email.ts`), prompts, and utility helpers.

---

## 🛠️ Environment Variables

Create a `.env` file in the root directory based on `.env.example`:

| Variable | Description | Required | Example |
| :--- | :--- | :--- | :--- |
| `GEMINI_API_KEY` | Google Gemini API Key for AI features | Optional (fallbacks active) | `AIzaSy...` |
| `WP_BASE_URL` | WordPress / WooCommerce base URL | Optional | `https://store.car-lifts.co.za` |
| `WP_APP_USER` | WordPress Application Username | Optional | `admin` |
| `WP_APP_PASSWORD` | WordPress Application Password | Optional | `xxxx xxxx xxxx xxxx` |
| `WP_AUTH_TOKEN` | Bearer/Basic Auth Token for WordPress | Optional | `Bearer eyJ...` |
| `TRITON_KEY` / `WP_MIGRATE_KEY` | Migration and Sync Key for custom endpoints | Optional | `SecretSyncKey2026` |
| `CF_BYPASS_SECRET` | Secret to bypass Cloudflare WAF challenges | Optional | `cf_secret_...` |
| `TRITON_DEBUG_UPLOADS` | Include WP response snippet in non-production errors | Optional | `true` or `false` |
| `ALLOWED_ORIGINS` | Comma-separated list of allowed CORS origins | Optional | `http://localhost:3000,http://localhost:5173,https://car-lifts.co.za,https://store.car-lifts.co.za,https://remix-templates2.vercel.app` |
| `SMTP_HOST` | SMTP Mail Server Host | Optional | `mail.car-lifts.co.za` |
| `SMTP_PORT` | SMTP Mail Server Port | Optional | `465` |
| `SMTP_USER` | SMTP Username / Sender Email | Optional | `info@car-lifts.co.za` |
| `SMTP_PASS` | SMTP Password | Optional | `SecretPass123` |

> **Diagnostic Note**: Use `TRITON_DEBUG_UPLOADS=true` and non-production `NODE_ENV` only for diagnostics; disable in production.

---

## 📡 API Endpoints & Verification Commands

### 1. Server Health & WordPress Connectivity Probe
```bash
# Check Node/Express server health
curl -s -X GET http://localhost:3000/health

# Check WordPress REST connectivity and Cloudflare WAF status
curl -s -X GET http://localhost:3000/api/wp/health
```

### 2. WordPress Media Upload Diagnostic Probe
```bash
curl -X POST http://localhost:3000/api/upload-image \
  -H "Content-Type: application/json" \
  -d '{
    "name": "test-lift.jpg",
    "data": "data:image/jpeg;base64,/9j/4AAQSkZJRgABAQEASABIAAD/2wBDAP//////////////////////////////////////////////////////////////////////////////////////wgALCAABAAEBAREA/8QAFBABAAAAAAAAAAAAAAAAAAAAAP/aAAgBAQABPxA="
  }'
```

### 3. Retrieve WordPress Media Catalog with Thumbnails
```bash
curl -s -X GET "http://localhost:3000/api/list-images?include-thumbnails=true"
```

### 4. Admin Portal Access
- **UI Access**: Click "Admin Portal" in the top header or mobile menu, or click the floating "Admin Access" badge at the bottom-left.
- **Passcode Authentication**: Enter administrative PIN (default `5252`). Session is stored securely in `sessionStorage`.
- **Direct Route**: Navigate to `#admin` in the browser URL.

### 5. Generate SEO Metadata with Gemini AI
```bash
curl -X POST http://localhost:3000/api/generate-seo \
  -H "Content-Type: application/json" \
  -d '{
    "name": "4-Ton Clear Floor Two Post Lift",
    "category": "car-lifts",
    "currentDescription": "Dual hydraulic cylinders with automatic arm locks.",
    "specifications": { "Lifting Capacity": "4000 kg", "Lifting Height": "1900 mm" }
  }'
```

### 4. Ask Triton Assistant
```bash
curl -X POST http://localhost:3000/api/assistant-chat \
  -H "Content-Type: application/json" \
  -d '{
    "message": "What concrete thickness do I need for a 4 ton two post car lift?",
    "history": []
  }'
```

### 5. Send Inquiry / Quote Request
```bash
curl -X POST http://localhost:3000/api/send-inquiry \
  -H "Content-Type: application/json" \
  -d '{
    "fullName": "Johan van der Merwe",
    "email": "johan@workshop.co.za",
    "phone": "0821234567",
    "province": "Western Cape",
    "message": "Need quote for 2x 4-Ton 2-post lifts with delivery in Paarl."
  }'
```

---

## 🧪 Testing & Linting

```bash
# Run unit tests
npm run test

# Run TypeScript typecheck
npm run lint

# Build production bundle
npm run build
```

---

## 📦 Production Deployment

```bash
# Start production server
npm start
```
