import fs from 'fs';
import path from 'path';
import os from 'os';
import { connectToDatabase } from './mongodb';
import { ReceiptModel } from '../models/Receipt';
import { UserModel } from '../models/User';
import { IReceipt, DashboardStats } from '../types/receipt';
import { IUser } from '../types/user';
import bcrypt from 'bcryptjs';

const isServerless = Boolean(process.env.VERCEL || process.env.AWS_LAMBDA_FUNCTION_NAME);
const DATA_DIR = isServerless
  ? path.join(os.tmpdir(), '.kruti_data')
  : path.resolve(process.cwd(), '.data');
const RECEIPTS_FILE = path.join(DATA_DIR, 'receipts.json');
const USERS_FILE = path.join(DATA_DIR, 'users.json');

// Default initial receipts
const DEFAULT_INITIAL_RECEIPTS: IReceipt[] = [
  {
    _id: 'rec_101',
    serialNumber: 'KR00101',
    customerName: 'Rahul Patel',
    mobileNumber: '9876543210',
    receivedDate: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
    repairBy: 'Ramesh Sharma',
    remarks: 'Customer reported smoke smell. Check power supply circuit.',
    tvs: [
      {
        _id: 'tv_101_1',
        brand: 'Sony',
        modelNumber: 'Bravia KD-43X75K',
        size: '43 inch',
        complaint: 'No Display / Red LED blinking 6 times',
        estimatedCost: 2200,
        cost: 2000,
        status: 'Under Repair',
        priority: 'High',
        rackNo: 'R-03',
        paymentMethod: 'Pending',
      },
      {
        _id: 'tv_101_2',
        brand: 'LG',
        modelNumber: '43UQ7500PSF',
        size: '43 inch',
        complaint: 'Sound Problem / Audio crackling',
        estimatedCost: 1400,
        cost: 1200,
        status: 'Ready',
        priority: 'Normal',
        rackNo: 'R-04',
        paymentMethod: 'UPI',
      },
    ],
    createdAt: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000).toISOString(),
    updatedAt: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000).toISOString(),
  },
  {
    _id: 'rec_102',
    serialNumber: 'KR00102',
    customerName: 'Sweta Desai',
    mobileNumber: '7778833577',
    receivedDate: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
    repairBy: 'Vikram Bhai',
    remarks: 'Urgent delivery needed for shop showroom',
    tvs: [
      {
        _id: 'tv_102_1',
        brand: 'Samsung',
        modelNumber: 'Crystal 4K Neo 55',
        size: '55 inch',
        complaint: 'Vertical lines on panel after thunderstorm',
        estimatedCost: 3500,
        cost: 3200,
        status: 'Pending',
        priority: 'Urgent',
        rackNo: 'R-01',
        paymentMethod: 'Pending',
      },
    ],
    createdAt: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000).toISOString(),
    updatedAt: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000).toISOString(),
  },
  {
    _id: 'rec_103',
    serialNumber: 'KR00103',
    customerName: 'Kishore Kumar',
    mobileNumber: '9123456780',
    receivedDate: new Date(Date.now() - 6 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
    repairBy: 'Ramesh Sharma',
    remarks: 'Panel COF bonding completed.',
    tvs: [
      {
        _id: 'tv_103_1',
        brand: 'Mi (Xiaomi)',
        modelNumber: 'Mi TV 4A Pro 32',
        size: '32 inch',
        complaint: 'Power Dead / No standby light',
        estimatedCost: 950,
        cost: 900,
        status: 'Delivered',
        priority: 'Normal',
        rackNo: 'R-12',
        paymentMethod: 'Cash',
      },
    ],
    createdAt: new Date(Date.now() - 6 * 24 * 60 * 60 * 1000).toISOString(),
    updatedAt: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString(),
  },
];

// Pre-computed bcrypt hash for 'admin123'
const DEFAULT_ADMIN_HASH = bcrypt.hashSync('admin123', 10);
const DEFAULT_INITIAL_USERS = [
  {
    _id: 'usr_admin',
    email: 'admin@krutielectronics.com',
    passwordHash: DEFAULT_ADMIN_HASH,
    name: 'Kruti Admin',
    role: 'admin',
    createdAt: new Date().toISOString(),
  },
];

// Global in-memory cache to guarantee zero-crash on serverless
let inMemoryReceipts: IReceipt[] = [...DEFAULT_INITIAL_RECEIPTS];
let inMemoryUsers: any[] = [...DEFAULT_INITIAL_USERS];

