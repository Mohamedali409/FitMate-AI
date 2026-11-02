import { Schema, model, Document, Types } from 'mongoose';

export interface IPasswordResetToken {
  userId: Types.ObjectId;
  hashedToken: string;
  expiresAt: Date;
  usedAt?: Date | null;
  ipHash: string;
  schemaVersion: number;
  createdAt: Date;
  updatedAt: Date;
}

export interface IPasswordResetTokenDocument
  extends Document<Types.ObjectId>,
    IPasswordResetToken {
  id: string;
}

const PasswordResetTokenSchema = new Schema<IPasswordResetTokenDocument>(
  {
    userId: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: [true, 'User ID reference is required'],
    },
    hashedToken: {
      type: String,
      required: [true, 'Hashed reset token string is required'],
      match: [/^[a-f0-9]{64}$/, 'Hashed token must be a valid 64-character SHA-256 hex string'],
    },
    expiresAt: {
      type: Date,
      required: [true, 'Expiration timestamp is required'],
    },
    usedAt: {
      type: Date,
      default: null,
    },
    ipHash: {
      type: String,
      required: [true, 'Requester IP hash is required'],
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
      },
    },
    toObject: {
      transform(_doc, ret: Record<string, any>) {
        ret.id = ret._id?.toString() || ret.id;
        delete ret._id;
        delete ret.__v;
        delete ret.hashedToken;
      },
    },
  }
);

// Indexes
PasswordResetTokenSchema.index({ hashedToken: 1 }, { unique: true, name: 'uniq_reset_hashedToken' });
PasswordResetTokenSchema.index({ userId: 1 }, { name: 'idx_reset_userId' });
PasswordResetTokenSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0, name: 'ttl_reset_expiresAt' });

export const PasswordResetTokenModel = model<IPasswordResetTokenDocument>(
  'PasswordResetToken',
  PasswordResetTokenSchema,
  'password_reset_tokens'
);
