# HomeLab PWA - Infrastructure Documentation

## Overview

HomeLab PWA is a Next.js 16 Progressive Web App with share target functionality, push notifications, and offline support. It serves as a tool bookmarking application that can receive shared URLs from other apps on mobile devices.

## Tech Stack

| Technology | Version | Purpose |
|------------|---------|---------|
| Next.js | 16.1.3 | React framework with App Router |
| React | 19.2.3 | UI library |
| TypeScript | ^5 | Type safety |
| Tailwind CSS | ^4 | Utility-first styling |
| next-pwa | ^5.6.0 | PWA service worker generation |
| sharp | ^0.34.5 | Icon generation (dev) |
| pnpm | latest | Package manager |

## Project Structure

```
homelabpwa/
├── public/                          # Static assets
│   ├── manifest.json                # PWA manifest configuration
│   ├── custom-sw.js                 # Custom service worker extensions
│   └── icons/                       # PWA icons (72x72 to 512x512)
│       ├── icon-72x72.png
│       ├── icon-96x96.png
│       ├── icon-128x128.png
│       ├── icon-144x144.png
│       ├── icon-152x152.png
│       ├── icon-192x192.png
│       ├── icon-384x384.png
│       └── icon-512x512.png
│
├── src/
│   ├── app/                         # Next.js App Router
│   │   ├── layout.tsx               # Root layout with PWA metadata
│   │   ├── page.tsx                 # Home page (main UI)
│   │   ├── globals.css              # Global styles + Tailwind
│   │   ├── favicon.ico              # Browser favicon
│   │   │
│   │   ├── share-target/            # Share Target Handler
│   │   │   └── route.ts             # POST/GET handler for incoming shares
│   │   │
│   │   └── api/                     # API Routes
│   │       ├── tools/
│   │       │   ├── fetch-meta/
│   │       │   │   └── route.ts     # Fetches URL metadata from external API
│   │       │   └── send/
│   │       │       └── route.ts     # Sends tool data to external API
│   │       └── debug/
│   │           ├── env-check/
│   │           │   └── route.ts     # Checks environment variables
│   │           └── test-api/
│   │               └── route.ts     # Tests external API connectivity
│   │
│   ├── components/
│   │   └── DebugPanel.tsx           # Debug overlay component
│   │
│   ├── lib/                         # Utility libraries
│   │   ├── share.ts                 # Web Share API utilities
│   │   └── push-notifications.ts    # Push notification utilities
│   │
│   └── types/
│       └── next-pwa.d.ts            # TypeScript declarations for next-pwa
│
├── scripts/
│   └── generate-icons.js            # SVG to PNG icon generator
│
├── package.json                     # Dependencies and scripts
├── pnpm-lock.yaml                   # pnpm lockfile
├── tsconfig.json                    # TypeScript configuration
├── next.config.ts                   # Next.js + PWA configuration
├── eslint.config.mjs                # ESLint configuration
├── postcss.config.mjs               # PostCSS configuration
└── .gitignore                       # Git ignore rules
```

## Core Files Description

### Configuration Files

#### `next.config.ts`
Configures Next.js with the next-pwa plugin for service worker generation:
- Outputs service worker to `/public`
- Auto-registers service worker
- Enables skip waiting for immediate updates
- Disables PWA in development mode
- Imports custom service worker extensions

#### `tsconfig.json`
TypeScript configuration with:
- ES2017 target
- Bundler module resolution
- Path alias `@/*` → `./src/*`
- Next.js plugin integration

#### `public/manifest.json`
PWA manifest defining:
- App name, icons, colors
- Display mode: standalone
- Share target configuration (POST with multipart/form-data)
- Accepted file types for sharing

### Application Files

#### `src/app/layout.tsx`
Root layout providing:
- PWA metadata (manifest link, apple-web-app settings)
- Viewport configuration
- Geist font family (sans and mono)

#### `src/app/page.tsx`
Main application page with:
- PWA install prompt handling
- Share API integration (outgoing shares)
- Share target content display (incoming shares)
- Notification permission management
- Metadata preview card for shared URLs
- Integration with external Tools API

#### `src/app/share-target/route.ts`
Handles incoming shared content:
- POST: Receives multipart form data from share sheet
- GET: Handles simple URL shares
- Extracts hashtags from shared text
- Extracts URLs from text if not provided directly
- Redirects to home with query parameters

### API Routes

#### `src/app/api/tools/fetch-meta/route.ts`
Proxies metadata fetching:
- Calls external API to fetch URL metadata
- Returns title, description, logo, screenshot
- Requires `TOOLS_API_KEY` and `TOOLS_API_URL`

