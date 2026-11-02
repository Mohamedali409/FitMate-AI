import { Schema, model, Document, Types } from 'mongoose';

export type DeletionTerminalOutcome = 'success' | 'manual_review_required';

export interface IDeletionAuditLog {
  pseudonymizedUserId: string;
  hmacKeyVersion: string;
  requestedAt: Date;
  completedAt: Date;
  outcome: DeletionTerminalOutcome;
  purgedModules: string[];
  retentionReason: string;
  executionDurationMs: number;
  expiresAt: Date;
  schemaVersion: number;
  createdAt: Date;
  updatedAt: Date;
}

export interface IDeletionAuditLogDocument
  extends Document<Types.ObjectId>,
    IDeletionAuditLog {
  id: string;
}

const DeletionAuditLogSchema = new Schema<IDeletionAuditLogDocument>(
  {
    pseudonymizedUserId: {
      type: String,
      required: [true, 'Pseudonymized user ID is required'],
      match: [/^[a-f0-9]{64}$/, 'Pseudonymized user ID must be a valid 64-character SHA-256 hex string'],
    },
    hmacKeyVersion: {
      type: String,
      required: [true, 'HMAC key version is required'],
      trim: true,
    },
    requestedAt: {
      type: Date,
      required: [true, 'Requested timestamp is required'],
    },
    completedAt: {
      type: Date,
      default: Date.now,
      required: true,
    },
    outcome: {
      type: String,
      enum: ['success', 'manual_review_required'],
      default: 'success',
      required: true,
    },
    purgedModules: {
      type: [String],
      required: true,
    },
    retentionReason: {
      type: String,
      default: 'statutory_compliance_defense',
      required: true,
      maxlength: 100,
    },
    executionDurationMs: {
      type: Number,
      required: true,
      min: [0, 'Execution duration cannot be negative'],
    },
    expiresAt: {
      type: Date,
      required: true,
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
      },
    },
    toObject: {
      transform(_doc, ret: Record<string, any>) {
        ret.id = ret._id?.toString() || ret.id;
        delete ret._id;
        delete ret.__v;
      },
    },
  }
);

DeletionAuditLogSchema.index(
  { pseudonymizedUserId: 1, hmacKeyVersion: 1 },
  { unique: true, name: 'uniq_deletion_audit_pseudonym_ver' }
);

DeletionAuditLogSchema.index(
  { expiresAt: 1 },
  { expireAfterSeconds: 0, name: 'ttl_deletion_audit_cleanup' }
);

export const DeletionAuditLogModel = model<IDeletionAuditLogDocument>(
  'DeletionAuditLog',
  DeletionAuditLogSchema,
  'deletion_audit_logs'
);

