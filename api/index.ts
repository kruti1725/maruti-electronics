import type { IncomingMessage, ServerResponse } from 'http';
import {
  getReceipts,
  getReceiptBySerial,
  getReceiptsByMobile,
  createReceipt,
  updateReceipt,
  deleteReceipt,
  getDashboardStats,
  validateAdmin,
  seedAdmin,
} from '../src/lib/data-service';
import { getDatabaseStatus } from '../src/lib/mongodb';
import { generateToken, verifyToken } from '../src/lib/auth';
import { receiptSchema, loginSchema } from '../src/lib/validation';

// Helper to extract JSON body
async function getBody(req: any): Promise<any> {
  if (req.body && typeof req.body === 'object') {
    return req.body;
  }
  if (typeof req.body === 'string') {
    try {
      return JSON.parse(req.body);
    } catch {
      return {};
    }
  }
  return new Promise((resolve) => {
    let data = '';
    req.on('data', (chunk: any) => {
      data += chunk;
    });
    req.on('end', () => {
      try {
        resolve(data ? JSON.parse(data) : {});
      } catch {
        resolve({});
      }
    });
    req.on('error', () => resolve({}));
  });
}

// Helper to parse cookies
function parseCookies(cookieHeader?: string): Record<string, string> {
  const list: Record<string, string> = {};
  if (!cookieHeader) return list;
  cookieHeader.split(';').forEach((cookie) => {
    const parts = cookie.split('=');
    list[parts.shift()!.trim()] = decodeURI(parts.join('='));
  });
  return list;
}

// Helper to send JSON response
function sendJson(res: any, status: number, data: any) {
  res.statusCode = status;
  res.setHeader('Content-Type', 'application/json');
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  res.end(JSON.stringify(data));
}

// Extract auth user from token
function getAuthUser(req: any) {
  let token = '';
  const authHeader = req.headers.authorization;
  if (authHeader && authHeader.startsWith('Bearer ')) {
    token = authHeader.substring(7);
  } else {
    const cookies = parseCookies(req.headers.cookie);
    token = cookies['auth_token'] || '';
  }
  if (!token) return null;
  return verifyToken(token);
}

