import { Schema, model, Document, Types } from 'mongoose';

export type DeletionSagaStatus =
  | 'pending'
  | 'in_progress'
  | 'retry_pending'
  | 'completed'
  | 'abandoned_manual_review';

export type DeletionSagaStep =
  | 'lock_account'
  | 'purge_workouts'
  | 'purge_nutrition'
  | 'purge_progress'
  | 'purge_coach'
  | 'purge_external_storage'
  | 'pseudonymize_consents'
  | 'purge_profile'
  | 'purge_auth_credentials'
  | 'finalize_audit_log';

export interface IDeletionStepExecution {
  step: DeletionSagaStep;
  status: 'pending' | 'completed' | 'failed';
  startedAt?: Date;
  completedAt?: Date;
  retryCount: number;
  lastError?: string;
}

export interface IDeletionSagaJob {
  sagaId: string;
  idempotencyKey: string;
  targetUserId: Types.ObjectId;
  status: DeletionSagaStatus;
  currentStep: DeletionSagaStep;
  completedSteps: DeletionSagaStep[];
  failedSteps: IDeletionStepExecution[];
  retryCount: number;
  maxRetries: number;
  nextRetryAt?: Date;
  leaseOwner?: string | null;
  leaseExpiresAt?: Date | null;
  lastHeartbeatAt?: Date | null;
  failureDetails?: {
    step: DeletionSagaStep;
    errorName: string;
    errorMessage: string;
    stackTrace?: string;
    timestamp: Date;
  };
  hmacKeyVersion: string;
  pseudonymizedUserId?: string;
  schemaVersion: number;
  createdAt: Date;
  updatedAt: Date;
}

export interface IDeletionSagaJobDocument
  extends Document<Types.ObjectId>,
    IDeletionSagaJob {
  id: string;
}

const DeletionSagaJobSchema = new Schema<IDeletionSagaJobDocument>(
  {
    sagaId: {
      type: String,
      required: [true, 'Saga ID is required'],
      match: [
        /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i,
        'Saga ID must be a valid UUID',
      ],
    },
    idempotencyKey: {
      type: String,
      required: [true, 'Idempotency key is required'],
      minlength: 16,
      maxlength: 128,
      trim: true,
    },
    targetUserId: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: [true, 'Target user ID is required'],
    },
    status: {
      type: String,
      enum: ['pending', 'in_progress', 'retry_pending', 'completed', 'abandoned_manual_review'],
      default: 'pending',
      required: true,
    },
    currentStep: {
      type: String,
      enum: [
        'lock_account',
        'purge_workouts',
        'purge_nutrition',
        'purge_progress',
        'purge_coach',
        'purge_external_storage',
        'pseudonymize_consents',
        'purge_profile',
        'purge_auth_credentials',
        'finalize_audit_log',
      ],
      default: 'lock_account',
      required: true,
    },
    completedSteps: {
      type: [String],
      default: [],
    },
    failedSteps: {
      type: [
        {
          step: { type: String, required: true },
          status: { type: String, enum: ['pending', 'completed', 'failed'], required: true },
          startedAt: { type: Date },
          completedAt: { type: Date },
          retryCount: { type: Number, default: 0 },
          lastError: { type: String },
        },
      ],
      default: [],
    },
    retryCount: {
      type: Number,
      default: 0,
      min: [0, 'Retry count cannot be negative'],
    },
    maxRetries: {
      type: Number,
      default: 5,
      min: [1, 'Max retries must be at least 1'],
    },
    nextRetryAt: {
      type: Date,
    },
    leaseOwner: {
      type: String,
      default: null,
    },
    leaseExpiresAt: {
      type: Date,
      default: null,
    },
    lastHeartbeatAt: {
      type: Date,
      default: null,
    },
    failureDetails: {
      step: { type: String },
      errorName: { type: String },
      errorMessage: { type: String },
      stackTrace: { type: String },
      timestamp: { type: Date },
    },
    hmacKeyVersion: {
      type: String,
      default: 'v1',
      required: true,
    },
    pseudonymizedUserId: {
      type: String,
      match: [/^[a-f0-9]{64}$/, 'Pseudonymized user ID must be a valid 64-character SHA-256 hex string'],
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
DeletionSagaJobSchema.index({ sagaId: 1 }, { unique: true, name: 'uniq_saga_job_sagaId' });
DeletionSagaJobSchema.index({ idempotencyKey: 1 }, { unique: true, name: 'uniq_saga_job_idempotency' });

DeletionSagaJobSchema.index(
  { targetUserId: 1 },
  {
    unique: true,
    name: 'uniq_saga_active_targetUserId',
    partialFilterExpression: {
      status: { $in: ['pending', 'in_progress', 'retry_pending'] },
    },
  }
);

DeletionSagaJobSchema.index(
  { status: 1, leaseExpiresAt: 1 },
  { name: 'idx_saga_worker_polling' }
);

export const DeletionSagaJobModel = model<IDeletionSagaJobDocument>(
  'DeletionSagaJob',
  DeletionSagaJobSchema,
  'deletion_saga_jobs'
);

