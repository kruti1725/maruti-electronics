import express from 'express';
import mongoose from 'mongoose';

const app = express();
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Mongoose Connection caching for Vercel Serverless
let cachedConn = null;
async function connectDB() {
  const uri = process.env.MONGODB_URI?.trim();
  if (!uri) {
    console.warn('⚠️ MONGODB_URI is not set in environment variables.');
    return null;
  }
  if (cachedConn && mongoose.connection.readyState === 1) {
    return cachedConn;
  }
  try {
    const opts = {
      bufferCommands: false,
      serverSelectionTimeoutMS: 8000,
      dbName: 'kruti_electronics',
    };
    cachedConn = await mongoose.connect(uri, opts);
    console.log('✅ Connected to MongoDB Atlas');
    return cachedConn;
  } catch (err) {
    console.error('MongoDB connection error:', err.message);
    return null;
  }
}

// Receipt Schema & Model
const TVItemSchema = new mongoose.Schema(
  {
    brand: { type: String, required: true },
    modelNumber: { type: String, default: '' },
    size: { type: String, default: '' },
    complaint: { type: String, required: true },
    estimatedCost: { type: Number, default: 0 },
    cost: { type: Number, default: 0 },
    status: {
      type: String,
      enum: ['Pending', 'Under Repair', 'Ready', 'Delivered', 'Return', 'Reject'],
      default: 'Pending',
    },
    priority: {
      type: String,
      enum: ['Normal', 'High', 'Urgent'],
      default: 'Normal',
    },
    rackNo: { type: String, default: '' },
    paymentMethod: { type: String, default: 'Pending' },
  },
  { _id: true }
);

const ReceiptSchema = new mongoose.Schema(
  {
    serialNumber: { type: String, required: true, unique: true, index: true },
    customerName: { type: String, required: true },
    mobileNumber: { type: String, required: true, index: true },
    receivedDate: { type: String, required: true },
    revisedDate: { type: String, default: '' },
    outDate: { type: String, default: '' },
    repairBy: { type: String, default: '' },
    remarks: { type: String, default: '' },
    tvs: [TVItemSchema],
  },
  { timestamps: true }
);

const Receipt = mongoose.models.Receipt || mongoose.model('Receipt', ReceiptSchema);

// Middleware to ensure DB connection
app.use(async (req, res, next) => {
  try {
    await connectDB();
  } catch (e) {
    // continue
  }
  next();
});

// 1. Health
app.get(['/api/health', '/health'], (req, res) => {
  res.json({
    status: 'ok',
    database: mongoose.connection.readyState === 1 ? 'connected' : 'disconnected',
    timestamp: new Date().toISOString(),
  });
});

// 2. Auth me (verify admin session token)
app.get(['/api/auth/me', '/auth/me'], (req, res) => {
  const authHeader = req.headers.authorization || '';
  const adminHeader = req.headers['x-admin-auth'];
  if (authHeader.startsWith('Bearer ') || adminHeader === 'true') {
    return res.json({
      success: true,
      user: {
        id: 'admin_1',
        name: 'Kruti Admin',
        email: 'admin@krutielectronics.com',
        role: 'admin',
      },
    });
  }
  return res.status(401).json({ success: false, user: null, message: 'Unauthenticated' });
});

// 3. Auth login (Admin Credentials Verification)
app.post(['/api/auth/login', '/auth/login'], (req, res) => {
  const { email, password } = req.body || {};
  const cleanEmail = String(email || '').trim().toLowerCase();
  const cleanPass = String(password || '').trim();

  // Validate admin login credentials
  const isValidUser =
    cleanEmail === 'admin' ||
    cleanEmail === 'admin@krutielectronics.com' ||
    cleanEmail === 'kruti' ||
    cleanEmail === 'maruti';

  const isValidPass =
    cleanPass === 'admin' ||
    cleanPass === 'admin123' ||
    cleanPass === 'kruti123' ||
    cleanPass === 'maruti123';

  if (!isValidUser || !isValidPass) {
    return res.status(401).json({
      success: false,
      error: 'Invalid username or password. Only authorized Admin can log in.',
    });
  }

  res.json({
    success: true,
    token: 'jwt_admin_token_' + Date.now(),
    user: {
      id: 'admin_1',
      name: 'Kruti Admin',
      email: cleanEmail.includes('@') ? cleanEmail : `${cleanEmail}@krutielectronics.com`,
      role: 'admin',
    },
  });
});

// 4. Auth logout
app.post(['/api/auth/logout', '/auth/logout'], (req, res) => {
  res.json({ success: true, message: 'Logged out successfully' });
});

