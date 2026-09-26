import express, { Request, Response, Router } from 'express';
import cookieParser from 'cookie-parser';
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
} from './data-service';
import { getDatabaseStatus } from './mongodb';
import { generateToken, requireAuth, AuthRequest, verifyToken } from './auth';
import { receiptSchema, loginSchema } from './validation';

export function createApiApp() {
  const app = express();
  const isProd = process.env.NODE_ENV === 'production';

  app.use(express.json());
  app.use(express.urlencoded({ extended: true }));
  app.use(cookieParser());

  // Logging
  app.use((req, res, next) => {
    if (req.url.startsWith('/api') || req.url.startsWith('/auth') || req.url.startsWith('/receipts')) {
      console.log(`[API] ${req.method} ${req.url}`);
    }
    next();
  });

  const router = Router();

  // ==========================================
  // SYSTEM HEALTH & STATUS ROUTE
  // ==========================================
  router.get('/health', (req: Request, res: Response) => {
    const dbStatus = getDatabaseStatus();
    return res.json({
      status: 'ok',
      service: 'Kruti Electronics API',
      timestamp: new Date().toISOString(),
      database: dbStatus,
    });
  });

  router.get('/status', (req: Request, res: Response) => {
    const dbStatus = getDatabaseStatus();
    return res.json({
      status: 'ok',
      service: 'Kruti Electronics API',
      timestamp: new Date().toISOString(),
      database: dbStatus,
    });
  });

  // ==========================================
  // AUTH ROUTES
  // ==========================================

  // POST /auth/login
  router.post('/auth/login', async (req: Request, res: Response) => {
    try {
      const parsed = loginSchema.safeParse(req.body);
      if (!parsed.success) {
        return res.status(400).json({
          success: false,
          error: parsed.error.issues[0]?.message || 'Invalid credentials format',
        });
      }

      const { email, password } = parsed.data;
      const user = await validateAdmin(email, password);

      if (!user) {
        return res.status(401).json({
          success: false,
          error: 'Invalid username/email or password',
        });
      }

      const token = generateToken(user);

      res.cookie('auth_token', token, {
        httpOnly: true,
        secure: isProd,
        sameSite: 'lax',
        maxAge: 7 * 24 * 60 * 60 * 1000,
      });

      return res.json({
        success: true,
        user,
        token,
      });
    } catch (err: any) {
      console.error('Login error:', err);
      return res.status(500).json({ success: false, error: 'Internal server error during login' });
    }
  });

  // POST /auth/logout
  router.post('/auth/logout', (req: Request, res: Response) => {
    res.clearCookie('auth_token');
    return res.json({ success: true, message: 'Logged out successfully' });
  });

  // GET /auth/me
  router.get('/auth/me', (req: Request, res: Response) => {
    let token = req.cookies?.auth_token;
    if (!token && req.headers.authorization) {
      const parts = req.headers.authorization.split(' ');
      if (parts[0] === 'Bearer' && parts[1]) {
        token = parts[1];
      }
    }

    if (!token) {
      return res.json({ success: true, user: null });
    }

    const user = verifyToken(token);
    return res.json({ success: true, user });
  });

  // POST /auth/seed-admin
  router.post('/auth/seed-admin', async (req: Request, res: Response) => {
    try {
      const { email, password, name } = req.body;
      if (!email || !password) {
        return res.status(400).json({ success: false, error: 'Email and password required' });
      }
      const user = await seedAdmin(email, password, name || 'Kruti Admin');
      return res.json({ success: true, user });
    } catch (err: any) {
      return res.status(500).json({ success: false, error: err.message });
    }
  });

  // ==========================================
  // DASHBOARD ROUTE
  // ==========================================

  // GET /dashboard
  router.get('/dashboard', requireAuth, async (req: AuthRequest, res: Response) => {
    try {
      const stats = await getDashboardStats();
      return res.json({ success: true, stats });
    } catch (err: any) {
      console.error('Dashboard stats error:', err);
      return res.status(500).json({ success: false, error: 'Failed to load dashboard statistics' });
    }
  });

  // ==========================================
  // RECEIPTS ROUTES
  // ==========================================

  // GET /receipts (Protected)
  router.get('/receipts', requireAuth, async (req: AuthRequest, res: Response) => {
    try {
      const { search, status, priority, days, page, limit } = req.query;
      const data = await getReceipts({
        search: search as string,
        status: status as string,
        priority: priority as string,
        days: days as string,
        page: page ? parseInt(page as string, 10) : 1,
        limit: limit ? parseInt(limit as string, 10) : 20,
      });
      return res.json({ success: true, ...data });
    } catch (err: any) {
      console.error('Get receipts error:', err);
      return res.status(500).json({ success: false, error: 'Unable to load receipts.' });
    }
  });

  // POST /receipts (Protected)
  router.post('/receipts', requireAuth, async (req: AuthRequest, res: Response) => {
    try {
      const parsed = receiptSchema.safeParse(req.body);
      if (!parsed.success) {
        const firstErr = parsed.error.issues[0]?.message || 'Invalid receipt data';
        return res.status(400).json({ success: false, error: firstErr });
      }

      const created = await createReceipt(parsed.data as any);
      return res.status(201).json({
        success: true,
        message: 'Receipt Saved Successfully',
        receipt: created,
      });
    } catch (err: any) {
      console.error('Create receipt error:', err);
      if (err.message && err.message.includes('already exists')) {
        return res.status(409).json({ success: false, error: 'Receipt number already exists.' });
      }
      return res.status(500).json({ success: false, error: err.message || 'Unable to save receipt.' });
    }
  });

  // GET /receipts/mobile/:mobile (Public Customer Search)
  router.get('/receipts/mobile/:mobile', async (req: Request, res: Response) => {
    try {
      const { mobile } = req.params;
      const cleanMobile = mobile.replace(/\D/g, '');
      if (cleanMobile.length < 10) {
        return res.status(400).json({ success: false, error: 'Invalid mobile number. Please enter a 10-digit number.' });
      }

      const receipts = await getReceiptsByMobile(cleanMobile);
      if (!receipts || receipts.length === 0) {
        return res.status(404).json({ success: false, error: 'No repair receipt found for this mobile number.' });
      }

      return res.json({ success: true, receipts });
    } catch (err: any) {
      console.error('Search by mobile error:', err);
      return res.status(500).json({ success: false, error: 'Error searching receipts.' });
    }
  });

  // GET /receipts/:serialNumber (Public Customer & Admin)
  router.get('/receipts/:serialNumber', async (req: Request, res: Response) => {
    try {
      const { serialNumber } = req.params;
      const receipt = await getReceiptBySerial(serialNumber);
      if (!receipt) {
        return res.status(404).json({ success: false, error: 'Receipt not found.' });
      }
      return res.json({ success: true, receipt });
    } catch (err: any) {
      console.error('Get receipt by serial error:', err);
      return res.status(500).json({ success: false, error: 'Error retrieving receipt.' });
    }
  });

  // PUT /receipts/:serialNumber (Protected)
  router.put('/receipts/:serialNumber', requireAuth, async (req: AuthRequest, res: Response) => {
    try {
      const { serialNumber } = req.params;
      const parsed = receiptSchema.safeParse(req.body);
      if (!parsed.success) {
        return res.status(400).json({
          success: false,
          error: parsed.error.issues[0]?.message || 'Invalid receipt data',
        });
      }

      const updated = await updateReceipt(serialNumber, parsed.data as any);
      return res.json({
        success: true,
        message: 'Receipt updated successfully',
        receipt: updated,
      });
    } catch (err: any) {
      console.error('Update receipt error:', err);
      if (err.message && err.message.includes('not found')) {
        return res.status(404).json({ success: false, error: 'Receipt not found.' });
      }
      return res.status(500).json({ success: false, error: err.message || 'Unable to update receipt.' });
    }
  });

  // DELETE /receipts/:serialNumber (Protected)
  router.delete('/receipts/:serialNumber', requireAuth, async (req: AuthRequest, res: Response) => {
    try {
      const { serialNumber } = req.params;
      const deleted = await deleteReceipt(serialNumber);
      if (!deleted) {
        return res.status(404).json({ success: false, error: 'Receipt not found or already deleted.' });
      }
      return res.json({ success: true, message: 'Receipt deleted successfully' });
    } catch (err: any) {
      console.error('Delete receipt error:', err);
      return res.status(500).json({ success: false, error: 'Unable to delete receipt.' });
    }
  });

  // Mount at both /api and / so it works regardless of Vercel rewrite prefix
  app.use('/api', router);
  app.use('/', router);

  return app;
}
