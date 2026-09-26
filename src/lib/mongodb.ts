import mongoose from 'mongoose';

const MONGODB_URI = process.env.MONGODB_URI || '';

interface MongooseCache {
  conn: typeof mongoose | null;
  promise: Promise<typeof mongoose> | null;
  lastAttempt: number;
  lastError: string | null;
}

declare global {
  // eslint-disable-next-line no-var
  var mongooseCache: MongooseCache | undefined;
}

const cached: MongooseCache = global.mongooseCache || {
  conn: null,
  promise: null,
  lastAttempt: 0,
  lastError: null,
};

if (!global.mongooseCache) {
  global.mongooseCache = cached;
}

// Cooldown period in ms if Atlas connection fails (15 seconds)
// Prevents every API request from hanging for 5 seconds when Atlas is unreachable
const RETRY_COOLDOWN_MS = 15000;

export async function connectToDatabase(): Promise<{
  isAtlas: boolean;
  mongoose: typeof mongoose | null;
  error?: string | null;
}> {
  if (!MONGODB_URI) {
    // MongoDB URI not set yet, seamlessly fallback to local JSON database
    return { isAtlas: false, mongoose: null };
  }

  // If already connected and connection is alive
  if (cached.conn && mongoose.connection.readyState === 1) {
    return { isAtlas: true, mongoose: cached.conn };
  }

  // If we had a failure recently, don't stall the user request for 5 seconds
  const timeSinceLastAttempt = Date.now() - cached.lastAttempt;
  if (!cached.conn && cached.lastError && timeSinceLastAttempt < RETRY_COOLDOWN_MS) {
    return { isAtlas: false, mongoose: null, error: cached.lastError };
  }

  if (!cached.promise) {
    cached.lastAttempt = Date.now();
    const opts: mongoose.ConnectOptions = {
      bufferCommands: false,
      serverSelectionTimeoutMS: 5000,
      dbName: 'kruti_electronics',
    };

    cached.promise = mongoose
      .connect(MONGODB_URI, opts)
      .then((m) => {
        console.log('✅ Successfully connected to MongoDB Atlas');
        cached.conn = m;
        cached.lastError = null;
        return m;
      })
      .catch((err) => {
        console.warn('⚠️ MongoDB Atlas connection warning:', err.message);
        cached.lastError = err.message;
        cached.promise = null;
        cached.conn = null;
        throw err;
      });
  }

  try {
    cached.conn = await cached.promise;
    return { isAtlas: true, mongoose: cached.conn };
  } catch (error: any) {
    console.error('MongoDB Atlas connection failed. Falling back to local storage:', error?.message);
    cached.promise = null;
    cached.conn = null;
    return { isAtlas: false, mongoose: null, error: error?.message };
  }
}

export function getDatabaseStatus() {
  const isConnected = Boolean(cached.conn && mongoose.connection.readyState === 1);
  return {
    isConfigured: Boolean(MONGODB_URI),
    isConnected,
    mode: isConnected ? 'atlas' : 'local',
    lastError: cached.lastError,
  };
}

