import type { Document, Types } from 'mongoose';

/**
 * Represents a column in a segment result.
 */
export interface SegmentColumn {
  key: string;
  label: string;
  type: 'string' | 'number' | 'date' | 'currency';
}

/**
 * Represents a customer segment created from natural language description.
 */
export interface Segment {
  segmentId: string;
  name: string;
  description: string;
  originalPrompt: string;
  sqlQuery: string;
  viewName: string;
  columns: SegmentColumn[];
  createdBy: string;
  createdDate: Date;
  lastExecutedAt?: Date;
  lastRowCount?: number;
  isDeleted: boolean;
  deletedAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}

/**
 * MongoDB document interface for Segment.
 */
export interface ISegment extends Document {
  _id: Types.ObjectId;
  segmentId: string;
  name: string;
  description: string;
  originalPrompt: string;
  sqlQuery: string;
  viewName: string;
  columns: SegmentColumn[];
  createdBy: string;
  createdDate: Date;
  lastExecutedAt?: Date;
  lastRowCount?: number;
  isDeleted: boolean;
  deletedAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}

/**
 * Request payload for creating a new segment.
 */
export interface CreateSegmentRequest {
  name?: string;
  description: string;
}

/**
 * Result of executing a segment query.
 */
export interface SegmentExecuteResult {
  columns: SegmentColumn[];
  rows: Record<string, unknown>[];
  rowCount: number;
  executedAt: Date;
}
