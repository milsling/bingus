# Copilot Instructions for AI Agents

## Project Overview
- This workspace is a multi-component web application, primarily using React, TypeScript, and Vite for frontend, with Node.js/TypeScript for backend scripts and server logic.
- Key directories: `client/` (main frontend), `server/` (backend scripts), `shared/` (common code), `types/` (type definitions).
- Data flows between frontend and backend via API endpoints defined in `server/routes.ts`.

## Critical Workflows
- **Build Frontend:** Use Vite. Entry: `client/index.html`, source: `client/src/`. Build config: `vite.config.ts`.
- **Backend Scripts:** Run with Node.js. Main entry: `server/index.ts`. Other scripts in `server/` are for migrations, seeding, and utilities.
- **Database Migrations:** SQL files in root (e.g., `add_notification_sound_column.sql`, `fix_rls_policies.sql`). Migration runner: `run-migration.ts`.
- **Voice Chat:** See `VOICE_CHAT_README.md` and `install-voice-chat.sh` for setup and integration details.

## Project-Specific Patterns
- Shared types and utilities are in `shared/` and `types/`.
- Use Drizzle ORM for database access (`drizzle.config.ts`).
- External integrations: Apple OAuth (`server/appleNotifications.ts`), GitHub (`server/github.ts`).
- Markdown files in root document fixes, features, and conventions (e.g., `FIX_SUMMARY.md`, `PROFILE_UPLOAD_FIX.md`).

## Conventions
- Prefer TypeScript for all new code.
- Use ESLint and type-aware lint rules (see `README.md` in `mouthpiece/` for config tips).
- Keep business logic in backend scripts, UI logic in `client/src/`.
- Document major changes in root markdown files.

## Examples
- To add a new API route: update `server/routes.ts`, add handler in `server/`, update types in `types/` if needed.
- To run a migration: execute `run-migration.ts` or relevant SQL file.
- To build frontend: run Vite build (see `vite.config.ts`).

## References
- [client/index.html](client/index.html): Frontend entry
- [server/index.ts](server/index.ts): Backend entry
- [drizzle.config.ts](drizzle.config.ts): Database config
- [VOICE_CHAT_README.md](VOICE_CHAT_README.md): Voice chat setup
- [README.md](home/Milsling/mouthpiece/README.md): Linting and build tips

---

Update this file as workflows or conventions change. For unclear or missing sections, ask for clarification or examples from maintainers.
