import { Schema, model, Document, Types } from 'mongoose';

export type FitnessGoalArchetype =
  | 'fat_loss'
  | 'muscle_gain'
  | 'recomposition'
  | 'maintenance'
  | 'general_fitness'
  | 'undecided';

export type BiologicalSex = 'male' | 'female' | 'prefer_not_to_say';
export type TrainingExperienceLevel = 'beginner' | 'intermediate' | 'advanced';
export type UnitSystem = 'metric' | 'imperial';
export type PreferredLanguage = 'en' | 'ar';
export type DietaryPreference =
  | 'none'
  | 'vegetarian'
  | 'vegan'
  | 'pescatarian'
  | 'halal'
  | 'keto'
  | 'custom';

export interface IUserProfile {
  userId: Types.ObjectId;
  displayName?: string;
  isOnboardingCompleted: boolean;
  unitSystem: UnitSystem;
  preferredLanguage: PreferredLanguage;
  goal?: FitnessGoalArchetype;
  biologicalSex?: BiologicalSex;
  birthDate?: Date;
  heightCm?: number;
  weightKg?: number;
  weightRecordedAt?: Date;
  weightEntryId?: Types.ObjectId;
  activityMultiplier?: number;
  trainingExperience?: TrainingExperienceLevel;
  dietaryPreference?: DietaryPreference;
  dailyCalorieTarget?: number;
  proteinTargetGrams?: number;
  carbsTargetGrams?: number;
  fatTargetGrams?: number;
  isTargetsCustomized: boolean;
  isEstimated: boolean;
  targetsCalculatedAt?: Date;
  customTargetsSetAt?: Date;
  baselineRecalculatedAt?: Date;
  calculationVersion?: string;
  schemaVersion: number;
  createdAt: Date;
  updatedAt: Date;
}

export interface IUserProfileDocument
  extends Document<Types.ObjectId>,
    IUserProfile {
  id: string;
}

const UserProfileSchema = new Schema<IUserProfileDocument>(
  {
    userId: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: [true, 'User ID reference is required'],
      unique: true,
    },
    displayName: {
      type: String,
      trim: true,
      maxlength: [100, 'Display name cannot exceed 100 characters'],
    },
    isOnboardingCompleted: {
      type: Boolean,
      default: false,
      required: true,
    },
    unitSystem: {
      type: String,
      enum: ['metric', 'imperial'],
      default: 'metric',
      required: true,
    },
    preferredLanguage: {
      type: String,
      enum: ['en', 'ar'],
      default: 'en',
      required: true,
    },
    goal: {
      type: String,
      enum: [
        'fat_loss',
        'muscle_gain',
        'recomposition',
        'maintenance',
        'general_fitness',
        'undecided',
      ],
    },
    biologicalSex: {
      type: String,
      enum: ['male', 'female', 'prefer_not_to_say'],
      default: 'prefer_not_to_say',
    },
    birthDate: {
      type: Date,
    },
    heightCm: {
      type: Number,
      min: [100.0, 'Height must be at least 100.0 cm'],
      max: [250.0, 'Height cannot exceed 250.0 cm'],
    },
    weightKg: {
      type: Number,
      min: [30.0, 'Weight must be at least 30.00 kg'],
      max: [300.0, 'Weight cannot exceed 300.00 kg'],
    },
    weightRecordedAt: {
      type: Date,
    },
    weightEntryId: {
      type: Schema.Types.ObjectId,
      ref: 'BodyWeightEntry',
    },
    activityMultiplier: {
      type: Number,
      enum: [1.2, 1.375, 1.55, 1.725, 1.9],
      default: 1.2,
    },
    trainingExperience: {
      type: String,
      enum: ['beginner', 'intermediate', 'advanced'],
      default: 'beginner',
    },
    dietaryPreference: {
      type: String,
      enum: ['none', 'vegetarian', 'vegan', 'pescatarian', 'halal', 'keto', 'custom'],
      default: 'none',
    },
    dailyCalorieTarget: {
      type: Number,
      min: [500, 'Daily calorie target must be at least 500 kcal'],
      max: [10000, 'Daily calorie target cannot exceed 10,000 kcal'],
    },
    proteinTargetGrams: {
      type: Number,
      min: [0, 'Protein target cannot be negative'],
    },
    carbsTargetGrams: {
      type: Number,
      min: [0, 'Carbohydrate target cannot be negative'],
    },
    fatTargetGrams: {
      type: Number,
      min: [0, 'Fat target cannot be negative'],
    },
    isTargetsCustomized: {
      type: Boolean,
      default: false,
      required: true,
    },
    isEstimated: {
      type: Boolean,
      default: true,
      required: true, // Core Invariant 2
    },
    targetsCalculatedAt: {
      type: Date,
    },
    customTargetsSetAt: {
      type: Date,
    },
    baselineRecalculatedAt: {
      type: Date,
    },
    calculationVersion: {
      type: String,
      default: 'mifflin_st_jeor_v1',
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

export const UserProfileModel = model<IUserProfileDocument>(
  'UserProfile',
  UserProfileSchema,
  'user_profiles'
);