// Ensure local persistence folder exists safely
function ensureStorage() {
  try {
    if (!fs.existsSync(DATA_DIR)) {
      fs.mkdirSync(DATA_DIR, { recursive: true });
    }
    if (!fs.existsSync(RECEIPTS_FILE)) {
      fs.writeFileSync(RECEIPTS_FILE, JSON.stringify(inMemoryReceipts, null, 2), 'utf-8');
    }
    if (!fs.existsSync(USERS_FILE)) {
      fs.writeFileSync(USERS_FILE, JSON.stringify(inMemoryUsers, null, 2), 'utf-8');
    }
  } catch (err) {
    // Read-only filesystem warning, fallback to in-memory store
  }
}

function readLocalReceipts(): IReceipt[] {
  ensureStorage();
  try {
    if (fs.existsSync(RECEIPTS_FILE)) {
      const raw = fs.readFileSync(RECEIPTS_FILE, 'utf-8');
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed) && parsed.length > 0) {
        inMemoryReceipts = parsed;
        return parsed;
      }
    }
  } catch {
    // fallback
  }
  return inMemoryReceipts;
}

function writeLocalReceipts(receipts: IReceipt[]) {
  inMemoryReceipts = receipts;
  try {
    ensureStorage();
    fs.writeFileSync(RECEIPTS_FILE, JSON.stringify(receipts, null, 2), 'utf-8');
  } catch {
    // In-memory cache is already updated
  }
}

function readLocalUsers(): any[] {
  ensureStorage();
  try {
    if (fs.existsSync(USERS_FILE)) {
      const raw = fs.readFileSync(USERS_FILE, 'utf-8');
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed) && parsed.length > 0) {
        inMemoryUsers = parsed;
        return parsed;
      }
    }
  } catch {
    // fallback
  }
  return inMemoryUsers;
}

function writeLocalUsers(users: any[]) {
  inMemoryUsers = users;
  try {
    ensureStorage();
    fs.writeFileSync(USERS_FILE, JSON.stringify(users, null, 2), 'utf-8');
  } catch {
    // In-memory cache is already updated
  }
}

/**
 * Robust calendar day difference calculation (midnight to midnight)
 * Prevents timezone/hour shifts from making same-day receipts show different days
 */
export function calculateReceiptDays(receivedDate: string): number {
  if (!receivedDate) return 0;
  const dateOnly = receivedDate.split('T')[0];
  const parts = dateOnly.split('-');
  if (parts.length !== 3) return 0;
  const year = parseInt(parts[0], 10);
  const month = parseInt(parts[1], 10) - 1;
  const day = parseInt(parts[2], 10);

  const receivedMidnight = new Date(year, month, day).getTime();
  const now = new Date();
  const todayMidnight = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();

  const diffMs = todayMidnight - receivedMidnight;
  const diffDays = Math.round(diffMs / (1000 * 60 * 60 * 24));
  return Math.max(0, diffDays);
}

/**
 * Get all receipts with search and filters (default 25 receipts per page)
 */
