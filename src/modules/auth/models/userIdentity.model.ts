import { Document, Schema, Types, model } from 'mongoose';

export type AuthProviderType = 'local' | 'google' | 'apple';

export interface IUserIdentity {
  userId: Types.ObjectId;
  provider: AuthProviderType;
  providerUserId: string;
  passwordHash?: string;
  isPrimary: boolean;
  lastAuthenticatedAt?: Date | null;
  schemaVersion: number;
  createdAt: Date;
  updatedAt: Date;
}

export interface IUserIdentityDocument extends Document<Types.ObjectId>, IUserIdentity {
  id: string;
}

const UserIdentitySchema = new Schema<IUserIdentityDocument>(
  {
    userId: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: [true, 'User ID reference is required'],
      // Standalone index removed; covered by compound index { userId: 1, provider: 1 }
    },
    provider: {
      type: String,
      enum: {
        values: ['local', 'google', 'apple'],
        message: '{VALUE} is not an authorized authentication provider',
      },
      required: [true, 'Provider type is required'],
    },
    providerUserId: {
      type: String,
      required: [true, 'Provider user ID is required'],
      trim: true,
      maxlength: [255, 'Provider user ID cannot exceed 255 characters'],
    },
    passwordHash: {
      type: String,
      select: false, // Security: Never included in query projections by default
      validate: {
        validator(this: any, val?: string) {
          let currentProvider: string | undefined;
          if (this instanceof Document) {
            currentProvider = this.get('provider');
          } else if (this && typeof this.getUpdate === 'function') {
            const update = this.getUpdate();
            currentProvider = update?.provider || update?.$set?.provider;
          }

          if (currentProvider === 'local') {
            return typeof val === 'string' && val.trim().length >= 10;
          }
          if (currentProvider === 'google' || currentProvider === 'apple') {
            return val === undefined || val === null || val === '';
          }
          return true;
        },
        message:
          'Password hash is strictly required for local accounts and must be empty for OAuth accounts',
      },
    },
    isPrimary: {
      type: Boolean,
      default: false,
      required: true,
    },
    lastAuthenticatedAt: {
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
        delete ret.passwordHash;
      },
    },
    toObject: {
      transform(_doc, ret: Record<string, any>) {
        ret.id = ret._id?.toString() || ret.id;
        delete ret._id;
        delete ret.__v;
        delete ret.passwordHash;
      },
    },
  }
);

// DB-034: Pre-validate hook for document creation and explicit save operations
UserIdentitySchema.pre('validate', function (next) {
  if (this.provider === 'local') {
    if (
      !this.passwordHash ||
      typeof this.passwordHash !== 'string' ||
      this.passwordHash.trim().length < 10
    ) {
      return next(
        new Error(
          'VALIDATION_ERROR: passwordHash is strictly required for local authentication provider.'
        )
      );
    }
  } else if (this.provider === 'google' || this.provider === 'apple') {
    if (this.passwordHash !== undefined && this.passwordHash !== null && this.passwordHash !== '') {
      return next(
        new Error(`VALIDATION_ERROR: passwordHash is prohibited for OAuth provider "${this.provider}".`)
      );
    }
  }
  next();
});

// Indexes
UserIdentitySchema.index(
  { provider: 1, providerUserId: 1 },
  { unique: true, name: 'uniq_provider_providerUserId' }
);

UserIdentitySchema.index(
  { userId: 1, provider: 1 },
  { unique: true, name: 'uniq_userId_provider' }
);

// DB-035: Enforces AT MOST ONE primary identity per user
UserIdentitySchema.index(
  { userId: 1, isPrimary: 1 },
  {
    unique: true,
    partialFilterExpression: { isPrimary: true },
    name: 'uniq_one_primary_per_user',
  }
);

export const UserIdentityModel = model<IUserIdentityDocument>(
  'UserIdentity',
  UserIdentitySchema,
  'user_identities'
);
