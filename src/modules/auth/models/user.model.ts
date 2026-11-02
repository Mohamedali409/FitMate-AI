import { Document, Schema, Types, model } from 'mongoose';

export type UserAccountStatus =
  | 'active'
  | 'pending_deletion'
  | 'deleting'
  | 'failed_retry'
  | 'suspended';

export type UserStatus = UserAccountStatus;
export type UserRole = 'user' | 'admin';

export interface IUser {
  email: string;
  isEmailVerified: boolean;
  tokenVersion: number;
  status: UserAccountStatus;
  role?: UserRole;
  deletionRequestedAt?: Date | null;
  schemaVersion: number;
  createdAt: Date;
  updatedAt: Date;
}

export interface IUserDocument extends Document<Types.ObjectId>, IUser {
  id: string;
}

const UserSchema = new Schema<IUserDocument>(
  {
    email: {
      type: String,
      required: [true, 'Email address is required'],
      trim: true,
      lowercase: true,
      maxlength: [255, 'Email cannot exceed 255 characters'],
      match: [
        /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/,
        'Please provide a valid email address',
      ],
      // DB-033: unique: true removed here to avoid duplicate index declaration
    },
    isEmailVerified: {
      type: Boolean,
      default: false,
      required: true,
    },
    tokenVersion: {
      type: Number,
      default: 0,
      min: [0, 'Token version cannot be negative'],
      required: true,
    },
    status: {
      type: String,
      enum: {
        values: ['active', 'pending_deletion', 'deleting', 'failed_retry', 'suspended'],
        message: '{VALUE} is not a valid user status',
      },
      default: 'active',
      required: true,
    },
    role: {
      type: String,
      enum: ['user', 'admin'],
      default: 'user',
      required: true,
    },
    deletionRequestedAt: {
      type: Date,
      default: null,
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

// DB-033: Exactly ONE authoritative case-insensitive unique email index
UserSchema.index(
  { email: 1 },
  {
    unique: true,
    name: 'uniq_user_email_ci',
    collation: { locale: 'en', strength: 2 },
  }
);

// DB-018: Partial index for background deletion recovery and account transitions
UserSchema.index(
  { status: 1, updatedAt: 1 },
  {
    name: 'idx_user_status_transition',
    partialFilterExpression: {
      status: { $in: ['pending_deletion', 'deleting', 'failed_retry', 'suspended'] },
    },
  }
);

export const UserModel = model<IUserDocument>('User', UserSchema, 'users');
