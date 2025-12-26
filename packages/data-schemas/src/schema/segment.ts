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
    sqlQuery: {
      type: String,
      required: true,
    },
    columns: [segmentColumnSchema],
    createdBy: {
      type: String,
      required: true,
      index: true,
    },
    lastExecutedAt: {
      type: Date,
    },
    lastRowCount: {
      type: Number,
    },
  },
  { timestamps: true },
);

segmentSchema.index({ createdAt: -1 });

export default segmentSchema;
