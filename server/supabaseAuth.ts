import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { Request, Response, NextFunction } from 'express';
import { storage } from './storage';

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const supabaseAnonKey = process.env.SUPABASE_ANON_KEY;

let supabaseAdmin: SupabaseClient | null = null;
let supabaseClient: SupabaseClient | null = null;

// Rate limiting for token validation attempts
const tokenValidationAttempts = new Map<string, { count: number; lastAttempt: number }>();
const MAX_TOKEN_VALIDATION_ATTEMPTS = 10;
const TOKEN_VALIDATION_WINDOW_MS = 60 * 1000; // 1 minute

function checkTokenValidationRateLimit(ipOrToken: string): boolean {
  const now = Date.now();
  const attempts = tokenValidationAttempts.get(ipOrToken);
  
  if (!attempts) {
    tokenValidationAttempts.set(ipOrToken, { count: 1, lastAttempt: now });
    return true;
  }
  
  // Reset if window expired
  if (now - attempts.lastAttempt > TOKEN_VALIDATION_WINDOW_MS) {
    tokenValidationAttempts.set(ipOrToken, { count: 1, lastAttempt: now });
    return true;
  }
  
  // Check if rate limit exceeded
  if (attempts.count >= MAX_TOKEN_VALIDATION_ATTEMPTS) {
    return false;
  }
  
  attempts.count++;
  attempts.lastAttempt = now;
  return true;
}

function clearTokenValidationRateLimit(ipOrToken: string): void {
  tokenValidationAttempts.delete(ipOrToken);
}

export function getSupabaseAdmin(): SupabaseClient | null {
  if (!supabaseUrl || !supabaseServiceKey) {
    console.warn('Supabase admin credentials not configured');
    return null;
  }
  if (!supabaseAdmin) {
    supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey, {
      auth: {
        autoRefreshToken: false,
        persistSession: false
      }
    });
  }
  return supabaseAdmin;
}

export function getSupabaseClient(): SupabaseClient | null {
  if (!supabaseUrl || !supabaseAnonKey) {
    console.warn('Supabase client credentials not configured');
    return null;
  }
  if (!supabaseClient) {
    supabaseClient = createClient(supabaseUrl, supabaseAnonKey);
  }
  return supabaseClient;
}

export async function validateSupabaseToken(token: string): Promise<{ id: string; email?: string } | null> {
  const admin = getSupabaseAdmin();
  const client = getSupabaseClient();
  if (!admin && !client) {
    console.warn('Supabase credentials not configured, cannot validate token');
    return null;
  }

  try {
    const primary = admin ?? client!;
    const { data: { user }, error } = await primary.auth.getUser(token);

    if (error) {
      console.error('Supabase token validation error:', {
        message: error.message,
        name: (error as any).name,
        status: (error as any).status,
      });

      if (admin && client) {
        const { data: { user: fallbackUser }, error: fallbackError } = await client.auth.getUser(token);
        if (fallbackError) {
          console.error('Supabase token validation fallback (anon) error:', {
            message: fallbackError.message,
            name: (fallbackError as any).name,
            status: (fallbackError as any).status,
          });
          return null;
        }
        if (fallbackUser) {
          return fallbackUser;
        }
      }

      return null;
    }
    if (!user) {
      console.warn('Supabase token validation returned no user');
      return null;
    }
    return user;
  } catch (error) {
    console.error('Exception during Supabase token validation:', error);
    return null;
  }
}

export async function supabaseAuthMiddleware(req: Request, res: Response, next: NextFunction) {
  const authHeader = req.headers.authorization;
  
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ message: 'Missing or invalid authorization header' });
  }

  // Rate limit by IP address to prevent brute force token attempts
  const clientIp = req.ip || req.socket.remoteAddress || 'unknown';
  if (!checkTokenValidationRateLimit(clientIp)) {
    return res.status(429).json({ message: 'Too many authentication attempts. Please try again later.' });
  }

  const token = authHeader.substring(7);
  const supabaseUser = await validateSupabaseToken(token);

  if (!supabaseUser) {
    return res.status(401).json({ message: 'Invalid or expired token' });
  }

  const appUser = await storage.getUserBySupabaseId(supabaseUser.id);
  
  if (!appUser) {
    return res.status(401).json({ message: 'User not found in app database' });
  }

  // Clear rate limit on successful authentication
  clearTokenValidationRateLimit(clientIp);

  const { password: _, ...userWithoutPassword } = appUser;
  (req as any).user = userWithoutPassword;
  (req as any).supabaseUser = supabaseUser;

  next();
}

export function isAuthenticatedSupabase(req: Request, res: Response, next: NextFunction) {
  if ((req as any).user) {
    return next();
  }
  return supabaseAuthMiddleware(req, res, next);
}

export async function optionalSupabaseAuth(req: Request, res: Response, next: NextFunction) {
  const authHeader = req.headers.authorization;
  
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return next();
  }

  const token = authHeader.substring(7);
  const supabaseUser = await validateSupabaseToken(token);

  if (supabaseUser) {
    const appUser = await storage.getUserBySupabaseId(supabaseUser.id);
    if (appUser) {
      const { password: _, ...userWithoutPassword } = appUser;
      (req as any).user = userWithoutPassword;
      (req as any).supabaseUser = supabaseUser;
    }
  }

  next();
}

export async function hybridAuthMiddleware(req: Request, res: Response, next: NextFunction) {
  if ((req as any).user) {
    return next();
  }
  
  const authHeader = req.headers.authorization;
  
  if (authHeader && authHeader.startsWith('Bearer ')) {
    const token = authHeader.substring(7);
    const supabaseUser = await validateSupabaseToken(token);

    if (supabaseUser) {
      const appUser = await storage.getUserBySupabaseId(supabaseUser.id);
      if (appUser) {
        const { password: _, ...userWithoutPassword } = appUser;
        (req as any).user = userWithoutPassword;
        (req as any).supabaseUser = supabaseUser;
        return next();
      }
    }
  }
  
  if ((req as any).isAuthenticated && (req as any).isAuthenticated()) {
    return next();
  }
  
  return res.status(401).json({ message: 'Authentication required' });
}