#### `src/app/api/tools/send/route.ts`
Sends tool data to external API:
- Accepts URL, category_id, tags, is_favorite
- Validates URL is provided
- Proxies to configured Tools API
- Returns full tool object with auto-fetched metadata

**Request Schema:**
```json
{
  "url": "https://example.com",
  "category_id": 0,
  "tags": ["string"],
  "is_favorite": false
}
```

**Response Schema:**
```json
{
  "id": 1,
  "name": "Tool Name",
  "description": "Auto-fetched description",
  "url": "https://example.com",
  "logo_url": "https://...",
  "screenshot_url": "https://...",
  "tags": ["tag1", "tag2"],
  "category_id": 1,
  "category_name": "Category",
  "category_color": "#3b82f6",
  "is_favorite": false,
  "display_order": 0,
  "metadata_status": "complete",
  "created_at": "2026-01-18T12:50:16.623Z",
  "updated_at": "2026-01-18T12:50:16.623Z"
}
```

#### `src/app/api/debug/env-check/route.ts`
Debug endpoint for environment validation:
- Checks presence of API credentials
- Validates URL format

#### `src/app/api/debug/test-api/route.ts`
Tests external API connectivity:
- Sends OPTIONS request to Tools API
- Returns connection status

### Library Files

#### `src/lib/share.ts`
Web Share API utilities:
- `canShare()`: Check share support
- `canShareFiles()`: Check file sharing support
- `share(data)`: Share content
- `parseSharedContent(params)`: Parse URL params

#### `src/lib/push-notifications.ts`
Push notification utilities:
- `subscribeToPushNotifications(vapidKey)`: Subscribe to push
- `unsubscribeFromPushNotifications()`: Unsubscribe
- `getPushSubscription()`: Get current subscription

### Service Worker

#### `public/custom-sw.js`
Custom service worker extensions:
- Push event handler (display notifications)
- Notification click handler (open/focus app)
- Notification close handler (logging)

### Components

#### `src/components/DebugPanel.tsx`
Debug overlay component showing:
- System info (online status, standalone mode, SW status)
- Environment variable status
- Received share payload
- API connection testing
- Last error/response display

## Environment Variables

| Variable | Required | Description |
|----------|----------|-------------|
| `TOOLS_API_URL` | Yes | External API endpoint for tools |
| `TOOLS_API_KEY` | Yes | API key for authentication |

## NPM Scripts

| Script | Command | Description |
|--------|---------|-------------|
| `dev` | `next dev --turbopack` | Development server with Turbopack |
| `build` | `next build --webpack` | Production build (webpack for PWA) |
| `start` | `next start` | Start production server |
| `lint` | `eslint` | Run ESLint |
| `generate-icons` | `node scripts/generate-icons.js` | Generate PWA icons |

## PWA Features

### Installable
- Full manifest.json configuration
- Service worker auto-registration
- Install prompt handling in UI

### Share Target (Incoming)
- Configured in manifest.json
- Handles POST with multipart/form-data
- Supports title, text, URL, and files
- Extracts hashtags and URLs from text

### Share Sheet (Outgoing)
- Web Share API integration
- Fallback handling for unsupported browsers

### Push Notifications
- VAPID key authentication
- Custom notification handling in service worker
- Click-to-open functionality

### Offline Support
- Service worker caching via next-pwa/Workbox
- Network status detection

## Data Flow

### Share Target Flow
```
1. User shares URL from another app
2. Android/Browser calls /share-target (POST/GET)
3. Route extracts URL, title, text, hashtags
4. Redirects to / with query params (status: pending)
5. Home page fetches metadata via /api/tools/fetch-meta (preview only)
6. User reviews preview card
7. User clicks "Save Tool"
8. App sends {url, category_id, tags, is_favorite} to /api/tools/send
9. API proxies to external Tools API (which auto-fetches metadata)
10. API returns full tool object with name, description, logo, etc.
11. Success card displays saved tool details
```

### API Proxy Pattern
```
Client → /api/tools/send → External Tools API
         {url, category_id,      (adds X-API-Key header)
          tags, is_favorite}
                              ← Returns full tool object
```

## Build & Deployment

### Development
```bash
pnpm dev
```
- Runs with Turbopack (fast refresh)
- PWA disabled (no service worker)

### Production Build
```bash
pnpm build
```
- Uses webpack (required for next-pwa)
- Generates service worker in /public
- Outputs to .next/

### Production Start
```bash
pnpm start
```
- Serves production build
- Service worker active

## Icon Generation

Generate new icons from SVG template:
```bash
pnpm generate-icons
```
- Creates icons in all required sizes
- Uses sharp for PNG conversion
- Outputs to public/icons/