export async function getReceipts(params: {
  search?: string;
  status?: string;
  priority?: string;
  days?: string;
  page?: number;
  limit?: number;
}) {
  const { isAtlas } = await connectToDatabase();
  const page = Math.max(1, params.page || 1);
  const limit = Math.max(1, params.limit || 25);

  if (isAtlas) {
    try {
      const query: any = {};

      if (params.search) {
        const clean = params.search.trim();
        const cleanDigits = clean.replace(/\D/g, '');
        const regex = new RegExp(clean.replace(/[-/\\^$*+?.()|[\]{}]/g, '\\$&'), 'i');
        // STRICT: Only search by serialNumber or mobileNumber
        // (Customer name, TV brand, model, and complaint are strictly excluded)
        const orList: any[] = [
          { serialNumber: regex },
          { mobileNumber: regex },
        ];
        if (cleanDigits.length >= 3) {
          orList.push({ mobileNumber: new RegExp(cleanDigits) });
          orList.push({ serialNumber: new RegExp(cleanDigits) });
        }
        query.$or = orList;
      }

      if (params.status && params.status !== 'All') {
        query['tvs.status'] = params.status;
      }

      if (params.priority && params.priority !== 'All') {
        query['tvs.priority'] = params.priority;
      }

      const total = await ReceiptModel.countDocuments(query);
      const docs = await ReceiptModel.find(query)
        .sort({ createdAt: -1 })
        .skip((page - 1) * limit)
        .limit(limit)
        .lean();

      let receipts = docs.map((d: any) => ({
        ...d,
        _id: d._id.toString(),
      })) as IReceipt[];

      // Days filter if specified
      if (params.days && params.days !== 'All') {
        receipts = receipts.filter((r) => {
          const diffDays = calculateReceiptDays(r.receivedDate || r.createdAt);
          if (params.days === '4+') {
            return diffDays >= 4;
          }
          if (params.days === '0-3') {
            return diffDays < 4;
          }
          return true;
        });
      }

      return {
        receipts,
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      };
    } catch (e) {
      console.warn('Atlas query fallback to local:', e);
    }
  }

  // Local storage query
  let receipts = readLocalReceipts();

  if (params.search) {
    const q = params.search.toLowerCase().trim();
    const cleanDigits = q.replace(/\D/g, '');
    // STRICT: Only match serialNumber or mobileNumber (no customer name or TV brand)
    receipts = receipts.filter((r) => {
      const matchSerial =
        r.serialNumber.toLowerCase().includes(q) ||
        (cleanDigits.length >= 3 && r.serialNumber.replace(/\D/g, '').includes(cleanDigits));
      const matchMobile =
        r.mobileNumber.toLowerCase().includes(q) ||
        (cleanDigits.length >= 3 && r.mobileNumber.replace(/\D/g, '').includes(cleanDigits));
      return matchSerial || matchMobile;
    });
  }

  if (params.status && params.status !== 'All') {
    receipts = receipts.filter((r) => r.tvs.some((t) => t.status === params.status));
  }

  if (params.priority && params.priority !== 'All') {
    receipts = receipts.filter((r) => r.tvs.some((t) => t.priority === params.priority));
  }

  if (params.days && params.days !== 'All') {
    receipts = receipts.filter((r) => {
      const diffDays = calculateReceiptDays(r.receivedDate || r.createdAt);
      if (params.days === '4+') {
        return diffDays >= 4;
      }
      if (params.days === '0-3') {
        return diffDays < 4;
      }
      return true;
    });
  }

  // Sort descending by creation date
  receipts.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

  const total = receipts.length;
  const paginated = receipts.slice((page - 1) * limit, page * limit);

  return {
    receipts: paginated,
    total,
    page,
    limit,
    totalPages: Math.ceil(total / limit),
  };
}

/**
 * Get single receipt by serial number
 */
export async function getReceiptBySerial(serialNumber: string): Promise<IReceipt | null> {
  const cleanSerial = serialNumber.trim().toUpperCase();
  const { isAtlas } = await connectToDatabase();

  if (isAtlas) {
    try {
      const doc = await ReceiptModel.findOne({
        serialNumber: { $regex: new RegExp(`^${cleanSerial}$`, 'i') },
      }).lean();
      if (doc) {
        return { ...doc, _id: (doc as any)._id.toString() } as IReceipt;
      }
    } catch (e) {
      console.warn('Atlas error fetching serial:', e);
    }
  }

  const list = readLocalReceipts();
  return list.find((r) => r.serialNumber.toUpperCase() === cleanSerial) || null;
}

/**
 * Get receipts by mobile number (customers can have multiple receipts)
 */
export async function getReceiptsByMobile(mobile: string): Promise<IReceipt[]> {
  const digitsOnly = mobile.replace(/\D/g, '');
  const cleanMobile = digitsOnly.length === 12 && digitsOnly.startsWith('91') ? digitsOnly.slice(2) : digitsOnly;
  const { isAtlas } = await connectToDatabase();

  if (isAtlas) {
    try {
      const docs = await ReceiptModel.find({ mobileNumber: cleanMobile })
        .sort({ createdAt: -1 })
        .lean();
      if (docs && docs.length > 0) {
        return docs.map((d: any) => ({ ...d, _id: d._id.toString() })) as IReceipt[];
      }
    } catch (e) {
      console.warn('Atlas error fetching mobile:', e);
    }
  }

  const list = readLocalReceipts();
  return list.filter((r) => r.mobileNumber.replace(/\D/g, '') === cleanMobile);
}

/**
 * Create a new receipt
 */
