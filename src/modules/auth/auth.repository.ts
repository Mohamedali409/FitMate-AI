import { ClientSession, Types, UpdateQuery } from 'mongoose';
import { UserModel, IUser, IUserDocument, UserAccountStatus } from './models/user.model.js';
import {
  UserIdentityModel,
  IUserIdentity,
  IUserIdentityDocument,
  AuthProviderType,
} from './models/userIdentity.model.js';
import {
  RefreshTokenModel,
  IRefreshToken,
  IRefreshTokenDocument,
  RevocationReason,
} from './models/refreshToken.model.js';
import {
  PasswordResetTokenModel,
  IPasswordResetToken,
  IPasswordResetTokenDocument,
} from './models/passwordResetToken.model.js';

export class AuthRepository {
  // --- User Operations ---

  async createUser(
    userData: Partial<IUser>,
    session?: ClientSession
  ): Promise<IUserDocument> {
    const docs = await UserModel.create([userData], { session });
    return docs[0]!;
  }

  async findUserById(
    userId: string | Types.ObjectId,
    session?: ClientSession
  ): Promise<IUserDocument | null> {
    const query = UserModel.findById(userId);
    if (session) query.session(session);
    return query.exec();
  }

  async findUserByEmail(
    email: string,
    session?: ClientSession
  ): Promise<IUserDocument | null> {
    const query = UserModel.findOne({ email: email.toLowerCase().trim() });
    if (session) query.session(session);
    return query.exec();
  }

  async updateUser(
    userId: string | Types.ObjectId,
    update: UpdateQuery<IUserDocument>,
    session?: ClientSession
  ): Promise<IUserDocument | null> {
    const query = UserModel.findByIdAndUpdate(userId, update, { new: true });
    if (session) query.session(session);
    return query.exec();
  }

  async incrementTokenVersion(
    userId: string | Types.ObjectId,
    session?: ClientSession
  ): Promise<IUserDocument | null> {
    const query = UserModel.findByIdAndUpdate(
      userId,
      { $inc: { tokenVersion: 1 } },
      { new: true }
    );
    if (session) query.session(session);
    return query.exec();
  }

  async updateAccountStatus(
    userId: string | Types.ObjectId,
    status: UserAccountStatus,
    deletionRequestedAt?: Date | null,
    session?: ClientSession
  ): Promise<IUserDocument | null> {
    const update: UpdateQuery<IUserDocument> = { status };
    if (deletionRequestedAt !== undefined) {
      update.deletionRequestedAt = deletionRequestedAt;
    }
    const query = UserModel.findByIdAndUpdate(userId, update, { new: true });
    if (session) query.session(session);
    return query.exec();
  }

  async deleteUser(
    userId: string | Types.ObjectId,
    session?: ClientSession
  ): Promise<boolean> {
    const query = UserModel.findByIdAndDelete(userId);
    if (session) query.session(session);
    const result = await query.exec();
    return !!result;
  }

  // --- User Identity Operations ---

  async createIdentity(
    identityData: Partial<IUserIdentity>,
    session?: ClientSession
  ): Promise<IUserIdentityDocument> {
    const docs = await UserIdentityModel.create([identityData], { session });
    return docs[0]!;
  }

  async findIdentityByProvider(
    provider: AuthProviderType,
    providerUserId: string,
    session?: ClientSession,
    includePasswordHash = false
  ): Promise<IUserIdentityDocument | null> {
    const query = UserIdentityModel.findOne({
      provider,
      providerUserId: providerUserId.trim(),
    });
    if (includePasswordHash) {
      query.select('+passwordHash');
    }
    if (session) query.session(session);
    return query.exec();
  }

  async findIdentitiesByUserId(
    userId: string | Types.ObjectId,
    session?: ClientSession
  ): Promise<IUserIdentityDocument[]> {
    const query = UserIdentityModel.find({ userId });
    if (session) query.session(session);
    return query.exec();
  }

  async findPrimaryIdentity(
    userId: string | Types.ObjectId,
    session?: ClientSession
  ): Promise<IUserIdentityDocument | null> {
    const query = UserIdentityModel.findOne({ userId, isPrimary: true });
    if (session) query.session(session);
    return query.exec();
  }

  async updatePasswordHash(
    userId: string | Types.ObjectId,
    passwordHash: string,
    session?: ClientSession
  ): Promise<IUserIdentityDocument | null> {
    const query = UserIdentityModel.findOneAndUpdate(
      { userId, provider: 'local' },
      { $set: { passwordHash, updatedAt: new Date() } },
      { new: true }
    );
    if (session) query.session(session);
    return query.exec();
  }

  async deleteIdentitiesByUserId(
    userId: string | Types.ObjectId,
    session?: ClientSession
  ): Promise<number> {
    const query = UserIdentityModel.deleteMany({ userId });
    if (session) query.session(session);
    const res = await query.exec();
    return res.deletedCount;
  }

