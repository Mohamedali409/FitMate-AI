import { Schema, model, Document, Types } from 'mongoose';

export type ConsentType = 'health_disclaimer' | 'terms_of_service' | 'privacy_policy';
export type ConsentAction = 'accepted' | 'withdrawn';
export type ConsentRecordStatus = 'active' | 'pseudonymized';

export interface IConsentRecord {
  userId: Types.ObjectId | null;
  pseudonymizedUserId?: string;
  hmacKeyVersion?: string;
  status: ConsentRecordStatus;
  consentType: ConsentType;
  action: ConsentAction;
  hasAccepted: boolean;
  disclaimerVersion: string;
  recordedAt: Date;
  ipHash: string;
  userAgentTruncated: string;
  pseudonymizedAt?: Date;
  schemaVersion: number;
  createdAt: Date;
  updatedAt: Date;
}

export interface IConsentRecordDocument
  extends Document<Types.ObjectId>,
    IConsentRecord {
  id: string;
}

const ConsentRecordSchema = new Schema<IConsentRecordDocument>(
  {
    userId: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      default: null,
    },
    pseudonymizedUserId: {
      type: String,
      match: [/^[a-f0-9]{64}$/, 'Pseudonymized user ID must be a valid 64-character SHA-256 hex string'],
    },
    hmacKeyVersion: {
      type: String,
      trim: true,
    },
    status: {
      type: String,
      enum: ['active', 'pseudonymized'],
      default: 'active',
      required: true,
    },
    consentType: {
      type: String,
      enum: ['health_disclaimer', 'terms_of_service', 'privacy_policy'],
      required: [true, 'Consent type is required'],
    },
    action: {
      type: String,
      enum: ['accepted', 'withdrawn'],
      default: 'accepted',
      required: true,
    },
    hasAccepted: {
      type: Boolean,
      default: true,
      required: true,
    },
    disclaimerVersion: {
      type: String,
      required: [true, 'Disclaimer version is required'],
      trim: true,
    },
    recordedAt: {
      type: Date,
      default: Date.now,
      required: true,
    },
    ipHash: {
      type: String,
      required: [true, 'IP hash is required'],
      match: [/^[a-f0-9]{64}$/, 'IP hash must be a valid 64-character SHA-256 hex string'],
    },
    userAgentTruncated: {
      type: String,
      maxlength: [100, 'User agent snippet cannot exceed 100 characters'],
      trim: true,
      default: 'Unknown Device',
    },
    pseudonymizedAt: {
      type: Date,
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

// Indexes
ConsentRecordSchema.index(
  { userId: 1, consentType: 1 },
  {
    name: 'idx_consent_active_userId_type',
    partialFilterExpression: { userId: { $type: 'objectId' } },
  }
);

ConsentRecordSchema.index(
  { pseudonymizedUserId: 1, hmacKeyVersion: 1 },
  {
    name: 'idx_consent_pseudonymized_lookup',
    partialFilterExpression: { pseudonymizedUserId: { $type: 'string' } },
  }
);

export const ConsentRecordModel = model<IConsentRecordDocument>(
  'ConsentRecord',
  ConsentRecordSchema,
  'consent_records'
);