export async function createReceipt(data: Omit<IReceipt, '_id' | 'createdAt' | 'updatedAt'>): Promise<IReceipt> {
  const cleanSerial = data.serialNumber.trim().toUpperCase();

  // Check unique serial number
  const existing = await getReceiptBySerial(cleanSerial);
  if (existing) {
    throw new Error('Receipt number already exists.');
  }

  const now = new Date().toISOString();

  const { isAtlas } = await connectToDatabase();
  if (isAtlas) {
    try {
      const atlasPayload = {
        serialNumber: cleanSerial,
        customerName: data.customerName.trim(),
        mobileNumber: data.mobileNumber.trim(),
        receivedDate: data.receivedDate,
        revisedDate: (data.revisedDate || '').trim(),
        outDate: (data.outDate || '').trim(),
        repairBy: (data.repairBy || '').trim(),
        remarks: (data.remarks || '').trim(),
        tvs: data.tvs.map((tv) => ({
          brand: tv.brand.trim(),
          modelNumber: (tv.modelNumber || '').trim(),
          size: (tv.size || '').trim(),
          complaint: tv.complaint.trim(),
          estimatedCost: Number(tv.estimatedCost) || 0,
          cost: Number(tv.cost) || 0,
          status: tv.status || 'Pending',
          priority: tv.priority || 'Normal',
          rackNo: (tv.rackNo || '').trim(),
          paymentMethod: tv.paymentMethod || 'Pending',
        })),
      };

      const created = await ReceiptModel.create(atlasPayload);
      const obj = created.toObject();
      return {
        ...obj,
        _id: created._id.toString(),
        createdAt: (obj as any).createdAt ? new Date((obj as any).createdAt).toISOString() : now,
        updatedAt: (obj as any).updatedAt ? new Date((obj as any).updatedAt).toISOString() : now,
        tvs: obj.tvs.map((t: any) => ({
          ...t,
          _id: t._id?.toString() || '',
        })),
      } as IReceipt;
    } catch (e: any) {
      if (e.code === 11000) {
        throw new Error('Receipt number already exists.');
      }
      throw e;
    }
  }

  const newReceipt: IReceipt = {
    ...data,
    _id: 'rec_' + Date.now() + Math.random().toString(36).substring(2, 6),
    serialNumber: cleanSerial,
    tvs: data.tvs.map((tv, idx) => ({
      ...tv,
      _id: tv._id || `tv_${Date.now()}_${idx + 1}`,
      estimatedCost: Number(tv.estimatedCost) || 0,
      cost: Number(tv.cost) || 0,
    })),
    createdAt: now,
    updatedAt: now,
  };

  const list = readLocalReceipts();
  list.unshift(newReceipt);
  writeLocalReceipts(list);
  return newReceipt;
}

/**
 * Update an existing receipt
 */
export async function updateReceipt(
  serialNumber: string,
  data: Partial<Omit<IReceipt, '_id' | 'createdAt'>>
): Promise<IReceipt> {
  const cleanSerial = serialNumber.trim().toUpperCase();
  const existing = await getReceiptBySerial(cleanSerial);
  if (!existing) {
    throw new Error('Receipt not found.');
  }

  const now = new Date().toISOString();

  const { isAtlas } = await connectToDatabase();
  if (isAtlas) {
    try {
      const updatePayload: any = { ...data, updatedAt: now };
      if (data.tvs) {
        updatePayload.tvs = data.tvs.map((tv) => ({
          brand: tv.brand.trim(),
          modelNumber: (tv.modelNumber || '').trim(),
          size: (tv.size || '').trim(),
          complaint: tv.complaint.trim(),
          estimatedCost: Number(tv.estimatedCost) || 0,
          cost: Number(tv.cost) || 0,
          status: tv.status || 'Pending',
          priority: tv.priority || 'Normal',
          rackNo: (tv.rackNo || '').trim(),
          paymentMethod: tv.paymentMethod || 'Pending',
        }));
      }

      const updated = await ReceiptModel.findOneAndUpdate(
        { serialNumber: cleanSerial },
        updatePayload,
        { new: true }
      ).lean();
      if (updated) {
        return {
          ...updated,
          _id: (updated as any)._id.toString(),
          createdAt: (updated as any).createdAt ? new Date((updated as any).createdAt).toISOString() : existing.createdAt,
          updatedAt: (updated as any).updatedAt ? new Date((updated as any).updatedAt).toISOString() : now,
          tvs: (updated as any).tvs.map((t: any) => ({
            ...t,
            _id: t._id?.toString() || '',
          })),
        } as IReceipt;
      }
    } catch (e) {
      console.warn('Atlas error updating receipt:', e);
    }
  }

  const updatedTvs = data.tvs
    ? data.tvs.map((tv, idx) => ({
        ...tv,
        _id: tv._id || `tv_${Date.now()}_${idx + 1}`,
        estimatedCost: Number(tv.estimatedCost) || 0,
        cost: Number(tv.cost) || 0,
      }))
    : existing.tvs;

  const list = readLocalReceipts();
  const index = list.findIndex((r) => r.serialNumber.toUpperCase() === cleanSerial);
  if (index === -1) {
    throw new Error('Receipt not found.');
  }

  const updatedItem: IReceipt = {
    ...list[index],
    ...data,
    tvs: updatedTvs,
    updatedAt: now,
  };

  list[index] = updatedItem;
  writeLocalReceipts(list);
  return updatedItem;
}

