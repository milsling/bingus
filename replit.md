# Orphan Bars

## Overview

Orphan Bars is a social platform for lyricists to share bars, one-liners, punchlines, and entendres. Users can post their lyrics with categories and tags, browse content from others, and manage their profiles. The application features a hip-hop themed UI with customizable typography and a dark purple/charcoal color scheme.

## User Preferences

Preferred communication style: Simple, everyday language.

## System Architecture

### Frontend Architecture
- **Framework**: React 18 with TypeScript
- **Routing**: Wouter (lightweight React router)
- **State Management**: TanStack React Query for server state, React Context for global UI state (BarContext)
- **Styling**: Tailwind CSS v4 with shadcn/ui component library (New York style variant)
- **Build Tool**: Vite with custom plugins for Replit integration
- **UI Components**: Radix UI primitives wrapped with shadcn/ui, Framer Motion for animations

### Backend Architecture
- **Runtime**: Node.js with Express
- **Language**: TypeScript compiled with tsx for development, esbuild for production
- **API Pattern**: RESTful endpoints under `/api` prefix
- **Session Management**: Express-session with memory store (development) or connect-pg-simple (production ready)

### Authentication
- **Strategy**: Passport.js with local strategy (username/password)
- **Password Security**: scrypt hashing with random salts
- **Session Storage**: Server-side sessions with secure cookies

### Data Storage
- **Database**: PostgreSQL via Drizzle ORM
- **Schema Location**: `shared/schema.ts` - shared between client and server
- **Migrations**: Drizzle Kit with `db:push` command
- **Tables**:
  - `users`: User accounts with membership tiers
  - `bars`: Lyric posts with categories, tags, and explanations
  - `bookmarks`: Saved bars for users
  - `push_subscriptions`: Browser push notification subscriptions

### File Storage
- **Service**: Google Cloud Storage via Replit Object Storage integration
- **Upload Flow**: Presigned URL pattern - client requests URL, uploads directly to storage
- **Implementation**: `server/replit_integrations/object_storage/`

### Project Structure
```
├── client/           # Frontend React application
│   ├── src/
│   │   ├── components/   # Reusable UI components
│   │   ├── pages/        # Route page components
│   │   ├── context/      # React contexts
│   │   ├── hooks/        # Custom React hooks
│   │   └── lib/          # Utilities and API client
├── server/           # Backend Express application
│   ├── routes.ts     # API route definitions
│   ├── storage.ts    # Database operations
│   ├── auth.ts       # Authentication setup
│   └── db.ts         # Database connection
├── shared/           # Shared code between client/server
│   └── schema.ts     # Drizzle schema and Zod validators
└── migrations/       # Database migrations
```

## External Dependencies

### Database
- **PostgreSQL**: Primary database, connection via `DATABASE_URL` environment variable
- **Drizzle ORM**: Type-safe database queries with automatic schema inference

### Cloud Services
- **Google Cloud Storage**: File uploads via Replit's Object Storage integration
- **Replit Sidecar**: Token management for GCS authentication (endpoint: `http://127.0.0.1:1106`)

### Key NPM Packages
- **@tanstack/react-query**: Server state management and caching
- **drizzle-orm** / **drizzle-kit**: Database ORM and migrations
- **passport** / **passport-local**: Authentication framework
- **@uppy/core** / **@uppy/aws-s3**: File upload handling
- **zod**: Schema validation (shared between client and server via drizzle-zod)
- **date-fns**: Date formatting utilities

### Fonts (Google Fonts)
- Syne, UnifrakturMaguntia, Anton, Oswald, JetBrains Mono - user-switchable display fonts

## Progressive Web App Features

### App-Like Experience
- **Search**: Full-text search for bars by content, users, and tags
- **Bookmarks**: Users can save bars to a "Saved" collection
- **Skeleton Loading**: Smooth loading states with skeleton placeholders
- **Page Transitions**: Animated fade transitions between pages via Framer Motion
- **Pull-to-Refresh**: Touch gesture to refresh the feed on mobile
- **Swipe Gestures**: Swipe right to like, swipe left to bookmark bars
- **Offline Mode**: Service worker caches static assets and API responses
- **Push Notifications**: Infrastructure for browser push notifications (VAPID keys required)
- **Home Screen Icon**: Apple touch icon and web manifest for add-to-home-screen

### Service Worker
- Location: `client/public/sw.js`
- Caching strategy: Stale-while-revalidate for static assets, network-first for API calls
- Registered in `client/src/main.tsx`