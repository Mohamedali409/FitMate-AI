import { Schema, model, Document, Types } from 'mongoose';

export type RevocationReason =
  | 'logout'
  | 'rotation'
  | 'reuse_detected'
  | 'password_reset'
  | 'account_deletion';

export interface IRefreshToken {
  userId: Types.ObjectId;
  hashedToken: string;
  tokenFamily: string;
  replacedByTokenHash?: string | null;
  encryptedSuccessorToken?: string | null; // Ephemeral AES-256-GCM recovery blob (DB-036)
  isRevoked: boolean;
  revokedAt?: Date | null;
  revocationReason?: RevocationReason | null;
  rotatedAt?: Date | null;
  expiresAt: Date;
  truncatedUserAgent: string;
  ipHash: string;
  schemaVersion: number;
  createdAt: Date;
  updatedAt: Date;
}

export interface IRefreshTokenDocument
  extends Document<Types.ObjectId>,
    IRefreshToken {
  id: string;
}

const RefreshTokenSchema = new Schema<IRefreshTokenDocument>(
  {
    userId: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: [true, 'User ID reference is required'],
      // Covered by compound index { userId: 1, isRevoked: 1 }
    },
    hashedToken: {
      type: String,
      required: [true, 'Hashed token string is required'],
      match: [/^[a-f0-9]{64}$/, 'Hashed token must be a valid 64-character SHA-256 hex string'],
    },
    tokenFamily: {
      type: String,
      required: [true, 'Token family identifier is required'],
      match: [
        /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i,
        'Token family must be a valid UUID',
      ],
    },
    replacedByTokenHash: {
      type: String,
      default: null,
      match: [/^[a-f0-9]{64}$/, 'ReplacedByTokenHash must be a valid 64-character SHA-256 hex string'],
    },
    encryptedSuccessorToken: {
      type: String,
      select: false, // Security: Never projected by default; strictly for 30s grace recovery
      default: null,
    },
    isRevoked: {
      type: Boolean,
      default: false,
      required: true,
    },
    revokedAt: {
      type: Date,
      default: null,
    },
    revocationReason: {
      type: String,
      enum: {
        values: ['logout', 'rotation', 'reuse_detected', 'password_reset', 'account_deletion'],
        message: '{VALUE} is not an authorized revocation reason',
      },
      default: null,
    },
    rotatedAt: {
      type: Date,
      default: null,
    },
    expiresAt: {
      type: Date,
      required: [true, 'Expiration timestamp is required'],
    },
    truncatedUserAgent: {
      type: String,
      maxlength: [100, 'User agent snippet cannot exceed 100 characters'],
      trim: true,
      default: 'Unknown Device',
    },
    ipHash: {
      type: String,
      required: [true, 'IP hash is required for security audit'],
      match: [/^[a-f0-9]{64}$/, 'IP hash must be a valid 64-character SHA-256 hex string'],
    },
    schemaVersion: {
      type: Number,
      default: 1,
      required: true,
    },
  },
  {
    timestamps: true,
    versionKey: false,
    toJSON: {
      transform(_doc, ret: Record<string, any>) {
        ret.id = ret._id?.toString() || ret.id;
        delete ret._id;
        delete ret.__v;
        delete ret.hashedToken;
        delete ret.replacedByTokenHash;
        delete ret.encryptedSuccessorToken;
      },
    },
    toObject: {
      transform(_doc, ret: Record<string, any>) {
        ret.id = ret._id?.toString() || ret.id;
        delete ret._id;
        delete ret.__v;
        delete ret.hashedToken;
        delete ret.replacedByTokenHash;
        delete ret.encryptedSuccessorToken;
      },
    },
  }
);

// Indexes
RefreshTokenSchema.index({ hashedToken: 1 }, { unique: true, name: 'uniq_hashedToken' });
RefreshTokenSchema.index({ userId: 1, isRevoked: 1 }, { name: 'idx_userId_isRevoked' });
RefreshTokenSchema.index({ tokenFamily: 1 }, { name: 'idx_tokenFamily' });
RefreshTokenSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0, name: 'ttl_expiresAt' });

export const RefreshTokenModel = model<IRefreshTokenDocument>(
  'RefreshToken',
  RefreshTokenSchema,
  'refresh_tokens'
);
