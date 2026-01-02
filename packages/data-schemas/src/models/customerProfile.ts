import customerProfileSchema from '~/schema/customerProfile';
import type { ICustomerProfile } from '~/types';

/**
 * Creates or returns the CustomerProfile model using the provided mongoose instance and schema.
 */
export function createCustomerProfileModel(mongoose: typeof import('mongoose')) {
  return (
    mongoose.models.CustomerProfile ||
    mongoose.model<ICustomerProfile>('CustomerProfile', customerProfileSchema)
  );
}
