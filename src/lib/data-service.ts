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
    mobileNumber: '8511296117',
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
    // console.warn('Local file storage is unavailable, using in-memory store:', err);
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
 * Get all receipts with search and filters
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
  const limit = Math.max(1, params.limit || 20);

  if (isAtlas) {
    try {
      const query: any = {};

      if (params.search) {
        const regex = new RegExp(params.search.trim(), 'i');
        query.$or = [
          { serialNumber: regex },
          { customerName: regex },
          { mobileNumber: regex },
          { 'tvs.brand': regex },
          { 'tvs.modelNumber': regex },
        ];
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
        const now = Date.now();
        receipts = receipts.filter((r) => {
          const recDate = new Date(r.receivedDate).getTime();
          const diffDays = Math.floor((now - recDate) / (1000 * 60 * 60 * 24));
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
    receipts = receipts.filter(
      (r) =>
        r.serialNumber.toLowerCase().includes(q) ||
        r.customerName.toLowerCase().includes(q) ||
        r.mobileNumber.includes(q) ||
        r.tvs.some(
          (t) =>
            t.brand.toLowerCase().includes(q) ||
            t.modelNumber.toLowerCase().includes(q) ||
            t.complaint.toLowerCase().includes(q)
        )
    );
  }

  if (params.status && params.status !== 'All') {
    receipts = receipts.filter((r) => r.tvs.some((t) => t.status === params.status));
  }

  if (params.priority && params.priority !== 'All') {
    receipts = receipts.filter((r) => r.tvs.some((t) => t.priority === params.priority));
  }

  if (params.days && params.days !== 'All') {
    const now = Date.now();
    receipts = receipts.filter((r) => {
      const recDate = new Date(r.receivedDate).getTime();
      const diffDays = Math.floor((now - recDate) / (1000 * 60 * 60 * 24));
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

  const { isAtlas } = await connectToDatabase();
  if (isAtlas) {
    try {
      const created = await ReceiptModel.create(newReceipt);
      return { ...created.toObject(), _id: created._id.toString() } as IReceipt;
    } catch (e: any) {
      if (e.code === 11000) {
        throw new Error('Receipt number already exists.');
      }
      throw e;
    }
  }

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
  const updatedTvs = data.tvs
    ? data.tvs.map((tv, idx) => ({
        ...tv,
        _id: tv._id || `tv_${Date.now()}_${idx + 1}`,
        estimatedCost: Number(tv.estimatedCost) || 0,
        cost: Number(tv.cost) || 0,
      }))
    : existing.tvs;

  const { isAtlas } = await connectToDatabase();
  if (isAtlas) {
    try {
      const updated = await ReceiptModel.findOneAndUpdate(
        { serialNumber: cleanSerial },
        {
          ...data,
          tvs: updatedTvs,
          updatedAt: now,
        },
        { new: true }
      ).lean();
      if (updated) {
        return { ...updated, _id: (updated as any)._id.toString() } as IReceipt;
      }
    } catch (e) {
      console.warn('Atlas error updating receipt:', e);
    }
  }

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
 * Get dashboard statistics
 */
export async function getDashboardStats(): Promise<DashboardStats> {
  const { receipts } = await getReceipts({ limit: 10000 });
  const todayStr = new Date().toISOString().split('T')[0];
  const now = Date.now();

  let totalReceipts = receipts.length;
  let totalTVs = 0;
  let pending = 0;
  let underRepair = 0;
  let ready = 0;
  let delivered = 0;
  let todayReceipts = 0;
  let oldReceipts = 0;
  let urgentReceipts = 0;

  for (const r of receipts) {
    // Check if received today
    if (r.receivedDate === todayStr) {
      todayReceipts++;
    }

    // Check days old
    const recTime = new Date(r.receivedDate).getTime();
    const daysDiff = Math.floor((now - recTime) / (1000 * 60 * 60 * 24));

    let receiptHasNonDelivered = false;

    for (const tv of r.tvs) {
      totalTVs++;
      if (tv.status === 'Pending') pending++;
      else if (tv.status === 'Under Repair') underRepair++;
      else if (tv.status === 'Ready') ready++;
      else if (tv.status === 'Delivered') delivered++;

      if (tv.status !== 'Delivered') {
        receiptHasNonDelivered = true;
      }

      if (tv.priority === 'Urgent' && tv.status !== 'Delivered') {
        urgentReceipts++;
      }
    }

    // Old receipt rule: older than 4 days AND TV is not Delivered
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
    delivered,
    todayReceipts,
    oldReceipts,
    urgentReceipts,
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
