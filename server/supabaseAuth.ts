import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { Request, Response, NextFunction } from 'express';
import { storage } from './storage';

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const supabaseAnonKey = process.env.SUPABASE_ANON_KEY;

let supabaseAdmin: SupabaseClient | null = null;
let supabaseClient: SupabaseClient | null = null;

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

export async function validateSupabaseToken(token: string): Promise<any | null> {
  const admin = getSupabaseAdmin();
  if (!admin) return null;

  try {
    const { data: { user }, error } = await admin.auth.getUser(token);
    if (error || !user) return null;
    return user;
  } catch (error) {
    console.error('Error validating Supabase token:', error);
    return null;
  }
}

export async function supabaseAuthMiddleware(req: Request, res: Response, next: NextFunction) {
  const authHeader = req.headers.authorization;
  
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ message: 'Missing or invalid authorization header' });
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
