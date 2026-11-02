# FitMate AI — Database Schema Specifications

**Document Version:** 1.1.0  
**Phase:** 3.2 — Database Schema Design  
**Status:** PROPOSED (AuthModule Detailed Schema Design — Revised)  
**Last Updated:** 2026-11-02  
**Owning Architecture:** Backend Engineering & MongoDB Data Modeling  
**Author:** Antigravity Senior Backend Architect & MongoDB Database Designer  

---

## 1. Global Conventions & Mongoose Architecture Standards

All Mongoose schemas in FitMate AI adhere strictly to the following production conventions:

1. **Dual TypeScript Typing**:
   - Every entity provides a pure plain data interface (e.g. `IUser`) representing the unhydrated JSON shape (used in DTOs and lean queries).
   - A corresponding document interface (e.g. `IUserDocument extends Document, IUser`) encapsulates Mongoose document methods and virtuals.
2. **Schema Options Invariants**:
   - `{ timestamps: true }`: Standardizes `createdAt` and `updatedAt` on all persistent documents ([DB-015](file:///d:/2026/Personal%20Fitness%20&%20AI%20Coach%20Platform/FitMate-AI/docs/architecture/DATABASE_ISSUES.md#L94-L105)).
   - `{ versionKey: false }`: Internal `__v` is suppressed to prevent schema pollution.
   - `toJSON` and `toObject` transforms: Automatically strip internal fields and map `_id` to `id`.
3. **Sensitive Field Stripping**:
   - Secrets such as `passwordHash` and ephemeral encrypted recovery blobs configure `{ select: false }` at the schema definition level to prevent accidental leakage in queries and API responses.
4. **Universal Versioning**:
   - `schemaVersion: { type: Number, required: true, default: 1 }` is mandatory on all root documents.
5. **Application-Level Expiration Enforcement ([DB-023](file:///d:/2026/Personal%20Fitness%20&%20AI%20Coach%20Platform/FitMate-AI/docs/architecture/DATABASE_ISSUES.md#L198-L210))**:
   - TTL indexes provide disk cleanup, but queries must explicitly enforce `expiresAt: { $gt: new Date() }`.
6. **Strict Index Redundancy Elimination ([DB-014](file:///d:/2026/Personal%20Fitness%20&%20AI%20Coach%20Platform/FitMate-AI/docs/architecture/DATABASE_ISSUES.md#L72-L92), [DB-024](file:///d:/2026/Personal%20Fitness%20&%20AI%20Coach%20Platform/FitMate-AI/docs/architecture/DATABASE_ISSUES.md#L212-L224))**:
   - No duplicate index flags in field definitions when schema-level indexes are defined.
   - Standalone indexes on leading compound prefixes are strictly prohibited.

---

## 2. AuthModule Schema Specifications

The `AuthModule` owns four collections:
1. `users`: Core account identity, verification status, and lifecycle state.
2. `user_identities`: Authentication provider credentials (Local Email/Password & Google OAuth).
3. `refresh_tokens`: Revocable active session refresh tokens with rotation grace period.
4. `password_reset_tokens`: Single-use cryptographic reset tokens.

---

### 2.1 Collection: `users`

#### 2.1.1 TypeScript Interfaces
```typescript
import { Document, Types } from 'mongoose';

export type UserAccountStatus =
  | 'active'
  | 'pending_deletion'
  | 'deleting'
  | 'failed_retry'
  | 'suspended';

export interface IUser {
  email: string;
  isEmailVerified: boolean;
  tokenVersion: number;
  status: UserAccountStatus;
  deletionRequestedAt?: Date;
  schemaVersion: number;
  createdAt: Date;
  updatedAt: Date;
}

export interface IUserDocument extends Document<Types.ObjectId>, IUser {
  id: string;
}
```

#### 2.1.2 Mongoose Schema Definition
```typescript
import { Schema, model } from 'mongoose';

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
      // DB-024: unique and index options removed here to eliminate duplicate declarations
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
      transform(_doc, ret) {
        ret.id = ret._id.toString();
        delete ret._id;
      },
    },
    toObject: {
      transform(_doc, ret) {
        ret.id = ret._id.toString();
        delete ret._id;
      },
    },
  }
);

// DB-024: Exactly ONE authoritative case-insensitive unique email index
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
```

#### 2.1.3 Fields & Defaults Table
| Field Name | Type | Required | Default | Description |
| :--- | :--- | :---: | :---: | :--- |
| `_id` | `ObjectId` | Auto | Generated | Unique MongoDB identifier |
| `email` | `String` | Yes | — | Normalized lowercase user email address |
| `isEmailVerified` | `Boolean` | Yes | `false` | Verification status (upgraded when Google OAuth links) |
| `tokenVersion` | `Number` | Yes | `0` | Incremented on global logout to invalidate active JWTs |
| `status` | `String` | Yes | `'active'` | Lifecycle state: `'active' \| 'pending_deletion' \| 'deleting' \| 'failed_retry' \| 'suspended'` |
| `deletionRequestedAt`| `Date` | No | `null` | Timestamp when user initiated account deletion |
| `schemaVersion` | `Number` | Yes | `1` | Schema version tracking ([DB-015](file:///d:/2026/Personal%20Fitness%20&%20AI%20Coach%20Platform/FitMate-AI/docs/architecture/DATABASE_ISSUES.md#L94-L105)) |
| `createdAt` | `Date` | Auto | Now | Document creation timestamp |
| `updatedAt` | `Date` | Auto | Now | Document last updated timestamp |

#### 2.1.4 Validation Rules
- `email`: Normalized lowercase, trimmed, validated via RFC-compliant regex, max 255 chars. Unique with case-insensitive collation (`strength: 2`).
- `status`: Strictly restricted to enum `['active', 'pending_deletion', 'deleting', 'failed_retry', 'suspended']`.
- `tokenVersion`: Non-negative integer.

#### 2.1.5 Index Definitions & Justification
1. `{ email: 1 }` (Unique, Collation: `{ locale: 'en', strength: 2 }`, Name: `uniq_user_email_ci`):
   - *Justification*: Prevents duplicate registrations with mixed casing (e.g. `User@example.com` vs `user@example.com`) and enables fast $O(1)$ email lookups during login. Exactly one index is defined to eliminate conflicting index declarations ([DB-024](file:///d:/2026/Personal%20Fitness%20&%20AI%20Coach%20Platform/FitMate-AI/docs/architecture/DATABASE_ISSUES.md#L212-L224)).
2. `{ status: 1, updatedAt: 1 }` (Partial Index, Name: `idx_user_status_transition`):
   - *Justification*: Filtered partial index covering only accounts in transition (`pending_deletion`, `deleting`, `failed_retry`, `suspended`). Enables background recovery jobs to query stalled deletion sagas (`updatedAt < now - 15min`) without scanning millions of active users ([DB-018](file:///d:/2026/Personal%20Fitness%20&%20AI%20Coach%20Platform/FitMate-AI/docs/architecture/DATABASE_ISSUES.md#L137-L157)).

#### 2.1.6 Example Document (BSON)
```json
{
  "_id": { "$oid": "67258b3c9a41e12345678901" },
  "email": "sarah.fitness@example.com",
  "isEmailVerified": true,
  "tokenVersion": 0,
  "status": "active",
  "deletionRequestedAt": null,
  "schemaVersion": 1,
  "createdAt": { "$date": "2026-11-02T08:00:00.000Z" },
  "updatedAt": { "$date": "2026-11-02T08:00:00.000Z" }
}
```

#### 2.1.7 Security Considerations
- Zero credentials or password hashes stored in `users`.
- Minimal PII: strictly contains email and account state.
- `tokenVersion` ensures immediate server-side revocation across all devices upon password reset or security incident.

#### 2.1.8 Relationships & Transaction Requirements
- **Root Parent**: Referenced by `user_identities`, `refresh_tokens`, `password_reset_tokens`, `user_profiles`, and `consent_records`.
- **Atomic Registration ([ADR-006](file:///d:/2026/Personal%20Fitness%20&%20AI%20Coach%20Platform/FitMate-AI/docs/architecture/ARCHITECTURE_DECISION_RECORDS.md#L23))**: Created inside an atomic MongoDB replica set transaction (`ClientSession`) alongside `user_identities`, `refresh_tokens`, `user_profiles`, and `consent_records`.
- **Cascading Deletion ([DB-018](file:///d:/2026/Personal%20Fitness%20&%20AI%20Coach%20Platform/FitMate-AI/docs/architecture/DATABASE_ISSUES.md#L137-L157))**: Deleted as the final step of the coordinated account deletion saga after all domain data has been purged.

---

### 2.2 Collection: `user_identities`

#### 2.2.1 TypeScript Interfaces
```typescript
import { Document, Types } from 'mongoose';

export type AuthProviderType = 'local' | 'google' | 'apple';

export interface IUserIdentity {
  userId: Types.ObjectId;
  provider: AuthProviderType;
  providerUserId: string;
  passwordHash?: string;
  isPrimary: boolean;
  lastAuthenticatedAt?: Date;
  schemaVersion: number;
  createdAt: Date;
  updatedAt: Date;
}

export interface IUserIdentityDocument extends Document<Types.ObjectId>, IUserIdentity {
  id: string;
}
```

#### 2.2.2 Mongoose Schema Definition
```typescript
import { Schema, model, Document } from 'mongoose';

const UserIdentitySchema = new Schema<IUserIdentityDocument>(
  {
    userId: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: [true, 'User ID reference is required'],
      // DB-014: Standalone index removed; covered by compound index { userId: 1, provider: 1 }
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
          // DB-025: Context-aware validator supporting both Document (save) and Query (update) contexts
          let currentProvider: string | undefined;
          if (this instanceof Document) {
            currentProvider = this.get('provider');
          } else if (this && typeof this.getUpdate === 'function') {
            const update = this.getUpdate();
            currentProvider = update?.provider || update?.$set?.provider;
          }

          if (currentProvider === 'local') {
            return typeof val === 'string' && val.trim().length >= 20;
          }
          if (currentProvider === 'google' || currentProvider === 'apple') {
            return val === undefined || val === null || val === '';
          }
          return true;
        },
        message: 'Password hash is strictly required for local accounts and must be empty for OAuth accounts',
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
      transform(_doc, ret) {
        ret.id = ret._id.toString();
        delete ret._id;
        delete ret.passwordHash;
      },
    },
    toObject: {
      transform(_doc, ret) {
        ret.id = ret._id.toString();
        delete ret._id;
        delete ret.passwordHash;
      },
    },
  }
);

// DB-025: Pre-validate hook for document creation and explicit save operations
UserIdentitySchema.pre('validate', function (next) {
  if (this.provider === 'local') {
    if (!this.passwordHash || typeof this.passwordHash !== 'string' || this.passwordHash.trim().length < 20) {
      return next(new Error('VALIDATION_ERROR: passwordHash is strictly required for local authentication provider.'));
    }
  } else if (this.provider === 'google' || this.provider === 'apple') {
    if (this.passwordHash !== undefined && this.passwordHash !== null && this.passwordHash !== '') {
      return next(new Error(`VALIDATION_ERROR: passwordHash is prohibited for OAuth provider "${this.provider}".`));
    }
  }
  next();
});

// Indexes

// 1. One account per third-party provider user ID
UserIdentitySchema.index(
  { provider: 1, providerUserId: 1 },
  { unique: true, name: 'uniq_provider_providerUserId' }
);

// 2. A user cannot link multiple accounts from the same provider (Prefix covers userId queries per DB-014)
UserIdentitySchema.index(
  { userId: 1, provider: 1 },
  { unique: true, name: 'uniq_userId_provider' }
);

// 3. DB-026: Database-level guarantee enforcing AT MOST ONE primary identity per user
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
```

#### 2.2.3 Fields & Defaults Table
| Field Name | Type | Required | Default | Description |
| :--- | :--- | :---: | :---: | :--- |
| `_id` | `ObjectId` | Auto | Generated | Unique identifier |
| `userId` | `ObjectId` | Yes | — | Foreign key referencing `users._id` |
| `provider` | `String` | Yes | — | Provider type: `'local' \| 'google' \| 'apple'` |
| `providerUserId` | `String` | Yes | — | Normalized email for `local`, Google `sub` for `google` |
| `passwordHash` | `String` | Cond. | `undefined` | Argon2id/bcrypt hash (mandatory for local, `select: false`) |
| `isPrimary` | `Boolean` | Yes | `false` | True for the single primary identity |
| `lastAuthenticatedAt`| `Date` | No | `null` | Timestamp of last successful login via this provider |
| `schemaVersion` | `Number` | Yes | `1` | Schema version tracking |
| `createdAt` | `Date` | Auto | Now | Creation timestamp |
| `updatedAt` | `Date` | Auto | Now | Last updated timestamp |

#### 2.2.4 Validation Rules & Multi-Layer Enforcement ([DB-025](file:///d:/2026/Personal%20Fitness%20&%20AI%20Coach%20Platform/FitMate-AI/docs/architecture/DATABASE_ISSUES.md#L226-L242))
- **Schema-Level Custom Validator & Pre-Validate Hook**:
  - `provider === 'local'`: `passwordHash` must be a non-empty string with length $\ge 20$.
  - `provider === 'google' | 'apple'`: `passwordHash` must be `undefined` or `null`. Setting a password on OAuth identities is rejected with a validation error.
  - Supports both `document.save()` and `findOneAndUpdate` contexts.
- **Provider Restrictions**: Enforced via Mongoose enum: `['local', 'google', 'apple']`.

#### 2.2.5 Index Definitions & Justification
1. `{ provider: 1, providerUserId: 1 }` (Unique, Name: `uniq_provider_providerUserId`):
   - *Justification*: Prevents two users from registering or linking the same Google account (`sub`) or local email. Supports $O(1)$ lookups during authentication.
2. `{ userId: 1, provider: 1 }` (Unique, Name: `uniq_userId_provider`):
   - *Justification*: Guarantees that a user cannot attach two different Google accounts or multiple passwords to the same account.
   - *Prefix Coverage ([DB-014](file:///d:/2026/Personal%20Fitness%20&%20AI%20Coach%20Platform/FitMate-AI/docs/architecture/DATABASE_ISSUES.md#L72-L92))*: The leading prefix `{ userId: 1 }` completely covers all user foreign key queries, eliminating the need for a separate standalone index.
3. `{ userId: 1, isPrimary: 1 }` (Partial Unique Index, Name: `uniq_one_primary_per_user`):
   - *Justification ([DB-026](file:///d:/2026/Personal%20Fitness%20&%20AI%20Coach%20Platform/FitMate-AI/docs/architecture/DATABASE_ISSUES.md#L244-L266))*: Enforces at the database engine level that a user can have **at most one** identity with `isPrimary: true`. Attempting to set a second identity to primary without demoting the existing one triggers a MongoDB duplicate key collision (`E11000`).

#### 2.2.6 Single Primary Identity Invariant & Lifecycle Rules ([DB-026](file:///d:/2026/Personal%20Fitness%20&%20AI%20Coach%20Platform/FitMate-AI/docs/architecture/DATABASE_ISSUES.md#L244-L266))
While the partial unique index guarantees *at most one* primary identity, business logic enforces *at least one* primary identity across lifecycle transitions:
- **Registration**: The initial registered identity is created with `isPrimary: true`.
- **Identity Linking**: Newly linked identities (e.g. adding Google to an existing local account) are created with `isPrimary: false`.
- **Primary Provider Switch**: Switching the primary provider executes within a transaction:
  1. `UserIdentityModel.updateOne({ userId, isPrimary: true }, { $set: { isPrimary: false } }, { session })`
  2. `UserIdentityModel.updateOne({ userId, provider: newPrimaryProvider }, { $set: { isPrimary: true } }, { session })`
- **Unlinking Protection**: A user is strictly forbidden from unlinking their primary identity unless another linked identity is promoted first. A user cannot delete their sole remaining identity.

#### 2.2.7 Example Documents (BSON)

**Local Email/Password Identity (Primary)**:
```json
{
  "_id": { "$oid": "67258b3c9a41e12345678902" },
  "userId": { "$oid": "67258b3c9a41e12345678901" },
  "provider": "local",
  "providerUserId": "sarah.fitness@example.com",
  "passwordHash": "$argon2id$v=19$m=65536,t=3,p=4$q1w2e3r4t5y6...z9",
  "isPrimary": true,
  "lastAuthenticatedAt": { "$date": "2026-11-02T08:00:00.000Z" },
  "schemaVersion": 1,
  "createdAt": { "$date": "2026-11-02T08:00:00.000Z" },
  "updatedAt": { "$date": "2026-11-02T08:00:00.000Z" }
}
```

**Linked Google OAuth Identity (Secondary)**:
```json
{
  "_id": { "$oid": "67258b3c9a41e12345678903" },
  "userId": { "$oid": "67258b3c9a41e12345678901" },
  "provider": "google",
  "providerUserId": "109876543210987654321",
  "isPrimary": false,
  "lastAuthenticatedAt": { "$date": "2026-11-02T09:30:00.000Z" },
  "schemaVersion": 1,
  "createdAt": { "$date": "2026-11-02T09:30:00.000Z" },
  "updatedAt": { "$date": "2026-11-02T09:30:00.000Z" }
}
```

#### 2.2.8 Security Considerations
- `passwordHash` defaults to `{ select: false }`. Must be explicitly projected via `.select('+passwordHash')` only within authentication controllers.
- Google OAuth auto-linking invariant ([DB-021](file:///d:/2026/Personal%20Fitness%20&%20AI%20Coach%20Platform/FitMate-AI/docs/architecture/DATABASE_ISSUES.md#L182-L196)): Only tokens with `email_verified: true` can link to an existing account.

---

### 2.3 Collection: `refresh_tokens`

#### 2.3.1 TypeScript Interfaces
```typescript
import { Document, Types } from 'mongoose';

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
  replacedByTokenHash?: string;
  encryptedSuccessorToken?: string; // DB-027: Ephemeral AES-256-GCM encrypted recovery blob
  isRevoked: boolean;
  revokedAt?: Date;
  revocationReason?: RevocationReason;
  rotatedAt?: Date;
  expiresAt: Date;
  truncatedUserAgent: string;
  ipHash: string;
  schemaVersion: number;
  createdAt: Date;
  updatedAt: Date;
}

export interface IRefreshTokenDocument extends Document<Types.ObjectId>, IRefreshToken {
  id: string;
}
```

#### 2.3.2 Mongoose Schema Definition
```typescript
import { Schema, model } from 'mongoose';

const RefreshTokenSchema = new Schema<IRefreshTokenDocument>(
  {
    userId: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: [true, 'User ID reference is required'],
      // DB-014: Standalone index removed; covered by compound index { userId: 1, isRevoked: 1 }
    },
    hashedToken: {
      type: String,
      required: [true, 'Hashed token string is required'],
      match: [/^[a-f0-9]{64}$/, 'Hashed token must be a valid 64-character SHA-256 hex string'],
    },
    tokenFamily: {
      type: String,
      required: [true, 'Token family identifier is required'],
      match: [/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i, 'Token family must be a valid UUID'],
    },
    replacedByTokenHash: {
      type: String,
      default: null,
      match: [/^[a-f0-9]{64}$/, 'ReplacedByTokenHash must be a valid 64-character SHA-256 hex string'],
    },
    encryptedSuccessorToken: {
      type: String,
      select: false, // DB-027: Security: Never projected by default; used strictly for 30s grace recovery
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
      transform(_doc, ret) {
        ret.id = ret._id.toString();
        delete ret._id;
        delete ret.hashedToken;
        delete ret.replacedByTokenHash;
        delete ret.encryptedSuccessorToken;
      },
    },
  }
);

// Indexes
RefreshTokenSchema.index({ hashedToken: 1 }, { unique: true, name: 'uniq_hashedToken' });

// Compound index covers active session lookups and prefix-covers { userId: 1 } queries (DB-014)
RefreshTokenSchema.index(
  { userId: 1, isRevoked: 1 },
  { name: 'idx_userId_isRevoked' }
);

RefreshTokenSchema.index({ tokenFamily: 1 }, { name: 'idx_tokenFamily' });
RefreshTokenSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0, name: 'ttl_expiresAt' });

export const RefreshTokenModel = model<IRefreshTokenDocument>(
  'RefreshToken',
  RefreshTokenSchema,
  'refresh_tokens'
);
```

#### 2.3.3 Fields & Defaults Table
| Field Name | Type | Required | Default | Description |
| :--- | :--- | :---: | :---: | :--- |
| `_id` | `ObjectId` | Auto | Generated | Unique identifier |
| `userId` | `ObjectId` | Yes | — | Foreign key referencing `users._id` |
| `hashedToken` | `String` | Yes | — | SHA-256 hash of the random 64-char refresh token |
| `tokenFamily` | `String` | Yes | — | UUID v4 tracking token lineage across rotations |
| `replacedByTokenHash`| `String`| No | `null` | SHA-256 hash of the successor token |
| `encryptedSuccessorToken`| `String`| No | `null` | AES-256-GCM recovery blob (`ciphertext:iv:authTag`, `select: false`) |
| `isRevoked` | `Boolean` | Yes | `false` | Revocation status flag |
| `revokedAt` | `Date` | No | `null` | Timestamp when token was revoked |
| `revocationReason` | `String` | No | `null` | Reason: `'logout' \| 'rotation' \| 'reuse_detected' \| 'password_reset' \| 'account_deletion'` |
| `rotatedAt` | `Date` | No | `null` | Timestamp when rotation occurred (used for grace period) |
| `expiresAt` | `Date` | Yes | — | Expiration timestamp (30 days from issuance) |
| `truncatedUserAgent`| `String`| Yes | `'Unknown'`| Minimized client user agent (max 100 chars, no PII) |
| `ipHash` | `String` | Yes | — | SHA-256 hash of client IP address ([NFR-SEC-006](file:///d:/2026/Personal%20Fitness%20&%20AI%20Coach%20Platform/FitMate-AI/docs/architecture/MODULE_BOUNDARIES.md#L69)) |
| `schemaVersion` | `Number` | Yes | `1` | Schema version tracking |
| `createdAt` | `Date` | Auto | Now | Creation timestamp |
| `updatedAt` | `Date` | Auto | Now | Last updated timestamp |

#### 2.3.4 Grace Period Recovery & Authenticated Encryption ([DB-027](file:///d:/2026/Personal%20Fitness%20&%20AI%20Coach%20Platform/FitMate-AI/docs/architecture/DATABASE_ISSUES.md#L268-L298))
- **Cryptographic Principle**: `replacedByTokenHash` is a SHA-256 one-way hash. The raw successor token cannot be derived from this hash.
- **AES-256-GCM Recovery Blob**:
  - During rotation, the server generates a new raw token `token_B`.
  - It encrypts `token_B` using **AES-256-GCM** with an external 256-bit symmetric key (`REFRESH_RECOVERY_KEY`) managed outside MongoDB (e.g. AWS KMS / environment secret).
  - The encrypted string (`ciphertext:iv:authTag`) is stored in `encryptedSuccessorToken` with `{ select: false }`.
  - If a retry arrives within $\le 30$ seconds, the server fetches `.select('+encryptedSuccessorToken')`, decrypts `token_B`, and returns the identical session.
  - After 30 seconds, decryption is refused, and the field is zeroed out on subsequent session updates.

#### 2.3.5 Concurrent Rotation & Race Condition Defense ([DB-028](file:///d:/2026/Personal%20Fitness%20&%20AI%20Coach%20Platform/FitMate-AI/docs/architecture/DATABASE_ISSUES.md#L300-L330))
To ensure two simultaneous refresh requests cannot create two valid successor tokens:
```typescript
const now = new Date();
const rotatedToken = await RefreshTokenModel.findOneAndUpdate(
  {
    hashedToken: incomingTokenHash,
    isRevoked: false,
    expiresAt: { $gt: now }, // DB-023: Application-level expiration enforcement
  },
  {
    $set: {
      isRevoked: true,
      revocationReason: 'rotation',
      rotatedAt: now,
      replacedByTokenHash: newHashedToken,
      encryptedSuccessorToken: encryptedNewTokenBlob,
    },
  },
  { session, new: false }
);
```
- **Execution Outcomes**:
  1. *Request 1 (Wins Lock)*: Receives active document. Inserts successor token, commits transaction, and delivers fresh tokens.
  2. *Request 2 (Loses Lock)*: `rotatedToken === null`.
     - Queries `RefreshTokenModel.findOne({ hashedToken: incomingTokenHash }).select('+encryptedSuccessorToken')`.
     - *If `now - token.rotatedAt <= 30_000ms`*: Decrypts `encryptedSuccessorToken` and returns the identical successor token. Zero duplicate records are created.
     - *If `now - token.rotatedAt > 30_000ms`*: Identifies a **Replay Attack**. Immediately revokes all tokens matching `tokenFamily`, increments `users.tokenVersion`, and returns `401 Unauthorized` (`TOKEN_REUSE_DETECTED`).

#### 2.3.6 Example Document (BSON)
```json
{
  "_id": { "$oid": "67258b3c9a41e12345678904" },
  "userId": { "$oid": "67258b3c9a41e12345678901" },
  "hashedToken": "e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855",
  "tokenFamily": "b47c21f8-8092-411a-8bb8-2325cbce1711",
  "replacedByTokenHash": "7f83b1657ff1fc53b92dc18148a1d65dfc2d4b1fa3d677284addd200126d9069",
  "isRevoked": true,
  "revokedAt": { "$date": "2026-11-02T08:30:00.000Z" },
  "revocationReason": "rotation",
  "rotatedAt": { "$date": "2026-11-02T08:30:00.000Z" },
  "expiresAt": { "$date": "2026-12-02T08:00:00.000Z" },
  "truncatedUserAgent": "FitMate/1.0.0 (iPhone15,2; iOS 18.1)",
  "ipHash": "a1b2c3d4e5f67890123456789abcdef0123456789abcdef0123456789abcdef0",
  "schemaVersion": 1,
  "createdAt": { "$date": "2026-11-02T08:00:00.000Z" },
  "updatedAt": { "$date": "2026-11-02T08:30:00.000Z" }
}
```

---

### 2.4 Collection: `password_reset_tokens`

#### 2.4.1 TypeScript Interfaces
```typescript
import { Document, Types } from 'mongoose';

export interface IPasswordResetToken {
  userId: Types.ObjectId;
  hashedToken: string;
  expiresAt: Date;
  usedAt?: Date;
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
```

#### 2.4.2 Mongoose Schema Definition
```typescript
import { Schema, model } from 'mongoose';

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
      transform(_doc, ret) {
        ret.id = ret._id.toString();
        delete ret._id;
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
```

#### 2.4.3 Atomic Password Reset Consumption Flow ([DB-030](file:///d:/2026/Personal%20Fitness%20&%20AI%20Coach%20Platform/FitMate-AI/docs/architecture/DATABASE_ISSUES.md#L352-L372))
When a password reset request arrives (`POST /api/v1/auth/password-reset/confirm`):
```typescript
const session = await mongoose.startSession();
session.startTransaction();
try {
  const now = new Date();
  
  // 1. Atomically consume the single-use token
  const consumedToken = await PasswordResetTokenModel.findOneAndUpdate(
    {
      hashedToken: incomingResetTokenHash,
      usedAt: null,
      expiresAt: { $gt: now }, // DB-023
    },
    { $set: { usedAt: now } },
    { session, new: false }
  );

  if (!consumedToken) {
    throw new UnauthorizedError('INVALID_OR_EXPIRED_RESET_TOKEN');
  }

  const userId = consumedToken.userId;

  // 2. Update password hash on the local identity
  await UserIdentityModel.updateOne(
    { userId, provider: 'local' },
    { $set: { passwordHash: newArgon2Hash, lastAuthenticatedAt: now } },
    { session }
  );

  // 3. Increment tokenVersion on the user document (invalidates active access JWTs)
  await UserModel.updateOne(
    { _id: userId },
    { $inc: { tokenVersion: 1 } },
    { session }
  );

  // 4. Revoke all active refresh tokens for the user
  await RefreshTokenModel.updateMany(
    { userId, isRevoked: false },
    { $set: { isRevoked: true, revokedAt: now, revocationReason: 'password_reset' } },
    { session }
  );

  await session.commitTransaction();
} catch (err) {
  await session.abortTransaction();
  throw err;
} finally {
  session.endSession();
}
```
- **Concurrent Execution Guarantee**: Document-level locking on `PasswordResetTokenModel` ensures only the first request consumes the token; concurrent requests match zero documents and abort immediately with `401 Unauthorized`.

---

## 3. Cross-Cutting Transactional & Security Workflows

---

### 3.1 Email Synchronization Across Collections ([DB-029](file:///d:/2026/Personal%20Fitness%20&%20AI%20Coach%20Platform/FitMate-AI/docs/architecture/DATABASE_ISSUES.md#L332-L350))

When an authenticated user requests an email update (`PATCH /api/v1/users/email`):
```typescript
const session = await mongoose.startSession();
session.startTransaction();
try {
  const normalizedNewEmail = newEmail.trim().toLowerCase();

  // 1. Check uniqueness in users
  const exists = await UserModel.findOne({ email: normalizedNewEmail }).session(session);
  if (exists) {
    throw new ConflictError('EMAIL_ALREADY_EXISTS');
  }

  // 2. Update users.email and reset verification status
  await UserModel.updateOne(
    { _id: userId },
    {
      $set: {
        email: normalizedNewEmail,
        isEmailVerified: false, // Mandatory re-verification invariant
      },
    },
    { session }
  );

  // 3. Synchronize providerUserId on local identity
  await UserIdentityModel.updateOne(
    { userId, provider: 'local' },
    { $set: { providerUserId: normalizedNewEmail } },
    { session }
  );

  await session.commitTransaction();
} catch (err) {
  await session.abortTransaction();
  throw err;
} finally {
  session.endSession();
}
```

---

### 3.2 TokenVersion Validation & Middleware Caching Architecture ([DB-031](file:///d:/2026/Personal%20Fitness%20&%20AI%20Coach%20Platform/FitMate-AI/docs/architecture/DATABASE_ISSUES.md#L374-L400))

To enforce immediate token invalidation on global logout or password reset while preserving sub-millisecond middleware execution times ($< 200\,\text{ms}$ p95 target):

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                    TOKEN_VERSION AUTH MIDDLEWARE PIPELINE                   │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│   Incoming Request with Bearer Access JWT                                   │
│   └── 1. Cryptographic Signature & Expiration Verification                  │
│         (If expired or signature invalid -> 401 Unauthorized immediately)   │
│         │                                                                   │
│         ▼ (Valid signature: payload contains { sub: userId, tokenVersion }) │
│   └── 2. Check tokenVersion against In-Memory / Distributed Cache            │
│         │                                                                   │
│         ├── Cache Hit: cachedVersion = cache.get(userId)                    │
│         │                                                                   │
│         └── Cache Miss:                                                     │
│               Query MongoDB: UserModel.findById(sub).select('tokenVersion') │
│               Populate cache: cache.set(userId, dbVersion, TTL: 300s)       │
│                                                                             │
│   └── 3. Version Comparison:                                                │
│         ├── If jwt.tokenVersion === cachedVersion -> Request Permitted      │
│         └── If jwt.tokenVersion < cachedVersion  -> 401 TOKEN_REVOKED       │
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘
```

- **Cache Invalidation Guarantee**: Any operation that increments `users.tokenVersion` (password reset, global logout, account suspension) synchronously writes to the cache:
  `tokenVersionCache.set(userId, newVersion)` (or Redis `SET auth:tokenVersion:<userId> <newVersion>`), achieving instant global revocation without waiting for access tokens to expire.

---

## 4. Comprehensive Index Inventory & Redundancy Audit (AuthModule)

| Collection | Index Key | Type | Name | Redundancy Audit & Justification |
| :--- | :--- | :---: | :--- | :--- |
| `users` | `{ email: 1 }` | Unique (CI) | `uniq_user_email_ci` | Single authoritative index; field-level index removed ([DB-024](file:///d:/2026/Personal%20Fitness%20&%20AI%20Coach%20Platform/FitMate-AI/docs/architecture/DATABASE_ISSUES.md#L212-L224)). |
| `users` | `{ status: 1, updatedAt: 1 }` | Partial | `idx_user_status_transition` | Partial index for deletion/retry recovery ([DB-018](file:///d:/2026/Personal%20Fitness%20&%20AI%20Coach%20Platform/FitMate-AI/docs/architecture/DATABASE_ISSUES.md#L137-L157)). Excludes active users. |
| `user_identities` | `{ provider: 1, providerUserId: 1 }` | Unique | `uniq_provider_providerUserId`| Prevents duplicate provider registrations; enables $O(1)$ login lookups. |
| `user_identities` | `{ userId: 1, provider: 1 }` | Unique | `uniq_userId_provider` | Prevents duplicate providers per user. **Prefix-covers `{ userId: 1 }` queries** ([DB-014](file:///d:/2026/Personal%20Fitness%20&%20AI%20Coach%20Platform/FitMate-AI/docs/architecture/DATABASE_ISSUES.md#L72-L92)). |
| `user_identities` | `{ userId: 1, isPrimary: 1 }` | Partial Unique | `uniq_one_primary_per_user` | Enforces at-most-one primary identity per user ([DB-026](file:///d:/2026/Personal%20Fitness%20&%20AI%20Coach%20Platform/FitMate-AI/docs/architecture/DATABASE_ISSUES.md#L244-L266)). |
| `refresh_tokens` | `{ hashedToken: 1 }` | Unique | `uniq_hashedToken` | $O(1)$ token verification on refresh endpoints. |
| `refresh_tokens` | `{ userId: 1, isRevoked: 1 }` | Compound | `idx_userId_isRevoked` | Optimizes active session queries. **Prefix-covers `{ userId: 1 }` queries** ([DB-014](file:///d:/2026/Personal%20Fitness%20&%20AI%20Coach%20Platform/FitMate-AI/docs/architecture/DATABASE_ISSUES.md#L72-L92)). |
| `refresh_tokens` | `{ tokenFamily: 1 }` | Index | `idx_tokenFamily` | Enables instant family-wide revocation on token reuse attacks. |
| `refresh_tokens` | `{ expiresAt: 1 }` | TTL | `ttl_expiresAt` | Automated disk space reclamation (`expireAfterSeconds: 0`). |
| `password_reset_tokens` | `{ hashedToken: 1 }` | Unique | `uniq_reset_hashedToken` | $O(1)$ token verification on password reset submissions. |
| `password_reset_tokens` | `{ userId: 1 }` | Index | `idx_reset_userId` | Enables revoking pending reset tokens when a new one is requested. |
| `password_reset_tokens` | `{ expiresAt: 1 }` | TTL | `ttl_reset_expiresAt` | Reclaims storage 1 hour after generation (`expireAfterSeconds: 0`). |

---

## 5. Remaining Open Decisions & Evaluation Registry

The following decisions remain **PROPOSED** or **OPEN** as scheduled for subsequent schema modules:

1. **DB-012 (OPEN)**: Disentangling nutrition estimation semantics between raw verified catalog items and calculated portion/custom meals (to be reviewed in NutritionModule schema design).
2. **DB-017 (OPEN)**: Finalizing nutrition diary timezone offset semantics (`YYYY-MM-DD` canonical local date vs UTC boundary representation).
3. **DB-019 (PROPOSED)**: Formalizing profile target recalculation forward-only policy on metric updates.
4. **DB-020 (PROPOSED)**: Selecting atomic sliding-window vs distributed Redis bucket for Coach 20 msgs/hr rate limit.
5. **ARCH-001 (OPEN)**: Final selection between SQLite and MMKV for mobile client local storage (Phase 3.2).
6. **ARCH-004 (OPEN)**: Distributed Redis token cache vs single-instance in-memory cache for fast revocation.
7. **ARCH-006 (DEFERRED)**: Deferring transactional outbox worker to Phase E.

---

## 6. Next Steps

Following human review and confirmation of this revised AuthModule specification:
- Proceed to **UsersModule Schema Design** (`user_profiles`, `consent_records`, `deletion_audit_logs`).