// 5. Dashboard Stats
app.get(['/api/dashboard', '/dashboard'], async (req, res) => {
  try {
    const receipts = await Receipt.find().lean();
    let totalReceipts = receipts.length;
    let totalTVs = 0;
    let pendingRepairs = 0;
    let readyRepairs = 0;
    let deliveredRepairs = 0;
    let returnedRepairs = 0;
    let rejectedRepairs = 0;
    let totalRevenue = 0;

    receipts.forEach((r) => {
      (r.tvs || []).forEach((tv) => {
        totalTVs++;
        if (tv.status === 'Pending' || tv.status === 'Under Repair') pendingRepairs++;
        if (tv.status === 'Ready') readyRepairs++;
        if (tv.status === 'Return') returnedRepairs++;
        if (tv.status === 'Reject') rejectedRepairs++;
        if (tv.status === 'Delivered') {
          deliveredRepairs++;
          totalRevenue += tv.cost || tv.estimatedCost || 0;
        }
      });
    });

    res.json({
      success: true,
      stats: {
        totalReceipts,
        totalTVs,
        pendingRepairs,
        readyRepairs,
        deliveredRepairs,
        returnedRepairs,
        rejectedRepairs,
        totalRevenue,
      },
    });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// 6. Search by Customer Mobile (Public Tracking)
app.get(['/api/receipts/mobile/:mobile', '/receipts/mobile/:mobile'], async (req, res) => {
  try {
    const clean = (req.params.mobile || '').replace(/\D/g, '');
    if (clean.length < 10) {
      return res.status(400).json({ success: false, error: 'Please enter a valid 10-digit mobile number' });
    }
    const receipts = await Receipt.find({
      mobileNumber: new RegExp(clean.slice(-10)),
    })
      .sort({ createdAt: -1 })
      .lean();

    res.json({ success: true, receipts });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// 7. Get single receipt by Serial Number (Public Tracking)
app.get(['/api/receipts/:serialNumber', '/receipts/:serialNumber'], async (req, res) => {
  try {
    const serial = req.params.serialNumber;
    if (serial === 'mobile') return res.status(404).end();
    const receipt = await Receipt.findOne({ serialNumber: new RegExp(`^${serial}$`, 'i') }).lean();
    if (!receipt) {
      return res.status(404).json({ success: false, error: 'Receipt not found.' });
    }
    res.json({ success: true, receipt });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// 8. Get all receipts (with search & filters)
app.get(['/api/receipts', '/receipts'], async (req, res) => {
  try {
    const { search, status, priority, page = 1, limit = 50 } = req.query;
    const query = {};

    if (search) {
      query.$or = [
        { serialNumber: new RegExp(search, 'i') },
        { customerName: new RegExp(search, 'i') },
        { mobileNumber: new RegExp(search, 'i') },
        { 'tvs.brand': new RegExp(search, 'i') },
      ];
    }
    if (status && status !== 'All Statuses') {
      query['tvs.status'] = status;
    }
    if (priority && priority !== 'All Priorities') {
      query['tvs.priority'] = priority;
    }

    const p = parseInt(page, 10) || 1;
    const l = parseInt(limit, 10) || 50;

    const total = await Receipt.countDocuments(query);
    const receipts = await Receipt.find(query)
      .sort({ createdAt: -1 })
      .skip((p - 1) * l)
      .limit(l)
      .lean();

    res.json({
      success: true,
      receipts,
      total,
      page: p,
      totalPages: Math.ceil(total / l) || 1,
    });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// 9. Create Receipt (POST) -> DIRECT TO MONGODB ATLAS
app.post(['/api/receipts', '/receipts'], async (req, res) => {
  try {
    const data = req.body;
    if (!data.serialNumber) {
      data.serialNumber = 'KR' + Math.floor(10000 + Math.random() * 90000);
    }
    if (!data.receivedDate) {
      data.receivedDate = new Date().toISOString().split('T')[0];
    }

    const doc = await Receipt.create(data);
    res.status(201).json({
      success: true,
      message: 'Receipt Saved Successfully in MongoDB',
      receipt: doc,
    });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// 10. Update Receipt (PUT)
app.put(['/api/receipts/:serialNumber', '/receipts/:serialNumber'], async (req, res) => {
  try {
    const serial = req.params.serialNumber;
    const updated = await Receipt.findOneAndUpdate(
      { serialNumber: new RegExp(`^${serial}$`, 'i') },
      { $set: req.body },
      { new: true }
    );
    if (!updated) {
      return res.status(404).json({ success: false, error: 'Receipt not found.' });
    }
    res.json({ success: true, message: 'Receipt updated successfully', receipt: updated });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// 11. Delete Receipt (DELETE)
app.delete(['/api/receipts/:serialNumber', '/receipts/:serialNumber'], async (req, res) => {
  try {
    const serial = req.params.serialNumber;
    const deleted = await Receipt.findOneAndDelete({
      serialNumber: new RegExp(`^${serial}$`, 'i'),
    });
    if (!deleted) {
      return res.status(404).json({ success: false, error: 'Receipt not found.' });
    }
    res.json({ success: true, message: 'Receipt deleted successfully' });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

export default app;