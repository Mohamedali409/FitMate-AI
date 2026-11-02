import { Schema, model, Document, Types } from 'mongoose';

export interface IBodyWeightEntry {
  userId: Types.ObjectId;
  weightKg: number;
  date: Date;
  note?: string;
  source?: string;
  schemaVersion: number;
  createdAt: Date;
  updatedAt: Date;
}

export interface IBodyWeightEntryDocument
  extends Document<Types.ObjectId>,
    IBodyWeightEntry {
  id: string;
}

const BodyWeightEntrySchema = new Schema<IBodyWeightEntryDocument>(
  {
    userId: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: [true, 'User ID is required'],
      index: true,
    },
    weightKg: {
      type: Number,
      required: [true, 'Weight in kg is required'],
      min: [30.0, 'Weight must be at least 30.00 kg'],
      max: [300.0, 'Weight cannot exceed 300.00 kg'],
    },
    date: {
      type: Date,
      required: [true, 'Entry date is required'],
      default: Date.now,
    },
    note: {
      type: String,
      maxlength: [500, 'Note cannot exceed 500 characters'],
      trim: true,
    },
    source: {
      type: String,
      default: 'manual',
      trim: true,
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

BodyWeightEntrySchema.index({ userId: 1, date: -1 });

export const BodyWeightEntryModel = model<IBodyWeightEntryDocument>(
  'BodyWeightEntry',
  BodyWeightEntrySchema,
  'body_weight_entries'
);

