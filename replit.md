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
  - `users`: User accounts with membership tiers, online status, last seen
  - `bars`: Lyric posts with categories, tags, and explanations
  - `bookmarks`: Saved bars for users
  - `push_subscriptions`: Browser push notification subscriptions
  - `friendships`: Friend connections between users (pending/accepted)
  - `direct_messages`: Private messages between friends
  - `user_achievements`: Unlocked achievements per user with timestamps

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

## Social Features

### Online Presence
- **Status Options**: online, busy, offline (appear offline)
- **Visibility**: Status indicator in navigation header with dropdown selector
- **Automatic Updates**: Status changes based on browser visibility events
- **Online Count**: Public count of currently online users

### Friends System
- **Friend Requests**: Send requests from user profile pages
- **Request Management**: Accept/decline pending requests on Friends page
- **Friends Page**: `/friends` - View friends list with online status, send messages, remove friends
- **Friendship Status**: Displayed on profile (Add Friend / Pending / Message buttons)

### Direct Messaging
- **Messages Page**: `/messages` - Conversation list with unread counts, tabbed sidebar (Chats/Friends)
- **Chat Interface**: Real-time messaging with message history
- **Privacy Settings**: Users can choose who can message them (friends_only or everyone)
- **Read Receipts**: Messages marked as read when conversation opened
- **Notifications**: New message notifications

### Achievement System
- **Gamification**: Users earn badges for reaching milestones in activity
- **Automatic Unlocks**: Achievements checked after posting bars, receiving likes, and gaining followers
- **Achievement Notifications**: Users receive in-app notifications when unlocking new achievements
- **Profile Badges**: Earned achievements displayed on user profiles with tooltips

### Achievement Definitions
- **Origin Founder**: Post 1 bar
- **Bar Slinger**: Post 10 bars
- **Wordsmith**: Post 25 bars
- **Bar Lord**: Post 50 bars
- **Rising Star**: Gain 10 followers
- **Cult Leader**: Gain 50 followers
- **Crowd Pleaser**: Receive 100 total likes
- **Milsling Heir**: Receive 1000 total likes
- **Viral**: Get 100 likes on a single bar
- **Immortal**: Get 500 likes on a single bar

### Custom Achievement Maker
- **Admin Panel**: Site owner and admins can create custom achievements via `/admin`
- **Simple Mode**: Single condition with threshold (e.g., "Post 50 bars")
- **Advanced Mode**: Combine multiple conditions with AND/OR logic
- **Condition Types**: bars_posted, likes_received, followers_count, single_bar_likes, comments_made, bars_adopted, night_owl, early_bird, controversial_bar, bars_with_keyword
- **Keyword-Based**: The `bars_with_keyword` condition allows achievements like "Post 25 bars containing 'Christmas'"
- **Self-Like Exclusion**: All like-based calculations exclude self-likes to prevent boosting
- **Rule Tree Storage**: Compound conditions stored as JSONB in `customAchievements.ruleTree`
- **Approval Workflow**: Admin-created achievements require site owner approval before going live

### Rule Tree Structure
- **Condition Node**: `{type: "condition", metric: string, comparator: string, value: number, keyword?: string}`
- **Group Node**: `{type: "group", operator: "AND" | "OR", children: AchievementRuleTree[]}`
- **Comparators**: `>=`, `>`, `=`, `<`, `<=`
- **Boolean Metrics**: Coerced to 0/1 for numeric comparison (e.g., night_owl >= 1)

## Proof-of-Origin System

### Immutable Bar Tracking
- **Unique IDs**: Each bar receives a permanent sequential ID in format `orphanbars-#XXXXX`
- **Immutable Timestamp**: Creation time captured at post creation, cannot be modified
- **Tamper-Proof Hash**: SHA256 hash of content+timestamp+userId+proofBarId stored for verification
- **Permission Status**: Creator can set sharing permissions (share_only, open_adopt, private)

### Permission Levels
- **Share Only** (default): Others can share/link but cannot claim authorship
- **Open Adopt**: Others can adopt the bar with automatic credit to original creator
- **Private**: Bar only visible on creator's profile, no follower notifications

### Duplicate Detection
- **Similarity Threshold**: 80% word-based Jaccard similarity triggers warnings
- **Pre-Submission Check**: API endpoint `/api/bars/check-similar` validates content before posting
- **Normalized Comparison**: HTML stripped, text lowercased for accurate comparison

### Adoption System
- **Adoption Receipt**: Links adopted bar to original via `adoptions` table
- **Attribution**: Original creator notified when bar is adopted
- **Chain Tracking**: Full lineage from original to all adoptions preserved

### Proof Screenshot
- **Shareable Image**: Generate proof image with bar content, ID, hash, timestamp
- **Download/Share**: Save to device or share directly via native share API
- **Visual Verification**: Displays SHA256 hash and creation timestamp in UTC

### Database Schema
- **bars.proofBarId**: Unique permanent ID (orphanbars-#XXXXX format)
- **bars.proofHash**: SHA256 hash for tamper detection
- **bars.permissionStatus**: share_only | open_adopt | private
- **adoptions**: Links adopted bars to originals with timestamps
- **barSequence**: Singleton table for sequential ID generation

## Beat/Instrumental Embedding

### Beat Link Feature
- **Purpose**: Let users link beats/instrumentals so readers can hear what the bar rides to
- **Supported Providers**: YouTube, SoundCloud, Spotify, Audiomack
- **Input Validation**: Real-time URL validation with provider detection on form input
- **Security**: Domain whitelist enforced on both frontend and backend

### BarMediaPlayer Component
- **Location**: `client/src/components/BarMediaPlayer.tsx`
- **Modes**: Collapsible (default) with expandable view, inline variant
- **Provider Detection**: Automatically detects platform from URL hostname
- **Embeds**: Loads iframe players for supported providers

### Validation Flow
1. **Frontend**: `validateBeatUrl()` checks URL format and domain whitelist
2. **Form Feedback**: Shows provider badge or error message in real-time
3. **Submit Block**: Invalid beat links prevent form submission
4. **Backend**: Independent validation before database persistence