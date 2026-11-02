import mongoose from 'mongoose';

interface MongooseCache {
  conn: typeof mongoose | null;
  promise: Promise<typeof mongoose | null> | null;
  lastAttempt: number;
  lastError: string | null;
  lastUri: string | null;
  authFailed: boolean;
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
  lastUri: null,
  authFailed: false,
};

if (!global.mongooseCache) {
  global.mongooseCache = cached;
}

// Cooldown period in ms if Atlas connection fails:
// 30 seconds for transient network blips
// 1 hour for bad credentials/auth failure (prevents infinite warning loop & hanging user requests)
const RETRY_COOLDOWN_MS = 30000;
const AUTH_FAILURE_COOLDOWN_MS = 3600000;

export async function connectToDatabase(): Promise<{
  isAtlas: boolean;
  mongoose: typeof mongoose | null;
  error?: string | null;
}> {
  const uri = process.env.MONGODB_URI?.trim() || '';

  if (!uri) {
    // MongoDB URI not set yet, seamlessly fallback to local JSON database
    return { isAtlas: false, mongoose: null };
  }

  // If URI changed, reset the cache so the app tries the new credentials immediately
  if (cached.lastUri && cached.lastUri !== uri) {
    cached.lastAttempt = 0;
    cached.lastError = null;
    cached.authFailed = false;
    cached.promise = null;
    if (cached.conn) {
      try {
        await mongoose.disconnect();
      } catch {
        // ignore
      }
      cached.conn = null;
    }
  }
  cached.lastUri = uri;

  // If already connected and connection is alive
  if (cached.conn && mongoose.connection.readyState === 1) {
    return { isAtlas: true, mongoose: cached.conn };
  }

  // Check cooldown to ensure user requests don't stall for 5 seconds
  const timeSinceLastAttempt = Date.now() - cached.lastAttempt;
  const cooldown = cached.authFailed ? AUTH_FAILURE_COOLDOWN_MS : RETRY_COOLDOWN_MS;
  if (!cached.conn && cached.lastError && timeSinceLastAttempt < cooldown) {
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
      .connect(uri, opts)
      .then((m) => {
        console.log('✅ Successfully connected to MongoDB Atlas');
        cached.conn = m;
        cached.lastError = null;
        cached.authFailed = false;
        return m;
      })
      .catch((err) => {
        const isAuthError =
          /auth|credential|unauthorized/i.test(err?.message || '') ||
          err?.code === 18 ||
          err?.codeName === 'AuthenticationFailed';

        cached.lastError = err?.message || 'Atlas connection error';
        cached.authFailed = isAuthError;
        cached.promise = null;
        cached.conn = null;

        if (isAuthError) {
          console.log(
            '[Database] Notice: MongoDB Atlas credentials in MONGODB_URI require verification. Operating smoothly in local storage fallback mode.'
          );
        } else {
          console.log(`[Database] MongoDB Atlas status notice: ${err?.message || 'unavailable'}. Using local storage engine.`);
        }
        return null;
      });
  }

  try {
    const conn = await cached.promise;
    if (conn && mongoose.connection.readyState === 1) {
      cached.conn = conn;
      return { isAtlas: true, mongoose: cached.conn };
    }
    return { isAtlas: false, mongoose: null, error: cached.lastError || 'Not connected' };
  } catch (error: any) {
    console.log('[Database] Atlas connection fallback to local storage:', error?.message);
    cached.promise = null;
    cached.conn = null;
    return { isAtlas: false, mongoose: null, error: error?.message };
  }
}

export function getDatabaseStatus() {
  const uri = process.env.MONGODB_URI?.trim() || '';
  const isConnected = Boolean(cached.conn && mongoose.connection.readyState === 1);
  return {
    isConfigured: Boolean(uri),
    isConnected,
    mode: isConnected ? 'atlas' : 'local',
    authFailed: cached.authFailed,
    lastError: cached.lastError,
  };
}