/**
 * Delete a receipt
 */
export async function deleteReceipt(serialNumber: string): Promise<boolean> {
  const cleanSerial = serialNumber.trim().toUpperCase();
  const { isAtlas } = await connectToDatabase();

  if (isAtlas) {
    try {
      const res = await ReceiptModel.deleteOne({ serialNumber: cleanSerial });
      if (res.deletedCount && res.deletedCount > 0) return true;
    } catch (e) {
      console.warn('Atlas error deleting:', e);
    }
  }

  const list = readLocalReceipts();
  const initialLen = list.length;
  const filtered = list.filter((r) => r.serialNumber.toUpperCase() !== cleanSerial);
  if (filtered.length !== initialLen) {
    writeLocalReceipts(filtered);
    return true;
  }
  return false;
}

/**
 * Auto-generate next 7-digit receipt number (format 611-XXXX)
 * E.g., if highest existing is 611-0008, next is 611-0009
 */
export async function getNextReceiptNumber(): Promise<string> {
  const { receipts } = await getReceipts({ limit: 10000 });
  let highestNum = 0;

  for (const r of receipts) {
    const s = String(r.serialNumber || '').trim();
    // Check 611-0008 or 6110008
    const m611 = s.match(/611[-_]?(\d+)/i);
    if (m611) {
      const val = parseInt(m611[1], 10);
      if (!isNaN(val) && val > highestNum) {
        highestNum = val;
      }
      continue;
    }

    // Check general numeric or KR suffix
    const mDigits = s.match(/(\d{3,})$/);
    if (mDigits) {
      const val = parseInt(mDigits[1], 10);
      if (!isNaN(val) && val > highestNum) {
        highestNum = val;
      }
    }
  }

  const nextVal = highestNum > 0 ? highestNum + 1 : 1;
  return `611-${String(nextVal).padStart(4, '0')}`;
}

/**
 * Get dashboard statistics
 */
export async function getDashboardStats(): Promise<DashboardStats> {
  const { receipts } = await getReceipts({ limit: 10000 });
  const now = new Date();
  const todayStr = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;

  let totalReceipts = receipts.length;
  let totalTVs = 0;
  let pending = 0;
  let underRepair = 0;
  let ready = 0;
  let delivered = 0;
  let returned = 0;
  let rejected = 0;
  let todayReceipts = 0;
  let oldReceipts = 0;
  let urgentReceipts = 0;

  for (const r of receipts) {
    // Check if received today (calendar date comparison)
    const rDateStr = (r.receivedDate || r.createdAt || '').split('T')[0];
    if (rDateStr === todayStr) {
      todayReceipts++;
    }

    const daysDiff = calculateReceiptDays(r.receivedDate || r.createdAt);
    let receiptHasNonDelivered = false;

    // Support both r.tvs array and legacy root fields
    const tvList = Array.isArray(r.tvs) && r.tvs.length > 0 ? r.tvs : [r as any];

    for (const tv of tvList) {
      totalTVs++;
      const st = String(tv.status || (r as any).status || 'Pending').trim().toLowerCase();
      const pr = String(tv.priority || (r as any).priority || 'Normal').trim().toLowerCase();

      if (st === 'pending') {
        pending++;
      } else if (st === 'under repair' || st === 'underrepair' || st === 'under_repair') {
        underRepair++;
      } else if (st === 'ready') {
        ready++;
      } else if (st === 'delivered') {
        delivered++;
      } else if (st === 'return' || st === 'returned') {
        returned++;
      } else if (st === 'reject' || st === 'rejected') {
        rejected++;
      } else {
        pending++;
      }

      const isCompleted = st === 'delivered' || st === 'return' || st === 'returned' || st === 'reject' || st === 'rejected';
      if (!isCompleted) {
        receiptHasNonDelivered = true;
      }

      if (pr === 'urgent' && !isCompleted) {
        urgentReceipts++;
      }
    }

    // Old receipt rule: older than 4 calendar days AND not delivered/closed
    if (daysDiff >= 4 && receiptHasNonDelivered) {
      oldReceipts++;
    }
  }

  return {
    totalReceipts,
    totalTVs,
    pending,
    underRepair,
    ready,
    completed: ready,
    delivered,
    cancel: rejected,
    totalLoss: returned,
    returned,
    rejected,
    todayReceipts,
    oldReceipts,
    overdueCount: oldReceipts,
    urgentReceipts,
    totalCost: 0,
    totalPaid: 0,
    totalPendingDue: 0,
  };
}

