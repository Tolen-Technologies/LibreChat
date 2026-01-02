import type { Document, Types } from 'mongoose';

/**
 * Represents the AI-generated personality profile for a customer.
 */
export interface CustomerPersonality {
  summary: string;
  preferences: string;
  generatedAt?: Date;
}

/**
 * Represents a customer profile linked to a MySQL customer record.
 */
export interface CustomerProfile {
  mysqlCustomerId: number;
  personality: CustomerPersonality;
  notes: string;
  conversationId?: string;
  user: Types.ObjectId;
  createdAt: Date;
  updatedAt: Date;
}

/**
 * MongoDB document interface for CustomerProfile.
 */
export interface ICustomerProfile extends Document {
  _id: Types.ObjectId;
  mysqlCustomerId: number;
  personality: CustomerPersonality;
  notes: string;
  conversationId?: string;
  user: Types.ObjectId;
  createdAt: Date;
  updatedAt: Date;
}

/**
 * Lean version of ICustomerProfile for query results.
 */
export interface ICustomerProfileLean {
  _id: Types.ObjectId;
  mysqlCustomerId: number;
  personality: CustomerPersonality;
  notes: string;
  conversationId?: string;
  user: Types.ObjectId;
  createdAt: Date;
  updatedAt: Date;
}

/**
 * Parameters for upserting a customer profile.
 */
export interface UpsertCustomerProfileParams {
  mysqlCustomerId: number;
  userId: string | Types.ObjectId;
  personality?: Partial<CustomerPersonality>;
  notes?: string;
  conversationId?: string;
}

/**
 * Parameters for updating customer notes.
 */
export interface UpdateCustomerNotesParams {
  mysqlCustomerId: number;
  userId: string | Types.ObjectId;
  notes: string;
}

/**
 * Parameters for updating customer personality.
 */
export interface UpdateCustomerPersonalityParams {
  mysqlCustomerId: number;
  userId: string | Types.ObjectId;
  personality: CustomerPersonality;
}

/**
 * Parameters for getting a customer profile by customer ID.
 */
export interface GetCustomerProfileParams {
  mysqlCustomerId: number;
  userId: string | Types.ObjectId;
}
