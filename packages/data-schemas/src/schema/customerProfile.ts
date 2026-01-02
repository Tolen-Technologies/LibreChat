import { Schema } from 'mongoose';
import type { ICustomerProfile, CustomerPersonality } from '~/types';

const customerPersonalitySchema = new Schema<CustomerPersonality>(
  {
    summary: {
      type: String,
      default: '',
    },
    preferences: {
      type: String,
      default: '',
    },
    generatedAt: {
      type: Date,
    },
  },
  { _id: false },
);

const customerProfileSchema = new Schema<ICustomerProfile>(
  {
    mysqlCustomerId: {
      type: Number,
      required: true,
      index: true,
    },
    personality: {
      type: customerPersonalitySchema,
      default: () => ({
        summary: '',
        preferences: '',
      }),
    },
    notes: {
      type: String,
      default: '',
    },
    conversationId: {
      type: String,
    },
    user: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
  },
  { timestamps: true },
);

// Compound unique index for mysqlCustomerId + user (multi-tenancy)
customerProfileSchema.index({ mysqlCustomerId: 1, user: 1 }, { unique: true });
customerProfileSchema.index({ createdAt: -1 });
customerProfileSchema.index({ updatedAt: -1 });

export default customerProfileSchema;
