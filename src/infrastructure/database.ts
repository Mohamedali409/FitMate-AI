import mongoose from 'mongoose';
import { env } from '../config/env.js';
import { logger } from '../shared/logger/logger.js';

interface DatabaseState {
  isConnected: boolean;
  supportsTransactions: boolean;
}

const state: DatabaseState = {
  isConnected: false,
  supportsTransactions: false,
};

export async function connectDatabase(uri?: string): Promise<typeof mongoose> {
  const targetUri = uri || env.MONGODB_URI;

  mongoose.set('strictQuery', true);

  // Set up connection event listeners
  mongoose.connection.on('connected', () => {
    state.isConnected = true;
    logger.info({ uri: maskMongoUri(targetUri) }, '[Database] MongoDB connection established successfully');
  });

  mongoose.connection.on('error', (err) => {
    state.isConnected = false;
    logger.error({ err }, '[Database] MongoDB connection encountered an error');
  });

  mongoose.connection.on('disconnected', () => {
    state.isConnected = false;
    logger.warn('[Database] MongoDB connection disconnected');
  });

  mongoose.connection.on('reconnected', () => {
    state.isConnected = true;
    logger.info('[Database] MongoDB connection re-established');
  });

  try {
    const conn = await mongoose.connect(targetUri, {
      maxPoolSize: env.MONGODB_MAX_POOL_SIZE,
      minPoolSize: env.MONGODB_MIN_POOL_SIZE,
      serverSelectionTimeoutMS: 5000,
      socketTimeoutMS: 45000,
    });

    state.isConnected = true;

    // Detect if connected deployment supports multi-document transactions (requires replica set)
    state.supportsTransactions = await checkTransactionSupport();
    if (!state.supportsTransactions && env.NODE_ENV !== 'test') {
      logger.warn('[Database] Deployment is standalone; multi-document transactions are disabled. Local dev requires replica set (rs0).');
    }

    return conn;
  } catch (err) {
    state.isConnected = false;
    logger.error({ err, uri: maskMongoUri(targetUri) }, '[Database] Failed to connect to MongoDB');
    throw err;
  }
}

export async function disconnectDatabase(): Promise<void> {
  if (mongoose.connection.readyState !== 0) {
    try {
      await mongoose.disconnect();
      state.isConnected = false;
      state.supportsTransactions = false;
      logger.info('[Database] MongoDB connection cleanly closed');
    } catch (err) {
      logger.error({ err }, '[Database] Error during MongoDB disconnect');
      throw err;
    }
  }
}

export function isDatabaseConnected(): boolean {
  return state.isConnected && mongoose.connection.readyState === 1;
}

export function supportsReplicaSetTransactions(): boolean {
  return state.supportsTransactions;
}

async function checkTransactionSupport(): Promise<boolean> {
  try {
    const session = await mongoose.startSession();
    try {
      // In standalone instances, withTransaction throws an unsupported transaction error
      await session.withTransaction(async () => {
        // no-op check
      });
      await session.endSession();
      return true;
    } catch {
      await session.endSession();
      return false;
    }
  } catch {
    return false;
  }
}

function maskMongoUri(uri: string): string {
  try {
    return uri.replace(/\/\/([^:]+):([^@]+)@/, '//***:***@');
  } catch {
    return 'mongodb://***';
  }
}