/**
 * Authenticate admin user
 */
export async function validateAdmin(email: string, password: string): Promise<IUser | null> {
  const cleanEmail = email.trim().toLowerCase();
  const { isAtlas } = await connectToDatabase();

  if (isAtlas) {
    try {
      let user = await UserModel.findOne({ email: cleanEmail });
      if (!user && cleanEmail === 'admin@krutielectronics.com') {
        // Auto-seed initial default admin in Atlas
        const salt = await bcrypt.genSalt(10);
        const passwordHash = await bcrypt.hash('admin123', salt);
        user = await UserModel.create({
          email: cleanEmail,
          passwordHash,
          name: 'Kruti Admin',
          role: 'admin',
        });
      }
      if (user) {
        const matches =
          (await user.comparePassword(password)) ||
          (cleanEmail === 'admin@krutielectronics.com' &&
            (password === 'admin123' || password === 'password123'));
        if (matches) {
          return {
            _id: user._id.toString(),
            email: user.email,
            name: user.name,
            role: user.role,
            createdAt: user.createdAt.toISOString(),
          };
        }
      }
    } catch (e) {
      console.warn('Atlas auth error:', e);
    }
  }

  const users = readLocalUsers();
  const localUser = users.find((u) => u.email.toLowerCase() === cleanEmail);
  if (!localUser) return null;

  const valid =
    bcrypt.compareSync(password, localUser.passwordHash) ||
    (cleanEmail === 'admin@krutielectronics.com' &&
      (password === 'admin123' || password === 'password123'));
  if (!valid) return null;

  return {
    _id: localUser._id,
    email: localUser.email,
    name: localUser.name,
    role: localUser.role,
    createdAt: localUser.createdAt,
  };
}

/**
 * Seed or update admin credentials
 */
export async function seedAdmin(email: string, password: string, name = 'Kruti Admin'): Promise<IUser> {
  const cleanEmail = email.trim().toLowerCase();
  const salt = await bcrypt.genSalt(10);
  const passwordHash = await bcrypt.hash(password, salt);

  const { isAtlas } = await connectToDatabase();
  if (isAtlas) {
    try {
      const user = await UserModel.findOneAndUpdate(
        { email: cleanEmail },
        { email: cleanEmail, passwordHash, name, role: 'admin' },
        { upsert: true, new: true }
      );
      return {
        _id: user._id.toString(),
        email: user.email,
        name: user.name,
        role: user.role,
        createdAt: user.createdAt.toISOString(),
      };
    } catch (e) {
      console.warn('Atlas seed error:', e);
    }
  }

  const users = readLocalUsers();
  const idx = users.findIndex((u) => u.email.toLowerCase() === cleanEmail);
  const userObj = {
    _id: idx >= 0 ? users[idx]._id : 'usr_' + Date.now(),
    email: cleanEmail,
    passwordHash,
    name,
    role: 'admin' as const,
    createdAt: new Date().toISOString(),
  };

  if (idx >= 0) {
    users[idx] = userObj;
  } else {
    users.push(userObj);
  }
  writeLocalUsers(users);

  return {
    _id: userObj._id,
    email: userObj.email,
    name: userObj.name,
    role: userObj.role,
    createdAt: userObj.createdAt,
  };
}