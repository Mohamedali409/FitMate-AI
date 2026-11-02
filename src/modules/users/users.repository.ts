import { ClientSession, Types, UpdateQuery } from 'mongoose';
import {
  UserProfileModel,
  IUserProfile,
  IUserProfileDocument,
} from './models/userProfile.model.js';
import {
  ConsentRecordModel,
  IConsentRecord,
  IConsentRecordDocument,
  ConsentType,
} from './models/consentRecord.model.js';
import {
  DeletionSagaJobModel,
  IDeletionSagaJob,
  IDeletionSagaJobDocument,
} from './models/deletionSagaJob.model.js';
import {
  DeletionAuditLogModel,
  IDeletionAuditLog,
  IDeletionAuditLogDocument,
} from './models/deletionAuditLog.model.js';
import {
  BodyWeightEntryModel,
  IBodyWeightEntry,
  IBodyWeightEntryDocument,
} from '../progress/models/bodyWeightEntry.model.js';

export class UsersRepository {
  // --- Profile Operations ---

  async createProfile(
    profileData: Partial<IUserProfile>,
    session?: ClientSession
  ): Promise<IUserProfileDocument> {
    const docs = await UserProfileModel.create([profileData], { session });
    return docs[0]!;
  }

  async findProfileByUserId(
    userId: string | Types.ObjectId,
    session?: ClientSession
  ): Promise<IUserProfileDocument | null> {
    const query = UserProfileModel.findOne({ userId });
    if (session) query.session(session);
    return query.exec();
  }

  async updateProfileByUserId(
    userId: string | Types.ObjectId,
    update: UpdateQuery<IUserProfileDocument>,
    session?: ClientSession
  ): Promise<IUserProfileDocument | null> {
    const query = UserProfileModel.findOneAndUpdate({ userId }, update, { new: true });
    if (session) query.session(session);
    return query.exec();
  }

  async deleteProfileByUserId(
    userId: string | Types.ObjectId,
    session?: ClientSession
  ): Promise<boolean> {
    const query = UserProfileModel.findOneAndDelete({ userId });
    if (session) query.session(session);
    const res = await query.exec();
    return !!res;
  }

  // --- Consent Operations ---

  async createConsentRecord(
    consentData: Partial<IConsentRecord>,
    session?: ClientSession
  ): Promise<IConsentRecordDocument> {
    const docs = await ConsentRecordModel.create([consentData], { session });
    return docs[0]!;
  }

  async findConsentsByUserId(
    userId: string | Types.ObjectId,
    session?: ClientSession
  ): Promise<IConsentRecordDocument[]> {
    const query = ConsentRecordModel.find({ userId, status: 'active' }).sort({ recordedAt: -1 });
    if (session) query.session(session);
    return query.exec();
  }

  async findActiveConsentByType(
    userId: string | Types.ObjectId,
    consentType: ConsentType,
    session?: ClientSession
  ): Promise<IConsentRecordDocument | null> {
    const query = ConsentRecordModel.findOne({
      userId,
      consentType,
      status: 'active',
    }).sort({ recordedAt: -1 });
    if (session) query.session(session);
    return query.exec();
  }

  async pseudonymizeConsents(
    userId: string | Types.ObjectId,
    pseudonymizedUserId: string,
    hmacKeyVersion: string,
    session?: ClientSession
  ): Promise<number> {
    const now = new Date();
    const query = ConsentRecordModel.updateMany(
      { userId, status: 'active' },
      {
        $set: {
          userId: null,
          pseudonymizedUserId,
          hmacKeyVersion,
          status: 'pseudonymized',
          pseudonymizedAt: now,
        },
      }
    );
    if (session) query.session(session);
    const res = await query.exec();
    return res.modifiedCount;
  }

  // --- Saga Job Operations ---

  async createSagaJob(
    jobData: Partial<IDeletionSagaJob>,
    session?: ClientSession
  ): Promise<IDeletionSagaJobDocument> {
    const docs = await DeletionSagaJobModel.create([jobData], { session });
    return docs[0]!;
  }

  async findSagaBySagaId(
    sagaId: string,
    session?: ClientSession
  ): Promise<IDeletionSagaJobDocument | null> {
    const query = DeletionSagaJobModel.findOne({ sagaId });
    if (session) query.session(session);
    return query.exec();
  }

  async findActiveSagaByUserId(
    userId: string | Types.ObjectId,
    session?: ClientSession
  ): Promise<IDeletionSagaJobDocument | null> {
    const query = DeletionSagaJobModel.findOne({
      targetUserId: userId,
      status: { $in: ['pending', 'in_progress', 'retry_pending'] },
    });
    if (session) query.session(session);
    return query.exec();
  }

  async findSagaByIdempotencyKey(
    idempotencyKey: string,
    session?: ClientSession
  ): Promise<IDeletionSagaJobDocument | null> {
    const query = DeletionSagaJobModel.findOne({ idempotencyKey });
    if (session) query.session(session);
    return query.exec();
  }

  async updateSagaJob(
    sagaId: string,
    update: UpdateQuery<IDeletionSagaJobDocument>,
    session?: ClientSession
  ): Promise<IDeletionSagaJobDocument | null> {
    const query = DeletionSagaJobModel.findOneAndUpdate({ sagaId }, update, { new: true });
    if (session) query.session(session);
    return query.exec();
  }

  // --- Deletion Audit Log Operations ---

  async createAuditLog(
    auditData: Partial<IDeletionAuditLog>,
    session?: ClientSession
  ): Promise<IDeletionAuditLogDocument> {
    const docs = await DeletionAuditLogModel.create([auditData], { session });
    return docs[0]!;
  }

  async findAuditLogByPseudonym(
    pseudonymizedUserId: string,
    hmacKeyVersion: string,
    session?: ClientSession
  ): Promise<IDeletionAuditLogDocument | null> {
    const query = DeletionAuditLogModel.findOne({ pseudonymizedUserId, hmacKeyVersion });
    if (session) query.session(session);
    return query.exec();
  }

  // --- Progress / BodyWeight Entry Operations ---

  async createWeightEntry(
    weightData: Partial<IBodyWeightEntry>,
    session?: ClientSession
  ): Promise<IBodyWeightEntryDocument> {
    const docs = await BodyWeightEntryModel.create([weightData], { session });
    return docs[0]!;
  }

  async findLatestWeightEntry(
    userId: string | Types.ObjectId,
    session?: ClientSession
  ): Promise<IBodyWeightEntryDocument | null> {
    const query = BodyWeightEntryModel.findOne({ userId }).sort({ date: -1, createdAt: -1 });
    if (session) query.session(session);
    return query.exec();
  }
}

export const usersRepository = new UsersRepository();

