import { Schema } from 'mongoose';
import type { ISegment, SegmentColumn } from '~/types';

const segmentColumnSchema = new Schema<SegmentColumn>(
  {
    key: {
      type: String,
      required: true,
    },
    label: {
      type: String,
      required: true,
    },
    type: {
      type: String,
      enum: ['string', 'number', 'date', 'currency'],
      default: 'string',
    },
  },
  { _id: false },
);

const segmentSchema = new Schema<ISegment>(
  {
    segmentId: {
      type: String,
      required: true,
      unique: true,
      index: true,
    },
    name: {
      type: String,
      required: true,
    },
    description: {
      type: String,
      required: true,
    },
    originalPrompt: {
      type: String,
      required: true,
    },
    sqlQuery: {
      type: String,
      required: true,
    },
    viewName: {
      type: String,
      required: true,
    },
    columns: [segmentColumnSchema],
    createdBy: {
      type: String,
      required: true,
      index: true,
    },
    createdDate: {
      type: Date,
      required: true,
    },
    lastExecutedAt: {
      type: Date,
    },
    lastRowCount: {
      type: Number,
    },
    isDeleted: {
      type: Boolean,
      default: false,
      index: true,
    },
    deletedAt: {
      type: Date,
    },
  },
  { timestamps: true },
);

segmentSchema.index({ createdAt: -1 });
segmentSchema.index({ isDeleted: 1, createdAt: -1 });

export default segmentSchema;