  // --- Refresh Token Operations ---

  async createRefreshToken(
    tokenData: Partial<IRefreshToken>,
    session?: ClientSession
  ): Promise<IRefreshTokenDocument> {
    const docs = await RefreshTokenModel.create([tokenData], { session });
    return docs[0]!;
  }

  async findRefreshTokenByHash(
    hashedToken: string,
    session?: ClientSession,
    includeSuccessorBlob = false
  ): Promise<IRefreshTokenDocument | null> {
    const query = RefreshTokenModel.findOne({ hashedToken });
    if (includeSuccessorBlob) {
      query.select('+encryptedSuccessorToken');
    }
    if (session) query.session(session);
    return query.exec();
  }

  async atomicRotateToken(
    incomingTokenHash: string,
    newHashedToken: string,
    encryptedSuccessorToken: string,
    session?: ClientSession
  ): Promise<IRefreshTokenDocument | null> {
    const now = new Date();
    const query = RefreshTokenModel.findOneAndUpdate(
      {
        hashedToken: incomingTokenHash,
        isRevoked: false,
        expiresAt: { $gt: now }, // Application-level expiration check (DB-023)
      },
      {
        $set: {
          isRevoked: true,
          revocationReason: 'rotation',
          rotatedAt: now,
          revokedAt: now,
          replacedByTokenHash: newHashedToken,
          encryptedSuccessorToken,
        },
      },
      { new: false } // return old state to verify ownership
    );
    if (session) query.session(session);
    return query.exec();
  }

  async revokeTokenFamily(
    tokenFamily: string,
    reason: RevocationReason,
    session?: ClientSession
  ): Promise<number> {
    const now = new Date();
    const query = RefreshTokenModel.updateMany(
      { tokenFamily, isRevoked: false },
      {
        $set: {
          isRevoked: true,
          revocationReason: reason,
          revokedAt: now,
        },
      }
    );
    if (session) query.session(session);
    const res = await query.exec();
    return res.modifiedCount;
  }

  async revokeUserTokens(
    userId: string | Types.ObjectId,
    reason: RevocationReason,
    session?: ClientSession
  ): Promise<number> {
    const now = new Date();
    const query = RefreshTokenModel.updateMany(
      { userId, isRevoked: false },
      {
        $set: {
          isRevoked: true,
          revocationReason: reason,
          revokedAt: now,
        },
      }
    );
    if (session) query.session(session);
    const res = await query.exec();
    return res.modifiedCount;
  }

  async revokeSingleToken(
    hashedToken: string,
    reason: RevocationReason,
    session?: ClientSession
  ): Promise<IRefreshTokenDocument | null> {
    const query = RefreshTokenModel.findOneAndUpdate(
      { hashedToken, isRevoked: false },
      {
        $set: {
          isRevoked: true,
          revocationReason: reason,
          revokedAt: new Date(),
        },
      },
      { new: true }
    );
    if (session) query.session(session);
    return query.exec();
  }

  async deleteTokensByUserId(
    userId: string | Types.ObjectId,
    session?: ClientSession
  ): Promise<number> {
    const query = RefreshTokenModel.deleteMany({ userId });
    if (session) query.session(session);
    const res = await query.exec();
    return res.deletedCount;
  }

  // --- Password Reset Token Operations ---

  async createPasswordResetToken(
    tokenData: Partial<IPasswordResetToken>,
    session?: ClientSession
  ): Promise<IPasswordResetTokenDocument> {
    const docs = await PasswordResetTokenModel.create([tokenData], { session });
    return docs[0]!;
  }

  async findValidPasswordResetToken(
    hashedToken: string,
    session?: ClientSession
  ): Promise<IPasswordResetTokenDocument | null> {
    const now = new Date();
    const query = PasswordResetTokenModel.findOne({
      hashedToken,
      usedAt: null,
      expiresAt: { $gt: now }, // Application-level expiration check (DB-023)
    });
    if (session) query.session(session);
    return query.exec();
  }

  async consumePasswordResetToken(
    tokenId: string | Types.ObjectId,
    session?: ClientSession
  ): Promise<IPasswordResetTokenDocument | null> {
    const query = PasswordResetTokenModel.findOneAndUpdate(
      { _id: tokenId, usedAt: null },
      { $set: { usedAt: new Date() } },
      { new: true }
    );
    if (session) query.session(session);
    return query.exec();
  }

  async deletePasswordResetTokensByUserId(
    userId: string | Types.ObjectId,
    session?: ClientSession
  ): Promise<number> {
    const query = PasswordResetTokenModel.deleteMany({ userId });
    if (session) query.session(session);
    const res = await query.exec();
    return res.deletedCount;
  }
}

export const authRepository = new AuthRepository();