export default async function handler(req: any, res: any) {
  // Handle CORS Preflight
  if (req.method === 'OPTIONS') {
    res.statusCode = 200;
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
    res.end();
    return;
  }

  // Determine path
  // Supports: /api/auth/login, /api?path=auth/login, x-matched-path, req.url
  let pathname = '';
  try {
    const urlObj = new URL(req.url, 'http://localhost');
    if (urlObj.searchParams.has('path')) {
      pathname = '/' + urlObj.searchParams.get('path');
    } else {
      pathname = urlObj.pathname;
    }
  } catch {
    pathname = req.url || '';
  }

  // Normalize: remove leading /api if present
  if (pathname.startsWith('/api/')) {
    pathname = pathname.substring(4);
  } else if (pathname === '/api') {
    pathname = '/';
  }

  const method = req.method;

  try {
    // ---------------- HEALTH & STATUS ROUTES ----------------
    if (method === 'GET' && (pathname === '/health' || pathname.endsWith('/health') || pathname === '/status' || pathname.endsWith('/status'))) {
      const dbStatus = getDatabaseStatus();
      return sendJson(res, 200, {
        status: 'ok',
        service: 'Kruti Electronics API',
        timestamp: new Date().toISOString(),
        database: dbStatus,
      });
    }

    // ---------------- AUTH ROUTES ----------------
    // POST /auth/login
    if (method === 'POST' && (pathname === '/auth/login' || pathname.endsWith('/login'))) {
      const body = await getBody(req);
      const parsed = loginSchema.safeParse(body);
      if (!parsed.success) {
        return sendJson(res, 400, {
          success: false,
          error: parsed.error.issues[0]?.message || 'Invalid credentials format',
        });
      }
      const { email, password } = parsed.data;
      const user = await validateAdmin(email, password);
      if (!user) {
        return sendJson(res, 401, {
          success: false,
          error: 'Invalid username/email or password',
        });
      }
      const token = generateToken(user);
      // Set cookie header
      res.setHeader(
        'Set-Cookie',
        `auth_token=${token}; Path=/; HttpOnly; SameSite=Lax; Max-Age=${7 * 24 * 60 * 60}`
      );
      return sendJson(res, 200, { success: true, user, token });
    }

    // POST /auth/logout
    if (method === 'POST' && (pathname === '/auth/logout' || pathname.endsWith('/logout'))) {
      res.setHeader('Set-Cookie', 'auth_token=; Path=/; Expires=Thu, 01 Jan 1970 00:00:00 GMT');
      return sendJson(res, 200, { success: true, message: 'Logged out successfully' });
    }

    // GET /auth/me
    if (method === 'GET' && (pathname === '/auth/me' || pathname.endsWith('/me'))) {
      const user = getAuthUser(req);
      return sendJson(res, 200, { success: true, user });
    }

    // POST /auth/seed-admin
    if (method === 'POST' && (pathname === '/auth/seed-admin' || pathname.endsWith('/seed-admin'))) {
      const body = await getBody(req);
      const { email, password, name } = body;
      if (!email || !password) {
        return sendJson(res, 400, { success: false, error: 'Email and password required' });
      }
      const user = await seedAdmin(email, password, name || 'Kruti Admin');
      return sendJson(res, 200, { success: true, user });
    }

    // ---------------- DASHBOARD ROUTE ----------------
    // GET /dashboard
    if (method === 'GET' && (pathname === '/dashboard' || pathname.endsWith('/dashboard'))) {
      const user = getAuthUser(req);
      if (!user) {
        return sendJson(res, 401, { success: false, error: 'Unauthorized. Please login.' });
      }
      const stats = await getDashboardStats();
      return sendJson(res, 200, { success: true, stats });
    }

    // ---------------- RECEIPTS ROUTES ----------------
    // GET /receipts/mobile/:mobile (Public)
    const mobileMatch = pathname.match(/^\/receipts\/mobile\/([^/?]+)/);
    if (method === 'GET' && mobileMatch) {
      const cleanMobile = mobileMatch[1].replace(/\D/g, '');
      if (cleanMobile.length < 10) {
        return sendJson(res, 400, { success: false, error: 'Invalid mobile number. Must be 10 digits.' });
      }
      const receipts = await getReceiptsByMobile(cleanMobile);
      if (!receipts || receipts.length === 0) {
        return sendJson(res, 404, { success: false, error: 'No repair receipt found for this mobile number.' });
      }
      return sendJson(res, 200, { success: true, receipts });
    }

    // GET /receipts/:serialNumber (Public & Admin)
    const serialMatch = pathname.match(/^\/receipts\/([^/?]+)$/);
    if (method === 'GET' && serialMatch && serialMatch[1] !== 'mobile') {
      const serialNumber = serialMatch[1];
      const receipt = await getReceiptBySerial(serialNumber);
      if (!receipt) {
        return sendJson(res, 404, { success: false, error: 'Receipt not found.' });
      }
      return sendJson(res, 200, { success: true, receipt });
    }

    // GET /receipts (Protected list with filters)
    if (method === 'GET' && (pathname === '/receipts' || pathname === '/receipts/')) {
      const user = getAuthUser(req);
      if (!user) {
        return sendJson(res, 401, { success: false, error: 'Unauthorized. Please login.' });
      }
      const urlObj = new URL(req.url, 'http://localhost');
      const search = urlObj.searchParams.get('search') || undefined;
      const status = urlObj.searchParams.get('status') || undefined;
      const priority = urlObj.searchParams.get('priority') || undefined;
      const days = urlObj.searchParams.get('days') || undefined;
      const page = parseInt(urlObj.searchParams.get('page') || '1', 10);
      const limit = parseInt(urlObj.searchParams.get('limit') || '20', 10);

      const data = await getReceipts({ search, status, priority, days, page, limit });
      return sendJson(res, 200, { success: true, ...data });
    }

    // POST /receipts (Protected create)
    if (method === 'POST' && (pathname === '/receipts' || pathname === '/receipts/')) {
      const user = getAuthUser(req);
      if (!user) {
        return sendJson(res, 401, { success: false, error: 'Unauthorized. Please login.' });
      }
      const body = await getBody(req);
      const parsed = receiptSchema.safeParse(body);
      if (!parsed.success) {
        return sendJson(res, 400, {
          success: false,
          error: parsed.error.issues[0]?.message || 'Invalid receipt data',
        });
      }
      const created = await createReceipt(parsed.data as any);
      return sendJson(res, 201, {
        success: true,
        message: 'Receipt Saved Successfully',
        receipt: created,
      });
    }

    // PUT /receipts/:serialNumber (Protected update)
    if (method === 'PUT' && serialMatch) {
      const user = getAuthUser(req);
      if (!user) {
        return sendJson(res, 401, { success: false, error: 'Unauthorized. Please login.' });
      }
      const serialNumber = serialMatch[1];
      const body = await getBody(req);
      const parsed = receiptSchema.safeParse(body);
      if (!parsed.success) {
        return sendJson(res, 400, {
          success: false,
          error: parsed.error.issues[0]?.message || 'Invalid receipt data',
        });
      }
      const updated = await updateReceipt(serialNumber, parsed.data as any);
      return sendJson(res, 200, {
        success: true,
        message: 'Receipt updated successfully',
        receipt: updated,
      });
    }

    // DELETE /receipts/:serialNumber (Protected delete)
    if (method === 'DELETE' && serialMatch) {
      const user = getAuthUser(req);
      if (!user) {
        return sendJson(res, 401, { success: false, error: 'Unauthorized. Please login.' });
      }
      const serialNumber = serialMatch[1];
      const deleted = await deleteReceipt(serialNumber);
      if (!deleted) {
        return sendJson(res, 404, { success: false, error: 'Receipt not found or already deleted.' });
      }
      return sendJson(res, 200, { success: true, message: 'Receipt deleted successfully' });
    }

    // Default 404
    return sendJson(res, 404, { success: false, error: `Route ${method} ${pathname} not found` });
  } catch (error: any) {
    console.error('Serverless API Error:', error);
    return sendJson(res, 500, { success: false, error: error.message || 'Internal server error' });
  }
}
