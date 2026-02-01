# Orphan Bars

## Overview

Orphan Bars is a social platform for lyricists to share rap bars, punchlines, one-liners, and wordplay. Users can post original content, engage through likes/comments/bookmarks, follow other lyricists, and build their catalog. The platform features a proof-of-origin system that generates timestamped certificates for posted bars, an XP/leveling system, achievements, and direct messaging.

## User Preferences

Preferred communication style: Simple, everyday language.

## System Architecture

### Frontend Architecture
- **Framework**: React 18 with TypeScript
- **Routing**: Wouter (lightweight React router)
- **State Management**: TanStack React Query for server state, React Context for auth/user state
- **UI Components**: shadcn/ui component library built on Radix UI primitives
- **Styling**: Tailwind CSS v4 with custom theme configuration
- **Animations**: Framer Motion for page transitions and micro-interactions
- **Build Tool**: Vite with custom plugins for meta image handling

### Backend Architecture
- **Runtime**: Node.js with Express
- **Language**: TypeScript compiled with TSX
- **API Pattern**: RESTful endpoints under `/api/*`
- **Authentication**: Passport.js with local strategy, session-based auth stored in PostgreSQL
- **Real-time**: WebSocket server for live notifications and messaging
- **File Uploads**: Uppy with presigned URL pattern for object storage

### Data Layer
- **Database**: PostgreSQL (via Neon serverless)
- **ORM**: Drizzle ORM with drizzle-kit for migrations
- **Schema Location**: `shared/schema.ts` contains all table definitions
- **Key Tables**: users, bars, likes, comments, follows, notifications, direct_messages, achievements, badges

### Content Moderation
- Server-side content filtering with blocked terms and pattern matching
- AI-assisted moderation via integrated AI service
- Flagging system with approval workflow for suspicious content

### Key Features Implementation
- **Proof of Origin**: SHA-256 hash generated from content + timestamp + user + sequential ID
- **XP System**: Points earned from posts (+10), likes received (+5), adoptions (+20), comments (+3), bookmarks (+2) with daily caps
- **Leveling**: Level = floor(sqrt(xp / 100)) + 1, with perks unlocking at levels 3, 5, and 10
- **Achievements**: Condition-based unlocks tracked against user metrics

## External Dependencies

### Database
- **Neon PostgreSQL**: Serverless Postgres via `@neondatabase/serverless`
- Connection string required in `DATABASE_URL` environment variable

### Email Service
- **Resend**: Transactional email for verification codes and password resets
- API key required in `RESEND_API_KEY` environment variable

### Object Storage
- **Supabase/Google Cloud Storage**: For avatar and media file uploads
- Uses presigned URL pattern for secure uploads

### AI Integration
- AI assistant for bar writing help and content moderation
- Integrated through custom AI routes

### Authentication
- Session storage in PostgreSQL via `connect-pg-simple`
- Password hashing with scrypt

### Required Environment Variables
- `DATABASE_URL` - PostgreSQL connection string
- `RESEND_API_KEY` - Resend email service API key
- `SESSION_SECRET` - Express session secret (auto-generated if not set)